# Lockedin Protocol - Security Configuration

## Rafter Security Integration

Rafter is integrated into this project's security workflow. It provides SAST, SCA, secret detection, and agentic deep-dive security analysis.

### Quick Setup

Initialize Rafter (if not already done):
```bash
npx rafter-cli agent init --all
```

### Security Scanning Commands

**Local Scan (no API key required):**
```bash
rafter secrets .
```

**Full Security Audit (requires API key):**
```bash
export RAFTER_API_KEY="YOUR_RAFTER_API_KEY"
rafter scan --all --api-key $RAFTER_API_KEY
```

### When to Run Security Scans

Security scans should be run at these milestones:

1. **After Initial Setup** - Before first deployment
2. **After Major Code Changes** - Especially auth, payments, or data handling
3. **Before Production Deployment** - Final security validation
4. **During Code Review** - When reviewing sensitive logic changes

### Integration Guidelines

- **Design Phase**: Consider auth flows, data permissions, and integration risks
- **Implementation**: Apply secure coding practices around sensitive logic
- **Review**: Check for vulnerabilities, secret exposure, and privilege expansion
- **Finalize**: Run full scan before marking implementation complete

### API Key Configuration

Do not store the API key in this repository. Store it in your password manager and set it via environment variables (local `.env.local`, Vercel env vars, or CI secrets).

```bash
export RAFTER_API_KEY=YOUR_RAFTER_API_KEY
```

### Documentation

- Docs: https://docs.rafter.so/llms.txt
- Repo: https://github.com/Raftersecurity/rafter-cli

### Severity Classifications

When running scans, prioritize fixes based on:

| Severity | Action |
|----------|--------|
| CRITICAL | Fix immediately - secret exposure or severe vulnerability |
| HIGH | Fix before next deployment |
| MEDIUM | Fix in next sprint |
| LOW | Fix when time permits |

---

## Project-Specific Security Notes

### Sensitive Areas to Monitor

1. **Authentication** (`convex/auth.ts`) - User session management
2. **Payments** (`convex/payments.ts`) - Paystack integration, withdrawal handling
3. **Webhooks** (`convex/http.ts`) - Paystack webhook signature verification
4. **BVN Verification** (`convex/mono.ts`) - Identity verification with Mono API
5. **Admin Functions** (`convex/admin.ts`) - Elevated privileges

### Known Security Considerations

1. **Paystack Webhook**: HMAC SHA-512 verification is implemented in `convex/http.ts`. Ensure the webhook secret is set correctly in each environment.
2. **Environment Variables**: Ensure `PAYSTACK_SECRET_KEY`, `MONO_SECRET_KEY`, and `SITE_URL` are never committed and are configured per environment.
3. **Rate Limiting**: Waitlist, Paystack initialize/verify, email verification, and withdrawal request paths are rate-limited. Treat any new finance/admin mutation as rate-limit review required.
4. **BVN Verification**: BVN verification must be performed through `convex/mono.ts` (`mono.verifyIdentity`). Direct public BVN lookup should remain disabled.
5. **Admin Access**: Admin authorization is fail-closed and requires all of: authenticated user, verified email, `user.isAdmin === true`, and membership in `ADMIN_EMAIL_ALLOWLIST`.
6. **Withdrawal PII**: Store only what operations need, mask account numbers in user/admin read surfaces, and avoid putting full destination account numbers into transaction descriptions or bug-report payloads.
7. **Email Verification Links**: Email verification should fail closed if `SITE_URL` is missing or invalid; never fall back silently to an assumed production URL.
8. **Withdrawal Recovery**: Pending withdrawals can now be cancelled by the user before admin processing begins; preserve that recovery path and treat any change to withdrawal escrow logic as security-sensitive.
9. **Manual Forfeiture Controls**: Full protocol forfeiture is now restricted to severe repeated breach conditions and includes an admin revert path. Any change to breach eligibility, revert behavior, or audit logging must receive explicit security review.

### Current Review Status

- A safe dependency refresh has already been completed.
- Remaining production `npm audit` findings are concentrated in the pinned TanStack Start / Vinxi chain.
- Treat that remaining framework upgrade as the next required security engineering phase rather than forcing piecemeal `audit fix --force` changes into production.

### Secret Detection Patterns

This project should never contain:
- Paystack Secret Key
- Mono API Secret
- Any private keys or tokens

### Audit Trail

All security events are logged via Rafter's audit feature. Check audit logs regularly:
```bash
rafter agent audit --last 10
```
