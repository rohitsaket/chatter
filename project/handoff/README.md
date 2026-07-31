# Chatter — Developer Handoff Package

Source of truth: `Chatter.dc.html` (interactive front-end prototype, simulated data).
This package specs everything a full-stack team (or a coding agent like Claude Code)
needs to implement the real product behind this UI.

## Contents
- `routes.md` — full route map (frontend + suggested API surface)
- `components.md` — reusable component inventory per module
- `tokens.md` — design tokens (colors, type, spacing, radius, motion)
- `data-model.md` — entities implied by the UI + seed data
- `realtime-events.md` — realtime event contract implied by the UI

## What the prototype already proves
- App shell: 218px primary sidebar / 250–330px context sidebar / flexible main / 300–320px detail panel; min-width 1280px with horizontal scroll fallback; mobile (<760px) single-panel shell with bottom navigation.
- Hash deep links: #/chats/<conversationId>, #/status, #/calls, #/groups, #/contacts, #/files, #/starred, #/archived, #/notifications, #/settings, #/profile, #/admin — browser back/forward works.
- Working simulated interactions: send message, unread clearing, chat list tabs (All/Unread/Favorites), status auto-advance + reactions, theme light/dark, 6 accent palettes, settings toggles/segmented controls/slider, call mute/camera state.

## What is intentionally NOT in the prototype
Real auth, persistence, WebSockets, file storage, WebRTC. Every simulated action
maps to an API + event in routes.md / realtime-events.md. Avatars are initials
placeholders; drop real photos into the design when available.
