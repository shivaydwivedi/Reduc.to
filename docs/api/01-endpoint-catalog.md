# Endpoint Catalog

Status: Planned; not implemented.

This catalog defines planned endpoints only. It does not define full JSON schemas.

## Operational

| Method | Path      | Auth | Purpose              | Inputs | Response          | Important errors         | Rate limit  |
| ------ | --------- | ---- | -------------------- | ------ | ----------------- | ------------------------ | ----------- |
| GET    | `/health` | No   | Liveness check       | none   | status            | `INTERNAL_ERROR`         | operational |
| GET    | `/ready`  | No   | Dependency readiness | none   | dependency status | `DEPENDENCY_UNAVAILABLE` | operational |

## Auth

| Method | Path                    | Auth                       | Purpose                                               | Inputs                                 | Response                   | Important errors                                                     | Rate limit         |
| ------ | ----------------------- | -------------------------- | ----------------------------------------------------- | -------------------------------------- | -------------------------- | -------------------------------------------------------------------- | ------------------ |
| POST   | `/api/v1/auth/register` | No                         | Create user and session                               | email, password, optional display name | current user, auth cookies | `VALIDATION_FAILED`, `EMAIL_ALREADY_EXISTS`, `RATE_LIMITED`          | registration       |
| POST   | `/api/v1/auth/login`    | No                         | Create session                                        | email, password                        | current user, auth cookies | `INVALID_CREDENTIALS`, `RATE_LIMITED`                                | login              |
| POST   | `/api/v1/auth/refresh`  | Refresh cookie             | Rotate refresh session                                | cookies                                | auth cookies               | `AUTHENTICATION_REQUIRED`, `SESSION_EXPIRED`, `TOKEN_REUSE_DETECTED` | refresh            |
| POST   | `/api/v1/auth/logout`   | Optional session plus CSRF | Idempotently revoke current session and clear cookies | cookies                                | success                    | CSRF failure only                                                    | mutation           |
| GET    | `/api/v1/auth/me`       | Access cookie              | Return current user                                   | none                                   | current user               | `AUTHENTICATION_REQUIRED`                                            | authenticated read |

Logout all sessions is deferred unless explicitly approved.

Logout returns success when the current session is missing, expired, already revoked, or absent. It always clears access, refresh, and CSRF cookies and does not reveal whether a session was active.

## Links

| Method | Path                             | Auth     | Purpose                               | Inputs                                                            | Response        | Important errors                                                               | Rate limit         |
| ------ | -------------------------------- | -------- | ------------------------------------- | ----------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------ | ------------------ |
| POST   | `/api/v1/links`                  | Required | Create generated or custom-alias link | destination URL, optional alias, title, expiration, redirect type | link            | `VALIDATION_FAILED`, `ALIAS_UNAVAILABLE`, `UNSAFE_DESTINATION`, `RATE_LIMITED` | link creation      |
| GET    | `/api/v1/links`                  | Required | List owned links                      | pagination, search, filters, sorting                              | paginated links | `VALIDATION_FAILED`, `AUTHENTICATION_REQUIRED`                                 | authenticated read |
| GET    | `/api/v1/links/{linkId}`         | Required | Get one owned link                    | link ID                                                           | link            | `LINK_NOT_FOUND`                                                               | authenticated read |
| PATCH  | `/api/v1/links/{linkId}`         | Required | Update allowed link fields            | destination URL, title, expiration, redirect type                 | link            | `LINK_NOT_FOUND`, `VALIDATION_FAILED`, `UNSAFE_DESTINATION`                    | link mutation      |
| POST   | `/api/v1/links/{linkId}/enable`  | Required | Enable owned link                     | link ID                                                           | link            | `LINK_NOT_FOUND`, `LINK_EXPIRED`                                               | link mutation      |
| POST   | `/api/v1/links/{linkId}/disable` | Required | Disable owned link                    | link ID                                                           | link            | `LINK_NOT_FOUND`                                                               | link mutation      |
| DELETE | `/api/v1/links/{linkId}`         | Required | Soft delete owned link                | link ID                                                           | success         | `LINK_NOT_FOUND`                                                               | link mutation      |

## Analytics

| Method | Path                                          | Auth     | Purpose                     | Inputs                  | Response      | Important errors                      | Rate limit     |
| ------ | --------------------------------------------- | -------- | --------------------------- | ----------------------- | ------------- | ------------------------------------- | -------------- |
| GET    | `/api/v1/links/{linkId}/analytics/summary`    | Required | Link analytics summary      | date range              | totals        | `LINK_NOT_FOUND`, `VALIDATION_FAILED` | analytics read |
| GET    | `/api/v1/links/{linkId}/analytics/timeseries` | Required | Clicks over time            | date range, granularity | series        | `LINK_NOT_FOUND`, `VALIDATION_FAILED` | analytics read |
| GET    | `/api/v1/links/{linkId}/analytics/referrers`  | Required | Referrer hosts              | date range              | referrer list | `LINK_NOT_FOUND`, `VALIDATION_FAILED` | analytics read |
| GET    | `/api/v1/links/{linkId}/analytics/devices`    | Required | Device/browser/OS breakdown | date range              | breakdowns    | `LINK_NOT_FOUND`, `VALIDATION_FAILED` | analytics read |
| GET    | `/api/v1/links/{linkId}/analytics/recent`     | Required | Recent click activity       | pagination              | events        | `LINK_NOT_FOUND`, `VALIDATION_FAILED` | analytics read |

## Public

| Method | Path    | Auth | Purpose                         | Inputs           | Response            | Important errors                                    | Rate limit      |
| ------ | ------- | ---- | ------------------------------- | ---------------- | ------------------- | --------------------------------------------------- | --------------- |
| GET    | `/:key` | No   | Resolve and redirect public key | key path segment | 302 or 301 redirect | missing, disabled, expired, deleted public response | public redirect |

Public redirect errors may use public-safe HTML or JSON depending on client negotiation, but must not expose owner details.
