# Lockedin — Phase 1 Execution Plan (Score Improvement)
**Scope:** Start with the three priorities you selected:  
1) Landing page messaging + disclosures (draft copy + lawyer review)  
2) Analytics instrumentation + weekly metrics cadence  
3) Dispute flow v1 (product + admin queue)  

**Constraint:** Avoid expanding currencies/providers now; keep Paystack/NGN stable. Multi-currency + Stripe later.

---

## A) Workstream 1 — Landing Page Messaging + Disclosures

### A1. Inputs
- [LEGAL_REVIEW_PACKET.md](file:///c:/Users/Semek/Webstrom/Lockedin/LEGAL_REVIEW_PACKET.md)
- Current landing page copy and any marketing materials (ads, pitch decks, social posts)
- Current product flows: stake/lock, penalties, incentive distribution, witness verification

### A2. Deliverables
1) Landing page copy v2 (risk-reduced language)
2) “How it Works” section (step-by-step, plain English)
3) “Rules & Fairness” section
4) “Risk Disclosure” section (short, clear)
5) Pre-stake confirmation copy requirements (modal content)
6) Policy docs checklist (Terms/Privacy/Refund/Dispute) for counsel

### A3. Messaging changes (implementation guidance)
**Replace high-risk framing**
- “Earn from others’ losses” → “Incentives are funded from forfeitures under published rules.”
- Avoid “bank”, “investment”, “dividends/ROI/yield” language unless counsel approves.
- Avoid “guaranteed results” claims.

**Add clarity**
- Penalty tiers (2%/5%/10%) and exactly when they apply
- What “verification” means and the dispute window
- What portion goes to platform fee vs incentive pool (use consistent numbers)

### A4. Legal review workflow (recommended)
1) Draft landing page v2 copy internally (risk-aware)
2) Send to external counsel using the packet
3) Apply counsel feedback
4) Add geo restrictions (if required) and policy links

### A5. Go/No-Go criteria
- No launch until:
  - counsel has reviewed the highest-risk claims and disclosures
  - refund/dispute policy is defined (even if minimal)

---

## B) Workstream 2 — Analytics Instrumentation + Weekly Metrics Cadence

### B1. Goal
Make decisions with evidence: activation, retention, penalties, disputes, and payments reliability.

### B2. What to instrument (events)
**Activation funnel**
- `signup_completed`
- `profile_completed`
- `deposit_started`
- `deposit_verified_success`
- `first_stake_created`
- `first_checkin_submitted`
- `first_checkin_verified`

**Economics and risk**
- `penalty_applied` (tier, amount, reason)
- `dispute_opened` / `dispute_resolved` (reason, outcome, time-to-resolve)
- `chargeback_reported` (manual for now)
- `payment_unmatched_created` / `payment_reconciled`

**Engagement**
- `daily_active`
- `weekly_active`
- `notification_opened`
- `witness_invite_sent` / `witness_invite_accepted`

### B3. Data model / storage approach (recommended)
Option 1 (fastest): create an `analytics_events` table in Convex and insert events from key mutations/actions.  
Option 2 (hybrid): store minimal events in Convex + forward to a BI tool later.

### B4. Dashboards (minimum viable)
- Funnel dashboard (signup → deposit → stake → check-in)
- Cohorts (D1/D7/D30)
- Penalty-to-churn correlation
- Disputes volume and resolution time
- Payment mismatch rate

### B5. Weekly cadence
Every week, review:
- Deposit conversion and repeat deposit rate
- D1/D7 retention
- Penalty events vs churn (same-day and next-day)
- Dispute rate per 100 users
- Support workload (tickets per 100 users)

### B6. Go/No-Go criteria
- If penalty events correlate with steep churn spikes:
  - improve penalty UX and dispute policy before growth

---

## C) Workstream 3 — Dispute Flow v1 (Product + Admin Queue)

### C1. Goal
Make outcomes predictable and reduce refunds/chargebacks by giving users a fair, timeboxed process.

### C2. Policy decisions to finalize (required before coding)
1) Dispute eligibility window (e.g., 24 hours from check-in submission/verification)
2) Dispute reasons (predefined list)
3) Outcomes:
   - uphold approval
   - overturn approval (mark as rejected)
   - escalate to admin review (rare)
4) SLAs:
   - user sees status updates
   - admin resolution time target

### C3. Product requirements
User side:
- “Open dispute” on a log result (with reason and optional note)
- dispute status tracking
- outcome explanation (“why”)

Admin side:
- Dispute queue:
  - filter by status (open/assigned/resolved)
  - sort by urgency (deadline)
  - view evidence and history
- Resolution actions:
  - approve, reject, escalate
- Audit log entry for every decision

### C4. Technical plan (high level)
- New Convex table: `disputes`
- Indexes:
  - by_status
  - by_user
  - by_goal_log
  - by_deadline
- Mutations/actions:
  - `disputes.open`
  - `disputes.listMine`
  - `admin.listDisputesPage`
  - `admin.resolveDispute`
- UI:
  - user dispute modal
  - admin dispute queue page/modal

### C5. Go/No-Go criteria
- Do not scale acquisition until dispute handling is stable and predictable.

---

## D) Admin + Security Section (Regulatory/Operational Risk Readiness)

### D1. Admin improvements to support these workstreams
- Add a “Disputes” tab/queue
- Add “Risk/Operations” overview metrics (unmatched payments, disputes, chargeback manual logs)
- Keep all actions audited (admin_audit)

### D2. Security hardening priorities (non-optional)
- Rate-limit or cap heavy read queries (avoid Convex read explosions)
- Keep all secrets out of repo; rotate if exposed
- Formalize admin allowlist and review access regularly

---

## E) What I Need From You (for the lawyer + messaging workflow)
1) Launch geography (country) and target geo rollout order
2) Preferred brand tone:
   - “premium discipline” vs “friendly habit coaching”
3) Any existing Terms/Privacy pages (even drafts)
4) Whether you want geo-restrictions at launch (recommended)

