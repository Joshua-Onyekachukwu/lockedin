# Admin Payments Runbook

This runbook covers the payment-support and withdrawal tools exposed through the current admin console.

Current state note:

- The merged product on `main` is still protocol-first.
- An active wallet productization phase is in progress on `phase-wallet-v1-foundation`.
- Admin finance operations should be kept consistent with both the current merged wallet-support surfaces and the incoming first-class wallet dashboard work.

## Preconditions

- Admin account must have:
  - verified email
  - `user.isAdmin === true`
  - email listed in `ADMIN_EMAIL_ALLOWLIST`
- Convex env must include the active Paystack secrets for the target environment.
- Use the same environment across Convex, Vercel, Paystack webhook, and OAuth settings.

## Safe-Handling Rules

- Do not paste or store full bank account numbers in tickets or chat.
- Use payment references, withdrawal IDs, timestamps, and masked account numbers when escalating issues.
- Use preview/recovery tooling before taking destructive action.

## Payment Explorer

Use when a tester reports a Paystack reference problem.

1. Open `/admin`.
2. Launch the payment explorer tool.
3. Search by reference, customer email, transfer code, or transfer ID as supported by the UI.
4. Review:
   - deposit record
   - reconciliation state
   - unmatched-payment record
   - linked user
   - linked vault, if applicable

Important:

- When the new wallet dashboard merges, the same payment references and statuses shown to users must remain traceable from admin payment explorer surfaces.

## Unmatched Paystack Payments

Use when Paystack received money but Lockedin did not complete the credit path automatically.

1. Open the unmatched-payments view in `/admin`.
2. Inspect the reason and metadata.
3. Prefer retry/recovery paths before manual resolution.
4. Mark as resolved only after the final state is confirmed in the linked deposit/reconciliation records.

## Withdrawal Queue

Use for user payout requests.

1. Open the pending withdrawal table in `/admin`.
2. Review the masked destination details, amount, and user identity.
3. Choose one action:
   - `Reject`: returns escrowed capital to the user wallet and marks linked transaction failed
   - `Process Transfer`: initiates the Paystack transfer flow
4. Confirm the result:
   - withdrawal status updates
   - linked transaction status updates
   - notification is written
   - audit entry is written

Wallet-alignment note:

- User wallet surfaces and admin withdrawal surfaces must agree on status wording, references, and masked destination display.

## Before Escalating

- Confirm whether the issue is:
  - user misunderstanding
  - delayed Paystack confirmation
  - underpayment
  - environment mismatch
  - unmatched reconciliation
  - failed transfer

## Evidence To Capture

- payment reference
- withdrawal ID
- user email
- vault ID if funding-related
- exact admin action taken
- resulting status after action
