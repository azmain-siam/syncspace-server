# SyncSpace Backend — Architectural Review & Refinement Tracker

> This document tracks the findings, proposed improvements, and resolution status of the comprehensive backend architectural review conducted prior to Phase 8 (Task Comments Module).

---

## 📌 Development & Refinement Status Legend

- ✅ **Resolved** — Improvement implemented and verified.
- 🚧 **In Progress** — Currently being refactored or updated.
- ⏳ **Pending** — Planned for implementation.
- ❌ **Blocked** — Pending dependency or explicit approval.

---

## 🏗️ Review Audit Matrix (15 Categories)

| # | Category | Finding Description | Affected Files / Components | Priority | Status |
|---|---|---|---|---|---|
| 1 | **Code Duplication** | Repeated entity hierarchy validation, duplicate user select masks (`SAFE_USER_MINIMAL_SELECT`), and hand-rolled slug logic. | `task.service.ts`, `column.service.ts`, `board.service.ts`, `project.service.ts`, `workspace.service.ts` | Medium | ✅ Resolved |
| 2 | **Opportunities for Abstraction** | Pagination meta calculation logic (`calculatePaginationMeta`), centralized `slugify` utility, and `PaginationQueryDto`. | `common/utils/`, `common/dto/` | Medium | ✅ Resolved |
| 3 | **Reusable Services** | Removed proxy `createActivityLog` wrapper in `WorkspaceService`. Wrapped `EmailService` inside `EmailModule`. | `workspace.service.ts`, `email.module.ts`, `app.module.ts` | Low | ✅ Resolved |
| 4 | **Transaction Boundaries** | Multi-step writes (`moveTask`, `reorderColumns`, `updateWorkspaceSettings`) wrapped cleanly in database `$transaction` blocks. | `task.service.ts`, `column.service.ts`, `workspace.service.ts` | High | ✅ Resolved |
| 5 | **Authorization Consistency** | Controllers enforce `WorkspaceRoleGuard` consistently. Clean workspace role decorators applied across endpoints. | `common/guards/workspace-role.guard.ts`, controllers | Medium | ✅ Resolved |
| 6 | **Validation Consistency** | Query DTOs (`TaskQueryDto`, `ActivityQueryDto`) extend unified `PaginationQueryDto`. | `task/dto/task-query.dto.ts`, `activity/dto/activity-query.dto.ts` | Medium | ✅ Resolved |
| 7 | **Error Handling Consistency** | Consistent NestJS exceptions thrown across services. Domain error handling normalized. | `workspace.service.ts`, `task.service.ts` | High | ✅ Resolved |
| 8 | **Query Performance (N+1)** | Refactored task reordering in `moveTask` and column reordering in `reorderColumns` to use `Promise.all` batch updates instead of 2N sequential loops. | `task.service.ts`, `column.service.ts` | Critical | ✅ Resolved |
| 9 | **Missing Database Indexes** | Soft-deleted models (`Workspace`, `Project`, `Task`) updated with `deletedAt` compound indexes in Prisma schema. | `prisma/schema.prisma` | High | ✅ Resolved |
| 10 | **Missing Prisma Transactions** | `WorkspaceService.updateWorkspaceSettings` now executes inside `$transaction` including activity log. | `workspace.service.ts` | Medium | ✅ Resolved |
| 11 | **Potential Race Conditions** | Task and column order assignment refactored to use atomic transaction operations. | `task.service.ts`, `column.service.ts` | High | ✅ Resolved |
| 12 | **REST API Consistency** | Project routes pluralized (`/projects`). All controllers adhere to REST standards. | `project.controller.ts`, `task.controller.ts` | Low | ✅ Resolved |
| 13 | **Naming Inconsistencies** | Consolidated 5 fragmented local activity action enums into unified `ActivityAction` enum. Renamed `getWorkspaceProjects`. | `module/activity/enums/activity-action.enum.ts`, `project.service.ts` | Low | ✅ Resolved |
| 14 | **Security & Rate Limiting** | Global rate limiting adjusted (`limit: 100` req/min). Unused dead code (`Role` enum, `RolesGuard`, `AppException`, `TrimPipe`) deleted. | `app.module.ts`, `common/` | Medium | ✅ Resolved |
| 15 | **Scalability & Schema** | Removed legacy unused `ActivityLog` model from Prisma schema. | `prisma/schema.prisma` | Low | ✅ Resolved |

---

## 📋 Action Plan & Implementation Phases

### Phase 1: Shared Utilities, Abstractions & DTO Hardening ✅
- [x] Create `src/common/constants/prisma-selects.constant.ts` for safe user selects (`SAFE_USER_MINIMAL_SELECT`).
- [x] Create `src/common/utils/pagination.util.ts` for standard pagination metadata calculations.
- [x] Create `src/common/utils/slug.util.ts` for string slugification.
- [x] Create `src/common/dto/pagination-query.dto.ts` for shared query parameters (`page`, `limit`, `search`, `sortBy`, `order`).
- [x] Wrap `EmailService` in `EmailModule`.
- [x] Delete unused dead code (`Role` enum, `RolesGuard`, `AppException`, `TrimPipe`).

### Phase 2: Performance & N+1 Query Optimization ✅
- [x] Refactor `TaskService.moveTask` to eliminate sequential 2N loops when reordering tasks.
- [x] Refactor `ColumnService.reorderColumns` to batch order updates via `Promise.all`.
- [x] Ensure all multi-step mutation lookups and activity writes occur within Prisma `$transaction` blocks.

### Phase 3: Database Indexing & Schema Cleanup ✅
- [x] Add `@@index([deletedAt])` and compound `deletedAt` indexes to `Workspace`, `Project`, and `Task` in `prisma/schema.prisma`.
- [x] Add `@@index([workspaceId, status])` index on `Project`.
- [x] Remove unused `ActivityLog` model from Prisma schema (retaining `WorkspaceActivity`).
- [x] Regenerated Prisma Client (`pnpm prisma:generate`).

### Phase 4: Security, Error Handling & Rate Limiting ✅
- [x] Adjust global rate limiting in `app.module.ts` to `limit: 100` req/min for general API endpoints.
- [x] Delete unused dead code (`Role` enum, `RolesGuard`, `AppException`, `TrimPipe`).
- [x] Wrap `EmailService` inside an exported `EmailModule`.

### Phase 5: Activity Action Enum Consolidation ✅
- [x] Consolidate activity action enums into a central enum (`src/module/activity/enums/activity-action.enum.ts`).
- [x] Update `TaskService`, `BoardService`, `ColumnService`, `ProjectService`, and `WorkspaceService` to use the unified `ActivityAction` enum.

---

## 🤝 Verification & Definition of Done

1. `pnpm prisma:generate` — ✅ Passed cleanly.
2. `pnpm typecheck` — ✅ Passed cleanly with zero TypeScript errors.
3. `pnpm build` — ✅ Passed cleanly.
