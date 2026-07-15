# Project: SyncSpace API

SyncSpace API is the NestJS backend for the SyncSpace real-time team collaboration platform.

## Project Overview

The backend facilitates user authentication, workspace management, and project organization with robust role-based access control (RBAC).

- **Technologies:** NestJS 11, TypeScript, Prisma ORM, PostgreSQL, Passport JWT, Swagger.
- **Architecture:** Modular NestJS structure, utilizing shared modules in `src/common/` for cross-cutting concerns (guards, decorators, filters, interceptors).
- **Persistence:** Prisma-backed PostgreSQL with migrations.
- **API:** RESTful API with a global prefix of `/api/v1` and auto-generated Swagger documentation.

## Building and Running

Ensure you have a `.env` file configured (see `.env.example`).

| Command | Description |
| :--- | :--- |
| `pnpm install` | Install project dependencies. |
| `pnpm prisma:generate` | Generate Prisma client. |
| `pnpm prisma:migrate` | Apply pending database migrations. |
| `pnpm start:dev` | Start the development server with watch mode. |
| `pnpm build` | Build the application for production. |
| `pnpm start` | Start the production build. |
| `pnpm test` | Run unit tests. |
| `pnpm test:e2e` | Run end-to-end tests. |
| `pnpm lint` | Run ESLint. |
| `pnpm typecheck` | Run TypeScript type checking. |

## Development Conventions

- **Module Structure:** Follows the standard NestJS modular architecture.
- **Code Style:** Enforced by ESLint and Prettier (`pnpm format` and `pnpm lint` scripts available). Pre-commit hooks via Husky/lint-staged.
- **Testing:** Unit tests reside next to source files (`*.spec.ts`). E2E tests are located in the `test/` directory.
- **Validation:** Uses `class-validator` and `class-transformer` globally for request data validation.
- **Security:** Helmet headers enabled, JWT-based authentication, and rate limiting via `@nestjs/throttler`.
- **API Responses:** Normalized using a global interceptor.

## Key Directories

- `src/module/`: Contains feature modules (auth, email, project, user, workspace).
- `src/common/`: Shared utilities, decorators, guards, and base classes.
- `prisma/`: Database schema and migration files.
- `test/`: E2E test configuration and suites.
