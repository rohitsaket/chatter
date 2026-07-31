import { Body, Controller, Get, Patch } from "@nestjs/common";
import { updateSettingsBody, type UpdateSettingsBody } from "@chatter/contracts";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthedUser } from "../../common/session.service";
import { ZodPipe } from "../../common/zod.pipe";
import { SettingsService } from "./settings.service";

@Controller("settings")
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get(@CurrentUser() user: AuthedUser) {
    return this.settings.get(user);
  }

  @Patch()
  update(@CurrentUser() user: AuthedUser, @Body(new ZodPipe(updateSettingsBody)) body: UpdateSettingsBody) {
    return this.settings.update(user, body);
  }
}
