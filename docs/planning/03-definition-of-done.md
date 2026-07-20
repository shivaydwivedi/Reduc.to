# Definition of Done

Generated code, passing one test, or a Codex completion claim does not by itself mean work is done.

## Task-Level Definition of Done

A task is complete only when:

- The approved acceptance criteria are satisfied.
- The change stays within the approved phase and scope.
- Relevant tests are added or updated.
- Relevant verification commands are run and reported.
- Security, validation, authorization, and privacy implications are addressed.
- Documentation is updated when behavior or decisions change.
- The diff is reviewed for unrelated changes.
- Risks, limitations, and skipped checks are reported.

## Phase-Level Definition of Done

A phase is complete only when its approved deliverables are present, internally consistent, reviewed by the project owners, and not mixed with later-phase work.

Phase completion does not authorize the next phase unless the owners explicitly approve moving forward.

## Release-Level Definition of Done

The first release is complete only when registered users can manage links end to end, visitors can use short URLs, approved analytics work as documented, important security controls are implemented, automated checks pass, deployment readiness is documented, and known limitations are clearly disclosed.

## Code-Quality Requirements

Implementation should be readable, focused, typed, validated, and organized around clear responsibilities. Route handlers should remain thin where possible, business logic should live in services, and data access should be isolated appropriately.

Important invariants must be enforced at the database level where applicable.

## Test Requirements

Tests should match risk and scope. Expected coverage includes unit tests, API integration tests, frontend component tests, and important end-to-end smoke tests as the relevant layers are introduced.

Tests must cover important success and failure paths, especially authentication, authorization, validation, redirects, expiration, disabled links, cache invalidation, and analytics failure behavior.

## Security Review Requirements

Security-sensitive work requires review of authentication, authorization, cookie behavior, CSRF strategy, input validation, URL safety, reserved aliases, rate limiting, safe logging, secret handling, dependency risk, and privacy impact.

No task may claim a security control is implemented unless it is supported by code, configuration, and verification.

## Documentation Requirements

Documentation must remain synchronized with implementation. Architecture decisions, security trade-offs, API behavior, environment assumptions, and operational concerns should be documented when introduced.

Documents must clearly distinguish approved, planned, deferred, future, and excluded functionality.

Repository-foundation changes should keep setup documentation, workspace scripts, and tooling decisions aligned with the files that actually exist.

## Manual Verification Requirements

Manual verification steps should be provided when user-visible behavior changes, when automated tests do not fully cover the behavior, or when setup requires human review.

## Pull-Request Expectations

Pull requests should have focused diffs, clear summaries, linked decisions when relevant, verification results, known risks, and no unrelated refactoring. Agents must not create pull requests unless explicitly instructed.

## Deployment Readiness Requirements

Deployment readiness requires approved environment configuration, secret management, health and readiness checks, database migration strategy, Redis behavior, logging expectations, CORS and cookie configuration, and rollback considerations.

Deployment is not allowed without explicit approval.

## Portfolio-Readiness Requirements

Portfolio readiness requires clear documentation of architectural decisions, trade-offs, testing strategy, security posture, privacy model, deployment model, and project boundaries. The project should be explainable in interviews without overstating what is implemented.

## Conditions That Prevent Completion

Work must not be declared complete when:

- Approved requirements are missing.
- Unrelated scope is included.
- Tests or checks fail without explanation.
- Verification was skipped without explanation.
- Security or privacy claims are unsupported.
- Documentation contradicts implementation.
- Future functionality is presented as completed first-release scope.
- Required owner approval has not been granted.
