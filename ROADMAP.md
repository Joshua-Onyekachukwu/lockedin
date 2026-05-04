# Lockedin | System Protocol & Roadmap

## 1. System Status: Executive Summary
Lockedin is currently in **Phase 1: Self-Accountability Protocol**. The core engine for commitment, capital staking, and identity anchoring is fully operational.

### ✅ What is Built & Working
*   **Identity Protocol:** Full Auth system (Email/Password + Google OAuth ready).
*   **Behavioral Engine:** Goal creation, logic-based capital staking (NGN).
*   **Economic Bridge:** Live Paystack integration for wallet funding and secure verification.
*   **Verification Engine:** Evidence-based logging (Photo + Note) with storage.
*   **Security Protocol:** Zero-trust backend; server-side ownership validation.
*   **Command Center:** Admin dashboard for system health, waitlist, and revenue tracking.
*   **Premium UI:** Unified "Brutalist-Premium" design language across all surfaces.

---

## 2. Refined Product Flow
The current system follows a "Zero-Excuse" architecture:

1.  **Onboarding:** User anchors identity via Email/Google. Mandatory BVN verification (Mono) to ensure identity consistency.
2.  **Wallet Injection:** User deposits capital via Paystack. Funds are held in a logical protocol wallet.
3.  **Mandate Initialization:** User defines a goal:
    *   **Goal Types:** Fitness, Learning, Financial, Habit, Professional.
    *   **Stake:** User locks a specific amount of NGN.
    *   **Penalty Selection:** Predefined "Pain Tiers":
        *   *Serious:* 2% daily principal loss on missed logs.
        *   *Locked In:* 5% daily principal loss on missed logs.
4.  **Execution (Progress Tracking):**
    *   Users log progress daily (or on specific days).
    *   Each log requires photographic evidence and a descriptive note.
    *   Progress is displayed via a "Protocol Adherence" streak and a real-time Integrity Score.
5.  **Audit & Outcome:**
    *   **Success:** Goal duration ends with 100% adherence; principal is returned.
    *   **Failure:** The "Midnight Sweep" cron detects missed logs and applies the penalty to the staked principal.

---

## 3. Current Feature List
| Feature | Function |
| :--- | :--- |
| **Identity Anchor** | Secure auth and BVN-linked legal name anchoring. |
| **Capital Escrow** | Locks user NGN in a protocol-controlled vault. |
| **Pain Tiers** | User-selected penalty intensity for capital loss. |
| **Evidence Logging** | Photo-upload system for immutable proof of execution. |
| **Integrity Score** | A 0-100% metric representing the user's reliability. |
| **Midnight Sweep** | Automated daily audit that enforces penalties. |
| **Admin Terminal** | Visibility into total liquidity, revenue, and waitlist. |

---

## 4. PWA Implementation Plan
To maximize retention without App Store friction:
1.  **Manifest.json:** Define brand colors, icons, and standalone display mode.
2.  **Service Worker:** Enable caching for the dashboard so it loads instantly.
3.  **Install Prompt:** High-fidelity "Add to Home Screen" prompt for the user's first login.

---

## 5. Next Steps & Roadmap

### 🟥 Phase 1: Hardening (Current / Immediate)
*   [ ] **Mono Identity:** Finalize API integration (currently using Sandbox).
*   [ ] **PWA Setup:** Deploy manifest and service workers.
*   [ ] **Email Notifications:** Automated "Nudge" emails 2 hours before a log is due.

### 🟨 Phase 2: Social Oversight (Mid-Term)
*   [ ] **Witness System:** Accountability partners can join to verify evidence.
*   [ ] **The Sunday Dividend:** 30% of forfeited penalties redistributed to top-integrity users.
*   [ ] **Community Feed:** Public "Wall of Discipline" showing successful logs.

### 🟦 Phase 3: Global Scale (Long-Term)
*   [ ] **AI Proctor:** GPT-4o Vision to automatically flag fraudulent logs.
*   [ ] **Corporate Mandates:** Team-based commitment challenges.
*   [ ] **Integrity API:** Allowing other apps to verify a user's discipline score.

---

## 6. Admin Capabilities
*   **User Management:** Search, ban, or manual integrity score overrides.
*   **Goal Overview:** View all active mandates and staked liquidity.
*   **System Logs:** Real-time visibility into "Midnight Sweep" executions.
*   **Moderation:** Flagging and removing suspicious evidence photos.
