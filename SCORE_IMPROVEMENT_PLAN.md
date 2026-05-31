# Lockedin — Score Improvement Implementation Plan
**Goal:** Improve the V-POEM overall score by strengthening regulatory posture, operational scalability, retention, and defensibility.  
**Scope:** Current product (NGN/Paystack) with a future plan for multi-currency + Stripe later.

---

## 0) Guiding Principle
To improve the score, the product must evolve from “a high-stakes habit app” into a **trusted commitment finance product** with:
- clear rules and predictable outcomes,
- strong dispute handling,
- fraud-resistant mechanics,
- credible compliance posture,
- a wedge distribution strategy (creator/community driven),
- metrics-driven iteration.

---

## 1) Vision Improvements (Raise 7 → 8+)

### 1.1 Positioning Reframe (public narrative)
**Current risk:** The “earn from others’ losses” narrative can trigger backlash and regulatory suspicion.  
**New narrative:** “Commitment escrow + accountability + outcomes.”

**Public messaging pillars**
- “Commit your money behind your goal.”
- “Funds are locked by your chosen rules.”
- “Proof + accountability create follow-through.”
- “Rewards are an incentive pool for adherence (not gambling).”

### 1.2 Landing Page edits (content plan)
Add a dedicated section:
- “How the Protocol Works”
  - deposit → commit → check in → verify → outcomes
- “Rules & Fairness”
  - penalty tiers clearly explained
  - what triggers penalties, how disputes work
- “Risk & Responsibility”
  - users opt in and choose tier
  - clear confirmation step before staking

**Mandatory copy improvements**
- Replace ambiguous “earn from others” with:
  - “The incentive pool is funded by forfeitures from failed commitments.”
- Add “This is not an investment product” disclaimer (wording should be lawyer-reviewed).

---

## 2) Proposition Improvements (Raise 6 → 7+)

### 2.1 Reduce activation friction
**Goal:** signup → first stake → first check-in within 24 hours.

Changes:
- “Quick Start Protocol”: a 7-day commitment with a small minimum stake
- Default settings tuned for success:
  - easy schedule selection
  - clear daily reminder cadence (push later via PWA)
- A “First Win” screen after first check-in:
  - reinforce identity
  - show next deadline and consequences clearly

### 2.2 Dispute Flow v1 (essential)
**Goal:** predictable outcomes reduce chargebacks and anger.

Rules (example policy):
- Disputes must be raised within a time window (e.g., 24h)
- Evidence requirements are explicit
- Outcomes are standardized:
  - Approved
  - Rejected (reason)
  - Escalated to admin review (rare, paid tiers only)

Product changes:
- Dispute button with reason codes
- Admin queue for disputes with SLA target
- Audit log entries for all decisions

### 2.3 Make witnessing safer (trust & safety)
- Rate-limit witness actions
- Prevent repeated collusion patterns
- Reporting system:
  - report abusive witness behavior
  - block future matching

### 2.4 Improve economic fairness perception
Add clear receipts:
- after each penalty: “why this happened”, “which rule was triggered”, “which tier applied”
- ledger entries always match user-visible balance changes

---

## 3) Organization Improvements (Raise 6 → 7+)

### 3.1 Build an “Ops Desk”
Define:
- payment investigations workflow
- dispute handling workflow
- support response templates
- escalation policy

Minimum roles (can be contractors initially):
- Compliance counsel (external)
- Risk/ops lead (part-time to start)
- Support agent(s)

### 3.2 Weekly execution cadence
Every week:
- Activation funnel review
- Retention cohorts (D1/D7/D30)
- Penalty → churn correlation
- Dispute rate
- Chargeback rate

---

## 4) Economics Improvements (Raise 5 → 6+)

### 4.1 Reduce dependence on “users failing”
Introduce revenue streams not dependent on forfeits:
- Subscription tiers (premium analytics, more shields, better witness tools)
- Creator challenge fee
- B2B/team plans

### 4.2 Risk-aware unit economics tracking
Track:
- net revenue after refunds/chargebacks
- support cost per active user
- disputes per 100 users

---

## 5) Milestones Plan (Raise 5.5 → 7+)

### Phase 1 — Validation (Controlled cohort)
**Product goal:** prove repeat deposits + retention with low disputes.

Run:
- 14-day creator-led cohort (50–200 users)
- focus on one vertical (fitness, creators, founders)

Success metrics:
- signup → deposit conversion ≥20–35%
- D7 retention ≥20–30%
- repeat deposit rate ≥20% of depositors
- dispute + chargeback rates within a strict internal threshold

Go/No-Go:
- If penalty events cause large churn spikes, redesign penalty UX and dispute rules before growth.

### Phase 2 — MVP hardening
Build:
- Dispute flow v1
- Reporting/moderation basics
- Analytics dashboards

### Phase 3 — Early Growth
Channels:
- creators
- communities
- referral loops with integrity-based incentives

### Phase 4 — Scale
Build:
- full compliance posture per country
- dedicated risk ops + tooling
- multi-currency + Stripe (later)

---

## 6) Regulatory + Operational Risk Strategy (Defeat the biggest weakness)

### 6.1 Regulatory classification risk — mitigation strategy
1) Stop “wagering” framing (language and UX)
2) Explicit user consent at stake time (rules, tier, penalties, dispute policy)
3) Geo strategy (launch where classification is clearest; restrict others)
4) Legal memo (classification + licensing/registrations + disclosures)
5) Refund & dispute policy (public and lawyer-reviewed)

### 6.2 Fraud + support risk — mitigation strategy
1) Operational tooling (payments explorer, dispute queues, audit logs)
2) Dispute flow v1 (predictable, timeboxed, consistent)
3) Fraud flags (velocity limits, collusion signals, suspicious patterns)
4) Support scaling metrics (tickets per 100 users; pause growth if it spikes)

---

## 7) Concrete Next Actions (Execution Order)
1) Update landing page messaging + disclosures (draft copy + lawyer review)
2) Add analytics instrumentation and weekly metrics review cadence
3) Build dispute flow v1 (product + admin queue)
4) Run the 14-day controlled cohort and evaluate go/no-go
5) Only after the cohort passes: invest in growth and expansion
