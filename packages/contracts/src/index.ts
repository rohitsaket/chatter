/**
 * API contracts shared between apps/web and apps/api.
 * Request bodies are zod schemas (validated server-side); responses are types.
 */
import { z } from "zod";
import { emailSchema, passwordSchema, boundedText, emojiSchema } from "@chatter/validation";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const registerBody = z.object({
  name: boundedText(120),
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterBody = z.infer<typeof registerBody>;

export const loginBody = z.object({
  email: emailSchema,
  password: z.string().min(1),
});
export type LoginBody = z.infer<typeof loginBody>;

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

export interface MeDto extends UserDto {
  orgRole: OrgRole;
  organization: { id: string; name: string; slug: string };
  settings: SettingsDto;
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
  text: string | null;
  createdAt: string;
  editedAt: string | null;
  state: "SENT" | "DELIVERED" | "READ";
  replyTo: { id: string; text: string; senderName: string } | null;
  reactions: ReactionDto[];
  attachments: AttachmentDto[];
  poll: PollDto | null;
}

export const sendMessageBody = z.object({
  text: boundedText(8000),
  replyToId: z.string().uuid().optional(),
  idempotencyKey: z.string().max(80).optional(),
});
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

export const statusReplyBody = z.object({ text: boundedText(2000) });

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export interface FileDto {
  id: string;
  name: string;
  type: string;
  sizeBytes: number;
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
}
