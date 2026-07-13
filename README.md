# SyncSpace Server

NestJS backend for the SyncSpace collaboration platform. The current implementation focuses on authentication, workspace management, and project organization with role-based access control.

## Project Overview

SyncSpace is a real-time team collaboration platform. This repository contains the backend API that powers:

- user authentication and token refresh
- workspace creation and membership management
- workspace role enforcement
- project creation and project-level lifecycle management
- Prisma-backed persistence with PostgreSQL
- Swagger documentation and request validation

## Current Implementation Status

The backend is currently in the foundation phase for the collaboration platform and already includes the following working areas:

- Authentication module
- Workspace module
- Project module
- User module
- Prisma integration with PostgreSQL
- JWT and refresh-token handling
- Email service wiring
- API response normalization and validation

The database schema already includes support for boards, board columns, tasks, comments, attachments, and activity logs, but those features are not yet exposed as full public API modules.

## Tech Stack

- NestJS 11
- TypeScript
- Prisma ORM
- PostgreSQL
- Passport JWT
- Swagger
- class-validator / class-transformer
- bcrypt
- nodemailer
- Helmet
- @nestjs/throttler

## Project Structure

```text
src/
  app.module.ts
  main.ts
  common/
    decorators/
    enums/
    exceptions/
    filters/
    guards/
    interceptors/
    interfaces/
    pipes/
  config/
    configuration.ts
    storage.config.ts
    swagger.config.ts
    validation.ts
  module/
    auth/
    email/
    prisma/
    project/
    user/
    workspace/
prisma/
  schema.prisma
  migrations/
```

## Environment Variables

Create a `.env` file with the following variables:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
```

Notes:

- `PORT` defaults to `5000` in the application config.
- `DATABASE_URL` is required for Prisma.
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are required.
- `EMAIL_USER` and `EMAIL_PASS` are used for SMTP mail delivery.

## Installation and Local Development

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate dev
pnpm start:dev
```

## Available Scripts

```bash
pnpm build
pnpm start
pnpm start:dev
pnpm start:debug
pnpm start:prod
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:studio
pnpm lint
pnpm typecheck
pnpm test
pnpm test:watch
pnpm test:cov
pnpm test:e2e
```

## API Base URL

The application is served under the global prefix:

```text
/api/v1
```

Swagger documentation is available at:

```text
http://localhost:5000/docs
```

## Core API Endpoints

### Authentication

- `POST /api/v1/auth/register`
  - register a new user
- `POST /api/v1/auth/login`
  - authenticate a user and issue access/refresh tokens
- `POST /api/v1/auth/refresh`
  - rotate refresh token and issue a new access token
- `POST /api/v1/auth/logout`
  - invalidate the authenticated user's refresh session

### User

- `GET /api/v1/user/me`
  - returns the currently authenticated user payload

### Workspace

- `POST /api/v1/workspaces`
  - create a workspace
- `GET /api/v1/workspaces`
  - list the authenticated user's workspaces
- `POST /api/v1/workspaces/:workspaceId/members`
  - invite a member to a workspace
- `DELETE /api/v1/workspaces/:workspaceId/members/:userId`
  - remove a member
- `PATCH /api/v1/workspaces/:workspaceId/members/:memberId/role`
  - update a member role
- `PATCH /api/v1/workspaces/:workspaceId/transfer-ownership`
  - transfer workspace ownership
- `GET /api/v1/workspaces/:workspaceId/members`
  - list workspace members
- `PATCH /api/v1/workspaces/:workspaceId/settings`
  - update workspace settings

### Project

- `POST /api/v1/workspaces/:workspaceId/project`
  - create a project inside a workspace
- `GET /api/v1/workspaces/:workspaceId/project`
  - list workspace projects
- `GET /api/v1/workspaces/:workspaceId/project/:projectId`
  - fetch one project by ID
- `PATCH /api/v1/workspaces/:workspaceId/project/:projectId`
  - update a project
- `PATCH /api/v1/workspaces/:workspaceId/project/:projectId/archive`
  - archive a project

## Security and Application Behavior

The backend currently applies the following cross-cutting behavior:

- global `ValidationPipe` with whitelist/forbid unknown fields
- global response interceptor for consistent API responses
- JWT authentication guards
- workspace role guards for workspace-scoped access
- throttling guard across the application
- helmet for security headers
- CORS enabled for `http://localhost:3000`

## Database Model Highlights

The Prisma schema defines the core entities used by SyncSpace, including:

- `User`
- `Workspace`
- `WorkspaceMember`
- `Project`
- `ProjectMember`
- `Board`
- `BoardColumn`
- `Task`
- `Comment`
- `Attachment`
- `ActivityLog`

## Notes

- This repository is currently backend-focused and not a CRUD tutorial.
- The architecture is designed to support future modules such as boards, tasks, realtime collaboration, notifications, and audit activity.
- The project follows a modular NestJS structure with services handling business logic and controllers remaining thin.

## License

This repository is currently configured as `UNLICENSED`.
