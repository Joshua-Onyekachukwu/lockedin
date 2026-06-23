# Responsive QA Checklist

Use this checklist for every responsive verification pass before shipping UI-heavy changes.

## Viewports

- 320px
- 360px
- 375px
- 390px
- 414px
- 430px
- 768px
- 820px
- 1024px

## Core Rules

- No unintended horizontal scrolling on the page body.
- Horizontal scrolling is allowed only inside explicit overflow containers such as tables.
- Primary actions remain visible and reachable without clipped text.
- Touch targets stay at or above roughly 44px for important buttons and icon controls.
- Modals lock background scroll and keep their own content scrollable.

## Priority Routes

- `/`
- `/login`
- `/verify-required`
- `/verify-email`
- `/dashboard`
- `/vault/$id`
- `/community`
- `/leaderboard`
- `/profile`
- `/admin`
- `/admin/settings`
- `/admin/tx/$txId`
- `/admin/audit/$auditId`

## Flow Checks

- Sign in and complete email verification.
- Create a protocol and confirm the funding CTA remains usable.
- Fund a protocol and confirm the post-payment state is readable.
- Submit a check-in with note and images.
- Open profile wallet surfaces and review the withdrawal queue.
- Open admin tables and confirm overflow is intentional and discoverable.

## Regression Notes

- Record the route, viewport width, browser/device, and a screenshot for any overflow or clipped-control issue.
- If a table requires horizontal scrolling, note whether the affordance is obvious without instructions.
