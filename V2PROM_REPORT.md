# V2PROM Report (Lockedin) + Improvement Plan

Date: 2026-06-07

This report uses the V2PROM framework:
- V = Value
- P = Positioning
- R = Risks
- O = Objectives
- M = Metrics

It includes:
- Current score and why
- What evidence we already have in the product
- Gaps preventing a higher score
- Concrete recommendations to push each dimension above 8.5/10

## 0) Summary Score (Current)
Overall V2PROM Score (today): 7.5/10

Target: 8.5/10+

Fastest path to 8.5+:
1) Make the “money story” and settlement rules extremely simple and explicit everywhere.
2) Improve operational reliability + trust signals (support/dispute + system transparency).
3) Instrument the funnel and optimize activation → first funded vault → week-1 retention.
4) Narrow the initial wedge (one segment, one job-to-be-done) and prove retention.

## 1) V — Value

### Score: 8.5/10 (Potential), 8.0/10 (Current execution)

### What Lockedin’s core value is
Lockedin is an accountability system that increases the probability users follow through on goals by combining:
- Stakes per goal (commitment pressure)
- Social verification (witnesses)
- Visible consequences and progress tracking
- A structured lifecycle (“protocols” / vaults) instead of vague to-do lists

The product’s true value is not “money loss”.
The value is: higher follow-through, identity-level habit change, and credible commitment.

### Evidence we already have in the build
- Stake-per-vault funding and clear vault lifecycle states (e.g., `awaiting_funding` → active).
- Penalty transparency: penalties accrue visibly (ledger/timeline) with settlement at end-of-vault.
- Witness verification workflow for evidence logs.

### Gaps lowering Value score
- Too much cognitive load early: users must understand several concepts before the first “win”.
- The “what happens to my money” story is not yet presented as a simple, repeated guarantee.
- The first 10 minutes experience doesn’t force a fast activation (create + fund + first check-in).

### Recommendations to push Value to 9/10
1) Create a single “First Win” flow:
   - Login → Choose template → Fund vault → Schedule first check-in → Done.
2) Add a “Vault Summary Card” shown everywhere:
   - Stake, status, next check-in, what happens if missed, settlement rule.
3) Introduce “micro-proofs”:
   - Immediate feedback after first check-in submitted (status, what witness sees, next step).
4) Reduce feature spread in early UX:
   - Hide advanced features until a user funds their first vault.

## 2) P — Positioning

### Score: 7.5/10 (Current)

### Current positioning (implicit)
- A behavioral commitment platform with stake-backed goals and witness verification.
- Compliance-aware, non-custodial posture (stake-per-vault, no wallet top-up).

### What is strong
- Differentiation: most habit apps do not have credible commitment mechanisms.
- The “protocol” framing can become a strong brand identity.

### Gaps lowering Positioning score
- The product message can be interpreted as “betting” or “investment-like” unless carefully framed.
- The target customer segment is not yet “one sentence clear”.
- We need consistent language on every high-visibility surface:
  - landing
  - dashboard create flow
  - vault details
  - support/FAQ

### Recommendations to push Positioning to 9/10
1) Write and enforce a “Positioning One-Liner” everywhere:
   - Example: “Lockedin helps you keep your goals by turning them into a protocol with real accountability.”
2) Add a “Non-custodial clarity” block in-product:
   - “Funds are staked per protocol; no stored wallet balance; settlement rules are shown upfront.”
3) Narrow the first wedge:
   - Pick one initial segment (e.g., Nigerian young professionals building consistency) and speak directly to it.
4) Create a 60-second demo narrative:
   - Create → Fund → Check-in → Witness review → Outcome.

## 3) R — Risks

### Score: 6.5/10 (Current)

### Main risk categories
1) Payment reliability + reconciliation
2) Disputes/chargebacks and user trust
3) Fraud/abuse (fake evidence, collusion, witness gaming)
4) Compliance perception (language + product posture)
5) Operational readiness (support loops)

