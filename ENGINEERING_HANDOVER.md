# Engineering Handover (Lockedin)

This document is the fast onboarding guide for any developer or team taking over this repository.

## 1. Product Summary

Lockedin is a commitment-enforcement application. A user creates a protocol, funds it, submits evidence that they followed through, and relies on witnesses plus system rules to determine whether they stayed compliant.

The current build is centered on:

- Stake-per-vault funding
- Witness-based evidence verification
- Public discoverability controls
- Admin override and audit capabilities
- Paystack funding and reconciliation

## 2. Current Product Posture

The active codebase currently uses the stake-per-vault model, not a wallet-first product.

That means:

- Users create a protocol first
- The vault starts in `awaiting_funding`
- Users fund that specific vault through Paystack
- The vault becomes active only after successful payment verification

Do not assume wallet funding is the current live flow just because wallet-related tables and admin tools still exist. Those are legacy or supporting surfaces. Full wallet reintroduction was discussed as future work and is currently paused.

## 3. Stack

- Frontend: TanStack Start, TanStack Router, TanStack React Query, React 19, TypeScript
- Backend: Convex
- Styling: Tailwind CSS v4
- Auth: `@convex-dev/auth`
- Payments: Paystack
- KYC/Identity: Mono
- Monitoring: frontend Sentry bootstrap and backend capture/scrubbing are live; the fuller incident-center rollout is still deferred

## 4. Core Business Objects

### `users`

Stores:

- profile data
- discoverability flags
- integrity score
- credits and shields
- admin flag
- legacy balance field

### `vaults`

Represents the stake container:

- amount
- pain tier
- status
- funding metadata
- accrued penalties

Current statuses:

- `awaiting_funding`
- `active`
- `completed`
- `failed`

### `goals`

Represents the behavioral objective linked to a vault:

- title
- description
- category
- frequency
- target count

### `goal_logs`

Represents execution evidence:

- note
- proof image ids
- per-log status
- verification reports
- witness approval/rejection data

### `accountability_partners`

Represents witness relationships between a protocol owner and witness.

### `deposits`, `transactions`, `withdrawals`

These tables support payment accounting and older wallet-related mechanics. They remain important for finance tracking and future wallet work.

## 5. Core User Flows

### Authentication and Verification

- User signs in through Convex Auth
- Root gate in `src/routes/__root.tsx` blocks unauthenticated and unverified access
- Most routes require `emailVerificationTime`
- Public share URLs under `/share/*` are intentionally allowed without sign-in

### Protocol Creation

- UI: `src/components/dashboard/create-vault-modal.tsx`
- Backend: `convex/goals.ts` -> `create`
- Creates a vault in `awaiting_funding`
- Creates a linked goal
- Opens funding/share follow-up UX on dashboard

### Funding

- UI: `src/components/dashboard/fund-protocol-modal.tsx`
- Backend: `convex/payments.ts`
- Paystack inline initializes payment
- Backend verify/webhook reconcile the payment
- Successful funding activates the vault

### Check-In / Evidence

- UI: `src/components/dashboard/check-in-modal.tsx`
- Backend: `convex/goals.ts` -> `checkIn`
- Supports multiple proof images
- Creates a pending log

### Witness Verification

- UI: dashboard witnessing views and vault detail log views
- Backend: `convex/verifications.ts`, `convex/partners.ts`
- Witnesses must supply a written reason/report when approving or rejecting

### Public Sharing

- Public route: `src/routes/share.$vaultId.tsx`
- Query: `convex/goals.ts` -> `getPublicSharePreview`
- Share flow is intentionally separated from the private vault detail route

## 6. Key Frontend Files

### Routing and App Shell

- `src/routes/__root.tsx`: auth and verification gate
- `src/router.tsx`: router, query client, Convex provider wiring
- `src/client.tsx`: frontend Sentry bootstrap

### Main Product Surfaces

- `src/routes/dashboard.tsx`
- `src/routes/vault.$id.tsx`
- `src/routes/community.tsx`
- `src/routes/leaderboard.tsx`
- `src/routes/profile.tsx`
- `src/routes/share.$vaultId.tsx`

### Admin

- `src/routes/admin.tsx`
- `src/routes/admin.users.$userId.tsx`
- `src/routes/admin.settings.tsx`
- `src/routes/admin.tx.$txId.tsx`
- `src/routes/admin.audit.$auditId.tsx`

### Reusable UI

