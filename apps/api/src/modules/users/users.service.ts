import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  ContactDto,
  CreateExternalContactBody,
  LookupByPhoneBody,
  LookupUserDto,
  MeDto,
  PhoneLookupResult,
  UpdateContactBody,
  UpdateExternalContactBody,
  UserDto,
} from "@chatter/contracts";
import { containsPattern } from "@chatter/search";
import { maskAadhaar, normalizeMobile } from "@chatter/validation";
import type { ExternalContact, User } from "@chatter/database";
import { PrismaService } from "../../common/prisma.service";
import type { AuthedUser } from "../../common/session.service";

const GRADIENTS = [
  "linear-gradient(135deg,#a873ff,#5e28c7)",
  "linear-gradient(135deg,#5b8def,#2c4fa3)",
  "linear-gradient(135deg,#f08fb6,#b34a77)",
  "linear-gradient(135deg,#43c0a8,#1f7a68)",
  "linear-gradient(135deg,#f3a15e,#c26a1f)",
  "linear-gradient(135deg,#8f9bb3,#4a5670)",
  "linear-gradient(135deg,#7bc86c,#3c8a2e)",
  "linear-gradient(135deg,#c48ef0,#7b3fb8)",
  "linear-gradient(135deg,#f0c04a,#b8862a)",
  "linear-gradient(135deg,#6fd3e8,#2a8aa5)",
];

export function initialsGradient(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length]!;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
}

export function toUserDto(u: User): UserDto {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    initials: initials(u.name),
    title: u.title,
    department: u.department,
    phone: u.phone,
    location: u.location,
    about: u.about,
    avatarColor: u.avatarColor,
    presence: u.presence,
    customStatus: u.customStatus,
  };
}

/**
 * Shape an external contact like a directory contact so a single list can
 * render both. The account-only fields are necessarily empty: there is no
 * user, so no presence, no department, no about, no DM to open. Presence is
 * reported OFFLINE because the DTO requires a value; `external` is what the
 * UI should branch on, never the presence.
 */
export function toExternalContactDto(c: ExternalContact): ContactDto {
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? "",
    initials: initials(c.name),
    title: c.title,
    department: null,
    phone: c.phone,
    location: null,
    about: null,
    avatarColor: initialsGradient(c.name),
    presence: "OFFLINE",
    customStatus: null,
    favorite: c.favorite,
    blocked: c.blocked,
    notes: c.notes,
    tags: (c.tags as string[] | null) ?? [],
    dmSlug: null,
    external: true,
    company: c.company,
  };
}

/** Narrow projection -> the minimal lookup DTO. Anything not listed here is
 *  deliberately withheld: email, phone, Aadhaar, department, location. */
function toLookupUserDto(u: {
  id: string;
  name: string;
  title: string | null;
  about: string | null;
  avatarColor: string | null;
  presence: UserDto["presence"];
  createdAt: Date;
}): LookupUserDto {
  return {
    id: u.id,
    displayName: u.name,
    initials: initials(u.name),
    avatarColor: u.avatarColor,
    title: u.title,
    about: u.about,
    presence: u.presence,
    memberSince: u.createdAt.toISOString(),
  };
}

