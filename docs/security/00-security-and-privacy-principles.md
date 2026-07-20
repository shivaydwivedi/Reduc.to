# Security and Privacy Principles

This document describes intended security and privacy principles. It does not claim that controls are already implemented.

## Security Objectives

- Protect user accounts and sessions.
- Enforce ownership authorization for all link-management and analytics access.
- Validate all external input.
- Prevent unsafe redirect behavior where practical.
- Keep redirects fast without hiding operational failures.
- Minimize personal-data collection and retention.
- Keep secrets out of source control.
- Make security decisions explicit and reviewable.

## Threat-Aware Design Principles

Implementation should consider credential attacks, token theft, CSRF, authorization bypass, unsafe destination URLs, alias abuse, request flooding, injection, cache staleness, sensitive logging, dependency risk, and privacy leakage through analytics.

## Authentication Principles

The approved direction is short-lived JWT access tokens and rotating refresh tokens. Access tokens target an approximately 15-minute lifetime. Refresh tokens target an approximately 7-day lifetime and will eventually be stored as hashes in PostgreSQL.

Token rotation, reuse detection, revocation, signing keys, and session invalidation remain deferred architecture details.

## Authorization and Ownership Rules

Authentication only proves identity. Authorization must separately verify that the authenticated user owns the requested link or analytics resource.

The client must never be trusted to provide ownership information. Ownership must be derived from authenticated server-side context and persisted records.

## Cookie and Token Principles

Authentication tokens must be delivered through secure HTTP-only cookies and must not be stored in localStorage.

Cookie attributes must be deliberately designed for the final deployment shape, including `Secure`, `HttpOnly`, `SameSite`, path, domain, expiration, and cross-origin behavior where applicable.

## CSRF Direction

Because authentication uses cookies, CSRF protection must be designed before authentication implementation is considered complete.

The exact CSRF strategy is deferred. Candidate approaches may include SameSite constraints, CSRF tokens, origin checks, or a combination appropriate to the separate frontend/API deployment model.

## Input-Validation Principles

All external input must be validated at the API boundary. Validation should cover request bodies, query parameters, path parameters, authentication state, destination URLs, aliases, pagination, sorting, filtering, and date ranges.

Validation errors should be consistent and should not leak sensitive implementation details.

## Destination URL Safety

Destination URLs must be validated before link creation or update. The implementation should reject unsupported schemes and should consider protections against unsafe internal-network destinations where applicable.

Exact URL validation rules are deferred to architecture design.

## Open-Redirect Considerations

Reduc.to intentionally redirects to user-provided destinations, so safety depends on clear validation, ownership controls, abuse prevention, and user-visible behavior.

The service must not expose unrelated open-redirect endpoints outside the approved short-link redirect flow.

## Internal-Network and Unsafe Destination Concerns

The system should account for destinations that target localhost, private networks, metadata services, or other sensitive internal resources. The exact restrictions may depend on deployment environment and must be approved before implementation.

## Alias Abuse Prevention

Custom aliases must follow approved validation rules, be normalized to lowercase, reject reserved aliases, and be checked for availability.

Reserved aliases should protect application routes, API routes, operational endpoints, and names that could confuse users.

## Rate-Limiting Principles

Rate limiting should protect authentication, link creation, redirects where appropriate, and other abuse-prone endpoints. Redis is the approved supporting technology, but the system should degrade gracefully when Redis is temporarily unavailable.

Exact limits and fallback behavior are deferred.

## Secret-Management Rules

Secrets must not be committed to source control. This includes JWT signing secrets, refresh-token hashing material, visitor-hash HMAC secrets, database credentials, Redis credentials, and deployment tokens.

Environment validation should be introduced when application configuration is created.

## Logging Rules

Logs should be structured and useful for debugging without exposing credentials, raw tokens, raw IP addresses, sensitive cookies, password material, or unnecessary personal data.

Analytics failures during redirects should be logged with safe diagnostic context.

## Analytics Privacy

Analytics should be useful without collecting unnecessary personal information. Raw IP addresses must not be stored. Complete user-agent strings should not be retained long term unless technically justified.

Referrer information should be sanitized and minimized.

## Visitor-Hash Principles

Approximate unique visitors may eventually use an HMAC created with a server-side secret. Likely inputs include normalized network information, limited user-agent classification, and a date bucket.

Unique visitor metrics must always be described as approximate, not exact identity.

Exact inputs, hash rotation, and retention rules are deferred.

## Data Minimization

The product should collect only data needed for approved functionality. Geolocation is excluded from the first functional release. Third-party geolocation APIs must not be called during redirects.

## Data-Retention Direction

Raw click-event target retention is 90 days. Daily aggregate statistics may be retained indefinitely.

Retention enforcement mechanics are deferred to later architecture and implementation phases.

## Dependency Security

Dependencies should be added only when approved and justified. Dependency auditing, update review, and vulnerability handling should be part of the project quality process once packages exist.

## Error-Message Safety

Error responses should be consistent and should not reveal sensitive internals. Authentication errors should avoid account enumeration where practical. Authorization failures should not leak resource ownership details.

## Security-Review Gates

Security review is required before declaring the following areas complete:

- Authentication and refresh-token rotation.
- CSRF protection.
- Ownership authorization.
- Destination URL validation.
- Alias reservation and validation.
- Rate limiting.
- Redirect caching and invalidation.
- Analytics collection and retention.
- Deployment cookie and CORS configuration.

## Explicitly Deferred Security Decisions

- Exact JWT claims and signing configuration.
- Refresh-token schema and rotation behavior.
- CSRF strategy.
- Cookie names and attributes.
- Destination URL allow and deny rules.
- Internal-network destination restrictions.
- Rate-limit thresholds and fallback behavior.
- Reserved alias list.
- Visitor-hash input set and secret rotation.
- Retention purge mechanics.
- Production secret-management vendor or platform.
