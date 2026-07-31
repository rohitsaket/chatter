import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import argon2 from "argon2";
import type { LoginBody, RegisterBody } from "@chatter/contracts";
import { PrismaService } from "../../common/prisma.service";
import { initialsGradient } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(body: RegisterBody): Promise<{ userId: string }> {
    const existing = await this.prisma.client.user.findUnique({ where: { email: body.email } });
    if (existing) throw new ConflictException("An account with this email already exists");

    // Single-org install: new users join the default organization as members.
    const org = await this.prisma.client.organization.findFirst({ orderBy: { createdAt: "asc" } });
    if (!org) throw new ConflictException("No organization exists; run the seed first");

    const user = await this.prisma.client.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: body.email,
          name: body.name,
          passwordHash: await argon2.hash(body.password, { type: argon2.argon2id }),
          avatarColor: initialsGradient(body.name),
        },
      });
      await tx.membership.create({ data: { userId: u.id, organizationId: org.id, role: "MEMBER" } });
      await tx.userSettings.create({ data: { userId: u.id } });
      await tx.auditLog.create({
        data: { organizationId: org.id, actorId: u.id, action: "auth.registered", target: u.email },
      });
      return u;
    });
    return { userId: user.id };
  }

  async verifyCredentials(body: LoginBody): Promise<{ userId: string }> {
    const user = await this.prisma.client.user.findUnique({ where: { email: body.email } });
    // Constant-shape failure: hash check even when the user is missing.
    const hash = user?.passwordHash ?? (await argon2.hash("invalid-password-placeholder"));
    const ok = await argon2.verify(hash, body.password).catch(() => false);
    if (!user || !ok) throw new UnauthorizedException("Invalid email or password");
    return { userId: user.id };
  }
}
