import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { z } from "zod";
import { reactBody, sendMessageBody, voteBody, type SendMessageBody } from "@chatter/contracts";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthedUser } from "../../common/session.service";
import { ZodPipe } from "../../common/zod.pipe";
import { MessagesService } from "./messages.service";

const editBody = z.object({ encryptedEnvelope: sendMessageBody.shape.encryptedEnvelope }).strict();

@Controller()
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get("conversations/:idOrSlug/messages")
  list(
    @CurrentUser() user: AuthedUser,
    @Param("idOrSlug") idOrSlug: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    return this.messages.list(user, idOrSlug, cursor, parsedLimit);
  }

  @Post("conversations/:idOrSlug/messages")
  send(
    @CurrentUser() user: AuthedUser,
    @Param("idOrSlug") idOrSlug: string,
    @Body(new ZodPipe(sendMessageBody)) body: SendMessageBody,
  ) {
    return this.messages.send(user, idOrSlug, body);
  }

  @Patch("messages/:id")
  edit(
    @CurrentUser() user: AuthedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(editBody)) body: z.infer<typeof editBody>,
  ) {
    return this.messages.edit(user, id, body.encryptedEnvelope);
  }

  @Delete("messages/:id")
  remove(@CurrentUser() user: AuthedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.messages.remove(user, id);
  }

  @HttpCode(200)
  @Post("messages/:id/react")
  react(
    @CurrentUser() user: AuthedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(reactBody)) body: { emoji: string },
  ) {
    return this.messages.react(user, id, body.emoji);
  }

  @HttpCode(200)
  @Post("messages/:id/vote")
  vote(
    @CurrentUser() user: AuthedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(voteBody)) body: { optionId: string },
  ) {
    return this.messages.vote(user, id, body.optionId);
  }

  @HttpCode(200)
  @Post("messages/:id/pin")
  pin(@CurrentUser() user: AuthedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.messages.pin(user, id);
  }
}
