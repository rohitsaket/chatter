import { z } from "zod";

export { z };

/** Email address, normalized to lowercase. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address");

/**
 * Password policy: 10+ chars, at least one letter and one digit.
 * (Argon2id hashing happens server-side; this is the shape gate.)
 */
export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .regex(/[a-zA-Z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a digit");

export const uuidSchema = z.string().uuid();

/** Cursor pagination query params shared by all list endpoints. */
export const cursorQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type CursorQuery = z.infer<typeof cursorQuerySchema>;

/** Non-empty trimmed text with a max length (messages, comments, captions). */
export function boundedText(max: number) {
  return z.string().trim().min(1).max(max);
}

export const emojiSchema = z.string().trim().min(1).max(16);

/** Parse-or-throw helper that produces a stable error shape for HTTP 400s. */
export function parseOrBadRequest<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `${i.path.join(".") || "value"}: ${i.message}`)
      .join("; ");
    const err = new Error(details) as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }
  return result.data;
}

export * from "./identity";
