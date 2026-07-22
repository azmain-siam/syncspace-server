# FEATURE_IMPLEMENTATION_GUIDE.md

# SyncSpace Feature Implementation Guide

This document defines the standard workflow the AI Agent must follow whenever implementing a new feature.

The objective is to ensure every feature is:

- Consistent
- Production-ready
- Maintainable
- Reusable
- Backward compatible

Never skip steps unless explicitly instructed.

---

# Core Principle

Never start coding immediately.

Always understand the feature before implementing it.

Every implementation should integrate with the existing architecture rather than introducing a new pattern.

---

# Feature Development Workflow

Every feature must follow this workflow.

```
Understand Requirement
        │
        ▼
Inspect Existing Code
        │
        ▼
Design Database Changes
        │
        ▼
Create / Update DTOs
        │
        ▼
Implement Business Logic
        │
        ▼
Implement Controller
        │
        ▼
Add Validation
        │
        ▼
Add Authorization
        │
        ▼
Emit Events
        │
        ▼
Update Swagger
        │
        ▼
Test
        │
        ▼
Document Changes
```

Never change the order unless necessary.

---

# Step 1 — Understand the Feature

Before writing code determine:

- What problem is being solved?
- Which module owns this feature?
- Which existing modules are affected?
- Which database tables are involved?
- Does this require permissions?
- Does this require notifications?
- Does this require realtime updates?
- Does this require activity logs?

Never make assumptions.

---

# Step 2 — Inspect Existing Code

Before creating anything search for:

- Existing Service
- Existing DTO
- Existing Entity
- Existing Prisma Model
- Existing Enum
- Existing Guard
- Existing Decorator
- Existing Utility
- Existing Helper
- Existing Validation

If something already exists, reuse it.

Never duplicate implementations.

---

# Step 3 — Database

Only modify the database if necessary.

Before changing Prisma:

Check

- Relations
- Indexes
- Constraints
- Existing Enums
- Existing Tables

Never duplicate tables.

Never rename columns unless explicitly instructed.

Generate migrations.

Never use

```
prisma db push
```

for production features.

---

# Step 4 — DTO Design

Create dedicated DTOs.

Examples

```
CreateTaskDto

UpdateTaskDto

AssignTaskDto

MoveTaskDto

TaskQueryDto

TaskResponseDto
```

Never reuse Create DTOs for Update DTOs.

Always validate every property.

---

# Step 5 — Business Logic

Business logic belongs inside Services.

Controllers should only:

- Validate
- Authenticate
- Authorize
- Call Service
- Return Response

Never place business logic inside controllers.

---

# Step 6 — Database Operations

Use Prisma.

Always prefer:

```
select
```

instead of large

```
include
```

queries.

Avoid unnecessary database calls.

Use transactions whenever multiple writes must succeed together.

---

# Step 7 — Authorization

Before every mutation verify permissions.

Example

Workspace

↓

Project

↓

Task

↓

Comment

Permissions cascade from Workspace.

Never trust client-provided role information.

---

# Step 8 — Validation

Every endpoint must use DTO validation.

Use

- class-validator
- class-transformer

Validation belongs before business logic.

---

# Step 9 — Activity Logs

Ask:

Should this action appear in Activity?

Examples

Workspace Created

Project Deleted

Task Assigned

Task Moved

Comment Added

If yes:

Create activity after successful database commit.

---

# Step 10 — Notifications

Ask:

Should users be notified?

Examples

Task Assigned

Mention

Invitation

Due Reminder

If yes:

Emit notification event.

Do not directly send notification from business logic.

---

# Step 11 — Realtime

Ask:

Should connected users instantly see this update?

Examples

Task Created

Task Updated

Task Deleted

Task Moved

Comment Added

If yes:

Emit Socket.IO event after database transaction succeeds.

Never modify database through WebSocket gateway.

---

# Step 12 — Response

Use consistent response format.

