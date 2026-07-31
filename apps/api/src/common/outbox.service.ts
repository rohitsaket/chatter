import { Injectable } from "@nestjs/common";
import type { Prisma } from "@chatter/database";
import { PrismaService } from "./prisma.service";

/**
 * Transactional outbox: domain mutations write an event row in the same
 * transaction; the worker's `process-outbox` job (and the API's realtime
 * gateway for low-latency paths) deliver them.
 */
@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  async write(tx: Prisma.TransactionClient, topic: string, payload: Record<string, unknown>): Promise<void> {
    await tx.outboxEvent.create({ data: { topic, payload: payload as Prisma.InputJsonValue } });
  }

  async writeNow(topic: string, payload: Record<string, unknown>): Promise<void> {
    await this.prisma.client.outboxEvent.create({ data: { topic, payload: payload as Prisma.InputJsonValue } });
  }
}
