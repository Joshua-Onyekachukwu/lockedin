# V2PROM Report (Lockedin) — Detailed Score Uplift Playbook

Date: 2026-06-07

This report uses the V2PROM framework:
- V = Value
- P = Positioning
- R = Risks
- O = Objectives
- M = Metrics

Primary goal: explain why the score is currently ~7.5/10 and provide a concrete, step-by-step playbook to push it to 8.5/10+ with specific, verifiable improvements for each dimension.

## 0) How to Read This (Scoring Rubric)

Each dimension is scored 0–10 using the same rubric:
- 0–3: unclear, not evidenced, high risk, no repeatability
- 4–6: idea is plausible, some evidence, still fragile
- 7–8: strong product logic, credible delivery, early repeatability
- 9–10: sharp wedge + proof + operational maturity + predictable scaling levers

For each dimension below you’ll see:
- Current score and why
- What’s already true in the product (evidence)
- The specific gaps that prevent a higher score
- Recommended steps to close each gap (and why each step increases the score)
- “Acceptance checks” so we can tell it’s done

## 1) Summary Score (Current) + The Fastest Path to 8.5/10+

Current overall V2PROM Score: **7.5/10**  
Target: **8.5/10+**

The score is pulled down mostly by:
- **R (Risks)**: operational trust gaps (payments reconciliation, disputes, abuse throttles)
- **M (Metrics)**: insufficient funnel + ops instrumentation surfaced to admin
- **P (Positioning)**: needs sharper wedge + consistent non-custodial language to prevent “betting” interpretations

Fastest path to 8.5+ (highest leverage first):
1) Make the “money story” + settlement rules extremely simple and repeated everywhere.
2) Harden payments operations and edge cases (reconciliation cockpit + clear statuses).
3) Add baseline trust/safety throttles + auditability.
4) Instrument the funnel and optimize activation → first funded vault → week-1 retention.
5) Narrow the wedge and ship a small, compelling “first win” flow.

## 2) V — Value

### Current score: 8.0/10 (execution), 8.5/10 (potential)

Value answers: “Why does this deserve to exist and why will users keep coming back?”

#### What Lockedin’s real value is (plain language)
Lockedin increases follow-through on goals by combining:
- Stakes per vault (credible commitment pressure)
- Social verification (witnesses) for evidence-based accountability
- A structured protocol lifecycle (check-ins, outcomes, settlement) rather than vague “tasks”

The value is not “money loss”.
The value is a credible system that changes behavior: *commitment, accountability, and follow-through*.

#### Evidence already in the product (what’s already true)
- Stake-per-vault funding with clear lifecycle states (e.g., awaiting funding → active).
- Penalties accrue transparently and settle at end-of-vault (non-custodial posture).
- Witness flow exists (requests, acceptance, evidence review).

#### Gaps preventing Value from reaching 9/10
- **Activation friction:** too many concepts before the first “win”.
- **First 10 minutes are not deterministic:** users can wander without completing create → fund → first check-in.
- **“What happens to my money?” is not a repeated guarantee:** users must infer rules instead of seeing them everywhere.

#### Recommendations (step-by-step) + why each lifts the score
1) Standardize a “First Win” path
   - Step: Login → pick goal template → create vault → fund vault → schedule first check-in
   - Why it lifts score: increases time-to-value, reduces cognitive load, increases activation rate (which is the strongest proof of value)
   - Acceptance checks: a new user can reach “active + first check-in scheduled” in one guided flow without leaving the page
2) Add a “Vault Summary Card” on all vault surfaces
   - Must show: stake, next check-in, consequence if missed, settlement rule, what witnesses do
   - Why it lifts score: value becomes explicit and repeatable; fewer support issues; more user confidence
   - Acceptance checks: the same 5–7 lines are visible on create, fund, vault details, and “awaiting funding” states
3) Add “micro-proofs” after actions
   - Step: after first check-in submit, show “what happens next” + witness visibility
   - Why it lifts score: users feel progress and trust; reduces drop-off after “I submitted proof, now what?”
   - Acceptance checks: post-check-in confirmation has next-step CTA and explains witness review timing
4) Reduce early UI surface area
   - Step: hide advanced options until first vault is funded (or at least until first check-in submitted)
   - Why it lifts score: improves clarity, accelerates onboarding, reduces failure modes
   - Acceptance checks: fewer CTAs on dashboard for brand-new users; one dominant CTA “Start your first protocol”

