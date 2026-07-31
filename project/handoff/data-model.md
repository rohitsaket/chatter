# Data Model (implied by the UI)

## Core entities
users(id, name, title, department, phone, email, presence, avatar, timezone)
organizations / workspaces / memberships(role: Owner|Admin|Moderator|Member|Guest)
contacts(favorites, requests, blocks, notes, tags)
conversations(kind: dm|group, participants, unread_count, pinned_message, muted, archived)
messages(id, conversation_id, sender, text, attachments[], reply_to, reactions[],
  poll?, state: pending|sent|delivered|read, edited, deleted, idempotency_key)
polls(question, options[], votes, closes_at)
groups(name, privacy, description, tags[], members[], events[], announcements[], pinned_posts[])
statuses(owner, media, caption, audience, expires_at 24h, views[], reactions[], replies[])
files(name, type, size, owner, shared_in, versions[], comments[], status: ready|syncing, starred)
calls(kind: dm|group, participants[], duration, quality, chat_messages[], recordings[])
notifications(type, actor, target, read, deep_link)
settings(per-user: theme, accent, layout, font_size, wallpaper, startup, previews, ...)
audit_logs(actor, action, target, time)

## Seed data used in the prototype (keep for parity)
Users: John Doe (you), Alice Johnson, Michael Brown, Sarah Johnson, David Wilson,
Olivia Martinez, James Anderson, Daniel Thomas, Sophia Lee, Matthew Taylor,
Emily Davis, William Clark, Ava Rodriguez.
Groups: Design Team, Marketing Team, Project Phoenix, Product Design, Sales
Enablement, HR Community, IT Support, Dev Team, Friends Group, Company Announcements.
Key objects: dashboard-mockup.pdf (v2.0, 2.4MB, Alice), design-system.sketch,
brand-guidelines.pdf, Design Team poll (Compact 67% / Expanded 33%), Alice's
mountain status (56 viewers: 52 viewed / 4 not / muted —; reactions 24❤ 15👍 7🔥 3👏).
