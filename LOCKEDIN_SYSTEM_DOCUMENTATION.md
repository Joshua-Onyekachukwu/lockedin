# Lockedin System Documentation

Important note:
- Use `README.md`, `ENGINEERING_HANDOVER.md`, `CURRENT_DEVELOPMENT_STATUS.md`, `EXECUTION_TRACKER.md`, `AI_OPERATING_MODEL.md`, and `DEPLOYMENT_SINGLE_SOURCE_OF_TRUTH.md` as the primary handoff set. This document is a supporting system-behavior reference.
- `main` remains protocol-first at the time of this update.
- A dedicated wallet productization phase is actively in progress on `phase-wallet-v1-foundation`, but it is not yet merged into `main`.

## 1) Product summary
Lockedin is a commitment and accountability system where users stake principal against a goal (a “Vault/Protocol”) and submit periodic evidence logs. Witnesses (accountability partners) approve/reject logs. Penalties accrue over time based on missed requirements, and settle at the end of the vault.

The system is designed around:
- **Hard identity gates** (email verification required before accessing most of the app)
- **Witness-based evidence authorization** (1-of-N approval, 2-of-N reject, owner reject)
- **Privacy controls** (users can opt out of being discoverable in Community/Leaderboard/Witness Pool)
- **Admin operability** (manual overrides, audits, payment tools, maintenance tools)
- **Stable environment alignment** (Vercel frontend + Convex backend + Paystack webhooks must point to the same deployment to avoid split-brain)
- **Current merged MVP posture**: users fund each vault directly (stake-per-vault).
- **Active branch evolution**: wallet is being restored as a first-class dashboard and finance surface without replacing the core protocol lifecycle.

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
- Fund a vault (Paystack) to activate it
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
- Unverified users are redirected to `/verify-required` and blocked from dashboard, profile, community, leaderboard, and admin routes.
- Verification email is delivered via Resend (Convex env-driven).
- Admins can manually mark a user email verified via Admin tools for testing.

### 4.2 Goal creation (Vault + Goal)
High-level:
1. User chooses a goal template or custom goal.
2. System creates a `vaults` record in `awaiting_funding` (principal, duration, pain tier).
3. System creates a `goals` record linked to the vault (`vaultId`).
4. User funds the vault via Paystack; once verified the vault becomes `active` and its clock starts (`fundedAt`).

### 4.3 Check-ins (evidence logs)
Current lifecycle (important):
- New log is created as **`status: "pending"`**.
- It becomes **`status: "completed"`** only after witness approval rules finalize it.

Log fields:
- `proofImageId` plus optional `proofImageIds` for multi-image evidence
- derived `proofUrl` and `proofUrls` for display
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
Midnight sweep evaluates compliance and records an explicit penalty breakdown.

Implementation summary:
- Each missed period creates a `penalty_events` row (idempotent per goal+period).
- The vault’s `penaltyAccrued` increments by the penalty amount (it does not reduce the principal field).
- UI shows:
  - Accrued penalties (`penaltyAccrued`)
  - Remaining principal (`amount - penaltyAccrued`)
  - A penalty timeline (from `penalty_events`)

Settlement rule:
- Penalties accrue visually/internally during the vault and are financially settled only at end-of-vault.

### 4.8 Payments (Paystack)
Frontend uses Paystack inline:
- `VITE_PAYSTACK_PUBLIC_KEY` (Vercel env)

Backend uses Paystack secret:
- `PAYSTACK_SECRET_KEY` (Convex env)

Webhooks:
- Endpoint: `https://<deployment>.convex.site/paystack-webhook`
- HMAC verification uses `x-paystack-signature` and `PAYSTACK_SECRET_KEY`.

Events handled include:
- `charge.success` (vault funding)
- Refund/dispute events (safety + reconciliation)

### 4.9 Rewards (Protocol Credits)
MVP rewards are internal, non-transferable “Protocol Credits” distributed in weekly epochs.

Implementation summary:
- Week distribution is recorded in `weekly_reward_distributions` (idempotent per week).
- Pool is computed from penalties collected for the week.
- Allocation is points-weighted using `sqrt(remainingStake)` across a user’s active vaults.
- Credits are not money and are not withdrawable in MVP.

## 5) Admin tooling (what exists)
Admin includes:
- **Manual Overrides**
  - Mark user email verified (requires reason + audit log)
  - Update user verifications/permissions (reason + audit log)
  - Enforce protocol breach / terminate a vault (settles remaining principal only)
- **Maintenance**
  - Data repair tools (e.g., ending duplicate witness relationships)
- **User Terminal**
  - Search users and open dedicated user-detail routes with verification controls

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
- Deploy backend changes to the same deployment your frontend targets (example workflow: `npx convex deploy --env-file .env.local`).

## 9) Paystack test-mode checklist (recommended)
Given you are now using Paystack **TEST** keys:
1. Vercel:
   - `VITE_PAYSTACK_PUBLIC_KEY` = Paystack test public key
2. Convex deployment (the same one used by Vercel):
   - `PAYSTACK_SECRET_KEY` = Paystack test secret key
   - Optional but recommended: `PAYSTACK_MODE=test` (and ensure pk/sk prefixes match)
3. Paystack dashboard (TEST mode):
   - Webhook URL = `https://<active-deployment>.convex.site/paystack-webhook`
4. Run a vault funding test:
   - create a vault (awaiting funding)
   - fund & activate
   - confirm `charge.success` activates the vault once (idempotent)
5. Run edge tests:
   - duplicate webhook delivery (should be idempotent)
   - refund/dispute test (ensure reconciliation is safe)
   - deliberate mode mismatch (ensure it is rejected)

## 10) Version history (recent pushes)
This is a high-level changelog based on commit messages.

- `c0b65c3` Phase 7: verification UX + share presets
  - Full-page verification UX improvements, safe body scroll locking for modals, vault share presets.
- `3fe5c20` Phase 6: witness lifecycle + vault completion
  - Allow re-requesting ended witnesses; auto-end witnesses when a vault completes; hourly completion sweep.
- `1047d59` Phase 5: Paystack mode guards
  - Strict test/live mismatch blocking and webhook domain validation.
- `c5ab1cd` Phase 4: weekly rewards ledger + weighted distribution
  - Credits-only reward epochs with idempotent weekly distribution ledger.
