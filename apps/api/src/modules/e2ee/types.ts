import { z } from "zod";

const matrixUserId = z.string().regex(/^@[0-9a-f-]{36}:[a-z0-9.-]+$/i).max(255);
const deviceId = z.string().uuid();
const keyMap = z.record(z.string().max(255), z.string().max(4096));

export const deviceKeysSchema = z.object({
  user_id: matrixUserId,
  device_id: deviceId,
  algorithms: z.array(z.string().max(128)).max(10),
  keys: keyMap,
  signatures: z.record(matrixUserId, keyMap),
  unsigned: z.object({ device_display_name: z.string().max(120).optional() }).passthrough().optional(),
}).passthrough();

export const oneTimeKeySchema = z.object({
  key: z.string().min(16).max(4096),
  signatures: z.record(matrixUserId, keyMap).optional(),
  fallback: z.boolean().optional(),
}).passthrough();

export const uploadKeysSchema = z.object({
  device_keys: deviceKeysSchema.optional(),
  one_time_keys: z.record(z.string().max(255), oneTimeKeySchema).default({}),
  fallback_keys: z.record(z.string().max(255), oneTimeKeySchema).default({}),
}).strict();

export const queryKeysSchema = z.object({
  device_keys: z.record(matrixUserId, z.array(deviceId).max(100)).refine((v) => Object.keys(v).length <= 100),
  timeout: z.number().int().min(0).max(60_000).optional(),
  token: z.string().max(255).optional(),
}).strict();

export const claimKeysSchema = z.object({
  one_time_keys: z.record(matrixUserId, z.record(deviceId, z.string().max(128)))
    .refine((v) => Object.keys(v).length <= 100),
  timeout: z.number().int().min(0).max(60_000).optional(),
}).strict();

export const toDeviceSchema = z.object({
  eventType: z.literal("m.room.encrypted"),
  transactionId: z.string().min(1).max(128),
  messages: z.record(matrixUserId, z.record(deviceId, z.unknown()))
    .refine((v) => Object.keys(v).length <= 100),
}).strict();

export const ackToDeviceSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).strict();

export type DeviceKeys = z.infer<typeof deviceKeysSchema>;
export type UploadKeysBody = z.infer<typeof uploadKeysSchema>;
export type QueryKeysBody = z.infer<typeof queryKeysSchema>;
export type ClaimKeysBody = z.infer<typeof claimKeysSchema>;
export type ToDeviceBody = z.infer<typeof toDeviceSchema>;
