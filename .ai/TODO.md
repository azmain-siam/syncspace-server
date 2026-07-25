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

# Phase 9 — Upload

## Attachments

- [x] Upload (`POST /tasks/:taskId/attachments`)
- [x] List (`GET /tasks/:taskId/attachments`)
- [x] Delete (`DELETE /tasks/:taskId/attachments/:attachmentId`)
- [x] File Storage & Serve Static Files

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

- [ ] Task Assigned
- [ ] Mention
- [ ] Due Reminder
- [ ] Workspace Invitation
- [ ] Project Invitation

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
10. [ ] **Phase 11 — Notification Module**: Implement event-driven notifications for task assignments, mentions, due reminders, and invitations.

---

# Next Feature (What to do next)

```
Phase 11 — Event-Driven Notification Module

Step 1: Create `src/module/notification` with `NotificationService`, `NotificationController`, `NotificationModule`, and Prisma schema model for `Notification`.
Step 2: Add Notification Prisma Model (`id`, `userId`, `actorId`, `type`, `title`, `message`, `link`, `isRead`, `createdAt`).
Step 3: Listen to application events (task assigned, comment mention, task due, workspace invitation) and persist user notifications.
Step 4: Implement REST Endpoints:
        - GET   /notifications        (List current user's notifications, paginated)
        - PATCH /notifications/:id/read  (Mark single notification as read)
        - PATCH /notifications/read-all  (Mark all user notifications as read)
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
