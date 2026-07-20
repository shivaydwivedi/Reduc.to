# Technical Decisions

This document records approved Phase 0 decisions. Details not explicitly approved here remain deferred to later architecture or implementation phases.

## Monorepo Direction

Status: Approved.

Context: Reduc.to will include an API, web dashboard, shared TypeScript code, documentation, tests, and operational configuration.

Approved choice: Use a monorepo.

Reasoning: A monorepo keeps related application, shared, and documentation changes together.

Consequences: Workspace configuration must be kept understandable and should not introduce unnecessary packages early.

Risks: Premature shared packages can add complexity before clear reuse exists.

Phase 1 update: The initial workspace structure is `apps/api`, `apps/web`, and `packages/shared`, with shared root tooling and documentation. No `packages/config` workspace exists because there is no current need.

Deferred: Application-specific folder structure inside each workspace.

## npm Workspaces

Status: Approved.

Context: The project needs a package manager for a TypeScript monorepo.

Approved choice: Use npm workspaces.

Reasoning: npm is familiar, broadly available, and sufficient for the planned repository.

Consequences: CI, scripts, and lockfile behavior should align with npm.

Risks: npm may be less strict or less fast than alternatives.

Phase 1 update: The root `package.json` uses npm workspaces with `apps/*` and `packages/*`, plus foundation scripts for formatting, linting, type checking, and combined checks.

Deferred: Application build, development server, and test scripts.

## TypeScript

Status: Approved.

Context: The backend, frontend, and shared project code need a consistent language.

Approved choice: Use TypeScript.

Reasoning: TypeScript improves maintainability, validation boundaries, editor support, and shared contracts.

Consequences: Type checking must be part of quality gates once code exists.

Risks: Configuration can sprawl across packages.

Phase 1 update: The repository uses a root `tsconfig.base.json` with strict safety options and per-workspace `tsconfig.json` files. Phase 1 type checking uses `tsc --noEmit`.

Deferred: Project references, emitted build outputs, and application-specific TypeScript options.

## Fastify

Status: Approved.

Context: The API and redirect service need a Node.js web framework.

Approved choice: Use Fastify.

Reasoning: Fastify supports high-performance routing, schema-aware APIs, structured logging through Pino conventions, and testable injection patterns.

Consequences: Route handlers should remain focused and should delegate business logic to services.

Risks: Plugin usage must not obscure security or redirect behavior.

Deferred: API structure, plugin selection, and error response format.

## React and Vite

Status: Approved.

Context: The product needs a polished dashboard.

Approved choice: Use React with Vite.

Reasoning: React and Vite support fast frontend development, component testing, and static deployment.

Consequences: The frontend can be deployed separately from the API.

Risks: Dashboard scope can expand quickly.

Deferred: Component architecture, route structure, and styling conventions.

## PostgreSQL and Prisma

Status: Approved.

Context: Reduc.to needs durable relational data with constraints for users, links, tokens, and analytics.

Approved choice: Use PostgreSQL with Prisma ORM.

Reasoning: PostgreSQL provides reliable constraints and indexing. Prisma provides a TypeScript-friendly data access layer.

Consequences: Important invariants such as uniqueness must be enforced by the database.

Risks: Analytics volume and indexing choices require careful design.

Deferred: Prisma schema, migrations, indexes, and retention mechanics.

## Redis

Status: Approved.

Context: Redirects and rate limiting benefit from low-latency storage.

Approved choice: Use Redis.

Reasoning: Redis is appropriate for redirect lookup caching and rate-limiting support.

Consequences: Link updates must invalidate relevant cache entries.

Risks: Redis outages must not make the system fail unsafely.

Deferred: Cache keys, TTLs, fallback behavior, and rate-limit design.

## Authentication Direction

Status: Approved.

Context: Registered users need secure sessions for protected link management.

Approved choice: Use short-lived JWT access tokens and rotating refresh tokens.

Reasoning: This supports stateless access checks with revocable refresh-token sessions.

Consequences: Refresh-token rotation, reuse detection, storage hashing, and revocation must be designed carefully.

Risks: Token rotation bugs can create security or usability issues.

Deferred: Claims, signing keys, rotation schema, revocation behavior, and session endpoints.

## Cookie-Based Token Delivery

Status: Approved.

Context: Authentication tokens must be delivered safely to browser clients.

Approved choice: Deliver tokens through secure HTTP-only cookies. Do not store tokens in localStorage.

Reasoning: HTTP-only cookies reduce exposure to token theft through client-side script access.

Consequences: CSRF protection must be deliberately designed.

Risks: Incorrect SameSite, Secure, domain, or CSRF choices can weaken security or break deployment.

Deferred: Cookie names, attributes, CSRF strategy, and cross-origin deployment behavior.

## Redirect Default

Status: Approved.

Context: Short links need predictable redirect behavior.

Approved choice: Default to HTTP 302.

Reasoning: Temporary redirects avoid problematic browser and intermediary caching while links can be edited or disabled.

Consequences: Users may eventually select 301 or 302 per link.

Risks: Permanent redirect support needs careful warnings and cache expectations.

Deferred: Per-link redirect-type UI and API details.

## Base62 Generated Codes

Status: Approved.

Context: Generated short links need compact unique codes.

Approved choice: Use 7-character Base62 generated codes with alphabet `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`.

Reasoning: Base62 is URL-friendly and compact.

Consequences: Generated codes are case-sensitive and require database-level uniqueness with bounded collision retries.

Risks: Collision handling must be correct as volume grows.

Deferred: Retry limit, generation implementation, and reserved-code interactions.

## Alias Normalization

