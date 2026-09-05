import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";
import { loadEnv } from "@chatter/config";
import { PrismaService } from "./prisma.service";
import { JwtTokenService, type ChatterJwtClaims, type IssuedToken } from "./jwt-token.service";

export const ACCESS_COOKIE = "chatter_access";
export const REFRESH_COOKIE = "chatter_refresh";
export const CSRF_COOKIE = "chatter_csrf";
export const SESSION_COOKIE = ACCESS_COOKIE;
export const REFRESH_COOKIE_PATH = "/api/v1/auth";

export interface AuthedUser {
  userId: string;
  organizationId: string;
  orgRole: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER" | "GUEST";
  name: string;
  email: string;
  sessionId: string;
  deviceId: string;
  tokenType: "access+jwt";
  jti: string;
  accessTokenExpiresAt: number;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function hashEquals(left: string, right: string): boolean {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function bearer(req: Request): string | undefined {
  const value = req.headers.authorization;
  if (!value) return undefined;
  return /^Bearer ([^\s]+)$/.exec(value)?.[1];
}

@Injectable()
export class SessionService {
  private readonly env = loadEnv();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtTokenService,
  ) {}

  extractAccessToken(req: Request): string | undefined {
    return bearer(req) ?? req.cookies?.[ACCESS_COOKIE];
  }

  async create(userId: string, res: Response, meta: { ip?: string; userAgent?: string }): Promise<void> {
    const sessionId = randomUUID();
    const deviceId = randomUUID();
    const familyId = randomUUID();
    const expiresAt = new Date(Date.now() + this.env.JWT_REFRESH_TTL_SECONDS * 1000);
    const [access, refresh] = await Promise.all([
      this.jwt.issueAccess({ userId, sessionId, deviceId }),
      this.jwt.issueRefresh({ userId, sessionId, deviceId }),
    ]);

    await this.prisma.client.$transaction(async (tx) => {
      await tx.session.create({
        data: {
          id: sessionId,
          userId,
          deviceId,
          refreshFamilyId: familyId,
          ip: meta.ip,
          userAgent: meta.userAgent?.slice(0, 300),
          expiresAt,
        },
      });
      await tx.refreshToken.create({
        data: {
          jti: refresh.jti,
          sessionId,
          familyId,
          tokenHash: hashToken(refresh.token),
          issuedAt: refresh.issuedAt,
          expiresAt: refresh.expiresAt,
        },
      });
    });
    this.setCookies(res, access, refresh);
  }

  async resolveRequest(req: Request): Promise<AuthedUser> {
    return this.resolve(this.extractAccessToken(req));
  }

  async resolve(token: string | undefined): Promise<AuthedUser> {
    if (!token) throw new UnauthorizedException("Unauthorized");
    return this.principalFromClaims(await this.jwt.verifyAccess(token));
  }

  async refresh(rawToken: string | undefined, res: Response): Promise<{ ok: true }> {
    if (!rawToken) throw new UnauthorizedException("Unauthorized");
    const claims = await this.jwt.verifyRefresh(rawToken);
    const stored = await this.prisma.client.refreshToken.findUnique({
      where: { jti: claims.jti },
      include: { session: { include: { user: { include: { memberships: { take: 1 } } } } } },
    });
    if (!stored || !hashEquals(stored.tokenHash, hashToken(rawToken)) || stored.sessionId !== claims.sessionId) {
      throw new UnauthorizedException("Unauthorized");
    }

    const session = stored.session;
    const membership = session.user.memberships[0];
    const now = new Date();
    if (
      session.userId !== claims.sub ||
      session.deviceId !== claims.deviceId ||
      session.refreshFamilyId !== stored.familyId ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.status !== "ACTIVE" ||
      (session.user.lockedUntil && session.user.lockedUntil > now) ||
      !membership ||
      membership.suspended ||
      stored.expiresAt <= now
    ) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException("Unauthorized");
    }

    const [access, next] = await Promise.all([
      this.jwt.issueAccess({ userId: session.userId, sessionId: session.id, deviceId: session.deviceId }),
      this.jwt.issueRefresh({ userId: session.userId, sessionId: session.id, deviceId: session.deviceId }),
    ]);

    const outcome = await this.prisma.client.$transaction(async (tx) => {
      const consumed = await tx.refreshToken.updateMany({
        where: { id: stored.id, usedAt: null, revokedAt: null },
        data: { usedAt: now, replacedByJti: next.jti },
      });
      if (consumed.count !== 1) {
        // A consumed valid token is proof of replay. Burn the whole family,
        // including a replacement created by a racing request.
        await tx.session.update({ where: { id: session.id }, data: { revokedAt: now, reuseDetectedAt: now } });
        await tx.refreshToken.updateMany({
          where: { familyId: session.refreshFamilyId, revokedAt: null },
          data: { revokedAt: now },
        });
        return "REUSE" as const;
      }
      await tx.refreshToken.create({
        data: {
          jti: next.jti,
          sessionId: session.id,
          familyId: session.refreshFamilyId,
          tokenHash: hashToken(next.token),
          parentJti: stored.jti,
          issuedAt: next.issuedAt,
          expiresAt: next.expiresAt,
        },
      });
      await tx.session.update({ where: { id: session.id }, data: { lastSeenAt: now } });
      return "ROTATED" as const;
    });

    if (outcome === "REUSE") {
      this.clearCookies(res);
      throw new UnauthorizedException("Unauthorized");
    }
    this.setCookies(res, access, next);
    return { ok: true };
  }

