---
phase: 17-lp-portal
plan: "03"
subsystem: api, ui, testing
tags: [k1, acknowledge, lp-profile, tax-id, vitest, prisma, swr]

# Dependency graph
requires:
  - phase: 17-lp-portal
    plan: "01"
    provides: Document.acknowledgedAt / acknowledgedByInvestorId fields on schema; Investor.mailingAddress / taxId / phone fields on schema; document center with K-1 tab

provides:
  - POST /api/k1/acknowledge endpoint for batch K-1 acknowledgment with investor ownership verification
  - GET /api/reports/k1-status endpoint for GP per-investor acknowledgment tracking
  - POST /api/reports/k1-status/remind stub endpoint for K-1 reminder logging
  - lp-documents page: batch acknowledge section in K-1s tab (checkboxes, select-all, Acknowledge Selected button)
  - reports page: K1TrackingSection table with status, last acknowledged date, and Send Reminder button
  - GET/PUT /api/investors/[id]/profile for LP profile data (legalName, email, phone, mailingAddress, taxId, entityAffiliations)
  - lp-profile page at /lp-profile with legal name (read-only), editable contact info, masked tax ID toggle, entity affiliations
  - 8 passing vitest tests covering LP-08 acknowledge endpoint and LP-09 profile GET/PUT

