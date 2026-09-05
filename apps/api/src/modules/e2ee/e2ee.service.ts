import { createHash, randomUUID } from "node:crypto";
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { SessionService, type AuthedUser } from "../../common/session.service";
import { RealtimeGateway } from "../../realtime/realtime.gateway";
import type { ClaimKeysBody, DeviceKeys, QueryKeysBody, ToDeviceBody, UploadKeysBody } from "./types";

const PROTOCOL = "matrix-olm-megolm.v1";
const DOMAIN = process.env.E2EE_DOMAIN || "chatter.app";

const matrixUser = (userId: string) => `@${userId}:${DOMAIN}`;

function localUser(matrixId: string): string {
  const match = /^@([0-9a-f-]{36}):(.+)$/i.exec(matrixId);
  if (!match || match[2] !== DOMAIN) throw new ForbiddenException("Foreign E2EE domain is not allowed");
  return match[1]!;
}

function identityFingerprint(keys: DeviceKeys): string {
  const ed = keys.keys[`ed25519:${keys.device_id}`] ?? "";
  const curve = keys.keys[`curve25519:${keys.device_id}`] ?? "";
  if (!ed || !curve) throw new ForbiddenException("Device identity keys are incomplete");
  return createHash("sha256").update(`${ed}\u0000${curve}`).digest("hex");
}

