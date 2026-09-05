import type { MessageEncryptionDto } from "@chatter/contracts";
import { api } from "@/lib/api";
import { getStorePassphrase, removeStorePassphrase } from "./secure-store";

export const E2EE_DOMAIN = process.env.NEXT_PUBLIC_E2EE_DOMAIN || "chatter.app";
export const STORE_NAME_PREFIX = "chatter-e2ee-";

type CryptoSdk = typeof import("@matrix-org/matrix-sdk-crypto-wasm");
type OutgoingRequest = {
  id: string;
  type: number;
  body: string;
  event_type?: string;
  txn_id?: string;
};

export interface E2EEParty {
  userId: string;
  deviceId: string;
  machine: import("@matrix-org/matrix-sdk-crypto-wasm").OlmMachine;
  storeName: string;
}

export interface DecryptedContent {
  kind: "chatter.message";
  body: string;
  replyToId?: string;
  attachments?: EncryptedAttachmentMetadata[];
}

export interface EncryptedAttachmentMetadata {
  fileId: string;
  name: string;
  mime: string;
  sizeBytes: number;
  mediaEncryptionInfo: Record<string, unknown>;
}

export interface ToDeviceSync {
  events: Array<{ id: string; type: string; sender: string; content: unknown }>;
  deviceChanges: string[];
  nextSince: string;
  oneTimeKeyCounts: Record<string, number>;
  unusedFallbackKeys: string[];
}

export interface SafetyNumber {
  userId: string;
  deviceId: string;
  displayName: string;
  fingerprint: string;
  verified: boolean;
  blacklisted: boolean;
  firstSeen: number;
}

let sdkInstance: CryptoSdk | null = null;
let sdkLoading: Promise<CryptoSdk> | null = null;
const parties = new Map<string, Promise<E2EEParty>>();
const roomMembership = new Map<string, string>();

export async function loadCryptoWasm(): Promise<CryptoSdk> {
  if (sdkInstance) return sdkInstance;
  sdkLoading ??= import("@matrix-org/matrix-sdk-crypto-wasm").then(async (sdk) => {
    await sdk.initAsync();
    sdkInstance = sdk;
    return sdk;
  });
  return sdkLoading;
}

export function initializeE2EE(userId: string, deviceId: string): Promise<E2EEParty> {
  const scope = `${userId}:${deviceId}`;
  const existing = parties.get(scope);
  if (existing) return existing;
  const pending = (async () => {
    const sdk = await loadCryptoWasm();
    const storeName = `${STORE_NAME_PREFIX}${userId}-${deviceId}`;
    const passphrase = await getStorePassphrase(scope);
    const machine = await sdk.OlmMachine.initialize(
      new sdk.UserId(`@${userId}:${E2EE_DOMAIN}`),
      new sdk.DeviceId(deviceId),
      storeName,
      passphrase,
    );
    const party = { userId, deviceId, machine, storeName };
    await drainOutgoingRequests(party);
    return party;
  })();
  parties.set(scope, pending);
  pending.catch(() => parties.delete(scope));
  return pending;
}

async function sendRequest(party: E2EEParty, request: OutgoingRequest): Promise<void> {
  const sdk = await loadCryptoWasm();
  let response: unknown;
  const body = JSON.parse(request.body) as Record<string, unknown>;
  switch (request.type) {
    case sdk.RequestType.KeysUpload:
      response = await api("/e2ee/keys/upload", { method: "POST", json: body });
      break;
    case sdk.RequestType.KeysQuery:
      response = await api("/e2ee/keys/query", { method: "POST", json: body });
      break;
    case sdk.RequestType.KeysClaim:
      response = await api("/e2ee/keys/claim", { method: "POST", json: body });
      break;
    case sdk.RequestType.ToDevice:
      response = await api("/e2ee/to-device", {
        method: "POST",
        json: {
          eventType: request.event_type,
          transactionId: request.txn_id,
          messages: body.messages,
        },
      });
      break;
    default:
      throw new Error(`Unsupported crypto request type ${request.type}; request was not acknowledged`);
  }
  await party.machine.markRequestAsSent(request.id, request.type, JSON.stringify(response));
}

export async function drainOutgoingRequests(party: E2EEParty): Promise<void> {
  for (let round = 0; round < 20; round += 1) {
    const requests = await party.machine.outgoingRequests() as unknown as OutgoingRequest[];
    if (!requests.length) return;
    for (const request of requests) await sendRequest(party, request);
  }
  throw new Error("Crypto request queue did not drain");
}

