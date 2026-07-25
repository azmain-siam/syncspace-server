# PROJECT_ANALYSIS.md

# SyncSpace Backend — Full Codebase Analysis

> Generated after reading every source file, Prisma schema, configuration file, and documentation.
> Do NOT modify this file manually. Update it after each significant development phase.

---

## 1. Project Identity

| Property | Value |
|:---|:---|
| **Name** | SyncSpace |
| **Type** | Real-time team collaboration platform (Jira / Trello / Notion / ClickUp inspired) |
| **Framework** | NestJS 11 + TypeScript |
| **Database** | PostgreSQL via Prisma ORM (`@prisma/adapter-pg` driver adapter) |
| **Auth** | JWT (access + refresh token rotation) + Passport |
| **API Prefix** | `/api/v1` |
| **Swagger** | `/docs` |
| **Package Manager** | pnpm |
| **Phase** | Foundation — Auth, Workspace, Project implemented. Board/Task/Comment/Notification/Realtime not yet exposed. |

---

## 2. Architecture

SyncSpace follows a **Modular Monolith** architecture.

```
Client (HTTP / WebSocket)
        │
        ▼
  NestJS Application
        │
  ┌─────────────────────┐
  │  Global Middleware   │  Helmet, CORS, Rate Limiting (ThrottlerGuard)
  └─────────────────────┘
        │
  ┌─────────────────────┐
  │  Global Pipes        │  ValidationPipe (whitelist + forbidNonWhitelisted + transform)
  └─────────────────────┘
        │
  ┌─────────────────────┐
  │  Guards              │  JwtAuthGuard → WorkspaceRoleGuard
  └─────────────────────┘
        │
  ┌─────────────────────┐
  │  Controllers         │  Thin — validate, authenticate, delegate
  └─────────────────────┘
        │
  ┌─────────────────────┐
  │  Services            │  Business logic, DB operations, transactions
  └─────────────────────┘
        │
  ┌─────────────────────┐
  │  PrismaService       │  Global singleton, extends PrismaClient
  └─────────────────────┘
        │
     PostgreSQL
```

### Layer Responsibilities

| Layer | Owns |
|:---|:---|
| Controller | Request parsing, guard application, calling service, returning response |
| Service | Business rules, permission validation, Prisma queries, transactions, activity logging |
| PrismaService | Database connection and query execution |
| Guards | JWT verification, workspace role/membership validation |
| Interceptor | Wrapping all success responses in `{ success, statusCode, message, data }` |
| Filter | Catching all errors (HttpException + Prisma errors) and normalizing error responses |

---

## 3. Module Inventory

### 3.1 PrismaModule

- **Path:** `src/module/prisma/`
- **Type:** `@Global()` — available to all modules without explicit import
- `PrismaService` extends `PrismaClient` using `@prisma/adapter-pg`
- Lifecycle: `onModuleInit → $connect`, `onModuleDestroy → $disconnect`

---

### 3.2 AuthModule

- **Path:** `src/module/auth/`
- **Routes:**

| Method | Route | Guard | Description |
|:---|:---|:---|:---|
| POST | `/auth/register` | None | Register, return sanitized user + tokens |
| POST | `/auth/login` | None | Login, return sanitized user + tokens |
| POST | `/auth/refresh` | RefreshTokenGuard | Rotate refresh token, return new tokens |
| POST | `/auth/logout` | JwtAuthGuard | Clear stored hashed refresh token |

- **Strategies:** `JwtStrategy` (access token), `RefreshStrategy` (refresh token via bcrypt comparison)
- **DTOs:** `RegisterDto`, `LoginDto`, `RefreshTokenDto`
- **Guards:** `JwtAuthGuard` (extends `AuthGuard('jwt')`), `RefreshTokenGuard` (extends `AuthGuard('jwt-refresh')`)
- **Constants:** `BCRYPT_SALT_ROUNDS = 10`
- **Sanitization:** `const { password, ...safeUser } = user` — strips password before returning

