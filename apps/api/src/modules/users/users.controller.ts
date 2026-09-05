import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  createExternalContactBody,
  lookupByPhoneBody,
  updateContactBody,
  updateExternalContactBody,
  type CreateExternalContactBody,
  type LookupByPhoneBody,
  type UpdateContactBody,
  type UpdateExternalContactBody,
} from "@chatter/contracts";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthedUser } from "../../common/session.service";
import { ZodPipe } from "../../common/zod.pipe";
import { UserThrottlerGuard } from "../../common/user-throttler.guard";
import { UsersService } from "./users.service";

@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("users/me")
  me(@CurrentUser() user: AuthedUser) {
    return this.users.me(user);
  }

  /**
   * POST, not GET, so the number never lands in a URL, access log or Referer.
   * 200 for both found and not-found: an HTTP status that varied by outcome
   * would be an enumeration oracle on its own.
   */
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(UserThrottlerGuard)
  @Post("users/lookup")
  lookupByPhone(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodPipe(lookupByPhoneBody)) body: LookupByPhoneBody,
  ) {
    return this.users.lookupByPhone(user, body);
  }

  @Get("contacts")
  contacts(@CurrentUser() user: AuthedUser, @Query("q") q?: string) {
    return this.users.contacts(user, q);
  }

  /**
   * Declared ahead of the `contacts/:id` routes: Nest matches in declaration
   * order, so a literal "external" segment must be registered before the
   * parameterised one or it would be parsed as an :id and rejected by
   * ParseUUIDPipe.
   */
  @Post("contacts/external")
  createExternalContact(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodPipe(createExternalContactBody)) body: CreateExternalContactBody,
  ) {
    return this.users.createExternalContact(user, body);
  }

  @Patch("contacts/external/:id")
  updateExternalContact(
    @CurrentUser() user: AuthedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(updateExternalContactBody)) body: UpdateExternalContactBody,
  ) {
    return this.users.updateExternalContact(user, id, body);
  }

  @Delete("contacts/external/:id")
  deleteExternalContact(@CurrentUser() user: AuthedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.users.deleteExternalContact(user, id);
  }

  @Post("contacts/:id/favorite")
  favorite(@CurrentUser() user: AuthedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.users.toggleFavorite(user, id);
  }

  @HttpCode(200)
  @Post("contacts/:id/block")
  block(@CurrentUser() user: AuthedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.users.toggleBlock(user, id);
  }

  @Patch("contacts/:id")
  updateContact(
    @CurrentUser() user: AuthedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(updateContactBody)) body: UpdateContactBody,
  ) {
    return this.users.updateContact(user, id, body);
  }
}