### Evidence we already have in the build
- Strict Paystack test/live enforcement server-side.
- Penalties accrue but settle at end (reduces “live custody” perception).
- Witness lifecycle and periodic sweeps exist.

### Gaps lowering Risks score
- Missing admin “reconciliation cockpit” for payment failures and unmatched transactions.
- Not enough rate limiting and abuse throttles in sensitive flows.
- Dispute process not yet visible and standardized.

### Recommendations to push Risks to 8.5/10
1) Build an Admin Payments Console:
   - List unmatched Paystack references
   - Re-verify/reconcile buttons (audited)
   - Clear statuses and failure reasons
2) Introduce a “Dispute Playbook”:
   - In-app text: how to report a payment issue, expected response time, evidence required.
3) Add anti-abuse throttles:
   - Rate limit email verification requests and payment initialization retries.
4) Add basic fraud flags:
   - Repeated failed evidence attempts
   - Suspiciously frequent vault creation/funding patterns

## 4) O — Objectives

### Score: 8/10 (Current)

### Current product objectives (implied)
MVP objective: prove that “stake + witness verification” increases follow-through and retention.

To make this measurable, objectives must be explicit:
- Activation objective: users reach “funded vault” quickly.
- Retention objective: users complete multiple check-ins in week 1.
- Trust objective: payments reconcile smoothly; disputes are handled predictably.

### Gaps lowering Objectives score
- Funnel objectives aren’t yet enforced by UX (users can wander).
- Admin objectives (support/reconciliation speed) aren’t operationalized with tools.

### Recommendations to push Objectives to 9/10
1) Define 3 MVP Objectives for the next 30 days:
   - Activation: improve % of signups that fund a vault within 24 hours.
   - Retention: improve week-1 “kept check-in schedule” rate.
   - Trust: reduce “payment status confusion” to near zero.
2) Make the dashboard UX objective-driven:
   - Show a single next step CTA depending on state (create → fund → check-in → review).

## 5) M — Metrics

### Score: 7/10 (Current)

### Metrics Lockedin should track (minimum viable analytics)
Activation and conversion:
- Signup → Create vault conversion
- Create vault → Fund vault conversion
- Fund vault → First check-in submitted conversion

Retention and behavior:
- Week-1 retention (D1/D7)
- Check-in adherence rate (completed / expected)
- Witness review turnaround time

Payment reliability:
- Webhook failure rate
- Reconciliation time (time from payment → vault active)
- Unmatched payment count
- Dispute rate / chargeback rate

Support and trust:
- Support request rate per 1,000 users
- Median time-to-resolution for payment issues

### Gaps lowering Metrics score
- Metrics aren’t explicitly instrumented and displayed to admin.
- “One dashboard” for the business isn’t defined yet (even a basic one).

### Recommendations to push Metrics to 8.5/10
1) Add a simple “Business Health” admin dashboard:
   - activation, funding conversion, retention proxy, unmatched payments
2) Add event logging for core funnel steps:
   - created_vault, started_funding, funding_verified, first_checkin, vault_completed
3) Add operational metrics:
   - witness review times, disputes, failed webhooks

## 6) Packaging Recommendations (to reinforce V2PROM)
Packaging should increase:
- Value (better outcomes)
- Trust (support, tools)
- Positioning (premium “protocol operations”)

Recommended tiers are documented in:
- PRICING_AND_PACKAGING.md

To improve V2PROM via packaging:
- Operator tier should reduce friction and increase consistency (templates + reminders + analytics).
- Elite tier should buy trust (priority support + reconciliation/dispute priority + higher limits).

## 7) Action Plan to Reach 8.5/10+
Step 1: Make the “money story” explicit and repeated
- Add short, consistent copy blocks in key flows (create/fund/vault details).

Step 2: Build operational tooling for payments + support
- Admin payments console + audited reconciliation.

Step 3: Improve mobile UX for core flows
- Fix the primary funnel experience on small screens.

Step 4: Add growth system
- Activation checklist + referral incentives (credits-only).

Step 5: Instrument metrics
- At minimum, track funnel steps and show a basic admin health panel.

