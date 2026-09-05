import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { FileDto } from "@chatter/contracts";
import { can } from "@chatter/permissions";
import { createStorage, newStorageKey } from "@chatter/storage";
import { enqueue, QUEUES } from "@chatter/notifications";
import type { Prisma } from "@chatter/database";
import { PrismaService } from "../../common/prisma.service";
import type { AuthedUser } from "../../common/session.service";
import { initials } from "../users/users.service";

const fileInclude = {
  owner: true,
  stars: true,
  versions: { orderBy: { createdAt: "desc" as const } },
  comments: { include: { author: true }, orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.FileInclude;

type FileWithRels = Prisma.FileGetPayload<{ include: typeof fileInclude }>;

@Injectable()
export class FilesService {
  private storage = createStorage();

  constructor(private readonly prisma: PrismaService) {}

  private async toDto(auth: AuthedUser, f: FileWithRels, detailed = false): Promise<FileDto> {
    const authorNames = detailed
      ? new Map(
          (
            await this.prisma.client.user.findMany({
              where: { id: { in: f.versions.map((v) => v.authorId).filter((x): x is string => Boolean(x)) } },
            })
          ).map((u) => [u.id, u.name]),
        )
      : new Map<string, string>();
    return {
      id: f.id,
      name: f.name,
      type: f.type,
      sizeBytes: Number(f.sizeBytes),
      encrypted: f.encrypted,
      status: f.status,
      sharedIn: f.sharedIn,
      starred: f.stars.some((s) => s.userId === auth.userId),
      owner: { id: f.owner.id, name: f.owner.name, initials: initials(f.owner.name), avatarColor: f.owner.avatarColor },
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
      versions: detailed
        ? f.versions.map((v) => ({
            version: v.version,
            authorName: v.authorId ? (authorNames.get(v.authorId) ?? null) : null,
            createdAt: v.createdAt.toISOString(),
          }))
        : undefined,
      comments: detailed
        ? f.comments.map((c) => ({
            id: c.id,
            body: c.body,
            authorName: c.author.name,
            authorInitials: initials(c.author.name),
            authorAvatarColor: c.author.avatarColor,
            createdAt: c.createdAt.toISOString(),
          }))
        : undefined,
    };
  }

  async list(auth: AuthedUser, q?: string): Promise<FileDto[]> {
    const rows = await this.prisma.client.file.findMany({
      where: {
        organizationId: auth.organizationId,
        status: { not: "TRASHED" },
        ...(q ? { name: { contains: q } } : {}),
      },
      include: fileInclude,
      orderBy: { updatedAt: "desc" },
    });
    return Promise.all(rows.map((f) => this.toDto(auth, f)));
  }

  async get(auth: AuthedUser, id: string): Promise<FileDto> {
    const f = await this.load(auth, id);
    return this.toDto(auth, f, true);
  }

  async upload(auth: AuthedUser, name: string, mime: string, body: Buffer, encrypted = false): Promise<FileDto> {
    const key = newStorageKey(auth.organizationId, name);
    const { checksum } = await this.storage.put(key, body, mime);
    const ext = encrypted ? "ENC" : (name.split(".").pop() ?? "FILE").toUpperCase();
    const f = await this.prisma.client.file.create({
      data: {
        organizationId: auth.organizationId,
        ownerId: auth.userId,
        name,
        type: ext,
        mime,
        sizeBytes: BigInt(body.byteLength),
        storageKey: key,
        checksum,
        status: encrypted ? "READY" : "PROCESSING",
        encrypted,
        versions: { create: { version: "v1.0", storageKey: key, sizeBytes: BigInt(body.byteLength), authorId: auth.userId } },
      },
      include: fileInclude,
    });
    // Worker flips PROCESSING -> READY (metadata/preview pipeline).
    // BullMQ rejects custom job ids containing ":" (its Redis key separator).
    if (!encrypted) {
      await enqueue(QUEUES.files, { kind: "process-upload", fileId: f.id }, `process-upload-${f.id}`);
    }
    return this.toDto(auth, f, true);
  }

  async download(auth: AuthedUser, id: string): Promise<{ name: string; mime: string; body: Buffer }> {
    const f = await this.load(auth, id);
    const body = await this.storage.get(f.storageKey).catch(() => null);
    if (!body) throw new NotFoundException("File content is not available (seeded metadata without blob)");
    return { name: f.name, mime: f.mime, body };
  }

  async toggleStar(auth: AuthedUser, id: string): Promise<{ starred: boolean }> {
    const f = await this.load(auth, id);
    const existing = await this.prisma.client.fileStar.findUnique({
      where: { fileId_userId: { fileId: f.id, userId: auth.userId } },
    });
    if (existing) {
      await this.prisma.client.fileStar.delete({ where: { fileId_userId: { fileId: f.id, userId: auth.userId } } });
      return { starred: false };
    }
    await this.prisma.client.fileStar.create({ data: { fileId: f.id, userId: auth.userId } });
    return { starred: true };
  }

  async comment(auth: AuthedUser, id: string, body: string): Promise<FileDto> {
    const f = await this.load(auth, id);
    await this.prisma.client.fileComment.create({ data: { fileId: f.id, authorId: auth.userId, body } });
    return this.get(auth, f.id);
  }

  async trash(auth: AuthedUser, id: string): Promise<{ ok: true }> {
    const f = await this.load(auth, id);
    if (f.ownerId !== auth.userId && !can(auth.orgRole, "file.delete_any")) {
      throw new ForbiddenException("Only the owner or an admin can delete this file");
    }
    await this.prisma.client.file.update({ where: { id: f.id }, data: { status: "TRASHED", trashedAt: new Date() } });
    await enqueue(QUEUES.maintenance, { kind: "recalculate-storage", organizationId: auth.organizationId });
    return { ok: true };
  }

  private async load(auth: AuthedUser, id: string): Promise<FileWithRels> {
    const f = await this.prisma.client.file.findFirst({
      where: { id, organizationId: auth.organizationId },
      include: fileInclude,
    });
    if (!f) throw new NotFoundException("File not found");
    return f;
  }
}
