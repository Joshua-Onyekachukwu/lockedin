# Mobile Responsiveness Audit & Status (Lockedin)

Date: 2026-06-06

## 1) Scope Covered
Routes reviewed:
- Landing: `/` ([index.tsx](file:///c:/Users/Semek/Webstrom/Lockedin/src/routes/index.tsx))
- Auth: `/login`, `/auth/callback` ([login.tsx](file:///c:/Users/Semek/Webstrom/Lockedin/src/routes/login.tsx), [auth.callback.tsx](file:///c:/Users/Semek/Webstrom/Lockedin/src/routes/auth.callback.tsx))
- Verification: `/verify-required`, `/verify-email`, `/verify-bvn` ([verify-required.tsx](file:///c:/Users/Semek/Webstrom/Lockedin/src/routes/verify-required.tsx), [verify-email.tsx](file:///c:/Users/Semek/Webstrom/Lockedin/src/routes/verify-email.tsx), [verify-bvn.tsx](file:///c:/Users/Semek/Webstrom/Lockedin/src/routes/verify-bvn.tsx))
- Core app: `/dashboard`, `/vault/$id`, `/community`, `/leaderboard`, `/profile`, `/invite/$vaultId`
- Admin: `/admin`, `/admin/settings`, `/admin/tx/$txId`, `/admin/audit/$auditId`

## 2) Method
This audit is a code-level and interaction-level review:
- Static inspection of every route/component for: fixed widths, missing breakpoints, large typography without `sm/md` guards, grids without mobile fallbacks, table overflow behavior, and modal scroll-lock behavior.
- Local smoke checks for major entry points (landing + modal overlays) to ensure no immediate layout breaks.

## 3) Key Findings (By Severity)

### Critical
1. **Modal scroll-lock reliability**
   - Risk: background scroll remains enabled or gets “stuck” after closing (common on iOS Safari).
   - Status: fixed with a body scroll lock hook for modal overlays (Check-in + evidence preview).
2. **Large dashboard bundle impacting mobile performance**
   - Risk: slow initial load on mid/low-end devices; higher abandonment.
   - Status: addressed by code-splitting heavy modals (lazy-loaded).

### High
1. **Typography scale on hero/headers**
   - Many pages use very large headings. While some have `sm:` guards, the overall design depends on aggressive typography and can cause:
     - clipping on 320–360px devices
     - excessive vertical scrolling before reaching CTAs
2. **Dense “data dashboards” on small screens**
   - Admin and dashboard pages have large tables and multi-column layouts. Some tables already have `overflow-x-auto` and `min-w-[900px]`, but UX is still “desktop-first”:
     - horizontal scroll is functional but not discoverable
     - action buttons can become too small or too close together

### Medium
1. **Touch target sizes**
   - Some icon-only buttons are 40x40 which is borderline on mobile; recommended minimum is ~44x44.
2. **Forms + inputs**
   - Some inputs use large padding + uppercase + wide tracking; can cause awkward editing on mobile keyboards.
3. **Evidence image previews**
   - Evidence preview containers use max-height caps; on some devices may feel cramped.

### Low
1. **Spacing consistency**
   - Some pages mix `p-6`, `p-8`, `p-10`, `p-12` without a consistent mobile-first scale system.
2. **Minor horizontal overflow risk**
   - Some sections use large absolute-positioned glow elements; likely ok, but needs confirm across breakpoints.

## 4) Current Status And Remaining Work

### Completed Since Audit
1. Modal interaction hardening landed for the highest-risk overlays:
   - body scroll lock for key modal flows
   - internal scroll containers for constrained evidence/modal content
2. Heavy dashboard modal content has been code-split to reduce mobile initial-load pressure.
3. Wallet/admin follow-up work now needs to be verified against the same responsive checklist rather than treated as a separate ad hoc pass.

### Repeatable QA Workflow
1. Use [RESPONSIVE_QA_CHECKLIST.md](file:///c:/Users/Semek/Webstrom/Lockedin/RESPONSIVE_QA_CHECKLIST.md) for every responsive pass.
2. Verify widths:
   - 320px, 360px, 375px, 390px, 414px, 430px
   - 768px, 820px, 1024px
3. Treat horizontal scrolling as acceptable only inside explicit overflow containers such as tables.

### Next UI Targets
- `/login`, `/verify-required`, `/dashboard`, `/vault/$id`, `/community`
- `/admin`, `/admin/settings`, `/profile`

### Remaining UX Focus
- Improve discoverability for table overflow on admin/dashboard data surfaces
- Standardize 44px+ touch targets across admin action controls
- Reduce oversized type/spacing pressure on the smallest widths without breaking the product aesthetic

## 5) Acceptance Criteria (Mobile)
- A user can: login → verify → create protocol → fund protocol → submit check-in → view vault → share link on a phone with no clipped UI or broken interaction.
- No unintended horizontal scrolling across the app.
- All table overflows are intentional and discoverable.
