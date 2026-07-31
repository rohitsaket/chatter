import { Injectable } from "@nestjs/common";
import type { SettingsDto, UpdateSettingsBody } from "@chatter/contracts";
import { PrismaService } from "../../common/prisma.service";
import type { AuthedUser } from "../../common/session.service";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(auth: AuthedUser): Promise<SettingsDto> {
    const s = await this.prisma.client.userSettings.upsert({
      where: { userId: auth.userId },
      update: {},
      create: { userId: auth.userId },
    });
    return {
      theme: s.theme,
      accent: s.accent,
      msgLayout: s.msgLayout,
      fontSize: s.fontSize,
      wallpaper: s.wallpaper,
      openTo: s.openTo,
      startupLaunch: s.startupLaunch,
      startTray: s.startTray,
      msgPreviews: s.msgPreviews,
    };
  }

  async update(auth: AuthedUser, patch: UpdateSettingsBody): Promise<SettingsDto> {
    await this.prisma.client.userSettings.upsert({
      where: { userId: auth.userId },
      update: patch,
      create: { userId: auth.userId, ...patch },
    });
    return this.get(auth);
  }
}
