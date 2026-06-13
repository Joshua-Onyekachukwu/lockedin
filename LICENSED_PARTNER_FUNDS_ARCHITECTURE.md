# Licensed Partner Funds Architecture (Nigeria)

## Executive Recommendation
For the wallet system Lockedin wants to ship, the best operating structure is:

- **Primary recommendation:** partner with a **licensed MFB**
- **Why:** it gives the cleanest path for wallet balances, controlled custody, virtual account collection, payout operations, reconciliation, and a stronger regulatory posture before live launch
- **Secondary fallback:** use an MMO only if the partner has better wallet APIs, stronger KYC tooling, and clear settlement/reconciliation support
- **Not sufficient alone:** a PSP/payment gateway by itself is not enough if Lockedin will show wallet balances, hold value over time, and allow withdrawals

## Goal
Minimize CBN/regulatory exposure by ensuring **Lockedin does not “hold user funds” directly** (especially not into personal accounts), while still supporting:
- Wallet balances (ledger)
- Deposits (fund wallet)
- Staking (lock funds against a goal)
- Withdrawals (payout back to the user)

The core idea is: **a licensed partner holds the regulated funds**; Lockedin maintains an **internal ledger** and sends **instructions** to the partner for money movement.

## Decision Summary

### Why MFB is the best fit for Lockedin
- Lockedin wants **persistent balances**, **stake locking**, **withdrawals**, **reconciliation**, and likely **virtual account collection**
- That behaves more like a controlled wallet/ledger product than a one-off payment checkout flow
- An MFB-backed structure is easier to defend when users ask:
  - where funds sit
  - how withdrawals are processed
  - who actually holds regulated funds
  - how reversals, disputes, and failed payouts are handled
- It also makes it easier to separate:
  - **regulated custody** at partner level
  - **product ledger + protocol logic** inside Lockedin

### Lockedin operating model under this structure
- **MFB partner** holds and settles money
- **Lockedin** maintains product ledger, goal state, stake state, reward/penalty logic, and user-facing transaction history
- **Paystack** can remain a collection rail during test phase, but should eventually become either:
  - a top-up rail into the partner-led system, or
  - optional/removed if the MFB partner provides its own collection methods

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

### 2) MFB (Microfinance Bank) — Recommended
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
- If you want the strongest practical fit for:
  - wallet balances
  - account/escrow-like custody
  - stake locking
  - withdrawal operations
  - better regulatory defensibility before scale

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

## Recommended Architecture (cleanest + lowest exposure)

### A) System roles
- **Licensed MFB Partner**: Holds the regulated funds, enforces KYC tiers/limits, executes money movement, and acts as the regulated custody layer.
- **Lockedin**: Maintains the internal product ledger, goal state, witness approval state, penalty/reward logic, and sends transfer instructions.
- **Paystack (test/live rail)**: Optional collection rail during pilot/testing; should not be treated as the custody model by itself.

### B) Ledger model in Lockedin (internal only)
Maintain a double-entry (or at least strongly consistent) ledger with these logical accounts:
- `user_available_balance`
- `user_staked_balance` (per vault/goal)
- `platform_revenue_account`
- `reward_pool_account`
- `settlement_clearing_account` (optional, for reconciliation)
- `withdrawal_hold_account`
- `dispute_hold_account`

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

#### 5) Failed payout / reversal handling
1. If payout fails, funds move from `withdrawal_hold_account → user_available_balance`.
2. User sees:
   - requested amount
   - provider fee
   - actual receivable amount
   - failure reason if applicable
3. Lockedin stores an auditable event trail for:
   - request
   - pending
   - provider response
   - completion/failure
   - rollback if needed

### D) KYC and limits (Partner enforced)
Partner should enforce:
- Tier-based KYC (unverified / basic / full)
- Daily/monthly limits
- AML monitoring

Lockedin should mirror the partner tier in user profile to inform UX, but avoid being the compliance authority.

## What must be visible to users in the wallet product

### Wallet overview
- Available balance
- Staked balance
- Pending withdrawals
- Recent transactions
- Pending disputes/refunds if applicable

### Deposit UX
- Funding method
- Gross amount
- Processor fee if passed through
- Net credited amount
- Current status: pending / confirmed / failed

### Stake UX
- Amount moved from wallet into stake
- Which vault/goal it funds
- Locked timestamp
- Remaining principal after penalties

### Withdrawal UX
- Requested amount
- Provider/bank fee
- Estimated receivable amount
- Status timeline
- Failure rollback if transfer fails

## Transition plan from today (Paystack → Licensed Partner)

### Phase 0 (current testing)
- Keep test amounts small and treat the current system as controlled pilot usage.
- Keep **test-mode Paystack only** while:
  - wallet UX is rebuilt
  - ledger transparency is implemented
  - withdrawal disclosures are complete
  - partner conversations are active
- Do not move wallet balances to live production until:
  - corporate entity/account structure is in place
  - licensed MFB partner is selected
  - legal review confirms the operating model and user disclosures

### Phase 1 (business ready)
- Register business + open corporate account.
- Move any settlement out of personal rails and into controlled business rails.
- Finalize wallet ledger definitions and finance operations policy.
- Finalize:
  - terms
  - privacy policy
  - fees disclosure
  - reversal/dispute policy
  - withdrawal SLA wording

### Phase 2 (licensed partner integration)
- Integrate MFB custody APIs.
- Convert Paystack into a collection/top-up rail only if needed.
- Keep Lockedin ledger and reconcile against MFB statements/webhooks.
- Add daily reconciliation routines and admin exception tooling.

### Phase 3 (live wallet rollout)
- Enable live wallet funding
- Enable live withdrawals
- Enable stake-from-wallet funding
- Enable compliance monitoring dashboards and reconciliation reports

## What you should ask a prospective licensed MFB partner
- Do you provide regulated custody for end-user balances (and how is it structured)?
- Do you support virtual accounts for deposits?
- How do you do KYC tiers and what are the limits per tier?
- Do you support programmatic transfers/payouts with webhooks?
- What settlement reports/reconciliation tools do you provide?
- Fees (deposit, transfer, chargebacks, disputes) and dispute handling responsibility.
- Can balances be ring-fenced or bucketed for locked stake amounts?
- Can you support sub-ledger or tagged-balance semantics for held funds?
- What is your withdrawal turnaround SLA?
- How are failed transfers and disputed inflows reversed operationally?
- What legal/compliance documents do you require from us before go-live?

## Lockedin implementation checklist for this model

### Product
- Wallet page
- Deposit flow
- Withdrawal flow
- Stake-from-wallet flow
- Transaction history
- Fee and settlement disclosures

### Backend
- Strong ledger events
- Withdrawal hold states
- Reconciliation jobs
- Admin exception tools
- Partner webhook verification

### Compliance / Ops
- Corporate bank/account setup
- Partner agreement
- Legal review
- Terms/privacy/risk disclosures
- Support SOP for payment complaints, reversals, and withdrawals

## Bottom line
- **Best partner model for Lockedin wallet:** licensed **MFB**
- **Why:** strongest balance of custody posture, wallet viability, payout operations, and regulatory defensibility
- **Use Paystack during testing only as a rail, not as the long-term custody answer**
