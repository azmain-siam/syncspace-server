# SyncSpace API Standards

This document defines the API conventions for the SyncSpace backend.

All APIs must follow these standards to ensure consistency, maintainability, and a predictable developer experience.

---

# API Style

Use RESTful APIs.

Allowed HTTP methods:

GET

POST

PATCH

DELETE

Avoid custom verbs in URLs.

❌ Bad

POST /createWorkspace

POST /deleteTask

✅ Good

POST /workspaces

DELETE /tasks/:id

---

# URL Naming

Use plural nouns.

Examples

/auth

/users

/workspaces

/projects

/boards

/columns

/tasks

/comments

/notifications

Never use PascalCase.

Never use snake_case.

Use kebab-case only if multiple words exist.

Example

/workspace-members

---

# Resource Nesting

Only nest resources when ownership is obvious.

Example

GET /workspaces/:id/projects

GET /projects/:id/boards

GET /boards/:id/tasks

Avoid deeply nested endpoints.

Never exceed two nesting levels.

---

# HTTP Status Codes

GET

200 OK

POST

201 Created

PATCH

200 OK

DELETE

200 OK

Validation Error

400

Unauthorized

401

Forbidden

403

Not Found

404

Conflict

409

Internal Error

500

---

# Standard Response Format

Success

```json
{
  "success": true,
  "message": "Workspace created successfully.",
  "data": {}
}
```

Pagination

```json
{
  "success": true,
  "message": "Success",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

Error

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed.",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

---

# Pagination

Every listing endpoint must support:

page

limit

search

sortBy

order

Default

page=1

limit=20

Maximum limit

100

---

# Filtering

Filtering should use query parameters.

Example

GET /tasks?priority=HIGH

GET /tasks?status=TODO

GET /projects?workspaceId=123

---

# Sorting

Example

GET /tasks?sortBy=createdAt&order=desc

Allowed

asc

desc

---

# Searching

Use one search parameter.

Example

GET /tasks?search=login

Search should be case-insensitive.

---

# Validation

Every request body must use DTO validation.

Never validate inside controllers.

Use:

class-validator

class-transformer

---

# Authentication

Protected endpoints require:

Authorization

Bearer Token

Public endpoints:

Login

Register

Refresh Token

Health Check

---

# Authorization

Every mutation endpoint must verify permissions.

Examples

Workspace Owner

Admin

Member

Permission checks belong inside services or guards.

---

# Swagger

Every endpoint must contain:

Summary

Description

Request DTO

Response DTO

Error Responses

Authentication Requirements

Tags

---

# DTO Naming

CreateWorkspaceDto

UpdateWorkspaceDto

WorkspaceResponseDto

TaskQueryDto

Never reuse Create DTOs for Update DTOs.

---

# Query DTO

All query parameters should use dedicated DTOs.

Example

TaskQueryDto

WorkspaceQueryDto

ProjectQueryDto

---

# File Upload APIs

Always use multipart/form-data.

Return metadata only.

Never return binary files.

---

# Bulk Operations

Use dedicated endpoints.

Example

POST /tasks/bulk-delete

POST /tasks/bulk-move

Avoid sending arrays to normal endpoints.

---

# Idempotency

GET

PUT (if used)

DELETE

should be idempotent.

POST should not.

---

# Error Messages

Bad

Invalid

Good

Workspace not found.

Task already exists.

Email already registered.

Messages should help frontend developers.

---

# API Versioning

Use version prefix.

Example

/api/v1

Future

/api/v2

Never remove older APIs without migration strategy.

---

# Rate Limiting

Apply rate limiting to:

Login

Register

Password Reset

Invitation APIs

Public APIs

---

# Logging

Log:

Request ID

User ID

Route

Execution Time

Status Code

Never log passwords or tokens.

---

# Agent Instructions

Before generating an endpoint:

- Verify REST naming.
- Create DTOs.
- Add Swagger decorators.
- Add validation.
- Protect routes when necessary.
- Return standard responses.
- Support pagination for list endpoints.
- Keep controllers thin.
