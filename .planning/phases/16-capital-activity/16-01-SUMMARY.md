---
phase: 16-capital-activity
plan: 01
subsystem: database, api, ui
tags: [prisma, nextjs, react, typescript, vitest, capital-calls, distributions, documents]

# Dependency graph
requires:
  - phase: 15-entity-management-meeting-intelligence
    provides: Entity management foundation, schema stability before capital activity changes
provides:
  - Document model with capitalCallId and distributionEventId FK fields
  - CapitalCall.documents[] and DistributionEvent.documents[] reverse relations
  - DistributionEvent defaults to DRAFT status
  - Documents API POST accepts capitalCallId/distributionEventId
  - Documents API PATCH handler for linking existing documents to capital calls/distributions
  - Capital Activity list page with overdue detection, stat card, per-investor badge, clickable rows
  - isOverdue() pure function with 6 passing unit tests
  - /transactions route renamed to Capital Activity in sidebar
affects: [16-capital-activity-02, 16-capital-activity-03, 17-lp-portal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - isOverdue() pure function pattern: accepts {status, dueDate} object — testable independently of React
    - Documents API PATCH pattern: link existing documents to capital calls/distributions via documentId + FK fields
    - Overdue visual indicator pattern: red-50 bg + OVERDUE badge overlay on rows that match isOverdue()

key-files:
  created:
    - src/lib/computations/overdue-detection.ts
    - src/lib/computations/__tests__/overdue-detection.test.ts
  modified:
    - prisma/schema.prisma
    - src/lib/schemas.ts
    - src/lib/routes.ts
    - src/app/api/documents/route.ts
    - src/app/(gp)/transactions/page.tsx

key-decisions:
  - "isOverdue() exported from src/lib/computations/overdue-detection.ts — pure function, no React deps, testable in vitest node env"
  - "Force-reset wipes AiConfig tenant key — must be re-entered in Settings after any schema push"
  - "Per-investor funded badge reads lineItems[].status === 'Funded' (capital-case from seed data)"
  - "Distribution status default changed to DRAFT in both Prisma schema and CreateDistributionSchema"

patterns-established:
  - "Overdue detection: pure function isOverdue({status, dueDate}) — import in page, test in vitest"
  - "Documents PATCH: {documentId, capitalCallId?, distributionEventId?} body — for Plans 02/03 document panels"

requirements-completed: [CAP-03, CAP-06]

# Metrics
duration: 6min
completed: 2026-03-10
---

# Phase 16 Plan 01: Capital Activity Foundation Summary

**Document FK fields for capital call/distribution attachment, overdue detection with visual indicators and unit tests, Capital Activity page rename with clickable rows and per-investor funded badge, Documents API PATCH handler**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-10T06:23:59Z
- **Completed:** 2026-03-10T06:30:14Z
- **Tasks:** 3
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments
- Prisma schema: Document model gains capitalCallId + distributionEventId nullable FKs with bidirectional relations on CapitalCall and DistributionEvent
- DistributionEvent status default changed from APPROVED to DRAFT (both schema and Zod)
- isOverdue() pure function exported from computations module with 6 passing vitest unit tests
- Capital Activity list page: 5th overdue stat card, red-tinted overdue rows, OVERDUE badge, X/Y funded badge, clickable rows navigating to detail page URLs
- Documents API: POST accepts capitalCallId/distributionEventId; new PATCH handler for linking documents to capital calls or distributions

## Task Commits

Each task was committed atomically:

1. **Task 0: Wave 0 overdue detection test stub** - `da4c404` (test)
2. **Task 1: Schema migration + Zod fix + route rename + Documents API update** - `4aedee2` (feat)
3. **Task 2: Capital Activity list page enhancements** - `a039924` (feat)

**Plan metadata:** (docs commit - see below)

## Files Created/Modified
- `src/lib/computations/overdue-detection.ts` - isOverdue() pure function
- `src/lib/computations/__tests__/overdue-detection.test.ts` - 6 unit tests for isOverdue()
- `prisma/schema.prisma` - Document FK fields, DistributionEvent DRAFT default, reverse relations
- `src/lib/schemas.ts` - CreateDistributionSchema status default changed to DRAFT
- `src/lib/routes.ts` - /transactions route renamed to Capital Activity
- `src/app/api/documents/route.ts` - POST extended with capitalCallId/distributionEventId, PATCH handler added
- `src/app/(gp)/transactions/page.tsx` - Full Capital Activity enhancements

## Decisions Made
- isOverdue() lives in src/lib/computations/overdue-detection.ts as a pure function with no React or Prisma dependencies — enables vitest testing in node environment without jsdom
- Force-reset required for schema FK additions — AiConfig tenant key wiped and must be re-entered in Settings
- Per-investor funded badge reads `lineItems[].status === "Funded"` (capital-case, matching seed data)
- Distribution status default changed to DRAFT in both Prisma schema and Zod schema to keep them in sync
- Documents PATCH handler uses Prisma P2025 error code for 404 — consistent with other API patterns

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None. Schema migration, generate, seed, and build all succeeded on first attempt.

## User Setup Required
**AiConfig tenant AI key cleared by force-reset.** After restarting the dev server, re-enter the tenant AI key in Settings > AI Configuration.

## Next Phase Readiness
- Document FK fields ready for Plans 02 and 03 to build document attachment panels on capital call and distribution detail pages
- GET-side `documents` include on capital call API endpoint is handled in Plan 02
- GET-side `documents` include on distribution API endpoint is handled in Plan 03
- Capital call rows now navigate to /transactions/capital-calls/[id] (will 404 until Plan 02 builds the detail page)
- Distribution rows navigate to /transactions/distributions/[id] (will 404 until Plan 03 builds the detail page)

## Self-Check: PASSED

- FOUND: src/lib/computations/overdue-detection.ts
- FOUND: src/lib/computations/__tests__/overdue-detection.test.ts
- FOUND: .planning/phases/16-capital-activity/16-01-SUMMARY.md
- FOUND: da4c404 (Task 0 commit)
- FOUND: 4aedee2 (Task 1 commit)
- FOUND: a039924 (Task 2 commit)
- Tests: 6/6 passing
- Build: clean (zero errors)
- Schema: valid (npx prisma validate passed)

---
*Phase: 16-capital-activity*
*Completed: 2026-03-10*
