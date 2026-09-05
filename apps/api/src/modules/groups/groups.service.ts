import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { GroupDto } from "@chatter/contracts";
import { isAtLeast } from "@chatter/permissions";
import type { Prisma } from "@chatter/database";
import { PrismaService } from "../../common/prisma.service";
import type { AuthedUser } from "../../common/session.service";
import { initials } from "../users/users.service";
import { RealtimeGateway } from "../../realtime/realtime.gateway";
import { RT } from "@chatter/realtime";

const groupInclude = {
  conversation: { include: { participants: true } },
  members: { include: { user: true } },
  events: { orderBy: { startsAt: "asc" as const } },
  announcements: { orderBy: { createdAt: "desc" as const }, take: 5 },
  organization: false,
} satisfies Prisma.GroupInclude;

type GroupWithRels = Prisma.GroupGetPayload<{ include: typeof groupInclude }>;

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeGateway,
  ) {}

  private async toDto(auth: AuthedUser, g: GroupWithRels, detailed: boolean): Promise<GroupDto> {
    const mine = g.conversation.participants.find((p) => p.userId === auth.userId);
    const unreadCount = mine
      ? await this.prisma.client.message.count({
          where: {
            conversationId: g.conversationId,
            deletedAt: null,
            senderId: { not: auth.userId },
            ...(mine.lastReadAt ? { createdAt: { gt: mine.lastReadAt } } : {}),
          },
        })
      : 0;
    const last = await this.prisma.client.message.findFirst({
      where: { conversationId: g.conversationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { sender: true, attachments: true },
    });
    const createdBy = g.createdById
      ? await this.prisma.client.user.findUnique({ where: { id: g.createdById } })
      : null;
    return {
      id: g.id,
      conversationSlug: g.conversation.slug,
      name: g.name,
      code: g.code,
      icon: g.icon,
      avatarColor: g.avatarColor,
      privacy: g.privacy,
      description: g.description,
      tags: (g.tags as string[] | null) ?? [],
      memberCount: g.members.length,
      onlineCount: g.members.filter((m) => m.user.presence === "ONLINE").length,
      unreadCount,
      createdByName: createdBy?.name ?? null,
      createdAt: g.createdAt.toISOString(),
      lastActivity: last
        ? {
            text: `${last.sender.name.split(" ")[0]}: ${last.text ? last.text.slice(0, 60) : "Encrypted message"}`,
            at: last.createdAt.toISOString(),
          }
        : null,
      members: detailed
        ? g.members.map((m) => ({
            userId: m.userId,
            name: m.user.name,
            initials: initials(m.user.name),
            avatarColor: m.user.avatarColor,
            presence: m.user.presence,
            role: m.role,
          }))
        : undefined,
      events: detailed
        ? g.events.map((e) => ({ id: e.id, name: e.name, startsAt: e.startsAt.toISOString(), location: e.location }))
        : undefined,
      announcements: detailed
        ? await Promise.all(
            g.announcements.map(async (a) => {
              const author = a.authorId ? await this.prisma.client.user.findUnique({ where: { id: a.authorId } }) : null;
              return { id: a.id, title: a.title, body: a.body, authorName: author?.name ?? null, createdAt: a.createdAt.toISOString() };
            }),
          )
        : undefined,
    };
  }

  async list(auth: AuthedUser): Promise<GroupDto[]> {
    const groups = await this.prisma.client.group.findMany({
      where: {
        organizationId: auth.organizationId,
        archived: false,
        OR: [{ privacy: "PUBLIC" }, { members: { some: { userId: auth.userId } } }],
      },
      include: groupInclude,
      orderBy: { conversation: { updatedAt: "desc" } },
    });
    return Promise.all(groups.map((g) => this.toDto(auth, g, false)));
  }

  async get(auth: AuthedUser, id: string): Promise<GroupDto> {
    const g = await this.prisma.client.group.findFirst({
      where: { id, organizationId: auth.organizationId },
      include: groupInclude,
    });
    if (!g) throw new NotFoundException("Group not found");
    const isMember = g.members.some((m) => m.userId === auth.userId);
    if (g.privacy === "PRIVATE" && !isMember) throw new ForbiddenException("This group is private");
    return this.toDto(auth, g, true);
  }

  async create(auth: AuthedUser, input: { name: string; description?: string; privacy: "PUBLIC" | "PRIVATE"; icon?: string }): Promise<GroupDto> {
    const g = await this.prisma.client.$transaction(async (tx) => {
      const conv = await tx.conversation.create({
        data: {
          organizationId: auth.organizationId,
          kind: "GROUP",
          participants: { create: [{ userId: auth.userId, role: "ADMIN" }] },
        },
      });
      return tx.group.create({
        data: {
          organizationId: auth.organizationId,
          conversationId: conv.id,
          name: input.name,
          description: input.description,
          privacy: input.privacy,
          icon: input.icon ?? "👥",
          avatarColor: "linear-gradient(135deg,#8950f5,#5e28c7)",
          createdById: auth.userId,
          members: { create: [{ userId: auth.userId, role: "ADMIN" }] },
        },
        include: groupInclude,
      });
    });
    return this.toDto(auth, g, true);
  }

  async addMember(auth: AuthedUser, groupId: string, userId: string): Promise<{ ok: true }> {
    const g = await this.prisma.client.group.findFirst({
      where: { id: groupId, organizationId: auth.organizationId },
      include: { members: true },
    });
    if (!g) throw new NotFoundException("Group not found");
    const me = g.members.find((m) => m.userId === auth.userId);
    if (!me || !isAtLeast(me.role, "MODERATOR")) throw new ForbiddenException("Moderator role required");
    const target = await this.prisma.client.membership.findFirst({
      where: { userId, organizationId: auth.organizationId, suspended: false },
    });
    if (!target) throw new NotFoundException("User not found in your organization");
    await this.prisma.client.$transaction([
      this.prisma.client.groupMember.upsert({
        where: { groupId_userId: { groupId, userId } },
        update: {},
        create: { groupId, userId },
      }),
      this.prisma.client.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: g.conversationId, userId } },
        update: {},
        create: { conversationId: g.conversationId, userId },
      }),
    ]);
    await this.rt.joinUserToConversation(userId, g.conversationId);
    this.rt.emitToConversation(g.conversationId, RT.conversationUpdated, { conversationId: g.conversationId, membershipChanged: true });
    return { ok: true };
  }

  async leave(auth: AuthedUser, groupId: string): Promise<{ ok: true }> {
    const g = await this.prisma.client.group.findFirst({
      where: { id: groupId, organizationId: auth.organizationId },
    });
    if (!g) throw new NotFoundException("Group not found");
    await this.prisma.client.$transaction([
      this.prisma.client.groupMember.deleteMany({ where: { groupId, userId: auth.userId } }),
      this.prisma.client.conversationParticipant.deleteMany({
        where: { conversationId: g.conversationId, userId: auth.userId },
      }),
    ]);
    await this.rt.leaveUserFromConversation(auth.userId, g.conversationId);
    this.rt.emitToConversation(g.conversationId, RT.conversationUpdated, { conversationId: g.conversationId, membershipChanged: true });
    return { ok: true };
  }
}
