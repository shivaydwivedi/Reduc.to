# Error Model

Status: Approved design for Phase 2. Implementation has not started.

## Error Envelope

Application APIs return a consistent JSON envelope:

```json
{
  "error": {
    "code": "LINK_NOT_FOUND",
    "message": "The requested link was not found.",
    "details": {},
    "requestId": "req_..."
  }
}
```

`details` is optional and must be safe for clients.

## Error-Code Naming Rules

- Uppercase snake case.
- Stable and machine-readable.
- Specific enough for client behavior.
- Not so specific that it leaks ownership or account existence.

## Validation Errors

Use `VALIDATION_FAILED` with field-level details when safe:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request contains invalid input.",
    "details": {
      "fields": {
        "destinationUrl": ["Unsupported URL scheme."]
      }
    },
    "requestId": "req_..."
  }
}
```

## Authentication Errors

Use stable errors such as:

- `AUTHENTICATION_REQUIRED`
- `INVALID_CREDENTIALS`
- `SESSION_EXPIRED`
- `TOKEN_REUSE_DETECTED`

Login failures should avoid account enumeration.

Logout is idempotent. `POST /api/v1/auth/logout` should not return `AUTHENTICATION_REQUIRED` merely because no valid session exists. It should always clear access, refresh, and CSRF cookies and return success unless the request itself fails CSRF or another non-session precondition.

## Authorization and Not-Found Behavior

For owned resources, return `LINK_NOT_FOUND` when the link does not exist or is not owned by the current user. Do not reveal that another user owns the resource.

## Conflict Errors

Use conflict errors for state or uniqueness problems:

- `EMAIL_ALREADY_EXISTS`
- `ALIAS_UNAVAILABLE`
- `LINK_ALREADY_DELETED`
- `TOKEN_REUSE_DETECTED`

## Rate Limits

Use `RATE_LIMITED` with HTTP 429 and safe retry metadata:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retryAfterSeconds": 60
    },
    "requestId": "req_..."
  }
}
```

## Dependency Failures

Use safe codes such as:

- `DEPENDENCY_UNAVAILABLE`
- `DATABASE_UNAVAILABLE`
- `CACHE_UNAVAILABLE`
- `INTERNAL_ERROR`

Do not expose connection strings, stack traces, SQL, Redis keys containing user data, or secret names in production responses.

## Request IDs

Every error includes `requestId`. Logs should include the same ID for troubleshooting.

## Production Versus Development Details

Production responses contain safe messages only. Development may include additional details behind an explicit environment gate, but must still avoid secrets and sensitive personal data.

## HTTP Status Mapping

- 400: `VALIDATION_FAILED`
- 401: `AUTHENTICATION_REQUIRED`, `SESSION_EXPIRED`, `INVALID_CREDENTIALS`
- 403: CSRF failures or authenticated forbidden actions where not-found masking is inappropriate
- 404: `LINK_NOT_FOUND`, public missing route
- 409: uniqueness or state conflicts
- 410: public expired/deleted links if a distinct public response is chosen
- 429: `RATE_LIMITED`
- 500: `INTERNAL_ERROR`
- 503: `DEPENDENCY_UNAVAILABLE`

## Public Redirect Error Handling

Public redirect errors must not expose owner identity, destination URL for disabled/deleted links, or internal state. Missing, disabled, expired, and deleted links may use public-safe messages. API JSON envelope is preferred for API routes; public redirect may return HTML or JSON based on client negotiation.
