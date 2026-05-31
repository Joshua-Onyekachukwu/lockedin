# Lockedin — Developer Report (Current System)
**Scope:** What is built now, how it works, how to operate it safely, and what to do next.  
**Payments:** Currently NGN (kobo) + Paystack. Multi-currency + Stripe planned later.

---

## 1) What Lockedin Is (Product Definition)
Lockedin is a behavioral enforcement platform where users stake money against goals (“protocols”), submit periodic proof, and face penalties when they miss commitments. A portion of forfeited funds is redistributed to successful users via a reward pool.

---

## 2) Architecture Overview

### Frontend
- **TanStack Start (SSR)** with file-based routes under `src/routes`
- **TanStack Router** for routing
- **TanStack Query + Convex React Query adapter** for caching, querying, and real-time sync
- **Tailwind CSS** for styling (industrial/dark aesthetic)

### Backend
- **Convex** provides:
  - Database tables & indexes
  - Queries / mutations / actions
  - Internal functions for privileged workflows
  - File storage for proof images and profile images
  - Cron jobs for automated sweeps and distributions

### Key system properties
- **Real-time UI updates** driven by Convex queries and subscriptions
- **Operational auditability** via admin audit logs and transaction records
- **Payments resilience** via reconciliation + idempotency (prevents double-crediting)

---

## 3) Core Features Implemented

### A) Authentication + Identity
- Convex Auth integration
- User profile fields stored in `users` table
- Admin authorization based on:
  - `user.isAdmin === true`, OR
  - email allowlist from Convex environment variable (`ADMIN_EMAIL_ALLOWLIST`)

### B) Wallet + Ledger
- Deposits and transactions are recorded in Convex tables
- Wallet balance is updated via server-side credit paths
- Notifications are created on important events (funded wallet, profile updates, etc.)

### C) Paystack Integration (NGN)
- Client initiates Paystack checkout using a public key (frontend env var)
- Backend verifies payments via Paystack “verify transaction” endpoint
- Webhook support for `charge.success`

### D) Reconciliation-First Payments Reliability (Operations-grade)
Problem solved:
- Paystack can report a reference that does not match the app-generated `deposits.reference`.

Solution implemented:
- Idempotent reconciliation flow that can:
  - match by reference when available
  - fall back to Paystack customer email to locate the user and credit safely
  - record unmatched events for later recovery

Operational tables added:
- `paystack_reconciliations`
- `paystack_unmatched`

### E) Admin Command Center (Ops tooling)
Includes:
- System stats
- Paginated user table
- Transaction ledger and detail pages
- Audit log and detail pages
- Withdrawals management
- Manual overrides for sweeps/distributions
- Payments Recovery (paste reference → verify → credit)
- Payments Explorer (search reference/email → see verify/recon/unmatched/deposit/tx + Fix/Credit)

### F) Profile Image Upload + Propagation
- Users can upload profile images (Convex storage)
- `users.profileImageId` stores the file id; `users.current` resolves it into a URL
- All major avatar surfaces render the uploaded image:
  - Top nav
  - Profile page
  - Leaderboard
  - Community
  - Dashboard discoverable cards

---

## 4) Key Data Model (High-Level)
This is a conceptual summary; see `convex/schema.ts` for the full definition.

### Users
Core fields include:
- `name`, `email`, `image`, `profileImageId`
- `balance` (kobo)
- `integrityScore`, `tier`, `streak_count`, `goals_completed`
- `is_discoverable`, `witness_discoverable`
- `bvn_verified`, `bvn_last4`
- `isAdmin` (optional)

### Vaults / Goals / Logs
- `vaults` represent staked protocols
- `goals` represent the commitment specification
- `goal_logs` represent check-ins with optional proof
- Witness/verification data tracks approvals/rejections

### Transactions / Deposits / Withdrawals
- `transactions` is the ledger (credit/debit)
- `deposits` represent incoming funds (Paystack)
- withdrawals flow exists with admin completion

### Admin & Ops
- `admin_audit` for traceability of administrative actions
- `paystack_reconciliations` and `paystack_unmatched` for payments operations

---

## 5) Payments Operations (How to Investigate “Money Paid But Not Credited”)

