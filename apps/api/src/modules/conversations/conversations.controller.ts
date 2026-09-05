import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthedUser } from "../../common/session.service";
import { ZodPipe } from "../../common/zod.pipe";
import { ConversationsService } from "./conversations.service";

const flagBody = z.object({ value: z.boolean() });
/** Optional ceiling: the last message the client actually rendered. */
const readBody = z.object({ upToMessageId: z.string().uuid().optional() }).default({});
const dmBody = z.object({ userId: z.string().uuid() });
// null = mute indefinitely, 0 = unmute, otherwise a duration in minutes.
const muteBody = z.object({ minutes: z.number().int().min(0).max(525600).nullable() });

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
  markRead(
    @CurrentUser() user: AuthedUser,
    @Param("idOrSlug") idOrSlug: string,
    @Body(new ZodPipe(readBody)) body: { upToMessageId?: string },
  ) {
    return this.conversations.markRead(user, idOrSlug, body.upToMessageId);
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

  /**
   * Mute for a window, indefinitely, or not at all.
   * `minutes`: 0 = unmute, null = indefinite, otherwise a duration.
   */
  @HttpCode(200)
  @Post(":idOrSlug/mute")
  mute(
    @CurrentUser() user: AuthedUser,
    @Param("idOrSlug") idOrSlug: string,
    @Body(new ZodPipe(muteBody)) body: { minutes: number | null },
  ) {
    return this.conversations.setMute(user, idOrSlug, body.minutes);
  }

  /** Hide this user's history in the thread; the other side keeps theirs. */
  @HttpCode(200)
  @Post(":idOrSlug/clear")
  clear(@CurrentUser() user: AuthedUser, @Param("idOrSlug") idOrSlug: string) {
    return this.conversations.clear(user, idOrSlug);
  }

  /** Remove the thread from this user's list until a new message arrives. */
  @Delete(":idOrSlug")
  remove(@CurrentUser() user: AuthedUser, @Param("idOrSlug") idOrSlug: string) {
    return this.conversations.deleteForMe(user, idOrSlug);
  }
}