```
{
  success: true,
  message: "...",
  data: {}
}
```

For list endpoints

```
{
    success,
    message,
    data,
    meta
}
```

Never return inconsistent responses.

---

# Step 13 — Swagger

Every endpoint must contain:

- Summary
- Description
- Authentication
- Request DTO
- Response DTO
- Error Responses
- Tags

Swagger must always match implementation.

---

# Step 14 — Error Handling

Use NestJS Exceptions.

Examples

```
BadRequestException

UnauthorizedException

ForbiddenException

ConflictException

NotFoundException
```

Never throw generic Error.

---

# Step 15 — Logging

Log:

- Important business actions
- Errors
- Warnings

Never log

- Password
- Tokens
- Secrets

---

# Step 16 — Testing Checklist

Before considering implementation complete verify:

✓ Validation works

✓ Permission works

✓ Database updates correctly

✓ Transactions rollback correctly

✓ Notifications fire

✓ Activity created

✓ Realtime event emitted

✓ Swagger updated

✓ No duplicate logic

---

# Feature Categories

## Simple Feature

Example

Profile Update

Flow

DTO

↓

Service

↓

Controller

↓

Swagger

---

## Medium Feature

Example

Create Task

Flow

DTO

↓

Permission

↓

Database

↓

Activity

↓

Notification

↓

Realtime

↓

Response

---

## Complex Feature

Example

Create Workspace

Flow

Validation

↓

Transaction

↓

Workspace

↓

Owner Membership

↓

Default Project

↓

Default Board

↓

Default Columns

↓

Activity

↓

Notification

↓

Response

Everything must happen inside a transaction.

---

# Feature Quality Checklist

Every feature should satisfy:

✓ Follows existing architecture

✓ Uses existing services

✓ Uses existing DTOs when appropriate

✓ Uses existing enums

✓ Uses existing utilities

✓ No duplicated logic

✓ Backward compatible

✓ RESTful API

✓ DTO validation

✓ Permission checks

✓ Activity logging

✓ Notification support

✓ Realtime support

✓ Swagger documentation

✓ Clean code

✓ Readable implementation

---

# When Refactoring

Do not automatically rewrite modules.

Instead

Explain

- Why refactor?
- Benefits
- Risks
- Estimated impact

Wait for approval.

---

# AI Agent Decision Tree

Before implementing any feature ask:

1. Does something similar already exist?

↓

YES

Reuse it.

↓

NO

Continue.

---

2. Does database change?

↓

YES

Create migration.

↓

NO

Continue.

---

3. Does it affect permissions?

↓

YES

Implement authorization.

↓

NO

Continue.

---

4. Does it affect users?

↓

YES

Create notification.

↓

NO

Continue.

---

5. Should collaborators instantly see it?

↓

YES

Emit realtime event.

↓

NO

Continue.

---

6. Should it appear in history?

↓

YES

Create activity log.

↓

NO

Finish.

---

# Definition of Done

A feature is considered complete only when:

- Business logic is implemented.
- Validation is complete.
- Authorization is enforced.
- Database is updated.
- Transactions are used where needed.
- Activity log is generated (if applicable).
- Notification event is emitted (if applicable).
- Realtime event is emitted (if applicable).
- Swagger documentation is updated.
- Existing architecture is preserved.
- No duplicate code is introduced.
- Backward compatibility is maintained.

---

# AI Agent Responsibilities

The AI Agent must behave like a senior backend engineer.

For every feature:

1. Understand the requirement.
2. Inspect existing code.
3. Reuse existing implementations.
4. Follow project architecture.
5. Implement the smallest necessary change.
6. Keep the code clean and modular.
7. Explain what changed.
8. Suggest improvements separately instead of refactoring automatically.

Always prioritize:

- Consistency over creativity
- Reuse over duplication
- Simplicity over complexity
- Maintainability over shortcuts
- Long-term scalability over quick fixes