## 3) P — Positioning

### Current score: 7.5/10

Positioning answers: “Who is this for, what category is it, and why is it different?”

#### Current positioning (implicit)
- A goal accountability system using financial stakes and witness verification.
- Non-custodial posture: stake-per-vault, no stored wallet balance.

#### What’s strong already
- Differentiation: most habit apps are passive trackers without enforcement.
- “Protocol” framing can be a strong identity if consistently expressed.

#### Gaps preventing Positioning from reaching 9/10
- **Category confusion risk:** can be misread as “betting”, “gambling”, or “investment-like” without careful language.
- **Wedge not narrow enough:** target segment is not one-sentence clear.
- **Copy consistency:** key surfaces don’t repeat a consistent promise and “non-custodial” explanation.

#### Recommendations (step-by-step) + why each lifts the score
1) Lock a single “Positioning One-Liner”
   - Example: “Lockedin helps you keep your goals by turning them into a protocol with real accountability.”
   - Why it lifts score: makes the product easy to explain, easier to sell, reduces category confusion
   - Acceptance checks: the same one-liner appears on landing, dashboard empty state, and vault creation
2) Add a non-custodial clarity block everywhere money is involved
   - Must say: “Funds are staked per protocol. No stored wallet balance. Settlement rules shown upfront.”
   - Why it lifts score: prevents misunderstanding and reduces risk perceptions
   - Acceptance checks: the copy appears in create vault, fund vault, vault details
3) Choose one initial wedge and speak directly to it
   - Example wedges: creator-led challenges, fitness accountability cohorts, professional certification study streaks
   - Why it lifts score: increases conversion and retention; makes growth loops easier
   - Acceptance checks: onboarding templates and language match the wedge (not generic)
4) Create a 60-second “product story”
   - Create → Fund → Check-in → Witness review → Outcome → Settlement
   - Why it lifts score: sales + virality increases; support load decreases
   - Acceptance checks: we can capture this flow in 6 screenshots or a short screen recording

## 4) R — Risks

### Current score: 6.5/10

Risks answers: “Will this break under scale — financially, operationally, or reputationally?”

#### Primary risk categories (what matters most)
1) Payments reliability + reconciliation
2) Disputes / chargebacks / refunds clarity
3) Fraud and abuse (fake evidence, collusion, witness gaming, harassment)
4) Compliance perception (language, UX, settlement clarity)
5) Operational readiness (support workflows, audit logs, admin tooling)

#### Evidence already in the product (what’s already true)
- Strict Paystack test/live enforcement server-side.
- Penalties accrue transparently and settle at end-of-vault (non-custodial posture).
- Admin audit logging exists for manual overrides (reason-required).

#### Gaps preventing Risks from reaching 8.5/10
- No complete “reconciliation cockpit” for unmatched Paystack transactions and recovery workflows.
- No consistent dispute playbook exposed to users/admin.
- Missing baseline throttles and fraud flags for high-risk actions.

#### Recommendations (step-by-step) + why each lifts the score
1) Admin Payments Console (reconciliation cockpit)
   - Step: list unmatched Paystack refs, show state/reason, allow audited re-verify/retry, mark resolved with reason
   - Why it lifts score: operational reliability becomes visible, reduces catastrophic trust events
   - Acceptance checks: admin can go from “user says paid” → “verified and activated or refunded” with clear UI steps
2) Dispute playbook (v1)
   - Step: define timeboxed process and show it in-product (what users do, what admin does, what evidence is needed)
   - Why it lifts score: chargeback risk reduces; trust improves
   - Acceptance checks: there is a consistent policy text that support/admin follows
3) Throttles on sensitive flows
   - Step: rate limit payment initialize retries, evidence submissions spam, witness requests spam, email verification resends
   - Why it lifts score: reduces abuse and infra cost, improves fairness
   - Acceptance checks: repeated abuse attempts are blocked and logged with reason
4) Basic fraud flags and invariants
   - Step: add flags for suspicious patterns (many vaults quickly, many failed proofs, repeated disputes, unusual witness patterns)
   - Why it lifts score: creates early warning system without overbuilding ML
   - Acceptance checks: admin can view “flagged users/events” and see why flagged

