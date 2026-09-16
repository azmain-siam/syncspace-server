# SyncSpace API Server

> Enterprise-grade, real-time Agile team collaboration and project management backend built with NestJS 11, TypeScript, Prisma ORM, PostgreSQL, Socket.IO, and Redis.

---

## 🚀 Overview

**SyncSpace** is a modern team collaboration platform designed for agile engineering, product, and design teams. The API provides end-to-end capabilities spanning authentication, workspace management, Scrum sprint planning, Kanban board workflows, distributed real-time events, and capacity analytics.

### Key Highlights

- **Modular NestJS 11 Architecture:** Strict separation of concerns across domain modules, centralized activity tracking, and reusable guards/interceptors.
- **Enterprise RBAC:** Hierarchical role enforcement (`OWNER`, `ADMIN`, `MEMBER`, `GUEST`) with dynamic workspace resolution and scoped permissions via `@WorkspaceRoles()` and `WorkspaceRoleGuard`.
- **Agile Scrum & Kanban:** Sprints/Milestones with lifecycle state machines (`PLANNING`, `ACTIVE`, `COMPLETED`), single-active-sprint validation, unfinished task rollover, dedicated Backlog triage, and story points/estimated hours capacity estimation.
- **Human-Readable Task Keys:** Project-scoped sequential identifiers (e.g. `GEN-1`, `SYNC-101`) with automatic project key derivation and dual UUID/Key routing.
- **Bulk Operations:** Mass update and soft-delete operations across tasks with transactional safety and multi-workspace security validation.
- **Distributed Real-Time (Socket.IO + Redis):** Scalable WebSocket gateway powered by `@socket.io/redis-adapter` for multi-instance deployments, room broadcasting, and distributed user presence tracking.
- **Interactive Collaboration:** Comments with `@username` mentions, cursor pagination, and emoji reactions (`👍`, `❤️`, `🚀`, `🎉`, `👀`), subtask checklists, and external resource links.
- **Data Governance & Recovery:** Centralized Trash Bin for soft-deleted projects and tasks with granular restore, plus full security audit logging.
- **Async Job Processing:** Asynchronous email queueing with BullMQ and Redis exponential backoff retries.

---

## 🛠️ Tech Stack

| Category | Technologies |
| :--- | :--- |
| **Framework** | NestJS 11, TypeScript (v5.7) |
| **Database & ORM** | PostgreSQL, Prisma ORM (v7.7.0) |
| **Caching & Pub/Sub** | Redis, `@socket.io/redis-adapter`, BullMQ |
| **Real-Time** | Socket.IO (v4), WebSockets |
| **Authentication** | Passport JWT (Access + Refresh token rotation), Google OAuth 2.0, Bcrypt |
| **File Storage** | Cloudinary, Multer (10MB upload limits + MIME whitelisting) |
| **Documentation** | Swagger / OpenAPI (`/docs`) |
| **Code Quality** | ESLint (v9 flat config), Prettier, Jest, Husky, lint-staged |
| **Security** | Helmet, Throttler / Rate-Limiting, Class-Validator |

---

## 📂 Project Structure

