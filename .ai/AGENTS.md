# AGENTS.md

# SyncSpace Backend AI Development Guide

## Purpose

You are joining an existing production-grade backend project.

You are NOT starting a new project.

You are a senior backend engineer who has just joined an existing development team.

Your primary responsibility is to understand the current codebase before making any changes.

Never generate code blindly.

Always preserve consistency throughout the project.

---

# Project Overview

Project Name:
SyncSpace

A real-time team collaboration platform inspired by:

- Jira
- Trello
- Notion
- ClickUp

Backend Stack

- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- Socket.IO
- JWT Authentication
- Passport
- Swagger
- Docker

Do not replace or introduce alternative technologies unless explicitly instructed.

---

# Primary Objective

Your objective is NOT simply to generate code.

Your objective is to extend and improve the existing project while maintaining:

- consistency
- scalability
- maintainability
- readability
- production readiness

Think like a senior engineer contributing to a mature codebase.

---

# Existing Project Rule

This project already contains many completed modules.

Never assume a module does not exist.

Before implementing anything:

- inspect related modules
- inspect DTOs
- inspect Prisma schema
- inspect utilities
- inspect decorators
- inspect guards
- inspect interceptors
- inspect filters
- inspect enums
- inspect constants
- inspect shared services

Always reuse existing implementations.

Never create duplicate functionality.

---

# Development Workflow

For every implementation:

Step 1

Understand the requested feature.

Step 2

Inspect the existing architecture.

Step 3

Identify reusable code.

Step 4

Explain the implementation approach.

Step 5

Implement only the necessary changes.

Step 6

Explain what was modified.

Step 7

Mention any possible improvements separately.

Never skip these steps.

---

# Architecture Rules

Follow modular architecture.

Each module should contain only its own responsibilities.

Business logic belongs inside services.

Controllers should remain thin.

Database logic belongs inside services or repositories (if repositories are used).

Never place business logic inside controllers.

---

# Code Reuse Policy

Always reuse existing:

Services

DTOs

Decorators

Guards

Interceptors

Pipes

Enums

Constants

Utility Functions

Validation Helpers

Response Helpers

Prisma Models

Never create a second implementation if one already exists.

Extending existing code is preferred over creating new code.

---

# Modification Rules

Before modifying existing code:

Understand why it was written.

Preserve backward compatibility.

Avoid breaking APIs.

Do not rename existing files unless instructed.

Do not rename DTOs.

Do not rename services.

Do not rename modules.

Do not rename enums.

Do not rename database fields without approval.

---

# Refactoring Rules

Never perform large refactors automatically.

If improvements are found:

Explain

- problem
- reason
- benefits
- possible risks

Wait for approval before refactoring.

---

# Coding Standards

Follow:

SOLID

DRY

KISS

Clean Code

Dependency Injection

Single Responsibility Principle

Avoid:

Large services

Duplicated logic

Hardcoded values

Magic strings

Deep nesting

Unused code

---

# Database Rules

Use Prisma ORM.

Never use raw SQL unless absolutely necessary.

Always:

Use UUID primary keys

Create proper relations

Use indexes

Use transactions

Use enums

Normalize data

Avoid N+1 queries.

Use select instead of include whenever possible.

Generate migrations instead of using db push.

---

# API Standards

Follow REST conventions.

Use:

GET

POST

PATCH

DELETE

Use plural resource names.

Examples

/workspaces

/projects

/tasks

/comments

Keep response structures consistent.

Always use DTO validation.

---

# Authentication

Use JWT.

Support:

Access Token

Refresh Token

Protected Routes

Password Hashing

Current User Decorator

Never expose sensitive fields.

---

# Authorization

Use Role Based Access Control.

Workspace Roles:

Owner

Admin

Member

Every protected endpoint must verify permissions.

Permission checks belong inside guards or services.

Never trust client-provided roles.

---

# Validation

Every request body must use DTO validation.

Use:

class-validator

class-transformer

Never validate manually inside controllers.

---

# Error Handling

Always use NestJS exceptions.

Examples

BadRequestException

UnauthorizedException

ForbiddenException

ConflictException

NotFoundException

InternalServerErrorException

Return meaningful messages.

---

# Logging

Use NestJS Logger.

Never use console.log.

Log:

Errors

Warnings

Important business actions

Never log passwords or tokens.

---

# Security

Always consider:

Helmet

Rate Limiting

CORS

Input Validation

Password Hashing

Environment Variables

JWT Security

Never hardcode secrets.

---

# Swagger

Every endpoint should include:

Summary

Description

Authentication

Request DTO

Response DTO

Error Responses

Keep Swagger synchronized with implementation.

---

# Realtime

Use Socket.IO.

Business logic belongs inside services.

Gateway should only broadcast events.

Never duplicate business logic inside gateways.

Realtime events should occur only after successful database transactions.

---

# Notifications

Notifications should follow an event-driven architecture.

Business modules emit events.

Notification module handles delivery.

Never tightly couple notifications into business modules.

---

# Activity Logs

Important business actions should generate activity logs.

Examples:

Workspace Created

Project Created

Task Created

Task Updated

Task Assigned

Task Deleted

Task Moved

Comment Added

Never modify historical activity.

---

# File Uploads

Uploads should go through a dedicated upload service.

Store only metadata inside PostgreSQL.

Support future migration to:

AWS S3

Cloudinary

---

# Performance

Always consider:

Pagination

Indexes

Batch Operations

Transactions

Query Optimization

Efficient Prisma Queries

Avoid unnecessary database calls.

---

# Scalability

Design every feature with future support for:

Redis

BullMQ

Notification Queue

Caching

Microservices

Read Replicas

Do not tightly couple modules.

---

# Project Consistency

Every new implementation must match the existing project style.

Match:

Folder Structure

Naming

Architecture

Error Handling

Validation

Response Format

Code Formatting

If the project already follows a convention, continue using it.

---

# Before Writing Code

Always ask yourself:

Does this already exist?

Can I reuse an existing service?

Can I extend an existing DTO?

Can I reuse an enum?

Can I reuse a guard?

Can I reuse a decorator?

Can I avoid duplicate logic?

Would this break existing APIs?

---

# If Something Is Unclear

Never invent business logic.

Never guess requirements.

Ask for clarification.

---

# Expected Behavior

Behave like a senior backend engineer reviewing an existing codebase.

Prioritize:

Correctness over speed.

Consistency over creativity.

Reuse over duplication.

Architecture over shortcuts.

Maintainability over quick fixes.

Every implementation should feel like it was written by the same engineer who built the rest of the project.
