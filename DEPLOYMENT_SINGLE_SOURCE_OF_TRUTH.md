# Deployment Single Source of Truth (Convex + Vercel + Paystack + Google OAuth)

This document prevents “split brain” production issues (frontend pointing at one Convex deployment while webhooks/auth point at another).

## Canonical Production Deployment

**Convex production (single source of truth):**
- Cloud URL (client): `https://quick-starfish-723.convex.cloud`
- HTTP URL (webhooks + auth routes): `https://quick-starfish-723.convex.site`

**Frontend production (Vercel):**
- Site URL: `https://lock3din.vercel.app`

## Temporary Testing Mode (Current)

While the team is actively testing (and the existing data lives on the older deployment), use **one** Convex deployment end-to-end for the live site:

**Temporary testing backend (single source of truth during testing):**
- Cloud URL (client): `https://ardent-dinosaur-415.convex.cloud`
- HTTP URL (webhooks + auth routes): `https://ardent-dinosaur-415.convex.site`

When testing mode is enabled:
- Vercel Production must point at `ardent-dinosaur-415.convex.cloud`
- Paystack webhook must point at `ardent-dinosaur-415.convex.site/paystack-webhook`
- Google redirect URIs remain on `https://lock3din.vercel.app/api/auth/callback/google`

## What Each URL Is Used For

### Convex Cloud (`*.convex.cloud`)
Used by the web app to call Convex queries/mutations/actions.

- Must match Vercel `VITE_CONVEX_URL`.

### Convex Site (`*.convex.site`)
Used for Convex HTTP Actions (webhooks) and Convex Auth HTTP routes.

- Used by Paystack webhook.
- Hosts `/api/auth/*` routes for Convex Auth.

## Required Configuration (Production)

### 1) Vercel Environment Variables

- `VITE_CONVEX_URL=https://quick-starfish-723.convex.cloud`
- `VITE_CONVEX_SITE_URL=https://quick-starfish-723.convex.site` (recommended, optional)

If you change any of these, redeploy Vercel.

### 2) Convex Environment Variables (quick-starfish-723)

Must exist on the **quick-starfish-723** deployment:

- `SITE_URL=https://lock3din.vercel.app`
- `ADMIN_EMAIL_ALLOWLIST=...`
- `PAYSTACK_SECRET_KEY=...`
- `AUTH_GOOGLE_ID=...`
- `AUTH_GOOGLE_SECRET=...`
- `RESEND_API_KEY=...`
- `AUTH_EMAIL_FROM=Lockedin <onboarding@resend.dev>`
- `JWKS=...`
- `JWT_PRIVATE_KEY=...`

### 3) Paystack Webhook

Set in Paystack dashboard:

- `https://quick-starfish-723.convex.site/paystack-webhook`

Do not use an older Convex deployment webhook URL.

### 4) Google OAuth (Google Cloud Console)

**Authorized JavaScript origins**
- `https://lock3din.vercel.app`

**Authorized redirect URIs**
- `https://lock3din.vercel.app/api/auth/callback/google`

Remove older redirect URIs pointing to a Convex `.site` domain.

## Deployment Checklist (Any Time You Change Backend/Frontend)

### Backend (Convex)
1) `git pull`
2) `npx convex deploy`

### Frontend (Vercel)
1) Ensure `VITE_CONVEX_URL` is correct
2) Redeploy Vercel

### Smoke Test
- Sign in (email/password)
- Sign in (Google)
- Open `/admin`
- Open `/verify-required` and send verification email
- Fund wallet (Paystack) and confirm webhook credits deposit

## Common Failure Modes and Fixes

### “Could not find public function for …”
Cause: Vercel is pointing at a Convex deployment that does not have the latest functions deployed.

Fix:
- Ensure Vercel `VITE_CONVEX_URL` matches the intended deployment.
- Run `npx convex deploy` on that same deployment.

### Wallet funding not reflecting
Cause: Paystack webhook is still pointing at the old Convex `.site` URL.

Fix:
- Update Paystack webhook to `https://quick-starfish-723.convex.site/paystack-webhook`

## Convex CLI: How to Target the Correct Deployment

The Convex CLI chooses which deployment to deploy to using `CONVEX_DEPLOYMENT`.

### Check what your CLI is targeting
- Run `npx convex dashboard` and confirm the opened dashboard shows the expected deployment name in the URL.

### Force CLI to re-configure (safest)
1) Run `npx convex logout`
2) Run `npx convex dev`
3) Follow the prompts and select the deployment you want to use (for testing mode, choose `ardent-dinosaur-415`)

### If you already have a local config
Convex typically stores the deployment name in a local env file created during setup:
- `.env.local` should contain `CONVEX_DEPLOYMENT=<deploymentName>`

For testing mode, that value should be:
- `CONVEX_DEPLOYMENT=ardent-dinosaur-415`
