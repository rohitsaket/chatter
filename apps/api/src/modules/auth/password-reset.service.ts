import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import argon2 from "argon2";
import type {
  PasswordResetCompleteBody,
  PasswordResetRequestBody,
  PasswordResetRequestResult,
  PasswordResetVerifyBody,
} from "@chatter/contracts";
import { COUNTRIES, isValidAadhaar, normalizeAadhaar, normalizeMobile } from "@chatter/validation";
import { loadEnv } from "@chatter/config";
import type { Prisma } from "@chatter/database";
import { createLogger } from "@chatter/logger";
import { PrismaService } from "../../common/prisma.service";
import { fingerprintIdentity } from "@chatter/database";
import { MailerService, maskEmail } from "../../common/mailer.service";
import { RealtimeGateway } from "../../realtime/realtime.gateway";

const logger = createLogger("password-reset");

/** Same wording regardless of whether the details matched a real account. */
const GENERIC =
  "If the supplied details match a registered account, a verification code has been sent to the registered email address.";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Constant-time digest comparison — both sides are fixed-length hex. */
function digestEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly rt: RealtimeGateway,
  ) {}

  /**
   * Step 1. Email + mobile + Aadhaar must all resolve to the SAME account.
   *
   * The response is identical whether or not they did — a challenge id is
   * always returned, unusable when nothing matched — so the endpoint cannot be
   * used to test whether an email, mobile or Aadhaar is registered.
   */
  async request(body: PasswordResetRequestBody, ip?: string): Promise<PasswordResetRequestResult> {
    const generic = (sentTo: string): PasswordResetRequestResult => ({
      challengeId: randomUUID(),
      sentTo,
      message: GENERIC,
    });

    const user = await this.prisma.client.user.findUnique({
      where: { email: body.email.toLowerCase() },
      include: { identity: { select: { aadhaarHash: true } }, memberships: { take: 1 } },
    });
    if (!user) return generic(maskEmail(body.email));

    // Mobile must belong to this same account.
    const candidates = new Set<string>();
    if (body.mobileNumber.startsWith("+")) candidates.add(body.mobileNumber.replace(/[\s()\-.]/g, ""));
    for (const c of COUNTRIES) {
      const n = normalizeMobile(body.mobileNumber, c.code);
      if (n) candidates.add(n);
    }
    if (!user.phone || !candidates.has(user.phone)) return generic(maskEmail(body.email));

    // Aadhaar must belong to this same account — compared as HMAC fingerprints,
    // never as plaintext.
    const digits = normalizeAadhaar(body.aadhaarNumber);
    if (!isValidAadhaar(digits)) return generic(maskEmail(body.email));
    if (!user.identity || user.identity.aadhaarHash !== fingerprintIdentity(digits)) {
      return generic(maskEmail(body.email));
    }

    const env = loadEnv();
    const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const now = new Date();

    // Supersede any outstanding challenge for this account.
    await this.prisma.client.passwordReset.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: now },
    });

    const challenge = await this.prisma.client.passwordReset.create({
      data: {
        userId: user.id,
        otpHash: sha256(otp),
        otpExpiresAt: new Date(now.getTime() + env.OTP_TTL_SECONDS * 1000),
        lastSentAt: now,
      },
    });

    await this.deliver(user.email, otp, env.OTP_TTL_SECONDS);
    await this.audit(user.memberships[0]?.organizationId, user.id, "auth.password_reset_requested", { ip });
    await this.audit(user.memberships[0]?.organizationId, user.id, "auth.otp_sent", {});

    return { challengeId: challenge.id, sentTo: maskEmail(user.email), message: GENERIC };
  }

  /** Step 2. Verify the OTP and mint a single-use, short-lived reset token. */
  async verifyOtp(body: PasswordResetVerifyBody): Promise<{ resetToken: string; expiresInSeconds: number }> {
    const env = loadEnv();
    const invalid = () => new BadRequestException("That code is invalid or has expired.");

    const challenge = await this.prisma.client.passwordReset.findUnique({
      where: { id: body.challengeId },
      include: { user: { include: { memberships: { take: 1 } } } },
    });
    if (!challenge || challenge.consumedAt || challenge.verifiedAt) throw invalid();
    if (challenge.otpExpiresAt < new Date()) throw invalid();

    if (challenge.attempts >= env.OTP_MAX_ATTEMPTS) {
      await this.prisma.client.passwordReset.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });
      throw invalid();
    }

    if (!digestEquals(sha256(body.otp), challenge.otpHash)) {
      const updated = await this.prisma.client.passwordReset.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      // Exhausting the allowance burns the challenge outright.
      if (updated.attempts >= env.OTP_MAX_ATTEMPTS) {
        await this.prisma.client.passwordReset.update({
          where: { id: challenge.id },
          data: { consumedAt: new Date() },
        });
      }
      await this.audit(challenge.user.memberships[0]?.organizationId, challenge.userId, "auth.otp_verification_failed", {
        attempts: updated.attempts,
      });
      throw invalid();
    }

    const token = randomBytes(32).toString("base64url");
    await this.prisma.client.passwordReset.update({
      where: { id: challenge.id },
      data: {
        verifiedAt: new Date(),
        resetTokenHash: sha256(token),
        resetTokenExpiresAt: new Date(Date.now() + env.RESET_TOKEN_TTL_SECONDS * 1000),
      },
    });
    await this.audit(challenge.user.memberships[0]?.organizationId, challenge.userId, "auth.otp_verified", {});
    return { resetToken: token, expiresInSeconds: env.RESET_TOKEN_TTL_SECONDS };
  }

  /**
   * Re-send the current OTP, subject to cooldown and a resend ceiling.
   *
   * Every outcome that does NOT send returns the same generic 200 — unknown
   * challenge, already used, already verified, still in cooldown, or over the
   * resend cap. Distinguishing them would undo the enumeration protection on
   * `request()`: a caller could submit a guessed email+mobile+Aadhaar triple,
   * then call resend and learn from the status code whether it matched a real
   * account. The client shows its own cooldown timer, so nothing is lost.
   */
  async resend(challengeId: string): Promise<PasswordResetRequestResult> {
    const env = loadEnv();
    const silent: PasswordResetRequestResult = { challengeId, sentTo: "***", message: GENERIC };

    const challenge = await this.prisma.client.passwordReset.findUnique({
      where: { id: challengeId },
      include: { user: true },
    });
    if (!challenge || challenge.consumedAt || challenge.verifiedAt) return silent;

    const sinceLast = (Date.now() - challenge.lastSentAt.getTime()) / 1000;
    if (sinceLast < env.OTP_RESEND_COOLDOWN_SECONDS || challenge.resendCount >= env.OTP_MAX_RESENDS) {
      return silent;
    }

    const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await this.prisma.client.passwordReset.update({
      where: { id: challenge.id },
      data: {
        otpHash: sha256(otp),
        otpExpiresAt: new Date(Date.now() + env.OTP_TTL_SECONDS * 1000),
        lastSentAt: new Date(),
        attempts: 0,
        resendCount: { increment: 1 },
      },
    });
    await this.deliver(challenge.user.email, otp, env.OTP_TTL_SECONDS);
    return { challengeId, sentTo: maskEmail(challenge.user.email), message: GENERIC };
  }

  /**
   * Step 3. Consume the reset token, set the new password, and revoke every
   * existing session so the account cannot stay signed in elsewhere.
   */
  async complete(body: PasswordResetCompleteBody): Promise<{ ok: true }> {
    const challenge = await this.prisma.client.passwordReset.findUnique({
      where: { resetTokenHash: sha256(body.resetToken) },
      include: { user: { include: { memberships: { take: 1 } } } },
    });
    if (
      !challenge ||
      challenge.consumedAt ||
      !challenge.verifiedAt ||
      !challenge.resetTokenExpiresAt ||
      challenge.resetTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException("This password reset link is invalid or has expired.");
    }

    const passwordHash = await argon2.hash(body.password, { type: argon2.argon2id });
    const now = new Date();
    const activeSessions = await this.prisma.client.session.findMany({
      where: { userId: challenge.userId, revokedAt: null },
      select: { id: true },
    });

    await this.prisma.client.$transaction(async (tx) => {
      await tx.user.update({ where: { id: challenge.userId }, data: { passwordHash } });
      // One-use: the token dies with the reset.
      await tx.passwordReset.update({
        where: { id: challenge.id },
        data: { consumedAt: now, resetTokenHash: null, resetTokenExpiresAt: null },
      });
      await tx.session.updateMany({
        where: { userId: challenge.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.refreshToken.updateMany({
        where: { sessionId: { in: activeSessions.map((session) => session.id) }, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.device.updateMany({ where: { userId: challenge.userId, revokedAt: null }, data: { revokedAt: now, current: false } });
      await tx.oneTimeKey.deleteMany({ where: { device: { userId: challenge.userId } } });
      await tx.toDeviceMessage.deleteMany({ where: { OR: [{ recipientUserId: challenge.userId }, { senderUserId: challenge.userId }] } });
      const orgId = challenge.user.memberships[0]?.organizationId;
      if (orgId) {
        await tx.auditLog.create({
          data: { organizationId: orgId, actorId: challenge.userId, action: "auth.password_reset_completed" },
        });
      }
    });

    // Drop live sockets bound to the now-revoked sessions.
    await this.rt.disconnectRevokedSession(challenge.userId);
    return { ok: true };
  }

  /** The OTP goes in the email body only — never to a log or an API response. */
  private async deliver(email: string, otp: string, ttlSeconds: number): Promise<void> {
    await this.mailer.send({
      to: email,
      subject: "Your Chatter password reset code",
      text: [
        "We received a request to reset your Chatter password.",
        "",
        `Your verification code is: ${otp}`,
        "",
        `This code expires in ${Math.round(ttlSeconds / 60)} minutes and can be used once.`,
        "If you did not request this, you can ignore this email — your password has not changed.",
      ].join("\n"),
    });
  }

  private async audit(
    organizationId: string | undefined,
    actorId: string,
    action: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    if (!organizationId) return;
    try {
      await this.prisma.client.auditLog.create({
        data: { organizationId, actorId, action, metadata: metadata as Prisma.InputJsonValue },
      });
    } catch (err) {
      logger.warn({ err, action }, "audit write failed");
    }
  }
}