### Recommended workflow
1) Open Admin → **Payments Explorer**
2) Search by:
   - Paystack reference, OR
   - customer email
3) Inspect:
   - Paystack verification status
   - reconciliation record (already credited vs unmatched)
   - linked deposit record (if any)
   - recent ledger activity
4) If not credited and Paystack says success:
   - Click **Fix / Credit**
   - This performs a safe, idempotent reconciliation and logs admin audit events

### Design intent
- Avoid double crediting through idempotency (`paystack_reconciliations` by reference)
- Preserve a trail for every fix attempt (admin audit + unmatched tracking)

---

## 6) Security & Compliance Notes (Engineering View)
This is not legal advice, but engineering must support it:
- Do not store secrets in the repository.
- Keep Paystack secret key in Convex environment variables only.
- Use environment variables for all keys and rotate any key ever pasted into logs or docs.
- Admin access should be strictly gated via `ADMIN_EMAIL_ALLOWLIST` and/or `user.isAdmin`.

Operationally important:
- Add dispute handling and chargeback handling early (support + fraud ops).

---

## 7) Environment Variables (Placeholders Only)
Do not commit real keys.

### Convex (server-side)
- `PAYSTACK_SECRET_KEY` = `your-live-paystack-secret-key`
- `ADMIN_EMAIL_ALLOWLIST` = `["admin@yourdomain.com","founder@yourdomain.com"]` (or comma-separated string)
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (if using Google OAuth)
- `JWT_PRIVATE_KEY` / auth-related keys per Convex Auth setup

### Vercel / Frontend (client-side)
- `VITE_CONVEX_URL` = `https://your-deployment.convex.cloud`
- `VITE_PAYSTACK_PUBLIC_KEY` = `pk_live_xxx`

---

## 8) Testing Checklist (Manual)

### Identity & Profile
- Create account → open Profile → edit and save fields
- Upload profile picture → verify it updates in:
  - top nav avatar
  - profile page avatar
  - leaderboard cards
  - community cards
  - dashboard discoverable cards

### Payments
- Fund wallet → verify:
  - deposit status becomes completed
  - wallet balance updates
  - transaction log updates
  - notification appears

### Payments Recovery / Explorer (Admin)
- Search a known Paystack reference
- Confirm Paystack verification status is displayed
- If not credited, run Fix/Credit and confirm:
  - wallet credit occurs exactly once
  - audit log records the action

### Protocol / Vault flows
- Create vault → confirm escrow logic reflects in balance/ledger
- Submit a check-in proof
- Approve/reject as witness
- Confirm integrity score / streak updates

### Admin access
- Ensure admin allowlist works with:
  - comma-separated string
  - JSON array string

---

## 9) Recommendations to Make the App Better (Next Up)

### Product / UX
- Build a dispute flow v1 (timeboxed, consistent rules, clear outcomes)
- Improve penalty transparency:
  - pre-penalty warnings
  - “why this happened” screens
  - downloadable receipts / ledger exports (admin and user)

### Trust & Safety / Fraud
- Rate limit submissions and suspicious patterns (velocity limits)
- Collusion detection signals (same witnesses repeatedly approving, unusual timing)
- Add report/block flows and moderation tooling

### Analytics
- Instrument funnel events: signup → deposit → first check-in → first week completion
- Track penalty-to-churn correlation
- Track disputes and chargebacks per 100 users

### Performance
- Continue reducing query waterfalls and unbounded queries
- Audit heavy admin queries and ensure they paginate/limit

### Payments (future)
- Multi-currency design (later): abstract “payment provider” layer
- Stripe integration (later): design for webhooks, reconciliation, and idempotency similarly to Paystack

---

## 10) Current Limitations / Not Yet Fully Mature
- Full dispute resolution system is not yet a complete product surface
- Fraud and moderation automation is minimal (ops tooling exists, but policies and scaling strategy need implementation)
- Regulatory posture is not encoded into product UX (disclosures, geo restrictions, etc.) and must be addressed before broad launch

---

## 11) “What to do next” (Practical)
1) Run a controlled cohort (creator-led 7–14 day challenge) to validate retention + repeat deposits.
2) Build dispute flow v1 and publish clear rules.
3) Establish compliance guidance for the first launch geography.
4) Add analytics dashboards for activation/retention/risk.

