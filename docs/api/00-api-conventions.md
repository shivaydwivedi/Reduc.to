# API Conventions

Status: Approved design for Phase 2. Implementation has not started.

## Base Path

Application APIs use `/api/v1`.

The public redirect route remains outside `/api`, using `/:key`.

Operational endpoints use:

- `/health` for process liveness.
- `/ready` for dependency readiness.

## JSON Conventions

Requests and responses use JSON for application APIs. Response object names use camelCase. Unknown fields should be rejected or ignored deliberately per endpoint design, not accidentally accepted.

## Timestamp Format

All timestamps are stored and returned in UTC using ISO 8601 strings.

Analytics date buckets use UTC calendar dates.

## ID Representation

Internal IDs are UUID v7 values represented as strings in JSON.

## Pagination Direction

List endpoints use bounded pagination. The first implementation may use page/limit or cursor pagination, but must document the chosen approach before endpoint implementation. Maximum page size must be enforced.

## Sorting and Filtering Direction

Sorting and filtering use explicit allowlists. Client-provided field names must not be passed directly into database queries.

## Authentication Transport

Access and refresh tokens are delivered through secure HTTP-only cookies. Tokens are not stored in localStorage.

## CSRF Requirements

Unsafe authenticated methods require CSRF protection using Origin checks and a double-submit CSRF token. SameSite cookies are a supporting control, not the only CSRF defense.

## Request IDs

Every request receives a request ID. Error responses include `requestId`. The API should accept a safe incoming request ID header only if it passes validation; otherwise it generates one.

## Idempotency Direction

Idempotency keys are deferred for first-release link creation unless retries create a concrete problem. Refresh rotation must be transactionally safe and not rely on client idempotency.

## Caching Headers

Private authenticated API responses should default to no-store unless a later endpoint explicitly approves caching. Public redirect responses should avoid cache headers that make editable 302 redirects unexpectedly sticky. Permanent 301 redirects require careful user-facing warnings.

## Rate-Limit Headers

Rate-limited responses should include safe metadata such as limit category, retry-after value, and request ID. Exact header names and numeric limits are deferred.

## Rate-Limit Redis Failure Posture

First-release behavior when Redis-backed rate limiting is unavailable:

- Registration: fail closed unless an approved safe local fallback is active.
- Login: fail closed unless an approved safe local fallback is active.
- Refresh: fail closed.
- Link creation: fail closed.
- Link mutation: fail closed.
- Analytics reads: may fail open temporarily with structured logging and metrics.
- Public redirects: fail open with respect to Redis and resolve through PostgreSQL.
- Operational endpoints: remain available according to their dependency semantics.

Client-IP-based keys require explicit trusted-proxy configuration. User-based rate-limit keys must come from authenticated server context. Final numeric limits remain deferred.

## Content Types

Application APIs accept and return `application/json` unless documented otherwise. Public redirects return HTTP redirect responses or public error pages/responses.

## Compatibility and Versioning

Breaking application API changes require a new version path such as `/api/v2`. Public redirect URLs are product URLs and should remain stable.

## Deprecation Direction

Deprecation policy is deferred until there are external API consumers beyond the first web frontend.
