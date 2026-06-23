# Lockedin — Tester Guide (Production)

This document explains what Lockedin can do right now, how testers should use it, what to test, and what is planned next.

## What Lockedin Is

Lockedin is a non-custodial behavior enforcement app. Users create a protocol (goal), stake capital per protocol, execute evidence logs each cycle, and optionally add witnesses who authorize those logs. Penalties accrue internally when requirements aren’t met and are settled when the protocol ends.

## Key Terms (Quick Glossary)

- **Protocol**: A goal + enforcement rules + stake (internally called a “vault”).
- **Stake (Funding)**: Money a user puts behind a protocol. A protocol is not active until funded.
- **Awaiting Funding**: Protocol exists but is not active yet (no enforcement until funded).
- **Execute Log**: Submitting evidence for the current cycle (this is how users “check in”).
- **Witness**: Another user who can approve/reject evidence logs.
- **Pain Tier**: Determines penalty severity (Deterrence / Enforcement / Liquidation).

## Current Features (What Works Now)

### 1) Authentication + Email Verification Gate

- Users must be signed in to use the dashboard.
- Users must verify email before they can access most core features (dashboard/admin/protocol actions).
- The system supports both:
  - **Email-based verification** (when email backend is configured)
  - **Manual verification** (admin can mark a user verified if email sending is offline)

### 2) Dashboard (Two Operating Modes)

- **Protocols tab**: Manage your own protocols (create, fund, execute logs).
- **Witnessing tab**: Review protocols you witness, handle incoming witness requests/applications, and authorize logs.

### 3) Create Protocol (Goal) → Starts as Awaiting Funding

- Creating a protocol always creates it in **awaiting_funding** state.
- User is prompted to fund immediately (recommended flow) or later.
- A notification is generated: “Protocol Created… Complete funding to activate”.

### 4) Fund Protocol (Paystack)

- Funding is per protocol (stake-per-vault). There is no wallet top-up model.
- Paystack initialize + verify flow is used to activate a protocol.
- Payment safety checks are enforced (server-side):
  - Rate limits on repeated initialization/verification attempts
  - Test/live mismatch protection (prevents verifying on a different Paystack domain mode)
  - Overage tolerance when Paystack processor fees make the charged amount higher than the expected stake

### 5) Protocol Details + Full Specification

- Users can open a protocol to see:
  - Specification + metrics
  - Penalty timeline
  - Historical logs
  - Witness section (max 3)
  - **Enforcement section** (Execute Log)

### 6) Execute Log (Evidence Logging)

- Execute Log is accessible from protocol details (not only dashboard).
- Supports:
  - A note (optional)
  - Up to **3 proof images** per log
- Logs are created as **pending** and require witness authorization (if witnesses exist / depending on flow).

### 7) Witness System (Max 3)

- Users can request witnesses / apply to witness protocols.
- Witnesses receive notifications when:
  - They’re accepted
  - They’re removed by the protocol owner
- Protocol owner can remove witnesses from protocol details using **Edit Witnesses**.
- Witnesses with `status: ended` are filtered out from active witness lists.

### 8) Share Prompt (Post-Action Only)

- Share prompts appear only as a popup after:
  - Creating a protocol
  - Successfully executing a log
- Share UI does not appear as a persistent card inside the protocol specification view.

### 9) Admin Command Center

- Admin route provides operational tooling:
  - Stats, waitlist, transactions
  - User management and user details via a dedicated route: `/admin/users/$userId`
  - Payment explorer, unmatched-payment review, and withdrawal operations
  - Accounting recompute and seed-data purge tools via `/admin/settings`
- Admin status is checked server-side with verified email + allowlist + DB role flags.

### 10) Goal Owner Safety Controls

- Owners can edit a protocol stake amount only while the protocol is still `awaiting_funding` and no payment attempt is attached.
- Owners can delete only:
  - unfunded protocols
  - completed protocols
- Active protocols cannot be deleted.

### 11) Wallet Visibility + Withdrawals

- The profile route shows wallet balance, recent transaction history, and withdrawal queue status.
- Withdrawal destination account numbers are masked on read surfaces.
- A user can only have one in-flight withdrawal at a time, and withdrawal requests are rate-limited.

## Step-by-Step Tester Flow

### A) Sign Up / Login

1. Create account or login.
2. If you see “Verification Required”, complete email verification.

Expected:
- After verifying email, user reaches the dashboard without being stuck in loops.

### B) Create a Protocol

1. Go to Dashboard → Protocols.
2. Create a protocol (title, description, category, frequency, target, duration, staked amount, pain tier).

Expected:
- Protocol appears in list with status **awaiting_funding**.
- System prompts “Fund now?” (or similar).

### C) Fund the Protocol

1. Click Fund / Fund & Activate.
2. Complete Paystack payment.
3. Return to the app and confirm payment success.

Expected:
- Protocol moves to **active**.
- Activation checklist should auto-dismiss once you have a funded protocol.

### D) Execute Log (Evidence)

