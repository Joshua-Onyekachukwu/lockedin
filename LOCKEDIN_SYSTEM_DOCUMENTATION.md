# Lockedin System Documentation

## 1) Product summary
Lockedin is a commitment and accountability system where users “stake principal” against a goal (a “Vault/Protocol”) and submit periodic evidence logs. Witnesses (accountability partners) approve/reject logs, and breaches can trigger forfeiture (pain tier) with an accounting split between platform revenue and a reward pool.

The system is designed around:
- **Hard identity gates** (email verification required before accessing most of the app)
- **Witness-based evidence authorization** (1-of-N approval, 2-of-N reject, owner reject)
- **Privacy controls** (users can opt out of being discoverable in Community/Leaderboard/Witness Pool)
- **Admin operability** (manual overrides, audits, payment tools, maintenance tools)
- **Stable environment alignment** (Vercel frontend + Convex backend + Paystack webhooks must point to the same deployment to avoid split-brain)

## 2) Key terms (how the app names map to the backend)
- **User**: A record in `users`.
- **Vault / Protocol**: A stake container in `vaults`. Holds the principal, schedule, start/end, and pain tier.
- **Goal**: The behavioral objective in `goals`, linked to a vault (`vaultId`).
- **Log / Check-in**: A record in `goal_logs` representing evidence for a day/week/month checkpoint.
- **Witness / Partner**: A record in `accountability_partners` connecting an owner vault to a partner user.
- **Community / Collective Enforcement**: A public feed of discoverable goals/vaults (limited preview for non-owner/non-witness).
- **Leaderboard (Hall of Integrity)**: A ranked list of top users (verified + discoverable).
- **System accounting**: Aggregate metrics in `system_stats` + `transactions` + `reward_pool`.

## 3) Roles and permissions

### 3.1 Regular verified user
Can:
- Create a goal (vault + goal)
- Fund wallet (Paystack)
- Stake principal into a vault
- Submit check-ins (logs)
- Request witnesses / apply to witness others
- View Community (if verified)

Cannot:
- Access Admin tools
- View full details of other users’ goals unless they are an active witness

### 3.2 Witness (active accountability partner)
Can:
- See “Your Witness Assignments” in Witnessing tab
- Open the vault spec for protocols they are witnessing
- Approve/Reject evidence logs in Evidence Authorization Terminal

### 3.3 Admin
Can:
- View full vault specs (admin bypasses preview-only gating)
- Run manual overrides (verify email, recompute tiers, trigger sweep, etc.)
- Toggle user flags (email verified, BVN, admin, discoverability)
- Operate payment tooling (explorer/recovery)
- Operate maintenance tools (dummy visibility, repair duplicates)

## 4) Core flows

### 4.1 Authentication + hard email verification gate
Expected behavior:
- Unverified users are redirected to `/verify-required` and blocked from dashboard/profile/community/leaderboard/wallet/admin.
- Verification email is delivered via Resend (Convex env-driven).
- Admins can manually mark a user email verified via Admin tools for testing.

### 4.2 Goal creation (Vault + Goal)
High-level:
1. User chooses a goal template or custom goal.
2. System creates a `vaults` record (principal, duration, pain tier).
3. System creates a `goals` record linked to the vault (`vaultId`).

### 4.3 Check-ins (evidence logs)
Current lifecycle (important):
- New log is created as **`status: "pending"`**.
- It becomes **`status: "completed"`** only after witness approval rules finalize it.

Log fields:
- `proofImageId` and a derived `proofUrl` for display
- `note` (optional)
- `approvals[]` / `rejections[]` arrays (per-witness voting)
- `confirmed_by`, `confirmed_at` once finalized

### 4.4 Evidence authorization (witness approvals)
Rules implemented:
- **Approved** as soon as any **1 witness approves**
- **Rejected** if:
  - owner rejects, or
  - **2 witnesses reject**

Operational effects on approval:
- Updates owner integrity/streak metrics
- Updates user tier derived from integrity score

### 4.5 Witnessing / accountability partners
Two directions exist:
- **Owner requests a witness** (send request → partner accepts)
- **Someone applies to witness** an owner vault (apply → owner accepts)

Limits:
- **Max 3 active witnesses per goal**

Consistency:
- A composite index on accountability partnerships ensures safe lookups by `(vaultId, partnerId)`

### 4.6 Community privacy + spec access gating
Goals are visible in Community only if the owner has opted-in:
- `is_discoverable === true`

