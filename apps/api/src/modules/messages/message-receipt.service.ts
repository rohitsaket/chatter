import { ForbiddenException, Inject, Injectable, NotFoundException, forwardRef } from "@nestjs/common";
import { RT } from "@chatter/realtime";
import { PrismaService } from "../../common/prisma.service";
import type { AuthedUser } from "../../common/session.service";
import { RealtimeGateway } from "../../realtime/realtime.gateway";

/**
 * Delivery and read acknowledgements.
 *
 * Business rules live here rather than in the socket handlers, so the same
 * authorization applies whether an acknowledgement arrives over the websocket
 * or over HTTP.
 *
 * Two invariants hold throughout:
 *
 *  - Delivery and read are distinct acknowledgements from the recipient's
 *    client. Neither is ever inferred from presence: an online user has NOT
 *    received a message until their client says so.
 *  - State only advances. SENT -> DELIVERED -> READ, never backwards, so a
 *    late or duplicated delivery ACK can never demote a message already read.
 */
@Injectable()
export class MessageReceiptService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => RealtimeGateway))
    private readonly rt: RealtimeGateway,
  ) {}

  /**
   * Recipient's client acknowledges it received a message.
   *
   * Idempotent: the receipt's composite key makes a repeat ACK a no-op update,
   * and `deliveredAt` is only ever written when currently null, so retries do
   * not move the timestamp.
   */
  async markDelivered(auth: AuthedUser, messageId: string): Promise<{ ok: true }> {
    const message = await this.loadAcknowledgeable(auth, messageId);
    const now = new Date();

    const existing = await this.prisma.client.messageReceipt.findUnique({
      where: { messageId_userId: { messageId, userId: auth.userId } },
      select: { deliveredAt: true, readAt: true },
    });

    // Already acknowledged (delivered or read) — nothing to do, and nothing to
    // re-broadcast. Repeat ACKs after a network retry land here.
    if (existing?.deliveredAt || existing?.readAt) return { ok: true };

    await this.prisma.client.messageReceipt.upsert({
      where: { messageId_userId: { messageId, userId: auth.userId } },
      create: { messageId, userId: auth.userId, deliveredAt: now },
      update: { deliveredAt: now },
    });

    // Only promotes SENT. A message already READ is left alone, which is what
    // stops a delayed delivery ACK regressing it.
    const promoted = await this.prisma.client.message.updateMany({
      where: { id: messageId, state: "SENT" },
      data: { state: "DELIVERED" },
    });

    if (promoted.count > 0) {
      this.rt.emitToUser(message.senderId, RT.messageDelivered, {
        messageId,
        conversationId: message.conversationId,
        userId: auth.userId,
        deliveredAt: now.toISOString(),
      });
    }
    return { ok: true };
  }

  /**
   * Sweep every message the recipient has received but not yet acknowledged in
   * this conversation. Called on reconnect: events emitted while the socket was
   * down were never seen, so the client cannot ACK them individually.
   *
   * Returns the ids it acknowledged so the caller can report progress.
   */
  async markConversationDelivered(auth: AuthedUser, conversationId: string): Promise<string[]> {
    await this.assertParticipant(auth, conversationId);
    const pending = await this.prisma.client.message.findMany({
      where: {
        conversationId,
        senderId: { not: auth.userId },
        deletedAt: null,
        // Deliberately not `state: SENT` — another recipient in a group may have
        // already advanced the message while this user still owes a receipt.
        receipts: { none: { userId: auth.userId } },
      },
      select: { id: true },
      take: 500,
    });

    for (const m of pending) await this.markDelivered(auth, m.id);
    return pending.map((m) => m.id);
  }

  /**
   * A message is acknowledgeable only by someone who is a participant in its
   * conversation and is NOT its sender. This is the anti-spoofing boundary:
   * `auth` comes from the session, never from the client payload, so User A
   * cannot acknowledge on User B's behalf.
   */
  private async loadAcknowledgeable(
    auth: AuthedUser,
    messageId: string,
  ): Promise<{ senderId: string; conversationId: string }> {
    const message = await this.prisma.client.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, conversationId: true, deletedAt: true },
    });
    // Same 404 for "no such message" and "deleted": a deleted message must not
    // be resurrected by a receipt sync, and its prior existence is not
    // something an outsider should be able to probe.
    if (!message || message.deletedAt) throw new NotFoundException("Message not found");
    if (message.senderId === auth.userId) {
      throw new ForbiddenException("You cannot acknowledge your own message");
    }
    await this.assertParticipant(auth, message.conversationId);
    return { senderId: message.senderId, conversationId: message.conversationId };
  }

  private async assertParticipant(auth: AuthedUser, conversationId: string): Promise<void> {
    const participant = await this.prisma.client.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: auth.userId } },
      select: { conversationId: true },
    });
    if (!participant) throw new ForbiddenException("You are not a participant in this conversation");
  }
}
