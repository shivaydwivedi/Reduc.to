# Reduc.to

Reduc.to is a deployable MVP for registered-user URL shortening with privacy-aware basic click tracking. The Phase 6 branch includes the Fastify API, React/Vite frontend, PostgreSQL persistence, cookie authentication, link management, public redirects, and production-oriented build scripts.

## Current Status

Current phase: Phase 6, Frontend Integration and Deployment Preparation.

Implemented MVP features:

- Register, log in, refresh access sessions, and log out with HTTP-only cookies.
- Protected React dashboard with current account details.
- Create short links with generated keys or optional custom aliases.
- List owned links, copy short URLs, edit destination/title/expiry, enable, disable, and delete.
- Public `GET /:key` redirects with basic click-event writes.
- Total click counts on link responses.

Not implemented: Redis redirect caching, advanced analytics, charts, daily aggregation, password reset, email verification, admin features, teams, billing, custom domains, QR codes, CI/CD, social login, and account deletion.

## Architecture

```text
Browser
  -> React frontend
  -> Fastify API
  -> PostgreSQL
```

Redis infrastructure remains in the repository, but Redis is optional for the MVP runtime. Redirect caching and rate limiting are deferred.

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
- Docker with Docker Compose v2 when running local PostgreSQL

Docker is not currently installed on the owner's machine, so live local PostgreSQL migration testing has not been performed in this workspace.

## Environment Setup

Install dependencies:

```bash
npm install
```

Create local environment files from examples. Do not commit real `.env` files.

Backend environment starts from:

```text
.env.example
```

Frontend environment starts from:

```text
apps/web/.env.example
```

Frontend variable:

```bash
VITE_API_BASE_URL=http://localhost:3000
```

Backend deployment variables:

- `NODE_ENV`
- `PORT` or `API_PORT`
- `DATABASE_URL`
- `REDIS_URL` optional
- `CORS_ORIGINS`
- `FRONTEND_URL`
- `PUBLIC_BASE_URL`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `ACCESS_TOKEN_TTL_MINUTES`
- `REFRESH_TOKEN_TTL_DAYS`
- `COOKIE_SECURE`
- `COOKIE_SAME_SITE`
- `COOKIE_DOMAIN` optional

For cross-site deployments such as Vercel frontend plus Render API, use `COOKIE_SAME_SITE=none` with `COOKIE_SECURE=true`, set `FRONTEND_URL` to the frontend origin, and include that origin in `CORS_ORIGINS`.

## Local Development

Start PostgreSQL locally when Docker is available:

```bash
docker compose up -d
```

Apply database migrations before running against PostgreSQL:

```bash
npm run prisma:migrate:deploy
```

Run the API:

```bash
npm run dev:api
```

Run the frontend:

```bash
npm run dev:web
```

The frontend uses cookie credentials and expects `VITE_API_BASE_URL` to point at the API origin.

## Production Build and Start

Generate Prisma Client:

```bash
npm run prisma:generate
```

Build everything:

```bash
npm run build
```

Build individually:

```bash
npm run build:api
npm run build:web
```

Apply migrations on the deployment database:

```bash
npm run prisma:migrate:deploy
```

Start the compiled API:

```bash
npm run start:api
```

The API start command runs compiled JavaScript from `apps/api/dist` and does not require `tsx` in production. Migrations are not run automatically by the application process.

## API Surface

Operational:

- `GET /health`
- `GET /ready`

Auth:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

Links:

- `POST /api/v1/links`
- `GET /api/v1/links`
- `GET /api/v1/links/:linkId`
- `PATCH /api/v1/links/:linkId`
- `POST /api/v1/links/:linkId/enable`
- `POST /api/v1/links/:linkId/disable`
- `DELETE /api/v1/links/:linkId`

Public redirect:

- `GET /:key`

## Quality Checks

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run check
npm run prisma:validate
npm run prisma:generate
```

`npm run check` runs format check, lint, typecheck, and tests.

## Known Limitations

- No live PostgreSQL migration was applied in this workspace.
- Redis caching is not implemented and Redis is optional for MVP startup.
- Click tracking is basic total-count tracking only.
- No advanced analytics, charts, daily aggregation, visitor hashing, or queues.
- No frontend deployment, backend deployment, CI, or Docker deployment automation has been performed.

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

## License

Reduc.to is licensed under the MIT License. See [LICENSE](LICENSE).
