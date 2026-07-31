import { Injectable } from "@nestjs/common";
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
import { SESSION_COOKIE, SessionService, type AuthedUser } from "../common/session.service";
import { PrismaService } from "../common/prisma.service";

const logger = createLogger("realtime");

function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return undefined;
}

@Injectable()
@WebSocketGateway({ path: "/socket.io" })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  /** userId -> live socket count (per node; presence flips on 0<->1). */
  private connections = new Map<string, number>();

  constructor(
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const token = parseCookie(socket.handshake.headers.cookie, SESSION_COOKIE);
      const user = await this.sessions.resolve(token);
      (socket.data as { user: AuthedUser }).user = user;
      await socket.join([rooms.user(user.userId), rooms.org(user.organizationId)]);

      // Join all conversation rooms the user participates in.
      const parts = await this.prisma.client.conversationParticipant.findMany({
        where: { userId: user.userId },
        select: { conversationId: true },
      });
      await socket.join(parts.map((p) => rooms.conversation(p.conversationId)));

      const count = (this.connections.get(user.userId) ?? 0) + 1;
      this.connections.set(user.userId, count);
      if (count === 1) await this.setPresence(user, "ONLINE");
    } catch {
      socket.disconnect(true);
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    const user = (socket.data as { user?: AuthedUser }).user;
    if (!user) return;
    const count = (this.connections.get(user.userId) ?? 1) - 1;
    if (count <= 0) {
      this.connections.delete(user.userId);
      await this.setPresence(user, "OFFLINE");
    } else {
      this.connections.set(user.userId, count);
    }
  }

  private async setPresence(user: AuthedUser, presence: PresencePayload["presence"]): Promise<void> {
    try {
      await this.prisma.client.user.update({
        where: { id: user.userId },
        data: { presence, lastActiveAt: new Date() },
      });
      this.server.to(rooms.org(user.organizationId)).emit(RT.presence, { userId: user.userId, presence });
    } catch (err) {
      logger.warn({ err }, "presence update failed");
    }
  }

  @SubscribeMessage("typing")
  async onTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { conversationId: string; typing: boolean },
  ): Promise<void> {
    const user = (socket.data as { user?: AuthedUser }).user;
    if (!user || typeof body?.conversationId !== "string") return;
    // Only allow typing signals into rooms the socket actually joined.
    if (!socket.rooms.has(rooms.conversation(body.conversationId))) return;
    const payload: TypingPayload = { conversationId: body.conversationId, userId: user.userId, name: user.name };
    socket.to(rooms.conversation(body.conversationId)).emit(body.typing ? RT.typingStarted : RT.typingStopped, payload);
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
}
