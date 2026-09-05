import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { loadEnv } from "@chatter/config";
import { createLogger } from "@chatter/logger";
import { PrismaService } from "../common/prisma.service";

const logger = createLogger("presence");

/**
 * How long a connection record survives without a heartbeat. Generous relative
 * to HEARTBEAT_MS so one dropped beat never evicts a live connection.
 */
const CONNECTION_TTL_SECONDS = 90;

/** Clients refresh their connection key on this cadence. */
export const HEARTBEAT_MS = 30_000;

/**
 * Delay between the last connection disappearing and the user being published
 * as offline. Absorbs Wi-Fi handover, tab reload and mobile network switches,
 * which otherwise flicker a user offline and straight back online.
 */
const OFFLINE_GRACE_MS = 15_000;

const key = (userId: string, connectionId: string) => `presence:${userId}:${connectionId}`;
const scanPattern = (userId: string) => `presence:${userId}:*`;

/**
 * Authoritative presence, tracked per connection rather than per user.
 *
 * Connection records live in Redis — the same instance socket.io already uses
 * for its adapter — because presence must be correct across API instances. The
 * previous in-process refcount was wrong the moment a second instance existed:
 * each process only saw its own sockets, so a user connected to instance A
 * would be published offline when their instance-B socket closed.
 *
 * A user is ONLINE while at least one unexpired connection key exists, which
 * gives multi-device presence for free: three tabs are three keys, and the user
 * stays online until the last one expires or is removed.
 */
@Injectable()
export class PresenceService implements OnModuleDestroy {
  private readonly redis: Redis;
  /** Pending offline publications, keyed by user, so a fast reconnect cancels. */
  private readonly graceTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly prisma: PrismaService) {
    this.redis = new Redis(loadEnv().REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
    void this.redis.connect().catch((err) => logger.error({ err }, "presence redis connect failed"));
  }

  async onModuleDestroy(): Promise<void> {
    for (const t of this.graceTimers.values()) clearTimeout(t);
    this.graceTimers.clear();
    await this.redis.quit().catch(() => undefined);
  }

  /**
   * Register a connection. Returns true when this is the user's first live
   * connection and the caller should therefore broadcast them online.
   */
  async connect(userId: string, connectionId: string): Promise<boolean> {
    const pending = this.graceTimers.get(userId);
    if (pending) {
      // Reconnected inside the grace window: they were never published offline,
      // so there is nothing to announce.
      clearTimeout(pending);
      this.graceTimers.delete(userId);
    }
    const before = await this.connectionCount(userId);
    try {
      await this.redis.set(key(userId, connectionId), Date.now().toString(), "EX", CONNECTION_TTL_SECONDS);
    } catch (err) {
      // Realtime messaging still works without Redis — receipts and history are
      // database-backed. Only presence degrades, so the socket is allowed to
      // connect rather than the whole realtime layer going down with Redis.
      logger.warn({ err }, "presence registration failed; continuing without presence");
      return false;
    }
    if (before === 0) {
      await this.persist(userId, "ONLINE");
      return true;
    }
    return false;
  }

  /** Refresh a connection's TTL. Cheap: one Redis write, never a database write. */
  async heartbeat(userId: string, connectionId: string): Promise<void> {
    try {
      await this.redis.set(key(userId, connectionId), Date.now().toString(), "EX", CONNECTION_TTL_SECONDS);
    } catch (err) {
      logger.debug({ err }, "heartbeat failed; connection key may expire");
    }
  }

  /**
   * Drop a connection. When it was the last one, the offline transition is
   * deferred by the grace period and `onOffline` fires only if no new
   * connection arrives first.
   */
  async disconnect(userId: string, connectionId: string, onOffline: () => void): Promise<void> {
    try {
      await this.redis.del(key(userId, connectionId));
    } catch (err) {
      logger.debug({ err }, "presence key removal failed; TTL will reclaim it");
    }
    const remaining = await this.connectionCount(userId);
    // Unknown (Redis down) is not proof the user left, so no offline claim.
    if (remaining === null || remaining > 0) return;

    const existing = this.graceTimers.get(userId);
    if (existing) clearTimeout(existing);
    this.graceTimers.set(
      userId,
      setTimeout(() => {
        this.graceTimers.delete(userId);
        void (async () => {
          // Re-check: a connection may have arrived while the timer ran.
          const stillGone = await this.connectionCount(userId);
          if (stillGone === null || stillGone > 0) return;
          await this.persist(userId, "OFFLINE");
          onOffline();
        })().catch((err) => logger.warn({ err }, "offline transition failed"));
      }, OFFLINE_GRACE_MS),
    );
  }

  /** Null when presence cannot be determined (Redis unavailable). */
  async isOnline(userId: string): Promise<boolean | null> {
    const n = await this.connectionCount(userId);
    return n === null ? null : n > 0;
  }

  /**
   * Count live connections with SCAN rather than KEYS — KEYS blocks the Redis
   * event loop for the whole keyspace, which is unacceptable on a hot path.
   *
   * Returns null when Redis is unreachable. Null means "unknown", never "zero"
   * and never "online": callers degrade rather than publishing a presence
   * claim the system cannot substantiate.
   */
  private async connectionCount(userId: string): Promise<number | null> {
    try {
      let cursor = "0";
      let total = 0;
      do {
        const [next, keys] = await this.redis.scan(cursor, "MATCH", scanPattern(userId), "COUNT", 100);
        cursor = next;
        total += keys.length;
      } while (cursor !== "0");
      return total;
    } catch (err) {
      logger.warn({ err }, "presence redis unavailable; presence degraded to unknown");
      return null;
    }
  }

  /** Mirror presence into the database for cold reads (contacts list, profile). */
  private async persist(userId: string, presence: "ONLINE" | "OFFLINE"): Promise<void> {
    try {
      await this.prisma.client.user.update({
        where: { id: userId },
        // lastActiveAt doubles as "last seen" once the user goes offline.
        data: { presence, lastActiveAt: new Date() },
      });
    } catch (err) {
      logger.warn({ err }, "presence persist failed");
    }
  }
}
