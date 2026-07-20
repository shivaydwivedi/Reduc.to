# Product Scope

## First-Release Scope

The first release focuses on registered-user link creation, link management, browser redirects, privacy-aware analytics, and a polished dashboard. It excludes anonymous link creation and administrator functionality.

## Authentication Scope

Approved direction:

- Registered user registration.
- Login and logout.
- Current-user session behavior.
- Short-lived JWT access tokens.
- Rotating refresh tokens.
- Secure HTTP-only cookie delivery.
- Refresh-token storage as hashes in PostgreSQL in the eventual implementation.
- Session revocation support.

Deferred details include exact cookie names, CSRF implementation, token claims, revocation schema, and route design.

## Link-Creation Scope

Registered users may create links with generated short codes or custom aliases.

Generated codes are planned as 7-character Base62 values using:

`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`

Generated codes are case-sensitive, must use cryptographically secure randomness in implementation, must be unique at the PostgreSQL level, and must use bounded collision retries.

Custom aliases are case-insensitive and normalized to lowercase. They must be 3 to 40 characters, use lowercase letters, digits, hyphens, and underscores, begin and end with a letter or digit, trim leading and trailing whitespace before validation, avoid reserved aliases, and remain immutable after creation in the first release.

## Link-Management Scope

Registered users should be able to manage only their own links. First-release management includes listing, viewing, editing destination URL or metadata, editing expiration, enabling and disabling, soft deleting, searching, filtering, sorting, and pagination.

Exact API shapes, database schema, and frontend component design are deferred.

## Redirect Scope

The default redirect status is HTTP 302. Per-link 301 or 302 selection may be supported in the eventual first release, subject to implementation planning. The initial product is designed primarily for browser GET navigation.

Redirect behavior must account for valid, missing, disabled, expired, and deleted links.

## Analytics Scope

Analytics should include total clicks, approximate unique visitors, clicks over time, referrers, browsers, operating systems, device types, recent activity, and date-range filtering where approved by architecture.

Analytics must not unnecessarily delay redirects. Expensive aggregation must not occur inside the critical redirect path. The first implementation must not introduce Kafka, RabbitMQ, BullMQ, or another queue.

Country-level analytics and geolocation are excluded from the first functional release.

## Frontend Scope

The frontend is planned as a React and Vite dashboard with registration, login, protected routes, link creation, link management, link detail, analytics views, responsive design, accessible controls, and loading, error, empty, and success states.

Frontend implementation is not part of Phase 0.

## Engineering-Quality Scope

The project should include unit tests, integration tests, frontend component tests, important end-to-end smoke tests, type checking, linting, formatting, Docker-based development, CI, environment validation, structured logging, health/readiness endpoints, API documentation, architecture documentation, and security documentation.

These items should be introduced in approved phases, not all at once.

## Explicit Exclusions

The first release excludes:

- Anonymous link creation.
- Administrator functionality.
- Billing and paid subscriptions.
- Team workspaces.
- Enterprise accounts.
- Branded custom domains.
- Browser extensions.
- Native mobile applications.
- Social login.
- Enterprise SSO.
- Complex webhook systems.
- Large administrator portals.
- Machine-learning features.
- Advertising systems.
- Third-party geolocation calls during redirects.

## Future Possibilities

Future work may include custom domains, team workspaces, billing, exports, durable event queues, richer aggregation, country-level analytics, and administrator tools. These must not delay or expand the approved first release unless explicitly approved.

## Scope-Control Rules

- Do not present future possibilities as committed first-release work.
- Do not implement later-phase work early.
- Do not add dependencies, services, or folders without approval.
- Resolve security-sensitive decisions before implementation.
- Keep each task limited to its approved acceptance criteria.

## Phase Boundaries

Phase 0 creates planning and decision documents. Later phases will cover repository foundation, architecture and database design, backend foundation, authentication, redirects, link management, Redis, analytics, frontend work, hardening, deployment, and portfolio preparation.

Each phase requires approval before the next begins.

## Release Acceptance Criteria

The first release is acceptable only when approved scope works end to end, important failure cases are handled, security and privacy expectations are met, tests and checks pass, documentation matches implementation, and unresolved limitations are clearly reported.
