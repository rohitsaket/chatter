import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { AdminMemberDto, AuditEventDto, StorageSummaryDto } from "@chatter/contracts";
import { can, outranks, type Role } from "@chatter/permissions";
import { PrismaService } from "../../common/prisma.service";
import type { AuthedUser } from "../../common/session.service";
import { initials } from "../users/users.service";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAdmin(auth: AuthedUser): void {
    if (!can(auth.orgRole, "org.admin")) throw new ForbiddenException("Admin role required");
  }

  async members(auth: AuthedUser): Promise<AdminMemberDto[]> {
    this.assertAdmin(auth);
    const rows = await this.prisma.client.membership.findMany({
      where: { organizationId: auth.organizationId },
      include: { user: true },
      orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
    });
    return rows.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      initials: initials(m.user.name),
      avatarColor: m.user.avatarColor,
      role: m.role,
      presence: m.user.presence,
      suspended: m.suspended,
      lastActiveAt: m.user.lastActiveAt?.toISOString() ?? null,
    }));
  }

  async changeRole(auth: AuthedUser, userId: string, role: Role): Promise<{ ok: true }> {
    this.assertAdmin(auth);
    const target = await this.membershipOf(auth, userId);
    if (!outranks(auth.orgRole, target.role)) throw new ForbiddenException("You cannot manage a member at or above your rank");
    if (role === "OWNER") throw new ForbiddenException("Ownership cannot be granted here");
    await this.prisma.client.$transaction([
      this.prisma.client.membership.update({ where: { id: target.id }, data: { role } }),
      this.prisma.client.auditLog.create({
        data: {
          organizationId: auth.organizationId,
          actorId: auth.userId,
          action: "member.role_changed",
          target: userId,
          metadata: { role },
        },
      }),
    ]);
    return { ok: true };
  }

  async setSuspended(auth: AuthedUser, userId: string, suspended: boolean): Promise<{ ok: true }> {
    this.assertAdmin(auth);
    const target = await this.membershipOf(auth, userId);
    if (!outranks(auth.orgRole, target.role)) throw new ForbiddenException("You cannot manage a member at or above your rank");
    await this.prisma.client.$transaction([
      this.prisma.client.membership.update({ where: { id: target.id }, data: { suspended } }),
      ...(suspended
        ? [
            this.prisma.client.session.updateMany({
              where: { userId, revokedAt: null },
              data: { revokedAt: new Date() },
            }),
          ]
        : []),
      this.prisma.client.auditLog.create({
        data: {
          organizationId: auth.organizationId,
          actorId: auth.userId,
          action: suspended ? "member.suspended" : "member.unsuspended",
          target: userId,
        },
      }),
    ]);
    return { ok: true };
  }

  async storage(auth: AuthedUser): Promise<StorageSummaryDto> {
    this.assertAdmin(auth);
    const org = await this.prisma.client.organization.findUniqueOrThrow({ where: { id: auth.organizationId } });
    const files = await this.prisma.client.file.findMany({
      where: { organizationId: auth.organizationId, status: { not: "TRASHED" } },
      select: { sizeBytes: true, mime: true },
    });
    let media = 0;
    let docs = 0;
    for (const f of files) {
      const n = Number(f.sizeBytes);
      if (f.mime.startsWith("image/") || f.mime.startsWith("video/") || f.mime.startsWith("audio/")) media += n;
      else docs += n;
    }
    return {
      usedBytes: media + docs,
      quotaBytes: Number(org.storageQuotaBytes),
      byCategory: { files: docs, media, other: 0 },
    };
  }

  async audit(auth: AuthedUser): Promise<AuditEventDto[]> {
    this.assertAdmin(auth);
    const rows = await this.prisma.client.auditLog.findMany({
      where: { organizationId: auth.organizationId },
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map((a) => ({
      id: a.id,
      action: a.action,
      actorName: a.actor?.name ?? null,
      target: a.target,
      metadata: (a.metadata ?? {}) as Record<string, unknown>,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  private async membershipOf(auth: AuthedUser, userId: string) {
    const m = await this.prisma.client.membership.findFirst({
      where: { userId, organizationId: auth.organizationId },
    });
    if (!m) throw new NotFoundException("Member not found");
    return m;
  }
}
