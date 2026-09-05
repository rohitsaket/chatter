import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import argon2 from "argon2";
import type { LoginBody, RegisterBody } from "@chatter/contracts";
import { COUNTRIES, aadhaarError, countryByCode, isValidAadhaar, normalizeAadhaar, normalizeMobile } from "@chatter/validation";
import { PrismaService } from "../../common/prisma.service";
import { encryptIdentity, fingerprintIdentity } from "@chatter/database";
import { initialsGradient } from "../users/users.service";

/**
 * Fixed argon2id digest of an unguessable value, verified against when no
 * account matches so the failure path does the same work as the success path.
 */
const DUMMY_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0c2FsdA$Qm9ndXNIYXNoRm9yQ29uc3RhbnRTaGFwZUZhaWx1cmU";

/** Consecutive failures before an account is temporarily locked. */
const MAX_FAILED_LOGINS = 10;
/** How long the lock holds. Fixed window, so a lock cannot be used as a DoS. */
const LOCKOUT_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(body: RegisterBody): Promise<{ userId: string }> {
    const existing = await this.prisma.client.user.findUnique({ where: { email: body.email } });
    if (existing) throw new ConflictException("An account with this email already exists");

    // Single-org install: new users join the default organization as members.
    const org = await this.prisma.client.organization.findFirst({ orderBy: { createdAt: "asc" } });
    if (!org) throw new ConflictException("No organization exists; run the seed first");

    // Re-normalize server-side; never trust the shape the client sent.
    const mobile = normalizeMobile(body.mobileNumber, body.country);
    if (!mobile) throw new BadRequestException("Enter a valid mobile number for the selected country");

    const dupMobile = await this.prisma.client.user.findFirst({ where: { phone: mobile } });
    if (dupMobile) throw new ConflictException("An account with this mobile number already exists");

    const aadhaar = normalizeAadhaar(body.aadhaarNumber);
    // Validated for every country: the field is mandatory regardless of country
    // and its fingerprint is uniquely indexed, so unvalidated input would let
    // junk squat on that index. This is a format check only — it says nothing
    // about whether the number is issued or who it belongs to. The message
    // names the broken rule but deliberately omits the submitted value.
    const aadhaarIssue = aadhaarError(aadhaar);
    if (aadhaarIssue) throw new BadRequestException(aadhaarIssue);
    const aadhaarHash = fingerprintIdentity(aadhaar);
    const dupIdentity = await this.prisma.client.userIdentity.findUnique({ where: { aadhaarHash } });
    if (dupIdentity) throw new ConflictException("This identity number is already registered");

    const name = `${body.firstName} ${body.lastName}`.trim();
    const countryName = countryByCode(body.country)?.name ?? body.country;

    // Atomic: user, identity, membership, settings and the audit row commit
    // together, so a failure can never leave a half-registered account.
    const user = await this.prisma.client.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: body.email,
          name,
          firstName: body.firstName,
          lastName: body.lastName,
          phone: mobile,
          country: body.country,
          state: body.state,
          pinCode: body.pinCode,
          location: `${body.state}, ${countryName}`,
          passwordHash: await argon2.hash(body.password, { type: argon2.argon2id }),
          avatarColor: initialsGradient(name),
        },
      });
      await tx.userIdentity.create({
        data: {
          userId: u.id,
          aadhaarEnc: encryptIdentity(aadhaar),
          aadhaarHash,
          aadhaarLast4: aadhaar.slice(-4),
        },
      });
      await tx.membership.create({ data: { userId: u.id, organizationId: org.id, role: "MEMBER" } });
      await tx.userSettings.create({ data: { userId: u.id } });
      // Audit records that identity data was captured — never the number itself.
      await tx.auditLog.create({
        data: {
          organizationId: org.id,
          actorId: u.id,
          action: "auth.registered",
          target: u.email,
          metadata: { identityCaptured: true, country: body.country },
        },
      });
      return u;
    });
    return { userId: user.id };
  }

  /**
   * Resolve a login identifier to an account. Tries, in order: email, Aadhaar
   * (via HMAC fingerprint — the plaintext is never looked up or stored), then
   * mobile normalized against every supported country.
   *
   * Returns null rather than throwing so the caller can produce one
   * indistinguishable failure for "no such account" and "wrong password".
   */
  private async resolveIdentifier(
    raw: string,
  ): Promise<{ id: string; passwordHash: string; failedLoginAttempts: number; lockedUntil: Date | null } | null> {
    const value = raw.trim();
    const select = { id: true, passwordHash: true, failedLoginAttempts: true, lockedUntil: true } as const;

    if (value.includes("@")) {
      return this.prisma.client.user.findUnique({ where: { email: value.toLowerCase() }, select });
    }

    const digits = normalizeAadhaar(value);
    if (/^[0-9]{12}$/.test(digits) && isValidAadhaar(digits)) {
      const identity = await this.prisma.client.userIdentity.findUnique({
        where: { aadhaarHash: fingerprintIdentity(digits) },
        select: { user: { select } },
      });
      if (identity) return identity.user;
    }

    // One query over every plausible E.164 form of the input.
    const candidates = new Set<string>();
    if (value.startsWith("+")) candidates.add(value.replace(/[\s()\-.]/g, ""));
    for (const c of COUNTRIES) {
      const normalized = normalizeMobile(value, c.code);
      if (normalized) candidates.add(normalized);
    }
    if (candidates.size > 0) {
      return this.prisma.client.user.findFirst({ where: { phone: { in: [...candidates] } }, select });
    }
    return null;
  }

  async verifyCredentials(body: LoginBody): Promise<{ userId: string }> {
    const user = await this.resolveIdentifier(body.identifier);

    // A locked account fails before the password is even considered, and does
    // so with the SAME message and roughly the same cost as any other failure.
    // Saying "this account is locked" would confirm the account exists and tell
    // an attacker their guessing is working.
    const locked = Boolean(user?.lockedUntil && user.lockedUntil > new Date());

    // Constant-shape failure: always run a verification so a missing account and
    // a wrong password cost roughly the same and return the same message.
    const hash = user?.passwordHash ?? DUMMY_HASH;
    const ok = await argon2.verify(hash, body.password).catch(() => false);

    if (!user || !ok || locked) {
      // Only a real account can accumulate failures; counting against a
      // non-existent identifier would leak nothing useful and cost a write.
      if (user && !locked) await this.registerFailedLogin(user.id);
      throw new UnauthorizedException("Invalid credentials.");
    }

    // Any successful sign-in clears the counter and the lock together.
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.client.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }
    return { userId: user.id };
  }

  /**
   * Increment the failure counter and lock the account once the threshold is
   * crossed. The lock is a fixed window rather than permanent: a permanent lock
   * turns a guessing attempt into a denial-of-service against the real owner.
   */
  private async registerFailedLogin(userId: string): Promise<void> {
    const updated = await this.prisma.client.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });
    if (updated.failedLoginAttempts >= MAX_FAILED_LOGINS) {
      await this.prisma.client.user.update({
        where: { id: userId },
        data: {
          lockedUntil: new Date(Date.now() + LOCKOUT_MS),
          failedLoginAttempts: 0,
        },
      });
    }
  }
}