  async revokeCurrent(sessionId: string | undefined, res: Response): Promise<void> {
    if (sessionId) await this.revokeSession(sessionId);
    this.clearCookies(res);
  }

  async revokeSession(sessionId: string): Promise<void> {
    const now = new Date();
    await this.prisma.client.$transaction([
      this.prisma.client.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: now } }),
      this.prisma.client.refreshToken.updateMany({ where: { sessionId, revokedAt: null }, data: { revokedAt: now } }),
    ]);
  }

  async revokeAll(userId: string): Promise<void> {
    const now = new Date();
    const sessions = await this.prisma.client.session.findMany({ where: { userId, revokedAt: null }, select: { id: true } });
    await this.prisma.client.$transaction([
      this.prisma.client.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } }),
      this.prisma.client.refreshToken.updateMany({
        where: { sessionId: { in: sessions.map((session) => session.id) }, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
  }

  /** Revoke every login session cryptographically bound to one device. */
  async revokeDevice(userId: string, deviceId: string): Promise<string[]> {
    const sessions = await this.prisma.client.session.findMany({
      where: { userId, deviceId, revokedAt: null },
      select: { id: true },
    });
    if (!sessions.length) return [];
    const ids = sessions.map((session) => session.id);
    const now = new Date();
    await this.prisma.client.$transaction([
      this.prisma.client.session.updateMany({ where: { id: { in: ids }, revokedAt: null }, data: { revokedAt: now } }),
      this.prisma.client.refreshToken.updateMany({ where: { sessionId: { in: ids }, revokedAt: null }, data: { revokedAt: now } }),
    ]);
    return ids;
  }

  async isSessionActive(sessionId: string): Promise<boolean> {
    const session = await this.prisma.client.session.findUnique({
      where: { id: sessionId },
      select: { revokedAt: true, expiresAt: true },
    });
    return Boolean(session && !session.revokedAt && session.expiresAt > new Date());
  }

  private async principalFromClaims(claims: ChatterJwtClaims): Promise<AuthedUser> {
    const session = await this.prisma.client.session.findUnique({
      where: { id: claims.sessionId },
      include: { user: { include: { memberships: { take: 1 } } } },
    });
    const now = new Date();
    const membership = session?.user.memberships[0];
    if (
      !session ||
      session.userId !== claims.sub ||
      session.deviceId !== claims.deviceId ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.status !== "ACTIVE" ||
      (session.user.lockedUntil && session.user.lockedUntil > now) ||
      !membership ||
      membership.suspended
    ) {
      throw new UnauthorizedException("Unauthorized");
    }
    return {
      userId: session.user.id,
      organizationId: membership.organizationId,
      orgRole: membership.role,
      name: session.user.name,
      email: session.user.email,
      sessionId: session.id,
      deviceId: session.deviceId,
      tokenType: "access+jwt",
      jti: claims.jti,
      accessTokenExpiresAt: claims.exp,
    };
  }

  private setCookies(res: Response, access: IssuedToken, refresh: IssuedToken): void {
    const base = { sameSite: "lax" as const, secure: this.env.COOKIE_SECURE, httpOnly: true };
    res.cookie(ACCESS_COOKIE, access.token, { ...base, path: "/", expires: access.expiresAt });
    res.cookie(REFRESH_COOKIE, refresh.token, { ...base, path: REFRESH_COOKIE_PATH, expires: refresh.expiresAt });
    res.cookie(CSRF_COOKIE, randomBytes(32).toString("base64url"), {
      sameSite: "lax",
      secure: this.env.COOKIE_SECURE,
      httpOnly: false,
      path: "/",
      expires: refresh.expiresAt,
    });
  }

  private clearCookies(res: Response): void {
    const secure = this.env.COOKIE_SECURE;
    res.clearCookie(ACCESS_COOKIE, { path: "/", sameSite: "lax", secure, httpOnly: true });
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH, sameSite: "lax", secure, httpOnly: true });
    res.clearCookie(CSRF_COOKIE, { path: "/", sameSite: "lax", secure });
  }
}
