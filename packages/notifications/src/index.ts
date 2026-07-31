import { Queue, type JobsOptions } from "bullmq";
import { loadEnv } from "@chatter/config";

/** Queue names shared by the API (producer) and worker (consumer). */
export const QUEUES = {
  notifications: "notifications",
  maintenance: "maintenance",
  files: "files",
} as const;

export type NotificationJob =
  | { kind: "fanout"; notificationId: string }
  | { kind: "mention"; messageId: string };

export type MaintenanceJob =
  | { kind: "expire-statuses" }
  | { kind: "recalculate-storage"; organizationId: string }
  | { kind: "process-outbox" };

export type FileJob = { kind: "process-upload"; fileId: string };

export const DEFAULT_JOB_OPTS: JobsOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: { count: 500 },
  removeOnFail: false, // keep failures for inspection (acts as a DLQ)
};

function redisConnection() {
  const url = new URL(loadEnv().REDIS_URL);
  return { host: url.hostname, port: Number(url.port || 6379) };
}

const queues = new Map<string, Queue>();

export function getQueue(name: (typeof QUEUES)[keyof typeof QUEUES]): Queue {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, { connection: redisConnection() });
    queues.set(name, q);
  }
  return q;
}

/** Enqueue with a stable jobId for idempotency (same id = deduplicated). */
export async function enqueue(
  name: (typeof QUEUES)[keyof typeof QUEUES],
  job: NotificationJob | MaintenanceJob | FileJob,
  jobId?: string,
): Promise<void> {
  await getQueue(name).add(job.kind, job, { ...DEFAULT_JOB_OPTS, jobId });
}

export { redisConnection };
