# Build review request

_Started 2026-07-31 06:36 UTC_

---

## User

check and build it

## User

check and build it

## User

Questions answered:
- scope: All 10 screens as one connected prototype
- interactivity: Working navigation between all screens, Sending messages updates the chat (local, simulated), Status viewer with auto-advance & reactions, Working settings toggles (theme, accent color), Static pixel-perfect mockups are enough, all
- data: Use the exact seed people/groups from the prompt (John Doe, Alice Johnson, Design Team…)
- photos: Use neutral placeholder avatars (initials/silhouettes)
- dark: Yes, light + dark
- responsive: Desktop + mobile layouts
- priority_screens: Chats / direct messaging, Group conversation, Status feed + viewer, Calls (1:1 video + group call), Files, Contacts, Groups directory, Profile, Settings, All equally, other features

## Assistant

Building the connected prototype now — one `Chatter.dc.html`, starting with the app shell + Chats (DM and group threads), then layering in the other modules.

_[tool: update_todos]_

_[tool: dc_write]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now Groups, Contacts, and Files modules:

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

Now Calls, Profile, Settings, and the lighter Notifications/Starred/Archived views:

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: show_html]_

_[tool: ready_for_verification]_

First pass of the full prototype is out for review — all 10 screens are in one connected app: Chats (DM + Design Team group thread with pinned banner, poll, reactions), Status feed/viewer/analytics, group call + 1:1 call with call chat, Groups directory + Marketing Team overview, Contacts, Files, Profile, Settings, plus Notifications/Starred/Archived.

Working interactions: navigation, sending messages (Enter or send button), status auto-advance + reaction bumping, theme toggle (moon icon or Settings → Theme), live accent-color swatches, toggles/segmented controls, mute/camera state in calls.

Still to come after review feedback: mobile layouts, and photo drops if you upload real portraits (avatars are initials placeholders for now).

## User

Found issues — fixing…

## User

Found issues — fixing…

## User

now check

## Assistant

I checked — and I need to be straight with you about scope.

**What this environment is:** a design/prototyping tool. There's no Node runtime, PostgreSQL, Redis, Docker, or server here — nothing to run migrations, APIs, WebSockets, or CI/CD on. I cannot execute that prompt's backend requirements, no matter how it's phrased. What exists today is `Chatter.dc.html`: a connected, interactive front-end prototype with simulated (in-memory) data — verified rendering cleanly across all 10 modules.

**What I can genuinely do from here:**

1. **Deepen the prototype** — make every visible control do something honest within the simulation: URL-style deep links per conversation/group/file, more working actions (star, archive, mark-read, join call flow, upload progress simulation), loading/empty/error states, the admin screens, and the promised **mobile/tablet layouts**.
2. **Developer handoff package** — a structured spec bundle derived from this prototype (screen inventory, route map, component inventory, design tokens, data model notes) that you'd hand to Claude Code or an engineering team along with your backend prompt. That's the correct tool for the "build the real platform" job — it has a filesystem, terminals, and can run Postgres/Docker/tests.
3. Both.

Which way do you want to go? If it's the handoff, I'll generate it now so your backend prompt lands on an agent that can actually execute it.

## User

Both

## Assistant

Building both now: deeper prototype (hash deep-links, working tabs/unread, admin screens, mobile layout) first, then the handoff package.

_[tool: update_todos]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: get_webview_logs]_

Now the handoff package:

_[tool: run_script]_

_[tool: update_todos]_

_[tool: present_fs_item_for_download]_

_[tool: ready_for_verification]_

Both done, out for review:

**Prototype upgrades** — hash deep links (`#/chats/design` etc., back/forward works), working All/Unread/Favorites tabs with live unread counts, unread clears when you open a chat, a new Admin module (members, storage, audit), and a mobile layout below 760px: single-panel navigation, chat list → thread with back button, bottom nav with unread badge, 44px+ touch targets.

**Handoff package** — download card above: route map, component inventory, design tokens, data model + seed data, and the realtime event contract. Hand it to Claude Code together with your backend prompt; that environment can actually run Postgres, Docker, and tests.

## User

<pasted_text name="Pasted text (2045 lines)">
# =============================================================================
# CHATTER — AUTONOMOUS FULL-STACK AUDIT, TEST, CONNECTION AND REPAIR AGENT
# EXISTING PROJECT → COMPLETE PRODUCTION-READY CONNECTED APPLICATION
# =============================================================================

## MASTER ROLE

You are an autonomous principal-level full-stack engineering agent working
inside an existing software repository.

You are not acting as:

- A tutorial writer
- A documentation-only assistant
- A planning-only assistant
- A code-snippet generator
- A frontend mockup creator
- A passive code reviewer

You are acting as a complete senior product-engineering team responsible for
inspecting, running, testing, repairing, connecting, securing, optimizing and
validating the entire application.

Act simultaneously as:

- Principal Software Architect
- Principal Full-Stack Engineer
- Senior Frontend Engineer
- Senior Backend Engineer
- Database Architect
- API Architect
- Real-Time Systems Engineer
- WebSocket Engineer
- WebRTC Engineer
- DevOps Engineer
- Site Reliability Engineer
- Security Architect
- QA Automation Architect
- Accessibility Engineer
- Performance Engineer
- Production Readiness Reviewer

Your job is to work directly in the repository, make real file changes, execute
commands, run tests, identify problems, fix them, rerun validation and continue
until the project is production-ready or a genuine external blocker prevents
completion.

Do not merely tell me what is wrong.

Find the problem and fix it.

Do not stop after an audit report.

Do not stop after creating a checklist.

Do not stop after scaffolding.

Do not ask for permission before every normal development action.

Do not ask “Should I continue?”

Continue automatically through all stages.

# =============================================================================
# 1. PRIMARY OBJECTIVE
# =============================================================================

The existing Chatter project may currently contain:

- Screenshot-based frontend pages
- Incomplete routes
- Static mock data
- Missing backend services
- Missing APIs
- Missing database tables
- Broken page connections
- Dead buttons
- Fake authentication
- Missing permissions
- Missing WebSocket functionality
- Missing object storage
- Missing tests
- Build errors
- TypeScript errors
- Runtime errors
- Security weaknesses
- Inconsistent UI states
- Unfinished modules

Transform the existing repository into a complete, connected, tested and
production-ready full-stack communication platform.

The final system must include and connect:

- Frontend pages
- Frontend routes
- Backend APIs
- PostgreSQL database
- Database migrations
- Seed data
- Authentication
- Secure sessions
- Organizations
- Workspaces
- Users and profiles
- Contacts
- Presence
- Direct messaging
- Group messaging
- Groups
- Status updates
- Files
- File sharing
- File comments
- File versions
- Notifications
- Search
- User settings
- Privacy settings
- Security settings
- Roles and permissions
- Audit logs
- Background workers
- Redis
- WebSocket real-time communication
- Voice and video call infrastructure
- Docker configuration
- Automated tests
- CI/CD
- Monitoring
- Backup and restore readiness
- Production deployment configuration

Every important UI action must be connected to a real backend operation.

Every backend operation must use real database records.

Every protected operation must enforce authorization server-side.

# =============================================================================
# 2. AUTONOMOUS EXECUTION RULES
# =============================================================================

You must operate autonomously.

Do not wait after each stage.

Use this continuous loop:

1. Inspect
2. Run
3. Detect
4. Diagnose
5. Fix
6. Test
7. Verify
8. Continue

Continue this loop until all quality gates pass.

You may stop only when:

- A required external credential is unavailable
- A required third-party account is unavailable
- A destructive production decision requires explicit approval
- A legal or billing decision cannot safely be inferred
- The repository is corrupted or incomplete in a way that cannot be repaired

When blocked:

- Complete all work that does not depend on the blocker
- Implement a clean provider interface
- Add a functional local-development fallback where possible
- Add a truthful configuration error state
- Document the exact missing requirement
- Do not fake success

Do not use unavailable external services as an excuse to leave unrelated work
unfinished.

# =============================================================================
# 3. SAFETY AND REPOSITORY PRESERVATION
# =============================================================================

Before changing files:

- Inspect the repository structure
- Identify the current stack
- Identify existing working code
- Identify generated directories
- Identify package managers
- Identify existing migrations
- Identify existing environment configuration
- Identify current Git state if available

Preserve working code wherever practical.

Do not:

- Delete the project and recreate it without a strong technical reason
- Replace the existing UI unnecessarily
- Destroy screenshot-based design fidelity
- Rewrite the entire stack only because another stack is preferred
- Delete migrations without understanding them
- Remove tests to make the project pass
- Disable type checking
- Disable lint rules without a valid reason
- Use force flags carelessly
- Commit secrets
- print credentials in logs
- modify production data directly
- execute destructive database reset commands against a production database

Never read, display, commit or expose real secret values.

Use `.env.example` with placeholders.

Ignore generated and dependency directories when reviewing source:

- node_modules
- .next
- dist
- build
- coverage
- .turbo
- generated binaries
- cache folders
- vendor folders unless they contain custom code

# =============================================================================
# 4. INITIAL DEEP REPOSITORY AUDIT
# =============================================================================

Begin by inspecting the entire meaningful repository.

Read and understand:

- Root package files
- Package manifests
- Lockfiles
- Workspace configuration
- Turborepo or build configuration
- TypeScript configuration
- ESLint configuration
- Formatting configuration
- Environment schemas
- Frontend routes
- Backend routes
- API controllers
- Services
- Repositories
- Database schema
- Database migrations
- Seed scripts
- Components
- Hooks
- Stores
- API clients
- WebSocket code
- File-upload code
- Authentication code
- Authorization code
- Middleware
- Tests
- Dockerfiles
- Docker Compose
- CI workflows
- Deployment files
- Documentation relevant to implementation

Identify:

- Current frontend framework
- Current backend framework
- Current database
- Current ORM
- Current authentication system
- Current route structure
- Current API structure
- Current state-management strategy
- Existing real-time implementation
- Existing file-storage implementation
- Existing testing tools
- Existing deployment method

Search for incomplete or suspicious implementation patterns:

- TODO
- FIXME
- HACK
- XXX
- mock
- fake
- demo
- placeholder
- coming soon
- console.log
- alert(
- hardcoded
- localStorage
- sessionStorage
- setTimeout used as fake API behavior
- empty event handlers
- disabled lint rules
- `any`
- ignored TypeScript errors
- `@ts-ignore`
- hardcoded API URLs
- hardcoded credentials
- static user arrays
- static message arrays
- static group arrays
- static contact arrays
- static file arrays
- static notification arrays
- unimplemented routes
- buttons without handlers
- forms without submit logic
- API calls without error handling
- database queries without tenant scope
- unrestricted object-storage access

Create a persistent implementation checklist.

Do not stop after creating it.

Immediately continue to execution.

# =============================================================================
# 5. BASELINE EXECUTION AND FAILURE CAPTURE
# =============================================================================

Before major refactoring, establish the current baseline.

Detect the package manager and run the appropriate commands.

At minimum attempt:

- Dependency installation
- Formatting check
- Lint
- Type checking
- Unit tests
- Integration tests
- End-to-end tests if configured
- Frontend production build
- Backend production build
- Worker production build
- Database schema validation
- Migration validation
- Docker Compose validation

Capture failures with:

- Command
- Exit code
- Relevant error
- Affected module
- Root cause
- Repair action

Do not repeatedly rerun the same failing command without changing anything.

Fix root causes rather than hiding errors.

After each repair batch, rerun the relevant checks.

# =============================================================================
# 6. REQUIRED PROJECT ARCHITECTURE
# =============================================================================

Preserve the current architecture if it is production-capable.

Where architecture is missing or inadequate, move toward this structure:

apps/
  web/
  api/
  worker/

packages/
  ui/
  database/
  contracts/
  validation/
  permissions/
  config/
  logger/
  observability/
  storage/
  realtime/
  notifications/
  search/
  calls/
  test-utils/

infra/
  docker/
  scripts/
  deployment/
  monitoring/
  runbooks/

Preferred production stack:

Frontend:

- Next.js
- React
- TypeScript strict mode
- Tailwind CSS
- TanStack Query
- Zustand only for local UI state
- React Hook Form
- Zod
- Socket.IO client
- Playwright
- Accessible headless UI primitives

Backend:

- Node.js
- TypeScript strict mode
- NestJS or a well-structured modular Express application
- REST API
- Socket.IO WebSocket gateway
- OpenAPI
- Structured logs
- Health checks

Database and infrastructure:

- PostgreSQL
- Prisma ORM or equivalent mature ORM
- Redis
- BullMQ
- S3-compatible private object storage
- MinIO for local development
- Docker Compose
- CI/CD

Calling:

- WebRTC
- LiveKit or equivalent SFU
- TURN/STUN
- Server-issued expiring room tokens

Do not rewrite an equivalent working technology merely to match this preference.

# =============================================================================
# 7. PRESERVE AND REPAIR THE EXISTING UI
# =============================================================================

The screenshot-based Chatter interface must be preserved where it is already
implemented correctly.

Preserve:

- Global sidebar
- Context sidebar
- Main workspace
- Right-side information panel
- Purple branding
- Cards
- Tables
- Chat layouts
- Status viewer
- Groups pages
- Contacts pages
- Files pages
- Profile pages
- Settings pages
- Direct-call layout
- Group-call layout

Refactor only when needed to:

- Connect real data
- Fix routing
- Remove duplication
- Improve responsive behavior
- Add accessibility
- Add loading states
- Add empty states
- Add error states
- Enforce permissions
- Improve performance
- Improve maintainability

Do not replace the finished UI with generic unstyled components.

# =============================================================================
# 8. ROUTE AUDIT AND PAGE CONNECTION
# =============================================================================

Build a route registry from the codebase.

Verify that every navigation item and action points to a valid route.

Required route coverage should include equivalent routes for:

Authentication:

- Login
- Registration
- Verify email
- Forgot password
- Reset password
- MFA
- Invitation acceptance
- Onboarding

Main application:

- Chats
- Individual conversation
- Status feed
- Status viewer
- Calls
- Active call
- Groups
- Group overview
- Group members
- Group media
- Group files
- Group events
- Group settings
- Contacts
- Contact profile
- Files
- File detail
- Starred
- Archived
- Notifications
- Profile
- Preferences
- Privacy
- Security
- Devices
- Integrations
- Billing readiness
- Settings sections
- Administration sections

For every route verify:

- Route exists
- Page renders
- Authentication guard works
- Permission guard works
- Loading boundary exists
- Error boundary exists
- Not-found behavior exists
- Deep links work
- Browser back works
- Browser forward works
- Detail-panel URL state works
- Mobile navigation works
- Deleted-resource behavior works
- Unauthorized access is denied safely

Find and fix:

- 404 routes
- Incorrect route parameters
- Broken nested layouts
- Dead links
- Wrong redirects
- Redirect loops
- Missing dynamic pages
- Pages that cannot be refreshed directly
- Client-only selected state that is lost on refresh
- Tabs not reflected in the URL

# =============================================================================
# 9. DATABASE IMPLEMENTATION AND REPAIR
# =============================================================================

Inspect the current schema.

Create or repair a normalized PostgreSQL schema.

Required domain areas:

Identity:

- Users
- Profiles
- Email addresses
- Phone numbers
- Sessions
- Trusted devices
- Login attempts
- Login history
- MFA methods
- Recovery codes

Tenancy:

- Organizations
- Organization members
- Workspaces
- Workspace members
- Invitations
- Departments
- Teams
- Reporting relationships

Authorization:

- Roles
- Permissions
- Role permissions
- Member roles
- Resource scopes

Contacts:

- Contacts
- Contact requests
- Favorites
- Blocks
- Notes
- Tags

Messaging:

- Conversations
- Conversation participants
- Preferences
- Mutes
- Archives
- Drafts
- Messages
- Message versions
- Reactions
- Mentions
- Attachments
- Delivery receipts
- Read receipts
- Stars
- Pins
- Reports

Groups:

- Groups
- Group members
- Group roles
- Group permissions
- Invitations
- Join requests
- Tags
- Announcements
- Events
- Event attendees
- Pinned posts

Statuses:

- Statuses
- Status items
- Media
- Audiences
- Audience members
- Views
- Reactions
- Replies
- Mutes
- Shares

Files:

- Files
- File versions
- Folders
- Permissions
- Shares
- Comments
- Previews
- Upload sessions
- Upload parts
- Malware scan results
- Storage quotas
- Storage usage snapshots

Calls:

- Calls
- Participants
- Invitations
- Events
- Messages
- Recordings
- Recording consent
- Quality reports

Notifications and preferences:

- Notifications
- Notification deliveries
- Notification preferences
- User preferences
- Privacy preferences
- Chat preferences
- Call preferences
- Accessibility preferences

Operations:

- Audit logs
- Idempotency keys
- Outbox events
- Inbox events
- Background jobs
- Moderation cases
- Retention policies
- Integrations
- Webhook deliveries

Database requirements:

- Use secure public identifiers
- Add foreign keys
- Add unique constraints
- Add tenant boundaries
- Add useful check constraints
- Add indexes
- Add cursor-pagination indexes
- Use transactions
- Prevent cross-tenant relationships
- Separate active, archived and deleted states
- Avoid unbounded queries
- Avoid N+1 queries
- Add migration tests
- Create real migrations
- Do not edit migration history carelessly
- Create database-backed seed data

Run migrations against a safe development database.

Fix all migration failures.

# =============================================================================
# 10. AUTHENTICATION AND SESSION REPAIR
# =============================================================================

Inspect the existing authentication implementation.

Replace fake authentication with real authentication.

Implement or repair:

- Registration
- Email verification
- Login
- Logout
- Logout all sessions
- Forgot password
- Password reset
- Password-strength rules
- MFA
- Recovery codes
- Trusted devices
- Active sessions
- Login history
- Account lockout
- Rate limiting
- Security alerts
- Reauthentication for sensitive actions

Security rules:

- Hash passwords with Argon2id or another modern adaptive hash
- Never store readable passwords
- Never store readable recovery codes
- Use secure HttpOnly cookies where applicable
- Protect mutations against CSRF
- Rotate sessions
- Revoke sessions
- Prevent user enumeration
- Validate authentication on WebSocket connections
- Revoke WebSocket access when sessions are revoked

Test authentication end to end.

# =============================================================================
# 11. TENANT ISOLATION AND RBAC
# =============================================================================

Implement or repair:

- Organizations
- Workspaces
- Membership
- Invitations
- Guest accounts
- Suspensions
- Member removal
- Workspace switching
- Organization policies
- Workspace policies

Never trust a tenant identifier supplied by the frontend.

Derive access through authenticated membership.

Implement backend-enforced roles:

- Organization owner
- Organization administrator
- Workspace administrator
- Compliance viewer
- Group owner
- Group administrator
- Group moderator
- Member
- Guest
- External contact

Implement custom-role support where architecture permits.

Add server-side permission checks for:

- User administration
- Workspace administration
- Group management
- Posting
- Message deletion
- Pinning
- File upload
- File sharing
- File download
- Calls
- Recording
- Audit viewing
- Retention management
- Moderation

Create automated tests proving cross-tenant denial.

# =============================================================================
# 12. FRONTEND AND API CONNECTION
# =============================================================================

Find every frontend component using:

- Static arrays
- Hardcoded records
- Mock service functions
- Fake network delays
- Local-only mutations
- Console-based actions
- Browser storage as the authoritative source

Replace them with:

- Typed API client
- Shared contracts
- TanStack Query
- Cursor pagination
- Real mutations
- Optimistic updates
- Rollback
- Cache invalidation
- WebSocket cache updates
- Error handling
- Authentication-expiry handling
- Permission-denied handling

Use Zustand only for client-local UI state.

Do not store authoritative server records redundantly in local state.

For every page verify:

- Data is loaded from API
- API uses database
- Permission is checked
- Mutations persist
- Refresh preserves state
- Other clients receive real-time changes where appropriate

# =============================================================================
# 13. MESSAGING SYSTEM
# =============================================================================

Implement or repair:

- Direct conversations
- Group conversations
- Conversation list
- Cursor pagination
- Unread counts
- Favorites
- Pinning
- Muting
- Archiving
- Drafts
- Last-message preview
- Typing state
- Presence state

Messages must support:

- Text
- Reply
- Reaction
- Mention
- Link
- Image
- Video
- Audio
- Voice note
- File
- Poll
- System event
- Call event
- Announcement

Message states:

- Pending
- Sent
- Delivered
- Read
- Failed
- Retrying
- Edited
- Deleted

Operations:

- Send
- Edit
- Delete
- Reply
- React
- Forward
- Copy
- Pin
- Star
- Report
- Download attachment
- View details

Requirements:

- Client-generated idempotency key
- Transactional creation
- Membership validation
- Permission validation
- Reply references by message ID
- Real-time delivery
- Retry without duplicates
- Multi-device receipt synchronization

Adding a third participant to a direct conversation must create a new group
conversation.

# =============================================================================
# 14. REAL-TIME CONNECTIONS
# =============================================================================

Implement or repair an authenticated WebSocket platform.

Required event categories:

- Presence updates
- Typing updates
- Message creation
- Message editing
- Message deletion
- Reactions
- Delivery receipts
- Read receipts
- Conversation changes
- Group membership
- Group announcements
- Group events
- Status creation
- Status views
- Status reactions
- File processing
- File comments
- Call invitations
- Call participant changes
- Notifications

Requirements:

- Authenticate every connection
- Authorize every room
- Never join rooms based solely on client input
- Support user rooms
- Organization rooms
- Workspace rooms
- Conversation rooms
- Group rooms
- Use Redis adapter for scale
- Support multiple devices
- Handle reconnect
- Recover missed events
- Deduplicate events
- Validate event payloads
- Apply rate limits
- Keep PostgreSQL authoritative

Test room authorization and revoked-session behavior.

# =============================================================================
# 15. CONTACTS AND PRESENCE
# =============================================================================

Implement or repair Redis-backed presence:

- Online
- Away
- Busy
- Do not disturb
- Invisible
- Offline
- Last seen
- Multi-device presence
- Heartbeat
- Disconnect timeout
- Privacy enforcement

Connect the contacts module:

- All contacts
- Favorites
- Online
- Recent
- Requests
- Organization directory
- External contacts
- Blocked
- Search
- Filter
- Sort
- Notes
- Tags
- Shared groups
- Shared files

Every row action and detail-panel action must work.

# =============================================================================
# 16. GROUPS
# =============================================================================

Implement or repair:

- Create group
- Public/private/unlisted visibility
- Group icon
- Cover
- Description
- Tags
- Members
- Invitations
- Join requests
- Roles
- Linked group conversation
- Announcements
- Events
- Media
- Files
- Pinned messages
- Settings
- Archive
- Restore
- Leave
- Delete

Connect all tabs:

- Overview
- Members
- Media
- Files
- Events
- Settings

Enforce permissions for:

- Invite
- Remove
- Suspend
- Promote
- Demote
- Transfer ownership
- Edit group
- Create announcement
- Create event
- Start call
- Manage files
- Archive
- Delete

# =============================================================================
# 17. STATUS MODULE
# =============================================================================

Implement or repair:

- Text status
- Image status
- Video status
- Caption
- Audience selection
- Selected users
- Selected groups
- Workspace audience
- Organization audience
- Exclusions
- Publish
- View
- React
- Reply
- Share
- Mute creator
- Analytics
- Archive
- Delete
- Expire

Requirements:

- Backend audience authorization
- Idempotent views
- Configurable expiration
- Background expiration job
- Owner-only analytics
- Real conversation linkage for replies
- Real-time updates
- Safe media access

# =============================================================================
# 18. FILE MANAGEMENT
# =============================================================================

Connect the existing Files interface to real private object storage.

Implement or repair:

- Listing
- Search
- Filter
- Sort
- Grid view
- Table view
- Upload
- Multipart upload
- Progress
- Retry
- Cancel
- Malware scanning
- Quarantine
- Processing
- Preview
- Download
- Share
- Permissions
- Comments
- Versions
- Trash
- Restore
- Permanent deletion
- Quotas

Required upload flow:

1. Client requests authorized upload session
2. Backend validates permission
3. Backend validates storage quota
4. Backend returns signed upload information
5. Client uploads directly to private storage
6. Client completes upload
7. Backend verifies object
8. Worker scans and processes file
9. Preview is generated
10. File becomes available
11. Clients receive real-time status

Never expose permanent public object-storage URLs.

Audit sensitive downloads and shares.

# =============================================================================
# 19. CALLS
# =============================================================================

Inspect the existing call UI.

Do not leave it as a visual-only simulation.

Implement or repair:

- Call records
- Call history
- Incoming call
- Outgoing call
- Voice call
- Direct video call
- Group video call
- Participant invitations
- Mute
- Camera
- Device selection
- Screen sharing
- Chat
- Participant controls
- Host controls
- Raise hand
- Reactions
- Network state
- Reconnect
- Audio-only fallback
- Recording-ready workflow
- Call completion

Use LiveKit or another suitable SFU.

Requirements:

- Backend-authorized room access
- Expiring room tokens
- Verified provider webhooks
- TURN/STUN configuration
- Visible recording state
- Recording permission
- Consent notification
- Truthful error state when provider configuration is missing

Do not fake successful media connections.

# =============================================================================
# 20. NOTIFICATIONS
# =============================================================================

Implement or repair notifications for:

- Messages
- Mentions
- Replies
- Reactions
- Group invitations
- Contact requests
- Events
- File shares
- File comments
- Status replies
- Incoming calls
- Missed calls
- Recordings
- Security alerts
- Administrative actions

Connect:

- Notification list
- Unread count
- Mark read
- Mark all read
- Archive
- Delete
- Filters
- Deep links
- WebSocket delivery
- Email delivery
- Browser-notification readiness
- User preferences
- Do-not-disturb schedule
- Per-conversation override

# =============================================================================
# 21. SEARCH
# =============================================================================

Implement or repair permission-aware search for:

- Users
- Contacts
- Conversations
- Messages
- Groups
- Announcements
- Events
- Files
- File comments

Use PostgreSQL full-text and trigram indexes initially.

Requirements:

- Tenant-scoped
- Workspace-scoped
- Permission-aware
- Cursor-paginated
- Highlight matches
- Filterable
- No inaccessible names or snippets
- No deleted-resource leakage
- Future search-provider abstraction

# =============================================================================
# 22. PROFILE, SETTINGS AND DEVICES
# =============================================================================

Connect all profile and settings pages to persisted backend records.

Profile:

- Avatar
- Cover
- Name
- Title
- Bio
- Contact data
- Organization
- Department
- Manager
- Working hours
- Timezone
- Language
- Activity
- Shared groups
- Shared files

Settings:

- General
- Theme
- Accent color
- Message layout
- Font size
- Wallpaper
- Chat
- Notifications
- Privacy
- Security
- Calls
- Files and storage
- Devices
- Accessibility
- Language
- Account

Security:

- Change password
- MFA
- Recovery codes
- Sessions
- Trusted devices
- Login history
- Revoke sessions
- Security alerts

Do not claim browser support for unsupported desktop-only behavior.

Disable it with a truthful explanation or implement it only in a desktop wrapper.

# =============================================================================
# 23. ADMINISTRATION, AUDIT AND MODERATION
# =============================================================================

Implement protected administration routes and APIs.

Include:

- Member management
- Invitations
- Suspensions
- Reactivation
- Removal
- Roles
- Permissions
- Force logout
- Workspace administration
- Group administration
- Storage reporting
- Security policies
- Audit logs
- Retention
- Moderation
- Integrations

Audit important actions:

- Login
- Logout
- Password
- MFA
- Sessions
- Roles
- Membership
- Groups
- Files
- Downloads
- Sharing
- Message moderation
- Status deletion
- Calls
- Recordings
- Administrative changes

Audit data must not be editable by ordinary users.

# =============================================================================
# 24. BACKGROUND WORKERS
# =============================================================================

Implement or repair durable jobs for:

- Verification email
- Password reset
- Invitations
- Notification fan-out
- Email digest
- File scanning
- Metadata extraction
- Thumbnail generation
- Document previews
- Search indexing
- Storage recalculation
- Status expiration
- Retention cleanup
- Recording processing
- Abandoned uploads
- Security alerts
- Webhook retries
- Audit exports

Every job requires:

- Idempotency
- Retry
- Exponential backoff
- Timeout
- Dead-letter handling
- Correlation ID
- Structured logs
- Failure monitoring
- Safe reprocessing

# =============================================================================
# 25. ERROR, LOADING AND EMPTY STATES
# =============================================================================

For every page and operation add:

- Initial loading
- Pagination loading
- Skeleton
- Empty state
- Error state
- Retry
- Permission denied
- Not found
- Offline
- Reconnecting
- Partial failure
- Session expired
- Optimistic rollback

Specific scenarios:

- Failed message
- Failed attachment
- Quota exceeded
- Quarantined file
- Expired file link
- Expired status
- Archived group
- Expired invitation
- Call device denied
- Call token expired
- Call provider unavailable
- Search unavailable
- Email unavailable
- Redis unavailable

Do not display raw internal errors to users.

# =============================================================================
# 26. SECURITY HARDENING
# =============================================================================

Implement and validate:

- CSP
- Secure headers
- CSRF protection
- XSS prevention
- Safe HTML sanitization
- SSRF prevention
- Safe redirects
- Request-size limits
- Upload-size limits
- Rate limiting
- Input validation
- URL validation
- Secret redaction
- Private object storage
- Expiring signed URLs
- Tenant isolation
- WebSocket authorization
- Call authorization
- Search authorization

Run and fix:

- Dependency audit
- Static analysis
- Container scan
- Cross-tenant tests
- Broken-object authorization tests
- File-access tests
- Status-audience tests
- WebSocket-room tests
- Call-room tests
- XSS tests
- SSRF tests
- CSRF tests
- Rate-limit tests
- Session revocation tests

Do not only produce a vulnerability report.

Repair discovered vulnerabilities.

# =============================================================================
# 27. ACCESSIBILITY AND RESPONSIVE VALIDATION
# =============================================================================

Target WCAG 2.2 AA.

Implement and test:

- Semantic HTML
- Keyboard navigation
- Visible focus
- Accessible labels
- Accessible icon names
- Dialog focus trapping
- Focus restoration
- Screen-reader announcements
- Accessible tables
- Accessible charts
- Reduced motion
- Non-color indicators
- Form error associations
- Minimum touch targets

Test these viewports:

- 1600×1200
- 1440×900
- 1366×768
- 1280×800
- 1024×768
- 768×1024
- 430×932
- 390×844
- 360×800

Fix:

- Overflow
- Overlapping panels
- Hidden controls
- Broken drawers
- Incorrect call grids
- Unusable mobile tables
- Composer keyboard overlap
- Insufficient touch targets
- Focus loss

Run accessibility automation and fix violations.

# =============================================================================
# 28. PERFORMANCE AND RELIABILITY
# =============================================================================

Implement or verify:

- Cursor pagination
- Virtualized messages
- Virtualized contacts
- Lazy-loaded heavy modules
- Code splitting
- Image optimization
- Thumbnail use
- Correct database indexes
- Redis caching
- Batched read receipts
- Batched presence
- Efficient WebSocket updates
- Database connection pooling
- Slow-query logging
- Graceful shutdown

Test:

- High-volume messaging
- Large groups
- Concurrent sockets
- Large contact directories
- Large uploads
- Concurrent uploads
- Notification fan-out
- Search
- Call-token issuance
- Reconnection
- Worker backlog

Implement graceful degradation for:

- Redis outage
- Queue outage
- Storage outage
- Search outage
- Email outage
- Call-provider outage

# =============================================================================
# 29. AUTOMATED TESTING
# =============================================================================

Create or repair:

Unit tests:

- Domain rules
- Permissions
- Validation
- Message state
- Status audience
- Status expiration
- Quotas
- Notifications
- Retention

Integration tests:

- Authentication
- Sessions
- Organizations
- Workspaces
- Contacts
- Conversations
- Messages
- Groups
- Statuses
- Files
- Calls
- Notifications
- Settings
- Administration

Authorization tests:

- Cross-tenant denial
- Workspace denial
- Conversation denial
- Private group denial
- File denial
- Status denial
- Call-room denial
- Admin denial
- Guest restrictions

End-to-end tests:

- Register
- Verify
- Login
- MFA
- Create organization
- Create workspace
- Invite member
- Start conversation
- Send message
- Reply
- React
- Upload attachment
- Create group
- Add member
- Publish status
- View status
- Upload file
- Share file
- Comment
- Start call
- Join call
- Change settings
- Revoke session

Visual regression tests:

- Chat
- Group chat
- Groups
- Status
- Contacts
- Files
- Profile
- Settings
- Direct call
- Group call

Do not delete failing tests to obtain a green build.

Fix the implementation or correct invalid tests.

# =============================================================================
# 30. DOCKER AND LOCAL DEVELOPMENT
# =============================================================================

Create or repair Docker Compose services for:

- PostgreSQL
- Redis
- MinIO
- Mail testing
- Optional LiveKit

Provide working commands for:

- Install
- Configure environment
- Start infrastructure
- Run migrations
- Seed database
- Start frontend
- Start API
- Start worker
- Run tests
- Run builds
- Reset development data safely

Create a complete `.env.example`.

Validate environment variables at startup.

Fail clearly when required configuration is missing.

# =============================================================================
# 31. CI/CD
# =============================================================================

Create or repair CI for:

- Install
- Format check
- Lint
- Type check
- Unit tests
- Integration tests
- Build
- E2E smoke tests
- Migration validation
- Dependency audit
- Container scan

Create production Dockerfiles for:

- Web
- API
- Worker

Support:

- Staging
- Production
- Managed PostgreSQL
- Managed Redis
- Private object storage
- CDN
- TLS
- Secret management
- Worker scaling
- WebSocket-compatible load balancing
- Health checks
- Safe database migrations
- Rollback

# =============================================================================
# 32. OBSERVABILITY, BACKUPS AND OPERATIONS
# =============================================================================

Implement or repair:

- Structured JSON logs
- Correlation IDs
- Error tracking
- Metrics
- Health endpoint
- Readiness endpoint
- Liveness endpoint
- Database health
- Redis health
- Storage health
- Queue health
- Call-provider health

Monitor:

- Request latency
- Error rate
- Active sockets
- Message throughput
- Queue depth
- Job failures
- Upload failures
- Scan failures
- Storage usage
- Authentication failures
- Call failures

Implement:

- Automated database backups
- Backup monitoring
- Restore procedure
- Restore test
- Rollback procedure
- Incident runbooks

# =============================================================================
# 33. PAGE-TO-BACKEND CONNECTION MATRIX
# =============================================================================

Create and maintain a completion matrix containing:

- Module
- Frontend route
- Frontend component
- API endpoint
- Backend controller
- Backend service
- Database tables
- Authorization rule
- WebSocket event
- Background job
- Unit tests
- Integration tests
- E2E tests
- Current status

Use this matrix to detect disconnected features.

Do not mark a feature complete unless:

- UI exists
- Route works
- API works
- Database persists
- Authorization works
- Tests exist
- Production build passes

# =============================================================================
# 34. AUTOMATIC REPAIR PRIORITY
# =============================================================================

Repair issues in this order:

Priority 1 — Project cannot run:

- Dependency failures
- Environment failures
- Syntax errors
- Type errors
- Migration failures
- Startup failures
- Broken builds

Priority 2 — Security and data integrity:

- Authentication flaws
- Tenant leaks
- Authorization flaws
- Exposed files
- Unsafe uploads
- Secret exposure
- Data corruption risk

Priority 3 — Core connections:

- Frontend to API
- API to database
- Route connections
- Session connections
- WebSocket connections
- File storage connections

Priority 4 — Core user workflows:

- Login
- Messaging
- Groups
- Contacts
- Statuses
- Files
- Notifications
- Calls
- Settings

Priority 5 — Quality:

- Loading states
- Error states
- Accessibility
- Responsive behavior
- Performance
- Testing
- Observability

Priority 6 — Production operations:

- Docker
- CI/CD
- Backups
- Monitoring
- Deployment
- Runbooks

# =============================================================================
# 35. FINAL QUALITY GATES
# =============================================================================

Do not claim completion until all applicable checks pass.

Required:

- Dependencies install successfully
- Formatting passes
- Lint passes
- Type checking passes
- Unit tests pass
- Integration tests pass
- Authorization tests pass
- Critical E2E tests pass
- Frontend production build passes
- Backend production build passes
- Worker production build passes
- Database migrations run successfully
- Seed command works
- Docker Compose works
- No required route returns 404
- No critical button is dead
- No production mock API remains
- No fake authentication remains
- No static JSON is authoritative
- No backend permission relies only on frontend hiding
- No permanent public private-file URL is exposed
- No critical accessibility issue remains
- No critical security finding remains
- No major browser console error remains
- No required module remains a visual-only mockup

# =============================================================================
# 36. PROGRESS REPORTING
# =============================================================================

Keep explanations concise and execution-focused.

At the start report:

- Detected stack
- Repository structure
- Baseline commands
- Initial critical failures
- Implementation checklist

After every meaningful repair batch report:

- Problems found
- Root causes
- Files changed
- Migrations created
- Commands run
- Tests passed
- Tests still failing
- Next automatic repair step
- Genuine blocker, if present

Do not present repeated generic summaries.

Do not say a feature is completed without evidence from code and tests.

# =============================================================================
# 37. FINAL EXECUTION COMMAND
# =============================================================================

Begin immediately.

Inspect the repository.

Run the existing application and quality checks.

Find all errors, incomplete modules, broken routes, disconnected pages,
frontend-only data, mock APIs, missing backend services, missing database
records, missing permissions, missing real-time connections and production
weaknesses.

Then automatically:

- Fix the repository
- Connect all pages
- Connect all routes
- Connect frontend to backend
- Connect backend to PostgreSQL
- Connect authentication and sessions
- Connect permissions
- Connect WebSockets
- Connect file storage
- Connect background workers
- Connect notifications
- Connect calls
- Add tests
- Run tests
- Fix failures
- Run production builds
- Fix failures
- Validate Docker
- Validate migrations
- Validate seed data
- Validate production readiness

Do not stop after auditing.

Do not stop after planning.

Do not stop after scaffolding.

Do not ask whether to continue.

Continue automatically until all quality gates pass or a genuine external
blocker is reached.
</pasted_text>

## Assistant

Same answer as before applies — this prompt needs a repo + runtime (Claude Code territory), which this design environment doesn't have. What I can do is run its audit honestly against what exists here, fix what's actually broken in the prototype, and record the connection matrix it asks for. Doing that now.

One real dead control found: Notifications "Mark all as read" was static text. Fixing it, and making the sidebar notification badge live:

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: run_script]_

