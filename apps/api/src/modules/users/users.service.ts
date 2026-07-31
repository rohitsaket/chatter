import { Injectable, NotFoundException } from "@nestjs/common";
import type { ContactDto, MeDto, UserDto } from "@chatter/contracts";
import { containsPattern } from "@chatter/search";
import type { User } from "@chatter/database";
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

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(auth: AuthedUser): Promise<MeDto> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: auth.userId },
      include: { settings: true, memberships: { include: { organization: true }, take: 1 } },
    });
    if (!user) throw new NotFoundException();
    const m = user.memberships[0]!;
    const s = user.settings!;
    return {
      ...toUserDto(user),
      mfaEnabled: user.mfaEnabled,
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
                  { name: { contains: q, mode: "insensitive" } },
                  { title: { contains: q, mode: "insensitive" } },
                  { department: { contains: q, mode: "insensitive" } },
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

    return members.map((m) => {
      const c = byTarget.get(m.userId);
      return {
        ...toUserDto(m.user),
        favorite: c?.favorite ?? false,
        blocked: c?.blocked ?? false,
        notes: c?.notes ?? null,
        tags: c?.tags ?? [],
        dmSlug: dmByOther.get(m.userId) ?? null,
      };
    });
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
