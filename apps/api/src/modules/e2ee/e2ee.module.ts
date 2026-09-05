import { Module } from "@nestjs/common";
import { E2EEController } from "./e2ee.controller";
import { E2EEService } from "./e2ee.service";
import { PrismaService } from "../../common/prisma.service";

@Module({
  controllers: [E2EEController],
  providers: [E2EEService, PrismaService],
  exports: [E2EEService],
})
export class E2EEModule {}