```text
syncspace-server/
├── prisma/
│   ├── schema.prisma              # Database models, relations, enums & indexes
│   └── migrations/                # Versioned SQL migrations
├── src/
│   ├── common/                    # Cross-cutting framework utilities
│   │   ├── constants/             # Prisma select fragments & token secrets
│   │   ├── decorators/            # @CurrentUser(), @WorkspaceRoles(), @ResponseMessage()
│   │   ├── dto/                   # PaginationQueryDto, Base Response DTOs
│   │   ├── guards/                # WorkspaceRoleGuard, JwtAuthGuard
│   │   ├── interceptors/          # Response normalization interceptor
│   │   ├── services/              # EntityValidationService
│   │   └── utils/                 # Pagination, slug & project key utilities
│   ├── config/                    # Configuration loaders and Joi validation
│   ├── module/                    # Feature domain modules
│   │   ├── activity/              # Workspace activity stream & event logging
│   │   ├── attachment/            # File uploads, metadata, Cloudinary integration
│   │   ├── audit/                 # Security audit log feed (Owner/Admin)
│   │   ├── auth/                  # JWT auth, Google OAuth, password reset, email verify
│   │   ├── board/                 # Kanban boards management
│   │   ├── column/                # Board columns with order & status mapping
│   │   ├── comment/               # Comments, @mentions, edit history & emoji reactions
│   │   ├── dashboard/             # Workspace KPIs, capacity & productivity analytics
│   │   ├── email/                 # Nodemailer templated emails (Handlebars)
│   │   ├── label/                 # Workspace task tags with custom hex colors
│   │   ├── notification/          # In-app notifications & read state management
│   │   ├── prisma/                # Prisma client service
│   │   ├── project/               # Project CRUD, task counters, archiving & flat table view
│   │   ├── queue/                 # BullMQ asynchronous email background queue
│   │   ├── realtime/              # Socket.IO gateway, presence & Redis adapter
│   │   ├── search/                # Workspace-wide full-text search
│   │   ├── sprint/                # Scrum sprints, backlog triage & task rollover
│   │   ├── task/                  # Task CRUD, moveTask auto-sync, keys & bulk ops
│   │   ├── task-checklist/        # Subtasks and interactive acceptance criteria
│   │   ├── task-link/             # External resource links (Figma, GitHub, Docs)
│   │   ├── trash/                 # Soft-delete recovery bin & permanent purge
│   │   ├── user/                  # User profile, avatars, passwords & timezones
│   │   └── workspace/             # Workspaces, invitations & role management
│   ├── app.module.ts              # Root application module
│   └── main.ts                    # Application bootstrapper
└── test/                          # E2E test suites
```

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory (based on `.env.example`):

```env
# Application
NODE_ENV=development
PORT=5000
FRONTEND_URL="http://localhost:3000"

# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/syncspaceDB?schema=public"

# Authentication & JWT
JWT_ACCESS_SECRET="your_access_secret_key_minimum_32_chars"
JWT_REFRESH_SECRET="your_refresh_secret_key_minimum_32_chars"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Redis & Background Queues
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD="password"

# SMTP Email (Nodemailer)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
EMAIL_FROM="SyncSpace <noreply@syncspace.com>"

# Cloudinary (Attachments & Avatars)
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# Google OAuth 2.0
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_CALLBACK_URL="http://localhost:5000/api/v1/auth/google/callback"
```

---

## 📦 Installation & Setup

### 1. Prerequisites
- **Node.js**: v20+ / v22+
- **pnpm**: v9+ / v12+
- **PostgreSQL**: v15+
- **Redis**: v7+

You can spin up PostgreSQL and Redis using the included `docker-compose.yml`:
```bash
# Start PostgreSQL and Redis containers
docker compose up -d

# Check service health
docker compose ps
```

Or build and run the production Docker container:
```bash
# Build production image
docker build -t syncspace-server .

# Run container
docker run -d -p 5000:5000 --env-file .env syncspace-server
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Database Migration & Prisma Client
```bash
pnpm prisma:generate
pnpm prisma:migrate
```

### 4. Run Development Server
```bash
pnpm start:dev
```

The server starts on `http://localhost:5000` with the global prefix `/api/v1`. Interactive Swagger documentation is accessible at `http://localhost:5000/docs`.

---

## 📜 Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `pnpm start:dev` | Start NestJS development server in watch mode |
| `pnpm build` | Compile production build to `dist/` |
| `pnpm start:prod` | Run compiled production bundle (`node dist/src/main`) |
| `pnpm prisma:generate` | Regenerate Prisma client |
| `pnpm prisma:migrate` | Apply database migrations (`prisma migrate dev`) |
| `pnpm prisma:studio` | Launch Prisma Studio GUI |
| `pnpm test` | Run all Jest unit tests |
| `pnpm test:watch` | Run Jest tests in interactive watch mode |
| `pnpm test:cov` | Generate unit test code coverage report |
| `pnpm test:e2e` | Run Jest end-to-end tests |
| `pnpm lint` | Run ESLint with auto-fix |
| `pnpm format` | Format source code with Prettier |
| `pnpm typecheck` | Run strict TypeScript compiler verification (`tsc --noEmit`) |

---

## 🌐 API Reference (Base URL: `/api/v1`)

