# Backend Platform Alternatives (Post-Convex Options)

This document outlines backend platforms we could move to in the future, the pros/cons versus Convex, and a migration plan that keeps the business safe.

## Why You Might Switch (and why you might not)

You usually switch away from Convex when you need one or more of:
- Direct SQL + complex reporting queries at scale
- Multi-service architecture (separate workers, queues, data warehouse)
- Larger hiring pool of “standard” backend engineers (Postgres + REST/GraphQL)
- More control over infra/vendor risk

You usually stay on Convex when:
- You want maximum speed shipping product iterations
- You want simple real-time data + strong type safety
- Your data model is still evolving rapidly

## Option 1 — Supabase (Postgres + Auth + Storage + Edge Functions)

### Pros
- Standard **Postgres** (easy hires, easy tooling, easy reporting)
- Built-in **Auth**, **Storage**, **Row Level Security (RLS)**
- Works well with Vercel/TanStack Start
- Easy to add analytics/warehouse later (BigQuery/Snowflake) because data is SQL-native

### Cons
- You must design RLS carefully (security footguns if misconfigured)
- Real-time is good but not as “native” and ergonomic as Convex for reactive apps
- Background jobs/queues require extra pieces (pg_cron, external workers, or a queue service)

### Best for Lockedin when
- You want SQL-native reporting (cohorts, retention, funnel, activation)
- You want to grow into a more conventional SaaS architecture

## Option 2 — “Own Stack” on Postgres (Neon/AWS RDS) + API (NestJS/Fastify) + ORM (Prisma/Drizzle)

### Pros
- Maximum control over code and infra
- Classic SaaS architecture (clean separation, easier enterprise/security reviews)
- Easy to add queues/workers (BullMQ, Temporal, Inngest, Trigger.dev)

### Cons
- More engineering overhead: auth, storage, policies, migrations, ops
- Slower iteration speed early if not disciplined

### Best for Lockedin when
- You have product-market fit and want maximum control and scale flexibility

## Option 3 — Firebase (Firestore + Auth + Cloud Functions)

### Pros
- Very fast to ship, strong Auth
- Great client SDKs, good for mobile-first

### Cons
- Complex queries become painful/expensive
- Vendor lock-in and non-SQL reporting friction
- Payments and operational workflows often become function-sprawl

### Best for Lockedin when
- You’re optimizing for mobile speed and simple data shapes (not ideal for finance-like reporting)

## Option 4 — Hasura (GraphQL on Postgres) + Auth Provider

### Pros
- Instant GraphQL layer on Postgres
- Great for building admin/ops UIs quickly
- Strong SQL foundation

### Cons
- Business logic still needs services/actions (you can’t escape backend code)
- Auth/RLS complexity is real

### Best for Lockedin when
- You want a GraphQL-first internal API and strong admin tooling

## Recommendation (Best Fit for Lockedin)

**Primary recommendation: Supabase (Postgres)**

Why:
- Lockedin will benefit from SQL reporting as we mature (activation, adherence, cohort behavior, payment reconciliation KPIs).
- It keeps us in a mainstream SaaS foundation without slowing us down too early.
- It supports Auth + Storage out of the box, which maps cleanly to our current needs.

## Migration Plan (Do This Only When Needed)

### Phase 0 — Make Migration Possible Without Migrating
- Create a “domain boundary” layer in the codebase:
  - Protocol lifecycle (create/fund/activate/close)
  - Evidence logging and verification
  - Witness relationships
  - Payments reconciliation
- Keep these as pure functions + thin adapters (Convex adapter today).

### Phase 1 — Dual-write the critical ledger (optional but safest)
- For a period, write key immutable events to a SQL table as well:
  - protocol_created, protocol_funded, log_submitted, log_verified, penalty_accrued, payout_initiated, payout_completed
- This de-risks the cutover by having a validated event history.

### Phase 2 — Data model mapping
- Map Convex tables to SQL schema:
  - users
  - protocols (vaults)
  - goals
  - logs
  - witness_relationships
  - deposits/withdrawals/transactions
  - audit tables

### Phase 3 — Replace reads first
- Move read-only endpoints to SQL first (dashboards, reporting, admin tools).
- Keep Convex as the write system temporarily.

### Phase 4 — Replace writes + reconciliation
- Move payment reconciliation and state transitions into the SQL backend.
- Cut over the frontend to the new API fully.

### Phase 5 — Decommission Convex
- Freeze writes in Convex
- Backfill final deltas
- Shut off Convex functions

## Practical “Switch Triggers”

Only consider migration when at least one is true:
- Reporting requirements become business-critical and slow/expensive
- You need multi-region or complex infra patterns Convex can’t satisfy
- You have a larger engineering team and want standard backend hiring

