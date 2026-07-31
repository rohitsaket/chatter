import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthedUser } from "../../common/session.service";
import { CallsService } from "./calls.service";

@Controller("calls")
export class CallsController {
  constructor(private readonly calls: CallsService) {}

  @Get("history")
  history(@CurrentUser() user: AuthedUser) {
    return this.calls.history(user);
  }

  @HttpCode(200)
  @Post("join/:idOrSlug")
  join(@CurrentUser() user: AuthedUser, @Param("idOrSlug") idOrSlug: string) {
    return this.calls.join(user, idOrSlug);
  }

  @HttpCode(200)
  @Post(":id/leave")
  leave(@CurrentUser() user: AuthedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.calls.leave(user, id);
  }
}
