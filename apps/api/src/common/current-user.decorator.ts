import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthedUser } from "./session.service";

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthedUser => {
  return ctx.switchToHttp().getRequest().user as AuthedUser;
});
