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

    // Cleared history stays hidden from this user, so both the unread count and
    // the preview must start after the later of "last read" and "cleared".
    const unreadSince = [mine.lastReadAt, mine.clearedAt]
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    const unreadCount = await this.prisma.client.message.count({
      where: {
        conversationId: conv.id,
        deletedAt: null,
        senderId: { not: auth.userId },
        ...(unreadSince ? { createdAt: { gt: unreadSince } } : {}),
      },
    });

    const last = await this.prisma.client.message.findFirst({
      where: {
        conversationId: conv.id,
        deletedAt: null,
        ...(mine.clearedAt ? { createdAt: { gt: mine.clearedAt } } : {}),
      },
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
      if (pm && !pm.deletedAt) pinned = { id: pm.id, text: pm.text ?? "Encrypted message", authorName: pm.sender.name };
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
      // A timed mute that has lapsed is no longer a mute.
      muted: mine.muted && (!mine.mutedUntil || mine.mutedUntil > new Date()),
      lastMessage: last
        ? {
            text:
              last.text ?? (last.poll ? "📊 Poll" : "Encrypted message"),
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

    // "Delete chat" hides a thread for this user only, and only until something
    // new arrives — matching the behaviour people expect from messaging apps.
    const visible = [];
    for (const c of convs) {
      const mine = c.participants.find((p) => p.userId === auth.userId);
      if (mine?.hiddenAt) {
        const since = await this.prisma.client.message.count({
          where: { conversationId: c.id, deletedAt: null, createdAt: { gt: mine.hiddenAt } },
        });
        if (since === 0) continue;
      }
      visible.push(c);
    }
    return Promise.all(visible.map((c) => this.toDto(auth, c)));
  }

  /** Hide this user's history before now. The other participant keeps theirs. */
  async clear(auth: AuthedUser, idOrSlug: string): Promise<{ ok: true }> {
    const conv = await this.resolve(auth, idOrSlug);
    await this.prisma.client.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: conv.id, userId: auth.userId } },
      data: { clearedAt: new Date() },
    });
    return { ok: true };
  }

  /** Clear plus drop the thread from this user's list until a new message. */
  async deleteForMe(auth: AuthedUser, idOrSlug: string): Promise<{ ok: true }> {
    const conv = await this.resolve(auth, idOrSlug);
    const now = new Date();
    await this.prisma.client.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: conv.id, userId: auth.userId } },
      data: { clearedAt: now, hiddenAt: now },
    });
    return { ok: true };
  }

  /**
   * Mute indefinitely, for a fixed window, or not at all.
   * `minutes` null = indefinite; 0 = unmute.
   */
  async setMute(auth: AuthedUser, idOrSlug: string, minutes: number | null): Promise<{ ok: true }> {
    const conv = await this.resolve(auth, idOrSlug);
    const data =
      minutes === 0
        ? { muted: false, mutedUntil: null }
        : minutes === null
          ? { muted: true, mutedUntil: null }
          : { muted: true, mutedUntil: new Date(Date.now() + minutes * 60_000) };
    await this.prisma.client.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: conv.id, userId: auth.userId } },
      data,
    });
    this.rt.emitToUser(auth.userId, RT.conversationUpdated, { conversationId: conv.id });
    return { ok: true };
  }

  async get(auth: AuthedUser, idOrSlug: string): Promise<ConversationDto> {
    const conv = await this.resolve(auth, idOrSlug);
    return this.toDto(auth, conv, { withParticipants: true });
  }

  /**
   * Mark this user's unread messages as read.
   *
   * `upToMessageId` bounds the sweep at the last message the client actually
   * rendered, so a partially-scrolled thread does not mark messages read that
   * were never on screen. Omitted, it means "everything currently in the
   * thread", which is what opening a short conversation does.
   *
   * The lower bound is the participant's existing `lastReadAt`: without it this
   * re-examined every message from the other party on every open, which is a
   * full-conversation scan per visit.
   */
  async markRead(auth: AuthedUser, idOrSlug: string, upToMessageId?: string): Promise<{ ok: true }> {
    const conv = await this.resolve(auth, idOrSlug);
    const now = new Date();

    const participant = await this.prisma.client.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: conv.id, userId: auth.userId } },
      select: { lastReadAt: true },
    });

    // Resolve the ceiling to a timestamp, and verify it belongs to THIS
    // conversation so a client cannot widen the sweep with a foreign id.
    let ceiling: Date | undefined;
    if (upToMessageId) {
      const boundary = await this.prisma.client.message.findFirst({
        where: { id: upToMessageId, conversationId: conv.id },
        select: { createdAt: true },
      });
      if (!boundary) throw new NotFoundException("Message not found in this conversation");
      ceiling = boundary.createdAt;
    }

    await this.prisma.client.$transaction(async (tx) => {
      const unread = await tx.message.findMany({
        where: {
          conversationId: conv.id,
          senderId: { not: auth.userId },
          deletedAt: null,
          createdAt: {
            ...(participant?.lastReadAt ? { gt: participant.lastReadAt } : {}),
            ...(ceiling ? { lte: ceiling } : {}),
          },
        },
        select: { id: true },
      });

      if (unread.length) {
        const ids = unread.map((m) => m.id);
        // Upsert rather than createMany: a row may already exist carrying only
        // deliveredAt, and that receipt must gain readAt instead of being
        // skipped as a duplicate.
        for (const id of ids) {
          await tx.messageReceipt.upsert({
            where: { messageId_userId: { messageId: id, userId: auth.userId } },
            create: { messageId: id, userId: auth.userId, deliveredAt: now, readAt: now },
            update: { readAt: now, deliveredAt: { set: now } },
          });
        }
        // READ is terminal, so this only ever advances state.
        await tx.message.updateMany({
          where: { id: { in: ids }, state: { not: "READ" } },
          data: { state: "READ" },
        });
      }

      // Advance the watermark only as far as was actually read.
      await tx.conversationParticipant.update({
        where: { conversationId_userId: { conversationId: conv.id, userId: auth.userId } },
        data: { lastReadAt: ceiling ?? now },
      });
    });

    this.rt.emitToConversation(conv.id, RT.readUpdated, {
      conversationId: conv.id,
      userId: auth.userId,
      lastReadAt: (ceiling ?? now).toISOString(),
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
