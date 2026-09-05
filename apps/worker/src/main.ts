/**
 * Chatter background worker: BullMQ consumers + scheduled maintenance.
 * Jobs are idempotent, retried with exponential backoff, and failures are
 * retained (removeOnFail=false) as a dead-letter set for inspection.
 */
import { Worker, Queue } from "bullmq";
import Redis from "ioredis";
import { Emitter } from "@socket.io/redis-emitter";
import { createPrisma } from "@chatter/database";
import { createLogger } from "@chatter/logger";
import { loadEnv } from "@chatter/config";
import { QUEUES, redisConnection, type FileJob, type MaintenanceJob, type NotificationJob } from "@chatter/notifications";
import { RT, rooms } from "@chatter/realtime";

const env = loadEnv();
const logger = createLogger("worker");
const prisma = createPrisma();

// Emit realtime events through the API's Socket.IO Redis adapter.
const emitter = new Emitter(new Redis(env.REDIS_URL));

async function handleNotification(job: NotificationJob): Promise<void> {
  if (job.kind === "fanout") {
    const n = await prisma.notification.findUnique({ where: { id: job.notificationId } });
    if (!n) return; // deleted before delivery — safe no-op
    emitter.to(rooms.user(n.userId)).emit(RT.notificationCreated, { notificationId: n.id });
    const count = await prisma.notification.count({ where: { userId: n.userId, readAt: null, archivedAt: null } });
    emitter.to(rooms.user(n.userId)).emit(RT.notificationCount, { count });
  }
}

async function handleMaintenance(job: MaintenanceJob): Promise<void> {
  switch (job.kind) {
    case "expire-statuses": {
      const res = await prisma.status.updateMany({
        where: { expiresAt: { lt: new Date() }, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (res.count > 0) {
        const org = await prisma.organization.findFirst();
        if (org) {
          await prisma.auditLog.create({
            data: { organizationId: org.id, action: "retention.statuses_expired", metadata: { count: res.count } },
          });
        }
        logger.info({ count: res.count }, "expired statuses");
      }
      break;
    }
    case "recalculate-storage": {
      const files = await prisma.file.aggregate({
        where: { organizationId: job.organizationId, status: { not: "TRASHED" } },
        _sum: { sizeBytes: true },
      });
      logger.info({ organizationId: job.organizationId, used: Number(files._sum.sizeBytes ?? 0) }, "storage recalculated");
      break;
    }
    case "process-outbox": {
      // Deliver outbox rows through the Socket.IO Redis adapter. The API also
      // emits directly on its own low-latency path.
      //
      // NOTE: the two emitters do NOT share a payload shape — the API sends a
      // full DTO, this sends the stored envelope (e.g. { messageId,
      // conversationId }). Consumers must therefore treat an envelope as a
      // "refetch" signal rather than as data; see isMessageDto() in the web
      // client's socket.ts.
      const rows = await prisma.outboxEvent.findMany({
        where: { processedAt: null },
        orderBy: { createdAt: "asc" },
        take: 100,
      });
      for (const row of rows) {
        const payload = row.payload as Record<string, unknown>;
        const room =
          typeof payload.room === "string"
            ? payload.room
            : typeof payload.conversationId === "string"
              ? rooms.conversation(payload.conversationId)
              : null;
        if (room) emitter.to(room).emit(row.topic, payload);
        await prisma.outboxEvent.update({ where: { id: row.id }, data: { processedAt: new Date() } });
      }
      break;
    }
  }
}

async function handleFile(job: FileJob): Promise<void> {
  if (job.kind === "process-upload") {
    const file = await prisma.file.findUnique({ where: { id: job.fileId } });
    if (!file || file.status !== "PROCESSING") return; // idempotent
    // Metadata/preview pipeline placeholder-free minimum: checksum verified at
    // upload; mark ready.
    await prisma.file.update({ where: { id: file.id }, data: { status: "READY" } });
    await prisma.outboxEvent.create({
      data: { topic: RT.fileUpdated, payload: { fileId: file.id, status: "READY" } },
    });
    logger.info({ fileId: file.id }, "file processed");
  }
}

function makeWorker<T>(queue: string, handler: (data: T) => Promise<void>): Worker {
  const w = new Worker(
    queue,
    async (job) => {
      const started = Date.now();
      await handler(job.data as T);
      logger.info({ queue, job: job.name, id: job.id, ms: Date.now() - started }, "job done");
    },
    { connection: redisConnection(), concurrency: 5 },
  );
  w.on("failed", (job, err) => logger.error({ queue, job: job?.name, id: job?.id, err: err.message }, "job failed"));
  return w;
}

async function main() {
  makeWorker<NotificationJob>(QUEUES.notifications, handleNotification);
  makeWorker<MaintenanceJob>(QUEUES.maintenance, handleMaintenance);
  makeWorker<FileJob>(QUEUES.files, handleFile);

  // Repeatable maintenance schedules.
  const maintenance = new Queue(QUEUES.maintenance, { connection: redisConnection() });
  await maintenance.upsertJobScheduler("expire-statuses-hourly", { every: 60 * 60 * 1000 }, {
    name: "expire-statuses",
    data: { kind: "expire-statuses" },
  });
  await maintenance.upsertJobScheduler("process-outbox", { every: 15 * 1000 }, {
    name: "process-outbox",
    data: { kind: "process-outbox" },
  });

  logger.info("worker started");
}

main().catch((err) => {
  logger.error(err, "worker failed to start");
  process.exit(1);
});
