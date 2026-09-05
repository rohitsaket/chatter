import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { StatusDto } from "@chatter/contracts";
import { RT } from "@chatter/realtime";
import type { Prisma } from "@chatter/database";
import { PrismaService } from "../../common/prisma.service";
import type { AuthedUser } from "../../common/session.service";
import { RealtimeGateway } from "../../realtime/realtime.gateway";
import { ConversationsService } from "../conversations/conversations.service";
import { initials } from "../users/users.service";

const statusInclude = {
  owner: true,
  views: true,
  reactions: true,
} satisfies Prisma.StatusInclude;

type StatusWithRels = Prisma.StatusGetPayload<{ include: typeof statusInclude }>;

@Injectable()
export class StatusesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeGateway,
    private readonly conversations: ConversationsService,
  ) {}

  private async audienceSize(s: StatusWithRels, orgId: string): Promise<number> {
    if (s.audience.startsWith("group:")) {
      const groupId = s.audience.slice("group:".length);
      return this.prisma.client.groupMember.count({ where: { groupId, userId: { not: s.ownerId } } });
    }
    return this.prisma.client.membership.count({
      where: { organizationId: orgId, suspended: false, userId: { not: s.ownerId } },
    });
  }

  private async canView(auth: AuthedUser, s: StatusWithRels): Promise<boolean> {
    if (s.ownerId === auth.userId) return true;
    if (s.audience.startsWith("group:")) {
      const groupId = s.audience.slice("group:".length);
      const member = await this.prisma.client.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: auth.userId } },
      });
      return Boolean(member);
    }
    return true; // org-wide
  }

  private async toDto(auth: AuthedUser, s: StatusWithRels): Promise<StatusDto> {
    const audienceTotal = await this.audienceSize(s, auth.organizationId);
    let audienceLabel = "Everyone at Acme";
    if (s.audience.startsWith("group:")) {
      const g = await this.prisma.client.group.findUnique({ where: { id: s.audience.slice(6) } });
      audienceLabel = g ? `${g.name}` : "Selected audience";
    }
    const reactionsByEmoji = new Map<string, number>();
    for (const r of s.reactions) reactionsByEmoji.set(r.emoji, (reactionsByEmoji.get(r.emoji) ?? 0) + 1);
    return {
      id: s.id,
      owner: {
        id: s.owner.id,
        name: s.owner.name,
        initials: initials(s.owner.name),
        avatarColor: s.owner.avatarColor,
        presence: s.owner.presence,
      },
      caption: s.caption,
      mediaStyle: s.mediaStyle,
      audienceLabel,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      viewedByMe: s.views.some((v) => v.userId === auth.userId),
      viewCount: s.views.length,
      notViewedCount: Math.max(0, audienceTotal - s.views.length),
      reactions: [...reactionsByEmoji.entries()].map(([emoji, count]) => ({ emoji, count })),
    };
  }

  async feed(auth: AuthedUser): Promise<StatusDto[]> {
    const rows = await this.prisma.client.status.findMany({
      where: {
        deletedAt: null,
        expiresAt: { gt: new Date() },
        owner: { memberships: { some: { organizationId: auth.organizationId } } },
      },
      include: statusInclude,
      orderBy: { createdAt: "desc" },
    });
    const visible: StatusWithRels[] = [];
    for (const s of rows) if (await this.canView(auth, s)) visible.push(s);
    return Promise.all(visible.map((s) => this.toDto(auth, s)));
  }

  async create(auth: AuthedUser, input: { caption?: string; mediaStyle?: string; audience?: string }): Promise<StatusDto> {
    const s = await this.prisma.client.status.create({
      data: {
        ownerId: auth.userId,
        caption: input.caption,
        mediaStyle: input.mediaStyle ?? "linear-gradient(150deg,#2c2650,#1a1538 55%,#0e0b22)",
        audience: input.audience ?? "org",
        expiresAt: new Date(Date.now() + 24 * 3600_000),
      },
      include: statusInclude,
    });
    const dto = await this.toDto(auth, s);
    this.rt.emitToOrg(auth.organizationId, RT.statusCreated, dto);
    return dto;
  }

  /** Record a view — idempotent by primary key. */
  async view(auth: AuthedUser, statusId: string): Promise<StatusDto> {
    const s = await this.load(auth, statusId);
    if (s.ownerId !== auth.userId) {
      await this.prisma.client.statusView
        .create({ data: { statusId, userId: auth.userId } })
        .catch(() => void 0); // duplicate view = no-op
      this.rt.emitToUser(s.ownerId, RT.statusViewed, { statusId, userId: auth.userId });
    }
    const fresh = await this.prisma.client.status.findUniqueOrThrow({ where: { id: statusId }, include: statusInclude });
    return this.toDto(auth, fresh);
  }

  async react(auth: AuthedUser, statusId: string, emoji: string): Promise<StatusDto> {
    const s = await this.load(auth, statusId);
    await this.prisma.client.statusReaction.create({ data: { statusId, userId: auth.userId, emoji } });
    this.rt.emitToUser(s.ownerId, RT.statusReaction, { statusId, emoji, userId: auth.userId });
    const fresh = await this.prisma.client.status.findUniqueOrThrow({ where: { id: statusId }, include: statusInclude });
    return this.toDto(auth, fresh);
  }

  /** Open the DM; reply content is composed and encrypted by the chat client. */
  async reply(auth: AuthedUser, statusId: string): Promise<{ conversationId: string; slug: string | null }> {
    const s = await this.load(auth, statusId);
    if (s.ownerId === auth.userId) throw new ForbiddenException("You cannot reply to your own status");
    const conv = await this.conversations.openDm(auth, s.ownerId);
    return { conversationId: conv.id, slug: conv.slug };
  }

  async remove(auth: AuthedUser, statusId: string): Promise<{ ok: true }> {
    const s = await this.prisma.client.status.findUnique({ where: { id: statusId } });
    if (!s || s.ownerId !== auth.userId) throw new NotFoundException("Status not found");
    await this.prisma.client.status.update({ where: { id: statusId }, data: { deletedAt: new Date() } });
    this.rt.emitToOrg(auth.organizationId, RT.statusDeleted, { statusId });
    return { ok: true };
  }

  private async load(auth: AuthedUser, statusId: string): Promise<StatusWithRels> {
    const s = await this.prisma.client.status.findFirst({
      where: { id: statusId, deletedAt: null, expiresAt: { gt: new Date() } },
      include: statusInclude,
    });
    if (!s || !(await this.canView(auth, s))) throw new NotFoundException("Status not found");
    return s;
  }
}
