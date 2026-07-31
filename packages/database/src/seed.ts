/**
 * Seed the database with the exact people/groups/objects the Chatter prototype
 * uses (handoff/data-model.md "Seed data used in the prototype").
 * Idempotent: safe to re-run (upserts keyed on stable slugs/emails).
 */
import { PrismaClient, OrgRole, ConversationKind, GroupPrivacy, FileStatus, Presence } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const GRAD = {
  jd: "linear-gradient(135deg,#4d5668,#232a38)",
  al: "linear-gradient(135deg,#a873ff,#5e28c7)",
  mb: "linear-gradient(135deg,#5b8def,#2c4fa3)",
  sj: "linear-gradient(135deg,#f08fb6,#b34a77)",
  dw: "linear-gradient(135deg,#43c0a8,#1f7a68)",
  om: "linear-gradient(135deg,#f3a15e,#c26a1f)",
  ja: "linear-gradient(135deg,#8f9bb3,#4a5670)",
  dt: "linear-gradient(135deg,#7bc86c,#3c8a2e)",
  sl: "linear-gradient(135deg,#c48ef0,#7b3fb8)",
  mt: "linear-gradient(135deg,#f0c04a,#b8862a)",
  ed: "linear-gradient(135deg,#6fd3e8,#2a8aa5)",
  wc: "linear-gradient(135deg,#9aa4f5,#4a55b8)",
  ar: "linear-gradient(135deg,#f78e8e,#b83a3a)",
} as const;

type UserSeed = {
  key: keyof typeof GRAD;
  name: string;
  title: string;
  department: string;
  phone: string;
  presence: Presence;
};

const USERS: UserSeed[] = [
  { key: "jd", name: "John Doe", title: "Engineering Manager", department: "Engineering", phone: "+1 (555) 000-1111", presence: "ONLINE" },
  { key: "al", name: "Alice Johnson", title: "UI/UX Designer", department: "Design", phone: "+1 (555) 123-4567", presence: "ONLINE" },
  { key: "mb", name: "Michael Brown", title: "Product Manager", department: "Product", phone: "+1 (555) 234-5678", presence: "AWAY" },
  { key: "sj", name: "Sarah Johnson", title: "Project Manager", department: "Operations", phone: "+1 (555) 345-6789", presence: "ONLINE" },
  { key: "dw", name: "David Wilson", title: "Dev Lead", department: "Engineering", phone: "+1 (555) 456-7890", presence: "OFFLINE" },
  { key: "om", name: "Olivia Martinez", title: "Marketing Specialist", department: "Marketing", phone: "+1 (555) 678-9012", presence: "AWAY" },
  { key: "ja", name: "James Anderson", title: "Backend Engineer", department: "Engineering", phone: "+1 (555) 567-8901", presence: "ONLINE" },
  { key: "dt", name: "Daniel Thomas", title: "UX Researcher", department: "Design", phone: "+1 (555) 789-0123", presence: "ONLINE" },
  { key: "sl", name: "Sophia Lee", title: "Data Analyst", department: "Data", phone: "+1 (555) 890-1234", presence: "OFFLINE" },
  { key: "mt", name: "Matthew Taylor", title: "Sales Manager", department: "Sales", phone: "+1 (555) 901-2345", presence: "ONLINE" },
  { key: "ed", name: "Emily Davis", title: "Content Writer", department: "Marketing", phone: "+1 (555) 012-3456", presence: "OFFLINE" },
  { key: "wc", name: "William Clark", title: "System Administrator", department: "IT", phone: "+1 (555) 123-0987", presence: "AWAY" },
  { key: "ar", name: "Ava Rodriguez", title: "Customer Success", department: "Support", phone: "+1 (555) 234-1098", presence: "ONLINE" },
];

function email(name: string) {
  return name.toLowerCase().replace(/ /g, ".") + "@acmecorp.com";
}

function minsAgo(m: number) {
  return new Date(Date.now() - m * 60_000);
}

