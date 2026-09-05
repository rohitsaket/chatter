/**
 * THROWAWAY CRYPTO SPIKE — NOT PRODUCTION MESSAGING CODE.
 *
 * Answers one question: can `@matrix-org/matrix-sdk-crypto-wasm` provide a safe
 * E2EE foundation for Chatter's browser client without hand-rolled crypto?
 *
 * `OlmMachine` is a Matrix state machine, not a general-purpose crypto library.
 * It never talks to a network itself — it emits *requests* it wants performed
 * and consumes the *responses*. Normally a Matrix homeserver answers those. Here
 * a synthetic responder answers them instead, which is what lets the library run
 * against Chatter's own transport rather than a homeserver.
 *
 * Every cryptographic operation is performed by the library. Nothing in this
 * file implements, wraps or substitutes for a cryptographic primitive; it only
 * shuttles opaque strings between two machines.
 */
import type {
  DeviceLists as DeviceListsT,
  OlmMachine as OlmMachineT,
} from "@matrix-org/matrix-sdk-crypto-wasm";

/** Matrix requires namespaced ids; these are spike-local and never persisted. */
export const SPIKE_DOMAIN = "chatter.spike";
export const SPIKE_ROOM = "!chatter-spike:chatter.spike";

export interface Party {
  label: string;
  userId: string;
  deviceId: string;
  machine: OlmMachineT;
}

/** Loaded once per browser context; the WASM module is heavy (~7.8 MB). */
let wasmReady: Promise<typeof import("@matrix-org/matrix-sdk-crypto-wasm")> | null = null;

export function loadCrypto() {
  if (!wasmReady) {
    // Dynamic import keeps the WASM out of the server bundle entirely: this
    // module must never be evaluated during SSR.
    wasmReady = import("@matrix-org/matrix-sdk-crypto-wasm").then(async (m) => {
      await m.initAsync();
      return m;
    });
  }
  return wasmReady;
}

/**
 * Create an independent identity. `storeName` scopes the library's IndexedDB
 * database, which is how two parties in one page stay cryptographically
 * separate — sharing a store would silently merge their identities.
 */
export async function createParty(label: string, storeName: string): Promise<Party> {
  const sdk = await loadCrypto();
  const userId = new sdk.UserId(`@${label}:${SPIKE_DOMAIN}`);
  const deviceId = new sdk.DeviceId(`${label.toUpperCase()}DEVICE`);
  const machine = await sdk.OlmMachine.initialize(userId, deviceId, storeName);
  return { label, userId: userId.toString(), deviceId: deviceId.toString(), machine };
}

/**
 * Drain a machine's outgoing requests, capturing the public key material it
 * wants uploaded and acknowledging each request so its internal state advances.
 *
 * Returns the device keys and one-time keys the synthetic responder will later
 * serve to the *other* party — exactly the role a key server plays. Only public
 * material ever appears here.
 */
export async function publishKeys(party: Party): Promise<{
  deviceKeys: unknown;
  oneTimeKeys: Record<string, unknown>;
  fallbackKeys: Record<string, unknown>;
}> {
  const sdk = await loadCrypto();
  let deviceKeys: unknown = null;
  const oneTimeKeys: Record<string, unknown> = {};
  const fallbackKeys: Record<string, unknown> = {};

  for (const request of await party.machine.outgoingRequests()) {
    const type = request.type as unknown as number;
    const body = JSON.parse((request as unknown as { body: string }).body);

    if (type === sdk.RequestType.KeysUpload) {
      if (body.device_keys) deviceKeys = body.device_keys;
      Object.assign(oneTimeKeys, body.one_time_keys ?? {});
      Object.assign(fallbackKeys, body.fallback_keys ?? {});
      // The machine must believe the upload succeeded, or it will re-offer the
      // same keys forever and never mark them as published.
      await party.machine.markRequestAsSent(
        request.id!,
        sdk.RequestType.KeysUpload,
        JSON.stringify({ one_time_key_counts: { signed_curve25519: Object.keys(oneTimeKeys).length } }),
      );
    } else {
      // Cross-signing / room-key-backup requests are irrelevant to a 1:1 round
      // trip. Acknowledge them so the queue drains rather than stalling.
      await party.machine.markRequestAsSent(request.id!, type as never, "{}");
    }
  }
  return { deviceKeys, oneTimeKeys, fallbackKeys };
}

/**
 * Teach `viewer` about `subject`'s public device keys by answering the
 * /keys/query the machine issues for tracked users.
 */