_[tool: ready_for_verification]_

_[tool: present_fs_item_for_download]_

Audit done within what this environment can honestly execute:

- **Fixed** the one genuinely dead control found: "Mark all as read" now works — clears the notification dots and the sidebar/mobile badge live.
- **Added** `handoff/connection-matrix.md` — the module-by-module matrix the prompt requires, marking each feature ✅ working / 🔶 simulated / ⛔ backend-required.

The install/typecheck/migrations/Docker/CI gates can't run here — no runtime. To execute that agent prompt for real, open a repo in Claude Code and give it your prompt plus this handoff package as the spec.

## User

<pasted_text name="Pasted text (376 lines)">
# =============================================================================
# STRICT CODING-ONLY MODE — DO NOT GENERATE DOCUMENTATION FILES
# =============================================================================

You must inspect, test, connect, repair and complete the existing application by
changing real implementation files.

Do not create documentation files.

Do not create:

- README.md
- CHANGELOG.md
- ROADMAP.md
- PLAN.md
- TODO.md
- CHECKLIST.md
- AUDIT.md
- REPORT.md
- STATUS.md
- IMPLEMENTATION.md
- ARCHITECTURE.md
- DATABASE.md
- API.md
- SECURITY.md
- TESTING.md
- DEPLOYMENT.md
- PROGRESS.md
- SUMMARY.md
- Any other `.md` file
- Documentation-only `.txt` files
- Architecture-report files
- Audit-report files
- Planning-report files
- Completion-matrix files
- Phase-summary files

Do not create a `docs` directory.

Do not save plans, analysis, audit findings, progress reports, route matrices or
implementation checklists as repository files.

Keep temporary planning and progress tracking internally during execution.

Provide only a concise progress summary in the terminal or final chat response
after performing real implementation work.

Do not modify existing Markdown files unless:

1. The user explicitly requests it, or
2. A build, package or deployment process genuinely requires a specific
   existing file to be corrected.

Even in that situation, modify only the minimum necessary existing file. Do not
generate additional documentation.

The absence of Markdown documentation must never prevent implementation.

# =============================================================================
# REQUIRED BEHAVIOR
# =============================================================================

Begin directly with repository inspection and command execution.

Perform real actions:

- Read source code
- Inspect routes
- Inspect components
- Inspect backend modules
- Inspect database schema
- Install dependencies
- Run the application
- Run formatting
- Run linting
- Run strict type checking
- Run tests
- Run production builds
- Run database validation
- Run migrations
- Test APIs
- Test routes
- Test page connections
- Test permissions
- Test WebSockets
- Test object storage
- Fix every discovered problem
- Rerun all failed checks

Create or modify only implementation-related files, including:

- `.ts`
- `.tsx`
- `.js`
- `.jsx`
- `.css`
- `.scss`
- `.json`
- `.jsonc`
- `.yaml`
- `.yml`
- `.toml`
- `.sql`
- `.prisma`
- `.graphql`
- `.env.example`
- Dockerfiles
- Shell scripts
- CI/CD configuration
- Test files
- Migration files
- Application configuration files

Do not respond to discovered problems by writing a report.

Fix the problems directly.

# =============================================================================
# NO DOCUMENTATION-ONLY PHASES
# =============================================================================

Skip documentation-only outputs from all project phases.

For phases involving discovery, architecture, planning or audits:

- Perform the analysis internally.
- Apply the decisions directly to the implementation.
- Do not create specification files.
- Do not create phase documents.
- Do not create architecture documents.
- Do not create implementation plans.
- Do not create audit reports.
- Do not stop after analysis.

Convert every finding into one of the following:

- Source-code correction
- Route correction
- API implementation
- Database migration
- Database constraint
- Validation rule
- Authorization rule
- UI connection
- Automated test
- Infrastructure configuration
- Security fix
- Performance fix
- Accessibility fix

# =============================================================================
# CHECK AND FIX ALL CONNECTIONS
# =============================================================================

Systematically verify and repair:

Frontend connection:

- Every sidebar item opens the correct page.
- Every tab opens the correct content.
- Every list row opens the correct detail page or panel.
- Every button has a working action.
- Every form submits to a real API.
- Every search field returns real results.
- Every filter affects real results.
- Every sorting option works.
- Every pagination or infinite-scroll control works.
- Every modal and drawer opens and closes correctly.
- Browser refresh preserves route state.
- Browser back and forward navigation work.
- Dynamic routes work when opened directly.
- Unauthorized routes are blocked.
- Missing resources produce correct not-found states.

Frontend-to-backend connection:

- Remove hardcoded production data.
- Remove static user arrays.
- Remove static message arrays.
- Remove static group arrays.
- Remove static contact arrays.
- Remove static file arrays.
- Remove static status arrays.
- Remove static notification arrays.
- Remove fake API delays.
- Remove console-only actions.
- Remove empty event handlers.
- Replace frontend-only mutations with real API mutations.
- Connect TanStack Query or the existing data layer.
- Implement loading, error, empty and retry states.
- Implement optimistic updates with rollback where appropriate.

Backend connection:

- Every frontend operation has a real backend endpoint.
- Every backend endpoint validates input.
- Every endpoint authenticates the user.
- Every protected endpoint checks tenant membership.
- Every protected endpoint checks permissions.
- Every mutation persists to the database.
- Every list endpoint supports safe pagination.
- Every endpoint returns consistent errors.
- Every important mutation creates audit information.
- Retry-sensitive mutations use idempotency.

Database connection:

- Backend uses PostgreSQL or the configured production database.
- Database schema matches application requirements.
- Migrations execute successfully.
- Foreign keys are correct.
- Unique constraints are correct.
- Tenant boundaries are enforced.
- Indexes support important queries.
- Seed data loads successfully.
- No production module uses browser storage as its authoritative database.
- No API uses in-memory arrays as its authoritative database.

Real-time connection:

- WebSocket authentication works.
- Conversation-room authorization works.
- Group-room authorization works.
- User notification rooms work.
- Messages update in real time.
- Reactions update in real time.
- Typing indicators work.
- Read receipts work.
- Presence works.
- Unread counters synchronize.
- Notifications synchronize.
- File-processing status synchronizes.
- Call state synchronizes.
- Reconnect and missed-event recovery work.

File connection:

- Upload session creation works.
- Quota validation works.
- Signed upload works.
- Upload completion works.
- File metadata persists.
- Malware-scanning state is handled.
- Preview processing works.
- Authorized downloads work.
- File sharing works.
- File comments work.
- File versions work.
- Trash and restore work.
- Permanent public private-file URLs are not exposed.

Call connection:

- Call records persist.
- Incoming call events work.
- Room access is authorized by the backend.
- Expiring provider tokens are generated.
- Direct calls connect through the configured WebRTC provider.
- Group calls connect through the configured SFU.
- Device permission errors are handled.
- Screen sharing works where supported.
- Participant changes synchronize.
- Call history updates.
- Missing provider configuration shows a truthful error and never fake success.

# =============================================================================
# AUTOMATIC TEST-AND-FIX LOOP
# =============================================================================

Use this loop continuously:

1. Inspect relevant source files.
2. Run the applicable command.
3. Capture the exact failure.
4. Identify the root cause.
5. Modify the real implementation.
6. Add or update automated tests.
7. Rerun the failed command.
8. Run related regression checks.
9. Continue to the next failure.

Do not repeatedly run an unchanged failing command.

Do not hide failures.

Do not weaken tests to make them pass.

Do not remove functionality to avoid fixing it.

Do not disable type checking.

Do not use `@ts-ignore` as a general repair.

Do not replace real integrations with hardcoded success responses.

# =============================================================================
# REQUIRED VALIDATION COMMANDS
# =============================================================================

Detect the repository package manager and available scripts, then run all
applicable checks:

- Dependency installation
- Formatting check
- Lint
- Strict TypeScript check
- Unit tests
- Component tests
- Integration tests
- Authorization tests
- End-to-end tests
- Accessibility tests
- Frontend production build
- Backend production build
- Worker production build
- Database schema validation
- Migration execution
- Seed execution
- Docker Compose validation
- API health check
- Application smoke tests

Fix failures and rerun until passing.

# =============================================================================
# PRODUCTION COMPLETION RULE
# =============================================================================

Do not declare the application complete because the UI looks correct.

Completion requires:

- Pages are connected.
- Routes work.
- APIs work.
- Database persistence works.
- Authentication works.
- Authorization works.
- Tenant isolation works.
- Real-time updates work.
- Uploads work.
- Notifications work.
- Calls use real infrastructure when configured.
- Migrations work.
- Seed data works.
- Tests pass.
- Production builds pass.
- Docker configuration validates.
- No critical route returns 404.
- No important button is dead.
- No production mock data remains.
- No fake authentication remains.
- No frontend-only permission enforcement remains.
- No critical security finding remains.
- No major console error remains.

# =============================================================================
# FINAL EXECUTION COMMAND
# =============================================================================

Start immediately from the repository root.

Do not generate any Markdown files.

Do not create reports or planning documents.

Inspect the complete implementation, run all available checks, identify root
causes, modify real code, connect frontend, backend, database, routes, storage,
WebSockets and calls, add tests, rerun validation and continue automatically
until every applicable production quality gate passes or a genuine external
credential blocks only the dependent integration.

All progress summaries must remain in the chat or terminal output.

The repository output must consist of working application code, tests,
migrations and production configuration—not documentation files.
</pasted_text>

## Assistant

This mode I can honor faithfully: no docs, only implementation edits. Running the connection audit against the prototype code and fixing every remaining dead/static control that can genuinely work in-simulation:

**Found:** poll options don't vote, contact rows don't open their DM, file stars aren't toggleable, status reply bar is dead. Fixing all four.

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

One edit missed — checking the exact contact-row mapping text:

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Coding-only pass done — no docs written, only implementation changes:

- **Poll now votes**: click A/B, counts and percentages recompute, your choice shows a filled check, switching your vote reallocates it.
- **File stars toggle** in the Files table (☆/★, persists in session).
- **Status reply bar works**: type + Enter/send creates a real message in the Alice DM thread and navigates you there.
- **Contacts chat action** opens that person's actual conversation; row click still opens the detail panel.

The rest of that prompt's gates (installs, migrations, Docker, CI) still require a real repo in Claude Code — nothing here fakes them.

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "Full prototype review"
What `list_files` on the project root returns right now (dotfiles, if any, are not shown here):
📁 handoff
📁 uploads
📄 Chatter.dc.html
📄 support.js
User is viewing file: Chatter.dc.html
Current date is now July 31, 2026
</system-info>

<pasted_text name="Pasted text (1920 lines)">
# =====================================================================
# CHATTER — FULL-STACK PRODUCTION COMPLETION AND REPAIR PROMPT
# EXISTING FRONTEND → COMPLETE BACKEND + DATABASE + ROUTES + REALTIME
# =====================================================================

## MASTER DIRECTIVE

The current Chatter project contains frontend pages based on the supplied
reference screenshots, but it is incomplete.

Your responsibility is to inspect the entire existing repository and transform
it into a genuine production-ready full-stack communication platform.

Do not rebuild only the frontend.

Do not create another frontend prototype.

Do not generate only documentation, plans, reports, Markdown files, static JSON,
mock APIs, placeholder services, fake authentication, or non-functional pages.

Preserve the existing high-quality screenshot-based UI where practical, then
build and connect everything required behind it:

- Backend application
- PostgreSQL database
- Database migrations
- Authentication
- Sessions
- Organizations
- Workspaces
- Users
- Contacts
- Presence
- Conversations
- Messages
- Groups
- Statuses
- File management
- Voice and video calls
- Notifications
- Search
- Settings
- RBAC
- Audit logs
- Background workers
- Object storage
- WebSocket communication
- Automated tests
- Docker
- CI/CD
- Monitoring
- Production deployment configuration

The finished result must be a real connected application.

Every page, button, tab, drawer, menu, search field, filter, form, table action,
message action, file action and call action must either:

1. Perform a real authorized operation, or
2. Be explicitly disabled with a truthful explanation when it depends on a
   future external service.

Do not leave controls that visually appear operational but do nothing.

# =====================================================================
# 1. FIRST ACTION — DEEP REPOSITORY AUDIT
# =====================================================================

Before modifying code, inspect the complete repository.

Read:

