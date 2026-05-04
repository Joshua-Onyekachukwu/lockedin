# Lockedin: Behavioral Infrastructure Report
**Date:** May 2024
**Subject:** Technical & Business Architecture Review

## 1. Executive Summary
Lockedin is not a "todo list"—it is a **Behavioral Protocol**. We have built a system that monetizes the gap between intention and action. By leveraging real financial risk and social verification, we have created a high-stickiness platform with a built-in automated revenue model.

## 2. Technical Architecture
The system is built on a "Live Core" architecture using **Convex**, providing real-time data synchronization with zero-latency updates.

### A. The Identity Mandate
Unlike anonymous productivity apps, every Lockedin account is anchored to a **Nigerian Bank Verification Number (BVN)**. This ensures that users are real, accountable, and financially reachable.

### B. The Penalty Engine (Midnight Sweep)
A sophisticated server-side cron engine runs every 24 hours to audit every active protocol.
- **Precision Auditing:** Uses database indices to scan thousands of vaults in milliseconds.
- **Automated Pain:** Deducts capital based on pre-set "Pain Tiers" without human intervention.

### C. Financial Infrastructure
The system uses a **Double-Entry Ledger** pattern for transactions:
- **Logical Escrow:** Staked funds are moved from the user balance to a protocol-controlled vault.
- **Transparent Flows:** Every penalty, dividend, and fee is logged with a unique reference.

## 3. Business Model & Economics
We have implemented a **60/30/10 Protocol Revenue Split**:
- **60% Platform Fee:** High-margin revenue captured from protocol breaches.
- **30% Reward Pool:** A "Proof of Discipline" mechanism where winners are paid by the lack of discipline in losers. This creates a powerful viral loop.
- **10% Reserve Fund:** Provides liquidity and system stability.

## 4. Market Fit & Scalability
- **High Retention:** Financial loss is the ultimate retention hook.
- **Social Virality:** Users invite "Witnesses," effectively onboarding new users for free.
- **Identity First:** The BVN verification positions us for future expansion into high-trust financial services (Lending, Credit Scoring based on Integrity).

## 5. Current Status
The infrastructure is **MVP-Complete**. The system can currently:
1. Authenticate and verify users.
2. Accept stakes and manage vaults.
3. Automatically penalize failures.
4. Distribute dividends.
5. Store photographic evidence.

**The platform is ready for the integration of live payment API keys (Paystack) and public beta launch.**

---
*Prepared by the Lockedin Engineering Team.*
