# Lockedin Execution Tracker

Last updated: 2026-06-23

## How To Use
- This file is the running execution source of truth for implementation work.
- Check tasks off as they are completed and merged to `main`.
- Add short notes under each phase when scope changes or new blockers are discovered.

## Phase Status
- [x] Phase A: Payment system fixes, payment/auth observability, and high-risk security fixes in those paths
- [x] Phase B: Goal sharing improvements and Hall of Integrity mission-count correction
- [ ] Phase C: Wallet system audit and targeted improvements
- [ ] Phase D: Documentation updates, security sweep, and production-readiness/release sweep
- [ ] UX Audit: Admin page, auth flow, and core page redesign recommendations

## Phase A
Status: Completed and merged

- [x] Align backend/environment references to `quick-starfish-723`
- [x] Fix payment confirmation flow so terminal failures do not loop forever
- [x] Add bounded retry/timeout handling for Paystack confirmation
- [x] Improve payment/auth observability on failure paths
- [x] Close exposed notification creation mutation
- [x] Validate with `npx tsc --noEmit`
- [x] Validate with `npx convex dev --once --env-file .env.local`
- [x] Validate with `npm run build`
- [x] Push branch, open PR, merge to `main`

Notes:
- PR merged: `#3`

## Phase B
Status: Completed and merged

- [x] Redefine Hall of Integrity mission counts as funded/activated protocols
- [x] Remove stale mission counter writes from verification flow
- [x] Update leaderboard, community, profile, and admin surfaces to use corrected counts
- [x] Improve share copy for activation/completion/failure/pre-funding states
- [x] Validate with `npx tsc --noEmit`
- [x] Validate with `npx convex dev --once --env-file .env.local`
- [x] Validate with `npm run build`
- [x] Push branch, open PR, merge to `main`

Notes:
- PR merged: `#4`

## Phase C
Status: In progress

- [x] Audit existing wallet backend and confirm what is truly functional
- [x] Correct wallet ledger semantics where current transaction typing is misleading
- [x] Improve wallet balance visibility for users
- [x] Expose recent wallet ledger activity to users
- [x] Expose withdrawal flow to users with clear status visibility
- [x] Review pending/admin withdrawal flow for correctness
- [x] Keep stake-per-vault as the active model; avoid accidental wallet-first rebuild
- [x] Validate with `npx tsc --noEmit`
- [x] Validate with `npx convex dev --once --env-file .env.local`
- [x] Validate with `npm run build`
- [ ] Push branch, open PR, merge to `main`

Notes:
- Active product posture remains stake-per-vault, not wallet-first.
- Wallet-related code is being treated as supporting infrastructure plus targeted UX improvements.
- Wallet and withdrawal foundation already existed on `main`; this completion pass is focused on closing the remaining correctness gap instead of rebuilding the flow.
- New correction in progress: withdrawal escrow transactions are now being linked directly to withdrawal records so completion/failure/rejection updates are deterministic.
- Admin extraction queue is being upgraded to support explicit rejection before transfer so capital can be returned cleanly without forcing a Paystack attempt.

## Phase D
Status: Pending

- [ ] Update authoritative documentation after implementation stabilizes
- [ ] Reconcile documentation drift in security and deployment docs
- [ ] Run broader security sweep across auth, payments, admin, notifications, and webhooks
- [ ] Add or refine production runbooks and handover materials
- [ ] Perform release-readiness checklist
- [ ] Validate with `npx tsc --noEmit`
- [ ] Validate with `npx convex dev --once --env-file .env.local`
- [ ] Validate with `npm run build`
- [ ] Push branch, open PR, merge to `main`

## UX Audit
Status: Pending approval before implementation

- [ ] Audit admin command center UX
- [ ] Audit auth and verification journey
- [ ] Audit core product pages for redesign opportunities
- [ ] Produce recommendations before any redesign implementation begins

## Open Items
- Sentry/bug-log coverage still needs a fuller pass beyond the targeted Phase A improvements.
- Security documentation still contains drift that should be reconciled in Phase D.
- Wallet architecture must stay aligned with licensed-partner/compliance direction before any live wallet rollout.