## 5) O — Objectives

### Current score: 8.0/10

Objectives answer: “What are we trying to prove in the next 30–90 days, and is the product designed to prove it?”

#### Current implied objective (good, but needs tighter operationalization)
MVP objective: prove that “stake + verification” increases follow-through and retention.

#### Gaps preventing Objectives from reaching 9/10
- Objectives aren’t explicitly enforced by UX (users can wander without reaching activation).
- Admin objectives (payment resolution SLA, dispute handling) aren’t measured.

#### Recommendations (step-by-step) + why each lifts the score
1) Define 3 explicit MVP objectives (and make them first-class)
   - Activation: % of signups that fund a vault within 24 hours
   - Retention: week-1 adherence rate (check-ins completed / scheduled)
   - Trust: median time from payment to vault activation, and dispute resolution time
   - Why it lifts score: makes iteration measurable and repeatable
   - Acceptance checks: each objective has a metric, owner, and weekly review cadence
2) Make dashboard state machine drive a single “next step”
   - Create → Fund → Check-in → Witness review → Continue
   - Why it lifts score: forces the product to prove its own objectives
   - Acceptance checks: for each state, there is one dominant CTA and it’s hard to get lost

## 6) M — Metrics

### Current score: 7.0/10

Metrics answer: “Do we know what’s happening and can we improve it?”

#### Minimum viable metrics (the ones that must exist before scale)
Activation funnel:
- Signup → Create vault conversion
- Create vault → Fund vault conversion
- Fund vault → First check-in scheduled conversion
- First check-in scheduled → First check-in submitted conversion

Retention and outcomes:
- D1 / D7 retention
- Week-1 adherence rate (completed check-ins / scheduled check-ins)
- Vault completion rate
- Penalty event rate and penalty→churn correlation

Payments reliability:
- Webhook failure rate
- Unmatched payment count
- Median time-to-activation after payment
- Refund/dispute rate

Trust and operations:
- Support request rate per 1,000 users
- Median time-to-resolution for payment issues
- Witness review turnaround time

#### Gaps preventing Metrics from reaching 8.5/10
- Metrics are not consistently logged as events (funnel steps missing).
- Admin doesn’t have a basic business health panel.

#### Recommendations (step-by-step) + why each lifts the score
1) Add event logging for core funnel steps
   - created_vault, started_funding, funding_verified, scheduled_first_checkin, submitted_first_checkin, vault_completed
   - Why it lifts score: turns product iteration into an engineering system; removes guesswork
   - Acceptance checks: events exist in a table and can be aggregated
2) Build a basic admin “Business Health” view
   - Must show: activation, funding conversion, unmatched payments, adherence proxy
   - Why it lifts score: operational and growth tuning become possible
   - Acceptance checks: admin can see last 7 days stats without manual queries
3) Track operational SLAs
   - Payment reconciliation time, dispute resolution time, witness review time
   - Why it lifts score: makes trust measurable and improvable
   - Acceptance checks: each SLA has a chart + current median

## 7) Packaging (How Pricing Reinforces V2PROM)

Packaging should increase:
- Value (better outcomes)
- Trust (support, tools)
- Positioning (premium protocol operations)

Detailed tiering recommendations live in:
- PRICING_AND_PACKAGING.md

How packaging specifically increases the V2PROM score:
- Value: templates, coaching/community bundles, better reminders/check-in workflows
- Positioning: “protocols” as premium lifecycle products (not generic habit tracking)
- Risks: higher tiers can fund better support and dispute handling
- Metrics: tiers create clear segmentation for cohort analysis

## 8) Action Plan to Reach 8.5/10+ (Concrete Workstream Checklist)

Workstream A — Clarity (Value + Positioning)
- Create consistent “money story” copy blocks in every money surface.
- Add vault summary card with stake, next check-in, consequence, settlement rule.

Workstream B — Reliability (Risks)
- Finish unmatched payments tooling end-to-end (admin UI + recovery actions).
- Publish dispute playbook v1 and make it discoverable in-product.
- Add throttles and basic fraud flags.

Workstream C — Growth + Proof (Objectives + Metrics)
- Instrument funnel events and build basic admin health panel.
- Ship activation checklist and a lightweight referral loop (credits-only).

Workstream D — Wedge
- Pick one segment and align templates, copy, and onboarding to it.

