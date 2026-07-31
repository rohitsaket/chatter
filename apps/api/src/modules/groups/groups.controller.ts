import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { z } from "zod";
import { boundedText } from "@chatter/validation";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthedUser } from "../../common/session.service";
import { ZodPipe } from "../../common/zod.pipe";
import { GroupsService } from "./groups.service";

const createGroupBody = z.object({
  name: boundedText(80),
  description: z.string().max(500).optional(),
  privacy: z.enum(["PUBLIC", "PRIVATE"]).default("PRIVATE"),
  icon: z.string().max(8).optional(),
});
const addMemberBody = z.object({ userId: z.string().uuid() });

@Controller("groups")
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  list(@CurrentUser() user: AuthedUser) {
    return this.groups.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthedUser, @Body(new ZodPipe(createGroupBody)) body: z.infer<typeof createGroupBody>) {
    return this.groups.create(user, body);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.groups.get(user, id);
  }

  @HttpCode(200)
  @Post(":id/members")
  addMember(
    @CurrentUser() user: AuthedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(addMemberBody)) body: { userId: string },
  ) {
    return this.groups.addMember(user, id, body.userId);
  }

  @HttpCode(200)
  @Post(":id/leave")
  leave(@CurrentUser() user: AuthedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.groups.leave(user, id);
  }
}