- `src/components/dashboard/create-vault-modal.tsx`
- `src/components/dashboard/fund-protocol-modal.tsx`
- `src/components/dashboard/check-in-modal.tsx`
- `src/components/share-prompt-modal.tsx`
- `src/components/share-presets.tsx`

## 7. Key Backend Files

### Core Domain

- `convex/schema.ts`
- `convex/users.ts`
- `convex/goals.ts`
- `convex/partners.ts`
- `convex/verifications.ts`

### Payments and Finance

- `convex/payments.ts`
- `convex/http.ts`
- `convex/admin.ts`

### Lifecycle / Automation

- `convex/penalties.ts`
- `convex/rewards.ts`
- `convex/vaultLifecycle.ts`
- `convex/crons.ts`

### Identity / Auth / Security

- `convex/auth.ts`
- `convex/auth.config.ts`
- `convex/emailVerification.ts`
- `convex/security.ts`
- `convex/rateLimit.ts`
- `convex/mono.ts`

## 8. Environment Variables

### Frontend

- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`
- `VITE_PAYSTACK_PUBLIC_KEY`
- `VITE_SENTRY_DSN` optional
- `VITE_SITE_URL` optional
- `CONVEX_DEPLOYMENT` for local Convex CLI targeting

### Convex

- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_MODE`
- `PAYSTACK_PUBLIC_KEY` optional
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `CONVEX_SITE_URL`
- `JWT_PRIVATE_KEY`
- `JWKS`
- `ADMIN_EMAIL_ALLOWLIST` required for admin access and evaluated alongside `user.isAdmin`
- `RESEND_API_KEY` or `AUTH_RESEND_KEY`
- `AUTH_EMAIL_FROM` or `EMAIL_FROM`
- `SITE_URL` required for email verification links
- `MONO_SECRET_KEY`
- `SENTRY_DSN` optional

## 9. Local Development Setup

1. Install packages:

```bash
npm install
```

2. Ensure `.env.local` targets the intended Convex deployment:

- `CONVEX_DEPLOYMENT=<deployment-name>`
- `VITE_CONVEX_URL=https://<deployment>.convex.cloud`

3. Run development:

```bash
npm run dev
```

4. Before shipping changes:

```bash
npm run lint
npm run build
```

## 10. Deployment Rules

Lockedin is very sensitive to environment mismatch.

Always keep these aligned:

- Vercel `VITE_CONVEX_URL`
- Convex deployment receiving `npx convex deploy`
- Paystack webhook target
- Google OAuth redirect URI

If those drift apart, sign-in, payments, and function lookups break.

See [DEPLOYMENT_SINGLE_SOURCE_OF_TRUTH.md](file:///c:/Users/Semek/Webstrom/Lockedin/DEPLOYMENT_SINGLE_SOURCE_OF_TRUTH.md) for the full release and migration process.

## 11. Current Development Status

### Implemented Recently

- Admin hardening and admin-detail routes
- Public share flow and public share page
- Hall of Integrity mission-count correction
- Witness removal and witness verification reports
- Multi-image check-ins
- Funding progress UX improvements
- Goal-owner controls for pre-funding amount edits and safe unfunded/completed deletion
- Wallet visibility improvements plus deterministic withdrawal linkage/rejection handling
- Phase D hardening: fail-closed email verification URL handling, internal-only direct Mono lookup, stricter admin gating, and masked withdrawal account displays

### Active Concerns

- Payment flow still needs continued runtime verification and future production monitoring
- Wallet-first reintroduction is not yet implemented
- Docs outside the current handoff set may reflect earlier decisions
- Admin access will fail closed if `ADMIN_EMAIL_ALLOWLIST` is missing or `SITE_URL` is not configured correctly

### Recommended Next Work

- Finish Phase D validation, release checks, and operator-runbook review
- Decide whether wallet-first returns as a true product direction
- Continue the approved monitoring roadmap once Sentry access/setup is ready
- Continue final system sweep and retention feature planning

## 12. Authoritative Handoff Set

Treat these as the current source of truth:

- `README.md`
- `ENGINEERING_HANDOVER.md`
- `CURRENT_DEVELOPMENT_STATUS.md`
- `DEPLOYMENT_SINGLE_SOURCE_OF_TRUTH.md`
- `LOCKEDIN_SYSTEM_DOCUMENTATION.md`
- `SECURITY.md`
- `ADMIN_PAYMENTS_RUNBOOK.md`
- `ADMIN_SETTINGS_RUNBOOK.md`
- `RESPONSIVE_QA_CHECKLIST.md`