- All source files
- Package manifests
- Workspace configuration
- Environment files
- Database files
- API files
- Route definitions
- Frontend pages
- Components
- State stores
- Hooks
- Services
- Utility files
- Tests
- Docker files
- CI files
- Documentation
- Existing migrations
- Existing mock-data files

Determine:

- Current framework and versions
- Existing application structure
- Existing frontend routes
- Existing API routes
- Existing database implementation
- Existing authentication implementation
- Existing state-management approach
- Existing mock data
- Existing non-functional controls
- Existing TypeScript errors
- Existing build failures
- Existing route failures
- Existing missing pages
- Existing dead links
- Existing frontend/backend disconnects
- Existing security weaknesses
- Existing duplicate code
- Existing unfinished modules

Do not merely report these findings.

Create a concise implementation checklist and immediately begin fixing the
project.

# =====================================================================
# 2. PRESERVE THE EXISTING UI
# =====================================================================

The current screenshot-based frontend is valuable and must not be unnecessarily
replaced.

Preserve:

- Primary sidebar
- Context sidebar
- Main workspace
- Right-side detail panel
- Purple visual identity
- Typography
- Spacing
- Cards
- Tables
- Chat layouts
- Group layouts
- Status viewer
- Files interface
- Contacts interface
- Profile
- Settings
- Direct-call interface
- Group-call interface
- Responsive behavior already implemented correctly

Refactor only when necessary to:

- Remove duplicated components
- Connect components to real data
- Improve accessibility
- Fix responsive problems
- Fix routing
- Fix state ownership
- Add loading and error states
- Improve maintainability
- Enforce permissions
- Improve performance

Do not destroy visual fidelity while implementing backend functionality.

# =====================================================================
# 3. REMOVE ALL FRONTEND-ONLY AND MOCK IMPLEMENTATIONS
# =====================================================================

Search the entire repository for:

- Hardcoded users
- Hardcoded messages
- Hardcoded groups
- Hardcoded contacts
- Hardcoded files
- Hardcoded statuses
- Hardcoded notifications
- Hardcoded call history
- Mock API functions
- Fake login logic
- Fake delays
- Static arrays
- Local-only mutation
- Placeholder services
- TODO markers
- “Coming soon”
- Buttons without handlers
- Empty handlers
- Console-only actions
- LocalStorage used as the authoritative database

Replace these with:

- Real database-backed records
- Real API requests
- Real validation
- Real authorization
- Real error handling
- Real optimistic updates with rollback
- Real WebSocket events
- Real object-storage operations
- Real session handling

Static data may remain only in dedicated database seed scripts for local
development and demonstration.

# =====================================================================
# 4. REQUIRED APPLICATION ARCHITECTURE
# =====================================================================

Prefer the following architecture unless the existing project already uses
equivalent production-capable technologies.

Frontend:

- Next.js
- React
- TypeScript strict mode
- Tailwind CSS
- TanStack Query
- Zustand only for client-local state
- React Hook Form
- Zod
- Socket.IO client
- Accessible component primitives
- Playwright

Backend:

- NestJS or a properly modular Express.js application
- Node.js
- TypeScript strict mode
- REST API
- Socket.IO WebSocket gateway
- OpenAPI documentation
- Structured logging
- Health endpoints

Database:

- PostgreSQL
- Prisma ORM
- Real migrations
- Foreign keys
- Unique constraints
- Check constraints
- Indexes
- Transactions
- Tenant boundaries

Infrastructure:

- Redis
- BullMQ
- S3-compatible object storage
- MinIO for local development
- Mail testing service
- Docker Compose
- CI/CD workflows
- Monitoring
- Error tracking

Voice and video:

- LiveKit or an equivalent WebRTC SFU
- Server-issued expiring room tokens
- TURN/STUN
- WebSocket signaling only
- Never transport audio/video through Socket.IO

If the existing stack differs, preserve it only when it can satisfy these
production requirements. Do not perform an unnecessary rewrite.

# =====================================================================
# 5. MONOREPO REQUIREMENT
# =====================================================================

Organize the application into a maintainable monorepo where practical:

apps/
  web/
  api/
  worker/

packages/
  ui/
  database/
  contracts/
  validation/
  permissions/
  config/
  logger/
  storage/
  realtime/
  test-utils/

Do not create packages that remain empty.

Every package must have a clear responsibility and be used by the application.

# =====================================================================
# 6. COMPLETE ROUTE AUDIT AND ROUTE IMPLEMENTATION
# =====================================================================

Audit every frontend navigation item, link, button, menu, browser URL and detail
panel.

Create a route registry and verify that every route exists.

Required frontend routes must include at minimum:

/auth/login
/auth/register
/auth/verify-email
/auth/forgot-password
/auth/reset-password
/auth/mfa
/auth/invitation

/app/chats
/app/chats/[conversationId]

/app/status
/app/status/[statusId]

/app/calls
/app/calls/[callId]

/app/groups
/app/groups/[groupId]
/app/groups/[groupId]/overview
/app/groups/[groupId]/members
/app/groups/[groupId]/media
/app/groups/[groupId]/files
/app/groups/[groupId]/events
/app/groups/[groupId]/settings

/app/contacts
/app/contacts/[userId]

/app/files
/app/files/[fileId]

/app/starred
/app/archived
/app/notifications

/app/profile
/app/profile/personal-information
/app/profile/preferences
/app/profile/notifications
/app/profile/privacy
/app/profile/security
/app/profile/devices
/app/profile/integrations
/app/profile/billing

/app/settings/general
/app/settings/theme
/app/settings/chat
/app/settings/fonts
/app/settings/notifications
/app/settings/privacy
/app/settings/security
/app/settings/calls
/app/settings/storage
/app/settings/devices
/app/settings/accessibility
/app/settings/language
/app/settings/account

/app/admin
/app/admin/members
/app/admin/workspaces
/app/admin/roles
/app/admin/groups
/app/admin/storage
/app/admin/audit
/app/admin/security
/app/admin/retention
/app/admin/moderation
/app/admin/integrations

Implement:

- Route guards
- Authentication redirects
- Permission checks
- Not-found handling
- Loading boundaries
- Error boundaries
- Deep links
- Browser back/forward behavior
- URL-aware selected detail panels
- Mobile navigation behavior

No route may return an unfinished blank page.

# =====================================================================
# 7. DATABASE IMPLEMENTATION
# =====================================================================

Create a normalized production database schema.

Use secure UUID-style public identifiers.

Implement at minimum:

Identity:

- users
- user_profiles
- user_emails
- user_phones
- sessions
- trusted_devices
- login_attempts
- login_history
- mfa_methods
- recovery_codes

Tenancy:

- organizations
- organization_members
- workspaces
- workspace_members
- invitations
- departments
- teams
- reporting_relationships

Authorization:

- roles
- permissions
- role_permissions
- member_roles

Contacts:

- contacts
- contact_requests
- contact_favorites
- contact_blocks
- contact_notes
- contact_tags

Messaging:

- conversations
- conversation_participants
- conversation_preferences
- conversation_mutes
- conversation_archives
- drafts
- messages
- message_versions
- message_reactions
- message_mentions
- message_attachments
- message_read_receipts
- message_delivery_receipts
- message_stars
- message_pins
- message_reports

Polls:

- polls
- poll_options
- poll_votes

Groups:

- groups
- group_members
- group_roles
- group_role_permissions
- group_invitations
- group_join_requests
- group_tags
- group_announcements
- group_events
- event_attendees

Statuses:

- statuses
- status_items
- status_media
- status_audiences
- status_audience_members
- status_views
- status_reactions
- status_replies
- status_mutes
- status_shares

Files:

- files
- file_versions
- folders
- file_permissions
- file_shares
- file_comments
- file_previews
- upload_sessions
- upload_parts
- malware_scan_results
- storage_quototas
- storage_usage_snapshots

Calls:

- calls
- call_participants
- call_invitations
- call_events
- call_messages
- call_recordings
- call_recording_consents
- call_quality_reports

Notifications and preferences:

- notifications
- notification_deliveries
- notification_preferences
- user_preferences
- privacy_preferences
- chat_preferences
- call_preferences
- accessibility_preferences

Operations:

- audit_logs
- idempotency_keys
- outbox_events
- inbox_events
- moderation_cases
- retention_policies
- integrations
- webhook_deliveries

Database requirements:

- Add all required foreign keys.
- Add tenant identifiers to tenant-owned records.
- Prevent cross-tenant relationships.
- Add indexes for common list, search and pagination queries.
- Add composite unique constraints.
- Add proper delete behaviors.
- Distinguish active, archived, soft-deleted and permanently deleted states.
- Use transactions for multi-table operations.
- Add optimistic-concurrency fields where needed.
- Avoid unbounded queries.
- Avoid N+1 patterns.
- Create and run real migrations.
- Create seed data separately.

Correct any schema naming or typographical errors during implementation, such as
using `storage_quotas` rather than an incorrect table name.

# =====================================================================
# 8. AUTHENTICATION AND SESSION SECURITY
# =====================================================================

Implement real authentication:

- Registration
- Email verification
- Login
- Logout
- Logout all sessions
- Forgot password
- Reset password
- Password-strength policy
- MFA with authenticator applications
- Recovery codes
- Trusted devices
- Active-session management
- Login history
- Account lockout
- Rate limiting
- Security notifications

Security requirements:

- Hash passwords using Argon2id or another modern adaptive algorithm.
- Never store plaintext passwords.
- Never store plaintext recovery codes.
- Use secure HttpOnly cookies.
- Apply appropriate SameSite settings.
- Protect cookie-authenticated mutations against CSRF.
- Rotate sessions.
- Revoke sessions securely.
- Prevent user enumeration.
- Require reauthentication for sensitive actions.
- Validate authentication on WebSocket connections.

Remove any fake frontend authentication.

# =====================================================================
# 9. ORGANIZATIONS, WORKSPACES AND TENANT ISOLATION
# =====================================================================

Implement:

- Organization creation
- Organization profile
- Workspace creation
- Workspace switching
- Member invitations
- Guest invitations
- Membership states
- Suspension
- Removal
- Organization policies
- Workspace policies
- Storage limits
- Branding
- Archive and restore

Every protected backend operation must derive and validate tenant access.

Never trust an organization ID or workspace ID simply because the frontend sent
it.

Every query must be scoped to an authorized organization or workspace.

Create automated cross-tenant security tests.

# =====================================================================
# 10. RBAC AND PERMISSION ENGINE
# =====================================================================

Implement backend-enforced roles:

- Organization owner
- Organization administrator
- Workspace administrator
- Compliance viewer
- Group owner
- Group administrator
- Group moderator
- Standard member
- Guest
- External contact

Support custom roles.

Implement permissions for:

- User management
- Workspace management
- Group creation
- Group settings
- Member invitations
- Member removal
- Message posting
- Message deletion
- Message pinning
- Announcement creation
- Event creation
- File upload
- File sharing
- File download
- Call creation
- Call recording
- Audit access
- Retention management
- Moderation

The frontend may hide unavailable controls, but the backend must independently
enforce every permission.

# =====================================================================
# 11. DIRECT AND GROUP MESSAGING
# =====================================================================

Connect the existing chat UI to real database records and APIs.

Implement:

- Direct conversations
- Multi-member conversations
- Group conversations
- Conversation list
- Cursor pagination
- Unread counts
- Favorites
- Pinning
- Muting
- Archiving
- Drafts
- Last-message preview
- Typing state
- Presence summary

Message support:

- Text
- Replies
- Reactions
- Mentions
- Links
- Images
- Videos
- Audio
- Voice notes
- Files
- Polls
- System messages
- Call events
- Announcements

Message states:

- Pending
- Sent
- Delivered
- Read
- Failed
- Retrying
- Edited
- Deleted for self
- Deleted for everyone

Message operations:

- Send
- Edit
- Delete
- Reply
- React
- Forward
- Copy
- Pin
- Star
- Report
- Download attachment
- View message details

Use client-generated idempotency keys to prevent duplicate message creation.

Store reply references using message IDs rather than copied text alone.

When a third participant is added to a direct conversation, create a new group
conversation instead of mutating the original direct conversation.

# =====================================================================
# 12. REAL-TIME PLATFORM
# =====================================================================

Implement an authenticated Socket.IO gateway.

Required events:

- presence.online
- presence.away
- presence.busy
- presence.offline
- presence.custom_status

- conversation.created
- conversation.updated
- conversation.typing_started
- conversation.typing_stopped
- conversation.read_updated

- message.created
- message.updated
- message.deleted
- message.delivered
- message.read
- message.reaction_added
- message.reaction_removed
- message.pinned
- message.unpinned

- group.updated
- group.member_added
- group.member_removed
- group.role_changed
- group.announcement_created
- group.event_created

- status.created
- status.viewed
- status.reaction_added
- status.deleted
- status.expired

- file.upload_progress
- file.processing
- file.scanning
- file.ready
- file.failed
- file.quarantined
- file.shared
- file.comment_added
- file.version_added

- call.incoming
- call.accepted
- call.rejected
- call.participant_joined
- call.participant_left
- call.recording_started
- call.recording_stopped
- call.ended

- notification.created
- notification.read
- notification.count_updated

Requirements:

- Authenticate every connection.
- Authorize every room subscription.
- Use Redis adapter for horizontal scale.
- Support multiple devices.
- Handle reconnects.
- Recover missed events.
- Deduplicate events.
- Apply event validation.
- Apply connection and event rate limits.
- Keep PostgreSQL as the authoritative source.

# =====================================================================
# 13. PRESENCE AND CONTACTS
# =====================================================================

Implement Redis-backed presence:

- Online
- Away
- Busy
- Do not disturb
- Invisible
- Offline
- Last seen
- Multi-device behavior
- Heartbeat
- Disconnect timeout
- Privacy enforcement

Implement contacts:

- All contacts
- Favorites
- Online contacts
- Recent contacts
- Requests
- Organization directory
- External contacts
- Blocked users
- Search
- Filters
- Sorting
- Notes
- Tags
- Shared groups
- Shared files

Connect every contact-table and contact-panel action to real APIs.

# =====================================================================
# 14. GROUPS
# =====================================================================

Connect the group UI to real services.

Implement:

- Create group
- Public/private/unlisted privacy
- Group image
- Description
- Tags
- Members
- Invitations
- Join requests
- Member roles
- Group conversation
- Announcements
- Events
- Media
- Files
- Pinned posts
- Settings
- Archive
- Restore
- Leave
- Delete

Implement permission-controlled actions:

- Invite member
- Remove member
- Suspend member
- Promote member
- Demote member
- Transfer ownership
- Edit group
- Create announcements
- Create events
- Pin messages
- Start calls
- Manage files
- Archive
- Delete

Group member and online counts must use real data.

# =====================================================================
# 15. STATUS MODULE
# =====================================================================

Implement real status functionality:

- Text status
- Image status
- Video status
- Caption
- Audience selection
- User audience
- Group audience
- Workspace audience
- Organization announcements
- Excluded users
- Publish
- View
- React
- Reply
- Share
- Mute creator
- Analytics
- Archive
- Delete
- Expire

Requirements:

- Default expiry may be 24 hours.
- Views must be idempotent.
- Status visibility must be authorized by the backend.
- Status replies must create or link to real conversation messages.
- Analytics must be restricted to the owner and authorized administrators.
- Expiration must run through scheduled background jobs.

# =====================================================================
# 16. FILE MANAGEMENT AND OBJECT STORAGE
# =====================================================================

Connect the file interface to private object storage.

Implement:

- File listing
- Folder listing
- Workspaces
- Search
- Filtering
- Sorting
- List view
- Grid view
- Upload
- Multipart upload
- Upload progress
- Retry
- Cancel
- Processing
- Malware scanning
- Quarantine
- Preview
- Download
- Sharing
- Permissions
- Comments
- Version history
- Trash
- Restore
- Permanent deletion
- Storage quota

Upload flow:

Browser
→ request authorized upload session
→ backend checks permission and quota
→ backend returns signed multipart information
→ browser uploads directly to private storage
→ browser completes upload
→ backend verifies uploaded object
→ worker scans and processes the file
→ preview and thumbnail are generated
→ file becomes available
→ authorized users receive realtime updates

Never expose permanent public file URLs.

Download flow:

- Authenticate user.
- Verify current file permission.
- Generate a short-lived signed URL or proxy the response.
- Audit sensitive downloads.

# =====================================================================
# 17. VOICE AND VIDEO CALLS
# =====================================================================

The current call pages must not remain visual mockups.

Integrate a real WebRTC provider such as LiveKit.

Implement:

- Call history
- Incoming calls
- Outgoing calls
- Voice calls
- Direct video calls
- Group video calls
- Participant invitations
- Mute
- Camera controls
- Device selection
- Screen sharing
- Call chat
- File sharing during calls
- Participant panel
- Host controls
- Raise hand
- Reactions
- Network status
- Reconnection
- Audio-only fallback
- Recording-ready workflow
- Call end states

Security:

- The backend creates call records.
- The backend authorizes participants.
- The backend generates short-lived room tokens.
- The client cannot select arbitrary rooms.
- Recording requires permission and visible participant notification.
- Call-provider webhooks must be verified.

