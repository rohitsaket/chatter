import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { ConversationDto, ParticipantDto } from "@chatter/contracts";
import { RT } from "@chatter/realtime";
import type { Conversation, ConversationParticipant, Group, User } from "@chatter/database";
import { PrismaService } from "../../common/prisma.service";
import type { AuthedUser } from "../../common/session.service";
import { RealtimeGateway } from "../../realtime/realtime.gateway";
import { initials, toUserDto } from "../users/users.service";

type ConvWithRels = Conversation & {
  group: Group | null;
  participants: (ConversationParticipant & { user: User })[];
};

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeGateway,
  ) {}

  /** Load a conversation by id or slug, enforcing org + participant access. */
  async resolve(auth: AuthedUser, idOrSlug: string): Promise<ConvWithRels> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const conv = await this.prisma.client.conversation.findFirst({
      where: {
        organizationId: auth.organizationId,
        ...(isUuid ? { id: idOrSlug } : { slug: idOrSlug }),
      },
      include: { group: true, participants: { include: { user: true } } },
    });
    if (!conv) throw new NotFoundException("Conversation not found");
    if (!conv.participants.some((p) => p.userId === auth.userId)) {
      throw new ForbiddenException("You are not a participant of this conversation");
    }
    return conv;
  }

  private async toDto(auth: AuthedUser, conv: ConvWithRels, opts?: { withParticipants?: boolean }): Promise<ConversationDto> {
    const mine = conv.participants.find((p) => p.userId === auth.userId)!;
    const others = conv.participants.filter((p) => p.userId !== auth.userId);
    const dmOther = conv.kind === "DM" ? others[0]?.user : undefined;

    const unreadCount = await this.prisma.client.message.count({
      where: {
        conversationId: conv.id,
        deletedAt: null,
        senderId: { not: auth.userId },
        ...(mine.lastReadAt ? { createdAt: { gt: mine.lastReadAt } } : {}),
      },
    });

    const last = await this.prisma.client.message.findFirst({
      where: { conversationId: conv.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { sender: true, attachments: { include: { file: true } }, poll: true },
    });

    const onlineCount = conv.participants.filter((p) => p.user.presence === "ONLINE").length;
    const name = conv.kind === "DM" ? (dmOther?.name ?? "Conversation") : (conv.group?.name ?? "Group");

    let pinned: ConversationDto["pinnedMessage"] = null;
    if (conv.pinnedMessageId) {
      const pm = await this.prisma.client.message.findUnique({
        where: { id: conv.pinnedMessageId },
        include: { sender: true },
      });
      if (pm && !pm.deletedAt) pinned = { id: pm.id, text: pm.text ?? "", authorName: pm.sender.name };
    }

    const participants: ParticipantDto[] | undefined = opts?.withParticipants
      ? conv.participants.map((p) => ({
          userId: p.userId,
          name: p.user.name,
          initials: initials(p.user.name),
          avatarColor: p.user.avatarColor,
          presence: p.user.presence,
          role: p.role,
        }))
      : undefined;

    return {
      id: conv.id,
      slug: conv.slug,
      kind: conv.kind,
      name,
      subtitle:
        conv.kind === "DM"
          ? dmOther
            ? toUserDto(dmOther).presence === "ONLINE"
              ? "Online"
              : toUserDto(dmOther).presence === "AWAY"
                ? "Away"
                : "Offline"
            : ""
          : `${conv.participants.length} members • ${onlineCount} online`,
      icon: conv.kind === "DM" ? initials(dmOther?.name ?? "?") : (conv.group?.icon ?? "G"),
      avatarColor:
        conv.kind === "DM"
          ? (dmOther?.avatarColor ?? "linear-gradient(135deg,#8f9bb3,#4a5670)")
          : (conv.group?.avatarColor ?? "linear-gradient(135deg,#8950f5,#5e28c7)"),
      online: conv.kind === "DM" ? dmOther?.presence === "ONLINE" : false,
      typing: [],
      unreadCount,
      favorite: mine.favorite,
      archived: mine.archived,
      muted: mine.muted,
      lastMessage: last
        ? {
            text:
              last.text ??
              (last.poll ? "📊 Poll" : last.attachments[0] ? `📎 ${last.attachments[0].file.name}` : ""),
            senderName: last.sender.name.split(" ")[0] ?? last.sender.name,
            senderIsSelf: last.senderId === auth.userId,
            at: last.createdAt.toISOString(),
          }
        : null,
      updatedAt: conv.updatedAt.toISOString(),
      about: conv.kind === "DM" ? (dmOther?.about ?? null) : (conv.group?.description ?? null),
      groupId: conv.group?.id ?? null,
      pinnedMessage: pinned,
      participants,
    };
  }

  async list(auth: AuthedUser, filter?: { archived?: boolean }): Promise<ConversationDto[]> {
    const convs = await this.prisma.client.conversation.findMany({
      where: {
        organizationId: auth.organizationId,
        participants: { some: { userId: auth.userId, archived: filter?.archived ?? false } },
      },
      include: { group: true, participants: { include: { user: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return Promise.all(convs.map((c) => this.toDto(auth, c)));
  }

  async get(auth: AuthedUser, idOrSlug: string): Promise<ConversationDto> {
    const conv = await this.resolve(auth, idOrSlug);
    return this.toDto(auth, conv, { withParticipants: true });
  }

  async markRead(auth: AuthedUser, idOrSlug: string): Promise<{ ok: true }> {
    const conv = await this.resolve(auth, idOrSlug);
    const now = new Date();
    await this.prisma.client.$transaction(async (tx) => {
      await tx.conversationParticipant.update({
        where: { conversationId_userId: { conversationId: conv.id, userId: auth.userId } },
        data: { lastReadAt: now },
      });
      // Read receipts for the sender's double-check ticks.
      const unread = await tx.message.findMany({
        where: { conversationId: conv.id, senderId: { not: auth.userId }, deletedAt: null },
        select: { id: true },
      });
      if (unread.length) {
        await tx.messageReceipt.createMany({
          data: unread.map((m) => ({ messageId: m.id, userId: auth.userId })),
          skipDuplicates: true,
        });
        await tx.message.updateMany({
          where: { id: { in: unread.map((m) => m.id) }, state: { not: "READ" } },
          data: { state: "READ" },
        });
      }
    });
    this.rt.emitToConversation(conv.id, RT.readUpdated, {
      conversationId: conv.id,
      userId: auth.userId,
      lastReadAt: now.toISOString(),
    });
    return { ok: true };
  }

  async setFlag(
    auth: AuthedUser,
    idOrSlug: string,
    flag: "favorite" | "archived" | "muted",
    value: boolean,
  ): Promise<{ ok: true }> {
    const conv = await this.resolve(auth, idOrSlug);
    await this.prisma.client.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: conv.id, userId: auth.userId } },
      data: { [flag]: value },
    });
    return { ok: true };
  }

  /** Create (or return existing) DM with another org member. */
  async openDm(auth: AuthedUser, otherUserId: string): Promise<ConversationDto> {
    const other = await this.prisma.client.membership.findFirst({
      where: { userId: otherUserId, organizationId: auth.organizationId, suspended: false },
      include: { user: true },
    });
    if (!other) throw new NotFoundException("User not found in your organization");

    const existing = await this.prisma.client.conversation.findFirst({
      where: {
        organizationId: auth.organizationId,
        kind: "DM",
        AND: [
          { participants: { some: { userId: auth.userId } } },
          { participants: { some: { userId: otherUserId } } },
        ],
      },
      include: { group: true, participants: { include: { user: true } } },
    });
    if (existing) return this.toDto(auth, existing, { withParticipants: true });

    const created = await this.prisma.client.conversation.create({
      data: {
        organizationId: auth.organizationId,
        kind: "DM",
        participants: { create: [{ userId: auth.userId }, { userId: otherUserId }] },
      },
      include: { group: true, participants: { include: { user: true } } },
    });
    await this.rt.joinUserToConversation(auth.userId, created.id);
    await this.rt.joinUserToConversation(otherUserId, created.id);
    return this.toDto(auth, created, { withParticipants: true });
  }
}
