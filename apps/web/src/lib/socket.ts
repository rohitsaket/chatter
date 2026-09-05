"use client";
import { io, type Socket } from "socket.io-client";
import type { QueryClient } from "@tanstack/react-query";
import type { MessageDto, Page } from "@chatter/contracts";
import { RT } from "@chatter/realtime";
import { refreshSession } from "./api";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";

let socket: Socket | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;

/**
 * A realtime payload is only safe to place in the query cache when it is a
 * complete MessageDto. The array checks matter as much as `id`: the renderer
 * maps over `attachments` and `reactions`.
 */
function isMessageDto(v: unknown): v is MessageDto {
  const m = v as Partial<MessageDto> | null;
  return (
    typeof m === "object" &&
    m !== null &&
    typeof m.id === "string" &&
    typeof m.conversationId === "string" &&
    Array.isArray(m.attachments) &&
    Array.isArray(m.reactions)
  );
}

/** Connect once per tab; wire realtime events into the query cache. */
export function connectRealtime(qc: QueryClient, selfId: string): Socket {
  if (socket) return socket;
  socket = io(WS_URL, { withCredentials: true, transports: ["websocket", "polling"] });

  const invalidate = (...keys: string[]) => {
    for (const k of keys) void qc.invalidateQueries({ queryKey: [k] });
  };

  /**
   * Acknowledge receipt of someone else's message.
   *
   * This is the ONLY thing that produces a double tick for the sender. It fires
   * on arrival — the message reached this client — which is distinct from the
   * user having read it, and entirely distinct from this user being online.
   */
  const ackDelivery = (msg: unknown) => {
    const m = msg as { id?: unknown; senderId?: unknown };
    if (typeof m?.id !== "string" || m.senderId === selfId) return;
    socket?.emit("message:delivered", { messageId: m.id });
  };

  socket.on(RT.messageCreated, (msg: unknown) => {
    ackDelivery(msg);
    // `message.created` reaches us from two emitters with DIFFERENT payloads:
    // the API sends the full MessageDto on its low-latency path, while the
    // worker's outbox drain re-emits a compact { messageId, conversationId }
    // envelope for at-least-once delivery. Writing that envelope into the cache
    // produced message objects with no `attachments`/`reactions`, which crashed
    // the thread on render. Anything that is not a complete DTO is therefore
    // treated as a "something changed" signal and refetched instead.
    if (!isMessageDto(msg)) {
      invalidate("messages", "conversations");
      return;
    }
    const mine = msg.senderId === selfId;
    // Message list keys are per idOrSlug (uuid or slug) — match by conversationId
    // via the cached conversation object.
    for (const query of qc.getQueryCache().findAll({ queryKey: ["messages"] })) {
      const idOrSlug = query.queryKey[1] as string | undefined;
      if (!idOrSlug) continue;
      const conv = qc.getQueryData<{ id: string }>(["conversation", idOrSlug]);
      const matches = idOrSlug === msg.conversationId || conv?.id === msg.conversationId;
      if (!matches) continue;
      qc.setQueryData<Page<MessageDto>>(query.queryKey, (old) => {
        if (!old || old.items.some((m) => m.id === msg.id)) return old;
        return { ...old, items: [...old.items, { ...msg, mine }] };
      });
    }
    invalidate("conversations");
  });

  const updateMsg = (msg: unknown) => {
    if (!isMessageDto(msg)) {
      invalidate("messages");
      return;
    }
    qc.setQueriesData<Page<MessageDto>>({ queryKey: ["messages"] }, (old) =>
      old ? { ...old, items: old.items.map((m) => (m.id === msg.id ? { ...msg, mine: msg.senderId === selfId } : m)) } : old,
    );
  };
  socket.on(RT.messageUpdated, updateMsg);
  socket.on(RT.reactionUpdated, updateMsg);
  socket.on(RT.pollUpdated, updateMsg);
  socket.on(RT.messageDeleted, () => invalidate("messages", "conversations"));
  socket.on(RT.readUpdated, () => invalidate("messages"));
  socket.on(RT.messageDelivered, () => invalidate("messages", "conversations"));
  socket.on(RT.presence, () => invalidate("conversations", "contacts", "conversation"));
  socket.on(RT.notificationCount, (p: { count: number }) => {
    qc.setQueryData(["notification-count"], p);
    invalidate("notifications");
  });
  socket.on(RT.statusCreated, () => invalidate("statuses"));
  socket.on(RT.statusViewed, () => invalidate("statuses"));
  socket.on(RT.statusReaction, () => invalidate("statuses"));
  socket.on(RT.conversationUpdated, () => invalidate("conversations", "conversation"));
  socket.on(RT.fileUpdated, () => invalidate("files", "file"));

  // The server names the cadence on connect, so the client never guesses.
  socket.on(RT.presenceHeartbeat, (p: { intervalMs?: number }) => {
    const interval = typeof p?.intervalMs === "number" ? p.intervalMs : 30_000;
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = setInterval(() => socket?.emit("presence:heartbeat"), interval);
  });

  socket.on("disconnect", (reason) => {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
    // Access JWTs deliberately expire while a tab may remain open. A server
    // expiry disconnect is recovered through refresh rotation; logout/revoked
    // sessions fail refresh and remain disconnected.
    if (reason === "io server disconnect") {
      void refreshSession().then((ok) => {
        if (ok) socket?.connect();
      });
    }
  });

  /**
   * Events emitted while the socket was down were never received, so they were
   * never acknowledged. On reconnect, ask the server to sweep anything this
   * client owes a receipt for, and refetch rather than trusting local state.
   */
  socket.on("connect", () => {
    invalidate("messages", "conversations", "conversation", "contacts");
    for (const id of joinedConversations) socket?.emit("message:sync", { conversationId: id });
  });

  return socket;
}

/**
 * Conversations this tab has opened. Tracked so a reconnect can resync receipts
 * for exactly those threads instead of sweeping the user's entire history.
 */
const joinedConversations = new Set<string>();

export function trackConversation(conversationId: string): void {
  joinedConversations.add(conversationId);
  socket?.emit("message:sync", { conversationId });
}

export function sendTyping(conversationId: string, typing: boolean): void {
  socket?.emit("typing", { conversationId, typing });
}

export function onTyping(handler: (p: { conversationId: string; userId: string; name: string }, started: boolean) => void) {
  socket?.on(RT.typingStarted, (p) => handler(p, true));
  socket?.on(RT.typingStopped, (p) => handler(p, false));
  return () => {
    socket?.off(RT.typingStarted);
    socket?.off(RT.typingStopped);
  };
}

export function disconnectRealtime(): void {
  socket?.disconnect();
  socket = null;
}
