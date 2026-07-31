import { Injectable, NotFoundException } from "@nestjs/common";
import { createJoinToken, NOT_CONFIGURED_REASON } from "@chatter/calls";
import { livekitConfigured } from "@chatter/config";
import type { CallTokenDto } from "@chatter/contracts";
import { RT } from "@chatter/realtime";
import { PrismaService } from "../../common/prisma.service";
import type { AuthedUser } from "../../common/session.service";
import { RealtimeGateway } from "../../realtime/realtime.gateway";
import { ConversationsService } from "../conversations/conversations.service";

@Injectable()
export class CallsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationsService,
    private readonly rt: RealtimeGateway,
  ) {}

  /**
   * Start (or join) a call for a conversation and mint a LiveKit token.
   * When LiveKit is unconfigured this returns configured=false with a truthful
   * reason — no call is simulated and no Call row is created.
   */
  async join(auth: AuthedUser, idOrSlug: string): Promise<CallTokenDto> {
    const conv = await this.conversations.resolve(auth, idOrSlug);
    if (!livekitConfigured()) {
      return { configured: false, reason: NOT_CONFIGURED_REASON };
    }
    let call = await this.prisma.client.call.findFirst({
      where: { conversationId: conv.id, state: { not: "ENDED" } },
    });
    if (!call) {
      call = await this.prisma.client.call.create({
        data: {
          organizationId: auth.organizationId,
          conversationId: conv.id,
          kind: conv.kind,
          roomName: `conv-${conv.id}`,
          state: "ACTIVE",
          startedById: auth.userId,
        },
      });
      for (const p of conv.participants) {
        if (p.userId !== auth.userId) {
          this.rt.emitToUser(p.userId, RT.callIncoming, {
            callId: call.id,
            conversationId: conv.id,
            fromName: auth.name,
          });
        }
      }
    }
    await this.prisma.client.callParticipant.upsert({
      where: { callId_userId: { callId: call.id, userId: auth.userId } },
      update: { leftAt: null },
      create: { callId: call.id, userId: auth.userId },
    });
    const token = await createJoinToken({ roomName: call.roomName, identity: auth.userId, name: auth.name });
    return { ...token, roomName: call.roomName };
  }

  async leave(auth: AuthedUser, callId: string): Promise<{ ok: true }> {
    const call = await this.prisma.client.call.findFirst({
      where: { id: callId, organizationId: auth.organizationId },
      include: { participants: true },
    });
    if (!call) throw new NotFoundException("Call not found");
    await this.prisma.client.callParticipant.updateMany({
      where: { callId, userId: auth.userId, leftAt: null },
      data: { leftAt: new Date() },
    });
    const remaining = await this.prisma.client.callParticipant.count({ where: { callId, leftAt: null } });
    if (remaining === 0) {
      await this.prisma.client.call.update({ where: { id: callId }, data: { state: "ENDED", endedAt: new Date() } });
      if (call.conversationId) this.rt.emitToConversation(call.conversationId, RT.callEnded, { callId });
    }
    return { ok: true };
  }

  async history(auth: AuthedUser) {
    const calls = await this.prisma.client.call.findMany({
      where: { organizationId: auth.organizationId, participants: { some: { userId: auth.userId } } },
      include: { participants: { include: { user: true } } },
      orderBy: { startedAt: "desc" },
      take: 30,
    });
    return calls.map((c) => ({
      id: c.id,
      kind: c.kind,
      state: c.state,
      startedAt: c.startedAt.toISOString(),
      endedAt: c.endedAt?.toISOString() ?? null,
      participants: c.participants.map((p) => ({ userId: p.userId, name: p.user.name })),
    }));
  }
}