Status: Approved.

Context: Custom aliases need predictable user-facing behavior.

Approved choice: Custom aliases are case-insensitive, trimmed before validation, normalized to lowercase, 3 to 40 characters, limited to lowercase letters, digits, hyphens, and underscores, must begin and end with a letter or digit, must reject reserved aliases, and cannot be changed after creation in the first release.

Reasoning: Normalization avoids confusing duplicates and keeps URLs readable.

Consequences: Alias uniqueness should be enforced on normalized values.

Risks: Generated case-sensitive codes and custom case-insensitive aliases must be resolved without ambiguity.

Deferred: Reserved alias list and exact conflict-resolution rules between generated codes and aliases.

## Registered-User-Only Link Creation

Status: Approved.

Context: Link creation affects abuse prevention, ownership, analytics, and management.

Approved choice: Only registered users may create links in the first release.

Reasoning: Excluding anonymous creation reduces abuse and simplifies ownership.

Consequences: Visitors can open links without accounts, but cannot create links.

Risks: Public acquisition is narrower without anonymous trials.

Deferred: Any future anonymous limits or flows.

## Initial Analytics Approach

Status: Approved.

Context: Click analytics are useful but must not slow redirects.

Approved choice: Do not introduce Kafka, RabbitMQ, BullMQ, or another queue initially. Design for asynchronous or deferred click-event persistence while documenting durability limitations.

Reasoning: This keeps the first implementation simpler while preserving redirect performance goals.

Consequences: Analytics failures should not unnecessarily block valid redirects.

Risks: Non-durable deferred handling may lose some events during failures.

Deferred: Exact mechanics for persistence, retries, aggregation, and future durable queue migration.

## Exclusion of Initial Geolocation

Status: Approved.

Context: Country analytics can create privacy, accuracy, and infrastructure concerns.

Approved choice: Exclude geolocation from the first functional release and do not call third-party geolocation APIs during redirects.

Reasoning: This reduces privacy and latency risk.

Consequences: Country-level analytics may be introduced later.

Risks: Initial analytics may feel less complete.

Deferred: Privacy-conscious geolocation strategy.

## Analytics Retention

Status: Approved.

Context: Raw click events are useful for recent activity but should not be retained indefinitely.

Approved choice: Target raw click-event retention is 90 days. Daily aggregate statistics may be retained indefinitely.

Reasoning: This balances usefulness, storage control, and privacy.

Consequences: Reporting must account for raw-event retention boundaries.

Risks: Users may expect detailed historical event views beyond 90 days.

Deferred: Purge jobs, aggregate schema, and retention enforcement.

## No Raw IP Storage

Status: Approved.

Context: Analytics should minimize personal data.

Approved choice: Do not store raw IP addresses.

Reasoning: Avoiding raw IP retention supports the privacy-aware product direction.

Consequences: Approximate uniqueness may use HMAC with a server-side secret and minimized inputs.

Risks: Unique visitor counts will be approximate and must be described that way.

Deferred: Exact visitor-hash inputs, secret rotation, and user-agent minimization rules.

## Separate Frontend and API Deployment

Status: Approved.

Context: The React frontend and Fastify API have different hosting needs.

Approved choice: Deploy the React frontend on a static frontend platform and the Fastify API on a container-capable backend platform, with managed PostgreSQL and Redis.

Reasoning: This is a common vendor-neutral production shape for the planned stack.

Consequences: CORS, cookies, CSRF, environment variables, and observability need explicit design.

Risks: Cross-origin auth can be fragile if cookie and CSRF settings are wrong.

Deferred: Vendor selection and deployment configuration.

## MIT License

Status: Approved.

Context: The project needs an open-source license direction.

Approved choice: MIT, Copyright (c) 2026 Shivay Dwivedi.

Reasoning: MIT is simple and portfolio-friendly.

Consequences: The repository includes a standard MIT `LICENSE` file.

Risks: None significant for the current project direction.

Deferred: None for the license file itself.

## Node.js Foundation Version

Status: Approved for Phase 1 foundation.

Context: The repository needs a supported runtime baseline for TypeScript tooling and future Node.js development.

Approved choice: Require Node.js `>=22.11.0` and npm `>=10.9.0`.

Reasoning: Node.js 22 is a modern LTS line suitable for a new TypeScript project and avoids depending on a non-LTS runtime.

Consequences: Contributors should use Node.js 22.11.0 or newer.

Risks: Future hosting platforms must support the selected runtime line.

Deferred: Exact production runtime image and deployment configuration.

## Foundation Formatting and Linting

Status: Approved for Phase 1 foundation.

Context: The monorepo needs consistent formatting and linting before application code begins.

Approved choice: Use Prettier with conventional formatting rules and ESLint flat config with TypeScript ESLint support.

Reasoning: This keeps the initial quality setup understandable and avoids framework-specific linting before frameworks are installed.

Consequences: React-specific, Fastify-specific, and test-specific linting can be added only when those layers are introduced.

Risks: The initial lint rules are intentionally modest and may need tightening as product code appears.

Deferred: Framework-specific rules and test linting.

## Line-Ending Policy

Status: Approved for Phase 1 foundation.

Context: Windows development can produce line-ending churn if the repository policy is implicit.

Approved choice: Normalize text files to LF in Git with `.gitattributes` using `* text=auto eol=lf`.

Reasoning: A clear policy prevents noisy diffs while remaining usable on Windows.

Consequences: Contributors on Windows may see working-tree conversions depending on Git configuration, but committed text stays normalized.

Risks: Windows-specific scripts may need exceptions if introduced later.

Deferred: Script-specific line-ending exceptions.
