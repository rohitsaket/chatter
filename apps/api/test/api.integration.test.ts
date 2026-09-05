/**
 * Integration tests: boot the real Nest app against the chatter_test database
 * (migrated + seeded in beforeAll) and exercise auth, tenancy, RBAC, CSRF,
 * idempotency and persistence through real HTTP.
 */
import { execSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@chatter/database";
import { CookieJar } from "@chatter/test-utils";
import { verhoeffValid } from "@chatter/validation";

/** Complete an 11-digit prefix into a Verhoeff-valid 12-digit number. */
function makeAadhaar(prefix11: string): string {
  for (let d = 0; d <= 9; d++) {
    const candidate = `${prefix11}${d}`;
    if (verhoeffValid(candidate)) return candidate;
  }
  throw new Error("no valid check digit");
}

let seq = 0;
/** A fresh, valid registration payload with unique email / mobile / Aadhaar. */
function newRegistration(over: Record<string, unknown> = {}) {
  seq += 1;
  const n = (Date.now() % 100000) * 100 + seq;
  return {
    firstName: "Test",
    lastName: "User",
    email: `test.user.${n}@acmecorp.com`,
    password: "Chatter!Demo1",
    mobileNumber: `9${String(100000000 + (n % 899999999)).padStart(9, "0")}`,
    country: "IN",
    state: "Gujarat",
    pinCode: "380001",
    aadhaarNumber: makeAadhaar(`2${String(3456789000 + (n % 999999)).padStart(10, "0")}`),
    confirmAccurate: true,
    ...over,
  };
}

const TEST_DB = process.env.TEST_DATABASE_URL ?? "mysql://chatter:chatter@localhost:3306/chatter_test";
process.env.DATABASE_URL = TEST_DB;
process.env.NODE_ENV = "test";

let app: INestApplication;
let baseUrl: string;
const db = new PrismaClient();

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
  const res = await c.post("/api/v1/auth/login", { identifier: email, password: "Chatter!Demo1" });
  expect(res.status).toBe(200);
  clients.set(email, c);
  return c;
}