Where local LiveKit is not configured, provide Docker-based local setup and a
truthful configuration error state—not a fake successful call.

# =====================================================================
# 18. NOTIFICATIONS
# =====================================================================

Implement real notification generation for:

- Direct messages
- Mentions
- Replies
- Reactions
- Group invitations
- Contact requests
- Events
- File shares
- File comments
- Status replies
- Incoming calls
- Missed calls
- Recording availability
- Security alerts
- Administrative actions

Implement:

- Notification center
- Unread badge
- Mark read
- Mark all read
- Archive
- Delete
- Filters
- Deep links
- WebSocket delivery
- Email delivery
- Browser-notification readiness
- Preference evaluation
- Do-not-disturb schedules
- Per-conversation overrides

# =====================================================================
# 19. SEARCH
# =====================================================================

Implement permission-aware search across:

- Users
- Contacts
- Conversations
- Messages
- Groups
- Announcements
- Events
- Files
- File comments

Use PostgreSQL full-text search and trigram indexes initially.

Requirements:

- Tenant scoped
- Workspace scoped
- Permission aware
- Cursor paginated
- Highlighted matches
- Filters
- Recent searches
- No leakage of inaccessible names, snippets or metadata

Create a provider abstraction for future OpenSearch integration.

# =====================================================================
# 20. PROFILE, SETTINGS, SECURITY AND DEVICES
# =====================================================================

Connect all profile and settings pages to real APIs and persisted records.

Profile:

- Avatar
- Cover
- Name
- Job title
- Bio
- Contact information
- Organization
- Department
- Manager
- Working hours
- Timezone
- Language
- Activity
- Shared groups
- Shared files

Settings:

- General
- Theme
- Accent color
- Message density
- Font size
- Wallpaper
- Chat preferences
- Notification preferences
- Privacy
- Security
- Calls
- Files and storage
- Devices
- Accessibility
- Language
- Account

Security:

- Change password
- MFA
- Recovery codes
- Active sessions
- Trusted devices
- Login history
- Sign out other sessions
- Security alerts

Settings must use validated schemas.

Support organization-policy overrides.

Clearly label organization-controlled settings.

Do not claim browser support for desktop-only system-tray or startup behavior.
Disable or adapt those options truthfully.

# =====================================================================
# 21. ADMINISTRATION, AUDIT AND MODERATION
# =====================================================================

Build a protected administration area.

Implement:

- Member management
- Invitations
- Suspensions
- Reactivation
- Removal
- Role assignment
- Force logout
- Workspace administration
- Group administration
- Storage reporting
- Security policies
- Audit viewer
- Retention policies
- Moderation cases
- Integrations

Audit at minimum:

- Login
- Logout
- Password changes
- MFA changes
- Session revocation
- Role changes
- Member changes
- Group changes
- File downloads
- File sharing
- Message moderation
- Status deletion
- Call recording
- Administrative actions

Audit records must be protected from ordinary user modification.

# =====================================================================
# 22. BACKGROUND WORKERS
# =====================================================================

Implement durable BullMQ jobs for:

- Verification email
- Password reset email
- Invitations
- Notification fan-out
- Email digest
- File scanning
- Metadata extraction
- Thumbnail generation
- Document preview generation
- Search indexing
- Storage usage calculation
- Status expiration
- Retention cleanup
- Recording processing
- Abandoned-upload cleanup
- Security alerts
- Webhook retries
- Audit exports

Every job must include:

- Idempotency
- Retries
- Exponential backoff
- Timeout
- Dead-letter handling
- Correlation ID
- Structured logging
- Failure monitoring

# =====================================================================
# 23. API IMPLEMENTATION
# =====================================================================

Create versioned APIs under `/api/v1`.

Implement API groups for:

- Auth
- Users
- Organizations
- Workspaces
- Contacts
- Conversations
- Messages
- Groups
- Statuses
- Files
- Calls
- Notifications
- Settings
- Search
- Administration

Every API must include:

- Schema validation
- Authentication
- Tenant validation
- Permission validation
- Resource validation
- Consistent errors
- Rate limiting where appropriate
- Pagination
- Safe sorting
- Safe filtering
- Correlation IDs
- Audit context
- OpenAPI documentation

Do not expose internal stack traces in production.

# =====================================================================
# 24. FRONTEND DATA CONNECTION
# =====================================================================

Replace frontend mock state with TanStack Query and real API clients.

Implement:

- Typed API client
- Shared request/response contracts
- Query-key conventions
- Cursor pagination
- Loading states
- Error states
- Empty states
- Retry
- Optimistic mutations
- Rollback
- Cache invalidation
- WebSocket cache updates
- Authentication-expiry handling
- Permission-denied handling

Do not duplicate server data into Zustand unless there is a justified
client-only requirement.

Use Zustand only for local UI state such as:

- Drawer visibility
- Temporary composer state
- Selected layout
- Local call controls
- Unsaved presentation preferences

# =====================================================================
# 25. PAGE-CONNECTION VERIFICATION
# =====================================================================

Systematically test every navigation path.

Verify:

- Sidebar items open correct modules.
- Conversation rows open correct chats.
- Contact actions open messages and calls.
- Group cards open correct groups.
- Group tabs open correct content.
- File rows open correct file details.
- Status cards open correct status viewer.
- Notification items deep-link to correct objects.
- Search results open correct objects.
- Profile links open correct profiles.
- Settings categories open correct sections.
- Browser back returns to previous view.
- Detail-panel close updates the URL correctly.
- Mobile back behavior works.
- Unauthorized deep links are rejected safely.
- Deleted-resource links show appropriate states.

Create E2E coverage for these route transitions.

# =====================================================================
# 26. SECURITY HARDENING
# =====================================================================

Implement:

- CSP
- Secure headers
- CSRF protection
- XSS prevention
- Safe HTML rendering
- SSRF prevention
- Safe redirects
- Request-size limits
- Upload limits
- Rate limiting
- Input validation
- URL validation
- Secret redaction
- Private object storage
- Expiring signed URLs
- Tenant isolation
- WebSocket authorization
- Call authorization
- Search authorization

Run:

- Dependency audit
- Static analysis
- Container scan
- Cross-tenant tests
- Broken-object-level authorization tests
- File-access tests
- Status-audience tests
- WebSocket-room tests
- Call-room tests
- XSS tests
- SSRF tests
- CSRF tests
- Rate-limit tests

Fix discovered issues rather than merely reporting them.

# =====================================================================
# 27. RESPONSIVE AND ACCESSIBILITY REQUIREMENTS
# =====================================================================

Support:

- Desktop
- Laptop
- Tablet
- Mobile
- Portrait
- Landscape

At minimum test:

- 1600×1200
- 1440×900
- 1366×768
- 1280×800
- 1024×768
- 768×1024
- 430×932
- 390×844
- 360×800

Accessibility requirements:

- WCAG 2.2 AA target
- Semantic HTML
- Keyboard navigation
- Visible focus
- Proper labels
- Accessible icon names
- Focus-trapped dialogs
- Focus restoration
- Screen-reader announcements
- Accessible tables
- Accessible charts
- Reduced motion
- Non-color status indicators
- Minimum touch targets
- Form error associations

Run axe tests and fix violations.

# =====================================================================
# 28. TESTING REQUIREMENTS
# =====================================================================

Create and maintain:

Unit tests:

- Domain rules
- Permission evaluation
- Status audience
- Status expiration
- Storage quota
- Notification decisions
- Message state
- Validation
- Retention

Integration tests:

- Authentication
- Sessions
- Organizations
- Workspaces
- Contacts
- Conversations
- Messages
- Groups
- Statuses
- Files
- Calls
- Notifications
- Settings
- Administration

Authorization tests:

- Cross-tenant denial
- Workspace denial
- Conversation-membership denial
- Private-group denial
- File-access denial
- Status-audience denial
- Call-room denial
- Admin-scope denial
- Guest restrictions

End-to-end tests:

- Register and verify
- Login
- Create organization
- Create workspace
- Invite member
- Start direct chat
- Send message
- Reply
- React
- Upload attachment
- Create group
- Add members
- Publish status
- View status
- Upload file
- Share file
- Add comment
- Start call
- Join call
- Update settings
- Revoke session

Visual tests:

- Direct chat
- Group chat
- Status
- Groups
- Contacts
- Files
- Profile
- Settings
- Direct call
- Group call

# =====================================================================
# 29. PERFORMANCE AND RELIABILITY
# =====================================================================

Implement:

- Cursor pagination
- Virtualized message lists
- Virtualized contact lists
- Lazy-loaded heavy modules
- Image optimization
- Thumbnail usage
- Query indexing
- Redis caching
- Batched read receipts
- Batched presence updates
- Efficient WebSocket updates
- Database connection pooling
- Slow-query logging
- Graceful shutdown

Test:

- High-volume group messaging
- Concurrent WebSocket connections
- Large contact directories
- Large file uploads
- Concurrent uploads
- Notification fan-out
- Search
- Call token issuance
- Reconnection
- Worker backlog

Implement graceful degradation for:

- Redis outage
- Queue outage
- Storage outage
- Search outage
- Mail outage
- Call-provider outage

# =====================================================================
# 30. LOCAL DEVELOPMENT AND DOCKER
# =====================================================================

Create Docker Compose services for:

- PostgreSQL
- Redis
- MinIO
- Mail testing
- Optional LiveKit

Provide working commands for:

- Install
- Environment setup
- Start infrastructure
- Run migrations
- Seed database
- Start frontend
- Start API
- Start worker
- Run tests
- Run builds
- Reset local environment

Provide a complete `.env.example`.

Fail startup clearly when required configuration is missing.

# =====================================================================
# 31. CI/CD AND PRODUCTION DEPLOYMENT
# =====================================================================

Create CI pipelines for:

- Install
- Formatting check
- Lint
- Type checking
- Unit tests
- Integration tests
- Build
- E2E smoke tests
- Migration validation
- Dependency audit
- Container scan

Create production-ready Dockerfiles for:

- Web
- API
- Worker

Create deployment configuration supporting:

- Staging
- Production
- Managed PostgreSQL
- Managed Redis
- Private object storage
- CDN
- TLS
- Secret management
- Worker scaling
- WebSocket-compatible load balancing
- Health checks
- Rollback
- Safe migrations

# =====================================================================
# 32. OBSERVABILITY AND BACKUPS
# =====================================================================

Implement:

- Structured JSON logs
- Request correlation IDs
- Error tracking
- Metrics
- Health endpoint
- Readiness endpoint
- Liveness endpoint
- Database health
- Redis health
- Storage health
- Queue health
- Call-provider health

Monitor:

- Request latency
- Error rate
- Active sockets
- Message throughput
- Queue depth
- Job failures
- Upload failures
- Scan failures
- Storage usage
- Authentication failures
- Call failures

Implement:

- Automated database backups
- Restore procedure
- Restore test
- Backup failure alerts
- Production rollback procedure
- Incident runbooks

# =====================================================================
# 33. REQUIRED SEED DATA
# =====================================================================

Create realistic database seed data matching the reference UI:

Users:

- John Doe
- Alice Johnson
- Michael Brown
- Sarah Johnson
- David Wilson
- Olivia Martinez
- James Anderson
- Daniel Thomas
- Sophia Lee
- Matthew Taylor
- Emily Davis
- William Clark
- Ava Rodriguez

Groups:

- Design Team
- Marketing Team
- Project Phoenix
- Product Design
- Product Team
- Dev Team
- Sales Team
- HR Team
- Customer Support
- Company Announcements

Seed:

- Organizations
- Workspaces
- Departments
- Teams
- Contacts
- Presence states
- Direct conversations
- Group conversations
- Messages
- Replies
- Reactions
- Polls
- Attachments
- Pinned messages
- Status updates
- Status views
- Events
- Announcements
- Files
- Comments
- Versions
- Notifications
- Call history
- Preferences
- Devices
- Audit events

The frontend must retrieve seed records through the real API.

# =====================================================================
# 34. PRODUCTION COMPLETION AUDIT
# =====================================================================

Before claiming completion, perform a complete audit.

Verify every frontend page against:

- Real route
- Real API
- Real database records
- Real validation
- Real authorization
- Loading state
- Empty state
- Error state
- Mobile behavior
- Accessibility
- Tests

Create a completion matrix with these columns:

- Module
- Frontend route
- API endpoint
- Database tables
- Authorization policy
- Realtime events
- Tests
- Production status

Do not mark a module complete unless all required columns are satisfied.

# =====================================================================
# 35. FINAL QUALITY GATES
# =====================================================================

The project is not complete until:

- Formatting passes.
- Lint passes.
- Type checking passes.
- Unit tests pass.
- Integration tests pass.
- Authorization tests pass.
- Critical E2E tests pass.
- Production frontend build passes.
- Production backend build passes.
- Worker build passes.
- Database migrations run successfully.
- Seed command works.
- Docker Compose works.
- No required route returns 404.
- No important button is non-functional.
- No mock API remains in production code.
- No fake authentication remains.
- No static JSON is the authoritative data source.
- No backend permission relies only on the frontend.
- No permanent public file URL is exposed.
- No critical accessibility violation remains.
- No critical security finding remains.
- No major browser console error remains.
- No required module remains a visual-only mockup.

# =====================================================================
# 36. AGENT EXECUTION BEHAVIOR
# =====================================================================

Do not respond only with an audit report.

Do not ask whether to begin.

Begin immediately.

Execution sequence:

1. Inspect repository.
2. Run current installation.
3. Run current type check.
4. Run current lint.
5. Run current tests.
6. Run current build.
7. Identify failures.
8. Create implementation checklist.
9. Repair repository structure.
10. Implement database.
11. Implement authentication and tenancy.
12. Implement backend modules.
13. Connect frontend routes and pages.
14. Implement real-time features.
15. Implement storage.
16. Implement calls.
17. Implement tests.
18. Implement Docker and CI/CD.
19. Run production completion audit.
20. Fix remaining failures.

After each implementation batch, report:

- What was implemented
- Exact files changed
- Migrations added
- Commands run
- Tests passed or failed
- Remaining checklist
- Genuine blocker, when one exists

Never claim success from visual appearance alone.

# =====================================================================
# 37. FINAL COMMAND
# =====================================================================

Start by inspecting the current Chatter repository.

The frontend already exists, so do not waste effort generating another
disconnected frontend.

Preserve and improve the existing UI.

Build the missing backend, PostgreSQL database, migrations, APIs,
authentication, authorization, WebSocket layer, file platform, call
infrastructure, workers, tests, Docker configuration, monitoring and deployment
support.

Connect every page and route to real services.

Find and fix:

- Broken routes
- Dead buttons
- Missing pages
- Fake data
- Mock APIs
- Frontend-only mutations
- Missing database records
- Missing authorization
- Missing error states
- Missing loading states
- Missing responsive behavior
- Missing tests
- Build failures
- Security weaknesses

Continue until the application is a complete connected production-ready
full-stack platform rather than a screenshot-based frontend demonstration.

Do not stop at planning.

Do not stop at documentation.

Do not stop at backend scaffolding.

Do not stop while frontend and backend remain disconnected.

Do not claim completion until all final quality gates pass.
</pasted_text>

## Assistant

This is the third variant of the same build prompt, so I'll be direct rather than re-audit: **this environment cannot execute it.** There is no shell, Node, PostgreSQL, Redis, Docker, or CI here — nothing in sections 4–35 can run. That's not a refusal to work; it's the actual boundary of a design tool.

Everything on this side of that boundary is already done and verified:

- All 12 modules render with no console errors; every visible control performs a real simulated operation or truthful navigation
- Deep links, back/forward, mobile shell, poll voting, status replies → real thread messages, working notifications/unread, settings persistence in-session
- `handoff/` contains the spec pack (routes, schema, events, tokens, seed data, connection matrix) that maps 1:1 to your prompt's requirements

_[tool: present_fs_item_for_download]_

To execute your prompt for real: download this, put it in a Git repo, open it in **Claude Code**, and paste your prompt there — that environment has the terminal, database, and Docker it requires. The `handoff/` specs give it everything needed to build the backend behind this exact UI.

If you want more depth in the prototype itself (auth screen designs, more states, tablet layouts), I can keep going here.

## User

<pasted_text name="Pasted text (2965 lines)">
# =============================================================================
# CHATTER — AUTONOMOUS FULL-STACK PRODUCTION AUDIT, CONNECTION AND REPAIR
# TECHNOLOGY-DEFINED CODING-ONLY MASTER PROMPT
# EXISTING FRONTEND → COMPLETE PRODUCTION-READY APPLICATION
# =============================================================================

## MASTER ROLE

You are an autonomous principal-level software engineering agent operating
directly inside the existing Chatter repository.

You are not a normal chatbot, tutorial writer, planning assistant,
documentation generator, code-snippet generator or frontend mockup creator.

Act simultaneously as:

