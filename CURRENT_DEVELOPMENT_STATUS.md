# Current Development Status

This document explains what Lockedin currently is, what is already implemented, what was recently changed, and what still needs work.

## 1. Current Product Definition

Lockedin is currently a stake-per-vault accountability platform.

Current live product behavior:

- a user creates a protocol
- the protocol starts in `awaiting_funding`
- the user funds that protocol through Paystack
- the protocol becomes active after successful verification
- the user submits execution evidence
- witnesses review the evidence and provide written reasons
- penalties accrue for missed requirements

This is the current coded direction.

## 2. Important Clarification

The repository still contains wallet-related tables and some finance/admin surfaces.

However:

- the active user flow is not wallet-first
- wallet reintroduction has been discussed and approved for future work
- wallet-first implementation is paused and not yet finished in the current codebase

Any new developer should treat wallet return as a future workstream, not an already-completed product capability.

## 3. Implemented Features

### Identity and Access

- Convex Auth sign-in
- email verification gate
- Google auth support through env-based configuration
- admin gating and admin-only route protection
- fail-closed admin authorization requiring verified email, `user.isAdmin === true`, and `ADMIN_EMAIL_ALLOWLIST` membership

### Protocol Creation and Management

- protocol creation using templates or custom setup
- pain tier selection
- duration and frequency rules
- awaiting-funding state before activation
- private protocol detail page

### Payments

- Paystack protocol funding
- backend verification and reconciliation
- webhook handling
- payment instrumentation and debugging hooks
- withdrawal request rate limiting and masked destination display on read surfaces

### Execution Evidence

- execute-log modal
- note support
- multiple proof images
- full log detail viewing
- scroll-safe modal behavior

### Witness System

- witness request flow
- witness application flow
- witness acceptance
- witness removal
- witness verification reports with required reasons
- max-3 witness enforcement logic work has been added in the system

### Social and Visibility

- community discovery
- witness pool
- public share links using `/share/$vaultId`
- richer share message copy
- Hall of Integrity mission counts based on funded/activated protocols

### Admin

- admin dashboard
- dedicated user-detail route
- manual verification and override tooling
- audit logging
- payment support tooling
- withdrawal/admin operation surfaces
- admin settings route for accounting recompute and seed-data purge controls

## 4. Recently Completed Work

### Share and Public Preview

Recently completed:

- new public share route
- share links now target a safe public preview page
- share copy includes stronger text plus link
- public share access is allowed without login

### Hall of Integrity Accuracy

Recently completed:

- mission counts were changed to use funded/activated protocol participation instead of stale derived values
- public ranking surfaces now better reflect real user activity
- mission counts now reflect funded/activated protocol participation rather than raw goal creation

### Vault UX and Evidence Handling

Recently completed:

- execute-log placement improved on vault detail
- witness decision reports are visible in log detail
- multiple image uploads for logs
- witness removal UX improvements

## 5. Active Risks and Known Follow-Up Areas

### Release Hardening

Still needs continued validation:

- final branch validation for Phase D (`tsc`, Convex check, production build)
- continued monitoring of webhook and verify reconciliation behavior
- completion of the approved monitoring roadmap once Sentry setup is fully available

### Deployment Alignment

High-risk area:

- frontend and backend deployment mismatch has caused breakages before
- Paystack and OAuth alignment must be checked during every environment move
- `SITE_URL` must point to the active frontend domain before email verification is considered operational

### Documentation Drift

There are many markdown files in the repo from earlier planning phases.

Use these as the active handoff set:

- `README.md`
- `ENGINEERING_HANDOVER.md`
- `CURRENT_DEVELOPMENT_STATUS.md`
- `DEPLOYMENT_SINGLE_SOURCE_OF_TRUTH.md`
- `LOCKEDIN_SYSTEM_DOCUMENTATION.md`
- `SECURITY.md`
- `ADMIN_PAYMENTS_RUNBOOK.md`
- `ADMIN_SETTINGS_RUNBOOK.md`
- `RESPONSIVE_QA_CHECKLIST.md`

## 6. Current Open Product Decisions

These are not fully resolved in the active build:

- whether the product should return to a wallet-first architecture
- how far payment operations should go before licensed-partner integration
- how much observability should be added before wider release

## 7. Recommended Next Engineering Priorities

1. finish Phase D validation, release checks, and branch shipping flow
2. decide whether wallet-first is truly returning as the primary funding model
3. continue the approved monitoring roadmap once Sentry setup is ready
4. improve runtime release confidence around payments and admin operations
5. continue retention and engagement feature planning

## 8. Guidance For New Developers

If you are taking over this repo:

1. start with `README.md`
2. read `ENGINEERING_HANDOVER.md`
3. read `DEPLOYMENT_SINGLE_SOURCE_OF_TRUTH.md`
4. confirm the active environment before running any deploy command
5. treat wallet-related code as partially legacy unless a new implementation pass is explicitly underway
