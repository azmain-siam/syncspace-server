# Server Boilerplate

A NestJS-based server boilerplate with TypeScript, Prisma PostgreSQL integration, JWT auth, email support, global validation, custom response formatting, and Swagger documentation.

## Key Features

- NestJS v11 + TypeScript
- Prisma ORM with PostgreSQL adapter (`@prisma/adapter-pg`)
- JWT-based authentication with access and refresh tokens
- Password hashing via `bcrypt`
- Email delivery using `@nestjs-modules/mailer` + SMTP transport
- Global validation pipe with `class-validator` / `class-transformer`
- Custom HTTP exception filter and response interceptor
- Logging with `nestjs-pino` and `pino-pretty`
- Rate limiting using `@nestjs/throttler`
- API documentation via Swagger at `/docs`
- API base prefix: `/api/v1`

## Project Structure

- `src/main.ts` - bootstrap, global pipes, filters, interceptors, Swagger setup
- `src/app.module.ts` - root module with config, Prisma, logging, throttling, and mailer
- `src/database/prisma` - Prisma client module and service
- `src/module/auth` - login, refresh token, and logout endpoints
- `src/module/user` - user creation and listing endpoints
- `src/module/email` - email service wrapper
- `src/common` - shared filters, interceptors, and decorators
- `src/config` - environment config, validation schema, Swagger options

## Environment Variables

This project relies on environment variables for configuration. Create a `.env` file or set the following values in your environment:

```env
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
```

> `EMAIL_USER` and `EMAIL_PASS` are used by the built-in email transport.

## Local Setup

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate dev --name init
pnpm start:dev
```

## Available Scripts

- `pnpm build` - compile TypeScript via Nest
- `pnpm start` - run the Nest application
- `pnpm start:dev` - run Nest in watch mode
- `pnpm start:prod` - run compiled production build
- `pnpm prisma:generate` - generate Prisma client
- `pnpm prisma:migrate` - apply Prisma migrations
- `pnpm prisma:studio` - open Prisma Studio
- `pnpm lint` - run ESLint and apply fixes
- `pnpm format` - run Prettier formatter
- `pnpm test` - run Jest tests
- `pnpm test:watch` - run tests in watch mode
- `pnpm test:cov` - run test coverage
- `pnpm test:e2e` - run end-to-end tests

## API Endpoints

Base URL: `http://localhost:<PORT>/api/v1`

### Auth

- `POST /auth/login`
  - body: `{ "email": string, "password": string }`
  - returns access and refresh tokens
- `POST /auth/refresh`
  - body: `{ "refreshToken": string }`
  - returns new access and refresh tokens
- `POST /auth/logout`
  - body: `{ "userId": string }`
  - clears the stored refresh token for the user

### User

- `GET /user` - returns a list of users (default implementation returns an empty array)
- `POST /user` - creates a new user
  - body: `{ "email": string, "password": string }`

## Swagger Docs

Swagger UI is available at:

```text
http://localhost:<PORT>/docs
```

## Notes

- Global validation is enabled with `ValidationPipe` to strip unknown fields and automatically transform incoming payloads.
- Responses are normalized with a shared response interceptor.
- Requests are protected by a global throttling guard using `@nestjs/throttler`.
- Prisma connects to PostgreSQL via the `DATABASE_URL` environment variable.
- The app uses `helmet` and CORS with `http://localhost:3000` allowed by default.

## License

This repository is privately configured as `UNLICENSED`.