affects: [lp-portal-all-pages, gp-reports-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Batch acknowledge pattern: POST with documentIds array, ownership verification before updateMany
    - maskTaxId helper: strips non-digits, shows ***-**-XXXX for last 4 digits
    - Separate edit toggle per section: editing state for contact info, editingTaxId state for tax ID section
    - K1TrackingSection as standalone component inside reports page: self-fetching, no prop drilling
    - Wave 0 test stubs pattern: create todos first, fill in assertions in same task

key-files:
  created:
    - src/app/api/k1/acknowledge/route.ts
    - src/app/api/reports/k1-status/route.ts
    - src/app/api/reports/k1-status/remind/route.ts
    - src/app/api/investors/[id]/profile/route.ts
    - src/app/(lp)/lp-profile/page.tsx
  modified:
    - src/app/(lp)/lp-documents/page.tsx
    - src/app/(gp)/reports/page.tsx
    - src/app/api/k1/__tests__/acknowledge.test.ts
    - src/app/api/investors/__tests__/profile.test.ts
    - src/lib/routes.ts
    - src/lib/audit.ts

key-decisions:
  - "AuditAction union extended with K1_ACKNOWLEDGE and K1_REMINDER_SENT — logAudit called fire-and-forget in acknowledge and remind handlers"
  - "Contact model uses firstName/lastName not name — profile route selects both fields; buildProfileResponse uses investor.contact.email/phone for fallback chain"
  - "K1TrackingSection placed above K-1 Distribution section in GP reports page — logical flow from tracking to uploading"
  - "Tax ID edit is a separate toggle from contact info edit — security pattern isolates sensitive field mutations"
  - "Remind endpoint is a stub that logs audit only — actual email delivery deferred to Phase 18"

patterns-established:
  - "maskTaxId(taxId: string | null): strips non-digits, returns ***-**-XXXX for security masking"
  - "Batch ownership verification pattern: findMany first, check all belong to investor, then updateMany"
  - "K1TrackingSection self-contained component with own SWR fetch — no prop drilling from parent"

requirements-completed: [LP-08, LP-09]

# Metrics
duration: 18min
completed: 2026-03-10
---

# Phase 17 Plan 03: K-1 Acknowledgment Workflow and LP Profile Page Summary

**K-1 batch acknowledgment lifecycle (LP batch UI + GP tracking table + remind stub) and LP profile page with masked tax ID editing and contact information management**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-03-10T08:03:53Z
- **Completed:** 2026-03-10T08:21:41Z
- **Tasks:** 3 (Task 0 + Task 1 + Task 2)
- **Files modified:** 10

## Accomplishments
- K-1 batch acknowledgment: LP can select all/individual unacknowledged K-1s from the K-1s tab and submit in one click; acknowledged K-1s show "Acknowledged [date]" badge
- GP Reports page gains K-1 Acknowledgment Tracking section showing per-investor status table (total/acknowledged/pending counts, last acknowledged date, status badge) with Send Reminder button
- LP Profile page at /lp-profile: legal name read-only, phone and mailing address editable, tax ID masked as ***-**-XXXX with separate Edit toggle that reveals full input, entity affiliations list
- 8 vitest tests pass: 4 for acknowledge endpoint (batch update, empty array, ownership check, response shape), 4 for profile endpoint (GET shape, 404, PUT update, Zod validation)

## Task Commits

Each task was committed atomically:

1. **Task 0: Wave 0 test stubs** - `f37d1b5` (test)
2. **Task 1: K-1 acknowledgment workflow (LP-08)** - `0caa948` (feat)
3. **Task 2: LP profile page (LP-09)** - `2f796a8` (feat)

**Plan metadata:** (to be added in final commit)

## Files Created/Modified
- `src/app/api/k1/acknowledge/route.ts` - POST endpoint for batch K-1 acknowledgment with investor ownership verification
- `src/app/api/reports/k1-status/route.ts` - GET endpoint returning per-investor K-1 acknowledgment status
- `src/app/api/reports/k1-status/remind/route.ts` - POST stub that logs K1_REMINDER_SENT audit action
- `src/app/api/investors/[id]/profile/route.ts` - GET/PUT investor profile endpoint (legalName, email, phone, mailingAddress, taxId, entityAffiliations)
- `src/app/(lp)/lp-profile/page.tsx` - LP profile page with masked tax ID, editable contact fields, entity affiliations
- `src/app/(lp)/lp-documents/page.tsx` - Added batch acknowledge section (checkboxes, select-all, submit button) to K-1s tab
- `src/app/(gp)/reports/page.tsx` - Added K1TrackingSection component with per-investor acknowledgment table and Send Reminder
- `src/app/api/k1/__tests__/acknowledge.test.ts` - 4 passing tests for acknowledge endpoint
- `src/app/api/investors/__tests__/profile.test.ts` - 4 passing tests for profile GET/PUT
- `src/lib/routes.ts` - Added /lp-profile route to APP_ROUTES for LP portal sidebar
- `src/lib/audit.ts` - Added K1_ACKNOWLEDGE and K1_REMINDER_SENT to AuditAction union

## Decisions Made
- `AuditAction` union extended in place with `K1_ACKNOWLEDGE` and `K1_REMINDER_SENT` — required for type-safe audit calls in both new endpoints
- Contact model uses `firstName`/`lastName` (not `name`) — caught during TypeScript build check; profile route selects both fields; buildProfileResponse uses contact.email/phone for fallback chain
- Tax ID edit is a separate toggle from contact info edit — isolates sensitive field mutations, better security UX
- K1TrackingSection placed above K-1 Distribution section in GP reports page — logical top-down flow: see acknowledgment status, then upload more K-1s
- Remind endpoint logs audit only — actual email delivery deferred; stub pattern consistent with other reminder flows in the codebase

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added K1_ACKNOWLEDGE and K1_REMINDER_SENT to AuditAction union**
- **Found during:** Task 1 (K-1 acknowledgment API)
- **Issue:** `logAudit()` is typed with `AuditAction` union — calling it with `"K1_ACKNOWLEDGE"` would cause TypeScript error without adding to the union
- **Fix:** Extended `AuditAction` in `src/lib/audit.ts` with two new values
- **Files modified:** src/lib/audit.ts
- **Verification:** Build passes, TypeScript accepts the new action strings
- **Committed in:** `0caa948` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Extension of existing audit type union — minimal, necessary for type-safe audit logging. No scope creep.

## Issues Encountered
- Contact model uses `firstName`/`lastName` (not a `name` field) — TypeScript build caught this on first build attempt. Fixed by selecting both fields and using them in the fallback response builder. No impact on functionality.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- LP-08 and LP-09 complete — full K-1 lifecycle implemented
- Phase 17 plans all complete (01, 02, 03) — LP Portal phase ready for final verification
- Remind endpoint stub ready for Phase 18 email integration (K1_REMINDER_SENT audit logged)
- LP profile fields (mailingAddress, taxId, phone) now fully editable via LP self-service

## Self-Check: PASSED
- FOUND: src/app/api/k1/acknowledge/route.ts
- FOUND: src/app/api/reports/k1-status/route.ts
- FOUND: src/app/api/reports/k1-status/remind/route.ts
- FOUND: src/app/api/investors/[id]/profile/route.ts
- FOUND: src/app/(lp)/lp-profile/page.tsx (170+ lines)
- FOUND commit f37d1b5 (Task 0: test stubs)
- FOUND commit 0caa948 (Task 1: K-1 workflow)
- FOUND commit 2f796a8 (Task 2: LP profile)
- All 8 vitest tests pass (acknowledge + profile)
- Build: zero errors

---
*Phase: 17-lp-portal*
*Completed: 2026-03-10*