beforeAll(async () => {
  // Reset the dedicated test database (drop everything + reapply migrations)
  // rather than migrate-deploy onto whatever state the last run left behind:
  // the suite's assertions depend on pristine seed data, and messages and
  // read-state mutate across runs. Scoped to chatter_test by construction.
  // `migrate reset` is used instead of provider-specific DDL so the reset works
  // on whatever engine DATABASE_URL points at.
  execSync("npx prisma migrate reset --force --skip-generate --skip-seed", {
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
  await db.$disconnect();
});

describe("auth", () => {
  it("rejects bad credentials", async () => {
    const c = new Client();
    const res = await c.post("/api/v1/auth/login", { identifier: "john.doe@acmecorp.com", password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("registers a new user with a session cookie and org membership", async () => {
    const c = new Client();
    const body = newRegistration();
    const res = await c.post("/api/v1/auth/register", body);
    expect(res.status).toBe(201);
    const me = await c.get("/api/v1/users/me");
    expect(me.status).toBe(200);
    expect(me.json.email).toBe(body.email);
    expect(me.json.orgRole).toBe("MEMBER");
    // Structured profile persisted, display name derived from first + last.
    expect(me.json.firstName).toBe("Test");
    expect(me.json.lastName).toBe("User");
    expect(me.json.name).toBe("Test User");
    expect(me.json.country).toBe("IN");
    expect(me.json.state).toBe("Gujarat");
    expect(me.json.pinCode).toBe("380001");
    expect(me.json.phone).toBe(`+91${body.mobileNumber}`);
  });

  it("requires authentication for protected routes", async () => {
    const c = new Client();
    const res = await c.get("/api/v1/conversations");
    expect(res.status).toBe(401);
  });

  it("rotates refresh JWTs and revokes the family when an old token is replayed", async () => {
    const c = new Client();
    expect((await c.post("/api/v1/auth/login", { identifier: "emily.davis@acmecorp.com", password: "Chatter!Demo1" })).status).toBe(200);
    const firstCookies = c.jar.header();
    const firstCsrf = /chatter_csrf=([^;]+)/.exec(firstCookies)?.[1];
    expect((await c.post("/api/v1/auth/refresh")).status).toBe(200);

    const replay = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { cookie: firstCookies, "x-csrf-token": firstCsrf! },
    });
    expect(replay.status).toBe(401);
    // Replay burns R2 as well; rotation may never continue blindly.
    expect((await c.post("/api/v1/auth/refresh")).status).toBe(401);
  });

  it("rejects refresh-token substitution at an access endpoint", async () => {
    const c = new Client();
    await c.post("/api/v1/auth/login", { identifier: "michael.brown@acmecorp.com", password: "Chatter!Demo1" });
    const refresh = /chatter_refresh=([^;]+)/.exec(c.jar.header())?.[1];
    const res = await fetch(`${baseUrl}/api/v1/users/me`, {
      headers: { cookie: `chatter_access=${refresh}` },
    });
    expect(res.status).toBe(401);
  });

  it("serves a public JWKS without private key parameters", async () => {
    const res = await fetch(`${baseUrl}/api/v1/.well-known/jwks.json`);
    expect(res.status).toBe(200);
    const jwks = await res.json();
    expect(jwks.keys[0]).toMatchObject({ kty: "RSA", alg: "RS256", use: "sig" });
    expect(jwks.keys[0].d).toBeUndefined();
  });

  it("rejects an otherwise valid access JWT when account state changes", async () => {
    const c = new Client();
    const body = newRegistration();
    await c.post("/api/v1/auth/register", body);
    await db.user.update({ where: { email: body.email }, data: { status: "SUSPENDED" } });
    expect((await c.get("/api/v1/users/me")).status).toBe(401);
    await db.user.update({ where: { email: body.email }, data: { status: "ACTIVE" } });
  });

  it("manages three device sessions independently and supports logout-all", async () => {
    const devices = [new Client(), new Client(), new Client()];
    for (const device of devices) {
      expect((await device.post("/api/v1/auth/login", {
        identifier: "olivia.martinez@acmecorp.com",
        password: "Chatter!Demo1",
      })).status).toBe(200);
    }
    expect((await devices[0]!.post("/api/v1/auth/logout")).status).toBe(200);
    expect((await devices[1]!.get("/api/v1/users/me")).status).toBe(200);
    expect((await devices[2]!.get("/api/v1/users/me")).status).toBe(200);
    expect((await devices[1]!.post("/api/v1/auth/logout-all")).status).toBe(200);
    expect((await devices[2]!.get("/api/v1/users/me")).status).toBe(401);
  });
});

describe("login — any registered identifier", () => {
  it("accepts email, mobile and Aadhaar with the same password", async () => {
    const body = newRegistration();
    expect((await new Client().post("/api/v1/auth/register", body)).status).toBe(201);

    for (const identifier of [
      body.email,
      body.mobileNumber,
      `+91${body.mobileNumber}`,
      body.aadhaarNumber,
      `${body.aadhaarNumber.slice(0, 4)}-${body.aadhaarNumber.slice(4, 8)}-${body.aadhaarNumber.slice(8)}`,
    ]) {
      const res = await new Client().post("/api/v1/auth/login", { identifier, password: body.password });
      expect(res.status).toBe(200);
    }
  });

  it("returns one indistinguishable failure for every kind of bad login", async () => {
    const body = newRegistration();
    await new Client().post("/api/v1/auth/register", body);

    const attempts = [
      { identifier: body.email, password: "wrong-password" },
      { identifier: "nobody@acmecorp.com", password: body.password },
      { identifier: "9000000001", password: body.password },
      { identifier: makeAadhaar("29999999999"), password: body.password },
      { identifier: "!!!not-an-identifier!!!", password: body.password },
    ];
    const results = [];
    for (const a of attempts) results.push(await new Client().post("/api/v1/auth/login", a));

    // Same status and same message every time — no account enumeration.
    expect(results.every((r) => r.status === 401)).toBe(true);
    expect(new Set(results.map((r) => r.json.message)).size).toBe(1);
  });

  it("rejects an empty identifier or password", async () => {
    expect((await new Client().post("/api/v1/auth/login", { identifier: "", password: "x" })).status).toBe(400);
    expect((await new Client().post("/api/v1/auth/login", { identifier: "a@b.com", password: "" })).status).toBe(400);
  });
});

describe("password reset — all three identifiers must match one account", () => {
  it("does not reveal whether a mismatched combination is registered", async () => {
    const body = newRegistration();
    await new Client().post("/api/v1/auth/register", body);
    const other = newRegistration();
    await new Client().post("/api/v1/auth/register", other);

    const combos = [
      { email: "ghost@acmecorp.com", mobileNumber: body.mobileNumber, aadhaarNumber: body.aadhaarNumber },
      { email: body.email, mobileNumber: "9000000009", aadhaarNumber: body.aadhaarNumber },
      { email: body.email, mobileNumber: body.mobileNumber, aadhaarNumber: other.aadhaarNumber },
      // identifiers belonging to different accounts
      { email: body.email, mobileNumber: other.mobileNumber, aadhaarNumber: other.aadhaarNumber },
    ];
    const results = [];
    for (const c of combos) results.push(await new Client().post("/api/v1/auth/password-reset/request", c));

    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(results.every((r) => typeof r.json.challengeId === "string")).toBe(true);
    expect(new Set(results.map((r) => r.json.message)).size).toBe(1);

    // A challenge from a mismatched request can never be advanced.
    const verify = await new Client().post("/api/v1/auth/password-reset/verify-otp", {
      challengeId: results[0]!.json.challengeId,
      otp: "000000",
    });
    expect(verify.status).toBe(400);
  });

  it("never returns the OTP in the API response", async () => {
    const body = newRegistration();
    await new Client().post("/api/v1/auth/register", body);
    const res = await new Client().post("/api/v1/auth/password-reset/request", {
      email: body.email,
      mobileNumber: body.mobileNumber,
      aadhaarNumber: body.aadhaarNumber,
    });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.json)).not.toMatch(/\b\d{6}\b/);
    // The registered address is masked.
    expect(res.json.sentTo).toMatch(/^.\*\*\*@/);
    expect(JSON.stringify(res.json)).not.toContain(body.aadhaarNumber);
  });

  it("rejects a reset completed with an unknown or forged token", async () => {
    const res = await new Client().post("/api/v1/auth/password-reset/complete", {
      resetToken: "a".repeat(43),
      password: "Chatter!Demo2",
      confirmPassword: "Chatter!Demo2",
    });
    expect(res.status).toBe(400);
  });
});

describe("registration — required fields", () => {
  const cases: [string, Record<string, unknown>][] = [
    ["missing first name", { firstName: "" }],
    ["whitespace-only first name", { firstName: "   " }],
    ["missing last name", { lastName: "" }],
    ["invalid email", { email: "not-an-email" }],
    ["invalid mobile (bad leading digit)", { mobileNumber: "1234567890" }],
    ["invalid mobile (too short)", { mobileNumber: "98765" }],
    ["unknown country", { country: "ZZ" }],
    ["state not in the country's list", { state: "Atlantis" }],
    ["invalid PIN for India", { pinCode: "38001" }],
    ["PIN starting with zero for India", { pinCode: "038001" }],
    ["Aadhaar wrong length", { aadhaarNumber: "12345678901" }],
    ["Aadhaar beginning with 1", { aadhaarNumber: "123456789012" }],
    ["Aadhaar failing the checksum", { aadhaarNumber: "234567890123" }],
    ["accuracy not confirmed", { confirmAccurate: false }],
    ["weak password", { password: "short1" }],
  ];

  for (const [name, override] of cases) {
    it(`rejects: ${name}`, async () => {
      const c = new Client();
      const res = await c.post("/api/v1/auth/register", newRegistration(override));
      expect(res.status).toBe(400);
    });
  }

  it("never echoes the submitted Aadhaar in a validation error", async () => {
    const c = new Client();
    const bad = "234567890123";
    const res = await c.post("/api/v1/auth/register", newRegistration({ aadhaarNumber: bad }));
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.json)).not.toContain(bad);
  });
});

