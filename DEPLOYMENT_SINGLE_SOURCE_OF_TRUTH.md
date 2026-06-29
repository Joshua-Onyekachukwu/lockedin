# Deployment Single Source of Truth

This is the authoritative deployment and platform-transfer guide for Lockedin.

Its purpose is to prevent split-brain failures where:

- the frontend points at one backend deployment
- webhooks hit another deployment
- OAuth is configured for a different domain
- local developers deploy to the wrong Convex target

Current delivery rule:

- only one primary implementation phase should be active at a time
- each phase should be built, validated, PR-reviewed, and merged before the next implementation phase begins
- the current active implementation phase is `Phase F` on branch `phase-wallet-v1-foundation`

## 1. Deployment Principle

At any moment, there must be exactly one active backend target for a given frontend environment.

The following must always agree:

- `VITE_CONVEX_URL`
- the Convex deployment receiving `npx convex deploy`
- the Paystack webhook target
- the OAuth redirect domain
- email verification link domain

If one changes, review all of them.

## 2. Current Known Environment History

From the recent project history:

- legacy/testing deployment: `ardent-dinosaur-415`
- newer production deployment: `quick-starfish-723`
- frontend domain used in docs/history: `https://lock3din.vercel.app`

These values may change again. Before every release or platform move, verify the active values instead of trusting old documentation.

## 3. What Each URL Does

### Convex Cloud URL

Pattern:

- `https://<deployment>.convex.cloud`

Used for:

- frontend queries
- frontend mutations
- frontend actions

This must match:

- `VITE_CONVEX_URL`

### Convex Site URL

Pattern:

- `https://<deployment>.convex.site`

Used for:

- Convex Auth HTTP routes
- Paystack webhook delivery
- other Convex HTTP actions

### Frontend Site URL

Pattern example:

- `https://lock3din.vercel.app`

Used for:

- Google OAuth redirect URI
- email verification links
- public user-facing app access

## 4. Required Environment Variables

### Frontend / local / Vercel

- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`
- `VITE_PAYSTACK_PUBLIC_KEY`
- `VITE_SENTRY_DSN` optional
- `VITE_SITE_URL` optional
- `CONVEX_DEPLOYMENT` for local Convex CLI targeting

### Convex deployment

- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_MODE`
- `PAYSTACK_PUBLIC_KEY` optional
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
- `SENTRY_DSN` optional

## 5. Code-Level Deployment Hooks

These files are the most important when debugging environment alignment:

- `src/router.tsx`: reads `VITE_CONVEX_URL`
- `src/components/dashboard/fund-protocol-modal.tsx`: reads `VITE_PAYSTACK_PUBLIC_KEY`
- `convex/http.ts`: receives Paystack webhooks and auth HTTP traffic
- `convex/emailVerification.ts`: builds verification links from `SITE_URL` / `VITE_SITE_URL`
- `convex/auth.ts` and `convex/auth.config.ts`: auth provider wiring
- `convex/payments.ts`: Paystack verify and reconcile logic

## 6. Local Development Deployment Process

### Step 1: Verify local target

Check `.env.local`:

```bash
CONVEX_DEPLOYMENT=<deployment-name>
VITE_CONVEX_URL=https://<deployment>.convex.cloud
```

Those two must point to the same deployment.

### Step 2: Install and run

```bash
npm install
npm run dev
```

### Step 3: Validate before shipping

```bash
npm run lint
npm run build
```

### Step 4: Deploy backend

```bash
npx convex deploy --env-file .env.local
```

If Convex CLI asks whether to deploy to a different prod target, stop and confirm that the prompted deployment is the one your frontend is actually using.

### Step 5: Redeploy frontend

After any frontend env change or frontend code release:

- redeploy Vercel

## 7. Release Checklist

### Backend release

1. Pull the latest branch
2. Confirm `.env.local` target
3. Run `npm run lint`
4. Run `npm run build`
5. Run `npx convex deploy --env-file .env.local`

