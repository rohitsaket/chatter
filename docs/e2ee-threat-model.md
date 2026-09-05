# Chatter E2EE threat model

## Protected against

- Database, object-storage, queue, log and backup disclosure: message and
  attachment content is ciphertext; server previews are generic.
- Honest-but-curious or compromised application servers reading content: the
  server has no private keys or plaintext endpoint for new messages.
- Network attackers: TLS protects metadata in transit and E2EE protects
  content independently; Matrix events are authenticated by device keys.
- Prekey races and duplicate delivery: atomic claims, transaction idempotency,
  explicit relay ACKs and ciphertext replay uniqueness prevent accidental key
  reuse or duplicate persistence.
- A revoked device receiving future content: its keys disappear from query and
  claim responses, queued key events are deleted, sessions are revoked, and
  senders rotate group sessions when membership/trust state changes.
- Silent identity-key replacement for an existing device: the key service
  rejects it. A legitimate replacement must use a new device ID and appears
  unverified.

## Not protected against

- A compromised endpoint, malicious browser extension, active same-origin XSS,
  screen capture, clipboard capture or keylogger. Non-extractable WebCrypto
  keys prevent export but cannot stop malicious same-origin code invoking
  decryption. Strong CSP, dependency review and prompt patching remain
  mandatory.
- A malicious participant copying, forwarding or photographing plaintext
  after decryption.
- Traffic analysis. The service observes user/device identifiers,
  conversation IDs, participant relationships, timestamps, ciphertext sizes,
  file sizes, delivery/read timing and IP/session metadata. Padding, sealed
  sender and metadata-private routing are not implemented.
- A server that withholds keys/events, reorders delivery, removes devices or
  causes denial of service. Authentication and visible fingerprints make key
  substitution detectable, not availability attacks preventable.
- Cryptographically relevant quantum computers. Olm/Megolm use classical
  Curve25519/Ed25519 and AES/SHA-256. Chatter must not advertise PQ resistance.

## Operational hardening checklist

- Enforce a restrictive CSP without `unsafe-eval`, Trusted Types where
  supported, dependency lockfile review and SRI for any external static asset.
- Keep the Matrix Rust crypto WASM version pinned and monitor its security
  advisories; do not replace it with hand-written primitives.
- Redact `encryptedPayload`, public-key bodies, cookies, JWTs and reset secrets
  from structured logs. Message outbox events must remain ID-only.
- Back up ciphertext and public routing/key records, never browser private-key
  stores. Document that account recovery does not imply history recovery.
- Alert on identity replacement conflicts, unusual prekey exhaustion,
  excessive key queries/claims, repeated relay retries and device revocations.
- Rate-limit key upload/query/claim and to-device routes separately in
  production, cap body sizes at the reverse proxy, retain generic errors for
  unauthorized key discovery, and expire ACKed relay rows.
- Test restore procedures with legacy plaintext clearly segregated and apply a
  retention/deletion policy to that historical data.