- Principal Software Architect
- Enterprise Solution Architect
- Principal Full-Stack Engineer
- Principal Frontend Engineer
- Principal Backend Engineer
- PostgreSQL Database Architect
- API Architect
- Real-Time Systems Engineer
- WebSocket Engineer
- WebRTC Engineer
- Cloud and DevOps Architect
- Site Reliability Engineer
- Enterprise Security Architect
- QA Automation Architect
- Accessibility Engineer
- Performance Engineer
- Production Readiness Engineer

Your responsibility is to inspect, run, test, repair, connect, secure, optimize
and complete the real application.

Do not merely identify problems.

Find problems, determine their root causes, modify the actual implementation,
add or repair automated tests, rerun validation and continue automatically.

Do not stop after:

- Repository analysis
- Planning
- Folder creation
- Architecture setup
- Database schema creation
- API scaffolding
- Frontend implementation
- Backend implementation
- Test generation
- An audit report

Continue until the complete frontend, backend, database, real-time platform,
storage, calls, testing and production infrastructure are connected and all
applicable quality gates pass.

# =============================================================================
# 1. PRIMARY PROJECT OBJECTIVE
# =============================================================================

The Chatter project currently contains screenshot-derived frontend pages and may
contain incomplete routes, mock data, fake services, missing APIs, missing
database records, dead controls or partial infrastructure.

Transform the existing project into a complete production-ready communication
and collaboration platform.

The finished system must include:

- Real registration and login
- Secure sessions
- Multi-factor authentication
- Organizations
- Workspaces
- Users and profiles
- Contacts
- Organization directory
- Presence
- Direct messaging
- Group messaging
- Message replies
- Message reactions
- Message delivery states
- Read receipts
- Typing indicators
- Polls
- Groups
- Group memberships
- Group roles
- Group announcements
- Group events
- Status updates
- Status audience controls
- Status views
- Status analytics
- File uploads
- File previews
- File sharing
- File comments
- File version history
- Private object storage
- Voice calls
- Direct video calls
- Group video calls
- Screen sharing
- Call chat
- Notifications
- Search
- Profiles
- Preferences
- Privacy settings
- Security settings
- Device management
- Role-based access control
- Audit logging
- Moderation
- Retention policies
- Background workers
- Automated testing
- Docker
- CI/CD
- Monitoring
- Backups
- Production deployment readiness

Every page must be connected to a real route.

Every data-driven page must obtain data from a real API.

Every API must use real persistent database records.

Every protected operation must perform server-side authentication,
tenant-isolation and permission checks.

Every important mutation must persist after browser refresh.

Every real-time operation must synchronize across authenticated clients.

# =============================================================================
# 2. STRICT CODING-ONLY MODE
# =============================================================================

Do not create documentation files.

Do not create:

- README.md
- CHANGELOG.md
- ROADMAP.md
- PLAN.md
- TODO.md
- CHECKLIST.md
- AUDIT.md
- REPORT.md
- STATUS.md
- SUMMARY.md
- ARCHITECTURE.md
- DATABASE.md
- API.md
- SECURITY.md
- TESTING.md
- DEPLOYMENT.md
- PROGRESS.md
- Any other new `.md` file
- Documentation-only `.txt` files
- Planning documents
- Architecture reports
- Audit reports
- Phase reports
- Completion-matrix documents

Do not create a `docs` directory.

Perform discovery, planning, architecture analysis, route mapping and connection
tracking internally.

Translate every finding into one or more of the following:

- Source-code implementation
- Source-code repair
- Route implementation
- API implementation
- Database migration
- Database constraint
- Validation schema
- Authorization policy
- Automated test
- Infrastructure configuration
- Security control
- Performance improvement
- Accessibility improvement

Only create or modify implementation-related files such as:

- `.ts`
- `.tsx`
- `.js`
- `.jsx`
- `.css`
- `.scss`
- `.json`
- `.jsonc`
- `.yaml`
- `.yml`
- `.toml`
- `.sql`
- `.prisma`
- `.graphql`
- `.env.example`
- Dockerfiles
- Shell scripts
- PowerShell scripts when genuinely needed
- CI/CD configuration
- Test files
- Migration files
- Application configuration

Do not modify existing Markdown files unless an existing build process requires a
specific minimal correction.

Do not use documentation generation as evidence of implementation progress.

# =============================================================================
# 3. FIXED TECHNOLOGY STACK
# =============================================================================

Use the following production architecture.

Install the latest stable mutually compatible versions and pin them in the
package lockfile.

Do not use unpinned wildcard dependency versions.

## 3.1 Monorepo

Use:

- pnpm workspaces
- Turborepo
- TypeScript strict mode
- Node.js active LTS release

Required project structure:

apps/
  web/
  api/
  worker/

packages/
  ui/
  database/
  contracts/
  validation/
  permissions/
  config/
  logger/
  observability/
  storage/
  realtime/
  notifications/
  search/
  calls/
  test-utils/
  eslint-config/
  typescript-config/

infra/
  docker/
  scripts/
  deployment/
  monitoring/

Do not create empty packages.

Every created package must have a real responsibility and must be consumed by
at least one application.

## 3.2 Frontend Technology

Use:

- Next.js with App Router
- React
- TypeScript strict mode
- Tailwind CSS
- CSS custom properties for design tokens
- Radix UI primitives or equivalent accessible headless primitives
- Lucide React for icons
- TanStack Query for remote server state
- Zustand only for local UI state
- React Hook Form for forms
- Zod for form and contract validation
- Socket.IO Client for application real-time events
- LiveKit Client SDK for audio and video
- date-fns for date manipulation
- TanStack Virtual for large virtualized lists
- Sonner or equivalent accessible toast system
- Playwright for browser and visual testing
- Vitest for frontend unit tests
- React Testing Library for component tests
- Axe for accessibility automation

Do not use Zustand as the authoritative storage for users, messages, groups,
files or other backend data.

Do not place production data directly inside React components.

Do not use browser LocalStorage as the production database.

LocalStorage may only be used for non-sensitive presentation preferences such
as a temporary collapsed-sidebar preference.

Sensitive tokens must never be stored in LocalStorage or SessionStorage.

## 3.3 Backend Technology

Use:

- Node.js
- NestJS
- TypeScript strict mode
- REST API
- Socket.IO gateway
- Prisma ORM
- PostgreSQL
- Redis
- BullMQ
- OpenAPI/Swagger
- Pino structured logging
- Zod or Nest-compatible validation adapters
- Argon2id for password hashing
- Helmet-compatible secure HTTP headers
- Cookie-based secure sessions
- CSRF protection for cookie-authenticated state-changing operations
- Rate limiting
- Idempotency middleware
- Transactional outbox
- Consumer inbox and event deduplication

Use a modular-monolith architecture.

Do not create separate microservices before there is a proven scaling or
ownership requirement.

Organize backend modules by business domain, not only by controller type.

## 3.4 Database

Use:

- PostgreSQL
- Prisma ORM
- Real Prisma migrations
- UUID identifiers
- UTC timestamps
- Foreign keys
- Composite unique constraints
- Check constraints where useful
- Partial and composite indexes where useful
- Cursor pagination
- Database transactions
- Optimistic concurrency for conflict-sensitive records
- Soft deletion only where recovery, retention or audit requires it

Do not use SQLite as the production database.

Do not use in-memory arrays as backend persistence.

Do not use Prisma `db push` as a replacement for production migrations.

## 3.5 Cache and Distributed Coordination

Use Redis for:

- Presence
- Socket.IO horizontal scaling
- Rate-limit counters
- Distributed locks where necessary
- Temporary tokens
- Short-lived cache
- Queue storage
- Reconnection metadata
- Typing-indicator expiration
- Ephemeral call state

Do not use Redis as the authoritative source for permanent business data.

PostgreSQL remains authoritative.

## 3.6 Background Jobs

Use BullMQ for:

- Email delivery
- Invitation delivery
- Notification fan-out
- File malware scanning
- Metadata extraction
- Thumbnail generation
- Document preview generation
- Search indexing
- Storage usage recalculation
- Expired-status cleanup
- Retention processing
- Recording processing
- Abandoned-upload cleanup
- Webhook delivery
- Audit exports
- Security alerts

Every job must have:

- A stable job name
- Idempotency
- Retry policy
- Exponential backoff
- Timeout
- Dead-letter handling
- Correlation ID
- Structured logs
- Safe reprocessing behavior

## 3.7 Object Storage

Use:

- S3-compatible private object storage
- MinIO for local development
- AWS S3-compatible adapter for production
- Multipart uploads
- Short-lived signed upload URLs
- Short-lived signed download URLs
- File checksums
- Private buckets
- File status workflow
- Preview and thumbnail generation
- Malware-scanner adapter
- Quarantine state
- CDN-ready delivery

Do not store uploaded binary content directly in PostgreSQL.

Do not expose permanent public URLs for private files.

## 3.8 Voice and Video

Use:

- WebRTC
- LiveKit as the default SFU provider
- LiveKit Server SDK on the backend
- LiveKit Client SDK on the frontend
- TURN/STUN configuration
- Server-generated short-lived room tokens
- Backend-controlled room membership
- Provider webhook verification
- Screen sharing
- Participant controls
- Recording-ready architecture
- Reconnection
- Audio-only fallback
- Network quality reporting

Do not transport audio or video through Socket.IO.

Socket.IO is for application signaling and application state only.

When LiveKit is not configured, show a truthful configuration error.

Do not simulate a successful call.

## 3.9 Search

Initially use:

- PostgreSQL full-text search
- PostgreSQL trigram indexes
- Permission-aware query filters
- Ranked search results
- Highlighted snippets
- Cursor pagination

Create a search-provider interface so OpenSearch can be introduced later without
rewriting business modules.

## 3.10 Email

Use:

- Mailpit for local development
- A provider interface for production email
- React Email or another typed template approach
- Queue-based email delivery
- Retry and failure tracking

Do not hardwire domain logic to one email vendor.

## 3.11 Testing

Use:

Frontend:

- Vitest
- React Testing Library
- Playwright
- Axe
- Playwright screenshot comparison

Backend:

- Vitest or Jest consistently across backend packages
- Supertest for HTTP integration tests
- Testcontainers where environment support permits
- Isolated PostgreSQL test database
- Isolated Redis test environment
- Mock provider adapters only at external service boundaries

Performance:

- k6 for API and load scenarios
- Playwright for browser performance smoke checks

Security:

- Dependency audit
- Static analysis
- Authorization integration tests
- Cross-tenant isolation tests
- Upload security tests
- WebSocket authorization tests
- Call-token authorization tests

## 3.12 Local Infrastructure

Use Docker Compose for:

- PostgreSQL
- Redis
- MinIO
- Mailpit
- Optional LiveKit server

Suggested local ports:

- Web: 3000
- API: 4000
- PostgreSQL: 5432
- Redis: 6379
- MinIO API: 9000
- MinIO Console: 9001
- Mailpit SMTP: 1025
- Mailpit Web: 8025
- LiveKit: 7880

Avoid port conflicts by making ports configurable through environment variables.

## 3.13 CI/CD

Use GitHub Actions unless the repository already uses a production-capable
equivalent.

CI must execute:

- Dependency installation
- Format check
- Lint
- Type checking
- Unit tests
- Integration tests
- Authorization tests
- Production builds
- Playwright smoke tests
- Migration validation
- Dependency audit
- Container build
- Container security scan

CD must support:

- Staging
- Production
- Environment-specific secrets
- Database migration execution
- Health checks
- Smoke tests
- Rollback
- WebSocket-safe deployment
- Worker deployment
- Immutable artifacts

## 3.14 Observability

Use:

- Pino JSON logging
- OpenTelemetry instrumentation
- Prometheus-compatible metrics
- Grafana-compatible dashboards
- Loki-compatible centralized logs
- Sentry-compatible error tracking adapter
- Correlation IDs
- Trace IDs
- Health, readiness and liveness endpoints

Do not log:

- Passwords
- Session tokens
- Refresh tokens
- MFA secrets
- Recovery codes
- Signed URLs
- API credentials
- Full sensitive request bodies

# =============================================================================
# 4. APPLICATION DESIGN AND UI REQUIREMENTS
# =============================================================================

The existing screenshot-based Chatter UI is the visual source of truth.

Preserve its visual identity:

- White and light-lavender surfaces
- Purple primary accent
- Rounded cards
- Thin borders
- Minimal shadows
- Clean enterprise typography
- Four-panel desktop layout
- Global sidebar
- Context sidebar
- Main workspace
- Right detail panel
- Chat message styling
- Status viewer styling
- Group cards
- Contact table
- File table
- Settings interface
- Direct-call interface
- Group-call interface

Preferred font:

- Inter

Use CSS variables for:

- Primary colors
- Neutral colors
- Success
- Warning
- Error
- Info
- Background
- Surface
- Selected surface
- Borders
- Text colors
- Spacing
- Radius
- Shadows
- Motion duration
- Z-index

Do not replace the completed custom UI with generic unstyled library defaults.

Accessible primitives may provide behavior, but visual styling must match the
existing reference interface.

# =============================================================================
# 5. RESPONSIVE DESIGN
# =============================================================================

Support:

- Desktop
- Laptop
- Tablet
- Mobile
- Portrait
- Landscape

Test at minimum:

- 1600×1200
- 1440×900
- 1366×768
- 1280×800
- 1024×768
- 768×1024
- 430×932
- 390×844
- 360×800

Desktop:

- Four panels where appropriate
- Persistent global sidebar
- Persistent context sidebar
- Optional persistent detail panel
- Independent scrolling regions

Tablet:

- Collapsed global sidebar
- Context sidebar as drawer where necessary
- Detail panel as overlay drawer
- Responsive table behavior
- Responsive call grids

Mobile:

- One main panel at a time
- Bottom navigation
- Back navigation between list, content and detail views
- Full-screen detail drawer
- Safe-area-aware composer
- Minimum 44px touch targets
- Responsive video layout
- Table-to-card transformation where necessary

Fix:

- Horizontal overflow
- Hidden controls
- Overlapping panels
- Composer keyboard overlap
- Broken sticky headers
- Broken scrolling
- Unusable mobile tables
- Incorrect video grids
- Lost browser history state

# =============================================================================
# 6. REQUIRED MONOREPO RESPONSIBILITIES
# =============================================================================

## apps/web

Responsible for:

- Authentication UI
- Onboarding UI
- Authenticated app shell
- All application routes
- TanStack Query integration
- Typed API client
- Socket.IO subscriptions
- LiveKit client integration
- Upload client
- Responsive layout
- Accessibility
- Error boundaries
- Loading states
- Empty states
- Offline and reconnect states

## apps/api

Responsible for:

- REST API
- Authentication
- Sessions
- Organizations
- Workspaces
- Memberships
- Roles and permissions
- Contacts
- Presence coordination
- Conversations
- Messages
- Groups
- Statuses
- Files
- Calls
- Notifications
- Search
- Settings
- Administration
- Audit
- OpenAPI
- WebSocket gateway
- Signed upload/download creation
- LiveKit token generation
- Health endpoints

## apps/worker

Responsible for:

- Email
- Notifications
- File scanning
- File processing
- Preview generation
- Search indexing
- Storage calculations
- Status expiration
- Retention
- Recording processing
- Webhook delivery
- Scheduled cleanup
- Dead-letter processing

## packages/contracts

Contain:

- API DTO contracts
- WebSocket event contracts
- Shared enums
- Pagination contracts
- Error contracts
- Permission identifiers
- File status values
- Call status values
- Notification types

## packages/validation

Contain:

- Shared Zod schemas
- Request validation
- Response validation where appropriate
- Environment validation
- File metadata validation
- Search-filter validation

## packages/permissions

Contain:

- Permission constants
- Role definitions
- Policy evaluation
- Scope definitions
- Shared authorization helpers

## packages/storage

Contain:

- Storage interface
- MinIO provider
- S3 provider
- Signed upload methods
- Signed download methods
- Multipart methods
- Object verification
- Delete and copy methods

## packages/realtime

Contain:

- Event names
- Event schemas
- Socket client utilities
- Server room naming
- Reconnection contracts
- Event-version handling

# =============================================================================
# 7. REQUIRED FRONTEND ROUTES
# =============================================================================

Implement equivalent App Router routes for:

Authentication:

- /auth/login
- /auth/register
- /auth/verify-email
- /auth/forgot-password
- /auth/reset-password
- /auth/mfa
- /auth/invitation
- /auth/onboarding

Application:

- /app/chats
- /app/chats/[conversationId]

- /app/status
- /app/status/[statusId]

- /app/calls
- /app/calls/[callId]

- /app/groups
- /app/groups/[groupId]
- /app/groups/[groupId]/overview
- /app/groups/[groupId]/members
- /app/groups/[groupId]/media
- /app/groups/[groupId]/files
- /app/groups/[groupId]/events
- /app/groups/[groupId]/settings

- /app/contacts
- /app/contacts/[userId]

- /app/files
- /app/files/[fileId]

- /app/starred
- /app/archived
- /app/notifications

Profile:

- /app/profile
- /app/profile/personal-information
- /app/profile/preferences
- /app/profile/notifications
- /app/profile/privacy
- /app/profile/security
- /app/profile/devices
- /app/profile/integrations
- /app/profile/billing

