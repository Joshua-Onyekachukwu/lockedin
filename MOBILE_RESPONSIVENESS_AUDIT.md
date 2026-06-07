# Mobile Responsiveness Audit & Plan (Lockedin)

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

## 4) Proposed Implementation Plan (No Code Changes Yet)

### Phase A — Build a repeatable mobile QA workflow
1. Add a “Responsive QA checklist” and verify the app at widths:
   - 320px, 360px, 375px, 390px, 414px, 430px
   - 768px (tablet portrait), 820px (tablet), 1024px
2. Define “no horizontal scroll” rule:
   - allowed only inside explicit scroll containers (tables, code blocks)

### Phase B — Mobile-first layout adjustments (core user flows)
Targets:
- `/login`, `/verify-required`, `/dashboard`, `/vault/$id`, `/community`

Typical fixes:
- Convert multi-column grids to 1-column at `sm` and restore at `md/lg`
- Replace “big desktop cards” with compact mobile cards
- Add `text-balance` and `leading-tight` to prevent heading overflow
- Ensure all primary CTAs are full-width on mobile

### Phase C — Admin mobile experience strategy
Two options (choose one):
1. Keep tables, but improve discoverability:
   - “Swipe to scroll” affordance + sticky action column where possible
2. Add a mobile “card view” for tables:
   - show key fields + expandable details + actions as a bottom row

### Phase D — Interaction polish
- Standardize modal patterns:
  - body scroll lock
  - internal scroll container (max height)
  - safe close targets (44px+)
- Make all touch targets consistently >= 44px in both dashboard + admin.

## 5) Acceptance Criteria (Mobile)
- A user can: login → verify → create protocol → fund protocol → submit check-in → view vault → share link on a phone with no clipped UI or broken interaction.
- No unintended horizontal scrolling across the app.
- All table overflows are intentional and discoverable.

