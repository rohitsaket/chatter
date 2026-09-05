import { Body, Controller, HttpCode, Post, Req, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import {
  loginBody,
  registerBody,
  passwordResetRequestBody,
  passwordResetVerifyBody,
  passwordResetResendBody,
  passwordResetCompleteBody,
  type LoginBody,
  type RegisterBody,
  type PasswordResetRequestBody,
  type PasswordResetVerifyBody,
  type PasswordResetCompleteBody,
} from "@chatter/contracts";
import { Public } from "../../common/session.guard";
import { REFRESH_COOKIE, SessionService, type AuthedUser } from "../../common/session.service";
import { ZodPipe } from "../../common/zod.pipe";
import { RealtimeGateway } from "../../realtime/realtime.gateway";
import { AuthService } from "./auth.service";
import { PasswordResetService } from "./password-reset.service";
import { E2EEService } from "../e2ee/e2ee.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly realtime: RealtimeGateway,
    private readonly reset: PasswordResetService,
    private readonly e2ee: E2EEService,
  ) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: process.env.NODE_ENV === "test" ? 1_000 : 10 } })
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
  @Throttle({ default: { ttl: 60_000, limit: process.env.NODE_ENV === "test" ? 1_000 : 10 } })
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
  /**
   * Step 1 — email + mobile + Aadhaar must match one account. Always returns
   * the same generic shape; the tight throttle limits reset-probing.
   */
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("password-reset/request")
  passwordResetRequest(
    @Body(new ZodPipe(passwordResetRequestBody)) body: PasswordResetRequestBody,
    @Req() req: Request,
  ) {
    return this.reset.request(body, req.ip);
  }

  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("password-reset/verify-otp")
  passwordResetVerify(@Body(new ZodPipe(passwordResetVerifyBody)) body: PasswordResetVerifyBody) {
    return this.reset.verifyOtp(body);
  }

  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post("password-reset/resend")
  passwordResetResend(@Body(new ZodPipe(passwordResetResendBody)) body: { challengeId: string }) {
    return this.reset.resend(body.challengeId);
  }

  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("password-reset/complete")
  passwordResetComplete(@Body(new ZodPipe(passwordResetCompleteBody)) body: PasswordResetCompleteBody) {
    return this.reset.complete(body);
  }

  @HttpCode(200)
  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = (req as Request & { user: AuthedUser }).user;
    await this.e2ee.retireDevices(user.userId, [user.deviceId]);
    await this.sessions.revokeCurrent(user.sessionId, res);
    await this.realtime.disconnectRevokedSession(user.userId, user.sessionId);
    return { ok: true };
  }

  @Public()
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post("refresh")
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.sessions.refresh(req.cookies?.[REFRESH_COOKIE], res);
  }

  @HttpCode(200)
  @Post("logout-all")
  async logoutAll(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = (req as Request & { user: AuthedUser }).user;
    await this.e2ee.retireDevices(user.userId);
    await this.sessions.revokeAll(user.userId);
    await this.sessions.revokeCurrent(undefined, res);
    await this.realtime.disconnectRevokedSession(user.userId);
    return { ok: true };
  }
}
