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

1. **Paystack Webhook**: Currently validates signature presence. Production should add HMAC verification.
2. **Environment Variables**: Ensure `PAYSTACK_SECRET_KEY` and `MONO_SECRET_KEY` are never committed.
3. **Rate Limiting**: Waitlist endpoint has rate limiting. Consider extending to other mutation endpoints.

### Secret Detection Patterns

This project should never contain:
- Paystack Secret Key
- Convex Deployment URL (production)
- Mono API Secret
- Any private keys or tokens

### Audit Trail

All security events are logged via Rafter's audit feature. Check audit logs regularly:
```bash
rafter agent audit --last 10
```
