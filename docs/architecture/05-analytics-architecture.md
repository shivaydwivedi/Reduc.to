# Analytics Architecture

Status: Approved design for Phase 2. Implementation has not started.

## Event Capture

Valid redirects produce a minimized click event after redirect resolution. Missing, disabled, expired, or deleted links may be counted later as operational metrics, but they do not create `ClickEvent` rows in the first analytics design.

## ClickEvent Minimization

Store:

- `id`
- `linkId`
- `occurredAt`
- `visitorHash`
- `referrerHost`
- `browserFamily`
- `operatingSystemFamily`
- `deviceType`
- `isBot`
- `source`

Do not store raw IP addresses. Do not retain complete user-agent strings long term. Parse user-agent information in memory and store minimized classifications.

## Visitor Hash

Approximate unique visitors use a scoped daily HMAC with a server-side secret. Inputs:

- link identifier
- normalized source network representation
- limited user-agent classification
- UTC date bucket

The raw source inputs are not stored. The hash is link-scoped and day-scoped so it is not a global person identifier. NAT, shared networks, browser changes, bot behavior, and secret rotation all limit accuracy.

## Referrer Sanitization

Store only a minimized `referrerHost` when available. Strip paths, query strings, fragments, credentials, and uncommon malformed values. Empty, same-origin, or blocked referrers may be stored as null or a safe enum value, decided during implementation.

## In-Process Buffer Design

The first release should use a small bounded in-process analytics buffer owned by the API process:

- Redirect path attempts to enqueue and continues.
- Each API instance owns an independent buffer.
- Buffer writes events to PostgreSQL in batches.
- Maximum queue size protects memory.
- When the FIFO buffer is full, reject and drop the newly arriving analytics event.
- Already queued events are not evicted.
- Dropped events increment an internal counter and emit rate-limited structured warnings with safe context.
- Graceful shutdown drains within a bounded timeout.

Naive unobserved promises are not acceptable because failures become invisible, shutdown loses work unpredictably, and backpressure is unmanaged.

## Batch Writing

Batch inserts reduce per-click write overhead. Failed batches may be retried a small number of times while the process is healthy. If the database is unavailable long enough, queued events may eventually fail with logs and metrics. If the buffer is full, newly arriving events are dropped while redirects continue.

## Backpressure and Drop Policy

When the queue is full, drop the newly arriving event and continue the redirect. Do not evict already queued events. Redirects should not block indefinitely waiting for analytics capacity.

## Logging and Metrics

Log:

- enqueue failures
- batch insert failures
- buffer drain timeout

Track at minimum:

- buffer depth
- dropped event count
- batch insert failure count
- shutdown drain timeout count

Logs must not include raw IP addresses, raw user-agent strings, raw referrers, or HMAC source inputs.

## Graceful Shutdown

On shutdown, stop accepting new events, flush queued batches until empty or timeout, then close database connections. Shutdown failure may lose buffered events and should be logged.

## Daily Aggregation

`DailyLinkStatistic` stores compact UTC daily totals:

- `linkId`
- `date`
- `totalClicks`
- `approximateUniqueVisitors`

Do not stuff referrer, browser, operating system, or device dimensions into the daily aggregate table in the first design. Recent detailed dimensions come from raw `ClickEvent` rows while retained.

## Query Strategy

- Recent detailed analytics: query `ClickEvent` within the 90-day retention window.
- Long-range totals and trends: query `DailyLinkStatistic`.
- Referrer and device breakdowns: query retained raw events initially; dimension aggregates may be added later if needed.

## Idempotency and Rebuilds

Aggregation jobs should be able to rebuild a day for a link from retained raw events. Exact idempotency mechanics are deferred. Once raw events are deleted after 90 days, rebuilding detailed historical dimensions is no longer possible from the primary database.

## Retention

Raw click events are retained for 90 days. Daily aggregates are retained indefinitely. Visitor hashes follow raw event retention.

## Future Durable Queue Migration

If event durability becomes more important, the in-process buffer can be replaced with a durable queue or outbox. The API should keep analytics handoff behind a small interface so the redirect path does not depend on the transport.

## Accuracy Limitations

Unique visitors are approximate. Analytics are not durable, exactly-once, or complete. Analytics may undercount when a process crashes, an API instance drops new events because its independent buffer is full, bots disguise themselves, browsers suppress headers, users share networks, or source classifications change.
