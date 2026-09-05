import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomUUID,
  type KeyObject,
} from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { loadEnv, type Env } from "@chatter/config";
import {
  SignJWT,
  decodeProtectedHeader,
  exportJWK,
  jwtVerify,
  type JWK,
  type JWTPayload,
} from "jose";

export const JWT_ALLOWED_ALGORITHMS = ["RS256"] as const;
export type ChatterTokenType = "access+jwt" | "refresh+jwt";
export type KeyStatus = "ACTIVE" | "RETIRING" | "RETIRED";

interface VerificationKeyInput {
  kid: string;
  algorithm: "RS256";
  status: KeyStatus;
  publicKey: string;
  createdAt?: string;
  activatedAt?: string;
  retiredAt?: string;
}

interface TrustedKey {
  kid: string;
  algorithm: "RS256";
  status: KeyStatus;
  publicKey: KeyObject;
  privateKey?: KeyObject;
  createdAt?: string;
  activatedAt?: string;
  retiredAt?: string;
}

export interface ChatterJwtClaims extends JWTPayload {
  sub: string;
  jti: string;
  typ: ChatterTokenType;
  userId: string;
  sessionId: string;
  deviceId: string;
  iat: number;
  nbf: number;
  exp: number;
}

export interface IssuedToken {
  token: string;
  jti: string;
  issuedAt: Date;
  expiresAt: Date;
}

function readPem(value: string): string {
  const normalized = value.replace(/\\n/g, "\n").trim();
  if (normalized.startsWith("-----BEGIN")) return normalized;
  return Buffer.from(normalized, "base64").toString("utf8");
}

function parseVerificationKeys(raw: string | undefined): VerificationKeyInput[] {
  if (!raw?.trim()) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("JWT_VERIFICATION_KEYS_JSON must be valid JSON");
  }
  if (!Array.isArray(value)) throw new Error("JWT_VERIFICATION_KEYS_JSON must be an array");
  return value.map((item) => {
    const key = item as Partial<VerificationKeyInput>;
    if (
      typeof key.kid !== "string" ||
      !/^[A-Za-z0-9._-]{1,80}$/.test(key.kid) ||
      key.algorithm !== "RS256" ||
      !["ACTIVE", "RETIRING", "RETIRED"].includes(key.status ?? "") ||
      typeof key.publicKey !== "string"
    ) {
      throw new Error("JWT_VERIFICATION_KEYS_JSON contains an invalid key record");
    }
    return key as VerificationKeyInput;
  });
}

/**
 * Trusted key ring. Incoming header values only select from this local set:
 * they can never select an algorithm, URL, embedded JWK, or arbitrary key.
 */
export class JwtKeyRing {
  private readonly keys = new Map<string, TrustedKey>();
  private readonly active: TrustedKey;

