# User Flows

These flows describe intended product behavior without committing unapproved API, schema, or UI details.

## 1. Registering

Actor: New user.

Preconditions: The user does not already have an account with the submitted email.

Main flow:

1. User submits registration details.
2. System validates input.
3. System stores the user with a secure password hash.
4. System starts an authenticated session according to the approved auth design.

Expected result: The user can access protected link-management features.

Important failure cases: Invalid email, weak password, duplicate email, rate limit exceeded, service error.

## 2. Logging In

Actor: Registered user.

Preconditions: The user has an active account.

Main flow:

1. User submits credentials.
2. System validates credentials.
3. System creates access and refresh token state.
4. System delivers tokens through secure HTTP-only cookies.

Expected result: The user is authenticated without storing tokens in localStorage.

Important failure cases: Invalid credentials, missing account, rate limit exceeded, token creation failure.

## 3. Refreshing a Session

Actor: Authenticated user.

Preconditions: The refresh token is present, valid, unexpired, and not revoked.

Main flow:

1. Client requests session refresh.
2. System validates refresh token state.
3. System rotates the refresh token.
4. System issues a new short-lived access token.

Expected result: The session continues while old refresh-token state is invalidated.

Important failure cases: Missing token, expired token, reused or revoked token, failed rotation.

## 4. Logging Out

Actor: Authenticated user.

Preconditions: The user has an active session.

Main flow:

1. User requests logout.
2. System revokes relevant refresh-token state.
3. System clears authentication cookies.

Expected result: The user can no longer access protected routes using that session.

Important failure cases: Missing session, already revoked session, partial cookie-clearing failure.

## 5. Creating a Generated Short Link

Actor: Registered user.

Preconditions: The user is authenticated.

Main flow:

1. User submits a destination URL and optional metadata.
2. System validates ownership context and destination URL.
3. System generates a 7-character Base62 code using approved rules.
4. System persists the link with database-level uniqueness.
5. System returns the short URL.

Expected result: The user owns a new generated short link.

Important failure cases: Invalid URL, unsafe destination, uniqueness collisions exceeding retry limit, authorization failure, rate limit exceeded.

## 6. Creating a Custom-Alias Link

Actor: Registered user.

Preconditions: The user is authenticated and the alias is available.

Main flow:

1. User submits destination URL, custom alias, and optional metadata.
2. System trims and validates the alias.
3. System normalizes the alias to lowercase.
4. System rejects reserved or unavailable aliases.
5. System persists the link.

Expected result: The user owns a new link with an immutable custom alias.

Important failure cases: Invalid alias format, reserved alias, duplicate alias, invalid URL, unsafe destination.

## 7. Opening a Valid Short Link

Actor: Visitor.

Preconditions: The short code or alias exists, is active, is not expired, and is not soft deleted.

Main flow:

1. Visitor opens the short URL with a browser GET request.
2. System resolves the link, using cache where appropriate.
3. System redirects with the configured redirect status, defaulting to HTTP 302.
4. System records or defers click analytics without unnecessarily delaying the redirect.

Expected result: Visitor reaches the destination URL quickly.

Important failure cases: Cache unavailable, analytics recording failure, destination safety issue discovered during resolution.

## 8. Opening a Missing Link

Actor: Visitor.

Preconditions: No active link exists for the requested code or alias.

Main flow:

1. Visitor opens the short URL.
2. System attempts to resolve the code or alias.
3. System returns a not-found response.

Expected result: Visitor sees a clear missing-link outcome.

Important failure cases: Database unavailable, cache unavailable.

## 9. Opening a Disabled Link

Actor: Visitor.

Preconditions: The link exists but is inactive.

Main flow:

1. Visitor opens the short URL.
2. System resolves the link state.
3. System refuses to redirect.

Expected result: Visitor receives a clear unavailable-link outcome.

Important failure cases: Stale cache, inconsistent link state.

## 10. Opening an Expired Link

Actor: Visitor.

Preconditions: The link exists and its expiration time has passed.

Main flow:

1. Visitor opens the short URL.
2. System resolves the expiration state.
3. System refuses to redirect.

Expected result: Visitor receives a clear expired-link outcome.

Important failure cases: Clock inconsistency, stale cache.

## 11. Listing Owned Links

Actor: Registered user.

Preconditions: The user is authenticated.

Main flow:

1. User opens the link-management view.
2. System retrieves links owned by the current user.
3. System applies approved search, filtering, sorting, and pagination.

Expected result: User sees only owned links.

Important failure cases: Unauthorized request, invalid filters, empty result set.

## 12. Viewing One Owned Link

Actor: Registered user.

Preconditions: The user is authenticated and owns the link.

Main flow:

1. User selects a link.
2. System verifies ownership.
3. System returns link details and allowed metadata.

Expected result: User sees details for the owned link.

Important failure cases: Link not found, link owned by another user, soft-deleted link.

## 13. Editing an Owned Link

Actor: Registered user.

Preconditions: The user is authenticated and owns the link.

Main flow:

1. User submits allowed updates.
2. System validates the update.
3. System verifies ownership.
4. System persists changes and invalidates relevant cache.

Expected result: Link updates are reflected in future management and redirect behavior.

Important failure cases: Unauthorized request, invalid destination, attempt to change immutable alias, stale cache.

## 14. Disabling and Re-Enabling a Link

Actor: Registered user.

Preconditions: The user is authenticated and owns the link.

Main flow:

1. User changes the link active state.
2. System verifies ownership.
3. System persists the state change.
4. System invalidates relevant cache.

Expected result: Disabled links stop redirecting; re-enabled links redirect again if otherwise valid.

Important failure cases: Link not found, unauthorized request, expired link remains unavailable.

## 15. Soft Deleting a Link

Actor: Registered user.

Preconditions: The user is authenticated and owns the link.

Main flow:

1. User requests deletion.
2. System verifies ownership.
3. System marks the link as deleted instead of physically removing it.
4. System invalidates relevant cache.

Expected result: The link no longer appears as active or redirectable.

Important failure cases: Link not found, unauthorized request, repeated delete request.

## 16. Viewing Analytics

Actor: Registered user.

Preconditions: The user is authenticated and owns the link.

Main flow:

1. User opens analytics for a link or dashboard view.
2. System verifies ownership.
3. System returns approved metrics for the selected date range.
4. UI presents totals, approximate unique visitors, trends, referrers, device information, and recent activity where available.

Expected result: User can understand link activity without misleading precision.

Important failure cases: Unauthorized request, unsupported date range, incomplete data, aggregation delay.

## 17. Handling Analytics Failure During Redirect

Actor: Visitor.

Preconditions: Visitor opens an otherwise valid link and analytics persistence fails.

Main flow:

1. System resolves the link successfully.
2. Analytics recording fails or is deferred unsuccessfully.
3. System logs safe diagnostic context.
4. System still redirects when the link itself is valid.

Expected result: Analytics failure does not unnecessarily block a valid redirect.

Important failure cases: Redirect resolution failure, unsafe logging, repeated analytics failure hiding operational issues.
