import { createHash, randomBytes } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { Response } from "express";
import { loadEnv } from "@chatter/config";
import { PrismaService } from "./prisma.service";

export const SESSION_COOKIE = "chatter_session";
export const CSRF_COOKIE = "chatter_csrf";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export interface AuthedUser {
  userId: string;
  organizationId: string;
  orgRole: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER" | "GUEST";
  name: string;
  email: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, res: Response, meta: { ip?: string; userAgent?: string }): Promise<void> {
    const token = randomBytes(32).toString("hex");
    const csrf = randomBytes(16).toString("hex");
    await this.prisma.client.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        ip: meta.ip,
        userAgent: meta.userAgent?.slice(0, 300),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });
    const env = loadEnv();
    const base = { sameSite: "lax" as const, secure: env.COOKIE_SECURE, path: "/" };
    res.cookie(SESSION_COOKIE, token, { ...base, httpOnly: true, maxAge: SESSION_TTL_MS });
    // CSRF token is readable by JS (double-submit pattern).
    res.cookie(CSRF_COOKIE, csrf, { ...base, httpOnly: false, maxAge: SESSION_TTL_MS });
  }

  async resolve(token: string | undefined): Promise<AuthedUser> {
    if (!token) throw new UnauthorizedException("Not signed in");
    const session = await this.prisma.client.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: { include: { memberships: { include: { organization: true }, take: 1 } } },
      },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException("Session expired");
    }
    const membership = session.user.memberships[0];
    if (!membership || membership.suspended) throw new UnauthorizedException("No active membership");
    return {
      userId: session.user.id,
      organizationId: membership.organizationId,
      orgRole: membership.role,
      name: session.user.name,
      email: session.user.email,
    };
  }

  async revoke(token: string | undefined, res: Response): Promise<void> {
    if (token) {
      await this.prisma.client.session.updateMany({
        where: { tokenHash: hashToken(token) },
        data: { revokedAt: new Date() },
      });
    }
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.clearCookie(CSRF_COOKIE, { path: "/" });
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.client.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
