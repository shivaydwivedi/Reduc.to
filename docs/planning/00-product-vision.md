# Product Vision

## Product Name

Reduc.to

## Vision

Reduc.to is a professional URL shortening and privacy-aware analytics platform for registered users who need to create, manage, and understand links. The first release should be focused enough to complete, but substantial enough to demonstrate production-minded engineering across authentication, redirects, analytics, frontend experience, testing, documentation, and deployment planning.

## Problem Statement

Simple short-link tools are easy to build at demo quality but harder to build responsibly. A useful platform must keep redirects fast, prevent unsafe or unauthorized changes, avoid unnecessary personal-data collection, and give link owners clear analytics without overstating accuracy.

## Proposed Solution

Reduc.to will let registered users create generated or custom short links, manage link state and metadata, and view privacy-aware analytics. Visitors will open short URLs and receive browser redirects. Analytics collection will be designed so redirect performance is not unnecessarily delayed.

## Target Users

- Visitors who open short URLs.
- Registered users who create, manage, and analyze their own links.

Anonymous link creation and administrator functionality are excluded from the first release.

## Product Goals

- Create reliable generated short links.
- Support approved custom aliases.
- Redirect visitors quickly and safely.
- Let owners manage active, disabled, expired, edited, and deleted links.
- Provide useful analytics without unnecessary personal-data retention.
- Offer a polished, responsive React dashboard.

## Engineering Goals

- Use TypeScript across the monorepo.
- Build a Fastify API with clear service boundaries.
- Use PostgreSQL with database-level invariants.
- Use Redis for redirect caching and rate-limiting support.
- Validate external input.
- Enforce ownership authorization.
- Maintain structured logging and clear error handling.
- Support automated testing, local development, CI, and future deployment.

## Portfolio Goals

Reduc.to should demonstrate system design judgment, secure authentication planning, data modeling, redirect performance trade-offs, privacy-aware analytics design, frontend product polish, and disciplined documentation.

## Product Principles

- Keep the first release focused.
- Prefer explicit behavior over hidden magic.
- Keep redirects fast.
- Treat privacy as a design constraint.
- Avoid claims that the implementation does not support.
- Document trade-offs when decisions affect security, performance, or user trust.

## Success Criteria

- Registered users can complete the core link-management workflow.
- Visitors can open valid short links and receive correct redirects.
- Disabled, expired, deleted, and missing links are handled predictably.
- Analytics are useful and described honestly as approximate where applicable.
- Security and privacy decisions are documented before implementation.
- The codebase is testable, maintainable, and suitable for resume discussion.

## Long-Term Direction

Future improvements may include richer analytics, export features, country-level reporting, durable background processing, custom domains, teams, billing, and administrator tools. These are not committed first-release scope.