export async function shareIdentity(viewer: Party, subject: Party, subjectDeviceKeys: unknown): Promise<void> {
  const sdk = await loadCrypto();
  const subjectUser = new sdk.UserId(subject.userId);
  await viewer.machine.updateTrackedUsers([subjectUser]);

  for (const request of await viewer.machine.outgoingRequests()) {
    const type = request.type as unknown as number;
    if (type === sdk.RequestType.KeysQuery) {
      await viewer.machine.markRequestAsSent(
        request.id!,
        sdk.RequestType.KeysQuery,
        JSON.stringify({
          device_keys: { [subject.userId]: { [subject.deviceId]: subjectDeviceKeys } },
          failures: {},
        }),
      );
    } else {
      await viewer.machine.markRequestAsSent(request.id!, type as never, "{}");
    }
  }
}

/**
 * Establish an Olm session by answering the /keys/claim the machine issues.
 * One-time keys are consumed here — the synthetic responder hands out each key
 * once, mirroring the atomic consumption a real prekey server must guarantee.
 */
export async function claimSession(
  initiator: Party,
  target: Party,
  targetOneTimeKeys: Record<string, unknown>,
): Promise<boolean> {
  const sdk = await loadCrypto();
  const targetUser = new sdk.UserId(target.userId);
  const claim = await initiator.machine.getMissingSessions([targetUser]);
  if (!claim) return false;

  // Serve exactly one unused key, then mark it consumed.
  const entries = Object.entries(targetOneTimeKeys);
  const picked = entries.shift();
  if (!picked) throw new Error("one-time key pool exhausted");
  delete targetOneTimeKeys[picked[0]];

  await initiator.machine.markRequestAsSent(
    claim.id!,
    sdk.RequestType.KeysClaim,
    JSON.stringify({
      one_time_keys: { [target.userId]: { [target.deviceId]: { [picked[0]]: picked[1] } } },
      failures: {},
    }),
  );
  return true;
}

/**
 * Distribute the room key. Returns the to-device payloads the transport must
 * carry — these are already encrypted by the library.
 */
export async function distributeRoomKey(sender: Party, recipient: Party): Promise<string[]> {
  const sdk = await loadCrypto();
  const room = new sdk.RoomId(SPIKE_ROOM);
  const requests = await sender.machine.shareRoomKey(
    room,
    [new sdk.UserId(recipient.userId)],
    new sdk.EncryptionSettings(),
  );

  const payloads: string[] = [];
  for (const req of requests) {
    const body = JSON.parse((req as unknown as { body: string }).body);
    const forUser = body.messages?.[recipient.userId] ?? {};
    for (const content of Object.values(forUser)) {
      payloads.push(
        JSON.stringify({
          sender: sender.userId,
          type: "m.room.encrypted",
          content,
        }),
      );
    }
    await sender.machine.markRequestAsSent(req.txn_id!, sdk.RequestType.ToDevice, "{}");
  }
  return payloads;
}

/** Feed to-device payloads into a machine, as a sync response would. */
export async function receiveToDevice(party: Party, payloads: string[]): Promise<void> {
  const sdk = await loadCrypto();
  const lists = new sdk.DeviceLists() as DeviceListsT;
  await party.machine.receiveSyncChanges(
    JSON.stringify(payloads.map((p) => JSON.parse(p))),
    lists,
    new Map<string, number>(),
    new Set<string>(),
  );
}

/** Encrypt. Returns the opaque envelope the transport carries. */
export async function encrypt(sender: Party, plaintext: string): Promise<string> {
  const sdk = await loadCrypto();
  return sender.machine.encryptRoomEvent(
    new sdk.RoomId(SPIKE_ROOM),
    "m.room.message",
    JSON.stringify({ msgtype: "m.text", body: plaintext }),
  );
}

/** Decrypt. Throws if the envelope was tampered with or is not ours. */
export async function decrypt(recipient: Party, sender: Party, ciphertext: string): Promise<string> {
  const sdk = await loadCrypto();
  const settings = new sdk.DecryptionSettings(sdk.TrustRequirement.Untrusted);
  const event = JSON.stringify({
    event_id: `$spike-${Math.floor(performance.now() * 1000)}`,
    origin_server_ts: 1,
    sender: sender.userId,
    type: "m.room.encrypted",
    content: JSON.parse(ciphertext),
  });
  const decrypted = await recipient.machine.decryptRoomEvent(
    event,
    new sdk.RoomId(SPIKE_ROOM),
    settings,
  );
  return JSON.parse(decrypted.event).content.body as string;
}

/** Full pairing: publish, exchange identities, claim a session, share the key. */
export async function pair(a: Party, b: Party): Promise<void> {
  const aKeys = await publishKeys(a);
  const bKeys = await publishKeys(b);
  await shareIdentity(a, b, bKeys.deviceKeys);
  await shareIdentity(b, a, aKeys.deviceKeys);
  await claimSession(a, b, bKeys.oneTimeKeys);
  await claimSession(b, a, aKeys.oneTimeKeys);
  await receiveToDevice(b, await distributeRoomKey(a, b));
  await receiveToDevice(a, await distributeRoomKey(b, a));
}
