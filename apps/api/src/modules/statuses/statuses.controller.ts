import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { z } from "zod";
import { reactBody, statusReplyBody } from "@chatter/contracts";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthedUser } from "../../common/session.service";
import { ZodPipe } from "../../common/zod.pipe";
import { StatusesService } from "./statuses.service";

const createBody = z.object({
  caption: z.string().max(500).optional(),
  mediaStyle: z.string().max(400).optional(),
  audience: z.string().max(60).optional(),
});

@Controller("statuses")
export class StatusesController {
  constructor(private readonly statuses: StatusesService) {}

  @Get()
  feed(@CurrentUser() user: AuthedUser) {
    return this.statuses.feed(user);
  }

  @Post()
  create(@CurrentUser() user: AuthedUser, @Body(new ZodPipe(createBody)) body: z.infer<typeof createBody>) {
    return this.statuses.create(user, body);
  }

  @HttpCode(200)
  @Post(":id/view")
  view(@CurrentUser() user: AuthedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.statuses.view(user, id);
  }

  @HttpCode(200)
  @Post(":id/react")
  react(
    @CurrentUser() user: AuthedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(reactBody)) body: { emoji: string },
  ) {
    return this.statuses.react(user, id, body.emoji);
  }

  @HttpCode(200)
  @Post(":id/reply")
  reply(
    @CurrentUser() user: AuthedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(statusReplyBody)) body: { text: string },
  ) {
    return this.statuses.reply(user, id, body.text);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.statuses.remove(user, id);
  }
}
