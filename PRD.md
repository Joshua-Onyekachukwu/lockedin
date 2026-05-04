# Lockedin: Product Requirements Document (PRD)
**Version:** 1.1
**Status:** MVP Ready

## 1. Product Overview
Lockedin is a decentralized behavioral enforcement platform. It allows users to create financial "Vaults" tied to specific personal goals. Failure to adhere to these goals results in automatic financial penalties, which are then redistributed to high-performing community members.

## 2. Target Audience
- **High Performers:** Entrepreneurs, engineers, and athletes seeking to eliminate procrastination.
- **Commitment Seekers:** Individuals struggling with habit formation who need "skin in the game."
- **Integrity Earners:** Disciplined individuals looking to earn dividends from their consistency.

## 3. Core Features & Functional Requirements

### A. Identity & Verification
- **Google OAuth:** Seamless onboarding.
- **BVN Verification:** Mandatory Nigerian identity anchoring to ensure financial accountability.
- **Integrity Score:** A dynamic percentage (0-100) reflecting a user's historical adherence.

### B. Protocol Management (The Vault)
- **Vault Creation:** Users stake NGN (Kobo) on a goal.
- **Pain Tiers:** 
    - **Serious (2% Penalty):** Moderate enforcement.
    - **Locked In (5% Penalty):** Extreme enforcement.
- **Logical Escrow:** Funds are removed from the available balance and held by the protocol until completion or breach.

### C. The Evidence Engine
- **Check-in Protocol:** Users must submit proof of execution (Notes + Photographic Evidence).
- **Storage:** Secure storage of evidence via Convex File Storage.
- **Verification Window:** Partners have 24 hours to verify or dispute evidence.

### D. The Social Witness Network
- **Discovery:** Browse users with high Integrity Scores.
- **Request System:** Invite another user to be a "Witness" for a specific vault.
- **Verification UI:** Simplified interface for partners to approve/reject evidence logs.

### E. Automated Economics (Cron Jobs)
- **Midnight Sweep:** Daily automated audit for missed check-ins.
- **Dividend Distribution:** Weekly sweep of the penalty pool to high-integrity users.

## 4. Technical Requirements
- **Real-time Sync:** All metrics must update instantly via Convex subscriptions.
- **Mobile-First:** Ultra-fast, high-fidelity UI optimized for performance monitoring.
- **Security:** BVN data and evidence must be handled with banking-grade protocols.

## 5. Revenue Model
- **Platform Fee (60%):** Captured from forfeited stakes.
- **Reward Pool (30%):** Redistributed to users with >80 Integrity Scores and active streaks.
- **Reserve fund (10%):** System liquidity.

---
## 6. Success Metrics
1. **D1 Retention:** High correlation between financial stakes and daily app usage.
2. **Protocol Adherence Rate:** Target >75% for active vaults.
3. **Dividend Yield:** Consistent payouts to high-integrity users.
