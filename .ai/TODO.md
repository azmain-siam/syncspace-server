# TODO.md

# SyncSpace Backend Development Tracker

This document tracks backend development progress.

The AI Agent must always read this file before implementing any feature.

Never rebuild completed functionality.

Always continue from the current project state.

---

# Development Status

Legend

- ✅ Completed
- 🚧 In Progress
- ⏳ Planned
- ❌ Blocked
- 🔄 Refactor Later

---

# Phase 1 — Project Setup

## Infrastructure

- [ ] Docker
- [ ] Docker Compose
- [ ] Environment Configuration
- [ ] Prisma
- [ ] PostgreSQL
- [ ] Swagger
- [ ] Validation Pipe
- [ ] Global Exception Filter
- [ ] Logger
- [ ] Config Module

Notes

```
Write implementation notes here.
```

---

# Phase 2 — Authentication

## Auth

- [ ] Register
- [ ] Login
- [ ] Refresh Token
- [ ] Logout
- [ ] JWT Guard
- [ ] Password Hashing
- [ ] Current User Decorator

Notes

```

```

---

# Phase 3 — User

## User

- [ ] Profile
- [ ] Update Profile
- [ ] Avatar Upload
- [ ] Change Password

Notes

```

```

---

# Phase 4 — Workspace

## Workspace

- [ ] Create Workspace
- [ ] Update Workspace
- [ ] Delete Workspace
- [ ] Transfer Ownership
- [ ] Workspace Settings

Notes

```

```

---

# Workspace Members

- [ ] Invite Member
- [ ] Accept Invitation
- [ ] Reject Invitation
- [ ] Remove Member
- [ ] Change Role

Notes

```

```

---

# Phase 5 — Projects

## Project

- [ ] Create Project
- [ ] Update Project
- [ ] Archive Project
- [ ] Delete Project

Notes

```

```

---

# Phase 6 — Boards

## Board

- [ ] Create Board
- [ ] Update Board
- [ ] Delete Board
- [ ] Reorder Boards

---

# Columns

- [ ] Create Column
- [ ] Rename Column
- [ ] Delete Column
- [ ] Reorder Columns

Notes

```

```

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

Notes

```

```

---

# Phase 8 — Comments

## Comment

- [ ] Create
- [ ] Update
- [ ] Delete

Notes

```

```

---

# Phase 9 — Upload

## Attachments

- [ ] Upload
- [ ] Delete
- [ ] Preview

Notes

```

```

---

# Phase 10 — Activity

## Activity

- [ ] Workspace Activity
- [ ] Project Activity
- [ ] Task Activity

Notes

```

```

---

# Phase 11 — Notification

## Notification

- [ ] Task Assigned
- [ ] Mention
- [ ] Due Reminder
- [ ] Workspace Invitation
- [ ] Project Invitation

Notes

```

```

---

# Phase 12 — Realtime

## Socket.IO

- [ ] Online Users
- [ ] Live Task Update
- [ ] Task Move
- [ ] Live Comments
- [ ] Notifications

Notes

```

```

---

# Phase 13 — Search

## Search

- [ ] Workspace Search
- [ ] Project Search
- [ ] Task Search

Notes

```

```

---

# Phase 14 — Dashboard

## Analytics

- [ ] Project Statistics
- [ ] Task Statistics
- [ ] Productivity
- [ ] Member Activity

Notes

```

```

---

# Future Features

## Chat

- [ ] Direct Message
- [ ] Workspace Chat
- [ ] Typing Indicator
- [ ] Read Receipts

---

## Calendar

- [ ] Calendar View
- [ ] Upcoming Tasks
- [ ] Reminders

---

## AI

- [ ] AI Task Summary
- [ ] AI Project Insights
- [ ] AI Productivity Report

---

## Automation

- [ ] Workflow Rules
- [ ] Auto Assignment
- [ ] Due Date Automation

---

# Technical Debt

Use this section for improvements that should be implemented later.

Example

- Replace duplicated query
- Improve Prisma transaction
- Optimize search query
- Reduce service complexity

---

# Known Bugs

Document existing bugs.

Format

## Bug

Description

Status

Priority

Owner

---

# Refactor Queue

Features that should be improved later.

Never refactor automatically.

Examples

- Workspace Service
- Notification Service
- Socket Gateway

---

# Current Sprint

The AI Agent should prioritize only these tasks.

Example

1.

2.

3.

---

# Next Feature

This section should always contain only ONE feature.

The AI Agent should implement this feature first unless instructed otherwise.

Example

```
Implement task labels with filtering support.
```

---

# AI Agent Rules

Before implementing any feature:

1. Read this file.
2. Skip completed features.
3. Continue from current progress.
4. Reuse existing code.
5. Update this file after implementation.
6. Never mark a feature complete unless it is fully implemented.
7. If a feature is partially complete, mark it as 🚧 and explain why.
8. If blocked, document the blocker instead of guessing.

This file is the single source of truth for project progress.
