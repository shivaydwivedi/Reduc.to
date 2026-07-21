# Reduc.to

Reduc.to is a planned URL shortening and privacy-aware analytics platform. This branch establishes the PostgreSQL database foundation; authentication, URL shortening, public redirects, link management, analytics behavior, the frontend dashboard, and deployment are not implemented yet.

## Current Status

Current phase: Phase 4, Database Foundation.

This phase adds Prisma configuration, the approved PostgreSQL schema, an initial migration SQL file, generated Prisma Client code, application-generated UUID v7 IDs, and schema-focused tests that do not require Docker.

## First-Release Direction

The first release is planned to support registered users who create and manage short links, visitors who open short links, and privacy-aware analytics for link owners. Anonymous link creation and administrator functionality are excluded from the first release.

## Planned Technology Stack

- Monorepo with npm workspaces
- TypeScript
- Fastify API in a later phase
- React and Vite frontend in a later phase
- PostgreSQL with Prisma
- Redis for caching and rate-limiting support in a later phase
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

Docker is not currently installed on the owner's machine. PostgreSQL and Redis are defined for local development, but the Phase 4 migration has not been applied to a live local PostgreSQL database.

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

The test suite exercises readiness with fake dependencies; it does not require Docker.

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
