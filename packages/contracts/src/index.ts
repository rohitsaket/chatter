/**
 * API contracts shared between apps/web and apps/api.
 * Request bodies are zod schemas (validated server-side); responses are types.
 */
import { z } from "zod";
import {
  emailSchema,
  passwordSchema,
  boundedText,
  emojiSchema,
  personNameSchema,
  normalizeMobile,
  isValidPostalCode,
  aadhaarError,
  countryByCode,
  statesFor,
  COUNTRY_CODES,
} from "@chatter/validation";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Registration payload. Cross-field rules (mobile/PIN/state depend on country)
 * are applied with superRefine so a single schema is the authority for both the
 * browser form and the API.
 *
 * Aadhaar failures name the rule that was broken (wrong length, bad checksum,
 * …) but never echo the submitted value — the field is masked, so a bare
 * "invalid" leaves the user with no way to find their own typo.
 */
export const registerBody = z
  .object({
    firstName: personNameSchema,
    lastName: personNameSchema,
    email: emailSchema,
    password: passwordSchema,
    mobileNumber: z.string().trim().min(1, "Mobile number is required"),
    country: z.enum(COUNTRY_CODES as [string, ...string[]], { message: "Select a country" }),
    state: z.string().trim().min(1, "State is required").max(60),
    pinCode: z.string().trim().min(1, "PIN code is required").max(12),
    aadhaarNumber: z.string().trim().min(1, "Aadhaar number is required").max(20, "Aadhaar number is too long"),
    confirmAccurate: z.literal(true, { message: "You must confirm the information is accurate" }),
  })
  .superRefine((v, ctx) => {
    if (!normalizeMobile(v.mobileNumber, v.country)) {
      ctx.addIssue({ code: "custom", path: ["mobileNumber"], message: "Enter a valid mobile number for the selected country" });
    }
    if (!isValidPostalCode(v.pinCode, v.country)) {
      const c = countryByCode(v.country);
      ctx.addIssue({ code: "custom", path: ["pinCode"], message: `Enter a valid ${c?.postalLabel ?? "postal code"}` });
    }
    const allowed = statesFor(v.country);
    if (allowed.length > 0 && !allowed.includes(v.state)) {
      ctx.addIssue({ code: "custom", path: ["state"], message: "Select a valid state" });
    }
    // Checked for every country, not just India. The field is mandatory
    // regardless of country (it is the third factor in password reset), and the
    // fingerprint is uniquely indexed — so leaving non-IN input unvalidated let
    // arbitrary junk occupy that index and made the second such registration
    // fail with a misleading "identity already registered".
    const aadhaarIssue = aadhaarError(v.aadhaarNumber);
    if (aadhaarIssue) {
      ctx.addIssue({ code: "custom", path: ["aadhaarNumber"], message: aadhaarIssue });
    }
  });
export type RegisterBody = z.infer<typeof registerBody>;

/** Non-sensitive identity summary. The full Aadhaar is never in a DTO. */
export interface IdentityDto {
  aadhaarMasked: string | null;
}

/**
 * Login accepts ONE identifier — email, mobile or Aadhaar. The server decides
 * which it is; the client never says. Kept deliberately loose (a non-empty
 * string) so a malformed identifier fails as "invalid credentials" rather than
 * as a validation error, which would otherwise leak which formats exist.
 */
export const loginBody = z.object({
  identifier: z.string().trim().min(1, "Enter your email, mobile number or Aadhaar number").max(254),
  password: z.string().min(1, "Enter your password"),
});
export type LoginBody = z.infer<typeof loginBody>;

// ---------------------------------------------------------------------------
// Password reset — all three identifiers must match one account
// ---------------------------------------------------------------------------

export const passwordResetRequestBody = z.object({
  email: emailSchema,
  mobileNumber: z.string().trim().min(1).max(24),
  aadhaarNumber: z.string().trim().min(1).max(20),
});
export type PasswordResetRequestBody = z.infer<typeof passwordResetRequestBody>;

/** Always returned, whether or not the details matched — no enumeration. */
export interface PasswordResetRequestResult {
  challengeId: string;
  /** Masked form of the account's registered address, e.g. "j***@acme.com". */
  sentTo: string;
  message: string;
}

