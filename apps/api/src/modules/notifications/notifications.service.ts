import { Injectable, NotFoundException } from "@nestjs/common";
import type { NotificationDto } from "@chatter/contracts";
import { RT } from "@chatter/realtime";
import { PrismaService } from "../../common/prisma.service";
import type { AuthedUser } from "../../common/session.service";
import { RealtimeGateway } from "../../realtime/realtime.gateway";
import { initials } from "../users/users.service";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeGateway,
  ) {}

  async list(auth: AuthedUser): Promise<NotificationDto[]> {
    const rows = await this.prisma.client.notification.findMany({
      where: { userId: auth.userId, archivedAt: null },
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      deepLink: n.deepLink,
      read: Boolean(n.readAt),
      createdAt: n.createdAt.toISOString(),
      actor: n.actor
        ? { name: n.actor.name, initials: initials(n.actor.name), avatarColor: n.actor.avatarColor }
        : null,
    }));
  }

  async unreadCount(auth: AuthedUser): Promise<{ count: number }> {
    const count = await this.prisma.client.notification.count({
      where: { userId: auth.userId, readAt: null, archivedAt: null },
    });
    return { count };
  }

  async markRead(auth: AuthedUser, id: string): Promise<{ ok: true }> {
    const n = await this.prisma.client.notification.findFirst({ where: { id, userId: auth.userId } });
    if (!n) throw new NotFoundException();
    await this.prisma.client.notification.update({ where: { id }, data: { readAt: new Date() } });
    await this.pushCount(auth);
    return { ok: true };
  }

  async markAllRead(auth: AuthedUser): Promise<{ ok: true }> {
    await this.prisma.client.notification.updateMany({
      where: { userId: auth.userId, readAt: null },
      data: { readAt: new Date() },
    });
    await this.pushCount(auth);
    return { ok: true };
  }

  private async pushCount(auth: AuthedUser): Promise<void> {
    const { count } = await this.unreadCount(auth);
    this.rt.emitToUser(auth.userId, RT.notificationCount, { count });
  }
}
