# Route Map

## Frontend routes (prototype hash-routes → production paths)
| Prototype | Production | Notes |
|---|---|---|
| #/chats | /app/chats | conversation list, tabs All/Unread/Favorites |
| #/chats/:id | /app/chats/[conversationId] | DM or group thread; detail panel URL-aware |
| #/status | /app/status | feed + viewer + details panel |
| — | /app/status/[statusId] | viewer deep link |
| #/calls | /app/calls | group call stage (prototype) ; production: history + call room |
| — | /app/calls/[callId] | active call room |
| #/groups | /app/groups | directory + group overview panel |
| — | /app/groups/[groupId]/(overview|members|media|files|events|settings) | tabs shown in UI |
| #/contacts | /app/contacts | table + contact detail panel |
| #/files | /app/files | table + file detail panel |
| #/starred, #/archived, #/notifications | /app/... | simple lists |
| #/profile | /app/profile/* | 9 sub-sections in context sidebar |
| #/settings | /app/settings/* | 13 sections in context sidebar |
| #/admin | /app/admin/* | members, workspaces, roles, groups, storage, audit, retention, moderation |
| — | /auth/(login|register|verify-email|forgot-password|reset-password|mfa|invitation) | not designed yet — needs a design pass |

## API surface (per module, /api/v1)
- auth: register, verify, login, logout(-all), forgot/reset, mfa, sessions, devices
- users: me, profile, avatar, presence, custom status, search
- conversations: list(cursor), create, detail, participants, mute, archive, mark-read
- messages: list(cursor), create(idempotency-key), edit, delete, react, reply, pin, star, report
- groups: CRUD, members, roles, invitations, join-requests, announcements, events
- statuses: feed, create, publish, view(idempotent), react, reply, analytics, mute
- files: upload sessions (signed multipart), list, detail, share, comments, versions, trash, quota
- calls: create, ring, accept/reject, join-token, participants, end, history
- notifications: list, mark-read, mark-all, archive, preferences
- settings: read/update per section, org-policy overrides
- admin: members, roles, workspaces, storage, audit(search/export), retention, moderation
