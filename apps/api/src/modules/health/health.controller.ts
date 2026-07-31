import { Controller, Get, Header } from "@nestjs/common";
import { metrics } from "@chatter/observability";
import { Public } from "../../common/session.guard";
import { PrismaService } from "../../common/prisma.service";

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get("health")
  async health() {
    let db = "ok";
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
    } catch {
      db = "down";
    }
    return { status: db === "ok" ? "ok" : "degraded", db, time: new Date().toISOString() };
  }

  @Public()
  @Get("metrics")
  @Header("content-type", "text/plain; version=0.0.4")
  metrics(): string {
    return metrics.render();
  }
}
