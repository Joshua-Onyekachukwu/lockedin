# Lockedin

Lockedin is a behavioral commitment platform. Users create stake-backed protocols, fund them, submit execution evidence, and rely on witnesses plus admin safety controls to enforce accountability.

This repository is the active application codebase. It uses TanStack Start on the frontend and Convex on the backend.

## What The Product Does

Lockedin currently supports:

- Account creation and sign-in with Convex Auth
- Email-verification gating before most app access
- Goal/protocol creation with stake amount, duration, frequency, and pain tier
- Vault funding through Paystack
- Check-ins with note + multiple proof images
- Witness assignment, witness approval/rejection, and witness reports
- Penalty accrual tracking and protocol status management
- Community discovery, witness pool, and Hall of Integrity/leaderboard
- Admin tooling for user review, overrides, payment operations, and audits
- Public share pages for protocols via `/share/$vaultId`

## Current Product State

The current codebase is operating in the stake-per-vault model:

- There is no full wallet-first UX enabled in the active product flow
- Users create a protocol first, then fund that protocol
- Penalties accrue against a vault and settle through the platform rules
- Credits and shields exist as internal product mechanics

Important product note:

- Wallet reintroduction has been discussed and approved for future work, but it is not the current production model in this codebase

## Tech Stack

- Frontend: TanStack Start, TanStack Router, TanStack React Query, React 19, TypeScript
- Backend: Convex queries, mutations, actions, HTTP endpoints, and crons
- Styling: Tailwind CSS v4
- Auth: `@convex-dev/auth`
- Payments: Paystack
- Identity/KYC: Mono
- Monitoring: Sentry hooks exist but are only partially wired

## Core Mechanics

### Pain Tiers

- `deterrence`: 2% penalty behavior
- `enforcement`: 5% penalty behavior
- `liquidation`: 10% penalty behavior

### Protocol Lifecycle

1. User creates a protocol
2. System creates a `vaults` row in `awaiting_funding`
3. System creates a linked `goals` row
4. User funds the protocol through Paystack
5. Vault becomes active
6. User submits evidence logs
7. Witnesses approve or reject logs with written reports
8. Penalties accrue for missed requirements

### Evidence Rules

- Check-ins are created as pending
- Witnesses can approve or reject
- Rejections and approvals store a reason/report
- Users can review witness reports inside the vault log detail view

## Repository Map

- `src/routes/`: application routes
- `src/components/`: shared UI and dashboard modals
- `src/lib/`: helpers and UI utilities
- `convex/`: schema, backend functions, auth, payments, crons, and HTTP routes
- `public/`: static assets
- `scripts/`: small utility scripts like auth key generation

## Important Route Areas

- `/dashboard`: user protocols, funding, and witness workflows
- `/vault/$id`: full protocol detail page
- `/share/$vaultId`: public share preview page
- `/community`: discovery and witness recruitment
- `/leaderboard`: Hall of Integrity
- `/admin`: admin command center
- `/verify-required`: verification gate for signed-in but unverified users

## Important Backend Modules

- `convex/schema.ts`: authoritative data model
- `convex/goals.ts`: protocol creation, logs, full context, public share preview
- `convex/payments.ts`: Paystack initialize/verify/reconcile logic
- `convex/partners.ts`: witness relationships
- `convex/verifications.ts`: evidence approval/rejection
- `convex/admin.ts`: admin queries, overrides, audits, payment tools
- `convex/http.ts`: webhook and auth HTTP routes
- `convex/penalties.ts`, `convex/rewards.ts`, `convex/vaultLifecycle.ts`, `convex/crons.ts`: automation and system lifecycle

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create or update local env files so `CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL` point to the same backend deployment.

3. Start development:

```bash
npm run dev
```

4. Helpful commands:

```bash
npm run lint
npm run build
npm run auth:generate-key
```

## Environment Variables

### Frontend / local / Vercel

- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`
- `VITE_PAYSTACK_PUBLIC_KEY`
- `VITE_SENTRY_DSN` (optional)
- `VITE_SITE_URL` (optional)
- `CONVEX_DEPLOYMENT` for local CLI targeting

### Convex backend

- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_MODE`
- `PAYSTACK_PUBLIC_KEY` (optional guard/check)
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `CONVEX_SITE_URL`
- `JWT_PRIVATE_KEY`
- `JWKS`
- `ADMIN_EMAIL_ALLOWLIST`
- `RESEND_API_KEY` or `AUTH_RESEND_KEY`
- `AUTH_EMAIL_FROM` or `EMAIL_FROM`
- `SITE_URL`
- `MONO_SECRET_KEY`
- `SENTRY_DSN` (optional)

## Deployment Summary

Do not deploy by memory. Always verify the active target deployment first.

- Frontend must point to the same Convex backend that you deploy to
- Paystack webhook must point to that same Convex `.site` URL
- Google OAuth redirect URI must match the live frontend domain
- After backend changes: deploy Convex
- After frontend env changes: redeploy Vercel

Use [DEPLOYMENT_SINGLE_SOURCE_OF_TRUTH.md](file:///c:/Users/Semek/Webstrom/Lockedin/DEPLOYMENT_SINGLE_SOURCE_OF_TRUTH.md) as the authoritative deployment guide.

## Authoritative Docs

Start with these documents:

- [ENGINEERING_HANDOVER.md](file:///c:/Users/Semek/Webstrom/Lockedin/ENGINEERING_HANDOVER.md): system handoff for developers
- [CURRENT_DEVELOPMENT_STATUS.md](file:///c:/Users/Semek/Webstrom/Lockedin/CURRENT_DEVELOPMENT_STATUS.md): what is done, in progress, and next
- [DEPLOYMENT_SINGLE_SOURCE_OF_TRUTH.md](file:///c:/Users/Semek/Webstrom/Lockedin/DEPLOYMENT_SINGLE_SOURCE_OF_TRUTH.md): deployment, env, and migration process
- [LOCKEDIN_SYSTEM_DOCUMENTATION.md](file:///c:/Users/Semek/Webstrom/Lockedin/LOCKEDIN_SYSTEM_DOCUMENTATION.md): system behavior and business logic detail
- [SECURITY.md](file:///c:/Users/Semek/Webstrom/Lockedin/SECURITY.md): security rules and sensitive areas

Important note:

- Several older markdown files in the repo document earlier planning phases or prior product decisions. Treat the docs listed above as the current handoff set.
