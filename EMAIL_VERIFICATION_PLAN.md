# Lockedin — Email Verification + Password Reset Plan
**Goal:** Ensure users can’t use arbitrary emails unchecked; add email confirmation and a secure password reset flow.  
**Backend:** Convex (actions/mutations + storage + scheduler).  
**Email sending:** External provider (recommended: Resend).  

---

## 1) Current State (Gap)
- The `users` table already has `emailVerificationTime` and the UI displays it, but nothing sets it.
- There is no email sending implementation currently wired up (even though `resend` is installed).
- There is no password reset flow.

---

## 2) Solution Overview (What We Will Build)

### 2.1 Email Verification (Confirm Email)
**Flow**
1) User signs up with email/password.
2) Backend generates a one-time verification token (short-lived).
3) Backend sends verification email with a link:
   - `https://<site>/verify-email?token=...`
4) User clicks link → frontend calls a Convex action to verify token.
5) Backend marks `users.emailVerificationTime = Date.now()`.

**Important security properties**
- Tokens are single-use.
- Tokens expire (e.g., 30–60 minutes).
- Tokens are stored hashed (not plaintext) to reduce leakage risk.
- Resend endpoint is rate-limited (e.g., 1 request/min per user + daily cap).

### 2.2 Password Reset
**Flow**
1) User clicks “Forgot password”.
2) Backend generates a one-time reset token (short-lived).
3) Backend emails a link:
   - `https://<site>/reset-password?token=...`
4) User sets a new password in the UI.
5) Backend validates token + updates password (via Convex Auth password flow).

**Important security properties**
- Always return a generic response (“If an account exists, we sent an email”) to prevent email enumeration.
- Tokens expire quickly (15–30 minutes).
- Rate limit requests.

---

## 3) Data Model Changes (Convex)

### 3.1 New tables
1) `email_verification_tokens`
- `userId: Id<"users">`
- `email: string` (optional redundancy; helpful if email changes)
- `tokenHash: string`
- `expiresAt: number`
- `usedAt: number?`
- `createdAt: number`
- indexes:
  - by_user
  - by_tokenHash
  - by_expiresAt (optional for cleanup cron)

2) `password_reset_tokens`
- `userId: Id<"users">` (optional; may only know email at request time)
- `email: string`
- `tokenHash: string`
- `expiresAt: number`
- `usedAt: number?`
- `createdAt: number`
- indexes:
  - by_email
  - by_tokenHash

### 3.2 Optional “email delivery log” table (recommended)
`email_outbox` or `email_events`:
- store minimal metadata for audit + debugging (no secrets)
- status: queued/sent/failed
- providerMessageId (if any)

---

## 4) Backend API (Convex Functions)

### 4.1 Email verification
- `auth.requestEmailVerification` (action)
  - requires auth
  - generates token, saves hash, sends email
  - returns `{ success: true }`

- `auth.confirmEmailVerification` (action)
  - args: `{ token: string }`
  - hash token, look up tokenHash, validate expiry, mark used
  - patch user: `emailVerificationTime = Date.now()`
  - return `{ success: true, message }`

### 4.2 Password reset
- `auth.requestPasswordReset` (action)
  - args: `{ email: string }`
  - always returns success message (anti-enumeration)
  - if user exists, generate token and send email

- `auth.confirmPasswordReset` (action or mutation depending on Convex Auth constraints)
  - args: `{ token: string, newPassword: string }`
  - validate token + expiry + unused
  - update password using the correct Convex Auth password API
  - mark used

### 4.3 Cleanup
- Optional cron: delete expired tokens daily.

---

## 5) Frontend Changes (Routes + UX)

### 5.1 New routes
- `/verify-email`
  - reads `token` from query params
  - calls `confirmEmailVerification`
  - shows success/failure UI

- `/forgot-password`
  - email input + submit

- `/reset-password`
  - reads `token`
  - new password + confirm password
  - calls `confirmPasswordReset`

### 5.2 UI placement
- On signup completion: show “Verify your email” banner with “Resend email” button.
- On profile page: show email verification status with “Resend verification”.
- Optional: block sensitive actions (withdrawals/admin) until verified.

---

## 6) Enforcement Strategy (How Strict Should We Be?)
Choose one (we can start soft then harden):
1) **Soft gating (recommended first):**
   - User can browse and create goals, but can’t withdraw or access admin unless verified.
2) **Hard gating:**
   - User can’t access dashboard features until verified.

---

## 7) What We Need From You (Email Provider + Domain)

### 7.1 Email provider requirements (Resend recommended)
You will need:
- A Resend account
- `RESEND_API_KEY` stored in Convex environment variables
- A verified sending domain (e.g., `lockedin.io`) in Resend
- A “From” address (e.g., `no-reply@lockedin.io`)

### 7.2 URLs needed
- Production site base URL for links (e.g., `https://lock3din.vercel.app`)
- If you have a custom domain, use it to reduce spam suspicion.

### 7.3 Email templates (we can supply copy, you approve)
Templates needed:
- “Verify your email”
- “Reset your password”

---

## 8) Can This Be Done Fully in Convex?
Convex can:
- generate tokens
- store token hashes
- send emails via actions calling Resend API
- set `emailVerificationTime`
- enforce rules on queries/mutations

But Convex is not itself an email provider; we still need Resend (or equivalent) for outbound email delivery.

---

## 9) Rollout Plan (Low Risk)
1) Implement token tables + backend endpoints.
2) Implement `/verify-email` route and resend button.
3) Soft-gate withdrawals/admin until verified.
4) Add password reset flow.
5) Add rate limiting + monitoring.

