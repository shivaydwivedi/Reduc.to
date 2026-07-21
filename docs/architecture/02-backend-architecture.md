# Backend Architecture

Status: Approved design for Phase 2. Implementation has not started.

## Modular Monolith Rationale

Reduc.to should begin as a modular monolith. The product needs clear boundaries but does not need the operational cost of microservices. Modules can be implemented inside `apps/api` with disciplined dependencies, shared infrastructure, and focused tests in later phases.

## Module List

- auth: registration, login, refresh rotation, logout, session revocation.
- users: current-user data and future user lifecycle rules.
- links: link creation, validation, ownership, editing, state changes, soft deletion.
- redirects: public key resolution, cache-aside lookup, redirect decision.
- analytics: click-event capture, buffering, aggregation, reporting queries.
- health: health and readiness endpoints.
- shared infrastructure: configuration, logging, request IDs, database client, Redis client, error utilities, validation helpers.

## Layer Responsibilities

- Route: registers HTTP method and path, attaches schemas and auth requirements.
- Handler/controller: translates HTTP request/response into service calls.
- Service: owns business rules, transactions, authorization checks, and orchestration.
- Repository: owns persistence queries and maps database records to domain-friendly shapes.
- Schema: validates external inputs and serializable outputs.
- Types: local domain types and shared API contract types when genuine reuse exists.

Do not add extra layers unless a concrete implementation problem requires them.

## Dependency Direction

```text
route -> handler -> service -> repository -> database
                         |-> cache
                         |-> analytics buffer
                         |-> shared infrastructure
```

Repositories must not call handlers. Services must not depend on route framework objects. Cross-module calls should go through service interfaces, not repositories from another module, unless a later design explicitly approves a simpler local exception.

## Cross-Cutting Infrastructure

- Request ID creation and propagation.
- Structured logging using Fastify/Pino conventions.
- Configuration and environment validation when app config is introduced.
- Authentication and CSRF hooks.
- Rate limiting.
- Error mapping.
- PostgreSQL and Redis clients.
- Graceful shutdown for HTTP server, database, Redis, and analytics buffer.

## Request Lifecycle

1. Receive request.
2. Attach request ID and logger context.
3. Apply request size limits and content-type checks.
4. Run CORS and CSRF policy where applicable.
5. Authenticate when required.
6. Validate input.
7. Call service.
8. Commit transaction or complete read.
9. Map result or error to response envelope.
10. Emit safe logs and metrics.

## Transaction Boundaries

Transactions belong in services when multiple repository operations must succeed together. Examples include link creation with namespace uniqueness, refresh-token rotation, and state-changing link updates that require cache invalidation after commit.

Cache invalidation should occur only after the database transaction commits.

## Repository Responsibilities

Repositories should express named query patterns, not generic database access. They should not perform authorization decisions. They may expose methods such as finding a link by `lookupKey`, listing links by owner, creating refresh sessions and refresh-token records, and inserting click-event batches.

## Service Responsibilities

Services enforce ownership, validation-dependent business rules, state transitions, retry boundaries, and durable side effects. Services decide whether failures are user-facing, retryable, or logged and swallowed.

## Error Propagation

Domain services should throw or return typed application errors. The HTTP layer maps those errors to the shared error envelope in `docs/api/02-error-model.md`. Unexpected errors become safe `INTERNAL_ERROR` responses with request IDs.

## Logging Context

Logs should include request ID, route, method, status, authenticated user ID when present, link ID when safe, and dependency failure context. Logs must not include raw tokens, password material, raw IP addresses, or complete user-agent strings unless a later security review approves a short-term diagnostic exception.

## Proposed Future Folder Structure

This is a proposed implementation shape only; do not create it during Phase 2.

```text
apps/api/src/
|-- modules/
|   |-- auth/
|   |-- users/
|   |-- links/
|   |-- redirects/
|   |-- analytics/
|   `-- health/
|-- infrastructure/
|-- plugins/
|-- server.ts
`-- main.ts
```

## Anti-Patterns to Avoid

- Putting business rules directly in route registration.
- Trusting user IDs or ownership flags from client input.
- Letting analytics failures block valid redirects.
- Storing raw IP addresses.
- Treating Redis cached state as authoritative after link mutation.
- Creating generic repositories that hide important query intent.
- Introducing queues, microservices, or orchestration frameworks before they are needed.