async function prepareRoom(party: E2EEParty, conversationId: string, recipientIds: string[]): Promise<void> {
  const sdk = await loadCryptoWasm();
  const room = new sdk.RoomId(`!${conversationId}:${E2EE_DOMAIN}`);
  const allUserIds = [...new Set([party.userId, ...recipientIds])].sort();
  const membershipHash = allUserIds.join(":");
  const membershipKey = `${party.userId}:${party.deviceId}:${conversationId}`;
  const previousMembership = roomMembership.get(membershipKey);
  if (previousMembership && previousMembership !== membershipHash) {
    await party.machine.invalidateGroupSession(room);
  }
  roomMembership.set(membershipKey, membershipHash);

  const users = allUserIds.map((id) => new sdk.UserId(`@${id}:${E2EE_DOMAIN}`));
  await party.machine.updateTrackedUsers(users);
  await drainOutgoingRequests(party);
  const claim = await party.machine.getMissingSessions(users);
  if (claim) await sendRequest(party, claim as unknown as OutgoingRequest);

  const settings = new sdk.EncryptionSettings();
  settings.algorithm = sdk.EncryptionAlgorithm.MegolmV1AesSha2;
  settings.rotationPeriodMessages = BigInt(100);
  settings.rotationPeriod = BigInt(7 * 24 * 60 * 60 * 1_000_000);
  settings.sharingStrategy = sdk.CollectStrategy.errorOnUnverifiedUserProblem();
  const shares = await party.machine.shareRoomKey(room, users, settings);
  for (const share of shares) await sendRequest(party, share as unknown as OutgoingRequest);
}

export async function encryptMessage(
  party: E2EEParty,
  conversationId: string,
  recipientIds: string[],
  content: DecryptedContent,
): Promise<Omit<MessageEncryptionDto, "senderDeviceId">> {
  const sdk = await loadCryptoWasm();
  await prepareRoom(party, conversationId, recipientIds);
  const room = new sdk.RoomId(`!${conversationId}:${E2EE_DOMAIN}`);
  const ciphertext = await party.machine.encryptRoomEvent(room, "m.room.message", JSON.stringify(content));
  const parsed = JSON.parse(ciphertext) as { algorithm?: string; session_id?: string };
  if (parsed.algorithm !== "m.megolm.v1.aes-sha2" || !parsed.session_id) {
    throw new Error("Crypto library returned an unsupported message envelope");
  }
  return {
    protocolVersion: "matrix-olm-megolm.v1",
    algorithm: "m.megolm.v1.aes-sha2",
    ciphertext,
    sessionId: parsed.session_id,
  };
}

export async function decryptMessage(
  party: E2EEParty,
  conversationId: string,
  messageId: string,
  senderId: string,
  createdAt: string,
  encryption: MessageEncryptionDto,
): Promise<DecryptedContent> {
  const sdk = await loadCryptoWasm();
  const event = JSON.stringify({
    type: "m.room.encrypted",
    event_id: `$${messageId}`,
    sender: `@${senderId}:${E2EE_DOMAIN}`,
    origin_server_ts: new Date(createdAt).getTime(),
    content: JSON.parse(encryption.ciphertext) as unknown,
  });
  const decrypted = await party.machine.decryptRoomEvent(
    event,
    new sdk.RoomId(`!${conversationId}:${E2EE_DOMAIN}`),
    new sdk.DecryptionSettings(sdk.TrustRequirement.Untrusted),
  );
  if (decrypted.sender.toString() !== `@${senderId}:${E2EE_DOMAIN}`) throw new Error("Encrypted sender mismatch");
  const clearEvent = JSON.parse(decrypted.event) as { type?: string; content?: unknown };
  const content = clearEvent.content as Partial<DecryptedContent> | undefined;
  if (clearEvent.type !== "m.room.message" || content?.kind !== "chatter.message" || typeof content.body !== "string") {
    throw new Error("Invalid decrypted message schema");
  }
  return content as DecryptedContent;
}