### 🏥 System Health & Cloud Probes (Root: `/health`)
- `GET /health` — Cloud health probe for Kubernetes/ECS/Render/Cloud Run (returns status, uptime, memory, and database connectivity).

### 🔐 Authentication & Identity
- `POST /auth/register` — Register account (sends email verification token).
- `POST /auth/login` — Login with email/password; returns access & refresh tokens.
- `POST /auth/refresh` — Rotate refresh token and issue fresh access token.
- `POST /auth/logout` — Revoke refresh session.
- `GET /auth/verify-email` — Verify email address with single-use token.
- `POST /auth/resend-verification` — Resend verification email.
- `POST /auth/forgot-password` — Request password reset email (anti-enumeration).
- `POST /auth/reset-password` — Set new password using single-use reset token.
- `GET /auth/google` — Initiate Google OAuth 2.0 flow.
- `GET /auth/google/callback` — Google OAuth callback and JWT issuance.

### 👤 User Profile
- `GET /user/me` — Get current user profile.
- `PATCH /user/me` — Update display name, bio, timezone, and phone.
- `POST /user/avatar` — Upload profile photo to Cloudinary.
- `PATCH /user/change-password` — Update account password.

### 🏢 Workspaces & Members
- `POST /workspaces` — Create workspace (auto-seeds starter "General" project, board, columns, and guide tasks).
- `GET /workspaces` — List workspaces where caller is a member.
- `DELETE /workspaces/:workspaceId` — Soft-delete workspace (Owner only).
- `POST /workspaces/:workspaceId/leave` — Leave workspace voluntarily (Non-owners only).
- `POST /workspaces/:workspaceId/members` — Invite member by email (restricted to Owner/Admin).
- `DELETE /workspaces/:workspaceId/members/:userId` — Remove member from workspace.
- `PATCH /workspaces/:workspaceId/members/:memberId/role` — Update member role (`OWNER`, `ADMIN`, `MEMBER`, `GUEST`).
- `PATCH /workspaces/:workspaceId/transfer-ownership` — Transfer workspace ownership.
- `GET /workspaces/:workspaceId/members` — List members and roles.
- `PATCH /workspaces/:workspaceId/settings` — Update workspace settings.

### ✉️ Workspace Invitations
- `POST /workspaces/:workspaceId/invitations` — Send tokenized invitation email.
- `GET /workspace-invitations/validate?token=...` — Validate invitation token (Public).
- `POST /workspace-invitations/accept` — Accept invitation and join workspace.
- `POST /workspace-invitations/decline` — Decline invitation.
- `DELETE /workspaces/:workspaceId/invitations/:id` — Cancel pending invitation.

### 📁 Projects & Views
- `POST /workspaces/:workspaceId/projects` — Create project with auto-generated unique project key (e.g. `ENG`).
- `GET /workspaces/:workspaceId/projects` — List active projects in workspace.
- `GET /workspaces/:workspaceId/projects/:projectId` — Get project details.
- `PATCH /workspaces/:workspaceId/projects/:projectId` — Update project name, key, or description.
- `PATCH /workspaces/:workspaceId/projects/:projectId/archive` — Archive project.
- `DELETE /workspaces/:workspaceId/projects/:projectId` — Soft-delete project (movable to Trash).
- `PATCH /workspaces/:workspaceId/projects/:projectId/restore` — Restore soft-deleted project.
- `GET /projects/:projectId/tasks` or `GET /workspaces/:workspaceId/projects/:projectId/tasks` — **Flat Table/List View** with multi-column sorting, search, labels, priority, status, and checklist counters.

### 🏃 Agile Sprints & Backlog Triage
- `POST /projects/:projectId/sprints` — Create sprint in `PLANNING` status.
- `GET /projects/:projectId/sprints` — List sprints with capacity metrics (`totalStoryPoints`, `completedStoryPoints`, `estimatedHours`, `totalTasks`).
- `GET /sprints/:sprintId` — Sprint details and task breakdown.
- `PATCH /sprints/:sprintId` — Update sprint goal, name, or dates.
- `POST /sprints/:sprintId/start` — Start sprint (enforces single active sprint per project).
- `POST /sprints/:sprintId/complete` — Complete sprint and automatically roll unfinished tasks to next sprint or backlog.
- `DELETE /sprints/:sprintId` — Soft-delete sprint and unassign tasks to backlog.
- `GET /projects/:projectId/backlog` — Dedicated Backlog triage view with capacity aggregation.
- `POST /tasks/:taskId/sprint` — Assign task to sprint or push to backlog.