describe("registration — duplicates and atomicity", () => {
  it("rejects a duplicate email", async () => {
    const first = newRegistration();
    expect((await new Client().post("/api/v1/auth/register", first)).status).toBe(201);
    const res = await new Client().post("/api/v1/auth/register", newRegistration({ email: first.email }));
    expect(res.status).toBe(409);
  });

  it("rejects a duplicate mobile number", async () => {
    const first = newRegistration();
    expect((await new Client().post("/api/v1/auth/register", first)).status).toBe(201);
    const res = await new Client().post("/api/v1/auth/register", newRegistration({ mobileNumber: first.mobileNumber }));
    expect(res.status).toBe(409);
  });

  it("rejects a duplicate Aadhaar and leaves no partial account behind", async () => {
    const first = newRegistration();
    expect((await new Client().post("/api/v1/auth/register", first)).status).toBe(201);

    const second = newRegistration({ aadhaarNumber: first.aadhaarNumber });
    const res = await new Client().post("/api/v1/auth/register", second);
    expect(res.status).toBe(409);

    // The rejected registration must not have created a usable account.
    const login = await new Client().post("/api/v1/auth/login", { identifier: second.email, password: second.password });
    expect(login.status).toBe(401);
  });
});

describe("registration — Aadhaar protection", () => {
  it("never returns the Aadhaar in plaintext, and masks it on the profile", async () => {
    const c = new Client();
    const body = newRegistration();
    const res = await c.post("/api/v1/auth/register", body);
    expect(res.status).toBe(201);
    expect(JSON.stringify(res.json)).not.toContain(body.aadhaarNumber);

    const me = await c.get("/api/v1/users/me");
    expect(JSON.stringify(me.json)).not.toContain(body.aadhaarNumber);
    expect(me.json.aadhaarMasked).toBe(`XXXX-XXXX-${body.aadhaarNumber.slice(-4)}`);
  });

  it("does not expose identity data through the contacts directory", async () => {
    const c = new Client();
    const body = newRegistration();
    await c.post("/api/v1/auth/register", body);
    const other = await loginAs("john.doe@acmecorp.com");
    const contacts = await other.get("/api/v1/contacts");
    const blob = JSON.stringify(contacts.json);
    expect(blob).not.toContain(body.aadhaarNumber);
    expect(blob).not.toContain("aadhaar");
  });

  it("denies identity reveal to a member and allows it to the owner, with an audit trail", async () => {
    const c = new Client();
    const body = newRegistration();
    await c.post("/api/v1/auth/register", body);
    const me = await c.get("/api/v1/users/me");
    const targetId = me.json.id as string;

    // A MEMBER may not reveal anyone's identity — not even their own.
    const asMember = await c.post(`/api/v1/admin/members/${targetId}/identity/reveal`, {});
    expect(asMember.status).toBe(403);

    const owner = await loginAs("john.doe@acmecorp.com"); // seeded OWNER
    const revealed = await owner.post(`/api/v1/admin/members/${targetId}/identity/reveal`, {});
    expect(revealed.status).toBe(200);
    expect(revealed.json.aadhaar).toBe(body.aadhaarNumber);

    // The access is audited, and the audit row must not contain the number.
    const audit = await owner.get("/api/v1/admin/audit");
    const entry = audit.json.find((a: any) => a.action === "identity.viewed" && a.target === targetId);
    expect(entry).toBeTruthy();
    expect(JSON.stringify(entry)).not.toContain(body.aadhaarNumber);
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
    const ciphertext = JSON.stringify({ algorithm: "m.megolm.v1.aes-sha2", session_id: `session-${key}`, ciphertext: "A".repeat(64) });
    const body = {
      encryptedEnvelope: {
        protocolVersion: "matrix-olm-megolm.v1",
        algorithm: "m.megolm.v1.aes-sha2",
        ciphertext,
        sessionId: `session-${key}`,
      },
      idempotencyKey: key,
    };
    const first = await c.post("/api/v1/conversations/alice/messages", body);
    const second = await c.post("/api/v1/conversations/alice/messages", body);
    expect(first.status).toBe(201);
    expect(second.json.id).toBe(first.json.id);
    const replay = await c.post("/api/v1/conversations/alice/messages", { ...body, idempotencyKey: `${key}-replay` });
    expect(replay.status).toBe(409);
    const list = await c.get("/api/v1/conversations/alice/messages?limit=100");
    const matching = list.json.items.filter((m: any) => m.encryption?.ciphertext === ciphertext);
    expect(matching.length).toBe(1);
    expect(matching[0].text).toBeNull();
    expect(matching[0].legacyPlaintext).toBe(false);
    const stored = await db.message.findUniqueOrThrow({ where: { id: first.json.id }, include: { encryption: true } });
    expect(stored.text).toBeNull();
    expect(stored.encryption?.encryptedPayload).toBe(ciphertext);
  });

  it("rejects plaintext-only sends instead of downgrading", async () => {
    const c = await loginAs("john.doe@acmecorp.com");
    const res = await c.post("/api/v1/conversations/alice/messages", { text: "server must never store this" });
    expect(res.status).toBe(400);
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

describe("strict E2EE relay", () => {
  async function registerDevice(client: Client, seed: string, withOneTimeKey = false) {
    const current = await client.get("/api/v1/e2ee/devices/current");
    expect(current.status).toBe(200);
    const { deviceId, userId } = current.json;
    const key = `${seed}`.padEnd(43, "x");
    const upload = await client.post("/api/v1/e2ee/keys/upload", {
      device_keys: {
        user_id: userId,
        device_id: deviceId,
        algorithms: ["m.olm.v1.curve25519-aes-sha2", "m.megolm.v1.aes-sha2"],
        keys: { [`curve25519:${deviceId}`]: `curve-${key}`, [`ed25519:${deviceId}`]: `ed-${key}` },
        signatures: { [userId]: { [`ed25519:${deviceId}`]: `sig-${key}` } },
      },
      one_time_keys: withOneTimeKey
        ? { "signed_curve25519:test": { key: `otk-${key}`, signatures: { [userId]: { [`ed25519:${deviceId}`]: `sig-${key}` } } } }
        : {},
      fallback_keys: {},
    });
    expect(upload.status).toBe(201);
    return { deviceId, userId } as { deviceId: string; userId: string };
  }

  it("binds public keys to JWT devices, atomically claims OTKs, and ACKs relay events", async () => {
    const john = await loginAs("john.doe@acmecorp.com");
    const alice = await loginAs("alice.johnson@acmecorp.com");
    const johnDevice = await registerDevice(john, "john");
    const aliceDevice = await registerDevice(alice, "alice", true);

    const query = await john.post("/api/v1/e2ee/keys/query", { device_keys: { [aliceDevice.userId]: [] } });
    expect(query.status).toBe(201);
    expect(query.json.device_keys[aliceDevice.userId][aliceDevice.deviceId].device_id).toBe(aliceDevice.deviceId);

    const claimBody = { one_time_keys: { [aliceDevice.userId]: { [aliceDevice.deviceId]: "signed_curve25519" } } };
    const [claimA, claimB] = await Promise.all([
      john.post("/api/v1/e2ee/keys/claim", claimBody),
      john.post("/api/v1/e2ee/keys/claim", claimBody),
    ]);
    const claimed = [claimA, claimB].filter((r) => Object.keys(r.json.one_time_keys[aliceDevice.userId] ?? {}).length > 0);
    expect(claimed).toHaveLength(1);

    const relay = await john.post("/api/v1/e2ee/to-device", {
      eventType: "m.room.encrypted",
      transactionId: `txn-${Date.now()}`,
      messages: { [aliceDevice.userId]: { [aliceDevice.deviceId]: { algorithm: "m.olm.v1.curve25519-aes-sha2", ciphertext: { opaque: "ciphertext-only" } } } },
    });
    expect(relay.status).toBe(201);
    const firstSync = await alice.get("/api/v1/e2ee/sync/to-device");
    const retrySync = await alice.get("/api/v1/e2ee/sync/to-device");
    expect(firstSync.json.events).toHaveLength(1);
    expect(retrySync.json.events[0].id).toBe(firstSync.json.events[0].id);
    await alice.post("/api/v1/e2ee/sync/to-device/ack", { ids: [firstSync.json.events[0].id] });
    expect((await alice.get("/api/v1/e2ee/sync/to-device")).json.events).toHaveLength(0);

    const forged = await john.post("/api/v1/e2ee/keys/upload", {
      device_keys: {
        user_id: johnDevice.userId,
        device_id: aliceDevice.deviceId,
        algorithms: [], keys: {}, signatures: {},
      },
      one_time_keys: {}, fallback_keys: {},
    });
    expect(forged.status).toBe(403);
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
    await outsider.post("/api/v1/auth/register", newRegistration({ firstName: "Outsider" }));
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
    const login = await c.post("/api/v1/auth/login", { identifier: "emily.davis@acmecorp.com", password: "Chatter!Demo1" });
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
