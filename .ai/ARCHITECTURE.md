# ARCHITECTURE.md

# SyncSpace Backend Architecture

This document describes the architectural principles, module responsibilities, communication patterns, and implementation standards for the SyncSpace backend.

Every implementation must follow this architecture to ensure the project remains scalable, maintainable, and production-ready.

---

# Architecture Philosophy

SyncSpace follows a **Modular Monolith** architecture.

The application is divided into independent business modules.

Each module owns:

- Controllers
- Services
- DTOs
- Validation
- Business Logic
- Database Operations
- Events

Modules should communicate through services or events, **never by accessing each other's internal implementation**.

---

# Technology Stack

Backend Framework

- NestJS

Language

- TypeScript

Database

- PostgreSQL

ORM

- Prisma ORM

Authentication

- JWT
- Passport

Realtime

- Socket.IO

Documentation

- Swagger

Containerization

- Docker

Validation

- class-validator
- class-transformer

---

# High Level Architecture

```
                Client Applications
                        │
                        ▼
                HTTP / WebSocket
                        │
        ┌───────────────────────────┐
        │      NestJS Backend       │
        └───────────────────────────┘
                        │
        ┌───────────────────────────┐
        │        Controllers        │
        └───────────────────────────┘
                        │
        ┌───────────────────────────┐
        │         Services          │
        └───────────────────────────┘
                        │
        ┌───────────────────────────┐
        │        Prisma ORM         │
        └───────────────────────────┘
                        │
                PostgreSQL Database
```

Controllers never talk directly to the database.

---

# Layer Responsibilities

## Controller

Responsible for:

- Receiving requests
- Validation
- Authentication
- Authorization
- Calling services
- Returning responses

Controllers should never contain business logic.

---

## Service

Responsible for:

- Business rules
- Permission validation
- Database operations
- Event publishing
- Transactions

Services are the heart of every module.

---

## Prisma

Responsible for:

- Database access
- Transactions
- Relations
- Query optimization

Business logic must never exist inside Prisma queries.

---

## Gateway

Responsible for:

- WebSocket connections
- Broadcasting realtime events

Gateway never performs business logic.

It only emits events after successful service execution.

---

# Core Modules

```
Authentication

Users

Workspace

Workspace Members

Projects

Boards

Columns

Tasks

Comments

Notifications

Activities

Uploads

Realtime

Common

Prisma

Config
```

Each module must remain independent.

---

# Authentication Flow

```
Login

↓

Validate Credentials

↓

Generate Access Token

↓

Generate Refresh Token

↓

Return Tokens

↓

Protected Routes

↓

JWT Guard

↓

Current User
```

All protected endpoints require JWT authentication.

---

# Authorization Flow

```
Incoming Request

↓

JWT Authentication

↓

Workspace Membership Check

↓

Role Validation

↓

Permission Validation

↓

Business Logic
```

Never trust role information from the client.

Always verify permissions from the database.

---

# Workspace Architecture

Workspace is the top-level business entity.

Hierarchy:

```
Workspace

↓

Projects

↓

Boards

↓

Columns

↓

Tasks

↓

Comments
```

Every resource belongs to exactly one workspace.

Workspace permissions cascade downward.

---

# Request Lifecycle

```
Request

↓

Global Validation Pipe

↓

JWT Guard

↓

Role Guard

↓

Controller

↓

Service

↓

Prisma

↓

Database

↓

Activity Event

↓

Notification Event

↓

Realtime Event

↓

Response
```

---

# Realtime Architecture

REST API remains the source of truth.

Flow:

```
Client

↓

HTTP Request

↓

Controller

↓

Service

↓

Database

↓

Commit Successful

↓

Socket Gateway

↓

Broadcast Event
```

Never update database through Socket Gateway.

---

# Notification Architecture

Notification system is event-driven.

```
Business Module

↓

Emit Event

↓

Notification Module

↓

Create Notification

↓

Send Push

↓

Broadcast Socket Event
```

Business modules should never directly send notifications.

---

# Activity Log Architecture

Every important business action creates an activity log.

```
Business Action

↓

Activity Service

↓

Database

↓

Activity Feed
```

Activity history is append-only.

Never edit previous logs.

---

# File Upload Architecture

```
Client

↓

Upload Controller

↓

Upload Service

↓

Cloud Storage

↓

Store Metadata

↓

Database
```

Never store binary files in PostgreSQL.

---

# Dependency Rules

Allowed:

```
Controller

↓

Service

↓

Prisma
```

Not Allowed:

```
Controller

↓

Prisma
```

Not Allowed:

```
Gateway

↓

Database
```

Not Allowed:

```
Controller

↓

Another Controller
```

---

# Module Communication

Modules communicate through Services.

Example

```
TaskService

↓

ActivityService

↓

NotificationService
```

Avoid circular dependencies.

If necessary, use forwardRef() carefully.

---

# Event-Driven Design

Business modules should emit events instead of tightly coupling integrations.

Examples

```
task.created

task.updated

task.deleted

task.assigned

workspace.created

project.created

comment.created
```

Future integrations should subscribe to events.

---

# Shared Components

Shared functionality belongs in the Common module.

Examples

```
Decorators

Guards

Interceptors

Filters

Pipes

Exceptions

Enums

Constants

Utilities

Response Helpers

Pagination Helpers
```

Avoid duplicate implementations.

---

# Database Design Principles

- UUID primary keys
- Proper foreign keys
- Normalized schema
- Explicit relations
- Indexed foreign keys
- Transactions for multi-step operations
- Soft delete where applicable

Never use raw SQL unless necessary.

---

# Error Handling

All errors should use NestJS exceptions.

Errors should be meaningful and consistent.

Global exception filter should format responses.

---

# Validation

Every request must pass through DTO validation.

Validation belongs before business logic.

Never manually validate request bodies.

---

# Logging

Use NestJS Logger.

Log:

- Errors
- Warnings
- Important business actions

Never log passwords, tokens, or sensitive data.

---

# Security

Always apply:

- JWT Authentication
- Role-Based Access Control (RBAC)
- Helmet
- Rate Limiting
- Input Validation
- CORS
- Environment Variables

Never expose sensitive information.

---

# Performance Strategy

Always consider:

- Pagination
- Indexed queries
- Efficient Prisma select
- Transactions
- Batch operations
- Lazy loading
- Query optimization

Avoid unnecessary database calls.

---

# Scalability Strategy

The architecture should support future migration to:

- Redis
- BullMQ
- Read Replicas
- Elasticsearch
- AWS S3
- Cloudinary
- Microservices
- Event Bus
- Message Queues

Current implementation should not prevent future scaling.

---

# Module Ownership

Each module owns its own:

- Routes
- DTOs
- Business Logic
- Validation
- Database Access
- Events

Never place another module's logic inside it.

---

# Code Ownership Rule

Before adding new code:

1. Inspect related modules.
2. Reuse existing services.
3. Reuse DTOs.
4. Reuse enums.
5. Reuse decorators.
6. Reuse guards.
7. Reuse helpers.
8. Preserve naming conventions.
9. Maintain backward compatibility.

---

# AI Agent Responsibilities

The AI agent should behave like a senior backend engineer.

Before implementing any feature:

- Understand the current architecture.
- Read the relevant modules.
- Follow existing patterns.
- Reuse existing components.
- Keep controllers thin.
- Keep business logic inside services.
- Avoid duplicate implementations.
- Preserve API compatibility.
- Suggest improvements instead of performing large refactors automatically.

Every new implementation should feel like it was written by the original project author.
