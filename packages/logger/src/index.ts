import pino, { type Logger } from "pino";

export type { Logger };

/**
 * Structured pino logger with service name and redaction of sensitive fields.
 *
 * `destination` exists so the redaction rules can be asserted in tests — pino
 * writes to fd 1 directly by default, which a test cannot intercept. Production
 * callers omit it and get the standard stdout destination.
 */
export function createLogger(service: string, destination?: pino.DestinationStream): Logger {
  return pino({
    name: service,
    level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "silent" : "info"),
    redact: {
      // Centralised so redaction never depends on a developer remembering it at
      // the call site. Covers both bare fields and one level of nesting, since
      // most leaks arrive as `{ body: { aadhaar } }` or `{ err: { otp } }`.
      paths: [
        "req.headers.cookie",
        "req.headers.authorization",
        "req.body",
        "res.body",
        "password",
        "passwordHash",
        "token",
        "accessToken",
        "refreshToken",
        "authorization",
        "otp",
        "aadhaar",
        "aadhaarNumber",
        "aadhaarHash",
        "apiKey",
        "clientSecret",
        "resetToken",
        "encryptedPayload",
        "ciphertext",
        "deviceKeys",
        "one_time_keys",
        "fallback_keys",
        "*.password",
        "*.otp",
        "*.aadhaar",
        "*.aadhaarNumber",
        "*.aadhaarHash",
        "*.apiKey",
        "*.clientSecret",
        "*.token",
        "*.accessToken",
        "*.refreshToken",
        "*.authorization",
        "*.encryptedPayload",
        "*.ciphertext",
        "*.deviceKeys",
        "*.one_time_keys",
        "*.fallback_keys",
      ],
      censor: "[redacted]",
    },
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  }, destination);
}
