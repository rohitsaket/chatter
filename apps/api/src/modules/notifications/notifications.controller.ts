import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthedUser } from "../../common/session.service";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthedUser) {
    return this.notifications.list(user);
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: AuthedUser) {
    return this.notifications.unreadCount(user);
  }

  @HttpCode(200)
  @Post("mark-all-read")
  markAllRead(@CurrentUser() user: AuthedUser) {
    return this.notifications.markAllRead(user);
  }

  @HttpCode(200)
  @Post(":id/read")
  markRead(@CurrentUser() user: AuthedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.notifications.markRead(user, id);
  }
}
