# Admin Settings Runbook

This runbook covers the tools in `/admin/settings`.

## Access Requirements

- Verified email
- `user.isAdmin === true`
- Email present in `ADMIN_EMAIL_ALLOWLIST`

## Tool 1: Recompute System Accounting

Purpose:
- Rebuild derived accounting totals from stored penalty and pool records when seeded data or earlier inconsistencies make the dashboard totals look wrong.

Use when:
- revenue totals appear inconsistent
- reward-pool totals drift from the underlying data
- older test data polluted aggregates

Procedure:
1. Open `/admin/settings`.
2. Trigger `Recompute Accounting`.
3. Wait for the success or failure toast.
4. Refresh admin overview metrics and confirm the totals changed as expected.

Safety notes:
- This should be treated as an operational repair tool, not a routine button.
- Capture before/after totals when using it in shared environments.

## Tool 2: Purge Seed Data By Domain

Purpose:
- Remove dummy/test users and linked data for a specific email domain.

Use when:
- seeded demo users are polluting production-like QA environments
- test records need cleanup before release verification

Procedure:
1. Open `/admin/settings`.
2. Enter the target email domain.
3. Run a dry run first.
4. Review the deletion counts carefully.
5. Run the destructive purge only after confirming the domain is test-only.

Safety notes:
- Never use this tool without confirming the target domain is non-customer test data.
- Preserve screenshots or notes of the dry-run result before executing the destructive pass.

## Environment Checklist

- `ADMIN_EMAIL_ALLOWLIST`
- `PAYSTACK_SECRET_KEY`
- `SITE_URL`
- `VITE_CONVEX_URL`
- active Convex deployment alignment

## Audit Expectations

- Admin actions should leave enough evidence to reconstruct what happened.
- Record who ran the tool, why it was run, and the before/after outcome in the implementation or release notes if used during a release window.
