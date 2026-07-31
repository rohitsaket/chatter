import { Body, Controller, HttpCode, Post, Req, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { loginBody, registerBody, type LoginBody, type RegisterBody } from "@chatter/contracts";
import { Public } from "../../common/session.guard";
import { SESSION_COOKIE, SessionService } from "../../common/session.service";
import { ZodPipe } from "../../common/zod.pipe";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post("register")
  async register(
    @Body(new ZodPipe(registerBody)) body: RegisterBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { userId } = await this.auth.register(body);
    await this.sessions.create(userId, res, { ip: req.ip, userAgent: req.headers["user-agent"] });
    return { ok: true };
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(200)
  @Post("login")
  async login(
    @Body(new ZodPipe(loginBody)) body: LoginBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { userId } = await this.auth.verifyCredentials(body);
    await this.sessions.create(userId, res, { ip: req.ip, userAgent: req.headers["user-agent"] });
    return { ok: true };
  }

  @HttpCode(200)
  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.sessions.revoke(req.cookies?.[SESSION_COOKIE], res);
    return { ok: true };
  }

  @HttpCode(200)
  @Post("logout-all")
  async logoutAll(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = (req as Request & { user: { userId: string } }).user;
    await this.sessions.revokeAll(user.userId);
    await this.sessions.revoke(req.cookies?.[SESSION_COOKIE], res);
    return { ok: true };
  }
}