### 📋 Boards & Columns
- `POST /workspaces/:workspaceId/projects/:projectId/boards` — Create board in project.
- `GET /workspaces/:workspaceId/projects/:projectId/boards` — List project boards.
- `GET /workspaces/:workspaceId/projects/:projectId/boards/:boardId` — Get board with columns and tasks.
- `PATCH /workspaces/:workspaceId/projects/:projectId/boards/:boardId` — Update board title.
- `DELETE /workspaces/:workspaceId/projects/:projectId/boards/:boardId` — Delete board.
- `POST /workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns` — Create board column.
- `GET /workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns` — List columns in board.
- `PATCH /workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/reorder` — Reorder columns.
- `PATCH /workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId` — Update column title or WIP limit.
- `DELETE /workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId` — Delete column.

### ✅ Tasks & Bulk Operations
- `GET /workspaces/:workspaceId/my-tasks` — Personal "Assigned to Me" inbox across the workspace.
- `POST /columns/:columnId/tasks` — Create task (auto-generates sequential key `ENG-1`).
- `GET /columns/:columnId/tasks` — List tasks in column.
- `GET /tasks/:taskId` — Get task details by UUID or human key (e.g. `GEN-42`).
- `PATCH /tasks/:taskId` — Update task details, priority, status, story points, or estimated hours.
- `POST /tasks/:taskId/move` — Move task across columns or reorder (auto-syncs `Task.status` from target column title).
- `DELETE /tasks/:taskId` — Soft-delete task (restricted to creator or workspace Admin/Owner).
- `POST /tasks/bulk-update` — Bulk update status, priority, assignee, sprint, column, or labels.
- `POST /tasks/bulk-delete` — Bulk soft-delete tasks with authorization checks.

### 💬 Comments & Emoji Reactions
- `POST /tasks/:taskId/comments` — Create comment (supports `@username` mentions).
- `GET /tasks/:taskId/comments` — List comments using cursor-based pagination (includes grouped emoji reactions).
- `GET /tasks/:taskId/comments/:commentId` — Get single comment details.
- `PATCH /tasks/:taskId/comments/:commentId` — Update comment content.
- `DELETE /tasks/:taskId/comments/:commentId` — Soft-delete comment.
- `POST /tasks/:taskId/comments/:commentId/reactions` — Toggle emoji reaction (`👍`, `❤️`, `🚀`, `🎉`, `👀`).
- `GET /tasks/:taskId/comments/:commentId/reactions` — List reactions grouped by emoji with caller `hasReacted` flag.

### 🏷️ Labels & Tags
- `POST /workspaces/:workspaceId/labels` — Create custom label with hex color.
- `GET /workspaces/:workspaceId/labels` — List workspace labels.
- `PATCH /workspaces/:workspaceId/labels/:labelId` — Update label name or color.
- `DELETE /workspaces/:workspaceId/labels/:labelId` — Delete label.
- `POST /tasks/:taskId/labels/:labelId` — Attach label to task.
- `DELETE /tasks/:taskId/labels/:labelId` — Detach label from task.
- `PUT /tasks/:taskId/labels` — Set/replace all labels on a task.

### 📎 Attachments & External Resource Links
- `POST /tasks/:taskId/attachments` — Upload file attachment (10MB limit + MIME protection).
- `GET /tasks/:taskId/attachments` — List task attachments.
- `DELETE /tasks/:taskId/attachments/:attachmentId` — Delete attachment.
- `POST /tasks/:taskId/links` — Attach external link (`FIGMA`, `GITHUB`, `GOOGLE_DOC`, `EXTERNAL_URL`).
- `GET /tasks/:taskId/links` — List task external links.
- `GET /tasks/:taskId/links/:linkId` — Get details of a single task link.
- `PATCH /tasks/:taskId/links/:linkId` — Update link title, URL, or type.
- `DELETE /tasks/:taskId/links/:linkId` — Remove task link.

