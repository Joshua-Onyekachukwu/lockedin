# Licensed Partner Funds Architecture (Nigeria)

## Goal
Minimize CBN/regulatory exposure by ensuring **Lockedin does not “hold user funds” directly** (especially not into personal accounts), while still supporting:
- Wallet balances (ledger)
- Deposits (fund wallet)
- Staking (lock funds against a goal)
- Withdrawals (payout back to the user)

The core idea is: **a licensed partner holds the regulated funds**; Lockedin maintains an **internal ledger** and sends **instructions** to the partner for money movement.

## Shortlist: MMO vs MFB vs PSP (what they mean)

### 1) MMO (Mobile Money Operator / Wallet provider)
**What it is:** A licensed wallet provider that can hold customer funds (often via pooled trust accounts) and provides wallet APIs, KYC tiers, and transfers.

**Pros**
- Strongest “regulated holding” fit for a wallet model.
- Built-in KYC tiers/limits and compliance workflows.
- Often supports virtual accounts, transfers, and payout rails.

**Cons**
- Integration + onboarding can be heavy (KYC, compliance reviews).
- Higher friction for users (verification, limits).
- Fees can be higher; some providers require minimum volumes or contracts.

**Best fit for Lockedin**
- If you want a real “wallet” experience (balances that persist) with compliant fund custody.

---

### 2) MFB (Microfinance Bank)
**What it is:** A regulated bank (microfinance) that can provide accounts/escrow structures and sometimes APIs via partners/aggregators.

**Pros**
- Strong banking-regulatory posture.
- Escrow/trust structures can be clearer for “holding”.
- Can support virtual accounts and controlled settlement.

**Cons**
- APIs may be less developer-friendly unless layered through an aggregator.
- Onboarding and compliance can be slower.
- Product features (wallet-like flows) may be limited or require extra partners.

**Best fit for Lockedin**
- If you want “escrow-like” custody and you are okay with less flexibility than an MMO.

---

### 3) PSP (Payment Service Provider / Gateway like Paystack/Flutterwave)
**What it is:** A payment gateway/processor for collections and payouts.

**Pros**
- Fastest to integrate for deposits and transfers.
- Great developer tooling and reliability for payments.

**Cons (important)**
- Usually you are still the **merchant-of-record**.
- Settlement typically goes to the merchant’s bank account (personal/corporate).
- Not a true escrow/custody model for holding user balances.

**Best fit for Lockedin**
- Good for early testing and “no-wallet” models, but not sufficient alone to avoid “holding funds” concerns.

## Recommended architecture (cleanest + lowest exposure)

### A) System roles
- **Licensed Partner (MMO/MFB)**: Holds the regulated funds, enforces KYC tiers/limits, executes money movement.
- **Lockedin**: Maintains an internal ledger, goal state, witness approval state, and sends transfer instructions.

### B) Ledger model in Lockedin (internal only)
Maintain a double-entry (or at least strongly consistent) ledger with these logical accounts:
- `user_available_balance`
- `user_staked_balance` (per vault/goal)
- `platform_revenue_account`
- `reward_pool_account`
- `settlement_clearing_account` (optional, for reconciliation)

Lockedin ledger is the product source-of-truth for UX, but **the licensed partner is the custody source-of-truth for real funds**.

### C) Money flows

#### 1) Deposit (Fund wallet)
1. User initiates deposit.
2. Partner creates a virtual account / payment intent.
3. Payment completes at partner.
4. Partner webhook → Lockedin reconciles and credits `user_available_balance`.

#### 2) Stake (Lock funds against a goal)
1. User stakes from available balance.
2. Lockedin moves ledger: `available → staked`.
3. Optionally instruct partner to move funds into a dedicated sub-account/bucket if partner supports it.

#### 3) Penalty enforcement + pool/revenue split
1. When breach occurs: Lockedin computes penalty.
2. Lockedin moves ledger:
   - `user_staked_balance` decreases
   - `platform_revenue_account` increases (70%)
   - `reward_pool_account` increases (30%)
3. Partner custody: either remains pooled or moved between buckets depending on partner capabilities.

#### 4) Withdrawal (User cashes out)
1. User requests withdrawal from `available`.
2. Lockedin debits `available` (pending).
3. Lockedin calls partner payout API.
4. Partner executes transfer and webhook confirms completion.
5. Lockedin marks withdrawal completed (or rolls back if failed).

### D) KYC and limits (Partner enforced)
Partner should enforce:
- Tier-based KYC (unverified / basic / full)
- Daily/monthly limits
- AML monitoring

Lockedin should mirror the partner tier in user profile to inform UX, but avoid being the compliance authority.

## Transition plan from today (Paystack → Licensed Partner)

### Phase 0 (current testing)
- Keep test amounts small (e.g., ₦500–₦1,000) and treat as a pilot.
- Do not scale up “public” usage until:
  - business registration + corporate account exists, and/or
  - licensed partner custody is in place.

### Phase 1 (business ready)
- Register business + open corporate account.
- Move Paystack settlement from personal to corporate as an interim step.

### Phase 2 (licensed partner integration)
- Integrate partner custody APIs.
- Convert Paystack to “top-up rail” (optional) or retire it depending on partner capabilities.
- Keep Lockedin ledger and reconcile against partner statements/webhooks.

## What you should ask a prospective licensed partner
- Do you provide regulated custody for end-user balances (and how is it structured)?
- Do you support virtual accounts for deposits?
- How do you do KYC tiers and what are the limits per tier?
- Do you support programmatic transfers/payouts with webhooks?
- What settlement reports/reconciliation tools do you provide?
- Fees (deposit, transfer, chargebacks, disputes) and dispute handling responsibility.

