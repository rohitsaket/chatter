import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { loadEnv } from "@chatter/config";
import { PrismaClient, createPrisma } from "@chatter/database";

// Ensure .env is loaded before the Prisma client reads DATABASE_URL.
loadEnv();

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client: PrismaClient = createPrisma();

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
