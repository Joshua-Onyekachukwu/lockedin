# Current Development Status

This document explains what Lockedin currently is, what is already implemented, what is actively being built, and what still needs work.

## 1. Current Product Definition

Lockedin is a stake-backed accountability platform.

Current live behavior on `main`:

- a user creates a protocol
- the protocol starts in `awaiting_funding`
- the user funds that protocol through Paystack
- the protocol becomes active after successful verification or reconciliation
- the user submits execution evidence
- witnesses review the evidence and provide written reasons
- penalties accrue for missed requirements

This is still the current merged product posture.

## 2. Current Build Posture

There are now two truths that matter:

- `main` remains protocol-first, not wallet-first
- an approved new workstream is in progress to make wallet a first-class product surface again

Active branch work:

- branch: `phase-wallet-v1-foundation`
- goal: introduce a dedicated wallet page, wallet summary, normalized ledger/activity view, funding flow, withdrawal flow, and admin-visible finance alignment
- status: in progress, not merged at the time of this update

Important clarification:

- wallet support already exists in backend/accounting/admin surfaces
- the old wallet-supporting phases were completed
- the new wallet productization phase is a broader product pass, not just a small visibility tweak

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
- backend verification and reconciliation
- webhook handling
- payment instrumentation and debugging hooks
- withdrawal request rate limiting
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
- admin settings route for accounting recompute and seed-data purge controls

## 4. Work Recently Completed

### Completed And Merged

- payment hardening and retry behavior
- Hall of Integrity mission-count correction
- public share preview route and share-copy improvements
- wallet-supporting finance correctness improvements
- goal-owner controls and top-nav wallet access
- Phase D documentation, security, and release-readiness sweep

### Active In-Progress Work

- dedicated wallet route and first-class wallet navigation
- wallet overview cards for available, locked, and pending funds
- normalized wallet ledger/activity feed
- wallet funding flow from the wallet page
- withdrawal request flow from the wallet page
- finance/admin alignment so user-visible wallet activity matches operator-facing finance tools
- documentation refresh so active docs reflect the current wallet phase and operating model

## 5. Active Risks And Follow-Up Areas

### Wallet Phase Risks

Still needs disciplined delivery:

- wallet work must be finished on top of latest `main`
- finance semantics must stay aligned between user wallet views and admin tooling
- privacy-safe masking must be preserved on user-facing read surfaces
- the wallet return should not regress the existing protocol-first flow

### Release Hardening

Still needs continued validation:

- full branch validation before PR (`lint`, `build`, Convex validation, smoke checks)
- continued monitoring of webhook and verify reconciliation behavior
- completion of the approved monitoring roadmap once Sentry setup is fully available

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
- what documentation cleanup should be done after the current wallet phase merges

## 7. Recommended Next Engineering Priorities

1. finish `Phase F` wallet foundation and merge it safely
2. validate the admin/payment surfaces against the new wallet ledger expectations
3. continue the approved monitoring roadmap once Sentry setup is ready
4. improve runtime release confidence around payments, withdrawals, and admin operations
5. run the pending UX audit after wallet foundation is stable

## 8. Guidance For New Developers

If you are taking over this repo:

1. start with `README.md`
2. read `ENGINEERING_HANDOVER.md`
3. read `CURRENT_DEVELOPMENT_STATUS.md`
4. read `EXECUTION_TRACKER.md`
5. read `AI_OPERATING_MODEL.md`
6. confirm the active environment before running any deploy command
7. confirm whether you are working against `main` or the active wallet branch before making finance changes
