import { createHash } from "node:crypto";
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { MessageDto, Page, PollDto, SendMessageBody } from "@chatter/contracts";
import { RT } from "@chatter/realtime";
import { can } from "@chatter/permissions";
import type { Prisma } from "@chatter/database";
import { PrismaService } from "../../common/prisma.service";
import { OutboxService } from "../../common/outbox.service";
import type { AuthedUser } from "../../common/session.service";
import { RealtimeGateway } from "../../realtime/realtime.gateway";
import { ConversationsService } from "../conversations/conversations.service";
import { initials } from "../users/users.service";

const messageInclude = {
  sender: true,
  replyTo: { include: { sender: true } },
  reactions: true,
  encryption: true,
  attachments: { include: { file: true } },
  poll: { include: { options: { include: { votes: true }, orderBy: { order: "asc" as const } }, message: { include: { sender: true } } } },
} satisfies Prisma.MessageInclude;

type MessageWithRels = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationsService,
    private readonly rt: RealtimeGateway,
    private readonly outbox: OutboxService,
  ) {}

  private toDto(auth: AuthedUser, m: MessageWithRels, groupRoles?: Map<string, string>): MessageDto {
    const reactionMap = new Map<string, { count: number; mine: boolean }>();
    for (const r of m.reactions) {
      const cur = reactionMap.get(r.emoji) ?? { count: 0, mine: false };
      cur.count += 1;
      if (r.userId === auth.userId) cur.mine = true;
      reactionMap.set(r.emoji, cur);
    }
    let poll: PollDto | null = null;
    if (m.poll) {
      let myOptionId: string | null = null;
      for (const o of m.poll.options) {
        if (o.votes.some((v) => v.userId === auth.userId)) myOptionId = o.id;
      }
      poll = {
        id: m.poll.id,
        question: m.poll.question,
        totalVotes: m.poll.options.reduce((a, o) => a + o.votes.length, 0),
        myOptionId,
        options: m.poll.options.map((o) => ({ id: o.id, label: o.label, votes: o.votes.length })),
        authorName: m.poll.message.sender.name,
      };
    }
    return {
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      senderName: m.sender.name,
      senderInitials: initials(m.sender.name),
      senderAvatarColor: m.sender.avatarColor,
      senderRole: groupRoles?.get(m.senderId) ?? null,
      mine: m.senderId === auth.userId,
      text: m.deletedAt ? null : m.text,
      legacyPlaintext: !m.deletedAt && Boolean(m.text) && !m.encryption,
      encryption:
        m.deletedAt || !m.encryption
          ? null
          : {
              protocolVersion: "matrix-olm-megolm.v1",
              algorithm: "m.megolm.v1.aes-sha2",
              ciphertext: m.encryption.encryptedPayload,
              sessionId: m.encryption.sessionId,
              senderDeviceId: m.encryption.senderDeviceId,
            },
      createdAt: m.createdAt.toISOString(),
      editedAt: m.editedAt?.toISOString() ?? null,
      state: m.state,
      replyTo:
        m.replyTo && !m.replyTo.deletedAt
          ? { id: m.replyTo.id, text: m.replyTo.text ?? "Encrypted message", senderName: m.replyTo.sender.name }
          : null,
      reactions: [...reactionMap.entries()].map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine })),
      attachments: m.attachments.map((a) => ({
        fileId: a.fileId,
        name: a.file.name,
        type: a.file.type,
        sizeBytes: Number(a.file.sizeBytes),
        encrypted: a.file.encrypted,
      })),
      poll,
    };
  }

  private async groupRoleLabels(conversationId: string): Promise<Map<string, string>> {
    const group = await this.prisma.client.group.findUnique({
      where: { conversationId },
      include: { members: { include: { user: true } } },
    });
    const map = new Map<string, string>();
    if (!group) return map;
    for (const gm of group.members) {
      const label =
        gm.role === "ADMIN" || gm.role === "OWNER"
          ? "Admin"
          : gm.role === "MODERATOR"
            ? "Moderator"
            : (gm.user.title ?? "Member");
      map.set(gm.userId, label);
    }
    return map;
  }

  async list(auth: AuthedUser, idOrSlug: string, cursor?: string, limit = 50): Promise<Page<MessageDto>> {
    const conv = await this.conversations.resolve(auth, idOrSlug);
    const roles = conv.kind === "GROUP" ? await this.groupRoleLabels(conv.id) : undefined;
    // Messages cleared by this user are hidden from them only.
    const mine = conv.participants.find((p) => p.userId === auth.userId);
    const rows = await this.prisma.client.message.findMany({
      where: {
        conversationId: conv.id,
        ...(mine?.clearedAt ? { createdAt: { gt: mine.clearedAt } } : {}),
      },
      include: messageInclude,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit).reverse();
    return {
      items: page.map((m) => this.toDto(auth, m, roles)),
      nextCursor: hasMore ? (rows[limit - 1]?.id ?? null) : null,
    };
  }

  async send(auth: AuthedUser, idOrSlug: string, body: SendMessageBody): Promise<MessageDto> {
    const conv = await this.conversations.resolve(auth, idOrSlug);
    const otherUserIds = conv.participants.filter((participant) => participant.userId !== auth.userId).map((participant) => participant.userId);
    const blocked = await this.prisma.client.contact.findFirst({
      where: { blocked: true, OR: [
        { ownerId: auth.userId, targetId: { in: otherUserIds } },
        { targetId: auth.userId, ownerId: { in: otherUserIds } },
      ] },
    });
    if (blocked) throw new ForbiddenException("Messaging is unavailable for this conversation");

    if (body.idempotencyKey) {
      const existing = await this.prisma.client.message.findFirst({
        where: { conversationId: conv.id, senderId: auth.userId, idempotencyKey: body.idempotencyKey },
        include: messageInclude,
      });
      if (existing) return this.toDto(auth, existing);
    }
    if (body.replyToId) {
      const target = await this.prisma.client.message.findFirst({
        where: { id: body.replyToId, conversationId: conv.id },
      });
      if (!target) throw new NotFoundException("Reply target not found in this conversation");
    }

    const attachmentIds = [...new Set(body.attachmentIds ?? [])];
    if (attachmentIds.length) {
      const ownedEncryptedFiles = await this.prisma.client.file.count({
        where: {
          id: { in: attachmentIds },
          organizationId: auth.organizationId,
          ownerId: auth.userId,
          encrypted: true,
          status: "READY",
        },
      });
      if (ownedEncryptedFiles !== attachmentIds.length) {
        throw new ForbiddenException("Every attachment must be an encrypted file owned by this sender");
      }
    }

    const ciphertextHash = createHash("sha256").update(body.encryptedEnvelope.ciphertext).digest("hex");
    const replay = await this.prisma.client.messageEncryption.findUnique({
      where: { senderDeviceId_ciphertextHash: { senderDeviceId: auth.deviceId, ciphertextHash } },
      include: { message: { include: messageInclude } },
    });
    if (replay) {
      if (
        replay.message.conversationId === conv.id &&
        replay.message.senderId === auth.userId &&
        replay.message.idempotencyKey === body.idempotencyKey
      ) {
        return this.toDto(auth, replay.message);
      }
      throw new ConflictException("Ciphertext replay rejected");
    }

    const created = await this.prisma.client.$transaction(async (tx) => {
      const m = await tx.message.create({
        data: {
          conversationId: conv.id,
          senderId: auth.userId,
          text: null,
          replyToId: body.replyToId,
          idempotencyKey: body.idempotencyKey,
          state: "SENT",
          encryption: {
            create: {
              encryptedPayload: body.encryptedEnvelope.ciphertext,
              protocolVersion: body.encryptedEnvelope.protocolVersion,
              algorithm: body.encryptedEnvelope.algorithm,
              sessionId: body.encryptedEnvelope.sessionId,
              senderDeviceId: auth.deviceId,
              ciphertextHash,
            },
          },
          attachments: attachmentIds.length
            ? { create: attachmentIds.map((fileId) => ({ fileId })) }
            : undefined,
        },
        include: messageInclude,
      });
      await tx.conversationParticipant.update({
        where: { conversationId_userId: { conversationId: conv.id, userId: auth.userId } },
        data: { lastReadAt: m.createdAt },
      });
      await tx.conversation.update({ where: { id: conv.id }, data: { updatedAt: m.createdAt } });
      await this.outbox.write(tx, "message.created", { messageId: m.id, conversationId: conv.id });
      return m;
    });

    const roles = conv.kind === "GROUP" ? await this.groupRoleLabels(conv.id) : undefined;
    const dto = this.toDto(auth, created, roles);
    // Low-latency emit; each recipient recomputes `mine` client-side by senderId.
    this.rt.emitToConversation(conv.id, RT.messageCreated, dto);
    return dto;
  }

  async edit(auth: AuthedUser, messageId: string, body: SendMessageBody["encryptedEnvelope"]): Promise<MessageDto> {
    const m = await this.owned(auth, messageId);
    if (!m.encryption) throw new ForbiddenException("Legacy plaintext messages cannot be edited");
    const ciphertextHash = createHash("sha256").update(body.ciphertext).digest("hex");
    const updated = await this.prisma.client.message.update({
      where: { id: m.id },
      data: {
        text: null,
        editedAt: new Date(),
        encryption: {
          update: {
            encryptedPayload: body.ciphertext,
            protocolVersion: body.protocolVersion,
            algorithm: body.algorithm,
            sessionId: body.sessionId,
            senderDeviceId: auth.deviceId,
            ciphertextHash,
          },
        },
      },
      include: messageInclude,
    });
    const dto = this.toDto(auth, updated);
    this.rt.emitToConversation(m.conversationId, RT.messageUpdated, dto);
    return dto;
  }

  async remove(auth: AuthedUser, messageId: string): Promise<{ ok: true }> {
    const m = await this.prisma.client.message.findUnique({ where: { id: messageId }, include: { conversation: true } });
    if (!m || m.conversation.organizationId !== auth.organizationId) throw new NotFoundException();
    const isOwner = m.senderId === auth.userId;
    if (!isOwner && !can(auth.orgRole, "message.delete_any")) {
      throw new ForbiddenException("You can only delete your own messages");
    }
    await this.prisma.client.message.update({ where: { id: m.id }, data: { deletedAt: new Date(), text: null } });
    this.rt.emitToConversation(m.conversationId, RT.messageDeleted, { messageId: m.id, conversationId: m.conversationId });
    return { ok: true };
  }

  async react(auth: AuthedUser, messageId: string, emoji: string): Promise<MessageDto> {
    const m = await this.accessible(auth, messageId);
    const existing = await this.prisma.client.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId: auth.userId, emoji } },
    });
    if (existing) {
      await this.prisma.client.messageReaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.client.messageReaction.create({ data: { messageId, userId: auth.userId, emoji } });
    }
    const updated = await this.prisma.client.message.findUniqueOrThrow({ where: { id: messageId }, include: messageInclude });
    const dto = this.toDto(auth, updated);
    this.rt.emitToConversation(m.conversationId, RT.reactionUpdated, dto);
    return dto;
  }

  async vote(auth: AuthedUser, messageId: string, optionId: string): Promise<MessageDto> {
    const m = await this.accessible(auth, messageId);
    const poll = await this.prisma.client.poll.findUnique({ where: { messageId }, include: { options: true } });
    if (!poll) throw new NotFoundException("This message has no poll");
    if (!poll.options.some((o) => o.id === optionId)) throw new NotFoundException("Unknown poll option");
    await this.prisma.client.pollVote.upsert({
      where: { pollId_userId: { pollId: poll.id, userId: auth.userId } },
      update: { optionId },
      create: { pollId: poll.id, optionId, userId: auth.userId },
    });
    const updated = await this.prisma.client.message.findUniqueOrThrow({ where: { id: messageId }, include: messageInclude });
    const dto = this.toDto(auth, updated);
    this.rt.emitToConversation(m.conversationId, RT.pollUpdated, dto);
    return dto;
  }

  async pin(auth: AuthedUser, messageId: string): Promise<{ ok: true }> {
    const m = await this.accessible(auth, messageId);
    if (!can(auth.orgRole, "message.pin")) throw new ForbiddenException("Moderator role required to pin");
    await this.prisma.client.conversation.update({
      where: { id: m.conversationId },
      data: { pinnedMessageId: messageId },
    });
    this.rt.emitToConversation(m.conversationId, RT.conversationUpdated, { conversationId: m.conversationId });
    return { ok: true };
  }

  private async owned(auth: AuthedUser, messageId: string) {
    const m = await this.accessible(auth, messageId);
    if (m.senderId !== auth.userId) throw new ForbiddenException("Not your message");
    return m;
  }

  private async accessible(auth: AuthedUser, messageId: string) {
    const m = await this.prisma.client.message.findUnique({
      where: { id: messageId },
      include: { encryption: true, conversation: { include: { participants: true } } },
    });
    if (
      !m ||
      m.conversation.organizationId !== auth.organizationId ||
      !m.conversation.participants.some((p) => p.userId === auth.userId)
    ) {
      throw new NotFoundException("Message not found");
    }
    return m;
  }
}
