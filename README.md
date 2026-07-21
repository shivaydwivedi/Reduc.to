# Reduc.to

Reduc.to is a URL shortening and privacy-aware analytics platform. This branch implements the Phase 5 backend MVP: cookie-based authentication, registered-user link management, public redirects, and basic click-count tracking.

## Current Status

Current phase: Phase 5, Core Backend MVP.

This phase adds deployable Fastify API behavior on top of the existing Prisma/PostgreSQL foundation. The frontend dashboard, Redis redirect caching, advanced analytics, daily aggregation jobs, administrator features, billing, teams, custom domains, and email flows are not implemented.

## First-Release Direction

The first release is planned to support registered users who create and manage short links, visitors who open short links, and privacy-aware analytics for link owners. Anonymous link creation and administrator functionality are excluded from the first release.

## Planned Technology Stack

- Monorepo with npm workspaces
- TypeScript
- Fastify API
- React and Vite frontend in a later phase
- PostgreSQL with Prisma
- Redis for health checks now; redirect caching and rate-limiting support remain deferred
- ESLint and Prettier for foundation quality checks
- Docker Compose for local PostgreSQL and Redis

## Repository Structure

```text
.
|-- .github/
|   |-- ISSUE_TEMPLATE/
|   `-- pull_request_template.md
|-- apps/
|   |-- api/
|   `-- web/
|-- docs/
|-- packages/
|   `-- shared/
|-- docker-compose.yml
|-- eslint.config.js
|-- package.json
`-- tsconfig.base.json
```

## Local Prerequisites

- Node.js 22.11.0 or newer
- npm 10.9.0 or newer
- Docker with Docker Compose v2

Docker is not currently installed on the owner's machine. PostgreSQL and Redis are defined for local development, but the Prisma migration has not been applied to a live local PostgreSQL database in this workspace.

## Foundation Setup

Install dependencies:

```bash
npm install
```

Start local PostgreSQL and Redis:

```bash
docker compose up -d
```

Create a local `.env` from `.env.example` only when running the API locally. Do not commit `.env`.

Before running the API against PostgreSQL, apply the Prisma migration to the target database:

```bash
npm run prisma:migrate:deploy
```

Run the API in development mode:

```bash
npm run dev:api
```

Run API tests:

```bash
npm run test:api
```

The API exposes:

- `GET /health`: process liveness only.
- `GET /ready`: dependency readiness using PostgreSQL and Redis checks.
- `POST /api/v1/auth/register`: register a user and create a cookie session.
- `POST /api/v1/auth/login`: authenticate and create a cookie session.
- `POST /api/v1/auth/refresh`: rotate the refresh token and issue a new access token.
- `POST /api/v1/auth/logout`: idempotently revoke the current session and clear cookies.
- `GET /api/v1/auth/me`: return the current authenticated user.
- `POST /api/v1/links`: create a short link with an optional immutable alias.
- `GET /api/v1/links`: list the current user's links with total click counts.
- `GET /api/v1/links/:linkId`: get one owned link.
- `PATCH /api/v1/links/:linkId`: update destination URL, title, or expiry.
- `POST /api/v1/links/:linkId/enable`: enable an owned link.
- `POST /api/v1/links/:linkId/disable`: disable an owned link.
- `DELETE /api/v1/links/:linkId`: soft delete an owned link.
- `GET /:key`: redirect a public short key using 302 by default, or 301 for permanent links stored in the database.

The test suite exercises the backend MVP with fake Prisma boundaries; it does not require Docker or live PostgreSQL.

Authentication uses short-lived JWT access cookies and rotating refresh cookies. Cookies are `HttpOnly`, `Secure` in production by default, and configurable with `COOKIE_SAME_SITE=lax` or `COOKIE_SAME_SITE=none`; `none` requires `COOKIE_SECURE=true` for cross-site deployments. Unsafe methods with an `Origin` header are rejected unless the origin matches configured CORS/frontend origins.

Link creation and updates validate destination URLs without fetching them. The MVP allows `http` and `https`, rejects embedded credentials, localhost, loopback, and obvious private IPv4 ranges, and preserves paths, query strings, and fragments.

Redirects write one minimized click event per successful redirect where possible. Analytics are limited to total click counts returned with link responses; charts, daily aggregation, approximate uniques, visitor hashing, queues, workers, and Redis redirect caching are deferred.

Prisma schema location:

```text
apps/api/prisma/schema.prisma
```

Prisma commands that do not require a live PostgreSQL database:

```bash
npm run prisma:format
npm run prisma:validate
npm run prisma:generate
```

Prisma commands that require a live PostgreSQL database configured by `DATABASE_URL`:

```bash
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
```

The initial migration SQL is present for review but has not been applied locally because Docker/PostgreSQL is unavailable.

Stop local infrastructure:

```bash
docker compose down
```

Remove local infrastructure volumes when you intentionally want a fresh database and Redis store:

```bash
docker compose down -v
```

## Foundation Checks

Format files:

```bash
npm run format
```

Check formatting:

```bash
npm run format:check
```

Run ESLint:

```bash
npm run lint
```

Run TypeScript checks across workspaces:

```bash
npm run typecheck
```

Run all foundation checks:

```bash
npm run check
```

Validate Docker Compose configuration:

```bash
docker compose config
```

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
- [Agent instructions](AGENTS.md)

## Development Workflow

1. Read `AGENTS.md` and the relevant planning documents.
2. Confirm the current phase and approved task.
3. Keep changes focused.
4. Run the relevant checks.
5. Report commands and results accurately.
6. Do not commit, push, merge, or deploy without explicit approval.

## License

Reduc.to is licensed under the MIT License. See [LICENSE](LICENSE).