---

### 3.3 UserModule

- **Path:** `src/module/user/`
- **Routes:**

| Method | Route | Guard | Description |
|:---|:---|:---|:---|
| GET | `/user/me` | JwtAuthGuard | Return current user from JWT context |

- `UserService` is currently a stub (all business methods commented out)
- Controller directly returns `request.user` from `@CurrentUser()` — no service call

---

### 3.4 WorkspaceModule

- **Path:** `src/module/workspace/`
- **Routes:**

| Method | Route | Roles Required | Description |
|:---|:---|:---|:---|
| POST | `/workspaces` | JWT | Create workspace + owner membership (transaction) |
| GET | `/workspaces` | JWT | List user's workspaces |
| POST | `/workspaces/:id/members` | OWNER, ADMIN | Invite member by email |
| DELETE | `/workspaces/:id/members/:userId` | OWNER, ADMIN | Remove member |
| PATCH | `/workspaces/:id/members/:memberId/role` | OWNER, ADMIN | Update member role |
| PATCH | `/workspaces/:id/transfer-ownership` | OWNER | Transfer ownership |
| GET | `/workspaces/:id/members` | JWT (no role guard) | List workspace members |
| PATCH | `/workspaces/:id/settings` | OWNER | Update workspace settings |

- **DTOs:** `CreateWorkspaceDto`, `UpdateWorkspaceDto`, `InviteMemberDto`, `UpdateMemberRoleDto`, `TransferOwnershipDto`, `UpdateWorkspaceSettingsDto`
- **Enums:** `WorkspaceRole`, `WorkspaceVisibility`, `ActivityAction` (workspace activity actions)
- **Activity logging:** Private `createActivityLog()` helper writes to `WorkspaceActivity` table inside transactions

---

### 3.5 ProjectModule

- **Path:** `src/module/project/`
- **Routes:**

| Method | Route | Roles Required | Description |
|:---|:---|:---|:---|
| POST | `/workspaces/:wId/project` | OWNER, ADMIN | Create project |
| GET | `/workspaces/:wId/project` | ALL members | List projects (excludes ARCHIVED) |
| GET | `/workspaces/:wId/project/:pId` | ALL members | Get single project |
| PATCH | `/workspaces/:wId/project/:pId` | OWNER, ADMIN | Update project |
| PATCH | `/workspaces/:wId/project/:pId/archive` | OWNER | Archive project |

- **DTOs:** `CreateProjectDto`, `UpdateProjectDto` (extends `PartialType(CreateProjectDto)` + adds `status`)
- **Enums:** `ProjectStatus`, `ProjectPriority`, `ProjectActivityActions`
- **Activity logging:** Inline `tx.workspaceActivity.create()` — does NOT reuse `WorkspaceService.createActivityLog()`

---

### 3.6 EmailService

- **Path:** `src/module/email/`
- Simple wrapper around `@nestjs-modules/mailer` with a single `sendMail(to, subject, html)` method
- Registered as a provider in `AppModule` directly (not in its own `EmailModule`)
- Currently not used by any other module

---

## 4. Common / Shared Layer

### 4.1 Decorators

| Decorator | File | Purpose |
|:---|:---|:---|
| `@CurrentUser()` | `decorators/get-user.decorator.ts` | Extracts `request.user` from execution context |
| `@ResponseMessage(msg)` | `decorators/response-message.decorator.ts` | Sets custom message for `ResponseInterceptor` via metadata |
| `@Roles(...roles)` | `decorators/roles.decorator.ts` | Sets required generic roles (string-based) |
| `@WorkspaceRoles(...roles)` | `decorators/workspace-roles.decorator.ts` | Sets required `WorkspaceRole[]` values |

### 4.2 Guards

