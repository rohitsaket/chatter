import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthedUser } from "../../common/session.service";
import { ZodPipe } from "../../common/zod.pipe";
import { ConversationsService } from "./conversations.service";

const flagBody = z.object({ value: z.boolean() });
const dmBody = z.object({ userId: z.string().uuid() });

@Controller("conversations")
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  list(@CurrentUser() user: AuthedUser, @Query("archived") archived?: string) {
    return this.conversations.list(user, { archived: archived === "true" });
  }

  @Post("dm")
  openDm(@CurrentUser() user: AuthedUser, @Body(new ZodPipe(dmBody)) body: { userId: string }) {
    return this.conversations.openDm(user, body.userId);
  }

  @Get(":idOrSlug")
  get(@CurrentUser() user: AuthedUser, @Param("idOrSlug") idOrSlug: string) {
    return this.conversations.get(user, idOrSlug);
  }

  @HttpCode(200)
  @Post(":idOrSlug/read")
  markRead(@CurrentUser() user: AuthedUser, @Param("idOrSlug") idOrSlug: string) {
    return this.conversations.markRead(user, idOrSlug);
  }

  @HttpCode(200)
  @Post(":idOrSlug/favorite")
  favorite(
    @CurrentUser() user: AuthedUser,
    @Param("idOrSlug") idOrSlug: string,
    @Body(new ZodPipe(flagBody)) body: { value: boolean },
  ) {
    return this.conversations.setFlag(user, idOrSlug, "favorite", body.value);
  }

  @HttpCode(200)
  @Post(":idOrSlug/archive")
  archive(
    @CurrentUser() user: AuthedUser,
    @Param("idOrSlug") idOrSlug: string,
    @Body(new ZodPipe(flagBody)) body: { value: boolean },
  ) {
    return this.conversations.setFlag(user, idOrSlug, "archived", body.value);
  }

  @HttpCode(200)
  @Post(":idOrSlug/mute")
  mute(
    @CurrentUser() user: AuthedUser,
    @Param("idOrSlug") idOrSlug: string,
    @Body(new ZodPipe(flagBody)) body: { value: boolean },
  ) {
    return this.conversations.setFlag(user, idOrSlug, "muted", body.value);
  }
}
