# Chatter end-to-end encryption architecture

## Security claim

New Chatter chat messages use the maintained Matrix Rust crypto WASM library
(`@matrix-org/matrix-sdk-crypto-wasm`) with Olm for device-to-device key
transport and Megolm for room events. Chatter's API stores and relays public
device keys, prekeys, encrypted to-device events, ciphertext and routing
metadata. It has no API that accepts plaintext for a new chat message and has
no decryption key.

The protocol identifier is `matrix-olm-megolm.v1`. This implementation is not
post-quantum. The official Signal `libsignal` TypeScript package is a native
Node binding and is not a maintained browser WASM distribution; substituting
an unofficial port would violate the requirement to use an audited,
maintained implementation. The envelope is versioned so a future maintained
browser PQXDH/Triple Ratchet implementation can be added without relabeling or
silently changing existing ciphertext.

## Device and key lifecycle

1. Authentication creates a random device ID in the signed access JWT.
2. The browser initializes one Rust `OlmMachine` for the Matrix identity
   `@<user UUID>:chatter.app` and that JWT device ID.
3. Private identity keys, Olm sessions and Megolm sessions remain in an
   encrypted IndexedDB crypto store. Its random passphrase is wrapped by a
   non-extractable WebCrypto AES-GCM key stored in a separate IndexedDB.
4. Only public device keys, signed one-time prekeys and fallback keys are
   uploaded. The server rejects a body whose user/device does not match the
   signed JWT and rejects identity-key replacement on an existing device.
5. One-time prekeys are claimed with a conditional `consumed=false` update.
   Concurrent losers retry; a signed fallback key is returned only when the
   one-time pool is empty and is not consumed.
6. Revocation deletes pending prekeys/to-device events, prevents future key
   queries, revokes all JWT sessions for the device and disconnects its live
   sockets. Other clients receive a device-change event.

There is deliberately no server-side private-key backup or escrow. A password
reset does not recover old encrypted history. A new login is a new device; it
can read messages only after current participants share current/future room
keys. Recovery requires an explicit, separately designed end-to-end encrypted
backup feature.

## Send and receive flows

Before sending, the browser tracks every current conversation member, queries
all active device keys, claims missing Olm sessions, and sends an Olm-encrypted
Megolm room key to each eligible device. It then encrypts a typed
`chatter.message` content object. The REST request contains only:

- protocol version, algorithm, Megolm session ID and ciphertext;
- routing identifiers, attachment object IDs and an idempotency key.

`messages.text` is always `NULL` for these rows. A SHA-256 ciphertext digest is
unique per sender device: the original idempotency key resolves to the original
message, while the same ciphertext submitted with a new key is rejected. This
authenticated server-envelope rule is essential because Megolm decryption by
itself may accept the same session index again under a different outer event
ID. The server's realtime event carries the same ciphertext DTO. Delivery/read
ACKs refer only to message IDs.

On receipt, Olm-encrypted to-device events are processed first. The client ACKs
them only after the Rust state machine accepts and persists them, so a crash
causes safe redelivery. Room events are decrypted locally and validated as a
`m.room.message` containing the `chatter.message` schema. The authenticated
sender in the outer event must match the sender reported by the crypto
library.

Groups use one Megolm session per conversation. The session rotates after 100
messages, seven days, membership change, or a device trust/block decision.
New devices are visibly unverified. Users can compare SHA-256 safety
fingerprints out-of-band, trust a matched device, or block it from future room
keys.

## Attachments and local UX

`Attachment.encrypt` encrypts bytes locally with authenticated encryption. The
server receives `application/octet-stream`, the generic name `Encrypted
attachment`, the encrypted size and a ciphertext checksum. Original name,
MIME type, clear size and the media encryption information (including the
decryption secret and integrity hash) are inside the encrypted room event.
Encrypted uploads bypass thumbnail/content processing. Downloads are fetched
as ciphertext and decrypted and integrity-checked in the browser.

Search, quoted content, export and previews use decrypted in-memory content.
The server uses the generic string `Encrypted message`; it cannot provide
full-text search or rich push previews. Notification/outbox payloads contain
IDs and generic metadata only.

## Historical data and migration

The migration intentionally retains pre-upgrade `messages.text` rows. The API
marks them `legacyPlaintext: true` and never describes them as encrypted. All
new sends and edits require a strict encrypted envelope; unknown fields and a
plaintext-only body are rejected. Legacy plaintext messages cannot be edited.
