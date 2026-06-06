# Engineering Handover (Lockedin)

## 1) Stack
- Frontend: TanStack Start + TanStack Router + TanStack React Query, TypeScript, Tailwind CSS v4
- Backend: Convex (schema, queries/mutations/actions, http endpoints, crons)
- Payments: Paystack (initialize/verify + webhook)
- Identity: Convex Auth + optional Resend email verification + Mono (BVN verification)

## 2) Local setup
1. Install dependencies
   - `npm install`
2. Create `.env.local`
   - Must include `CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL` that point to the same Convex deployment.
3. Run the app
   - `npm run dev`

## 3) Core environment variables
Frontend (Vercel / local):
- `VITE_CONVEX_URL`
- `VITE_PAYSTACK_PUBLIC_KEY`
- `VITE_CONVEX_SITE_URL` (used for showing webhook URL / debugging)
- `VITE_SITE_URL` (optional; used for email verification links when present)

Backend (Convex env):
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_MODE` (recommended: `test` or `live`, enforced server-side)
- `RESEND_API_KEY` or `AUTH_RESEND_KEY` (optional; enables email verification email delivery)
- `AUTH_EMAIL_FROM` or `EMAIL_FROM` (optional)
- `SITE_URL` or `VITE_SITE_URL` (used for email verification links)

## 4) Deployment workflow (single source of truth)
This repo has strict “environment alignment” requirements:
- The frontend must target the same Convex deployment that you deploy backend code to.
- Paystack webhooks must point to the same Convex deployment `.site`.

Recommended deploy command:
- `npx convex deploy --env-file .env.local`

If Convex CLI prompts to also push to a different “prod deployment”, only do so if that deployment is truly the one serving your frontend traffic.

## 5) Product posture (MVP constraints)
- Non-custodial posture: stake-per-vault funding; no wallet top-ups/balance in MVP.
- Penalties accrue internally/visually and settle at end-of-vault.
- Rewards are internal “Protocol Credits” only (non-transferable, non-withdrawable).

## 6) Key folders
- `src/routes/`: TanStack Router file-based routes
- `src/components/`: shared UI components
- `convex/`: schema + backend functions + http endpoints + crons

## 7) Verification gates
- All routes are gated for unverified users except: `/`, `/login`, `/signup`, `/verify-email`, `/verify-required`, and `/auth/callback`.
- Admin manual email verification exists and requires a reason + audit log entry.