export async function processToDeviceMessages(party: E2EEParty, sync: ToDeviceSync): Promise<void> {
  const sdk = await loadCryptoWasm();
  const matrixEvents = sync.events.map(({ id: _id, ...event }) => event);
  await party.machine.receiveSyncChanges(
    JSON.stringify(matrixEvents),
    new sdk.DeviceLists(sync.deviceChanges.map((id) => new sdk.UserId(id)), []),
    new Map(Object.entries(sync.oneTimeKeyCounts)),
    new Set(sync.unusedFallbackKeys),
  );
  await drainOutgoingRequests(party);
  if (sync.events.length) {
    await api("/e2ee/sync/to-device/ack", { method: "POST", json: { ids: sync.events.map((event) => event.id) } });
  }
}

export async function listSafetyNumbers(party: E2EEParty, userIds: string[]): Promise<SafetyNumber[]> {
  const sdk = await loadCryptoWasm();
  const users = [...new Set(userIds)].map((id) => new sdk.UserId(`@${id}:${E2EE_DOMAIN}`));
  await party.machine.updateTrackedUsers(users);
  await drainOutgoingRequests(party);
  const results: SafetyNumber[] = [];
  for (const userId of [...new Set(userIds)]) {
    const matrixId = new sdk.UserId(`@${userId}:${E2EE_DOMAIN}`);
    const devices = await party.machine.getUserDevices(matrixId);
    for (const device of devices.devices()) {
      const ed25519 = device.ed25519Key?.toBase64();
      const curve25519 = device.curve25519Key?.toBase64();
      if (!ed25519 || !curve25519) continue;
      const input = new TextEncoder().encode(`${userId}\u0000${device.deviceId.toString()}\u0000${ed25519}\u0000${curve25519}`);
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", input));
      const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
      results.push({
        userId,
        deviceId: device.deviceId.toString(),
        displayName: device.displayName ?? "Unnamed device",
        fingerprint: hex.match(/.{1,4}/g)?.join(" ") ?? hex,
        verified: device.isVerified(),
        blacklisted: device.isBlacklisted(),
        firstSeen: Number(device.firstTimeSeen()),
      });
    }
  }
  return results;
}

export async function setDeviceTrust(
  party: E2EEParty,
  userId: string,
  deviceId: string,
  trust: "verified" | "blocked" | "unset",
): Promise<void> {
  const sdk = await loadCryptoWasm();
  const device = await party.machine.getDevice(
    new sdk.UserId(`@${userId}:${E2EE_DOMAIN}`),
    new sdk.DeviceId(deviceId),
  );
  if (!device) throw new Error("Device is no longer available");
  await device.setLocalTrust(
    trust === "verified" ? sdk.LocalTrust.Verified : trust === "blocked" ? sdk.LocalTrust.BlackListed : sdk.LocalTrust.Unset,
  );
  const prefix = `${party.userId}:${party.deviceId}:`;
  for (const [key] of roomMembership) {
    if (!key.startsWith(prefix)) continue;
    const conversationId = key.slice(prefix.length);
    await party.machine.invalidateGroupSession(new sdk.RoomId(`!${conversationId}:${E2EE_DOMAIN}`));
    roomMembership.delete(key);
  }
}

export async function encryptAttachment(file: File): Promise<{ bytes: Uint8Array; mediaEncryptionInfo: Record<string, unknown> }> {
  const sdk = await loadCryptoWasm();
  const encrypted = sdk.Attachment.encrypt(new Uint8Array(await file.arrayBuffer()));
  const info = encrypted.mediaEncryptionInfo;
  if (!info) throw new Error("Attachment encryption metadata is missing");
  return { bytes: encrypted.encryptedData, mediaEncryptionInfo: JSON.parse(info) as Record<string, unknown> };
}

export async function decryptAttachment(bytes: Uint8Array, mediaEncryptionInfo: Record<string, unknown>): Promise<Uint8Array> {
  const sdk = await loadCryptoWasm();
  return sdk.Attachment.decrypt(new sdk.EncryptedAttachment(bytes, JSON.stringify(mediaEncryptionInfo)));
}

/** Called as logout completes; destroys this tab's private crypto stores. */
export async function destroyLocalE2EE(): Promise<void> {
  const entries = [...parties.entries()];
  parties.clear();
  roomMembership.clear();
  for (const [scope, pending] of entries) {
    const party = await pending.catch(() => null);
    if (party) {
      party.machine.close();
      await new Promise<void>((resolve) => {
        const deletion = indexedDB.deleteDatabase(party.storeName);
        deletion.onsuccess = () => resolve();
        deletion.onerror = () => resolve();
        deletion.onblocked = () => resolve();
      });
    }
    await removeStorePassphrase(scope).catch(() => undefined);
  }
}