1. Open the protocol details.
2. Scroll to Pain Tier section.
3. Under **Enforcement**, click Execute Log.
4. Add a note (optional) and attach 1–3 images.
5. Submit.

Expected:
- Success toast/message.
- Share prompt popup appears after successful log.
- Log appears in history with status **pending** (until verified).

### E) Witness Flow (Two ways to test)

**Option 1: Request a witness**
1. As Protocol Owner, open Witness section.
2. Request/add witnesses (up to 3).

**Option 2: Apply to witness**
1. Switch to Witnessing tab.
2. Find discoverable protocols and apply.

Expected:
- Requests show up under incoming requests/applications.
- Accepting a request activates witness access.
- Witness can review pending evidence logs (where applicable) and approve/reject.

### F) Remove a Witness (Owner-only)

1. Open protocol details → Witness section.
2. Toggle **Edit Witnesses**.
3. Click the red X beside an active witness.
4. Confirm removal.

Expected:
- Witness disappears from active witness list immediately.
- Removed witness receives a notification: “Witness Role Ended”.

### G) Admin Access (For Admin Test Accounts)

1. Navigate to `/admin`.
2. If verification required, verify email first.
3. If access blocked, check the “Admin Access Blocked” debug panel.

Expected:
- Verified admin can consistently access admin tools.
- Non-admin accounts see “Admin Access Blocked” with a reason.
- Accounts missing either the DB admin flag or allowlist membership stay blocked.

## Admin Email Access Bug — What Was Wrong and What Was Fixed

### Symptoms (what you reported)

- Admin route would flash an error/redirect too fast, then throw you back to dashboard.
- Even after verifying email, admin would sometimes be told “Verification Required” and couldn’t proceed.
- Clicking “I Already Verified” sometimes didn’t help.

### Root cause (practical explanation)

The admin page previously relied on timing-sensitive redirects while user verification/admin status was still loading (especially with Suspense + fast navigation). That caused race conditions where the UI redirected before fresh user verification state was available.

### Fix (now on main)

1. **Admin route now uses a stable gate UI** when email verification is missing, instead of a fast redirect loop.
2. **Verification gate auto-consumes a pending verification token** if one exists in localStorage and confirms it, then invalidates the current-user query and navigates forward.
3. Admin status is checked via a dedicated server query that returns both a decision and debug information (email, verified, allowlist, DB admin flag).

Where this lives:
- Admin gate UI: [admin.tsx](file:///c:/Users/Semek/Webstrom/Lockedin/src/routes/admin.tsx)
- Verification gate + auto-consume: [verify-required.tsx](file:///c:/Users/Semek/Webstrom/Lockedin/src/routes/verify-required.tsx)
- Admin authorization decision/debug: [checkAdminStatus](file:///c:/Users/Semek/Webstrom/Lockedin/convex/admin.ts)

How to verify the fix:
- Confirm email verification once.
- Visit `/admin` repeatedly (including hard refreshes).
- You should get either:
  - “Command Center” (if admin), or
  - “Admin Access Blocked” with a reason (if not admin), but not a redirect loop.

## What Testers Should Focus On (Priority Test Checklist)

- **Email verification flow**
  - New user → verify email → dashboard unlocks
  - “I Already Verified” works after clicking email link
- **Create → Fund → Active**
  - Protocol created as awaiting_funding
  - Funding activates protocol
  - Paystack verify succeeds and does not double-charge on refresh
  - Paystack overage does not break successful funding credit
- **Execute Log**
  - Can submit note + 1–3 images
  - Scroll works inside modal and log detail viewer
- **Goal owner controls**
  - Can edit stake before funding starts
  - Cannot edit after a payment attempt exists
  - Can delete unfunded/completed protocols, not active ones
- **Witness flow**
  - Requests/applications appear correctly
  - Accepting enables witness review
  - Owner can remove witness, witness gets notified
- **Admin stability**
  - Verified admin consistently accesses `/admin`
  - Non-admin consistently blocked with clear reason
- **Withdrawals**
  - User sees masked destination in profile queue
  - Admin sees masked destination in the pending queue before transfer approval

## Known Limitations / Expected Rough Edges

- If the email backend is offline, verification can be manual (admin-assisted) and the UI indicates this.
- Email verification email sending also requires a valid `SITE_URL` backend configuration.
- Admin payment tooling exists, but operators should follow the payment/settings runbooks before using destructive controls.

## What’s Planned Next (Near-Term Roadmap)

- Mobile responsiveness pass (systematic audit + UI fixes).
- Further performance improvements (smaller client chunks, faster route transitions).
- Expanded growth/activation UX (cleaner checklist UI + better progression feedback).

## Reporting Bugs (How Testers Should Send Feedback)

When reporting an issue, include:
- Page/route (e.g., `/dashboard`, `/vault/:id`, `/admin`)
- What you expected vs what happened
- Screenshot/screen recording
- If payment-related: Paystack reference + timestamp (no bank account details)
