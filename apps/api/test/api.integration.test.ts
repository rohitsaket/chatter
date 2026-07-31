/**
 * Integration tests: boot the real Nest app against the chatter_test database
 * (migrated + seeded in beforeAll) and exercise auth, tenancy, RBAC, CSRF,
 * idempotency and persistence through real HTTP.
 */
import { execSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { INestApplication } from "@nestjs/common";
import { CookieJar } from "@chatter/test-utils";

const TEST_DB = "postgresql://chatter:chatter@localhost:5432/chatter_test";
process.env.DATABASE_URL = TEST_DB;
process.env.NODE_ENV = "test";

let app: INestApplication;
let baseUrl: string;

class Client {
  jar = new CookieJar();

  async req(method: string, path: string, body?: unknown): Promise<{ status: number; json: any }> {
    const csrf = /chatter_csrf=([^;]+)/.exec(this.jar.header())?.[1];
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        cookie: this.jar.header(),
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(csrf && method !== "GET" ? { "x-csrf-token": csrf } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    this.jar.absorb(res.headers.getSetCookie());
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      /* empty body */
    }
    return { status: res.status, json };
  }

  get(path: string) {
    return this.req("GET", path);
  }
  post(path: string, body?: unknown) {
    return this.req("POST", path, body);
  }
  patch(path: string, body?: unknown) {
    return this.req("PATCH", path, body);
  }
}

const clients = new Map<string, Client>();

/** One login per user for the whole suite (stays under the auth rate limit). */
async function loginAs(email: string): Promise<Client> {
  const existing = clients.get(email);
  if (existing) return existing;
  const c = new Client();
  const res = await c.post("/api/v1/auth/login", { email, password: "Chatter!Demo1" });
  expect(res.status).toBe(200);
  clients.set(email, c);
  return c;
}

beforeAll(async () => {
  // Reset the dedicated test database (drop schema + reapply migrations)
  // rather than migrate-deploy onto whatever state the last run left behind:
  // the suite's assertions depend on pristine seed data, and messages and
  // read-state mutate across runs. Scoped to chatter_test by construction.
  const { PrismaClient } = await import("@chatter/database");
  const admin = new PrismaClient({ datasources: { db: { url: TEST_DB } } });
  await admin.$executeRawUnsafe("DROP SCHEMA IF EXISTS public CASCADE");
  await admin.$executeRawUnsafe("CREATE SCHEMA public");
  await admin.$disconnect();
  execSync("npx prisma migrate deploy", {
    cwd: `${__dirname}/../../../packages/database`,
    env: { ...process.env, DATABASE_URL: TEST_DB },
    stdio: "pipe",
  });
  execSync("node dist/seed.js", {
    cwd: `${__dirname}/../../../packages/database`,
    env: { ...process.env, DATABASE_URL: TEST_DB },
    stdio: "pipe",
  });

  const { NestFactory } = await import("@nestjs/core");
  const cookieParser = (await import("cookie-parser")).default;
  // Import the tsc-compiled build: esbuild (vitest) does not emit the decorator
  // metadata Nest's DI requires. `nest build` runs before tests (turbo dependsOn).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AppModule } = require("../dist/app.module") as typeof import("../src/app.module");
  app = await NestFactory.create(AppModule, { logger: false });
  app.use(cookieParser("test-secret"));
  app.setGlobalPrefix("api/v1", { exclude: ["health", "metrics"] });
  await app.listen(0);
  baseUrl = await app.getUrl();
  baseUrl = baseUrl.replace("[::1]", "127.0.0.1");
});

afterAll(async () => {
  await app?.close();
});

describe("auth", () => {
  it("rejects bad credentials", async () => {
    const c = new Client();
    const res = await c.post("/api/v1/auth/login", { email: "john.doe@acmecorp.com", password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("registers a new user with a session cookie and org membership", async () => {
    const c = new Client();
    const email = `test.user.${Date.now()}@acmecorp.com`;
    const res = await c.post("/api/v1/auth/register", { name: "Test User", email, password: "Chatter!Demo1" });
    expect(res.status).toBe(201);
    const me = await c.get("/api/v1/users/me");
    expect(me.status).toBe(200);
    expect(me.json.email).toBe(email);
    expect(me.json.orgRole).toBe("MEMBER");
  });

  it("requires authentication for protected routes", async () => {
    const c = new Client();
    const res = await c.get("/api/v1/conversations");
    expect(res.status).toBe(401);
  });
});

describe("CSRF", () => {
  it("rejects cookie-authenticated mutations without the CSRF header", async () => {
    const c = await loginAs("john.doe@acmecorp.com");
    const res = await fetch(`${baseUrl}/api/v1/conversations/alice/read`, {
      method: "POST",
      headers: { cookie: c.jar.header() }, // no x-csrf-token
    });
    expect(res.status).toBe(403);
  });
});

describe("conversations & messages", () => {
  it("lists seeded conversations with unread counts", async () => {
    const c = await loginAs("john.doe@acmecorp.com");
    const res = await c.get("/api/v1/conversations");
    expect(res.status).toBe(200);
    const slugs = res.json.map((x: any) => x.slug);
    expect(slugs).toContain("alice");
    expect(slugs).toContain("design");
    const design = res.json.find((x: any) => x.slug === "design");
    expect(design.kind).toBe("GROUP");
    expect(design.unreadCount).toBeGreaterThan(0);
  });

  it("enforces participant access (non-participant gets 403)", async () => {
    // Sophia Lee is not a participant of the alice<->john DM.
    const c = await loginAs("sophia.lee@acmecorp.com");
    const res = await c.get("/api/v1/conversations/alice");
    expect(res.status).toBe(403);
  });

  it("sends a message idempotently (same key -> one message)", async () => {
    const c = await loginAs("john.doe@acmecorp.com");
    const key = `it-${Date.now()}`;
    const text = `integration hello ${key}`;
    const body = { text, idempotencyKey: key };
    const first = await c.post("/api/v1/conversations/alice/messages", body);
    const second = await c.post("/api/v1/conversations/alice/messages", body);
    expect(first.status).toBe(201);
    expect(second.json.id).toBe(first.json.id);
    const list = await c.get("/api/v1/conversations/alice/messages?limit=100");
    const matching = list.json.items.filter((m: any) => m.text === text);
    expect(matching.length).toBe(1);
  });

  it("marks read and clears unread count", async () => {
    const c = await loginAs("john.doe@acmecorp.com");
    await c.post("/api/v1/conversations/michael/read");
    const res = await c.get("/api/v1/conversations/michael");
    expect(res.json.unreadCount).toBe(0);
  });

  it("records and switches a poll vote (one vote per user)", async () => {
    const c = await loginAs("john.doe@acmecorp.com");
    const msgs = await c.get("/api/v1/conversations/design/messages?limit=100");
    const pollMsg = msgs.json.items.find((m: any) => m.poll);
    expect(pollMsg).toBeTruthy();
    const [optA, optB] = pollMsg.poll.options;
    const before = pollMsg.poll.totalVotes;

    const v1 = await c.post(`/api/v1/messages/${pollMsg.id}/vote`, { optionId: optA.id });
    expect(v1.json.poll.myOptionId).toBe(optA.id);
    const v2 = await c.post(`/api/v1/messages/${pollMsg.id}/vote`, { optionId: optB.id });
    expect(v2.json.poll.myOptionId).toBe(optB.id);
    // Switching reallocates, never double-counts.
    expect(v2.json.poll.totalVotes).toBe(v1.json.poll.totalVotes);
    expect(v2.json.poll.totalVotes).toBeLessThanOrEqual(before + 1);
  });

  it("toggles reactions", async () => {
    const c = await loginAs("john.doe@acmecorp.com");
    const msgs = await c.get("/api/v1/conversations/alice/messages?limit=5");
    const target = msgs.json.items[0];
    const on = await c.post(`/api/v1/messages/${target.id}/react`, { emoji: "🎉" });
    expect(on.json.reactions.find((r: any) => r.emoji === "🎉")?.mine).toBe(true);
    const off = await c.post(`/api/v1/messages/${target.id}/react`, { emoji: "🎉" });
    expect(off.json.reactions.find((r: any) => r.emoji === "🎉")).toBeUndefined();
  });
});

describe("RBAC", () => {
  it("denies admin endpoints to members", async () => {
    const c = await loginAs("sophia.lee@acmecorp.com");
    const res = await c.get("/api/v1/admin/members");
    expect(res.status).toBe(403);
  });

  it("allows admin endpoints to the owner and blocks managing peers upward", async () => {
    const c = await loginAs("john.doe@acmecorp.com");
    const members = await c.get("/api/v1/admin/members");
    expect(members.status).toBe(200);
    const alice = members.json.find((m: any) => m.email === "alice.johnson@acmecorp.com");
    expect(alice.role).toBe("ADMIN");

    // Alice (ADMIN) cannot suspend John (OWNER).
    const ca = await loginAs("alice.johnson@acmecorp.com");
    const john = members.json.find((m: any) => m.email === "john.doe@acmecorp.com");
    const res = await ca.post(`/api/v1/admin/members/${john.userId}/suspend`, { suspended: true });
    expect(res.status).toBe(403);
  });
});

describe("statuses", () => {
  it("records views idempotently and reflects analytics", async () => {
    const c = await loginAs("john.doe@acmecorp.com");
    const feed = await c.get("/api/v1/statuses");
    expect(feed.status).toBe(200);
    const someone = feed.json.find((s: any) => s.owner.name !== "John Doe");
    expect(someone).toBeTruthy();
    const v1 = await c.post(`/api/v1/statuses/${someone.id}/view`);
    const v2 = await c.post(`/api/v1/statuses/${someone.id}/view`);
    expect(v2.json.viewCount).toBe(v1.json.viewCount); // idempotent
    expect(v2.json.viewedByMe).toBe(true);
  });

  it("restricts group-audience statuses to group members", async () => {
    // Alice's mountain status is audience group:design; Matthew is a member,
    // but a fresh registered user is not.
    const outsider = new Client();
    await outsider.post("/api/v1/auth/register", {
      name: "Outsider User",
      email: `outsider.${Date.now()}@acmecorp.com`,
      password: "Chatter!Demo1",
    });
    const feed = await outsider.get("/api/v1/statuses");
    const captions = feed.json.map((s: any) => s.caption ?? "");
    expect(captions.join(" ")).not.toContain("design sprint in the mountains");
  });
});

describe("settings", () => {
  it("persists updates", async () => {
    const c = await loginAs("john.doe@acmecorp.com");
    await c.patch("/api/v1/settings", { accent: "teal", fontSize: 16 });
    const res = await c.get("/api/v1/settings");
    expect(res.json.accent).toBe("teal");
    expect(res.json.fontSize).toBe(16);
    await c.patch("/api/v1/settings", { accent: "purple", fontSize: 14 });
  });

  it("rejects invalid values", async () => {
    const c = await loginAs("john.doe@acmecorp.com");
    const res = await c.patch("/api/v1/settings", { fontSize: 99 });
    expect(res.status).toBe(400);
  });
});

describe("calls", () => {
  it("returns a truthful not-configured response instead of simulating", async () => {
    const c = await loginAs("john.doe@acmecorp.com");
    const res = await c.post("/api/v1/calls/join/design");
    expect(res.status).toBe(200);
    expect(res.json.configured).toBe(false);
    expect(res.json.reason).toMatch(/not configured/i);
    expect(res.json.token).toBeUndefined();
  });
});

describe("health", () => {
  it("reports db status", async () => {
    const res = await fetch(`${baseUrl}/health`);
    const json = await res.json();
    expect(json.status).toBe("ok");
  });
});

describe("websocket session revocation", () => {
  it("disconnects a live socket when its session is revoked via logout", async () => {
    // Fresh client (dedicated session): a socket authenticated with that
    // session must be force-disconnected by the server on logout.
    const c = new Client();
    const login = await c.post("/api/v1/auth/login", { email: "emily.davis@acmecorp.com", password: "Chatter!Demo1" });
    expect(login.status).toBe(200);

    const { io } = await import("socket.io-client");
    const socket = io(baseUrl, {
      path: "/socket.io",
      transports: ["websocket"],
      extraHeaders: { cookie: c.jar.header() },
    });
    await new Promise<void>((resolve, reject) => {
      socket.on("connect", () => resolve());
      socket.on("connect_error", (e) => reject(e));
      setTimeout(() => reject(new Error("socket connect timeout")), 5000);
    });
    expect(socket.connected).toBe(true);

    const disconnected = new Promise<string>((resolve) => socket.on("disconnect", (reason) => resolve(reason)));
    const out = await c.post("/api/v1/auth/logout");
    expect(out.status).toBe(200);

    const reason = await Promise.race([
      disconnected,
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error("socket was not disconnected after logout")), 5000)),
    ]);
    expect(reason).toBe("io server disconnect");
    socket.close();
  });

  it("rejects an unauthenticated socket connection", async () => {
    const { io } = await import("socket.io-client");
    const socket = io(baseUrl, { path: "/socket.io", transports: ["websocket"] });
    const outcome = await new Promise<string>((resolve) => {
      socket.on("connect", () => {
        // Server accepts the transport then must immediately drop it.
        socket.on("disconnect", () => resolve("disconnected"));
        setTimeout(() => resolve(socket.connected ? "still-connected" : "disconnected"), 2000);
      });
      socket.on("connect_error", () => resolve("rejected"));
      setTimeout(() => resolve("timeout"), 5000);
    });
    expect(["disconnected", "rejected"]).toContain(outcome);
    socket.close();
  });
});