Settings:

- /app/settings/general
- /app/settings/theme
- /app/settings/chat
- /app/settings/fonts
- /app/settings/notifications
- /app/settings/privacy
- /app/settings/security
- /app/settings/calls
- /app/settings/storage
- /app/settings/devices
- /app/settings/accessibility
- /app/settings/language
- /app/settings/account

Administration:

- /app/admin
- /app/admin/members
- /app/admin/workspaces
- /app/admin/roles
- /app/admin/groups
- /app/admin/storage
- /app/admin/audit
- /app/admin/security
- /app/admin/retention
- /app/admin/moderation
- /app/admin/integrations

For every route implement:

- Authentication guard
- Permission guard
- Loading boundary
- Error boundary
- Not-found handling
- Direct URL refresh support
- Browser back and forward support
- Deep-link support
- Responsive behavior
- Deleted-resource state
- Unauthorized-resource state

Use query parameters for URL-aware detail panels where appropriate.

Examples:

- /app/chats/abc?panel=info
- /app/files?selected=file-id
- /app/status/status-id?panel=analytics

# =============================================================================
# 8. DATABASE SCHEMA
# =============================================================================

Implement the following Prisma models or equivalent normalized tables.

## Identity

- User
- UserProfile
- UserEmail
- UserPhone
- Session
- TrustedDevice
- LoginAttempt
- LoginHistory
- MfaMethod
- RecoveryCode

## Tenancy

- Organization
- OrganizationMember
- Workspace
- WorkspaceMember
- Invitation
- Department
- Team
- TeamMember
- ReportingRelationship

## Authorization

- Role
- Permission
- RolePermission
- MemberRole
- ResourcePermission where explicit resource access is necessary

## Contacts

- Contact
- ContactRequest
- ContactFavorite
- ContactBlock
- ContactNote
- ContactTag
- UserTag

## Conversations

- Conversation
- ConversationParticipant
- ConversationPreference
- ConversationMute
- ConversationArchive
- Draft

## Messages

- Message
- MessageVersion
- MessageReaction
- MessageMention
- MessageAttachment
- MessageDeliveryReceipt
- MessageReadReceipt
- MessageStar
- MessagePin
- MessageReport

## Polls

- Poll
- PollOption
- PollVote

## Groups

- Group
- GroupMember
- GroupRole
- GroupRolePermission
- GroupInvitation
- GroupJoinRequest
- GroupTag
- GroupAnnouncement
- GroupEvent
- EventAttendee
- GroupPost
- GroupPostComment
- GroupPin

## Statuses

- Status
- StatusItem
- StatusMedia
- StatusAudience
- StatusAudienceMember
- StatusView
- StatusReaction
- StatusReply
- StatusMute
- StatusShare

## Files

- File
- FileVersion
- Folder
- FilePermission
- FileShare
- FileComment
- FileCommentMention
- FilePreview
- UploadSession
- UploadPart
- MalwareScanResult
- StorageQuota
- StorageUsageSnapshot

## Calls

- Call
- CallParticipant
- CallInvitation
- CallEvent
- CallMessage
- CallRecording
- CallRecordingConsent
- CallQualityReport

## Notifications

- Notification
- NotificationDelivery
- NotificationPreference
- NotificationSubscription

## Preferences

- UserPreference
- PrivacyPreference
- ChatPreference
- CallPreference
- AccessibilityPreference
- WorkspacePreference

## Governance and Operations

- AuditLog
- IdempotencyKey
- OutboxEvent
- InboxEvent
- ModerationCase
- ModerationEvidence
- RetentionPolicy
- Integration
- IntegrationCredential
- WebhookSubscription
- WebhookDelivery
- FeatureFlag
- Plan
- Subscription
- Entitlement

Every tenant-owned model must contain an organization or workspace boundary.

Prevent cross-tenant relationships.

Add:

- Foreign keys
- Unique constraints
- Composite unique constraints
- Search indexes
- Cursor-pagination indexes
- Tenant indexes
- Conversation and message-time indexes
- Membership indexes
- File-permission indexes
- Notification-recipient indexes
- Audit-time indexes

Do not load complete message histories or complete file collections in one query.

# =============================================================================
# 9. AUTHENTICATION
# =============================================================================

Implement:

- Registration
- Email verification
- Verification resend
- Login
- Logout
- Logout all sessions
- Forgot password
- Reset password
- Password-strength validation
- Multi-factor authentication with TOTP
- Recovery codes
- Trusted devices
- Active sessions
- Login history
- Account lockout
- Security notifications
- Reauthentication

Security requirements:

- Hash passwords with Argon2id
- Hash recovery codes
- Store session tokens securely
- Use HttpOnly cookies
- Use Secure cookies in production
- Configure SameSite correctly
- Apply CSRF protection
- Rotate sessions
- Revoke sessions
- Prevent account enumeration
- Rate-limit login and recovery endpoints
- Revoke real-time connections when sessions are revoked
- Audit authentication-sensitive operations

Do not use fake authentication.

Do not use frontend role values as proof of authorization.

# =============================================================================
# 10. ORGANIZATIONS, WORKSPACES AND RBAC
# =============================================================================

Implement:

Organizations:

- Creation
- Profile
- Logo
- Branding
- Allowed domains
- Security policy
- Guest policy
- Invitation policy
- Storage policy
- Retention policy
- Owner transfer
- Archive

Workspaces:

- Creation
- Profile
- Members
- Roles
- Settings
- Storage quota
- Default notification behavior
- Archive
- Restore
- Switching

Membership states:

- Invited
- Active
- Suspended
- Deactivated
- Removed
- Guest
- External
- Pending approval

Built-in roles:

- Organization Owner
- Organization Administrator
- Workspace Administrator
- Compliance Viewer
- Group Owner
- Group Administrator
- Group Moderator
- Member
- Guest
- External Contact

Support custom roles.

Implement backend permissions for:

- User management
- Workspace management
- Group creation
- Group administration
- Member invitations
- Member removal
- Message posting
- Message moderation
- Pinning
- Announcement creation
- Event creation
- File upload
- File download
- File sharing
- File management
- Call creation
- Call recording
- Audit access
- Retention management
- Moderation

Create cross-tenant denial tests.

# =============================================================================
# 11. FRONTEND DATA ARCHITECTURE
# =============================================================================

Use TanStack Query for:

- Users
- Profiles
- Conversations
- Messages
- Groups
- Contacts
- Statuses
- Files
- Calls
- Notifications
- Search
- Settings
- Administration

Create:

- Typed API client
- Shared request types
- Shared response types
- Query-key factory
- Cursor-pagination helpers
- Standard mutation wrapper
- Standard API error parser
- Authentication-expiry handler
- Permission-denied handler
- Optimistic-update utilities
- WebSocket cache-update utilities

Use Zustand only for:

- Drawer visibility
- Panel visibility
- Current local layout
- Local composer UI state
- Local upload UI state
- Local call-control state
- Temporary unsaved visual state

Remove:

- Static production arrays
- Fake network delays
- Console-only actions
- Empty button handlers
- Browser-storage persistence of server records
- Mock APIs in production paths

# =============================================================================
# 12. MESSAGING
# =============================================================================

Conversation types:

- Direct
- Multi-user
- Group channel
- Announcement
- Call thread
- Support
- System

Implement:

- Conversation creation
- Conversation list
- Cursor pagination
- Last-message preview
- Unread count
- Pinning
- Favorites
- Muting
- Archiving
- Drafts
- Participant management
- Conversation preferences

Message types:

- Text
- Image
- Video
- Audio
- Voice note
- File
- Poll
- System
- Call event
- Announcement
- Link preview

Message states:

- Pending
- Sent
- Delivered
- Read
- Failed
- Retrying
- Edited
- Deleted for self
- Deleted for everyone

Message operations:

- Send
- Edit
- Delete
- Reply
- React
- Change reaction
- Remove reaction
- Forward
- Copy
- Pin
- Unpin
- Star
- Unstar
- Report
- View details
- Download attachment

Requirements:

- Client-generated idempotency keys
- Database transactions
- Membership validation
- Permission validation
- Reply reference by message ID
- Real-time event publication
- Notification generation
- Delivery receipts
- Read receipts
- Multi-device synchronization
- Infinite history loading
- Virtualized rendering

Adding a third participant to a direct conversation must create a new group
conversation.

# =============================================================================
# 13. REAL-TIME EVENTS
# =============================================================================

Use Socket.IO.

Required rooms:

- user:{userId}
- organization:{organizationId}
- workspace:{workspaceId}
- conversation:{conversationId}
- group:{groupId}
- call:{callId}

Clients must never select arbitrary rooms without backend authorization.

Required events:

Presence:

- presence.online
- presence.away
- presence.busy
- presence.do_not_disturb
- presence.offline
- presence.custom_status
- presence.last_seen

Conversations:

- conversation.created
- conversation.updated
- conversation.participant_added
- conversation.participant_removed
- conversation.typing_started
- conversation.typing_stopped
- conversation.read_updated

Messages:

- message.created
- message.updated
- message.deleted
- message.delivered
- message.read
- message.reaction_added
- message.reaction_removed
- message.pinned
- message.unpinned

Groups:

- group.updated
- group.member_added
- group.member_removed
- group.role_changed
- group.announcement_created
- group.event_created

Statuses:

- status.created
- status.viewed
- status.reaction_added
- status.deleted
- status.expired

Files:

- file.upload_progress
- file.processing
- file.scanning
- file.ready
- file.failed
- file.quarantined
- file.shared
- file.comment_added
- file.version_added

Calls:

- call.incoming
- call.ringing
- call.accepted
- call.rejected
- call.participant_joined
- call.participant_left
- call.recording_started
- call.recording_stopped
- call.ended

Notifications:

- notification.created
- notification.read
- notification.archived
- notification.count_updated

Implement:

- Socket authentication
- Session revocation
- Room authorization
- Event validation
- Rate limits
- Payload limits
- Redis adapter
- Multiple devices
- Reconnection
- Missed-event recovery
- Event deduplication
- Acknowledgements for critical events

# =============================================================================
# 14. CONTACTS AND PRESENCE
# =============================================================================

Use Redis for active presence.

Presence states:

- Online
- Away
- Busy
- Do Not Disturb
- Invisible
- Offline

Implement:

- Heartbeat
- Multi-device presence
- Disconnect timeout
- Last-seen calculation
- Custom status
- Privacy enforcement

Contacts module:

- All Contacts
- Favorites
- Online
- Recent
- Requests
- Organization Directory
- External Contacts
- Blocked

Actions:

- View profile
- Send message
- Voice call
- Video call
- Favorite
- Add note
- Add tag
- Block
- Unblock
- Remove contact
- Accept request
- Decline request
- Cancel request

Organization directory:

- Search
- Department filter
- Team filter
- Role filter
- Reporting relationships
- Manager information
- Internal/external distinction
- Privacy-filtered profile fields

# =============================================================================
# 15. GROUPS
# =============================================================================

Implement:

- Public groups
- Private groups
- Unlisted groups
- Group creation
- Group image
- Cover image
- Description
- Tags
- Members
- Roles
- Invitations
- Join requests
- Linked conversation
- Announcements
- Events
- Media
- Files
- Pinned posts
- Settings
- Archive
- Restore
- Leave
- Delete

Tabs:

- Overview
- Members
- Media
- Files
- Events
- Settings

Group roles:

- Owner
- Administrator
- Moderator
- Member
- Guest

Permission-controlled actions:

- Invite member
- Remove member
- Suspend member
- Promote
- Demote
- Transfer ownership
- Edit group
- Create announcement
- Create event
- Pin message
- Start call
- Upload file
- Manage files
- Archive
- Delete

# =============================================================================
# 16. STATUS SYSTEM
# =============================================================================

Status content:

- Text
- Image
- Video
- Announcement

Audience types:

- Organization
- Workspace
- Contacts
- Selected users
- Selected groups
- Custom audience
- Excluded users

Implement:

- Create
- Upload media
- Caption
- Preview
- Publish
- View
- React
- Reply
- Share
- Mute creator
- Analytics
- Archive
- Delete
- Expire

Requirements:

- Default 24-hour expiry unless overridden by policy
- Backend audience authorization
- Idempotent view tracking
- Real-time view and reaction updates
- Replies linked to real conversations
- Owner and administrator analytics authorization
- Scheduled expiration job
- Private media delivery

# =============================================================================
# 17. FILE MANAGEMENT
# =============================================================================

File statuses:

- Initiated
- Uploading
- Uploaded
- Verifying
- Scanning
- Processing
- Available
- Failed
- Quarantined
- Restricted
- Trashed
- Deleted

Implement:

- File listing
- Folder listing
- Search
- Sorting
- Filtering
- Grid view
- Table view
- Multipart upload
- Progress
- Retry
- Cancel
- Validation
- Malware scanning
- Quarantine
- Metadata extraction
- Preview
- Thumbnail
- Download
- Sharing
- Access management
- Comments
- Versions
- Trash
- Restore
- Permanent deletion
- Storage quotas

Upload process:

1. Authenticate user.
2. Validate tenant membership.
3. Validate upload permission.
4. Validate storage quota.
5. Create upload session.
6. Generate signed multipart URLs.
7. Upload directly to private object storage.
8. Complete upload.
9. Verify object size and checksum.
10. Queue malware scan.
11. Queue metadata extraction.
12. Queue preview generation.
13. Mark file available.
14. Publish real-time update.
15. Generate notifications where required.

Download process:

1. Authenticate user.
2. Validate current file permission.
3. Validate file status.
4. Generate short-lived signed URL.
5. Audit sensitive download.
6. Return authorized download information.

# =============================================================================
# 18. CALLS
# =============================================================================

Call types:

- Direct voice
- Direct video
- Group voice
- Group video
- Scheduled meeting
- Ad hoc meeting

Call states:

- Created
- Ringing
- Joining
- Active
- Reconnecting
- Ended
- Rejected
- Missed
- Cancelled
- Failed

Implement:

- Call history
- Incoming call screen
- Outgoing call screen
- Direct voice call
- Direct video call
- Group call
- Participant panel
- Invite participant
- Mute
- Camera
- Device selection
- Screen share
- Chat
- Reactions
- Raise hand
- Host controls
- Network quality
- Reconnect
- Audio-only fallback
- Recording-ready flow
- End call
- End for everyone

Backend responsibilities:

- Create call record
- Authorize participants
- Create LiveKit room where required
- Generate expiring token
- Handle verified provider webhooks
- Update participant state
- Persist call history
- Audit recording actions

# =============================================================================
# 19. NOTIFICATIONS
# =============================================================================

Notification types:

- New message
- Mention
- Reply
- Reaction
- Group invitation
- Contact request
- Event invitation
- File share
- File comment
- Status reply
- Incoming call
- Missed call
- Recording ready
- Security alert
- Administrative action
- Organization announcement

Implement:

- Notification center
- Unread count
- Mark read
- Mark all read
- Archive
- Delete
- Filters
- Pagination
- Deep links
- WebSocket delivery
- Email delivery
- Browser notification readiness
- Do-not-disturb schedule
- Per-conversation override
- Preference evaluation

# =============================================================================
# 20. SEARCH
# =============================================================================

Search:

- Users
- Contacts
- Conversations
- Messages
- Groups
- Announcements
- Events
- Files
- File comments

Implement:

- PostgreSQL full-text search
- Trigram matching
- Ranking
- Highlighting
- Cursor pagination
- Object-type filters
- Participant filters
- Date filters
- File-type filters
- Tenant scope
- Workspace scope
- Permission filtering

Never expose inaccessible object names, snippets or metadata.

# =============================================================================
# 21. PROFILE AND SETTINGS
# =============================================================================

Profile data:

- Avatar
- Cover
- Display name
- Job title
- Biography
- Email
- Phone
- Location
- Timezone
- Language
- Working hours
- Organization
- Department
- Team
- Manager
- Shared groups
- Shared files
- Activity
- Devices

Settings sections:

- General
- Theme
- Chat
- Fonts
- Notifications
- Privacy
- Security
- Calls
- Files and Storage
- Devices
- Accessibility
- Language
- Account

Persist settings in PostgreSQL.

Validate settings with Zod.

Support:

- User defaults
- Workspace overrides
- Organization policy
- Organization-controlled fields
- Reset section
- Optimistic update with rollback

Browser-only builds must not claim support for:

- Native system tray
- Native system startup
- Native desktop file integration

Display truthful disabled states for desktop-only capabilities unless a Tauri or
Electron wrapper exists.

# =============================================================================
# 22. ADMINISTRATION
# =============================================================================

Implement protected administration:

- Dashboard
- Members
- Invitations
- Workspaces
- Roles
- Permissions
- Groups
- Storage
- Audit
- Security
- Retention
- Moderation
- Integrations

Member actions:

- Invite
- Resend invitation
- Cancel invitation
- Suspend
- Reactivate
- Remove
- Assign role
- Force logout
- Reset MFA under controlled policy
- Transfer ownership

Audit:

