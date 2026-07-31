"use client";
import { io, type Socket } from "socket.io-client";
import type { QueryClient } from "@tanstack/react-query";
import type { MessageDto, Page } from "@chatter/contracts";
import { RT } from "@chatter/realtime";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

/** Connect once per tab; wire realtime events into the query cache. */
export function connectRealtime(qc: QueryClient, selfId: string): Socket {
  if (socket) return socket;
  socket = io(WS_URL, { withCredentials: true, transports: ["websocket", "polling"] });

  const invalidate = (...keys: string[]) => {
    for (const k of keys) void qc.invalidateQueries({ queryKey: [k] });
  };

  socket.on(RT.messageCreated, (msg: MessageDto) => {
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

  const updateMsg = (msg: MessageDto) => {
    qc.setQueriesData<Page<MessageDto>>({ queryKey: ["messages"] }, (old) =>
      old ? { ...old, items: old.items.map((m) => (m.id === msg.id ? { ...msg, mine: msg.senderId === selfId } : m)) } : old,
    );
  };
  socket.on(RT.messageUpdated, updateMsg);
  socket.on(RT.reactionUpdated, updateMsg);
  socket.on(RT.pollUpdated, updateMsg);
  socket.on(RT.messageDeleted, () => invalidate("messages", "conversations"));
  socket.on(RT.readUpdated, () => invalidate("messages"));
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

  return socket;
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
