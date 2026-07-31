import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { loadEnv, type Env } from "@chatter/config";

export interface StorageDriver {
  /** Store a buffer under key; returns sha256 checksum. */
  put(key: string, body: Buffer, mime: string): Promise<{ checksum: string }>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  /** Short-lived download URL. Disk driver returns an API-served path instead. */
  downloadUrl(key: string, expiresSeconds?: number): Promise<string>;
}

/** Filesystem driver for development and tests (no MinIO required). */
export class DiskStorageDriver implements StorageDriver {
  constructor(private readonly root: string) {}

  private path(key: string): string {
    const p = resolve(join(this.root, key));
    if (!p.startsWith(resolve(this.root))) throw new Error("Invalid storage key");
    return p;
  }

  async put(key: string, body: Buffer, _mime: string): Promise<{ checksum: string }> {
    const p = this.path(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, body);
    return { checksum: createHash("sha256").update(body).digest("hex") };
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.path(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.path(key), { force: true });
  }

  async downloadUrl(key: string): Promise<string> {
    // Served by the API's authenticated download endpoint.
    return `/api/v1/files/raw/${encodeURIComponent(key)}`;
  }
}

/** S3-compatible driver (MinIO locally, AWS S3 in production). */
export class S3StorageDriver implements StorageDriver {
  private client: S3Client;
  constructor(private readonly env: Env) {
    this.client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY ?? "",
        secretAccessKey: env.S3_SECRET_KEY ?? "",
      },
    });
  }

  async put(key: string, body: Buffer, mime: string): Promise<{ checksum: string }> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.env.S3_BUCKET, Key: key, Body: body, ContentType: mime }),
    );
    return { checksum: createHash("sha256").update(body).digest("hex") };
  }

  async get(key: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.env.S3_BUCKET, Key: key }));
    return Buffer.from(await res.Body!.transformToByteArray());
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.env.S3_BUCKET, Key: key }));
  }

  async downloadUrl(key: string, expiresSeconds = 300): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.env.S3_BUCKET, Key: key }), {
      expiresIn: expiresSeconds,
    });
  }
}

export function createStorage(env: Env = loadEnv()): StorageDriver {
  return env.STORAGE_DRIVER === "s3" ? new S3StorageDriver(env) : new DiskStorageDriver(env.STORAGE_DISK_ROOT);
}

export function newStorageKey(orgId: string, filename: string): string {
  return `${orgId}/${randomUUID()}/${filename.replace(/[^\w.-]/g, "_")}`;
}
