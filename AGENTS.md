````md
# SyncSpace — AI Engineering Guidelines

This document defines how AI coding agents (GitHub Copilot, Cursor AI, Claude, ChatGPT, VSCode AI Agents, etc.) should generate and maintain code for the SyncSpace backend project.

The goal is to maintain:
- scalable architecture
- clean code quality
- enterprise-level structure
- consistency
- production-grade engineering standards

---

# 1. Project Overview

## Project Name
SyncSpace

## Type
Real-Time Team Collaboration Platform

## Tech Stack

### Backend
- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- Passport JWT
- WebSocket Gateway (Socket.io)
- Redis (future)
- BullMQ (future)

### Frontend (future)
- Next.js
- TypeScript
- Tailwind CSS
- Zustand / Redux Toolkit
- Socket.io Client

---

# 2. Engineering Principles

AI agents MUST follow these principles:

## Core Principles
- Write modular code
- Follow scalable architecture
- Avoid duplicate logic
- Keep controllers thin
- Keep services business-focused
- Prefer composition over large classes
- Use proper typing
- Avoid `any`
- Use async/await properly
- Follow SOLID principles where practical

---

# 3. Backend Architecture Rules

## Module Structure

Every feature module MUST follow:

```bash
module-name/

├── dto/
├── interfaces/
├── decorators/
├── guards/
├── strategies/
├── constants/
├── enums/
├── utils/
├── module-name.controller.ts
├── module-name.service.ts
├── module-name.module.ts
````

Do NOT create unnecessary folders.

---

# 4. Controllers

Controllers MUST:

* only handle HTTP layer
* validate requests
* call services
* return responses

Controllers MUST NOT:

* contain business logic
* contain database queries
* contain complex calculations

GOOD:

```ts
@Post()
create(
  @Body() dto: CreateDto,
  @CurrentUser() user: JwtUser,
) {
  return this.service.create(dto, user.id);
}
```

BAD:

```ts
@Post()
async create() {
  // database queries here
}
```

---

# 5. Services

Services MUST:

* contain business logic
* interact with Prisma
* handle validation logic
* manage transactions

Services SHOULD:

* return pure business data
* avoid HTTP response formatting

---

# 6. DTO Rules

Use DTOs ONLY for:

* request validation
* incoming payload structure

All DTOs MUST use:

* class-validator
* class-transformer when needed

Example:

```ts
export class CreateWorkspaceDto {
  @IsString()
  @Length(2, 50)
  name: string;
}
```

---

# 7. Response Architecture

Global response interceptor is used.

Services should return:

```ts
return workspace;
```

NOT:

```ts
return {
  success: true
}
```

Final response formatting handled globally.

---

# 8. Authentication Rules

Authentication uses:

* Passport JWT
* Access Token
* Refresh Token Rotation

Rules:

* Passwords MUST be hashed with bcrypt
* Refresh tokens MUST be hashed in database
* JWT secrets MUST come from ConfigService
* Never expose password field
* Never trust client-provided user IDs

---

# 9. Prisma Rules

## Prisma Usage

Use PrismaService ONLY inside services.

Avoid:

* direct prisma usage inside controllers

---

## Transactions

Use transactions for multi-step operations.

Example:

* workspace creation
* member invitation
* ownership transfer

Example:

```ts
await this.prisma.$transaction(async (tx) => {
  // operations
});
```

---

# 10. Database Conventions

## IDs

Use UUID/CUID string IDs.

## Timestamps

All models should contain:

```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

---

## Soft Delete (future)

Use:

```prisma
deletedAt DateTime?
```

instead of hard delete for important entities.

---

# 11. Authorization Rules

Workspace access MUST always be validated.

Never trust:

```ts
workspaceId from client
```

Always verify:

* membership
* role
* permissions

before accessing workspace resources.

---

# 12. Role System

Workspace roles:

* OWNER
* ADMIN
* MEMBER

Role validation should be centralized.

Avoid repeated permission logic.

---

# 13. Realtime Rules

Realtime features will use:

* Socket.io Gateway

Realtime updates include:

* task movement
* task updates
* comments
* online users
* notifications

WebSocket events MUST:

* validate workspace access
* validate authenticated user

---

# 14. Error Handling

Use NestJS exceptions only.

Examples:

* BadRequestException
* UnauthorizedException
* ForbiddenException
* NotFoundException

Do NOT throw generic Error.

---

# 15. Logging

Use NestJS Logger.

Avoid:

```ts
console.log()
```

except temporary debugging.

---

# 16. Environment Variables

All environment variables MUST:

* use ConfigService
* use validation schema
* never use process.env directly in services

BAD:

```ts
process.env.JWT_SECRET
```

GOOD:

```ts
this.configService.get<string>('jwt.secret')
```

---

# 17. API Standards

## Route Naming

GOOD:

```bash
/workspaces
/workspaces/:id
/tasks/:id/comments
```

BAD:

```bash
/getAllWorkspaces
/createTask
```

Use REST conventions.

---

# 18. Code Style

## Use

* meaningful naming
* early returns
* small functions
* reusable utilities

## Avoid

* deeply nested logic
* large controller methods
* magic strings

---

# 19. TypeScript Rules

STRICT typing required.

Avoid:

```ts
any
```

Prefer:

* interfaces
* types
* Prisma generated types

---

# 20. Security Rules

Always:

* validate input
* sanitize responses
* hash passwords
* hash refresh tokens
* protect routes with guards

Never:

* expose internal errors
* expose sensitive fields

---

# 21. Future Scalability

Architecture should support future addition of:

* Redis caching
* BullMQ jobs
* Notifications
* File uploads
* Team chat
* Activity logs
* Audit history
* Microservices transition

Do NOT overengineer now.

Build modularly for future scaling.

---

# 22. Preferred Coding Style

Prefer:

* readable code
* maintainable abstractions
* simplicity

Avoid:

* unnecessary patterns
* excessive generic abstractions
* premature optimization

---

# 23. Commit Convention

Use Conventional Commits.

Examples:

```bash
feat(auth): implement refresh token rotation

fix(workspace): prevent duplicate members

refactor(task): simplify task ordering logic

chore(prisma): update schema indexes
```

---

# 24. AI Agent Instructions

AI agents MUST:

* preserve architecture consistency
* avoid introducing anti-patterns
* avoid large unstructured files
* avoid business logic inside controllers
* avoid duplicated validation logic

AI agents SHOULD:

* generate production-grade code
* follow NestJS best practices
* maintain modular structure
* prioritize readability

---

# 25. Current Project Phase

Current implementation phase:

* Authentication System
* Workspace Module
* RBAC Foundation

Upcoming:

* Project Module
* Board Module
* Task Module
* Realtime Collaboration
* Notifications

---

# 26. Important Philosophy

This project is NOT a CRUD tutorial project.

It is intended to simulate:

* real SaaS architecture
* scalable backend engineering
* production-level collaboration platform

Code quality matters more than feature quantity.

```
```
