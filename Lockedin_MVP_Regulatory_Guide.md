# Lockedin — MVP Regulatory & Business Setup Guide
**For AI Agent Review: Implementability Assessment & Alternatives**

> **Context:** Lockedin is a behavioral commitment platform where users stake money on personal goals. Users who fail forfeit their stake into a pool. Users who succeed get their stake back plus a share of the forfeited pool. This document outlines how to structure the business and technical systems to avoid CBN licensing issues at MVP stage in Nigeria.

---

## Agent Review Instructions

Please assess this document across three dimensions:

1. **Technical implementability** — can each recommendation be built, and what is the complexity?
2. **Alternatives** — where a recommendation has risks or limitations, what are the alternative approaches?
3. **Gaps** — what has not been addressed that the system will need to handle?

---

## 1. The Core Problem

Lockedin's model touches activities CBN treats as regulated financial services:

- Collecting and holding user funds → requires Payment Service Provider (PSP) licence
- Pooling user money across participants → regulated activity
- Redistributing pooled funds based on outcomes → can be classified as prize pooling (NLRC jurisdiction)
- Operating stored-value wallets or e-money → regulated by CBN

**The central rule for MVP:** Lockedin must never be the entity holding, pooling, or redistributing user money. The platform determines outcomes. A licensed partner moves the money.

---

## 2. Licences Required If Operating Directly (And Why to Avoid Them)

| Licence | Trigger | Reality |
|---|---|---|
| Payment Service Provider (PSP) | Collecting and holding user funds | 12–24 months to obtain, high capital requirements |
| Microfinance Bank (MFB) | If redistribution resembles deposit-taking or interest | Even harder — avoid this framing entirely |
| NLRC Lottery/Prize Pool | If pool resembles prize pool betting | State + federal regulation, separate process |

**Conclusion:** None of these are viable for MVP. Structure the product to not need them.

---

## 3. Recommended MVP Architecture

### Responsibility Split

| Lockedin Handles | Licensed Partner Handles |
|---|---|
| Goal creation and management | Receiving user stake payments |
| Progress tracking and check-ins | Holding funds in custody |
| Outcome determination (pass/fail logic) | Executing fund redistribution |
| User interface and experience | Processing refunds to successful users |
| Sending payout instructions to partner | All regulated money movement |

### Recommended Licensed Partner: Paystack

Paystack is the primary recommended infrastructure partner. Specific features required:

- **Paystack Split Payments / Subaccounts** — route platform fee vs. stake to separate accounts automatically
- **Paystack Transfers API** — trigger specific payouts only when goal cycles end and outcomes are confirmed
- **Paystack Dedicated Custody Account** — a separate business bank account that only holds user stakes, never touched for operations

---

## 4. Paystack Configuration (Critical — Fix Before Any User Payments)

### Current Problem
If the main business account is set as the Paystack settlement destination, user stakes are auto-settling into the operating account. This means the business is currently holding customer funds without a licence.

### Required Fix

**Step 1 — Create a dedicated stake custody bank account**
- Separate from all operating accounts
- Used only for stake custody
- Never used for salaries, expenses, or any business cost

**Step 2 — Configure Paystack Subaccounts and Split Payments**
- Subaccount A: Operating account (receives platform fee % only)
- Subaccount B: Stake custody account (receives user stake % only)
- Split configured at payment collection so routing is automatic

**Step 3 — Switch to Transfers API for stake payouts**
- Disable auto-settlement for stake custody account
- All payouts triggered manually via Transfers API
- Payout only fires when Lockedin's backend confirms goal cycle outcome
- Lockedin sends instruction → Paystack executes transfer → user receives funds

### Agent: Assess whether Paystack Subaccounts + Transfers API supports this flow fully, and identify any technical constraints or alternatives.

---

## 5. Reward Pool Structure

### How It Works
When a user fails a goal, their stake is forfeited into the pool. At the end of each goal cycle, the pool is distributed as follows:

| Allocation | Percentage | Notes |
|---|---|---|
| Platform fee (Lockedin revenue) | 20–30% | Core business revenue |
| Community Reward Pool | 50–60% | Redistributed to users who completed goals in the same cycle |
| Accountability Reserve | 10–15% | Buffer for disputes, refunds, technical failures |
| Charity / Social Fund (optional) | 5–10% | Reduces gambling classification risk, improves brand perception |

### Why the Charity Allocation Matters
Directing a portion to charity actively distances the product from gambling classification. A purely profit-motivated stake pool looks like gambling. A commitment platform with a social impact component has a stronger regulatory and PR position.

### Agent: Assess whether this pool distribution logic can be implemented programmatically, and whether Paystack's API supports automated pool calculations and multi-recipient disbursement at cycle end.

---

## 6. Token / Credit System

### Purpose
The token system serves as a reward layer that sits between the raw naira pool and users — reducing direct cash-redistribution optics while preserving the incentive mechanic.

### Safe Closed-Loop Structure

| Property | Rule | Reason |
|---|---|---|
| Purchase | Users buy credits with naira via Paystack | Product purchase, not a deposit |
| Utility | Credits usable only inside Lockedin | Keeps it a loyalty point, not e-money |
| Earning | Users earn bonus credits from Community Pool (not raw naira) | Removes direct cash-to-cash redistribution framing |
| Redemption | Credits redeemable via licensed payout partner (Paystack Transfers API) | Lockedin never directly converts credits to naira |
| Transferability | Non-transferable between users | Prevents secondary market, avoids securities classification |

### The Legal Line
- Token that cannot be redeemed for cash directly and cannot be transferred between users = loyalty point = no CBN concern
- Token with direct cash redemption by Lockedin OR user-to-user transfer = e-money or security = CBN concern