### 📝 Checklists / Subtasks
- `GET /tasks/:taskId/checklists` — List all checklist items for a task.
- `POST /tasks/:taskId/checklists` — Create checklist item.
- `PATCH /tasks/:taskId/checklists/:itemId` — Update checklist item title or assignee.
- `PATCH /tasks/:taskId/checklists/:itemId/toggle` — Toggle completion state.
- `DELETE /tasks/:taskId/checklists/:itemId` — Delete checklist item.

### 🔔 In-App Notifications
- `GET /notifications` — List user notifications (supports unread filter, pagination).
- `PATCH /notifications/read-all` — Mark all notifications as read.
- `PATCH /notifications/:id/read` — Mark single notification as read.
- `DELETE /notifications/:id` — Delete notification.

### 🕒 Activity Streams & Audit Logs
- `GET /workspaces/:workspaceId/activities` — Workspace-wide activity feed.
- `GET /tasks/:taskId/activities` — Task-specific activity history stream.
- `GET /workspaces/:workspaceId/audit-logs` — Security and administrative audit trail (Owner/Admin only).

### 🗑️ Trash Bin & Data Recovery
- `GET /workspaces/:workspaceId/trash` — List soft-deleted projects and tasks in workspace trash.
- `POST /workspaces/:workspaceId/trash/restore` — Restore item from trash.
- `DELETE /workspaces/:workspaceId/trash/empty` — Permanently purge soft-deleted items.

### 📊 Dashboard & Analytics
- `GET /workspaces/:workspaceId/dashboard/summary` — High-level workspace KPIs and story points capacity.
- `GET /workspaces/:workspaceId/dashboard/task-distribution` — Task distribution across statuses and priorities.
- `GET /workspaces/:workspaceId/dashboard/productivity` — Throughput metrics over configurable day intervals.
- `GET /workspaces/:workspaceId/dashboard/member-workload` — Per-member workload with story points, estimated hours, and completion rates.

### 🔍 Global Search
- `GET /workspaces/:workspaceId/search?q=query` — Full-text search across projects, tasks, comments, and members.

---

## ⚡ WebSocket Real-Time Events (`/realtime`)

The WebSocket gateway connects on namespace `/realtime` and uses JWT authentication on handshake. Multi-instance scaling is backed by `@socket.io/redis-adapter` with automatic local in-memory fallback.

### Room Subscriptions
Clients join rooms to receive targeted real-time broadcasts:
- `workspace:{workspaceId}` — Workspace-level events (members, projects).
- `board:{boardId}` — Kanban board card creation, movement, and deletion.
- `task:{taskId}` — Task-scoped updates, comments, and emoji reactions.
- `user:{userId}` — Private notifications room.

### Emitted Events

| Event | Target Room | Payload Summary |
| :--- | :--- | :--- |
| `user:online` | Global | `{ userId, user: { id, name, avatar } }` |
| `user:offline` | Global | `{ userId }` |
| `task:created` | `board:{boardId}` | Created task object and column container |
| `task:moved` | `board:{boardId}` | `{ taskId, sourceColumnId, destinationColumnId, newOrder }` |
| `task:updated` | `board:{boardId}` | Updated task properties |
| `task:deleted` | `board:{boardId}` | `{ taskId, boardId }` |
| `comment:created` | `task:{taskId}` | New comment payload with user info |
| `comment:updated` | `task:{taskId}` | Edited comment payload |
| `comment:deleted` | `task:{taskId}` | `{ commentId, taskId }` |
| `comment:reaction` | `task:{taskId}` | `{ commentId, taskId, action: 'added' \| 'removed', emoji, reactions }` |
| `notification:created` | `user:{userId}` | In-app notification payload |

---

## 🧪 Testing & Verification

The suite contains unit tests covering all services, guards, and event listeners:

```bash
# Run all unit tests
pnpm test

# Run tests with coverage
pnpm test:cov

# Run strict TypeScript compiler verification
pnpm typecheck

# Run linter
pnpm lint
```

---

## 📄 License

This repository is licensed under UNLICENSED. Private project.
