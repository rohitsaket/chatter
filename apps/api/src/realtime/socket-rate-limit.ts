/**
 * Per-socket, per-event token bucket for websocket traffic.
 *
 * The HTTP throttler does not see socket frames, so every realtime handler was
 * previously unbounded. `message:sync` is the sharpest case: one frame makes the
 * server sweep up to 500 messages with a write per message, so an unbounded
 * client could pin the database with a tight emit loop.
 *
 * State is per process and per socket, which is the correct scope: a bucket is
 * only meaningful for the connection it throttles, and that connection lives on
 * exactly one instance. It is discarded with the socket, so nothing accumulates.
 */
export interface Bucket {
  tokens: number;
  updatedAt: number;
}

export interface RateLimitRule {
  /** Bucket capacity — the largest instantaneous burst allowed. */
  burst: number;
  /** Sustained refill rate. */
  perSecond: number;
}

/** Tuned to each event's cost and its legitimate client cadence. */
export const SOCKET_LIMITS = {
  // Debounced client-side; a burst covers start/stop flapping while typing.
  typing: { burst: 10, perSecond: 2 },
  // One beat per 30s in normal operation; the burst absorbs reconnect storms.
  "presence:heartbeat": { burst: 5, perSecond: 0.5 },
  // One per received message, so it must tolerate a backlog flush on reconnect.
  "message:delivered": { burst: 60, perSecond: 10 },
  // Deliberately tight: the most expensive handler in the gateway.
  "message:sync": { burst: 5, perSecond: 0.2 },
} as const satisfies Record<string, RateLimitRule>;

export type SocketEvent = keyof typeof SOCKET_LIMITS;

/**
 * Consume one token. Returns false when the caller should drop the frame.
 *
 * Frames are dropped silently rather than answered with an error: a rejection
 * reply would itself be traffic the attacker controls, and legitimate clients
 * recover on their next tick or reconnect.
 */
export function allow(buckets: Map<string, Bucket>, event: SocketEvent, now = Date.now()): boolean {
  const rule = SOCKET_LIMITS[event];
  const b = buckets.get(event) ?? { tokens: rule.burst, updatedAt: now };
  const elapsed = Math.max(0, now - b.updatedAt) / 1000;
  const tokens = Math.min(rule.burst, b.tokens + elapsed * rule.perSecond);
  if (tokens < 1) {
    buckets.set(event, { tokens, updatedAt: now });
    return false;
  }
  buckets.set(event, { tokens: tokens - 1, updatedAt: now });
  return true;
}
