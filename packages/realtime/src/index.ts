/**
 * Realtime event contract (mirrors handoff/realtime-events.md).
 * Consumed by the API Socket.IO gateway, the worker (fan-out), and the web client.
 */

export const RT = {
  presence: "presence.updated",
  /** Server tells a fresh connection how often to beat. */
  presenceHeartbeat: "presence.heartbeat_interval",
  conversationUpdated: "conversation.updated",
  typingStarted: "conversation.typing_started",
  typingStopped: "conversation.typing_stopped",
  readUpdated: "conversation.read_updated",
  messageCreated: "message.created",
  messageUpdated: "message.updated",
  /** Recipient's client acknowledged receipt -> sender's tick goes double. */
  messageDelivered: "message.delivered",
  messageDeleted: "message.deleted",
  reactionUpdated: "message.reaction_updated",
  pollUpdated: "message.poll_updated",
  statusCreated: "status.created",
  statusViewed: "status.viewed",
  statusReaction: "status.reaction_added",
  statusDeleted: "status.deleted",
  notificationCreated: "notification.created",
  notificationCount: "notification.count_updated",
  fileUpdated: "file.updated",
  e2eeDeviceChanged: "e2ee.device_changed",
  callIncoming: "call.incoming",
  callEnded: "call.ended",
} as const;

export type RtEvent = (typeof RT)[keyof typeof RT];

/** Socket.IO room naming — the single source of truth for both ends. */
export const rooms = {
  user: (userId: string) => `user:${userId}`,
  conversation: (conversationId: string) => `conversation:${conversationId}`,
  org: (orgId: string) => `org:${orgId}`,
};

export interface TypingPayload {
  conversationId: string;
  userId: string;
  name: string;
}

export interface PresencePayload {
  userId: string;
  presence: "ONLINE" | "AWAY" | "BUSY" | "OFFLINE";
}

export interface ReadUpdatedPayload {
  conversationId: string;
  userId: string;
  lastReadAt: string;
}