| Guard | File | Purpose |
|:---|:---|:---|
| `RolesGuard` | `guards/roles.guard.ts` | Checks `user.role` against `@Roles()` metadata — **currently unused** |
| `WorkspaceRoleGuard` | `guards/workspace-role.guard.ts` | DB lookup of `WorkspaceMember`, checks role against `@WorkspaceRoles()` |

### 4.3 Interceptors

| Interceptor | File | Purpose |
|:---|:---|:---|
| `ResponseInterceptor<T>` | `interceptors/response.interceptor.ts` | Wraps all responses: `{ success, statusCode, message, data }` |

### 4.4 Filters

| Filter | File | Purpose |
|:---|:---|:---|
| `HttpExceptionFilter` | `filters/http-exception.filter.ts` | Catches `HttpException` and Prisma errors; normalizes to error shape |

Handled Prisma error codes: `P2002` (unique), `P2025` (not found), `P2003` (FK), `P2000` (value too long), `P1000` (connection)

### 4.5 Pipes

| Pipe | File | Purpose |
|:---|:---|:---|
| `TrimPipe` | `pipes/trim.pipe.ts` | Trims string values — **not globally registered, never applied** |

### 4.6 Interfaces

| Interface | File | Fields |
|:---|:---|:---|
| `ApiResponse<T>` | `interfaces/response.interface.ts` | `success`, `statusCode`, `message`, `data` |
| `ResponsePayload<T>` | `interfaces/response.interface.ts` | `message?`, `data` |
| `User` | `interfaces/user.interface.ts` | `id`, `name`, `email`, `phone` |

### 4.7 Enums

| Enum | File | Values | Used |
|:---|:---|:---|:---|
| `Role` | `enums/role.enum.ts` | `USER`, `ADMIN` | ❌ Never used |

### 4.8 Exceptions

| Class | File | Used |
|:---|:---|:---|
| `AppException` | `exceptions/app.exception.ts` | ❌ Never used |

---

## 5. Configuration

| File | Purpose |
|:---|:---|
| `config/configuration.ts` | Maps env vars → typed object (`port`, `database`, `jwt`, `email`) |
| `config/validation.ts` | Joi schema — validates required env vars at startup |
| `config/swagger.config.ts` | `DocumentBuilder` + custom Swagger UI options |
| `config/storage.config.ts` | Multer `diskStorage` + `memoryStorage` configs — not yet used |

### Environment Variables

| Variable | Required | Default |
|:---|:---|:---|
| `DATABASE_URL` | ✅ | — |
| `JWT_ACCESS_SECRET` | ✅ | — |
| `JWT_REFRESH_SECRET` | ✅ | — |
| `EMAIL_USER` | ✅ | — |
| `EMAIL_PASS` | ✅ | — |
| `PORT` | ❌ | `5000` |
| `NODE_ENV` | ❌ | `development` |
| `JWT_ACCESS_EXPIRES_IN` | ❌ | `1d` |
| `JWT_REFRESH_EXPIRES_IN` | ❌ | `90d` |

---

## 6. Prisma Schema

### 6.1 Models

| Model | Soft Delete | API Status | Notes |
|:---|:---|:---|:---|
| `User` | ❌ | ✅ Active | Has `hashedRefreshToken`, `isEmailVerified` |
| `Workspace` | ✅ `deletedAt` | ✅ Active | Has `slug`, `visibility`, `logo` |
| `WorkspaceMember` | ❌ | ✅ Active | Unique on `[workspaceId, userId]` |
| `WorkspaceActivity` | ❌ | ✅ Active | JSON `metadata`, `projectId?`, `taskId?`, `boardId?` |
| `Project` | ✅ `deletedAt` | ✅ Active | Has `slug`, `priority`, `color`, `startDate`, `dueDate` |
| `ProjectMember` | ❌ | ⏳ Schema only | Unique on `[projectId, userId]` |
| `Board` | ❌ | ⏳ Schema only | Belongs to `Project` |
| `BoardColumn` | ❌ | ⏳ Schema only | Unique on `[boardId, order]` |
| `Task` | ✅ `deletedAt` | ⏳ Schema only | Unique on `[columnId, order]`, has `priority`, `status`, `dueDate` |
| `Comment` | ❌ | ⏳ Schema only | Belongs to `Task` |
| `Attachment` | ❌ | ⏳ Schema only | Metadata only — file URL, size, mimeType |
| `ActivityLog` | ❌ | ⏳ Schema only | Uses `ActivityAction` enum — **separate from `WorkspaceActivity`** |

