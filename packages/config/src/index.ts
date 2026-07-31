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
  DATABASE_URL: z.string().url().default("postgresql://chatter:chatter@localhost:5432/chatter"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  API_PORT: z.coerce.number().int().default(4000),
  API_ORIGIN: z.string().url().default("http://localhost:4000"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  SESSION_SECRET: z.string().min(16).default("dev-only-secret-change-me"),
  COOKIE_SECURE: z
    .string()
    .default("false")
    .transform((v) => v === "true"),

  STORAGE_DRIVER: z.enum(["disk", "s3"]).default("disk"),
  STORAGE_DISK_ROOT: z.string().default("./var/storage"),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().default("chatter-files"),

  LIVEKIT_URL: z.string().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
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
