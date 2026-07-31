import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { z } from "zod";
import { changeRoleBody } from "@chatter/contracts";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthedUser } from "../../common/session.service";
import { ZodPipe } from "../../common/zod.pipe";
import { AdminService } from "./admin.service";

const suspendBody = z.object({ suspended: z.boolean() });

@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("members")
  members(@CurrentUser() user: AuthedUser) {
    return this.admin.members(user);
  }

  @HttpCode(200)
  @Post("members/:id/role")
  changeRole(
    @CurrentUser() user: AuthedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(changeRoleBody)) body: { role: "ADMIN" | "MODERATOR" | "MEMBER" | "GUEST" },
  ) {
    return this.admin.changeRole(user, id, body.role);
  }

  @HttpCode(200)
  @Post("members/:id/suspend")
  suspend(
    @CurrentUser() user: AuthedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(suspendBody)) body: { suspended: boolean },
  ) {
    return this.admin.setSuspended(user, id, body.suspended);
  }

  @Get("storage")
  storage(@CurrentUser() user: AuthedUser) {
    return this.admin.storage(user);
  }

  @Get("audit")
  audit(@CurrentUser() user: AuthedUser) {
    return this.admin.audit(user);
  }
}
