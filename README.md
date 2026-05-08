# 🔒 Lockedin: Behavioral Enforcement Protocol

Lockedin is a zero-trust behavioral bank built to solve the human willpower problem. It uses economic escrow and institutional-grade enforcement to ensure goals (goals) are fulfilled.

## 🏗️ The Stack
- **Frontend:** TanStack Start (React + Vite + File-based Routing)
- **Backend:** [Convex](https://convex.dev) (Real-time DB, Server Functions, Crons)
- **Styling:** Tailwind CSS v4 (Industrial Aesthetic)
- **Auth:** Convex Auth (@convex-dev/auth)
- **Payments:** Paystack (Naira Escrow)
- **KYC:** Mono/Smile ID (Identity Anchoring)

## ⚖️ The Protocol Mechanics

### 1. The Pain Tiers (Forfeiture)
When a citizen anchors a goal, they select their level of economic pain:
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

### 1. Convex Backend (Critical Auth Setup)
Before users can sign up, you **MUST** generate a JWT key:
1.  Run this command in your local terminal:
    ```bash
    npm run auth:generate-key
    ```
2.  Copy the entire output (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`).
3.  Go to your **Convex Dashboard** > **Settings** > **Environment Variables**.
4.  Add a new variable:
    - **Name:** `JWT_PRIVATE_KEY`
    - **Value:** (Paste the key you copied)
5.  Also ensure these keys are present:
    - `PAYSTACK_SECRET_KEY` (Live Key)
    - `AUTH_RESEND_KEY` (For magic link emails)
    - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`

### 2. Frontend Hosting (Vercel)
1.  Link your GitHub repository to Vercel.
2.  Add `VITE_CONVEX_URL` to Vercel Environment Variables.
3.  In Vercel Project Settings:
    - **Framework Preset:** Select **TanStack Start**.
    - **Build Command:** `npm run build`
    - **Output Directory:** (Keep empty / Default).
4.  If you get a 404, ensure the **Framework Preset** is correctly set to **TanStack Start**.

### 3. Domain & Paystack
1.  Map your custom domain (e.g., lockedin.io) to your Vercel deployment.
2.  Configure your **Paystack Webhook URL** in the Paystack Dashboard:
    - `https://ardent-dinosaur-415.convex.site/paystack-webhook`

## 🛡️ Security Architecture
- **Non-Custodial Logic:** All funds are tracked via atomic ledger entries.
- **Root Admin:** Authorized access only for `onyekachukwujoshua1@gmail.com`.
- **Identity Isolation:** Users only have access to their own vaults via Convex Row-Level Security.

---
*Lockedin Operating Protocol v1.1 — Discipline is Non-Negotiable.*
