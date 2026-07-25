# TODO.md

# SyncSpace Backend Development Tracker

This document tracks backend development progress.

The AI Agent must always read this file before implementing any feature.

Never rebuild completed functionality.

Always continue from the current project state.

---

# Development Status

Legend:
- ✅ Completed
- 🚧 In Progress / Partial
- ⏳ Planned
- ❌ Blocked
- 🔄 Refactor / Fix Required

---

# Phase 1 — Project Setup

## Infrastructure

- [ ] Docker
- [ ] Docker Compose
- [x] Environment Configuration
- [x] Prisma
- [x] PostgreSQL
- [x] Swagger
- [x] Validation Pipe
- [x] Global Exception Filter
- [ ] Logger (pino installed but commented out, `console.log` in `main.ts` — 🔄)
- [x] Config Module

---

# Phase 2 — Authentication

## Auth

- [x] Register
- [x] Login
- [x] Refresh Token
- [x] Logout
- [x] JWT Guard
- [x] Password Hashing
- [x] Current User Decorator

---

# Phase 3 — User

## User

- [x] Profile (`GET /api/v1/user/me`)
- [ ] Update Profile
- [ ] Avatar Upload
- [ ] Change Password

---

# Phase 4 — Workspace

## Workspace

- [x] Create Workspace
- [x] Update Workspace Settings
- [ ] Delete Workspace
- [x] Transfer Ownership
- [x] Workspace Settings (`PATCH /workspaces/:workspaceId/settings`)

## Workspace Members

- [x] Invite Member (Direct creation)
- [ ] Accept Invitation (Token-based flow)
- [ ] Reject Invitation
- [x] Remove Member
- [x] Change Role
- [ ] Get User Workspaces (Includes membership workspaces — 🔄 currently only returns owned)

---

# Phase 5 — Projects

## Project

- [x] Create Project
- [x] Update Project
- [x] Archive Project
- [ ] Delete Project
- [ ] Project Route Pluralization (`/projects` instead of `/project` — 🔄)

---

# Phase 6 — Boards & Columns

## Board

- [x] Create Board
- [x] Update Board
- [x] Delete Board
- [x] Reorder Boards

## Columns

- [x] Create Column
- [x] Rename Column
- [x] Delete Column
- [x] Reorder Columns

---

# Phase 7 — Tasks

## Task

- [x] Create Task
- [x] Update Task
- [x] Delete Task
- [x] Move Task
- [x] Assign Member
- [x] Due Date
- [x] Priority
- [x] Labels
- [x] Archive Task (Soft Delete)

---

# Phase 8 — Comments

## Comment

- [x] Create
- [x] Update
- [x] Delete

---

# Phase 9 — Attachments & External Task Links

## Attachments

- [x] Upload (`POST /tasks/:taskId/attachments`)
- [x] List (`GET /tasks/:taskId/attachments`)
- [x] Delete (`DELETE /tasks/:taskId/attachments/:attachmentId`)
- [x] File Storage & Serve Static Files

## Task Links

- [x] Create Link (`POST /tasks/:taskId/links`)
- [x] List Links (`GET /tasks/:taskId/links`)
- [x] Get Single Link (`GET /tasks/:taskId/links/:linkId`)
- [x] Update Link (`PATCH /tasks/:taskId/links/:linkId`)
- [x] Delete Link (`DELETE /tasks/:taskId/links/:linkId`)

---

# Phase 10 — Activity

## Activity

- [x] Workspace Activity Logging (Write on Create/Update via DB transaction)
- [x] Workspace Activity Feed API (`GET /workspaces/:workspaceId/activities`)
- [x] Project Activity Logging
- [x] Task Activity Logging

---

# Phase 11 — Notification

## Notification

