import { PrismaClient } from "@prisma/client";

export * from "@prisma/client";

declare global {
  var __chatterPrisma: PrismaClient | undefined;
}

/** Singleton PrismaClient (avoids connection exhaustion in dev hot-reload). */
export function createPrisma(): PrismaClient {
  if (!globalThis.__chatterPrisma) {
    globalThis.__chatterPrisma = new PrismaClient();
  }
  return globalThis.__chatterPrisma;
}
