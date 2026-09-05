import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";

/** Minimal .env loader: walks up from cwd, never overrides real env vars. */
function loadDotEnv(): void {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const file = join(dir, ".env");
    if (existsSync(file)) {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
        if (m && process.env[m[1]!] === undefined) {
          process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
        }
      }
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().default("mysql://chatter:chatter@localhost:3306/chatter"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  API_PORT: z.coerce.number().int().default(4000),
  API_ORIGIN: z.string().url().default("http://localhost:4000"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  SESSION_SECRET: z.string().min(16).default("dev-only-secret-change-me"),
  COOKIE_SECURE: z
    .string()
    .default("false")
    .transform((v) => v === "true"),

  // JWT signing. Production must provide an RSA PKCS#8 private key through
  // secret infrastructure. Development/test generate an ephemeral key so no
  // private material is ever committed to the repository.
  JWT_ALLOWED_ALGORITHMS: z.literal("RS256").default("RS256"),
  JWT_ISSUER: z.string().min(1).default("https://auth.chatter.local"),
  JWT_ACCESS_AUDIENCE: z.string().min(1).default("chatter-api"),
  JWT_REFRESH_AUDIENCE: z.string().min(1).default("chatter-auth-refresh"),
  JWT_ACTIVE_KID: z.string().regex(/^[A-Za-z0-9._-]{1,80}$/).default("dev-ephemeral"),
  JWT_ACTIVE_PRIVATE_KEY: z.string().optional(),
  JWT_VERIFICATION_KEYS_JSON: z.string().optional(),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(300).max(900).default(600),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().min(3600).max(60 * 60 * 24 * 90).default(60 * 60 * 24 * 14),
  JWT_CLOCK_TOLERANCE_SECONDS: z.coerce.number().int().min(0).max(60).default(5),

  STORAGE_DRIVER: z.enum(["disk", "s3"]).default("disk"),
  STORAGE_DISK_ROOT: z.string().default("./var/storage"),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().default("chatter-files"),

  // Outbound email. With SMTP_URL unset, non-production writes .eml files to
  // MAIL_DEV_OUTBOX (a local mail sink, like MailHog) so flows are testable;
  // production refuses to send rather than silently dropping mail.
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default("Chatter <no-reply@chatter.local>"),
  MAIL_DEV_OUTBOX: z.string().default("./var/mail"),

  // One-time-password policy for password reset.
  OTP_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(600),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(15).max(600).default(60),
  OTP_MAX_RESENDS: z.coerce.number().int().min(1).max(10).default(3),
  RESET_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(600),

  LIVEKIT_URL: z.string().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
}).superRefine((env, ctx) => {
  if (env.NODE_ENV !== "production") return;
  if (env.SESSION_SECRET.length < 32 || env.SESSION_SECRET === "dev-only-secret-change-me") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["SESSION_SECRET"],
      message: "production SESSION_SECRET must be at least 32 characters and secret-managed",
    });
  }
  if (!env.COOKIE_SECURE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["COOKIE_SECURE"],
      message: "COOKIE_SECURE must be true in production",
    });
  }
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

/** Parse and cache process.env. Throws on invalid configuration at boot. */
export function loadEnv(): Env {
  if (!cached) {
    loadDotEnv();
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
    }
    cached = parsed.data;
  }
  return cached;
}

export function isProd(): boolean {
  return loadEnv().NODE_ENV === "production";
}

/** True when LiveKit is fully configured; the calls module refuses to simulate otherwise. */
export function livekitConfigured(env: Env = loadEnv()): boolean {
  return Boolean(env.LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET);
}
