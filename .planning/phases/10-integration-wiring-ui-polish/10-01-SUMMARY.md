---
phase: 10-integration-wiring-ui-polish
plan: 01
subsystem: ui, api, rbac
tags: [middleware, lp-portal, rbac, clerk, document-center, download-link]

# Dependency graph
requires:
  - phase: 07-lp-portal-reports-esignature
    provides: LP document API returning fileUrl in Document records
  - phase: 04-asset-entity-polish
    provides: middleware RBAC foundation (isGPAPIRoute, isLPRoute, isGPPageRoute)
  - phase: 08-lp-portal-auth-polish
    provides: K-1, e-signature, side-letters, commitments, DocuSign routes added in Phases 7-8
provides:
  - LP document center with clickable Download anchor on each document row
  - isGPAPIRoute middleware now covers all 7 routes added in Phases 7-9 (k1, esignature, side-letters, commitments, docusign/connect, docusign/disconnect, docusign/status)
affects: [lp-portal, rbac, middleware, document-center]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional anchor rendering: {doc.fileUrl && <a href={doc.fileUrl} ...>} — only renders when fileUrl is non-empty"
    - "Middleware route expansion pattern: append new patterns to isGPAPIRoute createRouteMatcher array as new GP routes are added in subsequent phases"

key-files:
  created: []
  modified:
    - src/app/(lp)/lp-documents/page.tsx
    - src/middleware.ts

key-decisions:
  - "Download anchor renders conditionally only when doc.fileUrl is non-empty — avoids broken href on documents with empty fileUrl"
  - "/api/docusign/callback and /api/docusign/webhook kept in isPublicRoute (not added to isGPAPIRoute) — called by DocuSign servers, correctly public"
  - "7 new route patterns added to isGPAPIRoute despite plan saying 6 — the 3 docusign patterns (connect/disconnect/status) are separate entries totaling 7"

patterns-established:
  - "After adding new GP API routes in a phase, always add them to isGPAPIRoute in middleware.ts before closing the phase"

requirements-completed: [REPORT-01, REPORT-02, REPORT-05, CORE-02, CORE-03]

# Metrics
duration: 2min
completed: 2026-03-08
---

# Phase 10 Plan 01: Integration Wiring & UI Polish Summary

**LP document center gets clickable Download anchors via fileUrl field, and middleware RBAC now blocks LP_INVESTOR on all 7 GP routes added in Phases 7-9**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-08T15:01:16Z
- **Completed:** 2026-03-08T15:03:34Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `fileUrl: string` to the inline doc type annotation in lp-documents/page.tsx and replaced the plain Badge with a flex container showing the category badge plus a conditional Download anchor
- Download anchor uses `href={doc.fileUrl}`, opens in new tab with `rel="noopener noreferrer"`, styled as an indigo button, only renders when `fileUrl` is non-empty
- Expanded `isGPAPIRoute` in middleware.ts with 7 new patterns: `/api/k1(.*)`, `/api/esignature(.*)`, `/api/side-letters(.*)`, `/api/commitments(.*)`, `/api/docusign/connect(.*)`, `/api/docusign/disconnect(.*)`, `/api/docusign/status(.*)`
- All existing middleware logic (isPublicRoute, isLPRoute, isGPPageRoute, clerkMiddleware handler) left completely unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Add fileUrl to LP document center and render download anchor** - `5832630` (feat)
2. **Task 2: Expand isGPAPIRoute middleware coverage to 6 missing GP routes** - `cbb2310` (feat)

## Files Created/Modified
- `src/app/(lp)/lp-documents/page.tsx` - Added `fileUrl: string` to inline doc type; replaced `<Badge>` with flex container including Badge + conditional Download anchor
- `src/middleware.ts` - Added 7 route patterns to `isGPAPIRoute` createRouteMatcher array (k1, esignature, side-letters, commitments, docusign connect/disconnect/status)

## Decisions Made
- Download anchor renders conditionally only when `doc.fileUrl` is non-empty — avoids broken href on documents with empty fileUrl string
- `/api/docusign/callback` and `/api/docusign/webhook` are correctly left in `isPublicRoute` — they are called by DocuSign servers without user auth tokens, must remain public
- The plan said "6 missing routes" but the actual additions were 7 patterns (the 3 docusign patterns are separate createRouteMatcher entries for connect, disconnect, and status)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Both changes were surgical and precise — the existing pre-built type annotation and Badge were the only code to touch in lp-documents/page.tsx, and the createRouteMatcher array in middleware.ts only needed 7 appended string literals.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- LP document download link is live — LPs can now download any document with a non-empty fileUrl directly from the LP Document Center
- All 7 routes added in Phases 7-9 are now RBAC-protected at the middleware layer — LP_INVESTOR will receive 403 before reaching route handlers
- No blockers for subsequent plans in Phase 10

## Self-Check: PASSED

- FOUND: `src/app/(lp)/lp-documents/page.tsx` (contains 3 references to `fileUrl`)
- FOUND: `src/middleware.ts` (contains `/api/k1` and all 7 new route patterns)
- FOUND: `.planning/phases/10-integration-wiring-ui-polish/10-01-SUMMARY.md`
- FOUND commit `5832630`: feat(10-01): add fileUrl to LP document center and render download anchor
- FOUND commit `cbb2310`: feat(10-01): expand isGPAPIRoute middleware coverage to 6 missing GP routes
- Build: zero errors, compiled successfully

---
*Phase: 10-integration-wiring-ui-polish*
*Completed: 2026-03-08*