### Frontend release

1. Confirm `VITE_CONVEX_URL`
2. Confirm `VITE_PAYSTACK_PUBLIC_KEY`
3. Confirm any OAuth-related env
4. Redeploy Vercel

### Provider review

1. Confirm Paystack webhook URL
2. Confirm Google OAuth redirect URI
3. Confirm email verification `SITE_URL`

### Smoke test

- email/password sign-in
- Google sign-in
- `/verify-required`
- `/dashboard`
- `/community`
- `/leaderboard`
- `/admin`
- create protocol
- fund protocol
- open public share link

If the active branch includes wallet work, also test:

- `/wallet`
- wallet funding entry point
- withdrawal request flow
- wallet/admin status consistency for deposits and withdrawals

## 8. Paystack Configuration

### Webhook URL

Set Paystack webhook to:

- `https://<active-deployment>.convex.site/paystack-webhook`

### Mode rules

`convex/payments.ts` enforces mode consistency:

- `sk_test_...` must align with `PAYSTACK_MODE=test`
- `sk_live_...` must align with `PAYSTACK_MODE=live`

If public and secret keys disagree, funding can fail or behave inconsistently.

## 9. Google OAuth Configuration

In Google Cloud Console:

### Authorized JavaScript origins

- the live frontend origin

### Authorized redirect URIs

- `https://<frontend-domain>/api/auth/callback/google`

Do not point OAuth callback to an old Convex `.site` URL unless the app is explicitly configured that way.

## 10. Email Verification Configuration

`convex/emailVerification.ts` builds links from:

- `SITE_URL`
- fallback `VITE_SITE_URL`

If these point to the wrong domain, users will click valid tokens on the wrong app instance and verification will appear broken.

## 11. Platform Transfer Checklist

Use this when moving the project to a different hosting platform, development platform, team workspace, or account.

### Repository handoff

1. Transfer the Git repository
2. Transfer access to environment-variable storage
3. Transfer provider access:
   - Convex
   - Vercel
   - Paystack
   - Google Cloud
   - Resend if used
   - Mono if used

### Backend migration

1. Create the new Convex project/deployment
2. Set the full Convex env set on the new deployment
3. Generate or migrate auth keys if required
4. Deploy backend code to the new target
5. If data must move, export/import the data before switching traffic

### Frontend migration

1. Point frontend envs to the new Convex Cloud URL
2. Update any site URL envs
3. Redeploy the frontend

### Provider migration

1. Update Paystack webhook to the new Convex Site URL
2. Update Google OAuth redirect URI if the frontend domain changes
3. Update email verification `SITE_URL`

### Post-migration validation

1. Sign in works
2. Verification works
3. Admin works
4. Payments reconcile
5. Public share page works

## 12. Common Failure Modes

### Function path not found

Cause:

- frontend points at a Convex deployment missing the latest functions

Fix:

- align `VITE_CONVEX_URL`
- deploy backend to that same target

### Connection lost during auth

Cause:

- wrong Convex URL
- deployment instability
- bandwidth/plan issue

Fix:

- verify active deployment
- verify plan/usage
- verify frontend/backend alignment

### Google `redirect_uri_mismatch`

Cause:

- wrong frontend domain in Google Cloud Console

Fix:

- update authorized redirect URI to the live site callback path

### Payment succeeds in Paystack but app does not complete

Cause:

- webhook hits wrong Convex `.site`
- verify flow and webhook are not aligned
- frontend polls an environment different from the backend that processed payment

Fix:

- align frontend, Convex deploy target, and webhook URL

### Verification links appear broken

Cause:

- `SITE_URL` points to the wrong site

Fix:

- update `SITE_URL`
- redeploy and retest the verification flow

## 13. Final Rule

Before any deploy, migration, or provider reconfiguration:

- verify the target backend
- verify the frontend env
- verify the webhook
- verify the OAuth callback

Never assume the environment is still correct from a previous session.