### Token Redemption Flow (When User Requests Withdrawal)
1. User requests credit redemption in app
2. Lockedin backend calculates naira equivalent
3. Lockedin sends transfer instruction to Paystack Transfers API
4. Paystack processes payout to user's bank account
5. Lockedin records transaction
6. Lockedin never touches the naira directly

### Agent: Assess technical complexity of this token system. What database structure, conversion logic, and API integration is needed? Are there alternative token/credit architectures that achieve the same regulatory outcome with less complexity?

---

## 7. Language and Positioning Rules

How the product describes itself determines its regulatory classification. These rules apply to all copy — app UI, website, marketing, Terms of Service.

| Never Say | Always Say Instead |
|---|---|
| Win money from other users | Earn Community Rewards for consistency |
| Earn returns on your stake | Receive your share of the Community Pool |
| Investment | Commitment stake |
| Deposit your money | Lock your commitment stake |
| Withdraw your earnings | Redeem your reward credits |
| Interest | Community incentive |
| Guaranteed reward | Reward eligibility (subject to pool size) |

---

## 8. CBN Regulatory Sandbox

### What It Is
CBN operates a Regulatory Sandbox for innovative fintech products that don't fit existing licensing categories. It provides legal cover to test with real users while regulatory frameworks catch up.

### Why Lockedin Qualifies
- Genuinely novel product — behavioral commitment + financial stakes has no existing Nigerian regulatory category
- Not primarily a financial product — money is the mechanism, not the product
- CBN prefers companies that approach proactively over companies they discover later

### When to Apply
After MVP launch with real user data (100–500 users minimum). Use actual product evidence, not just a pitch deck.

### Agent: Research whether CBN Sandbox applications are currently open, what the current requirements are, and what documentation Lockedin would need to prepare.

---

## 9. Three-Phase Roadmap

### Phase 1 — MVP Launch (0–6 months)

**Goal:** 100–1,000 active users. Prove retention and completion rate.

- Paystack handles all money movement
- Dedicated stake custody account configured
- Transfers API for payouts
- Operating account receives platform fees only
- Community Reward Pool distributes credits, not raw naira
- Closed-loop credit system, no direct naira redemption by Lockedin
- Positioning: behavioral commitment platform only
- Legal: one-time fintech lawyer review of Terms of Service and payment flow (budget ₦100,000–₦200,000)

### Phase 2 — Partnership & Scale (6–18 months)

**Goal:** 5,000–20,000 users. Revenue covering operations.

- Formalise partnership with licensed MFB or regulated fintech infrastructure provider
- Apply for CBN Regulatory Sandbox
- Introduce full token system with formal redemption flow via licensed partner

### Phase 3 — Licensing (18–36 months)

**Goal:** 50,000+ users. Institutional investment.

- Apply for PSP licence or acquire a licensed entity
- Operate full naira redistribution under own regulatory framework
- Evaluate expansion to Ghana, Kenya, South Africa

---

## 10. Immediate Action Items (Prioritised)

| Priority | Action | Timing |
|---|---|---|
| Critical | Remove main account as Paystack settlement destination for stakes | Today |
| Critical | Create dedicated business bank account for stake custody only | This week |
| Critical | Configure Paystack Subaccounts and Splits for stakes vs. fees | Before any user payments |
| Critical | Implement Transfers API for stake payouts | Before launch |
| High | Audit all app copy and marketing against language rules in Section 7 | Before launch |
| High | Engage Nigerian fintech lawyer for Terms of Service and product structure review | Before first 100 users |
| High | Draft and publish Terms of Service covering stakes, reward pool, and credits | Before launch |
| Medium | Build consumer protection policy covering refunds, disputes, and technical failures | Within 30 days of launch |
| Medium | Prepare CBN Sandbox application documentation | 3 months post-launch |

---

## 11. Key Risks Not Fully Resolved

These are areas where the current recommendations reduce risk but do not eliminate it. Flag these for further review:

1. **Paystack dependency** — the entire financial architecture depends on Paystack remaining available and maintaining the same API capabilities. What is the contingency if Paystack changes terms or pricing?

2. **Pool cycle timing** — if many users fail in the same cycle, the payout pool may be large and attract attention. Is there a threshold above which Paystack payouts trigger additional compliance checks?

3. **User disputes** — if a user disputes a goal outcome (claims they completed it but the system marked them as failed), what is the resolution process and who holds the funds during a dispute?

4. **Charity allocation mechanics** — if a charity fund is included, the legal structure for holding and disbursing that fund needs to be defined. Which registered charity receives it? How often is it disbursed?

5. **Scale risk** — the Paystack + custody account structure works cleanly at small scale. At what user volume or naira volume does this structure become insufficient and a formal licence become unavoidable?

---

## Summary for Agent

This document proposes that Lockedin launch as a **software platform** that instructs a licensed financial partner (Paystack) to move money — rather than as a financial product itself. The core technical requirements are:

- Paystack Subaccounts and Split Payments
- Paystack Transfers API integration
- A closed-loop credit/token system with deferred redemption
- A pool calculation engine that determines distributions at goal cycle end
- A clear outcome determination system (pass/fail logic per goal)

**Please assess:**
1. Whether each of these components can be built and what the technical complexity is
2. What alternatives exist for the financial infrastructure layer (alternatives to Paystack, alternative fund custody structures)
3. What is missing from this architecture that the system will need
4. Whether the token/credit system as described is the simplest viable approach or whether a simpler structure achieves the same outcome
5. Any implementation risks or technical blockers not addressed in this document