async function main() {
  const passwordHash = await argon2.hash("Chatter!Demo1", { type: argon2.argon2id });

  const org = await prisma.organization.upsert({
    where: { slug: "acme" },
    update: {},
    create: { name: "Acme Corp.", slug: "acme" },
  });

  // Users + memberships
  const users: Record<string, { id: string }> = {};
  for (const u of USERS) {
    const rec = await prisma.user.upsert({
      where: { email: email(u.name) },
      update: { presence: u.presence },
      create: {
        email: email(u.name),
        passwordHash,
        name: u.name,
        title: u.title,
        department: u.department,
        phone: u.phone,
        location: "San Francisco, CA, USA",
        about:
          u.key === "al"
            ? "UI/UX Designer at Acme Corp. Specializing in user-centered design and creating beautiful digital experiences."
            : `${u.title} at Acme Corp.`,
        avatarColor: GRAD[u.key],
        presence: u.presence,
        mfaEnabled: u.key === "al",
      },
    });
    users[u.key] = rec;
    const role: OrgRole =
      u.key === "jd" ? "OWNER" : u.key === "al" || u.key === "mb" ? "ADMIN" : u.key === "om" ? "GUEST" : "MEMBER";
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: rec.id, organizationId: org.id } },
      update: { role },
      create: { userId: rec.id, organizationId: org.id, role },
    });
    await prisma.userSettings.upsert({
      where: { userId: rec.id },
      update: {},
      create: { userId: rec.id },
    });
  }
  const jd = users.jd!, al = users.al!, mb = users.mb!, sj = users.sj!, dw = users.dw!;

  // John's contacts (favorites match prototype ★ marks)
  for (const u of USERS.filter((x) => x.key !== "jd")) {
    await prisma.contact.upsert({
      where: { ownerId_targetId: { ownerId: jd.id, targetId: users[u.key]!.id } },
      update: {},
      create: {
        ownerId: jd.id,
        targetId: users[u.key]!.id,
        favorite: ["al", "sj"].includes(u.key),
        notes: u.key === "al" ? "Great collaborator and always brings thoughtful design solutions to the table." : null,
        tags: u.key === "al" ? ["Designer", "Collaborator", "Proactive"] : [],
      },
    });
  }

  // Workspaces
  for (const [name, icon] of [
    ["Marketing Team", "👥"],
    ["Product Design", "✏️"],
    ["Dev Team", "</>"],
  ] as const) {
    await prisma.workspace.upsert({
      where: { organizationId_name: { organizationId: org.id, name } },
      update: {},
      create: { organizationId: org.id, name, icon },
    });
  }

  // --- Conversations -------------------------------------------------------
  async function dm(slug: string, otherKey: keyof typeof GRAD, mins: number) {
    const conv = await prisma.conversation.upsert({
      where: { organizationId_slug: { organizationId: org.id, slug } },
      update: {},
      create: { organizationId: org.id, kind: ConversationKind.DM, slug, updatedAt: minsAgo(mins) },
    });
    for (const uid of [jd.id, users[otherKey]!.id]) {
      await prisma.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: conv.id, userId: uid } },
        update: {},
        create: { conversationId: conv.id, userId: uid, favorite: uid === jd.id && ["alice", "sarah"].includes(slug) },
      });
    }
    return conv;
  }

  async function group(opts: {
    slug: string; name: string; icon: string; avatarColor: string; privacy: GroupPrivacy;
    description: string; tags?: string[]; code?: string; memberKeys: (keyof typeof GRAD)[];
    createdBy: keyof typeof GRAD; mins: number; archived?: boolean;
  }) {
    const conv = await prisma.conversation.upsert({
      where: { organizationId_slug: { organizationId: org.id, slug: opts.slug } },
      update: {},
      create: { organizationId: org.id, kind: ConversationKind.GROUP, slug: opts.slug, updatedAt: minsAgo(opts.mins) },
    });
    const g = await prisma.group.upsert({
      where: { organizationId_name: { organizationId: org.id, name: opts.name } },
      update: {},
      create: {
        organizationId: org.id,
        conversationId: conv.id,
        name: opts.name,
        code: opts.code,
        icon: opts.icon,
        avatarColor: opts.avatarColor,
        privacy: opts.privacy,
        description: opts.description,
        tags: opts.tags ?? [],
        archived: opts.archived ?? false,
        createdById: users[opts.createdBy]!.id,
      },
    });
    for (const k of opts.memberKeys) {
      const role: OrgRole = k === opts.createdBy ? "ADMIN" : k === "mb" || k === "om" ? "MODERATOR" : "MEMBER";
      await prisma.groupMember.upsert({
        where: { groupId_userId: { groupId: g.id, userId: users[k]!.id } },
        update: {},
        create: { groupId: g.id, userId: users[k]!.id, role },
      });
      await prisma.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: conv.id, userId: users[k]!.id } },
        update: {},
        create: {
          conversationId: conv.id,
          userId: users[k]!.id,
          role,
          favorite: users[k]!.id === jd.id && opts.slug === "design",
        },
      });
    }
    return { conv, g };
  }

  const cAlice = await dm("alice", "al", 2);
  const cMichael = await dm("michael", "mb", 15);
  await dm("sarah", "sj", 60);
  await dm("david", "dw", 60 * 24);
  await dm("olivia", "om", 60 * 25);
  await dm("james", "ja", 60 * 72);

  const design = await group({
    slug: "design", name: "Design Team", icon: "DT", avatarColor: "linear-gradient(135deg,#8950f5,#5e28c7)",
    privacy: "PRIVATE", code: "DES-2024",
    description: "This group is for all things design — projects, feedback, brainstorming, and keeping our design system consistent.",
    tags: ["Design", "Feedback", "DesignSystem"],
    memberKeys: ["jd", "al", "mb", "sj", "dw", "om", "dt", "sl", "ed", "wc", "ar", "mt"],
    createdBy: "al", mins: 1,
  });
  const mkt = await group({
    slug: "mkt", name: "Marketing Team", icon: "📊", avatarColor: "linear-gradient(135deg,#2b2650,#171233)",
    privacy: "PRIVATE", description: "Collaborate on campaigns, content, and go-to-market strategies.",
    tags: ["Marketing", "Campaigns", "Content", "Strategy"],
    memberKeys: ["jd", "sj", "om", "ed", "mt"], createdBy: "sj", mins: 45,
  });
  await group({
    slug: "phoenix", name: "Project Phoenix", icon: "🚀", avatarColor: "linear-gradient(135deg,#43c0a8,#1f7a68)",
    privacy: "PRIVATE", description: "Cross-functional team driving the Phoenix project forward.",
    memberKeys: ["jd", "al", "mb", "dw", "ja"], createdBy: "mb", mins: 60 * 20,
  });
  await group({
    slug: "product-design", name: "Product Design", icon: "✏️", avatarColor: "linear-gradient(135deg,#5b8def,#2c4fa3)",
    privacy: "PRIVATE", description: "Design discussions, feedback, and UI/UX collaboration.",
    memberKeys: ["jd", "al", "dt", "dw"], createdBy: "al", mins: 60 * 26,
  });
  await group({
    slug: "sales", name: "Sales Enablement", icon: "📣", avatarColor: "linear-gradient(135deg,#f3a15e,#c26a1f)",
    privacy: "PUBLIC", description: "Resources, playbooks, and updates for the sales team.",
    memberKeys: ["jd", "mt", "ar", "sj"], createdBy: "mt", mins: 60 * 24 * 5,
  });
  await group({
    slug: "hr", name: "HR Community", icon: "❤️", avatarColor: "linear-gradient(135deg,#f08fb6,#b34a77)",
    privacy: "PRIVATE", description: "Company updates, policies, and employee resources.",
    memberKeys: ["jd", "sj", "ed"], createdBy: "sj", mins: 60 * 24 * 7,
  });
  await group({
    slug: "it", name: "IT Support", icon: "🎧", avatarColor: "linear-gradient(135deg,#43c0a8,#1a5c50)",
    privacy: "PRIVATE", description: "IT help, system updates, and troubleshooting.",
    memberKeys: ["jd", "wc"], createdBy: "wc", mins: 60 * 24 * 8,
  });
  await group({
    slug: "dev", name: "Dev Team", icon: "</>", avatarColor: "linear-gradient(135deg,#232a38,#4d5668)",
    privacy: "PRIVATE", description: "Engineering discussions, PRs and releases.",
    memberKeys: ["jd", "dw", "ja", "wc"], createdBy: "dw", mins: 60 * 72,
  });
  await group({
    slug: "friends", name: "Friends Group", icon: "FG", avatarColor: "linear-gradient(135deg,#c48ef0,#7b3fb8)",
    privacy: "PRIVATE", description: "Weekend plans and everything else.",
    memberKeys: ["jd", "al", "mb"], createdBy: "jd", mins: 60 * 26,
  });
  await group({
    slug: "announcements", name: "Company Announcements", icon: "📣", avatarColor: "linear-gradient(135deg,#8950f5,#5e28c7)",
    privacy: "PUBLIC", description: "Official company-wide announcements.",
    memberKeys: ["jd", "al", "mb", "sj", "dw", "om", "ja", "dt", "sl", "mt", "ed", "wc", "ar"],
    createdBy: "jd", mins: 60 * 24 * 2,
  });

  // --- Messages ------------------------------------------------------------
  async function msg(conv: { id: string }, senderId: string, text: string | null, mins: number, extra?: {
    replyToId?: string; state?: "SENT" | "DELIVERED" | "READ";
  }) {
    return prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId,
        text,
        replyToId: extra?.replyToId,
        state: extra?.state ?? "READ",
        createdAt: minsAgo(mins),
      },
    });
  }

  const msgCount = await prisma.message.count({ where: { conversationId: cAlice.id } });
  if (msgCount === 0) {
    // Alice DM thread (prototype baseMsgs)
    const m1 = await msg(cAlice, al.id, "Please check the latest design mockups for the dashboard.", 34);
    await msg(cAlice, jd.id, "Looks great! I love the new color scheme.", 32);
    await msg(cAlice, al.id, "Thanks! Let me know if you have any feedback or suggestions.", 30);
    await msg(cAlice, jd.id, "Can we also add a dark mode option? It would be great for nighttime use.", 28);
    const m5 = await msg(cAlice, al.id, "Absolutely, dark mode is on our roadmap. I'll share some variations soon.", 27);
    await prisma.messageReaction.create({ data: { messageId: m5.id, userId: jd.id, emoji: "👍" } });
    await prisma.messageReaction.create({ data: { messageId: m5.id, userId: mb.id, emoji: "👍" } });
    void m1;

    await msg(cMichael, mb.id, "Hey! Are we still on for lunch?", 45, { state: "DELIVERED" });

    // Design Team group thread (prototype design msgs + poll)
    const d1 = await msg(design.conv, al.id, "Please review the new dashboard concepts and share your feedback by EOD.", 77);
    await prisma.messageReaction.createMany({
      data: [
        { messageId: d1.id, userId: jd.id, emoji: "👍" },
        { messageId: d1.id, userId: mb.id, emoji: "👍" },
        { messageId: d1.id, userId: sj.id, emoji: "👍" },
        { messageId: d1.id, userId: dw.id, emoji: "❤️" },
        { messageId: d1.id, userId: users.dt!.id, emoji: "❤️" },
      ],
      skipDuplicates: true,
    });
    const d2 = await msg(design.conv, mb.id, "Looks great! I particularly like the analytics overview. One suggestion: can we make the chart colors more accessible?", 75);
    await prisma.messageReaction.createMany({
      data: [
        { messageId: d2.id, userId: al.id, emoji: "👍" },
        { messageId: d2.id, userId: jd.id, emoji: "👍" },
      ],
      skipDuplicates: true,
    });
    const d3 = await msg(design.conv, al.id, "Yes, good call. I'll update the color palette and push a new version shortly.", 73, { replyToId: d2.id });
    await prisma.messageReaction.create({ data: { messageId: d3.id, userId: mb.id, emoji: "👍" } });
    const d4 = await msg(design.conv, dw.id, "I've updated the color scheme based on the feedback. Here's a quick preview:", 71);
    await prisma.messageReaction.createMany({
      data: [
        { messageId: d4.id, userId: al.id, emoji: "🔥" },
        { messageId: d4.id, userId: mb.id, emoji: "🔥" },
        { messageId: d4.id, userId: jd.id, emoji: "👏" },
        { messageId: d4.id, userId: sj.id, emoji: "👏" },
      ],
      skipDuplicates: true,
    });

    // Pinned message + poll
    const pinned = await msg(design.conv, al.id, "Design System v2.0 is now live! Please review the updates in the attached file.", 120);
    await prisma.conversation.update({ where: { id: design.conv.id }, data: { pinnedMessageId: pinned.id } });

    const pollMsg = await msg(design.conv, al.id, null, 70);
    const poll = await prisma.poll.create({
      data: { messageId: pollMsg.id, question: "Which layout do we prefer for the KPI section?" },
    });
    const optA = await prisma.pollOption.create({ data: { pollId: poll.id, label: "Option 1 (Compact)", order: 0 } });
    const optB = await prisma.pollOption.create({ data: { pollId: poll.id, label: "Option 2 (Expanded)", order: 1 } });
    // 4 : 2 votes (prototype 67%/33%)
    await prisma.pollVote.createMany({
      data: [
        { pollId: poll.id, optionId: optA.id, userId: al.id },
        { pollId: poll.id, optionId: optA.id, userId: mb.id },
        { pollId: poll.id, optionId: optA.id, userId: sj.id },
        { pollId: poll.id, optionId: optA.id, userId: users.dt!.id },
        { pollId: poll.id, optionId: optB.id, userId: dw.id },
        { pollId: poll.id, optionId: optB.id, userId: users.sl!.id },
      ],
      skipDuplicates: true,
    });

    // Michael DM: two unread messages (prototype badge 2), newest is the
    // lunch message so the list preview matches the prototype.
    await msg(cMichael, mb.id, "Did you get a chance to look at the product specs?", 50, { state: "DELIVERED" });

    // Other list previews
    const mkConv = mkt.conv;
    // Marketing Team: five unread from others (prototype badge 5), newest from
    // Emily so the preview reads "Great work on the campaign visuals!".
    await msg(mkConv, users.om!.id, "Campaign brief is up — feedback welcome before Friday.", 180);
    await msg(mkConv, sj.id, "I'll review the media plan this afternoon.", 178);
    await msg(mkConv, users.mt!.id, "Sales enablement deck is linked in the files tab.", 172);
    await msg(mkConv, users.om!.id, "Updated the launch timeline with the new dates.", 168);
    await msg(mkConv, users.ed!.id, "Great work on the campaign visuals!", 163);

    // Project Phoenix: one unread from Michael, then John's own newest message
    // so the preview reads "You: Uploaded 2 files" (prototype).
    const phoenixConv = await prisma.conversation.findUnique({
      where: { organizationId_slug: { organizationId: org.id, slug: "phoenix" } },
    });
    if (phoenixConv) {
      await msg(phoenixConv, mb.id, "Phoenix build is green again — thanks for the quick fixes.", 60 * 21);
      await msg(phoenixConv, jd.id, "Uploaded 2 files", 60 * 20);
    }

    // Friends Group: four unread from others (prototype badge 4), newest text
    // matches the prototype preview "See you all this weekend!".
    const friendsConv = await prisma.conversation.findUnique({
      where: { organizationId_slug: { organizationId: org.id, slug: "friends" } },
    });
    if (friendsConv) {
      await msg(friendsConv, al.id, "Anyone up for hiking on Saturday?", 60 * 27);
      await msg(friendsConv, mb.id, "Count me in — weather looks great.", 60 * 26 + 30);
      await msg(friendsConv, al.id, "I'll book the cabin for Saturday night.", 60 * 26);
      await msg(friendsConv, mb.id, "See you all this weekend!", 60 * 25 + 30);
    }
    await msg((await dm("sarah", "sj", 60)), sj.id, "Thanks for the quick response!", 58);
    await msg((await dm("david", "dw", 60 * 24)), dw.id, "Let's catch up tomorrow.", 60 * 23);
    await msg((await dm("james", "ja", 60 * 72)), ja(), "Perfect, thank you!", 60 * 71).catch(() => void 0);
  }

  function ja() {
    return users.ja!.id;
  }

  // Unread positioning: the K newest messages from other senders are unread for
  // John (prototype badge counts). Anchored to message timestamps, not the
  // wall clock, so re-running the seed restores the same unread state even
  // though messages keep their original createdAt.
  const unreadPlan: Record<string, number> = { alice: 3, michael: 2, mkt: 5, design: 4, phoenix: 1, friends: 4 };
  for (const [slug, count] of Object.entries(unreadPlan)) {
    const conv = await prisma.conversation.findUnique({ where: { organizationId_slug: { organizationId: org.id, slug } } });
    if (!conv) continue;
    const fromOthers = await prisma.message.findMany({
      where: { conversationId: conv.id, deletedAt: null, senderId: { not: jd.id } },
      orderBy: { createdAt: "desc" },
      take: count,
      select: { createdAt: true },
    });
    const kth = fromOthers[count - 1];
    await prisma.conversationParticipant.updateMany({
      where: { conversationId: conv.id, userId: jd.id },
      data: { lastReadAt: kth ? new Date(kth.createdAt.getTime() - 1000) : null },
    });
  }

  // --- Files ---------------------------------------------------------------
  const FILES = [
    { name: "dashboard-mockup.pdf", type: "PDF", mime: "application/pdf", size: 2_400_000, o: "al", sharedIn: "Marketing Team", mins: 34, versions: [["v1.0", "al", 3000], ["v1.1", "mb", 2000], ["v2.0", "al", 34]] as const },
    { name: "brand-guidelines.pdf", type: "PDF", mime: "application/pdf", size: 3_800_000, o: "al", sharedIn: "Design Team", mins: 60 * 24 * 10 },
    { name: "design-system.sketch", type: "SKETCH", mime: "application/octet-stream", size: 15_600_000, o: "mb", sharedIn: "Product Design", mins: 60 * 20 },
    { name: "marketing-plan.pptx", type: "PPTX", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", size: 8_200_000, o: "sj", sharedIn: "Marketing Team", mins: 60 * 24 * 11 },
    { name: "user-research.mp4", type: "MP4", mime: "video/mp4", size: 256_000_000, o: "dw", sharedIn: "Product Design", mins: 60 * 24 * 12, syncing: true },
    { name: "product-roadmap.xlsx", type: "XLSX", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 1_200_000, o: "mb", sharedIn: "Product Team", mins: 60 * 24 * 13 },
    { name: "meeting-notes.docx", type: "DOCX", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 480_000, o: "ja", sharedIn: "Dev Team", mins: 60 * 24 * 13 },
    { name: "logo-variations.png", type: "PNG", mime: "image/png", size: 1_100_000, o: "al", sharedIn: "Design Team", mins: 60 * 24 * 14 },
    { name: "app-flow-diagram.fig", type: "FIG", mime: "application/octet-stream", size: 3_300_000, o: "dt", sharedIn: "Product Design", mins: 60 * 24 * 14 },
    { name: "voice-over-01.mp3", type: "MP3", mime: "audio/mpeg", size: 5_600_000, o: "om", sharedIn: "Marketing Team", mins: 60 * 24 * 15, syncing: true },
    { name: "competitor-analysis.pdf", type: "PDF", mime: "application/pdf", size: 2_700_000, o: "sl", sharedIn: "Product Team", mins: 60 * 24 * 16 },
    { name: "wireframes-v2.sketch", type: "SKETCH", mime: "application/octet-stream", size: 22_400_000, o: "al", sharedIn: "Design Team", mins: 60 * 24 * 17 },
  ];
  for (const f of FILES) {
    const key = `seed/${f.name}`;
    const file = await prisma.file.upsert({
      where: { storageKey: key },
      update: {},
      create: {
        organizationId: org.id,
        ownerId: users[f.o as keyof typeof GRAD]!.id,
        name: f.name,
        type: f.type,
        mime: f.mime,
        sizeBytes: BigInt(f.size),
        storageKey: key,
        status: (f as any).syncing ? FileStatus.PROCESSING : FileStatus.READY,
        sharedIn: f.sharedIn,
        createdAt: minsAgo(f.mins + 100),
        updatedAt: minsAgo(f.mins),
      },
    });
    if ("versions" in f && f.versions) {
      for (const [v, author, m] of f.versions) {
        await prisma.fileVersion.upsert({
          where: { fileId_version: { fileId: file.id, version: v } },
          update: {},
          create: {
            fileId: file.id, version: v, storageKey: `${key}#${v}`, sizeBytes: BigInt(f.size),
            authorId: users[author as keyof typeof GRAD]!.id, createdAt: minsAgo(m as number),
          },
        });
      }
    }
    if (f.name === "dashboard-mockup.pdf") {
      await prisma.fileStar.upsert({
        where: { fileId_userId: { fileId: file.id, userId: jd.id } },
        update: {},
        create: { fileId: file.id, userId: jd.id },
      });
      const commentCount = await prisma.fileComment.count({ where: { fileId: file.id } });
      if (commentCount === 0) {
        await prisma.fileComment.create({
          data: { fileId: file.id, authorId: mb.id, body: "Looks great! The new charts really improve clarity.", createdAt: minsAgo(20) },
        });
        await prisma.fileComment.create({
          data: { fileId: file.id, authorId: users.ed!.id, body: "Can we add a filter for date range?", createdAt: minsAgo(10) },
        });
      }
    }
  }

  // --- Statuses ------------------------------------------------------------
  const existingStatus = await prisma.status.findFirst({ where: { ownerId: al.id, deletedAt: null } });
  if (!existingStatus) {
    const st = await prisma.status.create({
      data: {
        ownerId: al.id,
        caption: "Kickstarting our design sprint in the mountains!\nFocus, clarity, and great ideas. 🌲",
        mediaStyle: "linear-gradient(178deg,#2b3a55 0%,#41556f 22%,#7c8ba0 38%,#4d6b52 58%,#274a44 76%,#173038 100%)",
        audience: `group:${design.g.id}`,
        createdAt: minsAgo(34),
        expiresAt: new Date(Date.now() + 23 * 3600_000),
      },
    });
    const viewers = ["mb", "sj", "dw", "om", "ja", "dt", "sl", "mt", "ed", "wc", "ar"] as const;
    await prisma.statusView.createMany({
      data: viewers.map((k) => ({ statusId: st.id, userId: users[k]!.id })),
      skipDuplicates: true,
    });
    const reactions: [string, (keyof typeof GRAD)[]][] = [
      ["❤️", ["mb", "sj", "dw", "om", "dt", "sl"]],
      ["👍", ["ja", "mt", "ed", "wc"]],
      ["🔥", ["ar", "mb"]],
      ["👏", ["sj"]],
    ];
    for (const [emoji, keys] of reactions) {
      for (const k of keys) {
        await prisma.statusReaction.create({ data: { statusId: st.id, userId: users[k]!.id, emoji } }).catch(() => void 0);
      }
    }
    // more recent statuses for the feed
    for (const [k, mins] of [["mb", 8], ["sj", 35], ["dw", 120], ["om", 180]] as const) {
      await prisma.status.create({
        data: {
          ownerId: users[k]!.id,
          caption: null,
          mediaStyle: "linear-gradient(150deg,#2c2650,#1a1538 55%,#0e0b22)",
          audience: "org",
          createdAt: minsAgo(mins),
          expiresAt: new Date(Date.now() + 20 * 3600_000),
        },
      });
    }
    // John has viewed David's and Olivia's
    const viewed = await prisma.status.findMany({ where: { ownerId: { in: [dw.id, users.om!.id] } } });
    await prisma.statusView.createMany({
      data: viewed.map((v) => ({ statusId: v.id, userId: jd.id })),
      skipDuplicates: true,
    });
  }

  // --- Group events & announcements (Marketing Team) -----------------------
  const mg = await prisma.group.findUnique({ where: { organizationId_name: { organizationId: org.id, name: "Marketing Team" } } });
  if (mg) {
    const evCount = await prisma.groupEvent.count({ where: { groupId: mg.id } });
    if (evCount === 0) {
      await prisma.groupEvent.createMany({
        data: [
          { groupId: mg.id, name: "Campaign Planning Sync", startsAt: new Date(Date.now() + 5 * 86400_000), location: "Online" },
          { groupId: mg.id, name: "Q2 Content Review", startsAt: new Date(Date.now() + 12 * 86400_000), location: "Conference Room B" },
          { groupId: mg.id, name: "Brand Strategy Workshop", startsAt: new Date(Date.now() + 19 * 86400_000), location: "Online" },
        ],
      });
      await prisma.groupAnnouncement.createMany({
        data: [
          { groupId: mg.id, authorId: sj.id, title: "Q2 Campaign Kickoff", body: "We're excited to kick off our Q2 campaign…", createdAt: minsAgo(60 * 24 * 3) },
          { groupId: mg.id, authorId: sj.id, title: "New Brand Guidelines", body: "Our updated brand guidelines are now available.", createdAt: minsAgo(60 * 24 * 10) },
          { groupId: mg.id, authorId: sj.id, title: "Marketing Offsite Recap", body: "Thanks to everyone who joined our offsite!", createdAt: minsAgo(60 * 24 * 18) },
        ],
      });
    }
  }

  // --- Notifications for John ---------------------------------------------
  const notifCount = await prisma.notification.count({ where: { userId: jd.id } });
  if (notifCount === 0) {
    await prisma.notification.createMany({
      data: [
        { userId: jd.id, actorId: al.id, type: "mention", title: "Alice Johnson mentioned you", body: "in Design Team: “@John can you review the new tokens?”", deepLink: "/app/chats/design", createdAt: minsAgo(5) },
        { userId: jd.id, type: "announcement", title: "New announcement", body: "Company Announcements: All-hands meeting Friday at 10 AM.", deepLink: "/app/chats/announcements", createdAt: minsAgo(60) },
        { userId: jd.id, actorId: sj.id, type: "file_shared", title: "File shared with you", body: "Sarah Johnson shared marketing-plan.pptx in Marketing Team.", deepLink: "/app/files", createdAt: minsAgo(120) },
        { userId: jd.id, actorId: mb.id, type: "missed_call", title: "Missed call", body: "You missed a video call from Michael Brown.", deepLink: "/app/calls", readAt: minsAgo(60 * 20), createdAt: minsAgo(60 * 22) },
        { userId: jd.id, actorId: users.om!.id, type: "status_reaction", title: "Status reaction", body: "Olivia Martinez reacted ❤️ to your status update.", deepLink: "/app/status", readAt: minsAgo(60 * 20), createdAt: minsAgo(60 * 23) },
      ],
    });
  }

  // --- Audit log -----------------------------------------------------------
  const auditCount = await prisma.auditLog.count({ where: { organizationId: org.id } });
  if (auditCount === 0) {
    await prisma.auditLog.createMany({
      data: [
        { organizationId: org.id, actorId: al.id, action: "security.mfa_enabled", target: al.id, createdAt: minsAgo(50) },
        { organizationId: org.id, actorId: mb.id, action: "member.invited", target: "emma.wilson@acmecorp.com", createdAt: minsAgo(74) },
        { organizationId: org.id, actorId: sj.id, action: "file.shared_externally", target: "marketing-plan.pptx", createdAt: minsAgo(107) },
        { organizationId: org.id, actorId: jd.id, action: "member.role_changed", target: dw.id, metadata: { role: "MEMBER" }, createdAt: minsAgo(60 * 24) },
        { organizationId: org.id, action: "retention.statuses_expired", metadata: { count: 214 }, createdAt: minsAgo(60 * 25) },
      ],
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
