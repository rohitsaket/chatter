# Chatter authentication security architecture

## Architecture and token profiles

Chatter uses a browser-oriented, server-validated session architecture:

- `access+jwt`: RS256, 10-minute default lifetime, issuer `https://auth.chatter.local`, audience `chatter-api`.
- `refresh+jwt`: RS256, 14-day default lifetime, issuer `https://auth.chatter.local`, audience `chatter-auth-refresh`.
- Password reset remains a purpose-specific opaque, random, hashed, one-use credential after OTP verification. It cannot authenticate API requests.
- Access and refresh JWTs carry only `iss`, `sub`, `aud`, `exp`, `iat`, `nbf`, `jti`, `typ`, `userId`, `sessionId`, and `deviceId`. There is no Aadhaar, email, OTP, password, role, permission, or encryption key material.

Every JWT header is `{ "alg": "RS256", "typ": "JWT", "kid": "..." }`. Verification first decodes only the protected header for trusted local key selection, requires `RS256` from `JWT_ALLOWED_ALGORITHMS`, resolves `kid` only from the configured key ring, and then verifies the signature over the original encoded `header.payload`. Claims are not used until JOSE verification succeeds. Access and refresh validation profiles have different audiences and payload `typ` values, so substitution fails.

Authorization remains server-side. After signature and claim validation, the central guard loads the referenced session, account, and current membership. It rejects revoked/expired sessions, non-`ACTIVE` accounts, active account locks, and suspended memberships. Controllers receive a trusted principal derived from verified claims and database state. Existing resource ownership and RBAC checks remain separate.

## Browser, cookies, CSRF, and WebSocket

- Access JWT: `HttpOnly`, `SameSite=Lax`, `Secure` in production, path `/`.
- Refresh JWT: `HttpOnly`, `SameSite=Lax`, `Secure` in production, minimized path `/api/v1/auth`.
- CSRF: random readable double-submit cookie plus `x-csrf-token` on unsafe methods. The refresh endpoint is covered.
- No authentication token is stored in `localStorage` or `sessionStorage`, returned in login JSON, or placed in URLs.
- The frontend performs one coalesced refresh on an HTTP 401 and retries once with the newly rotated CSRF value.
- Socket.IO authenticates during the handshake with the access JWT, derives identity only from the verified principal, disconnects at JWT expiry, checks session revocation on heartbeat, and disconnects immediately on explicit logout/logout-all.

Bearer access tokens are accepted for non-browser API clients. Refresh tokens are accepted only from the refresh cookie and never as API bearer credentials.

## Refresh rotation, sessions, and replay

Each login creates an independently revocable session and random device/session/family identifiers. Only SHA-256 hashes of complete refresh JWTs are persisted. Each refresh row records `jti`, family, parent, replacement, issue/expiry, use, and revocation timestamps.

On refresh, Chatter verifies the refresh JWT profile, checks its exact hash and server record, atomically marks it used, creates its replacement, and issues a new access JWT. A second use of the old credential atomically marks reuse, revokes the entire family/session (including a concurrently issued replacement), clears cookies, and returns the same generic 401 as other authentication failures. Logout revokes the current session; logout-all, account suspension, and password reset revoke all applicable sessions and refresh rows. Already-issued access JWTs are also rejected because the guard checks session state on every request.

## Key management and rotation

Production refuses to boot without `JWT_ACTIVE_PRIVATE_KEY`. Supply its PKCS#8 RSA private key from a KMS/HSM/secret manager injection mechanism; never bake it into source, an image, a database row, or a frontend bundle. `JWT_VERIFICATION_KEYS_JSON` contains public keys and metadata only.

Rotation procedure:

1. Generate K2 in approved key infrastructure and stage its public key.
2. Configure K2 as `JWT_ACTIVE_KID`/`JWT_ACTIVE_PRIVATE_KEY` and retain K1 public metadata as `RETIRING`.
3. Deploy the signer, then confirm new JWTs use K2 and both public keys appear in `/.well-known/jwks.json`.
4. Keep K1 `RETIRING` for at least the maximum refresh-token lifetime plus clock tolerance (or revoke all affected sessions for an emergency rotation).
5. Change K1 to `RETIRED`; it is then rejected and omitted from JWKS. Remove its public metadata after the operational retention window.

Exactly one key is active. Each key is tied to RS256. Unknown/retired `kid`, `none`, wrong algorithms, non-RSA key types, embedded key material, and arbitrary key URLs are rejected. JWKS publishes only active/retiring public RSA parameters with `kid`, `kty`, `alg`, and `use=sig`.

Compromise response: disable the compromised signer, activate a replacement, publish the replacement public key, revoke affected sessions when required, mark the compromised key retired, investigate token/audit identifiers, and rotate any dependent infrastructure credentials. Emergency rotation must prefer session revocation over leaving a compromised retiring key valid.

## Audit summary

Preserved controls: Argon2id passwords, constant-shape login failures, per-account lockout, endpoint throttling, atomic registration, hashed one-use password-reset credentials, CSRF, Helmet security headers, membership/RBAC/resource checks, structured audit logs, logger redaction, and E2EE key separation.

Remediated findings: the prior opaque 14-day cookie had no signed access profile, refresh rotation/replay family, issuer/audience/type validation, `kid`, JWKS, or asymmetric rotation. Those controls now exist centrally. Logger redaction now also covers access/refresh token field names and authorization values.

DPoP is not enabled. The current browser threat model does not justify client-key lifecycle complexity; bearer replay is instead limited by HTTPS, HttpOnly storage, a 10-minute access TTL, server session checks, refresh rotation, and replay revocation. E2EE device keys remain wholly separate from JWT signing keys.

## Tests and operational readiness

Automated coverage includes valid access, required/minimized claims, header/payload/signature tampering, `alg=none`, unknown `kid`, access/refresh substitution, public-only JWKS, retiring/retired key behavior, refresh rotation, old-token replay, family revocation, logout, account/membership state, CSRF, multi-session logout behavior, and authenticated/unauthenticated WebSockets. Existing browser suites cover login, API use, WebSocket operation, application flows, mobile contexts, and absence of auth credentials in web storage.

Readiness classification: **READY FOR INTERNAL TEST**. Before pre-production, provision persistent managed RSA keys, enable `COOKIE_SECURE`, run the migration against a staging clone, exercise real multi-instance rotation, run the Playwright suite against the deployed topology, and validate HTTPS/HSTS/CSP at the edge. Production readiness must not be claimed while using ephemeral development keys.