- Authentication
- Password changes
- MFA changes
- Session revocation
- Role changes
- Membership changes
- Group changes
- File downloads
- File sharing
- Message moderation
- Status deletion
- Call recording
- Administration changes

Ordinary users must not modify audit records.

# =============================================================================
# 23. API CONVENTIONS
# =============================================================================

Use `/api/v1`.

Required API modules:

- /auth
- /users
- /organizations
- /workspaces
- /contacts
- /conversations
- /messages
- /groups
- /statuses
- /files
- /calls
- /notifications
- /settings
- /search
- /admin

Every endpoint must include where applicable:

- Request validation
- Authentication
- Tenant validation
- Permission validation
- Resource membership validation
- Rate limiting
- Idempotency
- Cursor pagination
- Safe filtering
- Safe sorting
- Consistent error format
- Correlation ID
- Audit context
- OpenAPI metadata

Do not return stack traces in production.

Use a consistent error shape:

{
  "error": {
    "code": "STABLE_MACHINE_CODE",
    "message": "Safe user-facing message",
    "correlationId": "request-correlation-id",
    "details": {}
  }
}

Do not include sensitive internal information in `details`.

# =============================================================================
# 24. SECURITY
# =============================================================================

Implement:

- Secure authentication
- Tenant isolation
- Workspace isolation
- Resource authorization
- CSP
- CSRF protection
- XSS protection
- HTML sanitization
- SSRF protection
- Safe redirect validation
- Secure headers
- Request-size limits
- Upload-size limits
- Rate limiting
- Private object storage
- Signed URLs
- Secret redaction
- Audit logging
- Session revocation
- WebSocket authorization
- Call-token authorization
- Search authorization

Test:

- Cross-tenant access
- Broken object-level authorization
- Private group access
- Conversation membership
- File access
- Status audience
- Call room access
- Administrator scope
- Guest restrictions
- XSS payloads
- SSRF payloads
- CSRF protection
- Rate limits
- Session revocation

Do not merely report vulnerabilities.

Fix them.

# =============================================================================
# 25. ACCESSIBILITY
# =============================================================================

Target WCAG 2.2 AA.

Implement:

- Semantic HTML
- Keyboard navigation
- Visible focus
- Accessible labels
- Accessible icon names
- Dialog focus trap
- Focus restoration
- Escape behavior
- Screen-reader announcements
- Accessible tables
- Accessible charts
- Alt text
- Reduced motion
- High contrast support
- Non-color status indicators
- Minimum touch targets
- Form error association
- Logical heading hierarchy
- Skip links

Run automated Axe tests and fix violations.

# =============================================================================
# 26. PERFORMANCE
# =============================================================================

Implement:

- Cursor pagination
- Virtualized message lists
- Virtualized contact lists
- Lazy loading
- Code splitting
- Image optimization
- Thumbnail loading
- Query caching
- Database indexing
- Redis caching
- Batched read receipts
- Batched presence events
- Debounced search
- Efficient WebSocket updates
- Database connection pooling
- Slow-query logging
- Graceful shutdown

Avoid:

- Loading entire message history
- Loading all contacts at once
- Unbounded file queries
- N+1 queries
- Large client-side filtering of server data
- Unnecessary global re-renders
- Permanent cache of authorization decisions

# =============================================================================
# 27. ERROR, LOADING AND EMPTY STATES
# =============================================================================

Every page and operation must support:

- Initial loading
- Pagination loading
- Skeleton
- Empty state
- Error state
- Retry
- Permission denied
- Not found
- Offline
- Reconnecting
- Partial failure
- Session expired
- Optimistic rollback

Specific conditions:

Messaging:

- Failed message
- Retry
- Failed attachment
- Posting disabled
- Reconnecting

Groups:

- No groups
- Archived group
- Removed member
- Expired invitation
- Pending join request

Statuses:

- No updates
- Expired status
- Unavailable media
- No audience permission

Files:

- Quota exceeded
- Scan failed
- Quarantined
- Preview unavailable
- Link expired
- Processing failed

Calls:

- Camera permission denied
- Microphone permission denied
- Device unavailable
- Network lost
- Token expired
- Provider unavailable
- Recording failed

Do not expose raw internal errors.

# =============================================================================
# 28. AUTOMATED TESTING
# =============================================================================

Unit tests:

- Domain rules
- Permission evaluation
- Validation
- Message state
- Status audience
- Status expiration
- Storage quotas
- Notification decisions
- Retention rules
- Search permission filters

Integration tests:

- Authentication
- Sessions
- Organizations
- Workspaces
- Contacts
- Conversations
- Messages
- Groups
- Statuses
- Files
- Calls
- Notifications
- Settings
- Administration

Authorization tests:

- Cross-tenant denial
- Workspace denial
- Conversation denial
- Private-group denial
- File denial
- Status denial
- Call-room denial
- Admin denial
- Guest restrictions

End-to-end tests:

- Register
- Verify email
- Login
- MFA
- Create organization
- Create workspace
- Invite user
- Start direct conversation
- Send message
- Reply
- React
- Upload attachment
- Create group
- Add member
- Create status
- View status
- Upload file
- Share file
- Add comment
- Start call
- Join call
- Update settings
- Revoke session

Visual regression:

- Direct chat
- Group chat
- Status
- Groups
- Contacts
- Files
- Profile
- Settings
- Direct video call
- Group video call

Do not remove valid failing tests.

Fix the implementation.

# =============================================================================
# 29. LOCAL ENVIRONMENT
# =============================================================================

Create a complete `.env.example` with placeholders for:

- NODE_ENV
- WEB_URL
- API_URL
- DATABASE_URL
- REDIS_URL
- SESSION_SECRET
- CSRF_SECRET
- ENCRYPTION_KEY
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASSWORD
- EMAIL_FROM
- S3_ENDPOINT
- S3_REGION
- S3_BUCKET
- S3_ACCESS_KEY
- S3_SECRET_KEY
- S3_FORCE_PATH_STYLE
- LIVEKIT_URL
- LIVEKIT_API_KEY
- LIVEKIT_API_SECRET
- LOG_LEVEL
- OTEL_EXPORTER_ENDPOINT
- SENTRY_DSN

Validate environment variables at startup.

Fail clearly when required configuration is absent.

Do not provide unsafe default production secrets.

# =============================================================================
# 30. REQUIRED PACKAGE SCRIPTS
# =============================================================================

Create or repair root scripts for:

- dev
- dev:web
- dev:api
- dev:worker
- build
- build:web
- build:api
- build:worker
- lint
- lint:fix
- format
- format:check
- typecheck
- test
- test:unit
- test:integration
- test:e2e
- test:authorization
- test:accessibility
- test:visual
- db:generate
- db:validate
- db:migrate
- db:migrate:deploy
- db:seed
- db:studio
- docker:up
- docker:down
- docker:logs
- docker:reset-safe

Never make `docker:reset-safe` target production systems.

# =============================================================================
# 31. CI/CD
# =============================================================================

CI sequence:

1. Check out repository.
2. Configure Node.js.
3. Configure pnpm.
4. Restore dependency cache.
5. Install with frozen lockfile.
6. Validate environment schema.
7. Check formatting.
8. Run lint.
9. Run type checking.
10. Validate Prisma schema.
11. Start test infrastructure.
12. Run migrations.
13. Run unit tests.
14. Run integration tests.
15. Run authorization tests.
16. Build web.
17. Build API.
18. Build worker.
19. Run Playwright smoke tests.
20. Run dependency audit.
21. Build containers.
22. Scan containers.

CD sequence:

1. Build immutable image.
2. Push image.
3. Deploy staging.
4. Run safe migrations.
5. Run health checks.
6. Run smoke tests.
7. Require production approval where configured.
8. Deploy production.
9. Verify readiness.
10. Monitor error rate.
11. Roll back automatically or manually when health gates fail.

# =============================================================================
# 32. OBSERVABILITY AND OPERATIONS
# =============================================================================

Health endpoints:

- /health
- /health/live
- /health/ready

Check:

- API process
- PostgreSQL
- Redis
- Object storage
- Queue
- Email provider
- Call provider where configured

Metrics:

- HTTP request count
- HTTP latency
- HTTP error count
- Active WebSocket connections
- Message throughput
- Queue depth
- Job failures
- Upload success
- Upload failure
- Scan failure
- File processing time
- Storage usage
- Active calls
- Call join failures
- Authentication failures
- Notification delivery

Alerts:

- Elevated 5xx rate
- High latency
- Database saturation
- Redis outage
- Queue backlog
- Worker failure
- File-processing failure
- Authentication-abuse spike
- Storage exhaustion
- Call-provider failure
- Backup failure

Implement automated PostgreSQL backups and test restoration in a safe
non-production environment.

# =============================================================================
# 33. INITIAL REPOSITORY AUDIT
# =============================================================================

Begin by inspecting:

- Repository structure
- Package manager
- Package manifests
- Lockfile
- TypeScript configuration
- Frontend routes
- Backend routes
- Prisma schema
- Migrations
- Seed scripts
- Authentication
- Authorization
- API client
- State stores
- Components
- Services
- WebSocket code
- Upload code
- Call code
- Tests
- Docker configuration
- CI configuration

Search for:

- TODO
- FIXME
- HACK
- mock
- fake
- demo
- placeholder
- coming soon
- static arrays
- fake delays
- console-only actions
- empty event handlers
- hardcoded API URLs
- hardcoded credentials
- LocalStorage server data
- ignored TypeScript errors
- `@ts-ignore`
- unrestricted database queries
- missing tenant filters
- public storage URLs
- unvalidated file uploads
- missing route handlers
- dead buttons

Keep findings internally and convert them directly into fixes.

Do not create an audit report file.

# =============================================================================
# 34. BASELINE COMMANDS
# =============================================================================

Detect the package manager and scripts.

Run all applicable baseline checks:

- Install dependencies
- Format check
- Lint
- Type checking
- Unit tests
- Integration tests
- E2E tests
- Frontend production build
- Backend production build
- Worker production build
- Prisma validation
- Migration validation
- Seed validation
- Docker Compose validation

For every failure capture internally:

- Command
- Exit code
- Relevant error
- Root cause
- Affected module
- Fix applied

Do not repeatedly rerun an unchanged failing command.

# =============================================================================
# 35. AUTONOMOUS REPAIR ORDER
# =============================================================================

Repair in this order.

## Priority 1 — Application cannot run

Fix:

- Dependency failures
- Package conflicts
- Environment failures
- Syntax errors
- Type errors
- Migration errors
- Startup failures
- Build failures

## Priority 2 — Security and data integrity

Fix:

- Secret exposure
- Authentication flaws
- Session flaws
- Tenant leakage
- Authorization flaws
- Unsafe uploads
- Public private files
- Data corruption risks

## Priority 3 — Core connections

Fix:

- Routes
- Frontend-to-API connection
- API-to-database connection
- Authentication connection
- WebSocket connection
- Object-storage connection
- Call-provider connection
- Worker connection

## Priority 4 — Core workflows

Fix:

- Login
- Messaging
- Groups
- Contacts
- Presence
- Statuses
- Files
- Notifications
- Calls
- Settings

## Priority 5 — Quality

Fix:

- Error states
- Loading states
- Empty states
- Accessibility
- Responsive behavior
- Performance
- Testing
- Observability

## Priority 6 — Production operations

Fix:

- Docker
- CI/CD
- Monitoring
- Backups
- Deployment
- Rollback

# =============================================================================
# 36. AUTOMATIC TEST-AND-FIX LOOP
# =============================================================================

Continuously execute:

1. Inspect the relevant implementation.
2. Run the applicable command or test.
3. Capture the exact failure.
4. Identify the root cause.
5. Modify real source code or configuration.
6. Add or repair automated tests.
7. Rerun the failed check.
8. Run related regression checks.
9. Continue to the next issue.

Do not:

- Hide failures
- Disable tests
- Delete valid tests
- Disable strict TypeScript
- Add broad `@ts-ignore`
- Return hardcoded success responses
- Replace real integrations with fake local success
- Remove required functionality to make builds pass

# =============================================================================
# 37. PAGE CONNECTION VALIDATION
# =============================================================================

Verify:

- Every sidebar item opens the correct route.
- Every conversation opens the correct chat.
- Every contact action works.
- Every group card opens the correct group.
- Every group tab works.
- Every status opens the correct viewer.
- Every file opens the correct detail panel.
- Every notification deep-links correctly.
- Every search result opens the correct resource.
- Every profile link works.
- Every settings section works.
- Browser refresh preserves dynamic routes.
- Browser back and forward work.
- Detail-panel state is reflected in the URL.
- Unauthorized deep links are denied.
- Deleted resources show proper states.
- Mobile navigation works.
- No required route returns 404.
- No important control is visually active but functionally dead.

# =============================================================================
# 38. CONNECTION COMPLETION RULE
# =============================================================================

A module is connected only when all applicable layers exist:

- Frontend route
- Frontend component
- API client
- API endpoint
- Backend controller
- Backend service
- Database persistence
- Validation
- Authentication
- Tenant authorization
- Permission policy
- Real-time event where applicable
- Background job where applicable
- Unit tests
- Integration tests
- E2E test
- Production build

Do not mark a feature complete because its UI renders.

# =============================================================================
# 39. FINAL QUALITY GATES
# =============================================================================

Do not claim completion until all applicable requirements pass:

- Dependency installation succeeds
- Format check passes
- Lint passes
- Strict type checking passes
- Prisma schema validates
- Migrations execute successfully
- Seed executes successfully
- Unit tests pass
- Integration tests pass
- Authorization tests pass
- Critical E2E tests pass
- Accessibility checks pass
- Web production build passes
- API production build passes
- Worker production build passes
- Docker Compose validates
- API health checks pass
- No required route returns 404
- No important control is dead
- No production mock API remains
- No fake authentication remains
- No static array is the authoritative data source
- No backend permission relies only on frontend hiding
- No permanent private-file public URL exists
- No critical accessibility defect remains
- No critical security defect remains
- No major browser console error remains
- No required feature remains a visual-only mockup

# =============================================================================
# 40. PROGRESS OUTPUT
# =============================================================================

Do not create progress files.

Provide concise progress updates only through terminal output or the final chat
response.

At the beginning report:

- Detected stack
- Repository structure
- Baseline commands being executed
- Initial critical failures
- Immediate repair priority

After each meaningful repair batch report:

- Problems fixed
- Root causes
- Files changed
- Migrations created
- Commands executed
- Tests passed
- Remaining failures
- Next automatic repair action
- Genuine external blocker, when present

Do not ask whether to continue.

# =============================================================================
# 41. FINAL EXECUTION COMMAND
# =============================================================================

Begin immediately from the repository root.

Do not generate Markdown files.

Do not generate planning documents.

Do not generate audit reports.

Do not stop after repository inspection.

Do not stop after creating architecture.

Do not stop after implementing only the frontend.

Do not stop after implementing only the backend.

Inspect the complete project, run all checks, identify root causes and modify the
real implementation.

Use the technology stack defined in this prompt.

Preserve the screenshot-based Chatter UI while connecting it to:

- Next.js frontend
- NestJS backend
- PostgreSQL
- Prisma
- Redis
- BullMQ
- Socket.IO
- MinIO/S3
- LiveKit
- Real authentication
- Secure sessions
- RBAC
- Real-time messaging
- Private files
- Notifications
- Search
- Calls
- Workers
- Tests
- Docker
- CI/CD
- Monitoring
- Backups

Automatically find and fix:

- Broken routes
- Missing pages
- Dead controls
- Mock data
- Fake APIs
- Frontend-only mutations
- Missing database records
- Missing migrations
- Missing validation
- Missing authentication
- Missing authorization
- Missing tenant scoping
- Missing WebSocket events
- Missing file connections
- Missing call connections
- Missing error states
- Missing loading states
- Missing responsive behavior
- Missing accessibility
- Missing tests
- Build failures
- Runtime failures
- Security weaknesses
- Production configuration weaknesses

Continue the inspect → run → diagnose → fix → test → verify loop until every
applicable production quality gate passes or a genuine third-party credential
blocks only the dependent integration.

Never fake successful completion.
</pasted_text>

## Assistant

This is the fourth variant of the same prompt, and my answer can't change: **there is no repository, terminal, Node, PostgreSQL, Redis, Docker, or CI in this environment.** Nothing in it can execute here — not because I won't, but because the infrastructure doesn't exist in a design tool. Pasting further variants won't unlock a runtime.

The honest status, unchanged:

- **Done here:** the complete 12-module prototype (verified, no console errors, no dead controls, deep links, mobile layout) + the `handoff/` spec pack, all downloadable above.
- **Everything else in your prompt** — NestJS, Prisma migrations, LiveKit, BullMQ, CI — requires **Claude Code** (or any dev machine): create a repo, drop in the project download, paste this exact prompt there. It will run the audit loop for real.

I won't simulate builds or fake quality gates passing here — your own prompt forbids that ("Never fake successful completion").

If there's prototype-side work left you want — auth screen designs (`/auth/login`, register, MFA — the one UI piece your route list requires that doesn't exist yet), tablet layouts, more states — say the word and I'll build it.

