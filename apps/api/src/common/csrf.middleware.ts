import { ForbiddenException, Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE } from "./session.service";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Double-submit CSRF protection for cookie-authenticated mutations:
 * state-changing requests must echo the readable CSRF cookie in `x-csrf-token`.
 * Requests without a session cookie (login/register) are exempt.
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (SAFE_METHODS.has(req.method) || (!req.cookies?.[ACCESS_COOKIE] && !req.cookies?.[REFRESH_COOKIE])) return next();
    const cookie = req.cookies?.[CSRF_COOKIE];
    const header = req.headers["x-csrf-token"];
    if (!cookie || cookie !== header) {
      throw new ForbiddenException("CSRF token missing or invalid");
    }
    next();
  }
}
