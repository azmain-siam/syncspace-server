# PROJECT_CONTEXT.md

# SyncSpace Backend

This project is already under active development.

The AI Agent is joining an existing codebase.

You are NOT starting a new project.

Before implementing anything:

- Understand the existing architecture.
- Read related modules.
- Reuse existing services.
- Reuse DTOs.
- Reuse decorators.
- Reuse guards.
- Reuse utilities.
- Reuse helpers.
- Reuse enums.
- Reuse constants.
- Reuse Prisma models.

Never generate duplicate code.

---

# Current Stack

- NestJS
- Prisma
- PostgreSQL
- Docker
- Socket.IO
- Swagger
- JWT
- Passport

---

# Current Progress

The following modules may already exist:

- Authentication
- User
- Workspace
- Projects
- Boards
- Columns
- Tasks
- Comments
- Activity
- Notifications
- Upload
- Socket Gateway

Always inspect existing implementations before writing code.

---

# Existing Coding Style

Match the current codebase.

Do not rename files.

Do not rename DTOs.

Do not rename services.

Do not change response formats.

Do not introduce another architecture.

---

# Reuse Existing Code

Before writing code ask yourself:

Does this already exist?

Can this service be reused?

Can this repository be reused?

Can this helper be reused?

Can this DTO be extended?

Can this enum be reused?

Never duplicate logic.

---

# Database

Never modify Prisma schema without checking existing relations.

Never create duplicate tables.

Never create duplicate enums.

Never rename fields unless instructed.

---

# API

Maintain backward compatibility.

Never break existing endpoints.

Never change response formats.

---

# Refactoring

If improvements are found:

Suggest them first.

Do not refactor automatically.

---

# Agent Workflow

For every request:

1. Read related module.
2. Understand architecture.
3. Explain implementation plan.
4. Mention reusable components.
5. Implement.
6. Explain what changed.
7. Mention possible improvements.
