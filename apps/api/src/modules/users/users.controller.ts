import { Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthedUser } from "../../common/session.service";
import { UsersService } from "./users.service";

@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("users/me")
  me(@CurrentUser() user: AuthedUser) {
    return this.users.me(user);
  }

  @Get("contacts")
  contacts(@CurrentUser() user: AuthedUser, @Query("q") q?: string) {
    return this.users.contacts(user, q);
  }

  @Post("contacts/:id/favorite")
  favorite(@CurrentUser() user: AuthedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.users.toggleFavorite(user, id);
  }
}