- [x] Task Assigned
- [x] Mention
- [x] Workspace Invitation
- [x] Notification REST API (`GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `DELETE /notifications/:id`)
- [x] Event-driven Architecture (`@nestjs/event-emitter`)

---

# Phase 12 — Realtime

## Socket.IO

- [ ] Online Users
- [ ] Live Task Update
- [ ] Task Move
- [ ] Live Comments
- [ ] Notifications

---

# Phase 13 — Search

## Search

- [ ] Workspace Search
- [ ] Project Search
- [ ] Task Search

---

# Phase 14 — Dashboard

## Analytics

- [ ] Project Statistics
- [ ] Task Statistics
- [ ] Productivity
- [ ] Member Activity

---

# Technical Debt & Refactor Queue

- [x] **Workspaces Query Fix**: Update `getMyWorkspaces()` in `WorkspaceService` to query `WorkspaceMember` so users see workspaces where they are members (not just owners).
- [x] **Workspace Member Access Fix**: Update `getWorkspaceMembers()` permissions so non-owner workspace members can also view member lists.
- [x] **REST Pluralization**: Rename `@Controller('workspaces/:workspaceId/project')` to `@Controller('workspaces/:workspaceId/projects')`.
- [x] **DTO Validation Hardening**: Update `LoginDto` and `RegisterDto` to validate email using `@IsEmail()` instead of `@IsString()`.
- [x] **Centralized Activity Service**: Extract `createActivityLog()` into a shared `ActivityService` so `ProjectService` and future modules reuse a single service.
- [x] **Consolidate Activity Models**: Remove unused `ActivityLog` model from Prisma schema.
- [x] **Clean Dead Code**: Remove unused `Role` enum, `RolesGuard`, `AppException`, `TrimPipe`.
- [x] **Email Module**: Wrap `EmailService` inside an `EmailModule` export.
- [x] **Logger Initialization**: Enable Pino logger in `app.module.ts` and `main.ts`, replacing `console.log`.

---

# Known Bugs

## Bug 1: Non-owner members cannot view their workspaces
- **Description**: `getMyWorkspaces()` filters strictly by `ownerId = userId`. Members with role `ADMIN` or `MEMBER` receive empty workspace lists.
- **Status**: ✅ Fixed

## Bug 2: Singular `/project` Route Endpoint
- **Description**: Project endpoints use `/workspaces/:workspaceId/project` instead of plural `/projects`.
- **Status**: ✅ Fixed

---

# Current Sprint

1. [x] **Fix Workspaces Membership Query (`getMyWorkspaces`)**: Allow non-owners to list workspaces they belong to.
2. [x] **REST Route Correction**: Update project controller prefix to `/workspaces/:workspaceId/projects`.
3. [x] **DTO Email Validation**: Add `@IsEmail()` to `RegisterDto` & `LoginDto`.
4. [x] **Centralize Activity Logging**: Create global `ActivityModule`/`ActivityService` and `GET /workspaces/:workspaceId/activities`.
5. [x] **Phase 6 — Board & Column API Modules**: Implement Board & BoardColumn CRUD services and controllers.
6. [x] **Phase 7 — Task API Module**: Implement Task CRUD, Move Task across columns, Assign Member, Priority & Status updates.
7. [x] **Backend Architectural Refinement**: Execute items tracked in `.ai/ARCHITECTURAL_REVIEW.md`.
8. [x] **Phase 8 — Comment API Module**: Implement Comment CRUD on tasks with cursor pagination, mentions, and edit history.
9. [x] **Phase 9 — Attachment & File Upload Module**: Implement Task Attachment upload, list, delete, and static file serving.
10. [x] **Phase 11 — Notification Module**: Implement event-driven notifications for task assignments, mentions, and invitations.
11. [x] **Centralized Email Infrastructure Module**: Implement production-ready `EmailModule` with Nodemailer, Handlebars templates, Joi env validation, and SOLID provider abstraction.
12. [x] **Platform Audit Logging Infrastructure**: Implement `AuditLog` table, `AuditLogService`, `AuditAction` enum, and integrate auth audit events (`USER_REGISTERED`, `EMAIL_VERIFICATION_SENT`, `USER_LOGIN`, `FAILED_LOGIN`, `USER_LOGOUT`).
13. [x] **Email Verification System**: Implement `VerificationToken` table (SHA-256 token hashing), single-use 24h tokens, `GET /auth/verify-email`, `POST /auth/resend-verification`, login verification rejection, and Prisma transaction operations.
14. [x] **Forgot Password & Reset Password Flow**: Implement `POST /auth/forgot-password` (anti-enumeration), `POST /auth/reset-password`, 30-minute single-use SHA-256 tokens, refresh token revocation, and audit logging (`PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET_COMPLETED`, `PASSWORD_RESET_TOKEN_INVALID`, `PASSWORD_RESET_TOKEN_EXPIRED`).
15. [x] **Phase X — Token-Based Workspace Invitation System**: Implement `WorkspaceInvitation` model (7-day SHA-256 tokens), `POST /workspaces/:workspaceId/invitations`, `GET /workspace-invitations/validate`, `POST /workspace-invitations/accept` (transaction member creation & email verification check), `POST /workspace-invitations/decline`, `DELETE /workspaces/:workspaceId/invitations/:id`, and separated WorkspaceActivity & AuditLog logging.
16. [x] **Google OAuth Authentication**: Implement `OAuthAccount` model, `GoogleStrategy`, `GoogleAuthGuard`, automatic account linking, JWT issuance, `GET /auth/google`, `GET /auth/google/callback`, and audit logging (`GOOGLE_LOGIN`, `GOOGLE_ACCOUNT_CREATED`, `GOOGLE_ACCOUNT_LINKED`).
17. [x] **Background Email Jobs (BullMQ + Redis)**: Implement `QueueModule` (`@nestjs/bullmq`), `EmailQueueService`, `EmailProcessor`, exponential backoff retries (3 attempts: 1s, 2s, 4s), and refactor `AuthService` and `WorkspaceInvitationService` for non-blocking asynchronous email delivery.
18. [ ] **Phase 12 — Realtime Module**: Implement Socket.IO for online users, live task updates, and real-time comments.

---

# Next Feature (What to do next)

```
Phase 12 — Realtime Module (Socket.IO Gateway)

Step 1: Create `src/module/realtime` with `RealtimeGateway`, `RealtimeService`, `RealtimeModule`.
Step 2: Add JWT authentication to Socket.IO connection handshake.
Step 3: Implement room joins (`workspace:id`, `board:id`, `task:id`) and user presence tracking (`user:online`/`user:offline`).
Step 4: Listen to domain events (`task.moved`, `task.updated`, `comment.created`, `notification.created`) and broadcast real-time updates to connected room sockets.
```

---

# AI Agent Rules

Before implementing any feature:

1. Read this file.
2. Skip completed features (`[x]`).
3. Continue from current progress.
4. Reuse existing code (`PrismaService`, `JwtAuthGuard`, `WorkspaceRoleGuard`, `@CurrentUser()`).
5. Update this file after implementation.
6. Never mark a feature complete unless it is fully implemented.
7. If a feature is partially complete, mark it as 🚧 and explain why.
8. If blocked, document the blocker instead of guessing.

This file is the single source of truth for project progress.