/** Prisma's unique-constraint failure, without importing the error class. */
function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(auth: AuthedUser): Promise<MeDto> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: auth.userId },
      include: {
        settings: true,
        memberships: { include: { organization: true }, take: 1 },
        // Only the last four digits are selected — the ciphertext never leaves
        // the database on this path.
        identity: { select: { aadhaarLast4: true } },
      },
    });
    if (!user) throw new NotFoundException();
    const m = user.memberships[0]!;
    const s = user.settings!;
    return {
      ...toUserDto(user),
      mfaEnabled: user.mfaEnabled,
      firstName: user.firstName,
      lastName: user.lastName,
      country: user.country,
      state: user.state,
      pinCode: user.pinCode,
      aadhaarMasked: user.identity ? maskAadhaar(user.identity.aadhaarLast4) : null,
      orgRole: m.role,
      organization: { id: m.organization.id, name: m.organization.name, slug: m.organization.slug },
      settings: {
        theme: s.theme,
        accent: s.accent,
        msgLayout: s.msgLayout,
        fontSize: s.fontSize,
        wallpaper: s.wallpaper,
        openTo: s.openTo,
        startupLaunch: s.startupLaunch,
        startTray: s.startTray,
        msgPreviews: s.msgPreviews,
      },
    };
  }

  async contacts(auth: AuthedUser, q?: string): Promise<ContactDto[]> {
    const members = await this.prisma.client.membership.findMany({
      where: {
        organizationId: auth.organizationId,
        suspended: false,
        userId: { not: auth.userId },
        ...(q
          ? {
              user: {
                OR: [
                  { name: { contains: q } },
                  { title: { contains: q } },
                  { department: { contains: q } },
                ],
              },
            }
          : {}),
      },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    });
    const contactRows = await this.prisma.client.contact.findMany({ where: { ownerId: auth.userId } });
    const byTarget = new Map(contactRows.map((c) => [c.targetId, c]));

    // Existing DM slugs so the UI can deep-link straight into a thread.
    const dms = await this.prisma.client.conversation.findMany({
      where: { organizationId: auth.organizationId, kind: "DM", participants: { some: { userId: auth.userId } } },
      include: { participants: true },
    });
    const dmByOther = new Map<string, string | null>();
    for (const d of dms) {
      const other = d.participants.find((p) => p.userId !== auth.userId);
      if (other) dmByOther.set(other.userId, d.slug);
    }

    const directory: ContactDto[] = members.map((m) => {
      const c = byTarget.get(m.userId);
      return {
        ...toUserDto(m.user),
        favorite: c?.favorite ?? false,
        blocked: c?.blocked ?? false,
        notes: c?.notes ?? null,
        tags: (c?.tags as string[] | null) ?? [],
        dmSlug: dmByOther.get(m.userId) ?? null,
        external: false,
        company: null,
      };
    });

    // Externals are the owner's own rows, so they are filtered in SQL by the
    // same `q` the directory query uses rather than re-filtered in memory.
    const externals = await this.prisma.client.externalContact.findMany({
      where: {
        ownerId: auth.userId,
        ...(q
          ? { OR: [{ name: { contains: q } }, { company: { contains: q } }, { title: { contains: q } }] }
          : {}),
      },
      orderBy: { name: "asc" },
    });

    return [...directory, ...externals.map(toExternalContactDto)].sort((a, b) => a.name.localeCompare(b.name));
  }

  async toggleFavorite(auth: AuthedUser, targetId: string): Promise<{ favorite: boolean }> {
    await this.assertSameOrg(auth, targetId);
    const existing = await this.prisma.client.contact.findUnique({
      where: { ownerId_targetId: { ownerId: auth.userId, targetId } },
    });
    if (!existing) {
      await this.prisma.client.contact.create({ data: { ownerId: auth.userId, targetId, favorite: true } });
      return { favorite: true };
    }
    const updated = await this.prisma.client.contact.update({
      where: { id: existing.id },
      data: { favorite: !existing.favorite },
    });
    return { favorite: updated.favorite };
  }

  /** Block/unblock a directory member. Blocked contacts are hidden from the
   *  main list and surface only under the Blocked category. */
  async toggleBlock(auth: AuthedUser, targetId: string): Promise<{ blocked: boolean }> {
    await this.assertSameOrg(auth, targetId);
    const existing = await this.prisma.client.contact.findUnique({
      where: { ownerId_targetId: { ownerId: auth.userId, targetId } },
    });
    if (!existing) {
      await this.prisma.client.contact.create({ data: { ownerId: auth.userId, targetId, blocked: true } });
      return { blocked: true };
    }
    const updated = await this.prisma.client.contact.update({
      where: { id: existing.id },
      data: { blocked: !existing.blocked },
    });
    return { blocked: updated.blocked };
  }

  /** Update the owner's private notes/tags for a directory member. */
  async updateContact(
    auth: AuthedUser,
    targetId: string,
    body: UpdateContactBody,
  ): Promise<{ notes: string | null; tags: string[] }> {
    await this.assertSameOrg(auth, targetId);
    const data: { notes?: string | null; tags?: string[] } = {};
    if (body.notes !== undefined) data.notes = body.notes === "" ? null : body.notes;
    if (body.tags !== undefined) data.tags = body.tags;
    const row = await this.prisma.client.contact.upsert({
      where: { ownerId_targetId: { ownerId: auth.userId, targetId } },
      update: data,
      create: { ownerId: auth.userId, targetId, ...data },
    });
    return { notes: row.notes, tags: (row.tags as string[] | null) ?? [] };
  }

  /**
   * Create a contact who is not in the directory.
   *
   * The unique [ownerId, email] index is what actually prevents duplicates —
   * checking first would still race — so the constraint violation is caught
   * and translated rather than pre-empted.
   */
  async createExternalContact(auth: AuthedUser, body: CreateExternalContactBody): Promise<ContactDto> {
    try {
      const row = await this.prisma.client.externalContact.create({
        data: {
          ownerId: auth.userId,
          name: body.name,
          email: body.email ?? null,
          phone: body.phone ?? null,
          company: body.company ?? null,
          title: body.title ?? null,
          notes: body.notes ?? null,
          tags: body.tags ?? undefined,
        },
      });
      return toExternalContactDto(row);
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException("You already have an external contact with that email address");
      }
      throw e;
    }
  }

  /** Edit an external contact. Scoped to the owner, so one user can never
   *  read or modify another's private contact list. */
  async updateExternalContact(
    auth: AuthedUser,
    id: string,
    body: UpdateExternalContactBody,
  ): Promise<ContactDto> {
    await this.assertOwnsExternal(auth, id);
    try {
      const row = await this.prisma.client.externalContact.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.email !== undefined ? { email: body.email ?? null } : {}),
          ...(body.phone !== undefined ? { phone: body.phone ?? null } : {}),
          ...(body.company !== undefined ? { company: body.company ?? null } : {}),
          ...(body.title !== undefined ? { title: body.title ?? null } : {}),
          ...(body.notes !== undefined ? { notes: body.notes ?? null } : {}),
          ...(body.tags !== undefined ? { tags: body.tags } : {}),
          ...(body.favorite !== undefined ? { favorite: body.favorite } : {}),
          ...(body.blocked !== undefined ? { blocked: body.blocked } : {}),
        },
      });
      return toExternalContactDto(row);
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException("You already have an external contact with that email address");
      }
      throw e;
    }
  }

  async deleteExternalContact(auth: AuthedUser, id: string): Promise<{ ok: true }> {
    await this.assertOwnsExternal(auth, id);
    await this.prisma.client.externalContact.delete({ where: { id } });
    return { ok: true };
  }

  /** 404 rather than 403 for someone else's row — the existence of another
   *  user's contact is itself private. */
  private async assertOwnsExternal(auth: AuthedUser, id: string): Promise<void> {
    const row = await this.prisma.client.externalContact.findFirst({
      where: { id, ownerId: auth.userId },
      select: { id: true },
    });
    if (!row) throw new NotFoundException("External contact not found");
  }

  /**
   * Find a member by the mobile number they registered with.
   *
   * Every negative outcome returns the identical `{ found: false }`: no such
   * number, not discoverable, outside the caller's organization, or unverified.
   * Distinguishing them would turn this endpoint into a membership oracle, which
   * is exactly the enumeration risk a phone lookup carries.
   *
   * The comparison is an indexed exact match on the normalized value — never a
   * LIKE, never a scan filtered in application code.
   */
  async lookupByPhone(auth: AuthedUser, body: LookupByPhoneBody): Promise<PhoneLookupResult> {
    const notFound: PhoneLookupResult = { found: false };

    // Re-normalized server-side; the client's canonical form is never trusted.
    const phone = normalizeMobile(body.phone, body.country);
    if (!phone) throw new BadRequestException("Enter a valid mobile number");

    const match = await this.prisma.client.user.findFirst({
      where: { phone, phoneVerified: true },
      select: {
        id: true,
        name: true,
        title: true,
        about: true,
        avatarColor: true,
        presence: true,
        createdAt: true,
        settings: { select: { phoneDiscoverable: true } },
        memberships: { where: { organizationId: auth.organizationId }, select: { suspended: true }, take: 1 },
      },
      // Newest wins if historic non-E.164 duplicates exist; uniqueness is
      // enforced at registration rather than by a column constraint.
      orderBy: { createdAt: "desc" },
    });

    await this.auditLookup(auth, match ? "hit" : "miss");
    if (!match) return notFound;

    if (match.id === auth.userId) {
      return { found: true, self: true, user: toLookupUserDto(match) };
    }

    // Lookup is organization-scoped: contact, presence and conversations are all
    // org-bound, so returning someone unreachable would be a dead end.
    const membership = match.memberships[0];
    if (!membership || membership.suspended) return notFound;

    switch (match.settings?.phoneDiscoverable ?? "EVERYONE") {
      case "NOBODY":
        return notFound;
      case "CONTACTS": {
        const known = await this.prisma.client.contact.findUnique({
          where: { ownerId_targetId: { ownerId: match.id, targetId: auth.userId } },
          select: { id: true },
        });
        if (!known) return notFound;
        break;
      }
      default:
        break;
    }

    // A block in EITHER direction forbids contact. The account is still
    // acknowledged — the searcher knew the number — but the actions are refused
    // without saying which side blocked whom.
    const blocks = await this.prisma.client.contact.findMany({
      where: {
        blocked: true,
        OR: [
          { ownerId: auth.userId, targetId: match.id },
          { ownerId: match.id, targetId: auth.userId },
        ],
      },
      select: { id: true },
    });

    const dm = await this.prisma.client.conversation.findFirst({
      where: {
        organizationId: auth.organizationId,
        kind: "DM",
        AND: [
          { participants: { some: { userId: auth.userId } } },
          { participants: { some: { userId: match.id } } },
        ],
      },
      select: { id: true, slug: true },
    });

    const contactRow = await this.prisma.client.contact.findUnique({
      where: { ownerId_targetId: { ownerId: auth.userId, targetId: match.id } },
      select: { id: true },
    });

    return {
      found: true,
      self: false,
      canContact: blocks.length === 0,
      user: toLookupUserDto(match),
      relationship: {
        contactExists: Boolean(contactRow),
        conversationExists: Boolean(dm),
        dmSlug: dm?.slug ?? null,
      },
    };
  }

  /**
   * Records that a lookup happened and how it resolved — never the number
   * searched for, which would defeat the point of not storing it.
   */
  private async auditLookup(auth: AuthedUser, result: "hit" | "miss"): Promise<void> {
    await this.prisma.client.auditLog.create({
      data: {
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: "user.phone_lookup",
        target: auth.userId,
        metadata: { result },
      },
    });
  }

  async searchPattern(q: string): Promise<string> {
    return containsPattern(q);
  }

  private async assertSameOrg(auth: AuthedUser, userId: string): Promise<void> {
    const m = await this.prisma.client.membership.findFirst({
      where: { userId, organizationId: auth.organizationId },
    });
    if (!m) throw new NotFoundException("User not found in your organization");
  }
}
