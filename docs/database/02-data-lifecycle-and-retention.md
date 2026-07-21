# Data Lifecycle and Retention

Status: Phase 4 database structures are implemented. Cleanup jobs and product behavior have not started.

## Creation

- Users are created during registration with normalized email and password hash.
- Links are created by authenticated registered users only.
- Refresh sessions and initial refresh-token records are created during register or login.
- Click events are created only for valid redirects that pass resolution.
- Daily aggregates are created or updated by aggregation jobs.

## Updates

- User profile updates are deferred.
- Link destination URL, title, active state, expiration, and redirect type may be updated when approved by endpoint implementation.
- Custom aliases are immutable in the first release.
- Refresh sessions rotate by transactionally consuming the current `RefreshToken` and creating a successor `RefreshToken`.
- Daily aggregates update from raw click events.

## Soft Deletion

Links use soft deletion via `deletedAt`. Soft-deleted links do not redirect and are normally hidden from owner lists. Keys from soft-deleted links are not reused in the first release.

User deletion policy is deferred.

## Expiration

Link expiration is evaluated against UTC timestamps. Expired links do not redirect even if active. Redis TTLs for redirect cache entries must not extend beyond `expiresAt`.

## Cleanup

Cleanup jobs should eventually handle:

- Raw click events older than 90 days.
- Expired or revoked refresh sessions and their refresh-token records after a cleanup buffer.
- Old operational logs according to deployment policy.

Cleanup jobs must be observable and retryable.

## Retention

- Raw `ClickEvent` rows: 90 days.
- `DailyLinkStatistic`: retained indefinitely.
- `RefreshSession` and `RefreshToken`: retained until expiry plus cleanup buffer.
- Soft-deleted `Link`: retained.
- `User`: retained unless future account-deletion policy is approved.

## Aggregation

Daily aggregation uses UTC date buckets. Aggregates should be compact and rebuildable from retained raw events when still within the 90-day window. After raw deletion, long-range totals rely on aggregate rows.

## Session Cleanup

Expired and revoked refresh sessions and their refresh-token records should not remain query-hot forever. Cleanup should remove or archive them after a buffer long enough for security review, reuse detection, and operational debugging.

## Failure Handling

If cleanup fails, data may be retained longer than intended. This is safer than deleting too aggressively but has privacy and storage implications. Failures must be logged with safe context and surfaced in operations.

If aggregation fails, dashboards may show stale totals. Raw events within retention can be replayed to rebuild affected days.

## Data Recovery Implications

Soft-deleted links can be inspected internally if needed, but restore behavior is not part of the first release unless approved. Raw click events cannot be recovered after retention deletion unless backups contain them, and backup retention must be considered in the privacy model later.

## Phase 4 Implementation Notes

- The initial migration preserves restrictive delete behavior so hard deletion cannot accidentally remove owned links, session state, click events, or daily statistics.
- Link soft deletion is represented by `deletedAt`; no application behavior for deletion or restoration is implemented in this phase.
- Raw click-event retention remains a future cleanup-job responsibility; no purge job is implemented.

## Privacy Implications

Reduc.to does not store raw IP addresses. Visitor hashes are approximate and retained only with raw click events. Referrers and user-agent data are minimized before storage.

## Deferred Account-Deletion Policy

Account deletion, export, anonymization, and legal-retention behavior are deferred. Until approved, users are retained and links remain owner-associated.