@Injectable()
export class E2EEService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly rt: RealtimeGateway,
  ) {}

  currentDevice(auth: AuthedUser) {
    return { deviceId: auth.deviceId, userId: matrixUser(auth.userId), protocolVersion: PROTOCOL };
  }

  async listDevices(auth: AuthedUser) {
    const devices = await this.prisma.client.device.findMany({ where: { userId: auth.userId }, orderBy: { lastActive: "desc" } });
    return devices.map((d) => ({
      id: d.id,
      name: d.name,
      platform: d.platform,
      current: d.id === auth.deviceId,
      registered: Boolean(d.deviceKeys),
      keyFingerprint: d.keyFingerprint,
      protocolVersion: d.protocolVersion,
      lastActive: d.lastActive.toISOString(),
      createdAt: d.createdAt.toISOString(),
      revokedAt: d.revokedAt?.toISOString() ?? null,
    }));
  }

  async revokeDevice(auth: AuthedUser, deviceId: string): Promise<{ ok: true; currentDeviceRevoked: boolean }> {
    const device = await this.prisma.client.device.findFirst({ where: { id: deviceId, userId: auth.userId } });
    if (!device) throw new NotFoundException("Device not found");
    const now = new Date();
    await this.prisma.client.$transaction([
      this.prisma.client.device.update({ where: { id: deviceId }, data: { revokedAt: now, current: false } }),
      this.prisma.client.oneTimeKey.deleteMany({ where: { deviceId } }),
      this.prisma.client.toDeviceMessage.deleteMany({ where: { recipientDeviceId: deviceId } }),
    ]);
    const revokedSessions = await this.sessions.revokeDevice(auth.userId, deviceId);
    for (const sessionId of revokedSessions) await this.rt.disconnectRevokedSession(auth.userId, sessionId);
    this.rt.emitToUser(auth.userId, "e2ee.device_changed", { deviceId, revokedAt: now.toISOString() });
    return { ok: true, currentDeviceRevoked: deviceId === auth.deviceId };
  }

  /** Remove devices from future key distribution during logout/reset flows. */
  async retireDevices(userId: string, deviceIds?: string[]): Promise<void> {
    const where = { userId, revokedAt: null, ...(deviceIds ? { id: { in: deviceIds } } : {}) };
    const devices = await this.prisma.client.device.findMany({ where, select: { id: true } });
    if (!devices.length) return;
    const ids = devices.map((device) => device.id);
    await this.prisma.client.$transaction([
      this.prisma.client.device.updateMany({ where: { id: { in: ids } }, data: { revokedAt: new Date(), current: false } }),
      this.prisma.client.oneTimeKey.deleteMany({ where: { deviceId: { in: ids } } }),
      this.prisma.client.toDeviceMessage.deleteMany({ where: { OR: [{ recipientDeviceId: { in: ids } }, { senderDeviceId: { in: ids } }] } }),
    ]);
    this.rt.emitToUser(userId, "e2ee.device_changed", { deviceIds: ids, retired: true });
  }

  async uploadKeys(auth: AuthedUser, body: UploadKeysBody): Promise<{ one_time_key_counts: Record<string, number> }> {
    const existing = await this.prisma.client.device.findUnique({ where: { id: auth.deviceId } });
    if (existing && existing.userId !== auth.userId) throw new ForbiddenException("Device belongs to another account");
    if (existing?.revokedAt) throw new ForbiddenException("Device has been revoked");

    let fingerprint = existing?.keyFingerprint ?? null;
    if (body.device_keys) {
      if (body.device_keys.device_id !== auth.deviceId || body.device_keys.user_id !== matrixUser(auth.userId)) {
        throw new ForbiddenException("Device key identity does not match the authenticated JWT device");
      }
      fingerprint = identityFingerprint(body.device_keys);
      if (existing?.keyFingerprint && existing.keyFingerprint !== fingerprint) {
        throw new ConflictException("Identity key replacement is forbidden; register a new device instead");
      }
    }

    await this.prisma.client.device.upsert({
      where: { id: auth.deviceId },
      create: {
        id: auth.deviceId,
        userId: auth.userId,
        name: body.device_keys?.unsigned?.device_display_name ?? "Browser device",
        platform: "web",
        current: true,
        deviceKeys: body.device_keys ? JSON.stringify(body.device_keys) : null,
        protocolVersion: PROTOCOL,
        keyFingerprint: fingerprint,
        lastKeyChangeAt: body.device_keys ? new Date() : null,
      },
      update: {
        lastActive: new Date(),
        current: true,
        protocolVersion: PROTOCOL,
        ...(body.device_keys ? {
          deviceKeys: JSON.stringify(body.device_keys),
          keyFingerprint: fingerprint,
          lastKeyChangeAt: existing?.deviceKeys ? existing.lastKeyChangeAt : new Date(),
        } : {}),
      },
    });

    for (const [keyId, key] of Object.entries(body.one_time_keys)) {
      await this.prisma.client.oneTimeKey.upsert({
        where: { deviceId_keyId: { deviceId: auth.deviceId, keyId } },
        create: { id: randomUUID(), deviceId: auth.deviceId, keyId, keyData: JSON.stringify(key), fallback: false },
        update: {},
      });
    }
    for (const [keyId, key] of Object.entries(body.fallback_keys)) {
      await this.prisma.client.oneTimeKey.upsert({
        where: { deviceId_keyId: { deviceId: auth.deviceId, keyId } },
        create: { id: randomUUID(), deviceId: auth.deviceId, keyId, keyData: JSON.stringify(key), fallback: true },
        update: { keyData: JSON.stringify(key), consumed: false, consumedAt: null, fallback: true },
      });
    }
    const remaining = await this.prisma.client.oneTimeKey.count({ where: { deviceId: auth.deviceId, consumed: false, fallback: false } });
    return { one_time_key_counts: { signed_curve25519: remaining } };
  }

  async queryKeys(auth: AuthedUser, body: QueryKeysBody) {
    const requested = Object.entries(body.device_keys).map(([id, devices]) => ({ matrixId: id, userId: localUser(id), devices }));
    await this.assertCanExchange(auth, requested.map((r) => r.userId));
    const activeDeviceIds = await this.activeDeviceIds(requested.map((r) => r.userId));
    const rows = await this.prisma.client.device.findMany({
      where: { id: { in: activeDeviceIds }, userId: { in: requested.map((r) => r.userId) }, revokedAt: null, deviceKeys: { not: null } },
    });
    const result: Record<string, Record<string, DeviceKeys>> = {};
    for (const request of requested) {
      result[request.matrixId] = {};
      for (const device of rows.filter((d) => d.userId === request.userId && (!request.devices.length || request.devices.includes(d.id)))) {
        result[request.matrixId]![device.id] = JSON.parse(device.deviceKeys!) as DeviceKeys;
      }
    }
    return { device_keys: result, failures: {} };
  }

  async claimKeys(auth: AuthedUser, body: ClaimKeysBody) {
    const requested = Object.entries(body.one_time_keys).flatMap(([id, devices]) =>
      Object.entries(devices).map(([deviceId, algorithm]) => ({ matrixId: id, userId: localUser(id), deviceId, algorithm })),
    );
    await this.assertCanExchange(auth, requested.map((r) => r.userId));
    const activeDeviceIds = new Set(await this.activeDeviceIds(requested.map((r) => r.userId)));
    const response: Record<string, Record<string, Record<string, unknown>>> = {};
    for (const request of requested) {
      if (request.algorithm !== "signed_curve25519") continue;
      const target = await this.prisma.client.device.findFirst({ where: { id: request.deviceId, userId: request.userId, revokedAt: null } });
      if (!target || !activeDeviceIds.has(target.id)) continue;
      const claimed = await this.claimAtomic(request.deviceId);
      if (!claimed) continue;
      response[request.matrixId] ??= {};
      response[request.matrixId]![request.deviceId] = { [claimed.keyId]: JSON.parse(claimed.keyData) as unknown };
    }
    return { one_time_keys: response, failures: {} };
  }

  async sendToDevice(auth: AuthedUser, body: ToDeviceBody): Promise<{ ok: true }> {
    const flattened = Object.entries(body.messages).flatMap(([id, devices]) =>
      Object.entries(devices).map(([deviceId, content]) => ({ userId: localUser(id), deviceId, content })),
    );
    if (flattened.length > 500) throw new ForbiddenException("Too many to-device recipients");
    await this.assertCanExchange(auth, flattened.map((m) => m.userId));
    const activeDeviceIds = await this.activeDeviceIds(flattened.map((m) => m.userId));
    const targetDevices = await this.prisma.client.device.findMany({
      where: { id: { in: flattened.map((m) => m.deviceId).filter((id) => activeDeviceIds.includes(id)) }, revokedAt: null }, select: { id: true, userId: true },
    });
    const valid = new Set(targetDevices.map((d) => `${d.userId}:${d.id}`));
    for (const message of flattened) {
      if (!valid.has(`${message.userId}:${message.deviceId}`)) throw new NotFoundException("Recipient device not found");
      if (Buffer.byteLength(JSON.stringify(message.content), "utf8") > 64 * 1024) throw new ForbiddenException("To-device payload is too large");
    }
    await this.prisma.client.toDeviceMessage.createMany({
      data: flattened.map((m) => ({
        id: randomUUID(), recipientUserId: m.userId, recipientDeviceId: m.deviceId,
        senderUserId: auth.userId, senderDeviceId: auth.deviceId,
        eventType: body.eventType, transactionId: body.transactionId, payload: JSON.stringify(m.content),
      })),
      skipDuplicates: true,
    });
    return { ok: true };
  }

  async syncToDevice(auth: AuthedUser, since?: string) {
    const sinceDate = since ? new Date(since) : null;
    if (sinceDate && Number.isNaN(sinceDate.getTime())) throw new ForbiddenException("Invalid E2EE sync cursor");
    const nextSince = new Date();
    const messages = await this.prisma.client.toDeviceMessage.findMany({
      where: { recipientUserId: auth.userId, recipientDeviceId: auth.deviceId, delivered: false },
      orderBy: { createdAt: "asc" }, take: 500,
    });
    const shared = await this.prisma.client.conversationParticipant.findMany({
      where: {
        conversation: { organizationId: auth.organizationId, participants: { some: { userId: auth.userId } } },
      },
      select: { userId: true },
      distinct: ["userId"],
    });
    const sharedUserIds = [...new Set([auth.userId, ...shared.map((participant) => participant.userId)])];
    const changed = await this.prisma.client.device.findMany({
      where: {
        userId: { in: sharedUserIds },
        ...(sinceDate ? { OR: [
          { lastKeyChangeAt: { gte: sinceDate, lte: nextSince } },
          { revokedAt: { gte: sinceDate, lte: nextSince } },
        ] } : {}),
      },
      select: { userId: true },
      distinct: ["userId"],
    });
    const [oneTimeKeyCount, fallback] = await Promise.all([
      this.prisma.client.oneTimeKey.count({ where: { deviceId: auth.deviceId, consumed: false, fallback: false } }),
      this.prisma.client.oneTimeKey.findFirst({ where: { deviceId: auth.deviceId, fallback: true }, select: { id: true } }),
    ]);
    return {
      events: messages.map((m) => ({ id: m.id, type: m.eventType, sender: matrixUser(m.senderUserId), content: JSON.parse(m.payload) as unknown })),
      deviceChanges: changed.map((device) => matrixUser(device.userId)),
      nextSince: nextSince.toISOString(),
      oneTimeKeyCounts: { signed_curve25519: oneTimeKeyCount },
      unusedFallbackKeys: fallback ? ["signed_curve25519"] : [],
    };
  }

  async ackToDevice(auth: AuthedUser, ids: string[]): Promise<{ ok: true }> {
    await this.prisma.client.toDeviceMessage.updateMany({
      where: { id: { in: ids }, recipientUserId: auth.userId, recipientDeviceId: auth.deviceId, delivered: false },
      data: { delivered: true, deliveredAt: new Date() },
    });
    return { ok: true };
  }

  private async claimAtomic(deviceId: string) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const key = await this.prisma.client.oneTimeKey.findFirst({
        where: { deviceId, consumed: false, fallback: false }, orderBy: { createdAt: "asc" },
      });
      if (!key) return this.prisma.client.oneTimeKey.findFirst({ where: { deviceId, fallback: true } });
      const claimed = await this.prisma.client.oneTimeKey.updateMany({ where: { id: key.id, consumed: false }, data: { consumed: true, consumedAt: new Date() } });
      if (claimed.count === 1) return key;
    }
    return null;
  }

  private async assertCanExchange(auth: AuthedUser, rawUserIds: string[]): Promise<void> {
    const userIds = [...new Set(rawUserIds)];
    if (!userIds.length) return;
    const accessible = await this.prisma.client.user.findMany({
      where: {
        id: { in: userIds },
        memberships: { some: { organizationId: auth.organizationId, suspended: false } },
        OR: [
          { id: auth.userId },
          { participants: { some: { conversation: { organizationId: auth.organizationId, participants: { some: { userId: auth.userId } } } } } },
        ],
      }, select: { id: true },
    });
    const blocked = await this.prisma.client.contact.findMany({
      where: { blocked: true, OR: [
        { ownerId: auth.userId, targetId: { in: userIds } },
        { targetId: auth.userId, ownerId: { in: userIds } },
      ] }, select: { ownerId: true, targetId: true },
    });
    const denied = new Set(blocked.map((b) => b.ownerId === auth.userId ? b.targetId : b.ownerId));
    if (accessible.length !== userIds.length || userIds.some((id) => denied.has(id))) {
      throw new ForbiddenException("E2EE key exchange is not authorized for one or more users");
    }
  }

  private async activeDeviceIds(userIds: string[]): Promise<string[]> {
    const sessions = await this.prisma.client.session.findMany({
      where: { userId: { in: [...new Set(userIds)] }, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { deviceId: true },
      distinct: ["deviceId"],
    });
    return sessions.map((session) => session.deviceId);
  }
}
