import pino, { type Logger } from "pino";

export type { Logger };

/** Structured pino logger with service name and redaction of sensitive fields. */
export function createLogger(service: string): Logger {
  return pino({
    name: service,
    level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "silent" : "info"),
    redact: {
      paths: ["req.headers.cookie", "req.headers.authorization", "password", "passwordHash", "token"],
      censor: "[redacted]",
    },
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
