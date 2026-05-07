# 🔒 Lockedin: Behavioral Enforcement Protocol

Lockedin is a zero-trust behavioral bank built to solve the human willpower problem. It uses economic escrow and institutional-grade enforcement to ensure mandates (goals) are fulfilled.

## 🏗️ The Stack
- **Frontend:** TanStack Start (React + Vite + File-based Routing)
- **Backend:** [Convex](https://convex.dev) (Real-time DB, Server Functions, Crons)
- **Styling:** Tailwind CSS v4 (Brutalist Aesthetic)
- **Auth:** Convex Auth (@convex-dev/auth)
- **Payments:** Paystack (Naira Escrow)
- **AI:** OpenRouter (Behavioral Verification)

## ⚖️ The Protocol Mechanics

### 1. The Pain Tiers (Forfeiture)
When a citizen anchors a mandate, they select their level of economic pain:
- **Deterrence (2%):** Minor sting for habit formation.
- **Enforcement (5%):** Serious skin in the game.
- **Liquidation (10%):** High-stakes behavioral contract.

### 2. Protocol Credits & Shields
Success is rewarded with **Protocol Credits** (Non-monetary).
- **Credits:** Earned via successful daily logs.
- **Shields:** Acquired in the Protocol Store using credits. A Shield protects your principal stake by "canceling" a breach log once.

### 3. Identity Anchoring
Every user is anchored via **BVN Hash** to prevent sybil attacks and ensure behavioral accountability.

## 🚀 Deployment & Seeding

### Local Development
1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```
2. Initialize the Convex backend:
   ```bash
   npx convex dev
   ```
3. Run the frontend:
   ```bash
   npm run dev
   ```

### Mass Seeding (Bulk Users)
To populate the protocol with 1,000+ active citizens for a bustling community feed:
```bash
npx convex run seed:runMassSeed '{"count": 1000}'
```

### Production (Vercel)
1. Set up a new project on Vercel and link this GitHub repo.
2. Add `VITE_CONVEX_URL` to your Vercel Environment Variables.
3. In your **Convex Dashboard**, add these keys:
   - `PAYSTACK_SECRET_KEY`
   - `OPENROUTER_API_KEY`
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`

## 🛡️ Security Architecture
- **Non-Custodial Logic:** All funds are tracked via atomic ledger entries in the `transactions` table.
- **Midnight Sweep:** A Convex Cron job runs every night to scan for missed logs and initialize the Forfeiture Protocol automatically.
- **Identity Isolation:** Users only have read/write access to their own vaults via Convex Row-Level Security.

---
*Lockedin Operating Protocol v1.1 — Discipline is Non-Negotiable.*
