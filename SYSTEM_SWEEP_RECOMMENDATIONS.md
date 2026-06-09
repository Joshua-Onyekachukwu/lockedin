# Lockedin — System Sweep Recommendations (Frontend + Backend)

This is a focused sweep of the system with practical improvements that increase reliability, safety, growth, and maintainability.

## A) Reliability (Highest Priority)

- **Stabilize verification gating everywhere**: never redirect based on `users.current` until the query has resolved; prefer stable “gate screens” over redirect loops.
- **Make auth state transitions explicit**: when auth changes (login/logout), invalidate critical queries (`users.current`, `admin.checkAdminStatus`) so UI never runs on stale identity state.
- **Graceful degraded verification**: if email backend is offline, the UI should always show the “manual verification” path (no dead buttons).

## B) Security & Abuse Resistance

- **Rate limit all sensitive actions** (not just payments): witness requests/applications, verification attempts, and any “admin trigger” action.
- **Audit trails for admin actions**: ensure every admin mutation writes a structured entry (who, what, why, metadata).
- **Minimize admin attack surface**:
  - Keep `/admin` unlinked (your choice is correct).
  - Require allowlist + DB admin flag, not just “logged in”.
  - Consider optional IP allowlisting for admin later (reverse proxy / Vercel edge / Cloudflare).

## C) Payments Hardening (Non-Custodial + Paystack)

- **Single source of truth** for protocol funding:
  - vault status transitions: `awaiting_funding → active` only inside reconciliation logic
  - refuse double-activation and refuse mismatched amount/email references
- **Unmatched payment operations**:
  - admin UI to resolve unmatched entries with reason
  - scheduled retry sweep + visibility (count, age, last retry error)
- **Operational dashboards**:
  - “stuck payments” view: pending deposits older than X minutes
  - “mode mismatch” view: test/live mismatches (should be near zero)

## D) Data Modeling & Query Performance (Convex)

- Ensure high-traffic queries are index-backed:
  - list vaults by user
  - list logs by goal/vault
  - list partnerships by vault + status
- Avoid broad “return v.any()” in production queries where possible; tighten returns validators for stable client contracts.
- Prefer pagination for large lists (audit logs, transactions, user lists).

## E) Frontend Architecture

- **Centralize gate logic**:
  - one place to determine: authenticated? verified? admin?
  - routes consume the same “identity state” instead of re-implementing checks differently
- **Reduce flicker**:
  - gate screens should be consistent, not quick redirects
  - prevent “flash of dashboard” when user is actually blocked
- **Keep code splitting disciplined**:
  - lazy-load heavy modals and admin subroutes (already in progress)
  - keep stable chunk naming and avoid importing huge libraries in root routes

## F) UX Improvements (Growth + Retention)

- **Protocol creation UX**:
  - show a clear lifecycle: Draft/Created → Awaiting Funding → Active → Completed/Failed
  - add a “Fund now” CTA wherever an awaiting-funding protocol appears
- **Evidence logging UX**:
  - “current cycle status” card: pending/approved/rejected and what to do next
  - strong upload feedback (progress, errors, retry)
- **Witness UX**:
  - structured approval reasons (optional) to increase clarity
  - “witness SLA” timing feedback (when approval is expected)

## G) Observability & Operations

- Add structured server-side error logging for:
  - Paystack verify failures (including response codes)
  - reconciliation unmatched reasons
  - cron failures (sweep/distribution)
- Track a few core metrics:
  - activation rate (created → funded)
  - check-in adherence rate (logs per cycle)
  - witness response latency
  - payment success rate and failure buckets

## H) Product Features Worth Adding (High ROI)

- **Protocol templates**: prefilled goals for common categories.
- **Team protocols**: small groups with shared witness pool.
- **Streak and compliance analytics**: weekly report, insights, and “risk score”.
- **Coach/witness marketplace** (premium): paid witnesses/coaches with verified profiles.