export const passwordResetVerifyBody = z.object({
  challengeId: z.string().uuid(),
  otp: z.string().trim().regex(/^[0-9]{6}$/, "Enter the 6-digit code"),
});
export type PasswordResetVerifyBody = z.infer<typeof passwordResetVerifyBody>;

export const passwordResetResendBody = z.object({ challengeId: z.string().uuid() });

export const passwordResetCompleteBody = z
  .object({
    resetToken: z.string().min(20).max(200),
    password: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type PasswordResetCompleteBody = z.infer<typeof passwordResetCompleteBody>;

// ---------------------------------------------------------------------------
// Shared shapes
// ---------------------------------------------------------------------------

export type Presence = "ONLINE" | "AWAY" | "BUSY" | "OFFLINE";
export type OrgRole = "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER" | "GUEST";

export interface UserDto {
  id: string;
  name: string;
  email: string;
  initials: string;
  title: string | null;
  department: string | null;
  phone: string | null;
  location: string | null;
  about: string | null;
  avatarColor: string | null;
  presence: Presence;
  customStatus: string | null;
  mfaEnabled?: boolean;
}

/**
 * The signed-in user's own record. Structured profile fields and the *masked*
 * Aadhaar live here and deliberately NOT on `UserDto`, so they can never leak
 * through contacts, the directory, admin lists or any other user-facing DTO.
 */
export interface MeDto extends UserDto {
  orgRole: OrgRole;
  organization: { id: string; name: string; slug: string };
  settings: SettingsDto;
  firstName: string | null;
  lastName: string | null;
  country: string | null;
  state: string | null;
  pinCode: string | null;
  /** "XXXX-XXXX-1234", or null when no identity is on file. */
  aadhaarMasked: string | null;
}

export interface SettingsDto {
  theme: string;
  accent: string;
  msgLayout: string;
  fontSize: number;
  wallpaper: string;
  openTo: string;
  startupLaunch: boolean;
  startTray: boolean;
  msgPreviews: boolean;
}

export const updateSettingsBody = z
  .object({
    theme: z.enum(["light", "dark", "system"]),
    accent: z.enum(["purple", "blue", "teal", "green", "orange", "rose"]),
    msgLayout: z.enum(["Comfortable", "Compact"]),
    fontSize: z.number().int().min(12).max(17),
    wallpaper: z.string().max(40),
    openTo: z.enum(["Chats", "Status", "Last Opened"]),
    startupLaunch: z.boolean(),
    startTray: z.boolean(),
    msgPreviews: z.boolean(),
  })
  .partial();
export type UpdateSettingsBody = z.infer<typeof updateSettingsBody>;

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

// ---------------------------------------------------------------------------
// Conversations & messages
// ---------------------------------------------------------------------------

export interface ConversationDto {
  id: string;
  slug: string | null;
  kind: "DM" | "GROUP";
  name: string;
  subtitle: string;
  icon: string;
  avatarColor: string;
  online: boolean;
  typing: string[]; // names of users currently typing
  unreadCount: number;
  favorite: boolean;
  archived: boolean;
  muted: boolean;
  lastMessage: { text: string; senderName: string; senderIsSelf: boolean; at: string } | null;
  updatedAt: string;
  about: string | null;
  groupId: string | null;
  pinnedMessage: { id: string; text: string; authorName: string } | null;
  participants?: ParticipantDto[];
}

export interface ParticipantDto {
  userId: string;
  name: string;
  initials: string;
  avatarColor: string | null;
  presence: Presence;
  role: OrgRole;
}

export interface ReactionDto {
  emoji: string;
  count: number;
  mine: boolean;
}

export interface PollDto {
  id: string;
  question: string;
  totalVotes: number;
  myOptionId: string | null;
  options: { id: string; label: string; votes: number }[];
  authorName: string;
}

export interface AttachmentDto {
  fileId: string;
  name: string;
  type: string;
  sizeBytes: number;
  encrypted: boolean;
}

export const E2EE_PROTOCOL_VERSION = "matrix-olm-megolm.v1" as const;

export interface MessageEncryptionDto {
  protocolVersion: typeof E2EE_PROTOCOL_VERSION;
  algorithm: "m.megolm.v1.aes-sha2";
  ciphertext: string;
  sessionId: string;
  senderDeviceId: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  senderAvatarColor: string | null;
  senderRole: string | null; // group role label shown next to name
  mine: boolean;
  /** Present only for historical rows created before strict E2EE was enabled. */
  text: string | null;
  legacyPlaintext: boolean;
  encryption: MessageEncryptionDto | null;
  createdAt: string;
  editedAt: string | null;
  state: "SENT" | "DELIVERED" | "READ";
  replyTo: { id: string; text: string; senderName: string } | null;
  reactions: ReactionDto[];
  attachments: AttachmentDto[];
  poll: PollDto | null;
}

export const sendMessageBody = z.object({
  encryptedEnvelope: z.object({
    protocolVersion: z.literal(E2EE_PROTOCOL_VERSION),
    algorithm: z.literal("m.megolm.v1.aes-sha2"),
    ciphertext: z.string().min(32).max(64_000),
    sessionId: z.string().min(1).max(255),
  }).strict(),
  replyToId: z.string().uuid().optional(),
  idempotencyKey: z.string().max(80).optional(),
  attachmentIds: z.array(z.string().uuid()).max(10).optional(),
}).strict();
export type SendMessageBody = z.infer<typeof sendMessageBody>;

export const reactBody = z.object({ emoji: emojiSchema });
export const voteBody = z.object({ optionId: z.string().uuid() });

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export interface GroupDto {
  id: string;
  conversationSlug: string | null;
  name: string;
  code: string | null;
  icon: string | null;
  avatarColor: string | null;
  privacy: "PUBLIC" | "PRIVATE";
  description: string | null;
  tags: string[];
  memberCount: number;
  onlineCount: number;
  unreadCount: number;
  createdByName: string | null;
  createdAt: string;
  lastActivity: { text: string; at: string } | null;
  members?: GroupMemberDto[];
  events?: GroupEventDto[];
  announcements?: GroupAnnouncementDto[];
}

export interface GroupMemberDto {
  userId: string;
  name: string;
  initials: string;
  avatarColor: string | null;
  presence: Presence;
  role: OrgRole;
}

export interface GroupEventDto {
  id: string;
  name: string;
  startsAt: string;
  location: string | null;
}

export interface GroupAnnouncementDto {
  id: string;
  title: string;
  body: string;
  authorName: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Statuses
// ---------------------------------------------------------------------------

export interface StatusDto {
  id: string;
  owner: { id: string; name: string; initials: string; avatarColor: string | null; presence: Presence };
  caption: string | null;
  mediaStyle: string | null;
  audienceLabel: string;
  createdAt: string;
  expiresAt: string;
  viewedByMe: boolean;
  viewCount: number;
  notViewedCount: number;
  reactions: { emoji: string; count: number }[];
}

// A status reply opens the E2EE DM. The reply content is composed and
// encrypted in that conversation; it never passes through the status API.
export const statusReplyBody = z.object({}).strict();

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export interface FileDto {
  id: string;
  name: string;
  type: string;
  sizeBytes: number;
  encrypted: boolean;
  status: "UPLOADING" | "PROCESSING" | "READY" | "FAILED" | "TRASHED";
  sharedIn: string | null;
  starred: boolean;
  owner: { id: string; name: string; initials: string; avatarColor: string | null };
  createdAt: string;
  updatedAt: string;
  versions?: { version: string; authorName: string | null; createdAt: string }[];
  comments?: { id: string; body: string; authorName: string; authorInitials: string; authorAvatarColor: string | null; createdAt: string }[];
}

export const fileCommentBody = z.object({ body: boundedText(2000) });

export const createUploadBody = z.object({
  name: boundedText(255),
  mime: z.string().max(255),
  sizeBytes: z.number().int().positive(),
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  deepLink: string | null;
  read: boolean;
  createdAt: string;
  actor: { name: string; initials: string; avatarColor: string | null } | null;
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

export interface CallTokenDto {
  configured: boolean;
  url?: string;
  token?: string;
  roomName?: string;
  /** Set when configured=false — truthful reason shown to the user. */
  reason?: string;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface AdminMemberDto {
  userId: string;
  name: string;
  email: string;
  initials: string;
  avatarColor: string | null;
  role: OrgRole;
  presence: Presence;
  suspended: boolean;
  lastActiveAt: string | null;
}

export const changeRoleBody = z.object({
  role: z.enum(["ADMIN", "MODERATOR", "MEMBER", "GUEST"]),
});

export interface StorageSummaryDto {
  usedBytes: number;
  quotaBytes: number;
  byCategory: { files: number; media: number; other: number };
}

export interface AuditEventDto {
  id: string;
  action: string;
  actorName: string | null;
  target: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export interface ContactDto extends UserDto {
  favorite: boolean;
  blocked: boolean;
  notes: string | null;
  tags: string[];
  dmSlug: string | null;
  /**
   * True for a contact the owner entered by hand, who is NOT a member of the
   * organization. Such a contact has no account, so there is nobody to message,
   * call or see presence for — the UI keys off this to hide those affordances,
   * and `id` refers to an external_contacts row rather than a user.
   */
  external: boolean;
  /** Employer, for an external contact. Null for directory members. */
  company: string | null;
}

/**
 * Look someone up by the mobile number they registered with.
 *
 * `country` selects the dialling rules used to normalize `phone`; normalization
 * happens again server-side, because the client is never trusted to produce the
 * canonical form that gets compared against the database.
 */
export const lookupByPhoneBody = z.object({
  phone: z.string().trim().min(1, "Enter a mobile number").max(24),
  country: z.enum(COUNTRY_CODES as [string, ...string[]]).default("IN"),
});
export type LookupByPhoneBody = z.infer<typeof lookupByPhoneBody>;

/**
 * The minimum needed to decide whether to start a conversation.
 *
 * Deliberately excludes email, phone, Aadhaar, department, location and every
 * account/security field. There is no `username` because the schema has no such
 * column, and deriving one from the email local-part would leak the email.
 */
export interface LookupUserDto {
  id: string;
  displayName: string;
  initials: string;
  avatarColor: string | null;
  title: string | null;
  about: string | null;
  presence: Presence;
  /** ISO date. Coarse, non-identifying provenance for the Info panel. */
  memberSince: string;
}

/**
 * One response shape for every outcome, so a caller cannot distinguish
 * "no such account", "not discoverable" and "not in your organization" — all
 * three return exactly `{ found: false }`.
 */
export interface PhoneLookupResult {
  found: boolean;
  /** The searcher's own number. */
  self?: boolean;
  /** False when a block in either direction forbids contact. */
  canContact?: boolean;
  user?: LookupUserDto;
  relationship?: {
    contactExists: boolean;
    conversationExists: boolean;
    dmSlug: string | null;
  };
}

/** Per-owner annotations on a directory contact (notes / tags). */
export const updateContactBody = z.object({
  notes: z.string().trim().max(2000).nullable().optional(),
  tags: z.array(boundedText(40)).max(12).optional(),
});
export type UpdateContactBody = z.infer<typeof updateContactBody>;

/**
 * A contact outside the organization, typed in by the owner.
 *
 * Only `name` is mandatory, but at least one of email/phone must be present —
 * a contact with no way to reach them is a note, not a contact. Empty strings
 * are coerced to undefined first so a blank optional field in the form is
 * treated as "not supplied" rather than failing email validation.
 */
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const createExternalContactBody = z
  .object({
    name: personNameSchema,
    email: z.preprocess(blankToUndefined, emailSchema.optional()),
    phone: z.preprocess(blankToUndefined, z.string().trim().max(24).optional()),
    company: z.preprocess(blankToUndefined, boundedText(80).optional()),
    title: z.preprocess(blankToUndefined, boundedText(80).optional()),
    notes: z.preprocess(blankToUndefined, z.string().trim().max(2000).optional()),
    tags: z.array(boundedText(40)).max(12).optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.email && !v.phone) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Enter an email address or a phone number" });
    }
  });
export type CreateExternalContactBody = z.infer<typeof createExternalContactBody>;

/** Every field optional — a partial edit of an existing external contact. */
export const updateExternalContactBody = z.object({
  name: personNameSchema.optional(),
  email: z.preprocess(blankToUndefined, emailSchema.nullable().optional()),
  phone: z.preprocess(blankToUndefined, z.string().trim().max(24).nullable().optional()),
  company: z.preprocess(blankToUndefined, boundedText(80).nullable().optional()),
  title: z.preprocess(blankToUndefined, boundedText(80).nullable().optional()),
  notes: z.preprocess(blankToUndefined, z.string().trim().max(2000).nullable().optional()),
  tags: z.array(boundedText(40)).max(12).optional(),
  favorite: z.boolean().optional(),
  blocked: z.boolean().optional(),
});
export type UpdateExternalContactBody = z.infer<typeof updateExternalContactBody>;
