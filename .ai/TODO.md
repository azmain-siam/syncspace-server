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

- [ ] Create Board
- [ ] Update Board
- [ ] Delete Board
- [ ] Reorder Boards

## Columns

- [ ] Create Column
- [ ] Rename Column
- [ ] Delete Column
- [ ] Reorder Columns

---

# Phase 7 — Tasks

## Task

- [ ] Create Task
- [ ] Update Task
- [ ] Delete Task
- [ ] Move Task
- [ ] Assign Member
- [ ] Due Date
- [ ] Priority
- [ ] Labels
- [ ] Archive Task

---

# Phase 8 — Comments

## Comment

- [ ] Create
- [ ] Update
- [ ] Delete

---

# Phase 9 — Upload

## Attachments

- [ ] Upload
- [ ] Delete
- [ ] Preview

---

# Phase 10 — Activity

## Activity

- [x] Workspace Activity Logging (Write on Create/Update via DB transaction)
- [ ] Workspace Activity Feed API (`GET /workspaces/:workspaceId/activities`)
- [ ] Project Activity Logging
- [ ] Task Activity Logging

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
- [ ] **Consolidate Activity Models**: Remove unused `ActivityLog` model or align it with `WorkspaceActivity`.
- [ ] **Clean Dead Code**: Remove unused `Role` enum, `RolesGuard`, `AppException`, `RefreshTokenDto`, `UpdateWorkspaceDto`, `TrimPipe`.
- [ ] **Email Module**: Wrap `EmailService` inside an `EmailModule` export.
- [ ] **Logger Initialization**: Enable Pino logger in `app.module.ts` and `main.ts`, replacing `console.log`.

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
5. [ ] **Phase 6 — Board & Column API Modules**: Implement Board & BoardColumn CRUD services and controllers.

---

# Next Feature (What to do next)

```
Phase 6 — Board & Column API Modules (Boards & Columns CRUD)

Step 1: Create `src/module/board` with `BoardService`, `BoardController`, `dto` (CreateBoardDto, UpdateBoardDto), and `board.module.ts`.
Step 2: Implement Board CRUD: POST/GET/PATCH/DELETE endpoints under `/projects/:projectId/boards`.
Step 3: Create `src/module/column` with `ColumnService`, `ColumnController`, `dto` (CreateColumnDto, UpdateColumnDto, ReorderColumnsDto), and `column.module.ts`.
Step 4: Implement Column CRUD + reordering under `/boards/:boardId/columns`.
Step 5: Emit activity events via ActivityService for Board & Column mutations.
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