### 6.2 Enums (Prisma-level)

| Enum | Values |
|:---|:---|
| `WorkspaceRole` | `OWNER`, `ADMIN`, `MEMBER` |
| `WorkspaceVisibility` | `PRIVATE`, `PUBLIC` |
| `ProjectStatus` | `PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, `ARCHIVED` |
| `ProjectPriority` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `ProjectMemberRole` | `MANAGER`, `LEAD`, `MEMBER`, `VIEWER` |
| `TaskPriority` | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `TaskStatus` | `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE` |
| `ActivityAction` | `CREATE`, `UPDATE`, `DELETE`, `MOVE`, `ASSIGN`, `COMMENT` |

### 6.3 Key Indexes

- `Workspace`: `@@index([ownerId])`
- `WorkspaceMember`: `@@index([workspaceId])`, `@@index([userId])`
- `WorkspaceActivity`: `@@index([workspaceId])`, `@@index([projectId])`, `@@index([actorId])`, `@@index([createdAt])`, `@@index([workspaceId, createdAt])`
- `Project`: `@@index([workspaceId])`, `@@index([status])`, `@@index([createdById])`
- `Task`: `@@index([columnId])`, `@@index([assigneeId])`, `@@index([createdBy])`, `@@index([priority])`, `@@index([status])`, `@@index([dueDate])`

---

## 7. Coding Patterns

| Pattern | How It's Done |
|:---|:---|
| **Thin controllers** | Controllers only apply decorators, call one service method, return result |
| **Service-owned business logic** | All validation, permissions, and DB logic lives in services |
| **Prisma transactions** | `this.prisma.$transaction(async (tx) => { ... })` for multi-step writes |
| **Activity logging in transactions** | Activity records only created on successful commit |
| **Password sanitization** | `const { password, ...safeUser } = user` |
| **Custom response messages** | `@ResponseMessage('...')` decorator on controller methods |
| **Workspace RBAC** | `@UseGuards(JwtAuthGuard, WorkspaceRoleGuard)` + `@WorkspaceRoles(...)` |
| **DTO validation** | `class-validator` decorators + global `ValidationPipe` with whitelist |
| **Module-local TypeScript enums** | Each module has an `enums/` folder mirroring Prisma enums |
| **ApiProperty on all DTOs** | Every field has `@ApiProperty` or `@ApiPropertyOptional` |

---

## 8. Inconsistencies & Issues

### Critical

| # | Issue | Location | Impact |
|:---|:---|:---|:---|
| 1 | **Dual activity log system** — `WorkspaceActivity` and `ActivityLog` both exist with different schemas | `prisma/schema.prisma` | Future features won't know which table to use |
| 2 | **`getMyWorkspaces()` only returns owned workspaces** — filters by `ownerId`, misses memberships | `workspace.service.ts:61-69` | Members who are not owners never see their workspaces |
| 3 | **Activity logging not centralized** — `ProjectService` writes `WorkspaceActivity` inline instead of using `WorkspaceService.createActivityLog()` | `project.service.ts` | DRY violation; inconsistent activity format as more modules are added |

### Standard

| # | Issue | Location | Impact |
|:---|:---|:---|:---|
| 4 | **Project route is singular `/project`** — violates the documented plural REST standard `/projects` | `project.controller.ts:22` | Inconsistency with all other resource names |
| 5 | **`getWorkspaceMembers()` internally restricts to owner** — but the controller applies no role guard | `workspace.service.ts:298-304` | Members cannot see other members; misleading endpoint |
| 6 | **Duplicate TypeScript enums mirroring Prisma enums** — `WorkspaceRole` defined in both `@prisma/client` and local enum file; `workspace.service.ts` imports from both | Multiple files | Maintenance risk and type inconsistency |
| 7 | **`LoginDto` and `RegisterDto` use `@IsString()` for email** — should use `@IsEmail()` | `auth/dto/login.dto.ts`, `auth/dto/register.dto.ts` | Invalid emails accepted at registration and login |

### Minor / Cleanup

| # | Issue | Location |
|:---|:---|:---|
| 8 | `Role` enum and `RolesGuard` are unused — `User` model has no `role` field | `common/enums/role.enum.ts`, `common/guards/roles.guard.ts` |
| 9 | `AppException` class is defined but never used | `common/exceptions/app.exception.ts` |
| 10 | `EmailService` registered in `AppModule` instead of its own `EmailModule`; not used by any service | `app.module.ts` |
| 11 | `RefreshTokenDto` defined but the refresh endpoint reads the token from headers, not body | `auth/dto/refresh-token.dto.ts` |
| 12 | `UpdateWorkspaceDto` exists but no endpoint uses it — `UpdateWorkspaceSettingsDto` is used instead | `workspace/dto/update-workspace.dto.ts` |
| 13 | `console.log` used in `main.ts` — violates NestJS Logger rule | `src/main.ts:58` |
| 14 | Pino logger installed but fully commented out in `AppModule` and `main.ts` | `app.module.ts`, `main.ts` |
| 15 | `User` interface has `phone: string` (required) but Prisma model has `phone: String?` (optional); missing `avatar`, `isEmailVerified`, timestamps | `common/interfaces/user.interface.ts` |
| 16 | Swagger adds `security: [{ 'access-token': [] }]` to all paths including public routes (register, login) | `main.ts:38-51` |
| 17 | `TrimPipe` exists but is never applied — not globally registered or used on any endpoint | `common/pipes/trim.pipe.ts` |
| 18 | `TODO.md` checkboxes are all unchecked `[ ]` even for fully implemented features (Auth, Workspace, Project) | `.ai/TODO.md` |

---

## 9. Reusable Components Inventory

> Always check this list before creating new code.

| Component | Import Path | Reuse For |
|:---|:---|:---|
| `PrismaService` | `src/module/prisma/prisma.service` | All database access across all modules |
| `JwtAuthGuard` | `src/module/auth/guards/jwt-auth.guard` | Any authenticated endpoint |
| `RefreshTokenGuard` | `src/module/auth/guards/refresh-auth.guard` | Refresh-token protected endpoint |
| `WorkspaceRoleGuard` | `src/common/guards/workspace-role.guard` | Any workspace-scoped endpoint |
| `@WorkspaceRoles()` | `src/common/decorators/workspace-roles.decorator` | Alongside `WorkspaceRoleGuard` |
| `@CurrentUser()` | `src/common/decorators/get-user.decorator` | Extracting auth user in any controller |
| `@ResponseMessage()` | `src/common/decorators/response-message.decorator` | Custom success message on any endpoint |
| `ResponseInterceptor` | `src/common/interceptors/response.interceptor` | Global — already applied |
| `HttpExceptionFilter` | `src/common/filters/http-exception.filter` | Global — already applied |
| `EmailService` | `src/module/email/email.service` | Future invitation, notification emails |
| `storageConfig` / `memoryStorageConfig` | `src/config/storage.config` | Future file upload endpoints |
| `TrimPipe` | `src/common/pipes/trim.pipe` | Trimming string route params or body fields |
| `WorkspaceRole` enum | `src/module/workspace/enums/workspace-role.enum` | RBAC decorator and guard |
| `ProjectStatus` enum | `src/module/project/enums/project-status.enum` | Project filtering and status updates |
| `ProjectPriority` enum | `src/module/project/enums/project-priority.enum` | Project priority fields |

---

## 10. What Does NOT Exist Yet

The following are defined in the Prisma schema but have **no API module**:

| Feature | Schema Models Ready | Notes |
|:---|:---|:---|
| Board management | `Board` | Belongs to `Project` |
| Column management | `BoardColumn` | Ordered within `Board` |
| Task management | `Task` | Priority, status, assignee, due date — rich model |
| Task assignment | `Task.assigneeId` | Notification + activity required on assign |
| Comments | `Comment` | Belongs to `Task` |
| Attachments | `Attachment` | Metadata only; file to live in object storage |
| Project members | `ProjectMember` | `ProjectMemberRole` enum defined |
| Activity feed (task-level) | `ActivityLog` | Different schema from `WorkspaceActivity` |
| Notifications | — | No schema model yet |
| Realtime (Socket.IO) | — | Not implemented |
| File upload API | — | `storageConfig` ready; no controller/service |
| Search | — | Planned but not started |
| Dashboard / Analytics | — | Planned but not started |

---

## 11. Migration History

| Migration | Change |
|:---|:---|
| `20260703124812_init` | Initial schema — User, Workspace, WorkspaceMember, Project, Board, Column, Task, Comment, Attachment, ActivityLog |
| `20260705064603_refresh_token` | Added `hashedRefreshToken` to `User` |
| `20260707115707_workspace_visibility` | Added `WorkspaceVisibility` enum and `visibility` to `Workspace` |
| `20260707121310_workspace_activity` | Added `WorkspaceActivity` table |
| `20260708071025_project_modification` | Modified `Project` model (priority, color, dates, etc.) |
| `20260708071451_workspace_activity` | Refined `WorkspaceActivity` (added `projectId`, `taskId`, `boardId`, indexes) |

---

## 12. Recommended Next Steps

> Ordered by priority. Do not implement anything without reading the relevant module first.

### Fix Before Adding New Modules

1. **Fix `getMyWorkspaces()`** — query `WorkspaceMember` table to return workspaces where `userId = currentUser.id`, not just `ownerId`
2. **Fix `getWorkspaceMembers()`** — allow any workspace member to fetch the members list (not just the owner)
3. **Fix email validation** — use `@IsEmail()` in `LoginDto` and `RegisterDto`
4. **Rename project controller route** — change `'workspaces/:workspaceId/project'` → `'workspaces/:workspaceId/projects'`

### Extract Shared Activity Service

5. **Create a shared `ActivityService`** — extract the `createActivityLog()` pattern from `WorkspaceService` into a dedicated service that both workspace and project (and future task/comment) modules can use

### Clean Up Dead Code

6. Remove or integrate `AppException`, `Role` enum, `RolesGuard`, `RefreshTokenDto`, `UpdateWorkspaceDto`, `TrimPipe`
7. Create `EmailModule` and export `EmailService` properly
8. Replace `console.log` in `main.ts` with NestJS Logger
9. Decide on one activity table (`WorkspaceActivity` vs `ActivityLog`) and document the decision

### Next Feature Modules (per phase)

10. **ProjectMembers** — manage members within a project using `ProjectMember` model
11. **Board** — CRUD for boards within a project
12. **BoardColumn** — CRUD + reordering for columns
13. **Task** — full task lifecycle (create, update, move, assign, archive, delete)
14. **Comment** — comments on tasks
15. **Attachment** — file upload metadata + object storage integration
16. **Notification** — event-driven, separate module
17. **Socket.IO Gateway** — real-time broadcasts after successful DB commits
18. **ActivityFeed** — expose `WorkspaceActivity` as a paginated API

---

*Last updated: 2026-07-22*
