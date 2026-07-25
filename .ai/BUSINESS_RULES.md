# BUSINESS_RULES.md

# SyncSpace Business Rules

This document contains all business rules that the backend must follow.

The AI Agent must never invent business logic that contradicts these rules.

---

# Workspace

A workspace represents an organization or team.

Every workspace must have exactly one owner.

The owner cannot be removed.

Ownership may only be transferred explicitly.

Deleting a workspace deletes all child resources.

---

# Workspace Members

A user may belong to multiple workspaces.

A workspace member belongs to only one workspace.

A member cannot join twice.

Invitation should prevent duplicate invites.

---

# Workspace Roles

OWNER

Highest permission.

Can:

Manage workspace

Transfer ownership

Delete workspace

Assign roles

ADMIN

Can:

Manage projects

Manage boards

Invite members

Manage tasks

Cannot:

Delete workspace

Transfer ownership

MEMBER

Can:

Create tasks

Update assigned tasks

Comment

Upload attachments

Cannot:

Manage workspace

Manage permissions

---

# Projects

Projects belong to one workspace.

Projects inherit workspace permissions.

Deleting a project deletes:

Boards

Columns

Tasks

Comments

Attachments

Activity Logs (optional)

---

# Boards

Each project may have multiple boards.

Each board belongs to only one project.

Every board must contain at least one column.

---

# Columns

Columns belong to one board.

Column order is unique within a board.

Default columns:

Todo

In Progress

Review

Done

Columns may be reordered.

---

# Tasks

Every task belongs to exactly one column.

Tasks have ordering.

Tasks may move between columns.

Moving a task should update its order.

Tasks support:

Title

Description

Priority

Due Date

Assignee

Attachments

Comments

Activity

---

# Task Assignment

Only project members may be assigned.

Assigning a task generates:

Notification

Activity Log

Realtime Event

---

# Task Completion

Moving to Done marks completion.

Completion time should be stored.

---

# Comments

Comments belong to tasks.

Only workspace members may comment.

Editing history is optional.

Deleting comments should not delete tasks.

---

# Attachments

Attachments belong to tasks.

Store only metadata.

Actual files live in object storage.

---

# Notifications

Notifications are event-driven.

Business modules emit events.

Notification module handles delivery.

Supported events:

Task Assigned

Task Mentioned

Task Due

Invitation Accepted

Workspace Invitation

Project Invitation

---

# Activity Logs

Every important action should create activity.

Examples

Workspace Created

Project Created

Task Created

Task Updated

Task Deleted

Task Assigned

Task Moved

Comment Added

Never modify activity history.

---

# Invitations

Invitation must expire.

Duplicate invitations are not allowed.

Invited users may:

Accept

Reject

Expired invitations cannot be reused.

---

# Realtime

Realtime should broadcast only after successful database commits.

REST API performs business logic.

Socket.IO broadcasts updates.

Never duplicate logic in gateways.

---

# Permissions

Permission priority:

Owner

↓

Admin

↓

Member

The highest role always wins.

---

# Soft Delete

Use soft delete for important business entities.

Deleted records should not appear in normal queries.

---

# Search

Search should ignore deleted records.

Search should be case-insensitive.

---

# Audit

Store creator and updater when applicable.

Sensitive actions should record actor ID.

---

# Future Features

Database and business logic should remain compatible with:

Chat

Calendar

Notifications

Mentions

File Versioning

Automation

AI Assistant

Time Tracking

Recurring Tasks

Subtasks

Teams

Organizations

Public APIs

---

# AI Agent Instructions

Before implementing any feature:

1. Read these business rules.
2. Reuse existing services.
3. Do not duplicate business logic.
4. Preserve existing workflows.
5. Emit activity events.
6. Emit notification events.
7. Emit realtime events after successful database writes.
8. Never bypass permission checks.
9. Keep business logic inside services.
10. Think like a product engineer, not just a programmer.
