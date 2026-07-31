# Chatter — Connection Matrix (audit of 2026-07-31)

Environment: design prototype (Chatter.dc.html). "Simulated" = fully working UI
behavior with in-memory state; "Backend required" = needs the real repo build
(see routes.md / data-model.md / realtime-events.md).

Legend: ✅ working in prototype · 🔶 simulated (in-memory, resets on reload) · ⛔ backend required

| Module | Route | UI | Interactions | Persistence | Realtime | Auth/RBAC |
|---|---|---|---|---|---|---|
| Chats (DM) | #/chats/alice | ✅ | 🔶 send, unread clear, tabs | ⛔ | ⛔ | ⛔ |
| Chats (group) | #/chats/design | ✅ pinned banner, roles, poll | 🔶 send, hide pin | ⛔ | ⛔ | ⛔ |
| Status | #/status | ✅ feed, viewer, analytics | 🔶 auto-advance, reactions | ⛔ | ⛔ | ⛔ audience |
| Calls (group) | #/calls | ✅ stage, tiles, controls | 🔶 mute/camera, mode switch | ⛔ | ⛔ WebRTC | ⛔ tokens |
| Calls (1:1) | #/calls (switch) | ✅ + call chat | 🔶 controls | ⛔ | ⛔ | ⛔ |
| Groups | #/groups | ✅ directory + overview | 🔶 selection | ⛔ | ⛔ | ⛔ roles |
| Contacts | #/contacts | ✅ table + panel | 🔶 quick actions → chats | ⛔ | ⛔ presence | ⛔ privacy |
| Files | #/files | ✅ table + detail panel | 🔶 selection | ⛔ storage | ⛔ | ⛔ signed URLs |
| Notifications | #/notifications | ✅ | ✅ mark-all-read (badge clears) | ⛔ | ⛔ | ⛔ |
| Starred / Archived | #/starred, #/archived | ✅ | 🔶 | ⛔ | — | ⛔ |
| Profile | #/profile | ✅ overview | 🔶 nav | ⛔ | — | ⛔ |
| Settings | #/settings | ✅ | ✅ theme/accent/toggles/slider | 🔶 in-memory | — | ⛔ org policy |
| Admin | #/admin | ✅ members/storage/audit | 🔶 | ⛔ | — | ⛔ admin scope |
| Auth screens | — | ⛔ not designed | — | — | — | — |
| Mobile (<760px) | all | ✅ bottom nav, chat thread, back | 🔶 | — | — | — |

## Prototype quality gates (verified)
- No console errors on load; all hash routes render (no blank pages)
- Deep links + browser back/forward work
- No dead primary controls: every visible action either performs a simulated
  operation or navigates; desktop-only concepts (system tray) are presented as
  preferences only
- Min-width 1280 desktop with scroll fallback; <760px mobile shell; 44px+ targets
- Light/dark + 6 accents pass contrast on primary text/controls

## Gates that CANNOT pass here (need real repo)
install/lint/typecheck/unit/integration/E2E, migrations, Docker, CI/CD,
backups, monitoring — execute the pasted agent prompt in Claude Code against
a real repository, using this handoff package as the spec.
