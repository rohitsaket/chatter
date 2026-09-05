import { describe, expect, it } from "vitest";
import { decodeProtectedHeader, decodeJwt } from "jose";
import { generateKeyPairSync } from "node:crypto";
import { loadEnv } from "@chatter/config";
import { JwtKeyRing, JwtTokenService } from "../src/common/jwt-token.service";

const identity = {
  userId: "10000000-0000-4000-8000-000000000001",
  sessionId: "20000000-0000-4000-8000-000000000002",
  deviceId: "30000000-0000-4000-8000-000000000003",
};

function replacePart(token: string, index: 0 | 1 | 2): string {
  const parts = token.split(".");
  const part = parts[index]!;
  parts[index] = `${part.startsWith("A") ? "B" : "A"}${part.slice(1)}`;
  return parts.join(".");
}

describe("strict JWT profiles", () => {
  const jwt = new JwtTokenService();

  it("issues a minimal RS256 access JWT with kid and required claims", async () => {
    const issued = await jwt.issueAccess(identity);
    expect(decodeProtectedHeader(issued.token)).toMatchObject({ alg: "RS256", typ: "JWT" });
    expect(decodeProtectedHeader(issued.token).kid).toBeTruthy();
    const payload = decodeJwt(issued.token);
    expect(payload).toMatchObject({
      sub: identity.userId,
      userId: identity.userId,
      sessionId: identity.sessionId,
      deviceId: identity.deviceId,
      typ: "access+jwt",
      aud: "chatter-api",
    });
    expect(payload).not.toHaveProperty("email");
    expect(payload).not.toHaveProperty("aadhaar");
    await expect(jwt.verifyAccess(issued.token)).resolves.toMatchObject({ jti: issued.jti });
  });

  it("rejects header, payload and signature tampering", async () => {
    const issued = await jwt.issueAccess(identity);
    await expect(jwt.verifyAccess(replacePart(issued.token, 0))).rejects.toThrow("Unauthorized");
    await expect(jwt.verifyAccess(replacePart(issued.token, 1))).rejects.toThrow("Unauthorized");
    await expect(jwt.verifyAccess(replacePart(issued.token, 2))).rejects.toThrow("Unauthorized");
  });

  it("rejects none and unknown kid before claims can be trusted", async () => {
    const payload = Buffer.from(JSON.stringify({ ...identity, typ: "access+jwt" })).toString("base64url");
    const none = `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT", kid: "dev-ephemeral" })).toString("base64url")}.${payload}.`;
    const unknown = `${Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "attacker" })).toString("base64url")}.${payload}.bogus`;
    await expect(jwt.verifyAccess(none)).rejects.toThrow("Unauthorized");
    await expect(jwt.verifyAccess(unknown)).rejects.toThrow("Unauthorized");
  });

  it("uses mutually exclusive access and refresh validation profiles", async () => {
    const access = await jwt.issueAccess(identity);
    const refresh = await jwt.issueRefresh(identity);
    await expect(jwt.verifyAccess(refresh.token)).rejects.toThrow("Unauthorized");
    await expect(jwt.verifyRefresh(access.token)).rejects.toThrow("Unauthorized");
  });

  it("publishes only public RSA signing material", async () => {
    const jwks = await jwt.jwks();
    expect(jwks.keys).toHaveLength(1);
    expect(jwks.keys[0]).toMatchObject({ kty: "RSA", alg: "RS256", use: "sig" });
    for (const privateMember of ["d", "p", "q", "dp", "dq", "qi", "oth", "k"]) {
      expect(jwks.keys[0]).not.toHaveProperty(privateMember);
    }
  });

  it("keeps RETIRING public keys available and rejects them once RETIRED", async () => {
    const pem = () => generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });
    const old = pem();
    const active = pem();
    const base = {
      ...loadEnv(),
      NODE_ENV: "test" as const,
      JWT_ACTIVE_KID: "K2",
      JWT_ACTIVE_PRIVATE_KEY: active.privateKey,
    };
    const retiring = new JwtKeyRing({
      ...base,
      JWT_VERIFICATION_KEYS_JSON: JSON.stringify([
        { kid: "K1", algorithm: "RS256", status: "RETIRING", publicKey: old.publicKey },
      ]),
    });
    expect(retiring.verifier("K1", "RS256").status).toBe("RETIRING");
    expect((await retiring.jwks()).keys.map((key) => key.kid).sort()).toEqual(["K1", "K2"]);

    const retired = new JwtKeyRing({
      ...base,
      JWT_VERIFICATION_KEYS_JSON: JSON.stringify([
        { kid: "K1", algorithm: "RS256", status: "RETIRED", publicKey: old.publicKey },
      ]),
    });
    expect(() => retired.verifier("K1", "RS256")).toThrow("Unauthorized");
    expect((await retired.jwks()).keys.map((key) => key.kid)).toEqual(["K2"]);
  });
});
