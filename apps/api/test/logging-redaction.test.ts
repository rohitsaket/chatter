import { Writable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLogger } from "@chatter/logger";

/**
 * Redaction is centralised in the logger so it cannot depend on every call site
 * remembering it. These assertions pin that contract: an accidental
 * `logger.info({ otp })` anywhere in the codebase must not print the value.
 */
describe("logger redaction", () => {
  const previousLevel = process.env.LOG_LEVEL;
  let lines: string[];
  let sink: Writable;

  beforeEach(() => {
    // The default level is "silent" under NODE_ENV=test, which would emit nothing.
    process.env.LOG_LEVEL = "info";
    lines = [];
    sink = new Writable({
      write(chunk, _enc, cb) {
        lines.push(String(chunk));
        cb();
      },
    });
  });

  afterEach(() => {
    if (previousLevel === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = previousLevel;
  });

  const AADHAAR = "234567890124";
  const OTP = "471039";

  function emit(payload: Record<string, unknown>): string {
    const log = createLogger("redaction-test", sink);
    log.info(payload, "test");
    return lines.join("");
  }

  it("redacts identity and one-time-secret fields at the top level", () => {
    const out = emit({
      aadhaar: AADHAAR,
      aadhaarNumber: AADHAAR,
      aadhaarHash: "fingerprint-value",
      otp: OTP,
      password: "hunter2hunter2",
      token: "session-token",
      resetToken: "reset-token",
      apiKey: "live-api-key",
      clientSecret: "live-client-secret",
    });

    for (const secret of [
      AADHAAR,
      OTP,
      "fingerprint-value",
      "hunter2hunter2",
      "session-token",
      "reset-token",
      "live-api-key",
      "live-client-secret",
    ]) {
      expect(out).not.toContain(secret);
    }
    expect(out).toContain("[redacted]");
  });

  it("redacts the same fields one level down, where leaks usually arrive", () => {
    const out = emit({ body: { aadhaar: AADHAAR, otp: OTP, apiKey: "live-api-key" } });
    expect(out).not.toContain(AADHAAR);
    expect(out).not.toContain(OTP);
    expect(out).not.toContain("live-api-key");
  });

  it("redacts whole request and response bodies and the cookie header", () => {
    const out = emit({
      req: { headers: { cookie: "chatter_session=abc123", authorization: "Bearer abc123" }, body: { aadhaar: AADHAAR } },
      res: { body: { otp: OTP } },
    });
    expect(out).not.toContain("abc123");
    expect(out).not.toContain(AADHAAR);
    expect(out).not.toContain(OTP);
  });

  it("still logs non-sensitive diagnostic fields", () => {
    const out = emit({ event: "password-reset-requested", attempt: 2, correlationId: "corr-9" });
    expect(out).toContain("password-reset-requested");
    expect(out).toContain("corr-9");
  });
});
