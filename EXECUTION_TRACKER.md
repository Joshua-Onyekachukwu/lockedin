# Lockedin Execution Tracker

Last updated: 2026-06-29

## How To Use
- This file is the running execution source of truth for implementation work.
- Check tasks off as they are completed and merged to `main`.
- Add short notes under each phase when scope changes or new blockers are discovered.
- When a phase is active on a branch but not merged yet, keep it marked in progress here.

## Phase Status
- [x] Phase A: Payment system fixes, payment/auth observability, and high-risk security fixes in those paths
- [x] Phase B: Goal sharing improvements and Hall of Integrity mission-count correction
- [x] Phase C: Wallet system audit and targeted improvements
- [x] Phase E: Goal management controls and wallet top-nav access
- [x] Phase D: Documentation updates, security sweep, and production-readiness/release sweep
- [ ] Phase F: Wallet productization and first-class wallet dashboard
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
Status: Completed

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
- [x] Push branch, open PR, merge to `main`

Notes:
- Phase C was completed as a targeted wallet-supporting improvement pass, not a wallet-first product rebuild.
- Product posture remains stake-per-vault, with wallet capabilities supporting funding, visibility, and withdrawals.
- The wallet and withdrawal foundation already existed on `main`; this phase closed the remaining correctness gap instead of rebuilding the stack.
- PR merged: `#7`
- Withdrawal escrow transactions are now linked directly to withdrawal records so completion/failure/rejection updates are deterministic.
- Admin extraction queue now supports explicit rejection before transfer so capital can be returned cleanly without forcing a Paystack attempt.

## Phase E
Status: Completed

- [x] Add owner controls to edit the stake amount before funding starts
- [x] Block amount edits once a funding attempt is attached to the vault
- [x] Add safe owner delete for awaiting-funding protocols
- [x] Add safe owner delete for completed protocols
- [x] Block delete for active protocols
- [x] Add the missing wallet entry to the top navigation
- [x] Validate with `npx tsc --noEmit`
- [x] Validate with `npx convex dev --once --env-file .env.local`
- [x] Validate with `npm run build`
- [x] Push branch, open PR, merge to `main`

Notes:
- Goal-management controls now live on the vault detail page so users can manage a protocol from the screen they already use.
- Delete now uses backend state checks plus cleanup of linked evidence and witness records rather than a loose frontend-only action.
- The wallet flow still lives in the profile surface, and this phase added the missing dashboard top-nav entry to reach it from the primary product shell.
- PR merged: `#8`

## Phase D
Status: Completed

- [x] Update authoritative documentation after implementation stabilizes
- [x] Reconcile documentation drift in security and deployment docs
- [x] Run broader security sweep across auth, payments, admin, notifications, and webhooks
- [x] Add or refine production runbooks and handover materials
- [x] Perform release-readiness checklist
- [x] Validate with `npx tsc --noEmit`
- [x] Validate with `npx convex dev --once --env-file .env.local`
- [x] Validate with `npm run build`
- [x] Push branch, open PR, merge to `main`

Notes:
- Admin authorization now fails closed and requires verified email, `user.isAdmin === true`, and allowlist membership.
- Direct public Mono BVN lookup has been internalized; the supported user-facing path remains `mono.verifyIdentity`.
- Email verification now requires an explicit valid `SITE_URL` instead of silently falling back to an assumed production domain.
- Withdrawal requests are rate-limited and show masked destination account numbers on admin/user read surfaces.
- Phase D added operator documentation in `ADMIN_PAYMENTS_RUNBOOK.md`, `ADMIN_SETTINGS_RUNBOOK.md`, and `RESPONSIVE_QA_CHECKLIST.md`.

## Phase F
Status: In progress on branch `phase-wallet-v1-foundation`

- [x] Re-sync wallet implementation branch onto latest `origin/main`
- [x] Restore in-progress wallet work after branch rebase/recreation
- [x] Resolve the current `convex/payments.ts` merge conflict cleanly
- [x] Add dedicated `/wallet` route as a first-class product surface
- [x] Add wallet summary queries for available, locked, pending, and total movement
- [x] Add normalized wallet ledger/activity feed for deposits, withdrawals, stake activity, refunds, and rewards
- [x] Add wallet page funding flow
- [x] Add wallet page withdrawal request flow
- [x] Allow wallet balance to activate protocols without forcing a new Paystack payment
- [x] Auto-activate new protocols when wallet balance already covers the stake
- [x] Remove duplicated wallet detail surface from the profile page
- [x] Replace the old duplicate/misleading wallet affordance with a wallet balance pill in the top bar
- [x] Start wallet UI polish pass with calmer typography, color hierarchy, and reduced dashboard noise
- [x] Reduce the `vaultLifecycle:completeMaturedVaults` timeout risk with indexed maturity lookup and batched completion
- [x] Improve admin finance parity for open withdrawals, pending deposits, and wallet balance visibility
- [x] Validate with `npm run lint`
- [x] Validate with `npx convex dev --once --env-file .env.local`
- [x] Validate with `npm run build`
- [x] Validate with `npx tsc --noEmit`
- [x] Perform smoke checks on the wallet and finance surfaces
- [ ] Push branch, open PR, and merge to `main`

Notes:
- This phase is not a rollback to the old wallet implementation.
- This phase is a controlled wallet productization pass on top of the current stake-per-vault platform.
- The goal is to make wallet a first-class financial dashboard without breaking the existing protocol lifecycle.
- Admin surfaces are expected to remain operationally authoritative, but user wallet visibility must align with what operators see.
- Current validation status:
  - `npm run lint` passes
  - `npm run build` passes
  - `npx tsc --noEmit` passes
  - `npx convex dev --once --env-file .env.local` passes
  - local runtime smoke check confirms `/`, `/wallet`, and `/dashboard` load/redirect correctly for an unauthenticated user
  - browser pass confirms the old `completeMaturedVaults` timeout is no longer appearing after the fix window
- Current follow-up items discovered during smoke testing:
  - React hydration mismatch warning in dev
  - authenticated end-to-end wallet/admin QA is still partially blocked by the current email verification sender restriction in local/dev

## UX Audit
Status: Pending approval before implementation

- [ ] Audit admin command center UX
- [ ] Audit auth and verification journey
- [ ] Audit core product pages for redesign opportunities
- [ ] Produce recommendations before any redesign implementation begins

## Open Items
- Sentry/bug-log coverage still needs a fuller pass beyond the targeted Phase A improvements.
- Some documentation still needs another refresh now that Phase F is active.
- Wallet architecture must stay aligned with licensed-partner/compliance direction before any live wallet rollout.
- Finance semantics must remain consistent across wallet, payments, admin, and audit surfaces.
