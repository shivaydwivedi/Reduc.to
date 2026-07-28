# Reduc.to

> **A production-deployed full-stack URL-shortening platform built with React, Fastify, Prisma, and PostgreSQL.**

Reduc.to is a TypeScript npm-workspaces monorepo for registered-user URL shortening, secure cookie-based authentication, link management, public redirects, and privacy-aware click tracking. The project is designed to be read by recruiters and engineers as a complete full-stack portfolio system: it includes a deployed frontend and API, database migrations, architecture documentation, security notes, and automated tests across the API and web app.

![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=222)
![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-database-4169e1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2d3748?logo=prisma&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.12-5fa04e?logo=node.js&logoColor=white)
![Tests](https://img.shields.io/badge/tests-94%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

**Live Links:** 
| Resource | URL |
| --- | --- |
| Live Application | https://reduc-to-web.vercel.app|
| API | https://reduc-to.onrender.com |
| Health Check | https://reduc-to.onrender.com/health |
| Readiness | https://reduc-to.onrender.com/ready |
| Repository| https://github.com/shivaydwivedi/Reduc.to |

## Project Preview

Screenshots are planned for `docs/screenshots/` so the README can stay stable as the UI evolves.

## Screenshot files still to add:

 - `docs/screenshots/dashboard.png`
 - `docs/screenshots/create-link.png`
 - `docs/screenshots/edit-link.png`

## Overview

Reduc.to lets registered users create and manage short links from a web dashboard. Visitors open public short URLs and are redirected by the Fastify API while the system records minimized click events for total-click reporting.

The project is more than basic CRUD. It includes cookie-based authentication with short-lived JWT access tokens, rotating refresh-token sessions, hashed refresh-token persistence, ownership-scoped link management, generated and custom aliases in a shared namespace, soft deletion, link expiry, redirect status choices, operational health checks, and a documented PostgreSQL schema.

The engineering goal is to demonstrate production-minded full-stack work: explicit architecture, strong validation boundaries, secure session handling, clean TypeScript, testability through dependency injection and fake dependencies, and realistic deployment trade-offs.

## Key Features

- User registration, login, session refresh, logout, and current-user lookup.
- Short-lived JWT access tokens delivered through HTTP-only cookies.
- Rotating refresh-token sessions with server-side hashed refresh tokens.
- Refresh-token reuse detection that revokes the session family.
- Link creation with generated short keys.
- Optional custom aliases normalized into a shared lookup namespace.
- Owned-link listing and detail lookup.
- Link editing for destination URL, title, and expiry.
- Enable, disable, and soft-delete workflows for owned links.
- Optional link expiry with clear validation for invalid or past expiry values.
- Public redirects with `302` by default and `301` support through the link model.
- Basic click tracking and total-click counts on link responses.
- React dashboard for account and link management.
- Fastify request validation with Zod.
- Health and readiness endpoints.
- Optional Redis connectivity/readiness integration; redirect caching and rate limiting are planned, not currently implemented.

## Engineering Highlights

- **TypeScript monorepo:** npm workspaces separate the API, frontend, and shared package.
- **Layered Fastify API:** app construction, route modules, services, infrastructure clients, and shared error/security utilities are separated.
- **Prisma/PostgreSQL model:** UUID primary keys, explicit indexes, foreign keys, soft deletion, and check constraints are captured in SQL migrations.
- **UUID strategy:** UUID v7 IDs are generated in application code for sortable identifiers.
- **Authentication design:** JWT access tokens plus refresh sessions and per-token persistence.
- **Refresh-token rotation:** each refresh consumes the presented token and creates a replacement in a transaction; replay revokes the session family.
- **Cookie security:** auth cookies are HTTP-only, path-scoped, and configurable for `Secure`, `SameSite`, and domain behavior.
- **Origin and CORS protection:** unsafe methods are checked against configured frontend/CORS origins.
- **URL safety validation:** destinations are limited to HTTP/HTTPS and reject unsafe patterns such as embedded credentials, localhost, loopback, and obvious private IPv4/link-local ranges.
- **Consistent error envelopes:** application errors return stable codes, messages, and request IDs.
- **Operational readiness:** `/health` reports liveness; `/ready` checks dependency readiness.
- **Graceful shutdown:** server bootstrap closes Fastify, Redis, and PostgreSQL in order with a timeout.
- **Testability:** API tests use fake dependencies and fake Prisma-style clients to exercise behavior without external services.

## Architecture

```mermaid
flowchart LR
  Visitor["Visitor browser"] --> Redirect["GET /:key"]
  User["Registered user browser"] --> Web["React/Vite web app"]
  Web --> API["Fastify API /api/v1"]
  Redirect --> API
  API --> Postgres["PostgreSQL / Neon"]
  API -. optional readiness client .-> Redis["Redis"]
```

Redirect request flow:

1. A visitor opens `/:key`.
2. The API canonicalizes the key to the stored lowercase lookup key.
3. The API reads the link from PostgreSQL.
4. Missing, disabled, deleted, or expired links return a safe error envelope.
5. Valid links redirect with `302` or `301`.
6. A minimized click event is recorded; click-tracking failures are logged and do not block the redirect.

Architecture docs:

- [Technical decisions](docs/architecture/00-technical-decisions.md)
- [System overview](docs/architecture/01-system-overview.md)
- [Backend architecture](docs/architecture/02-backend-architecture.md)
- [Authentication and session design](docs/architecture/03-authentication-and-session-design.md)
- [Redirect and cache design](docs/architecture/04-redirect-and-cache-design.md)
- [Analytics architecture](docs/architecture/05-analytics-architecture.md)

## Authentication Flow

```mermaid
sequenceDiagram
  participant Browser
  participant Web as React Web App
  participant API as Fastify API
  participant DB as PostgreSQL

  Browser->>Web: Submit register/login form
  Web->>API: POST /api/v1/auth/register or /login
  API->>DB: Create or verify user
  API->>DB: Create RefreshSession and hashed RefreshToken
  API-->>Browser: Set HTTP-only access and refresh cookies
  Browser->>API: Protected request with access cookie
  API-->>Browser: Protected JSON response
  Browser->>API: POST /api/v1/auth/refresh with refresh cookie
  API->>DB: Mark old refresh token consumed
  API->>DB: Store hashed replacement token
  API-->>Browser: Set replacement cookies
  Browser->>API: POST /api/v1/auth/logout
  API->>DB: Revoke current refresh session when available
  API-->>Browser: Clear auth cookies
```

## Database Design

The Prisma schema defines six persisted models:

| Model                | Purpose                                                                                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`               | Registered account, normalized email, display email/name, role, timestamps.                                                                                           |
| `Link`               | User-owned short link with display key, canonical lookup key, destination, title, active flag, optional expiry, redirect type, timestamps, and soft-delete timestamp. |
| `RefreshSession`     | Browser session family with expiry and revocation metadata.                                                                                                           |
| `RefreshToken`       | Hashed issued refresh token with consumed/revoked timestamps and replacement self-reference.                                                                          |
| `ClickEvent`         | Minimized redirect event metadata for total-click tracking and future analytics.                                                                                      |
| `DailyLinkStatistic` | Persisted schema foundation for daily aggregate statistics with a unique `(linkId, date)` constraint; aggregation jobs are not implemented.                           |

Verified constraints and indexes include unique user email, unique `Link.lookupKey`, unique refresh-token hash, unique refresh-token replacement pointer, unique daily statistics per link/date, owner-dashboard indexes on links, expiry indexes for links and sessions/tokens, click-event lookup indexes, foreign keys, and SQL check constraints for non-empty keys and timestamp ordering.

See [data model](docs/database/00-data-model.md), [constraints and indexes](docs/database/01-constraints-and-indexes.md), and [data lifecycle](docs/database/02-data-lifecycle-and-retention.md).

## API Overview

| Method   | Endpoint                        | Auth             | Purpose                                                  |
| -------- | ------------------------------- | ---------------- | -------------------------------------------------------- |
| `GET`    | `/health`                       | No               | Liveness check.                                          |
| `GET`    | `/ready`                        | No               | PostgreSQL and optional Redis readiness check.           |
| `POST`   | `/api/v1/auth/register`         | No               | Create user and set auth cookies.                        |
| `POST`   | `/api/v1/auth/login`            | No               | Verify credentials and set auth cookies.                 |
| `POST`   | `/api/v1/auth/refresh`          | Refresh cookie   | Rotate refresh token and set replacement cookies.        |
| `POST`   | `/api/v1/auth/logout`           | Optional session | Revoke current session when available and clear cookies. |
| `GET`    | `/api/v1/auth/me`               | Access cookie    | Return the current user.                                 |
| `POST`   | `/api/v1/links`                 | Required         | Create a generated or custom-alias link.                 |
| `GET`    | `/api/v1/links`                 | Required         | List owned links.                                        |
| `GET`    | `/api/v1/links/:linkId`         | Required         | Get one owned link.                                      |
| `PATCH`  | `/api/v1/links/:linkId`         | Required         | Update destination, title, or expiry.                    |
| `POST`   | `/api/v1/links/:linkId/enable`  | Required         | Enable an owned link.                                    |
| `POST`   | `/api/v1/links/:linkId/disable` | Required         | Disable an owned link.                                   |
| `DELETE` | `/api/v1/links/:linkId`         | Required         | Soft-delete an owned link.                               |
| `GET`    | `/:key`                         | No               | Resolve a public short key and redirect.                 |

For deeper details, see [docs/api/01-endpoint-catalog.md](docs/api/01-endpoint-catalog.md). No Swagger/OpenAPI UI is currently implemented.

## Technology Stack

| Area                          | Tools                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| Frontend                      | React 19, Vite 8, TypeScript, browser `fetch`, Vitest with jsdom                                       |
| Backend                       | Node.js, Fastify 5, TypeScript, Zod, Pino/Fastify logging                                              |
| Database                      | PostgreSQL, Prisma 7, SQL migrations, Neon in production                                               |
| Authentication and security   | JWTs with `jose`, Argon2 password hashing, HTTP-only cookies, CORS allowlist, origin checks, Helmet    |
| Testing and quality           | Vitest, ESLint, Prettier, TypeScript checks, fake API/database dependencies                            |
| Infrastructure and deployment | npm workspaces, Docker Compose for local PostgreSQL/Redis, Render API, Vercel frontend, optional Redis |

## Repository Structure

```text
.
|-- apps/
|   |-- api/
|   |   |-- prisma/
|   |   |-- src/
|   |   `-- test/
|   `-- web/
|       |-- src/
|       `-- public/
|-- docs/
|   |-- api/
|   |-- architecture/
|   |-- database/
|   |-- planning/
|   |-- screenshots/
|   `-- security/
|-- packages/
|   `-- shared/
|-- docker-compose.yml
|-- package.json
|-- package-lock.json
|-- tsconfig.base.json
`-- README.md
```

## Local Development

Prerequisites:

- Node.js 22.12.0 or newer.
- npm 10.9.0 or newer.
- Docker with Docker Compose v2 for local PostgreSQL and Redis.

Clone and install:

```powershell
git clone https://github.com/shivaydwivedi/Reduc.to.git
cd Reduc.to
npm ci
```

Create environment files:

```powershell
Copy-Item .env.example .env
Copy-Item apps/web/.env.example apps/web/.env
```

Start local services:

```powershell
docker compose up -d
```

Prepare the database:

```powershell
npm run prisma:generate
npm run prisma:migrate:deploy
```

Start the API and frontend in separate terminals:

```powershell
npm run dev:api
```

```powershell
npm run dev:web
```

By default, the frontend expects `VITE_API_BASE_URL=http://127.0.0.1:3000`.

When using cookie authentication locally, keep the browser origin and API origin on the same host spelling. Do not mix `localhost` and `127.0.0.1`, because browsers treat them as different cookie origins.

## Environment Variables

| Variable                   | Required                   | Description                                                                                              | Safe local example                                                        |
| -------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `NODE_ENV`                 | Optional                   | Runtime environment.                                                                                     | `development`                                                             |
| `API_HOST`                 | Optional                   | API listen host.                                                                                         | `127.0.0.1`                                                               |
| `PORT` / `API_PORT`        | Optional                   | API listen port. `API_PORT` is supported by config.                                                      | `3000`                                                                    |
| `LOG_LEVEL`                | Optional                   | Fastify/Pino log level.                                                                                  | `debug`                                                                   |
| `DATABASE_URL`             | Required                   | PostgreSQL connection string. Use platform secret storage in production.                                 | `postgresql://reduc_to:reduc_to_dev_password@127.0.0.1:5432/reduc_to_dev` |
| `POSTGRES_DB`              | Local Docker               | Database name for Docker Compose.                                                                        | `reduc_to_dev`                                                            |
| `POSTGRES_USER`            | Local Docker               | PostgreSQL user for Docker Compose.                                                                      | `reduc_to`                                                                |
| `POSTGRES_PASSWORD`        | Local Docker               | Local-only PostgreSQL password.                                                                          | `reduc_to_dev_password`                                                   |
| `POSTGRES_PORT`            | Local Docker               | Host port for PostgreSQL.                                                                                | `5432`                                                                    |
| `REDIS_URL`                | Optional                   | Redis connection URL for optional connectivity/readiness integration only. Core MVP works without Redis. | `redis://127.0.0.1:6379`                                                  |
| `REDIS_PORT`               | Local Docker               | Host port for Redis.                                                                                     | `6379`                                                                    |
| `CORS_ORIGINS`             | Required for browser use   | Comma-separated allowed browser origins.                                                                 | `http://127.0.0.1:5173`                                                   |
| `FRONTEND_URL`             | Required for origin checks | Primary frontend origin for unsafe-method origin checks.                                                 | `http://127.0.0.1:5173`                                                   |
| `PUBLIC_BASE_URL`          | Required                   | Public base URL used to build short URLs.                                                                | `http://127.0.0.1:3000`                                                   |
| `ACCESS_TOKEN_SECRET`      | Required                   | JWT access-token signing secret. Use a long production secret.                                           | `replace-with-at-least-32-characters`                                     |
| `REFRESH_TOKEN_SECRET`     | Required                   | Refresh-token hashing/signing material. Use a different long production secret.                          | `replace-with-at-least-32-characters`                                     |
| `ACCESS_TOKEN_TTL_MINUTES` | Optional                   | Access-token lifetime.                                                                                   | `15`                                                                      |
| `REFRESH_TOKEN_TTL_DAYS`   | Optional                   | Refresh session/token lifetime.                                                                          | `7`                                                                       |
| `COOKIE_SECURE`            | Optional                   | Set `true` for HTTPS deployments.                                                                        | `false` locally                                                           |
| `COOKIE_SAME_SITE`         | Optional                   | Cookie SameSite mode. Cross-site Vercel/Render deployments typically need `none` with secure cookies.    | `lax` locally                                                             |
| `COOKIE_DOMAIN`            | Optional                   | Cookie domain when needed by deployment topology.                                                        | omitted locally                                                           |
| `READINESS_TIMEOUT_MS`     | Optional                   | Per-dependency readiness timeout.                                                                        | `1000`                                                                    |
| `SHUTDOWN_TIMEOUT_MS`      | Optional                   | Graceful shutdown timeout.                                                                               | `10000`                                                                   |
| `VITE_API_BASE_URL`        | Frontend required          | Browser-facing API origin for the Vite app.                                                              | `http://127.0.0.1:3000`                                                   |

Never commit real `.env` files or production credentials.

## Scripts

| Script                          | Purpose                                          |
| ------------------------------- | ------------------------------------------------ |
| `npm run dev:api`               | Start the Fastify API in watch mode.             |
| `npm run dev:web`               | Start the Vite frontend dev server.              |
| `npm run build`                 | Build all workspaces that expose a build script. |
| `npm run build:api`             | Generate Prisma Client and build the API.        |
| `npm run build:web`             | Build the frontend for production.               |
| `npm run start:api`             | Start the compiled API from `apps/api/dist`.     |
| `npm run test`                  | Run workspace tests.                             |
| `npm run test:api`              | Run API tests.                                   |
| `npm run test:web`              | Run frontend tests.                              |
| `npm run typecheck`             | Run TypeScript checks for all workspaces.        |
| `npm run lint`                  | Run ESLint.                                      |
| `npm run format:check`          | Check Prettier formatting.                       |
| `npm run check`                 | Run formatting, linting, type checks, and tests. |
| `npm run prisma:generate`       | Generate Prisma Client for the API.              |
| `npm run prisma:migrate:deploy` | Apply Prisma migrations.                         |
| `npm run prisma:validate`       | Validate the Prisma schema.                      |

## Testing and Quality

Current automated test totals:

- API: 85 tests.
- Web: 9 tests.
- Total: 94 tests.

Quality gates:

```powershell
npm run check
npm run build
```

`npm run check` runs Prettier format checking, ESLint, TypeScript type checks, and all workspace tests. `npm run build` verifies production build output for the API and web app.

## Deployment

- Frontend: Vercel at [https://reduc-to-web.vercel.app](https://reduc-to-web.vercel.app).
- API: Render at [https://reduc-to.onrender.com](https://reduc-to.onrender.com).
- PostgreSQL: Neon.
- Redis: optional connectivity/readiness integration only; redirect caching and rate limiting are planned.
- Health: [https://reduc-to.onrender.com/health](https://reduc-to.onrender.com/health).
- Readiness: [https://reduc-to.onrender.com/ready](https://reduc-to.onrender.com/ready).

For split-origin deployment, configure `CORS_ORIGINS`, `FRONTEND_URL`, `PUBLIC_BASE_URL`, and cookie settings carefully. Cross-site cookie deployments generally require `COOKIE_SAME_SITE=none` and `COOKIE_SECURE=true`.

## Security

Verified safeguards include:

- Argon2 password hashing.
- HTTP-only access and refresh cookies.
- Configurable `Secure`, `SameSite`, path, and domain cookie attributes.
- Short-lived JWT access tokens.
- Server-side hashed refresh tokens.
- Refresh-token rotation and replay detection.
- Session-family revocation on detected refresh-token reuse.
- Origin checks for unsafe methods.
- CORS allowlist with credentials support.
- URL validation for short-link destinations.
- Zod request validation.
- Ownership checks for private link operations.
- Stable JSON error envelopes with request IDs.
- Generic internal-error responses that avoid leaking implementation details.
- Logging redaction for sensitive headers and URL/secret-like fields.
- No committed production secrets.

Security documentation:

- [Security and privacy principles](docs/security/00-security-and-privacy-principles.md)
- [API conventions](docs/api/00-api-conventions.md)
- [Error model](docs/api/02-error-model.md)

## Documentation

- [Product vision](docs/planning/00-product-vision.md)
- [Product scope](docs/planning/01-product-scope.md)
- [User flows](docs/planning/02-user-flows.md)
- [Definition of done](docs/planning/03-definition-of-done.md)
- [Technical decisions](docs/architecture/00-technical-decisions.md)
- [System overview](docs/architecture/01-system-overview.md)
- [Backend architecture](docs/architecture/02-backend-architecture.md)
- [Authentication and session design](docs/architecture/03-authentication-and-session-design.md)
- [Redirect and cache design](docs/architecture/04-redirect-and-cache-design.md)
- [Analytics architecture](docs/architecture/05-analytics-architecture.md)
- [Data model](docs/database/00-data-model.md)
- [Constraints and indexes](docs/database/01-constraints-and-indexes.md)
- [Data lifecycle and retention](docs/database/02-data-lifecycle-and-retention.md)
- [API conventions](docs/api/00-api-conventions.md)
- [Endpoint catalog](docs/api/01-endpoint-catalog.md)
- [Error model](docs/api/02-error-model.md)
- [Security and privacy principles](docs/security/00-security-and-privacy-principles.md)

## Roadmap

Implemented:

- React/Vite dashboard.
- Registration, login, refresh, logout, and current-user session checks.
- HTTP-only cookie authentication.
- Rotating hashed refresh-token sessions.
- Link creation, editing, enable/disable, soft deletion, and expiry.
- Generated keys and custom aliases in a shared namespace.
- Public redirects with click-event writes.
- Total-click counts on link responses.
- Health and readiness endpoints.
- Prisma/PostgreSQL schema and migrations.
- API and frontend test coverage.
- Production deployment on Vercel, Render, and Neon.

Planned:

- Advanced analytics dashboard.
- Redis-backed redirect caching.
- Rate limiting.
- OpenAPI/Swagger documentation.
- CI workflow.
- Custom domains.
- Team/workspace support.
- Additional observability.
- Retention cleanup jobs for old click/session data.

## Author

Shivay Dwivedi

GitHub: [https://github.com/shivaydwivedi](https://github.com/shivaydwivedi)

## License

Reduc.to is licensed under the MIT License. See [LICENSE](LICENSE).
