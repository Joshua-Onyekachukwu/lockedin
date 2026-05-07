# 🔒 Lockedin: Behavioral Enforcement Protocol

Lockedin is a zero-trust behavioral bank built to solve the human willpower problem. It uses economic escrow and institutional-grade enforcement to ensure mandates (goals) are fulfilled.

## 🏗️ The Stack
- **Frontend:** TanStack Start (React + Vite + File-based Routing)
- **Backend:** [Convex](https://convex.dev) (Real-time DB, Server Functions, Crons)
- **Styling:** Tailwind CSS v4 (Industrial Aesthetic)
- **Auth:** Convex Auth (@convex-dev/auth)
- **Payments:** Paystack (Naira Escrow)
- **KYC:** Mono/Smile ID (Identity Anchoring)

## ⚖️ The Protocol Mechanics

### 1. The Pain Tiers (Forfeiture)
When a citizen anchors a mandate, they select their level of economic pain:
- **Deterrence (2%):** Minor sting for habit formation.
- **Enforcement (5%):** Serious skin in the game.
- **Liquidation (10%):** High-stakes behavioral contract.

### 2. Protocol Credits & Shields
Success is rewarded with **Protocol Credits** (Non-monetary).
- **Credits:** Earned via successful adherence logs.
- **Shields:** Acquired in the Protocol Store using credits. A Shield protects your principal stake by "canceling" a breach log once.

### 3. Identity Anchoring
Every user is anchored via **BVN Hash** to prevent sybil attacks and ensure behavioral accountability. Identity verification is required for capital extraction.

## 🚀 Live Deployment Protocol

### Production (Vercel + Convex Cloud)
1. **Convex Configuration:**
   - Link your local project to Convex Cloud: `npx convex dev` (select your production project).
   - In your **Convex Dashboard**, configure the following Environment Variables:
     - `PAYSTACK_SECRET_KEY` (Live Key)
     - `AUTH_RESEND_KEY` (For magic link emails)
     - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` (For Google SSO)

2. **Frontend Hosting (Vercel):**
   - Link your GitHub repository to Vercel.
   - Add `VITE_CONVEX_URL` to Vercel Environment Variables (obtained from Convex Dashboard).
   - In Vercel Project Settings:
     - **Framework Preset:** Select **TanStack Start**.
     - **Build Command:** `npm run build`
     - **Output Directory:** (Keep default/Empty - Vercel will handle it).
   - Redeploy the application.

3. **Domain Configuration:**
   - Map your custom domain (e.g., lockedin.io) to your Vercel deployment.
   - Configure your Paystack Webhook URL to point to your Convex production HTTP endpoint.

## 🛡️ Security Architecture
- **Non-Custodial Logic:** All funds are tracked via atomic ledger entries in the `transactions` table.
- **Midnight Sweep:** A Convex Cron job runs every night to scan for missed logs and initialize the Forfeiture Protocol automatically.
- **Identity Isolation:** Users only have read/write access to their own vaults via Convex Row-Level Security.

---
*Lockedin Operating Protocol v1.1 — Discipline is Non-Negotiable.*
