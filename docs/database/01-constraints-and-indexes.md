# Constraints and Indexes

Status: Phase 4 implemented in `apps/api/prisma/schema.prisma` and `apps/api/prisma/migrations/20260721181500_initial_database_foundation/migration.sql`. The migration SQL has not been applied to a live PostgreSQL database locally.

## Primary Keys

All core entities use UUID v7 primary keys:

- `User.id`
- `Link.id`
- `RefreshSession.id`
- `RefreshToken.id`
- `ClickEvent.id`
- `DailyLinkStatistic.id`

## Foreign Keys

- `Link.userId` references `User.id`.
- `RefreshSession.userId` references `User.id`.
- `RefreshToken.sessionId` references `RefreshSession.id`.
- `RefreshToken.replacedByTokenId` optionally references `RefreshToken.id`.
- `ClickEvent.linkId` references `Link.id`.
- `DailyLinkStatistic.linkId` references `Link.id`.

Deletes should be restrictive or soft at the application level. Hard cascade deletion is deferred until account deletion policy is approved.

Phase 4 implementation: relation foreign keys use `ON DELETE RESTRICT`; the refresh-token self-reference uses `ON DELETE NO ACTION`.

## Unique Constraints

- `User.email` unique on normalized email.
- `Link.lookupKey` unique across all rows, including soft-deleted links.
- `RefreshToken.tokenHash` unique.
- `DailyLinkStatistic(linkId, date)` unique.

The `Link.lookupKey` constraint is the canonical public namespace. It prevents ambiguity between generated codes and custom aliases.

## Check Constraints

Recommended constraints:

- `Link.lookupKey = lower(Link.lookupKey)`.
- `Link.displayKey` is not empty.
- `Link.redirectType` is one of `TEMPORARY_302`, `PERMANENT_301`.
- `Link.expiresAt` is null or greater than `Link.createdAt`.
- `DailyLinkStatistic.totalClicks >= 0`.
- `DailyLinkStatistic.approximateUniqueVisitors >= 0`.
- `RefreshSession.expiresAt > RefreshSession.createdAt`.
- `RefreshToken.expiresAt > RefreshToken.issuedAt`.
- `RefreshToken.consumedAt` is null or greater than or equal to `RefreshToken.issuedAt`.
- `RefreshToken.revokedAt` is null or greater than or equal to `RefreshToken.issuedAt`.

Phase 4 implementation: these checks are added directly in the migration SQL because Prisma schema does not express PostgreSQL check constraints.

Regex-like constraints for alias rules may be enforced in application validation and optionally repeated in PostgreSQL where maintainable.

## Partial Indexes

- Active owner links: index `Link(userId, createdAt desc)` where `deletedAt is null`.
- Active redirectable links may use `Link(lookupKey)` with filters, but the unique `lookupKey` index is already the primary redirect lookup.
- Active refresh sessions: index `RefreshSession(userId, revokedAt, expiresAt)`.
- Active refresh tokens: index `RefreshToken(sessionId, issuedAt)`.

## Composite Indexes

- `Link(userId, createdAt desc)` for dashboard listing.
- `Link(userId, updatedAt desc)` for recently modified lists.
- `Link(userId, isActive, createdAt desc)` for status filters.
- `Link(userId, expiresAt)` for expiration filters.
- `ClickEvent(linkId, occurredAt desc)` for recent activity.
- `ClickEvent(linkId, occurredAt)` for timeseries and retention scans.
- `ClickEvent(linkId, visitorHash, occurredAt)` for approximate unique visitor aggregation.
- `DailyLinkStatistic(linkId, date)` for dashboard trends.
- `RefreshToken(tokenHash)` for refresh lookup and reuse detection.
- `RefreshToken(sessionId, consumedAt, revokedAt)` for current-token and cleanup queries.

## Soft-Delete Considerations

Soft-deleted links keep their `lookupKey`. The unique namespace does not permit reuse in the first release. Dashboard queries should usually filter `deletedAt is null` unless viewing deleted records becomes an approved feature.

## Query Patterns Supported

- Public redirect: `Link.lookupKey`.
- Owner link list: `Link.userId + createdAt`.
- Owner filtering: `Link.userId + isActive + createdAt`, `Link.userId + expiresAt`.
- Link detail authorization: `Link.id + userId` or fetch by `id` then compare owner.
- Analytics recent activity: `ClickEvent.linkId + occurredAt`.
- Analytics long-range trend: `DailyLinkStatistic.linkId + date`.
- Session lookup: `RefreshToken.tokenHash`.
- Session rotation history: `RefreshToken.sessionId + issuedAt`.
- Session cleanup: `RefreshSession.expiresAt`, `RefreshSession.revokedAt`.

## Write Amplification Trade-Offs

Indexes speed dashboard and analytics reads but slow writes. The first implementation should add only indexes tied to known endpoint queries. Dimension-specific analytics indexes can wait until query volume proves they are needed.

## Indexes Explicitly Deferred

- Full-text or trigram search indexes for link titles and URLs.
- Dimension aggregate indexes for referrers, browsers, operating systems, and devices.
- Geolocation indexes.
- Admin reporting indexes.
- Account-deletion cascade support indexes.

## Phase 4 Intentional Omissions

- A partial active-links index is not included in the initial migration because the implemented composite owner/status indexes support the approved query patterns without adding a Prisma-untracked partial index yet.
- Alias regex validation is intentionally deferred to application validation in the later link phase.
