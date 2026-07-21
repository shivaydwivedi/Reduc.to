# Authentication and Session Design

Status: Design approved; implementation not started.

## Selected Model

Authentication uses short-lived JWT access tokens and rotating refresh tokens delivered through secure HTTP-only cookies. Refresh sessions are modeled separately from individual issued refresh tokens. Each issued refresh token has its own hashed database record. Tokens are never stored in localStorage.

## Lifetimes

- Access token target lifetime: approximately 15 minutes.
- Refresh token target lifetime: approximately 7 days.

Exact clock-skew tolerance and cookie max-age values are deferred to implementation.

## RefreshSession Entity

The conceptual `RefreshSession` stores one browser session family.

Key fields:

- `id`: UUID v7 primary key.
- `userId`: owning user.
- `familyId`: stable UUID v7 for related rotations.
- `expiresAt`: refresh-session expiration.
- `revokedAt`: set when session is revoked.
- `revocationReason`: safe enum or text reason.
- `createdAt`, `updatedAt`.

## RefreshToken Entity

Each issued refresh token is represented by a conceptual `RefreshToken` record.

Key fields:

- `id`: UUID v7 primary key.
- `sessionId`: owning refresh session.
- `tokenHash`: hash of the raw refresh token.
- `issuedAt`: UTC timestamp when the token was issued.
- `expiresAt`: UTC timestamp when the token expires.
- `consumedAt`: UTC timestamp set when the token is rotated.
- `revokedAt`: UTC timestamp set when the token is revoked without normal consumption.
- `replacedByTokenId`: optional self-reference to the successor token.

## Token-Family Strategy

Use one `RefreshSession` row per browser session family and one `RefreshToken` row for every issued refresh token. Rotation transactionally marks the presented token as consumed and creates its replacement. `replacedByTokenId` links the rotation chain.

Presenting an already consumed refresh token is treated as reuse. Reuse revokes the entire associated `RefreshSession` family and requires login.

Concurrent refresh requests must not both produce valid successor tokens. The exact database locking or compare-and-swap mechanism is deferred to Prisma implementation, but the required atomic outcome is explicit: only one request can consume a token and create the next valid token.

## JWT Claims

Access-token claims should be minimal:

- `sub`: user ID.
- `sid`: refresh session ID.
- `role`: user role if role-based checks are introduced.
- `iat`, `exp`, `jti`.

Do not put password hashes, refresh tokens, email verification secrets, authorization decisions, or mutable ownership data in JWTs. Link ownership must be checked against PostgreSQL.

## Access-Token Verification

Protected routes verify the JWT signature, expiration, issuer/audience when configured, and expected token type. For sensitive operations, the API may check that the referenced session or user is still valid. Account disablement and password-change invalidation are deferred but must be considered before those features are added.

## Refresh-Token Hashing and Raw Handling

Raw refresh tokens are generated with cryptographically secure randomness, sent only in HTTP-only cookies, and never logged or stored. PostgreSQL stores a server-side hash suitable for token lookup and comparison. Hashing parameters and pepper strategy are deferred to implementation.

## Cookie Responsibilities

Cookies must be `HttpOnly` and `Secure` in production. `SameSite`, domain, path, and max-age values must support the separate frontend/API deployment. Access and refresh cookies should have narrow paths where practical.

## CSRF Strategy

SameSite alone is not sufficient for all deployment shapes. First release should use a combination approach:

- `SameSite=Lax` or stricter when compatible with deployment.
- Strict `Origin` checks for unsafe methods.
- `Referer` fallback only where `Origin` is absent and policy allows.
- Double-submit CSRF token for unsafe authenticated API methods.

The CSRF token is not a secret equivalent to a refresh token. It may be readable by the frontend and submitted in a header such as `X-CSRF-Token`. The API verifies that the submitted token matches the CSRF cookie and expected session context. Exact token binding details are deferred.

Safe methods such as `GET` still require authorization for private resources but do not mutate state.

## Sequence Flows

### Register

1. User submits registration request.
2. API validates input and normalizes email.
3. API creates user with password hash.
4. API creates refresh session.
5. API returns safe user data and auth cookies.

### Login

1. User submits credentials.
2. API verifies password without leaking whether the email exists.
3. API creates a refresh session and short-lived access token.
4. API sets HTTP-only cookies and CSRF cookie.

### Authenticated Request

1. Browser sends access cookie and CSRF header for unsafe methods.
2. API verifies CSRF where required.
3. API verifies access token.
4. Service performs database-backed authorization.
5. API returns JSON response or error envelope.

### Refresh Rotation

1. Browser calls refresh endpoint with refresh cookie.
2. API hashes the presented raw token and finds its `RefreshToken`.
3. API verifies the token, its `RefreshSession`, and both expirations are active.
4. In one transaction, API marks the current `RefreshToken.consumedAt` and creates the successor `RefreshToken`.
5. API links `replacedByTokenId` to the successor.
6. API issues a new access token and sets replacement cookies.

### Reuse Detection

1. Old refresh token is presented after rotation.
2. API finds a consumed or revoked `RefreshToken`.
3. API revokes the entire associated `RefreshSession` family.
4. API clears cookies and returns an authentication error.
5. User must log in again.

### Logout

1. User calls logout with CSRF protection.
2. API revokes the current refresh session if a valid one exists.
3. API always clears access, refresh, and CSRF cookies.
4. API returns success even when the session is missing, expired, already revoked, or absent.
5. Existing access token naturally expires quickly.

Logout must be idempotent and must not reveal whether a session was active.

### Expired Refresh Session

1. Browser calls refresh with an expired refresh token.
2. API refuses rotation.
3. API clears cookies.
4. User must log in again.

## Logout All Sessions

Logout of all sessions is deferred from the first release unless explicitly approved. The data model should support it later by revoking all active sessions for a user.

## Session Cleanup

Expired and revoked refresh sessions and their refresh-token records should be removed or archived by a cleanup job after a retention buffer. Cleanup timing is defined in `docs/database/02-data-lifecycle-and-retention.md`.