  constructor(private readonly env: Env) {
    let privateKey: KeyObject;
    if (env.JWT_ACTIVE_PRIVATE_KEY) {
      privateKey = createPrivateKey(readPem(env.JWT_ACTIVE_PRIVATE_KEY));
    } else {
      if (env.NODE_ENV === "production") {
        throw new Error("JWT_ACTIVE_PRIVATE_KEY is required in production");
      }
      // Ephemeral by design: convenient for local/test boot, but restart logs
      // everyone out. Production is refused above rather than silently using it.
      privateKey = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
    }
    if (privateKey.asymmetricKeyType !== "rsa" || (privateKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) {
      throw new Error("JWT active key must be an RSA private key of at least 2048 bits");
    }

    this.active = {
      kid: env.JWT_ACTIVE_KID,
      algorithm: "RS256",
      status: "ACTIVE",
      privateKey,
      publicKey: createPublicKey(privateKey),
      activatedAt: new Date().toISOString(),
    };
    this.keys.set(this.active.kid, this.active);

    for (const input of parseVerificationKeys(env.JWT_VERIFICATION_KEYS_JSON)) {
      if (input.kid === this.active.kid) continue;
      const publicKey = createPublicKey(readPem(input.publicKey));
      if (publicKey.asymmetricKeyType !== "rsa" || (publicKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) {
        throw new Error(`JWT key ${input.kid} must be RSA with at least 2048 bits`);
      }
      this.keys.set(input.kid, { ...input, publicKey });
    }

    const activeCount = [...this.keys.values()].filter((key) => key.status === "ACTIVE").length;
    if (activeCount !== 1) throw new Error("Exactly one JWT signing key must be ACTIVE");
  }

  signer(): TrustedKey {
    return this.active;
  }

  verifier(kid: string, algorithm: string): TrustedKey {
    if (!JWT_ALLOWED_ALGORITHMS.includes(algorithm as "RS256")) throw new UnauthorizedException("Unauthorized");
    const key = this.keys.get(kid);
    if (!key || key.status === "RETIRED" || key.algorithm !== algorithm) {
      throw new UnauthorizedException("Unauthorized");
    }
    return key;
  }

  async jwks(): Promise<{ keys: JWK[] }> {
    const keys: JWK[] = [];
    for (const key of this.keys.values()) {
      if (key.status === "RETIRED") continue;
      const jwk = await exportJWK(key.publicKey);
      keys.push({ ...jwk, kid: key.kid, alg: key.algorithm, use: "sig" });
    }
    return { keys };
  }
}

@Injectable()
export class JwtTokenService {
  private readonly env = loadEnv();
  private readonly ring = new JwtKeyRing(this.env);

  issueAccess(input: { userId: string; sessionId: string; deviceId: string }): Promise<IssuedToken> {
    return this.issue("access+jwt", this.env.JWT_ACCESS_AUDIENCE, this.env.JWT_ACCESS_TTL_SECONDS, input);
  }

  issueRefresh(input: { userId: string; sessionId: string; deviceId: string }): Promise<IssuedToken> {
    return this.issue("refresh+jwt", this.env.JWT_REFRESH_AUDIENCE, this.env.JWT_REFRESH_TTL_SECONDS, input);
  }

  verifyAccess(token: string): Promise<ChatterJwtClaims> {
    return this.verify(token, "access+jwt", this.env.JWT_ACCESS_AUDIENCE, this.env.JWT_ACCESS_TTL_SECONDS);
  }

  verifyRefresh(token: string): Promise<ChatterJwtClaims> {
    return this.verify(token, "refresh+jwt", this.env.JWT_REFRESH_AUDIENCE, this.env.JWT_REFRESH_TTL_SECONDS);
  }

  jwks(): Promise<{ keys: JWK[] }> {
    return this.ring.jwks();
  }

  private async issue(
    typ: ChatterTokenType,
    audience: string,
    ttlSeconds: number,
    input: { userId: string; sessionId: string; deviceId: string },
  ): Promise<IssuedToken> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + ttlSeconds;
    const jti = randomUUID();
    const key = this.ring.signer();
    const token = await new SignJWT({
      typ,
      userId: input.userId,
      sessionId: input.sessionId,
      deviceId: input.deviceId,
    })
      .setProtectedHeader({ alg: key.algorithm, typ: "JWT", kid: key.kid })
      .setIssuer(this.env.JWT_ISSUER)
      .setSubject(input.userId)
      .setAudience(audience)
      .setIssuedAt(now)
      .setNotBefore(now)
      .setExpirationTime(exp)
      .setJti(jti)
      .sign(key.privateKey!);
    return { token, jti, issuedAt: new Date(now * 1000), expiresAt: new Date(exp * 1000) };
  }

  private async verify(
    token: string,
    expectedType: ChatterTokenType,
    audience: string,
    maxAgeSeconds: number,
  ): Promise<ChatterJwtClaims> {
    try {
      const header = decodeProtectedHeader(token);
      if (header.typ !== "JWT" || typeof header.kid !== "string" || typeof header.alg !== "string") {
        throw new UnauthorizedException("Unauthorized");
      }
      const key = this.ring.verifier(header.kid, header.alg);
      const { payload } = await jwtVerify(token, key.publicKey, {
        algorithms: [...JWT_ALLOWED_ALGORITHMS],
        issuer: this.env.JWT_ISSUER,
        audience,
        typ: "JWT",
        clockTolerance: this.env.JWT_CLOCK_TOLERANCE_SECONDS,
        maxTokenAge: `${maxAgeSeconds}s`,
        requiredClaims: ["iss", "sub", "aud", "exp", "iat", "nbf", "jti", "typ", "userId", "sessionId", "deviceId"],
      });
      const claims = payload as ChatterJwtClaims;
      const now = Math.floor(Date.now() / 1000);
      if (
        claims.typ !== expectedType ||
        claims.aud !== audience ||
        claims.sub !== claims.userId ||
        typeof claims.sessionId !== "string" ||
        typeof claims.deviceId !== "string" ||
        typeof claims.jti !== "string" ||
        typeof claims.iat !== "number" ||
        claims.iat > now + this.env.JWT_CLOCK_TOLERANCE_SECONDS
      ) {
        throw new UnauthorizedException("Unauthorized");
      }
      return claims;
    } catch {
      // Detailed JOSE/key-policy failures stay internal. Clients receive one
      // indistinguishable authentication failure.
      throw new UnauthorizedException("Unauthorized");
    }
  }
}