Witness pool visibility is separate:
- `witness_discoverable !== false`

Spec access rules:
- Non-owner, non-active-witness users see **Preview Only** for vault spec (redacted).
- Owner, active witnesses, and admins see full spec.

### 4.7 Penalties / enforcement (pain tiers)
Midnight sweep evaluates check-in compliance and can apply penalties.
Penalty accounting (conceptual):
- Principal forfeiture recorded via `transactions`.
- Split:
  - **70%** platform revenue
  - **30%** reward pool contribution
Those totals roll into `system_stats`.

### 4.8 Payments (Paystack)
Frontend uses Paystack inline:
- `VITE_PAYSTACK_PUBLIC_KEY` (Vercel env)

Backend uses Paystack secret:
- `PAYSTACK_SECRET_KEY` (Convex env)

Webhooks:
- Endpoint: `https://<deployment>.convex.site/paystack-webhook`
- HMAC verification uses `x-paystack-signature` and `PAYSTACK_SECRET_KEY`.

Events handled include:
- `charge.success` (wallet funding)
- Refund/dispute events (safety + reconciliation)

## 5) Admin tooling (what exists)
Admin includes:
- **Manual Overrides**
  - Verify User Email (testing)
  - Recompute User Tiers (backfill Bronze/Silver/Gold)
  - Trigger Midnight Sweep
  - Distribute Dividends
- **Maintenance**
  - Enable Dummy Visibility (bulk set discoverable flags by email domain)
  - Repair Witness Duplicates (end duplicate partner rows to stop repeated goals and query crashes)
- **User Terminal**
  - Search users and open a modal with details + Verification Controls

## 6) Tier system (Bronze / Silver / Gold)
Tier is derived from `integrityScore`:
- **Gold**: integrityScore ≥ 90
- **Silver**: integrityScore ≥ 75
- **Bronze**: otherwise

Important note:
- Tier is now recomputed at read-time for UI consistency.
- There is also an admin “Recompute User Tiers” tool to backfill stored tiers for old data.

## 7) Leaderboard ranking (Hall of Integrity)
Eligibility:
- Only users with verified email (`emailVerificationTime`) and discoverable (`is_discoverable === true`).

Ranking:
- Multi-factor weighted rank score:
  - Tier weight + goals completed + streak + integrity
This prevents integrity being the only factor.

## 8) Environment alignment (avoid split-brain)
To prevent “frontend updated but backend missing functions” problems:
- Vercel must point to the intended Convex deployment URL.
- Paystack webhook must point to the same Convex deployment `.site`.
- Convex env vars must be set on that same deployment.

## 9) Paystack test-mode checklist (recommended)
Given you are now using Paystack **TEST** keys:
1. Vercel:
   - `VITE_PAYSTACK_PUBLIC_KEY` = Paystack test public key
2. Convex deployment (the same one used by Vercel):
   - `PAYSTACK_SECRET_KEY` = Paystack test secret key
3. Paystack dashboard (TEST mode):
   - Webhook URL = `https://ardent-dinosaur-415.convex.site/paystack-webhook`
4. Run a deposit test:
   - fund wallet
   - confirm `charge.success` credits the wallet once
5. Run edge tests:
   - duplicate webhook delivery (should be idempotent)
   - refund/dispute test (ensure wallet handling is safe)

## 10) Version history (recent pushes)
This is a high-level changelog based on commit messages.

- `cdf8bb3` Fix tier display + recompute tiers admin action
  - Tier derived from integrity at read-time + admin tier backfill tool.
- `19cea6f` Docs: licensed partner custody architecture; leaderboard ranking weights
  - Added custody architecture doc + multi-factor leaderboard ranking.
- `f88e217` Pending approvals, dedupe witness requests, admin visibility tools
  - Pending→approved lifecycle, dedupe repair tools, witness assignments, admin bypass for full spec.
- `72db501` Witness pool visibility, witness limit, admin verify shortcut, revenue compact
  - Witness pool query, max 3 witnesses enforcement, admin verify improvements, compact revenue formatting.
- `c113f47` Community privacy, admin tools, witness consensus, badge tiers
  - Community privacy tightening, consensus voting rules, badges/tier logic, admin enhancements.
- `44d92f7` Evidence modal, witnesses, privacy toggles, and community UI
  - Evidence review modal, witness details, privacy toggle enforcement, community UI fixes.

