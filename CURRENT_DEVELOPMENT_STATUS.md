# Current Development Status

This document explains what Lockedin currently is, what is already implemented on `main`, what was shipped recently, and what still needs work.

## 1. Current Product Definition

Lockedin is a stake-backed accountability platform.

Current live behavior on `main`:

- a user creates a protocol
- the protocol starts in `awaiting_funding` unless wallet balance already covers the stake
- the user can fund that protocol through Paystack or activate it from wallet balance when available
- the protocol becomes active after successful wallet activation, payment verification, or reconciliation
- the user submits execution evidence
- witnesses review the evidence and provide written reasons
- penalties accrue for missed requirements
- manual full forfeiture is reserved for severe repeated breach conditions and includes a revert path for admin mistakes

This is the current merged product posture.

## 2. Current Build Posture

The product is now in a hybrid posture:

- the stake-per-vault lifecycle remains the core model
- wallet is now a first-class financial surface on `main`
- protocol funding still matters per vault, but wallet balance can now activate eligible protocols without forcing a new Paystack payment
- the latest wallet recovery, admin safety, mobile responsiveness, and light PWA shell work are already merged to `main`

Important clarification:

- wallet support exists in backend/accounting/admin surfaces and is now exposed as a dedicated user-facing route
- the old wallet-supporting phases are complete
- the wallet productization phase is no longer just branch work; the major foundation is merged and live on `main`

## 3. Implemented Features

### Identity and Access

- Convex Auth sign-in
- email verification gate
- Google auth support through env-based configuration
- root-level route gating for auth and verification
- admin-only route protection
- fail-closed admin authorization requiring verified email, `user.isAdmin === true`, and `ADMIN_EMAIL_ALLOWLIST` membership

### Protocol Creation and Management

- protocol creation using templates or custom setup
- pain tier selection
- duration and frequency rules
- awaiting-funding state before activation
- private protocol detail page
- owner controls to edit unfunded stake amount
- owner controls to delete only unfunded or completed protocols

### Payments and Finance

- Paystack protocol funding
- wallet top-up flow from `/wallet`
- wallet overview cards and normalized wallet ledger/activity feed
- wallet-balance protocol activation
- auto-activation of newly created protocols when wallet balance already covers the stake
- backend verification and reconciliation
- webhook handling
- payment instrumentation and debugging hooks
- withdrawal request rate limiting
- withdrawal request cancellation before admin processing begins
- cached bank-account resolution to reduce repeated Paystack resolve pressure during withdrawal testing
- masked destination display on read surfaces
- deterministic withdrawal transaction linkage
- admin approval and rejection controls for withdrawals

### Execution Evidence

- execute-log modal
- note support
- multiple proof images
- full log detail viewing
- witness reports visible in log detail
- scroll-safe modal behavior

### Witness System

- witness request flow
- witness application flow
- witness acceptance
- witness removal
- witness verification reports with required reasons
- max-3 witness enforcement logic

### Social and Visibility

- community discovery
- witness pool
- public share links using `/share/$vaultId`
- richer share message copy
- Hall of Integrity mission counts based on funded or activated protocols

### Admin

- admin dashboard
- dedicated user-detail route
- manual verification and override tooling
- audit logging
- payment support tooling
- withdrawal and payout operation surfaces
- manual breach enforcement safeguards based on repeated penalty history
- recent forfeiture review with admin revert path
- admin settings route for accounting recompute and seed-data purge controls

### Mobile and App Shell

- reduced mobile layout pressure on dashboard, vault detail, and admin
- horizontal-scroll containment for dense admin navigation/tables
- PWA manifest wiring
- service worker registration
- offline fallback page for non-financial shell access

## 4. Work Recently Completed

### Completed And Merged

- payment hardening and retry behavior
- Hall of Integrity mission-count correction
- public share preview route and share-copy improvements
- wallet-supporting finance correctness improvements
- goal-owner controls and top-nav wallet access
- Phase D documentation, security, and release-readiness sweep
- wallet productization foundation on `main`
- wallet recovery flow for pending withdrawals
- admin breach-forfeiture revert flow
- vault completion timeout-risk reduction
- mobile responsiveness pass for dashboard, vault detail, and admin
- light PWA shell wiring
- safe dependency refresh across the current runtime/tooling stack

### Current In-Progress Work

- documentation refresh so active docs reflect the current merged product
- framework-level security remediation for the remaining TanStack Start advisory chain
- broader responsive QA across the rest of the route set
- post-merge authenticated manual QA by product/operator accounts

## 5. Active Risks And Follow-Up Areas

### Wallet Phase Risks

Still needs disciplined delivery:

- wallet work must stay aligned with the current merged `main` behavior
- finance semantics must stay aligned between user wallet views and admin tooling
- privacy-safe masking must be preserved on user-facing read surfaces
- the wallet-first additions must not regress the existing protocol-first flow
- authenticated QA still needs to confirm the wallet-funded create flow, withdrawal cancel flow, and admin recovery flow end to end
- local verification email restrictions currently block full browser QA on newly created test accounts

### Release Hardening

Still needs continued validation:

- full branch validation before PR (`lint`, `build`, Convex validation, smoke checks)
- continued monitoring of webhook and verify reconciliation behavior
- completion of the approved monitoring roadmap once Sentry setup is fully available
- controlled framework upgrade for the remaining audit findings instead of a blind `npm audit fix --force`

### Deployment Alignment

High-risk area:

- frontend and backend deployment mismatch has caused breakages before
- Paystack and OAuth alignment must be checked during every environment move
- `SITE_URL` must point to the active frontend domain before email verification is considered operational

### Documentation Drift

There are still many markdown files in the repo from earlier planning phases.

Use these as the active handoff set:

- `README.md`
- `ENGINEERING_HANDOVER.md`
- `CURRENT_DEVELOPMENT_STATUS.md`
- `EXECUTION_TRACKER.md`
- `AI_OPERATING_MODEL.md`
- `DEPLOYMENT_SINGLE_SOURCE_OF_TRUTH.md`
- `LOCKEDIN_SYSTEM_DOCUMENTATION.md`
- `SECURITY.md`
- `ADMIN_PAYMENTS_RUNBOOK.md`
- `ADMIN_SETTINGS_RUNBOOK.md`
- `RESPONSIVE_QA_CHECKLIST.md`

## 6. Current Open Product And Ops Decisions

These are not fully resolved in the active build:

- how far the wallet should go in V1 versus later finance expansion
- how much admin expansion is required to support the new wallet dashboard cleanly
- how far payment operations should go before licensed-partner integration
- how much observability should be added before wider release
- whether to keep the light PWA shell only or add a broader install/prompt experience later

## 7. Recommended Next Engineering Priorities

1. complete the coordinated TanStack Start / framework security upgrade that remains after the safe dependency pass
2. run authenticated QA on wallet activation, withdrawal cancellation, admin breach revert, and payment operations
3. continue the approved monitoring roadmap once Sentry setup is ready
4. extend the responsive QA pass across auth, community, leaderboard, and secondary admin routes
5. continue documentation cleanup once the current handoff set is stable

## 8. Guidance For New Developers

If you are taking over this repo:

1. start with `README.md`
2. read `ENGINEERING_HANDOVER.md`
3. read `CURRENT_DEVELOPMENT_STATUS.md`
4. read `EXECUTION_TRACKER.md`
5. read `AI_OPERATING_MODEL.md`
6. confirm the active environment before running any deploy command
7. assume `main` already contains the wallet foundation, admin revert tooling, mobile pass, and light PWA shell before planning new work
