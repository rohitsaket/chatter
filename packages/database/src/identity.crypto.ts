import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { loadEnv } from "@chatter/config";

/**
 * Protection for government identity numbers (Aadhaar).
 *
 * Lives in the database package because these functions exist solely to write
 * and read the three `user_identities` columns — which means the seed can
 * produce identity rows the API will accept, instead of leaving seeded accounts
 * with no identity at all (previously this broke password reset for every one
 * of them).
 *
 * Two independent keys are derived from the application secret with HKDF-SHA256
 * using distinct `info` labels, so the encryption key and the fingerprint key
 * are cryptographically separated from each other and from session signing:
 *
 *   encrypt     AES-256-GCM  -> confidentiality + integrity at rest
 *   fingerprint HMAC-SHA256  -> duplicate detection WITHOUT storing plaintext
 *
 * Only standard primitives are used; nothing here is a bespoke algorithm.
 *
 * NOTE: rotating SESSION_SECRET invalidates existing ciphertexts and
 * fingerprints. Re-keying would require decrypt-then-re-encrypt with both keys
 * available, which is out of scope here.
 */

const ENC_INFO = "chatter:identity:aadhaar:enc:v1";
const MAC_INFO = "chatter:identity:aadhaar:mac:v1";
const SALT = "chatter:identity:v1";

let encKey: Buffer | undefined;
let macKey: Buffer | undefined;

function derive(info: string): Buffer {
  const secret = loadEnv().SESSION_SECRET;
  return Buffer.from(hkdfSync("sha256", Buffer.from(secret, "utf8"), Buffer.from(SALT, "utf8"), Buffer.from(info, "utf8"), 32));
}

function keys(): { enc: Buffer; mac: Buffer } {
  if (!encKey) encKey = derive(ENC_INFO);
  if (!macKey) macKey = derive(MAC_INFO);
  return { enc: encKey, mac: macKey };
}

/** AES-256-GCM. Returns `iv.tag.ciphertext`, each part base64url. */
export function encryptIdentity(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keys().enc, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${ct.toString("base64url")}`;
}

/** Reverses `encryptIdentity`. Throws if the ciphertext was tampered with. */
export function decryptIdentity(stored: string): string {
  const [ivB64, tagB64, ctB64] = stored.split(".");
  if (!ivB64 || !tagB64 || !ctB64) throw new Error("Malformed identity ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", keys().enc, Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64url")), decipher.final()]).toString("utf8");
}

/**
 * Deterministic fingerprint used for the unique index. Lets the database reject
 * a duplicate Aadhaar without any plaintext ever being stored or compared.
 */
export function fingerprintIdentity(normalized: string): string {
  return createHmac("sha256", keys().mac).update(normalized).digest("hex");
}

/** Constant-time compare for fingerprints. */
export function fingerprintEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
