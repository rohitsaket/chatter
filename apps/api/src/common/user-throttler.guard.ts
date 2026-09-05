import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { Request } from "express";
import type { AuthedUser } from "./session.service";

/**
 * Rate-limits per authenticated user rather than per IP.
 *
 * The default tracker keys on IP, which is the wrong unit for an endpoint that
 * already requires a session: everyone behind one office NAT would share a
 * budget, while a single account could enumerate freely by rotating addresses.
 * Keying on the user id — and falling back to IP only when unauthenticated —
 * makes the limit follow the account doing the searching.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Request): Promise<string> {
    const user = (req as Request & { user?: AuthedUser }).user;
    return user?.userId ? `user:${user.userId}` : `ip:${req.ip ?? "unknown"}`;
  }
}
