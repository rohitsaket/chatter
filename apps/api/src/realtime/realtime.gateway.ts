import { Inject, Injectable, forwardRef } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { RT, rooms, type PresencePayload, type TypingPayload } from "@chatter/realtime";
import { createLogger } from "@chatter/logger";
import { ACCESS_COOKIE, SessionService, type AuthedUser } from "../common/session.service";
import { PrismaService } from "../common/prisma.service";
import { MessageReceiptService } from "../modules/messages/message-receipt.service";
import { HEARTBEAT_MS, PresenceService } from "./presence.service";
import { allow, type Bucket, type SocketEvent } from "./socket-rate-limit";

const logger = createLogger("realtime");

/** A typing indicator self-clears this long after the last keystroke signal. */
const TYPING_EXPIRY_MS = 8_000;

function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return undefined;
}

@Injectable()
@WebSocketGateway({
  path: "/socket.io",
  cors: { origin: process.env.WEB_ORIGIN ?? "http://localhost:3000", credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  /** socket.id -> per-event token buckets. Discarded with the socket. */
  private readonly buckets = new Map<string, Map<string, Bucket>>();

  /**
   * Server-side typing expiry, keyed `socketId:conversationId`. A browser that
   * crashes mid-keystroke never sends typing:stop, which would otherwise leave
   * the indicator stuck for the other party forever.
   */
  private readonly typingTimers = new Map<string, NodeJS.Timeout>();
  private readonly authExpiryTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
    @Inject(forwardRef(() => MessageReceiptService))
    private readonly receipts: MessageReceiptService,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const token =
        (typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : undefined) ??
        parseCookie(socket.handshake.headers.cookie, ACCESS_COOKIE);
      const user = await this.sessions.resolve(token);
      (socket.data as { user: AuthedUser; sessionId: string }).user = user;
      (socket.data as { user: AuthedUser; sessionId: string }).sessionId = user.sessionId;
      const remainingMs = Math.max(0, user.accessTokenExpiresAt * 1000 - Date.now());
      this.authExpiryTimers.set(socket.id, setTimeout(() => socket.disconnect(true), remainingMs));
      await socket.join([rooms.user(user.userId), rooms.org(user.organizationId)]);

      // Join all conversation rooms the user participates in.
      const parts = await this.prisma.client.conversationParticipant.findMany({
        where: { userId: user.userId },
        select: { conversationId: true },
      });
      await socket.join(parts.map((p) => rooms.conversation(p.conversationId)));

      // socket.id is the connection identity; presence is tracked per
      // connection in Redis so it stays correct across API instances.
      const becameOnline = await this.presence.connect(user.userId, socket.id);
      if (becameOnline) void this.broadcastPresence(user, "ONLINE");
      socket.emit(RT.presenceHeartbeat, { intervalMs: HEARTBEAT_MS });
    } catch {
      socket.disconnect(true);
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    // Drop per-socket state first so nothing leaks if presence work throws.
    this.buckets.delete(socket.id);
    const authTimer = this.authExpiryTimers.get(socket.id);
    if (authTimer) clearTimeout(authTimer);
    this.authExpiryTimers.delete(socket.id);
    for (const [k, timer] of this.typingTimers) {
      if (k.startsWith(`${socket.id}:`)) {
        clearTimeout(timer);
        this.typingTimers.delete(k);
      }
    }
    const user = (socket.data as { user?: AuthedUser }).user;
    if (!user) return;
    // Offline is deferred by a grace period inside the service, so a tab reload
    // or Wi-Fi handover does not flicker the user offline and back.
    await this.presence.disconnect(user.userId, socket.id, () => {
      void this.broadcastPresence(user, "OFFLINE");
    });
  }

  /** Keeps this connection's presence record alive. No database write. */
  @SubscribeMessage("presence:heartbeat")
  async onHeartbeat(@ConnectedSocket() socket: Socket): Promise<void> {
    const user = (socket.data as { user?: AuthedUser }).user;
    if (!user || !this.permit(socket, "presence:heartbeat")) return;
    if (!(await this.sessions.isSessionActive(user.sessionId))) {
      socket.disconnect(true);
      return;
    }
    await this.presence.heartbeat(user.userId, socket.id);
  }

  /**
   * Recipient's client acknowledges receipt. Authorization, idempotency and the
   * state transition all live in the service — this handler only unwraps the
   * payload and swallows rejections, because a socket event has no response
   * channel to carry an error.
   */
  @SubscribeMessage("message:delivered")
  async onDelivered(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { messageId?: unknown },
  ): Promise<void> {
    const user = (socket.data as { user?: AuthedUser }).user;
    if (!user || typeof body?.messageId !== "string") return;
    if (!this.permit(socket, "message:delivered")) return;
    try {
      await this.receipts.markDelivered(user, body.messageId);
    } catch (err) {
      // Forged or stale ACKs are expected traffic, not incidents.
      logger.debug({ err }, "delivery ack rejected");
    }
  }

  /**
   * Sweep for messages that arrived while this socket was disconnected. Events
   * emitted during the gap were never received, so they were never ACKed.
   */
  @SubscribeMessage("message:sync")
  async onSync(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { conversationId?: unknown },
  ): Promise<void> {
    const user = (socket.data as { user?: AuthedUser }).user;
    if (!user || typeof body?.conversationId !== "string") return;
    // Tightest budget in the gateway: this handler is the most expensive.
    if (!this.permit(socket, "message:sync")) return;
    try {
      await this.receipts.markConversationDelivered(user, body.conversationId);
    } catch (err) {
      logger.debug({ err }, "delivery sync rejected");
    }
  }

  /** False when this socket has exhausted its budget for `event`. */
  private permit(socket: Socket, event: SocketEvent): boolean {
    let b = this.buckets.get(socket.id);
    if (!b) {
      b = new Map();
      this.buckets.set(socket.id, b);
    }
    return allow(b, event);
  }

  private async broadcastPresence(user: AuthedUser, presence: PresencePayload["presence"]): Promise<void> {
    if (!this.server) return;
    const blocks = await this.prisma.client.contact.findMany({
      where: { blocked: true, OR: [{ ownerId: user.userId }, { targetId: user.userId }] },
      select: { ownerId: true, targetId: true },
    });
    const denied = new Set(blocks.map((block) => block.ownerId === user.userId ? block.targetId : block.ownerId));
    const members = await this.prisma.client.membership.findMany({
      where: { organizationId: user.organizationId, suspended: false, userId: { notIn: [...denied] } },
      select: { userId: true },
    });
    for (const member of members) {
      this.server.to(rooms.user(member.userId)).emit(RT.presence, { userId: user.userId, presence });
    }
  }

  @SubscribeMessage("typing")
  async onTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { conversationId: string; typing: boolean },
  ): Promise<void> {
    const user = (socket.data as { user?: AuthedUser }).user;
    if (!user || typeof body?.conversationId !== "string") return;
    if (!this.permit(socket, "typing")) return;
    // Only allow typing signals into rooms the socket actually joined.
    if (!socket.rooms.has(rooms.conversation(body.conversationId))) return;
    const blocked = await this.prisma.client.contact.findFirst({
      where: {
        blocked: true,
        OR: [
          { ownerId: user.userId, target: { participants: { some: { conversationId: body.conversationId } } } },
          { targetId: user.userId, owner: { participants: { some: { conversationId: body.conversationId } } } },
        ],
      },
    });
    if (blocked) return;
    const payload: TypingPayload = { conversationId: body.conversationId, userId: user.userId, name: user.name };
    const room = rooms.conversation(body.conversationId);
    socket.to(room).emit(body.typing ? RT.typingStarted : RT.typingStopped, payload);
    this.scheduleTypingExpiry(socket, body.conversationId, body.typing, payload);
  }

  /**
   * Guarantee a typing indicator always clears. Each `typing:true` restarts a
   * timer that publishes `typingStopped` on the client's behalf; `typing:false`
   * cancels it. Purely in-memory and per-socket, so nothing is persisted and
   * the timer dies with the connection that owns it.
   */
  private scheduleTypingExpiry(
    socket: Socket,
    conversationId: string,
    typing: boolean,
    payload: TypingPayload,
  ): void {
    const k = `${socket.id}:${conversationId}`;
    const existing = this.typingTimers.get(k);
    if (existing) clearTimeout(existing);
    if (!typing) {
      this.typingTimers.delete(k);
      return;
    }
    this.typingTimers.set(
      k,
      setTimeout(() => {
        this.typingTimers.delete(k);
        socket.to(rooms.conversation(conversationId)).emit(RT.typingStopped, payload);
      }, TYPING_EXPIRY_MS),
    );
  }

  // ---- emit helpers used by services ----
  emitToConversation(conversationId: string, event: string, payload: unknown): void {
    this.server?.to(rooms.conversation(conversationId)).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(rooms.user(userId)).emit(event, payload);
  }

  emitToOrg(orgId: string, event: string, payload: unknown): void {
    this.server?.to(rooms.org(orgId)).emit(event, payload);
  }

  /** Called when a user is added to a conversation while connected. */
  async joinUserToConversation(userId: string, conversationId: string): Promise<void> {
    const sockets = await this.server.in(rooms.user(userId)).fetchSockets();
    for (const s of sockets) await s.join(rooms.conversation(conversationId));
  }

  async leaveUserFromConversation(userId: string, conversationId: string): Promise<void> {
    const sockets = await this.server.in(rooms.user(userId)).fetchSockets();
    for (const socket of sockets) await socket.leave(rooms.conversation(conversationId));
  }

  /**
   * Session revocation must revoke live WebSocket access too: a logged-out
   * client may not keep receiving room events. Disconnects the sockets bound
   * to the revoked session token, or every socket of the user when no token
   * is given (logout-all). Works cluster-wide via fetchSockets().
   */
  async disconnectRevokedSession(userId: string, sessionId?: string): Promise<void> {
    if (!this.server) return;
    const sockets = await this.server.in(rooms.user(userId)).fetchSockets();
    for (const s of sockets) {
      const data = s.data as { sessionId?: string };
      if (!sessionId || data.sessionId === sessionId) s.disconnect(true);
    }
  }
}
