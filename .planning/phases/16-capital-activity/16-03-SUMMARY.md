---
phase: 16-capital-activity
plan: 03
subsystem: ui, api
tags: [nextjs, react, typescript, swr, capital-activity, distributions, documents]

# Dependency graph
requires:
  - phase: 16-capital-activity-01
    provides: Document FK fields (distributionEventId on Document model), Documents API PATCH handler, DistributionEvent DRAFT default

provides:
  - Distribution detail page at /transactions/distributions/[id] with full lifecycle UI
  - DistributionStatusButtons: Approve (DRAFT→APPROVED) and Mark as Paid (APPROVED→PAID) with ConfirmDialog gates
  - PAID status badge with no action buttons (lifecycle enforced)
  - Per-investor Allocations table with gross/ROC/income/LT gain/carry/net breakdown plus summary totals row
  - DistributionDocumentPanel: upload new (FormData with distributionEventId) and link existing entity docs
  - Distribution GET endpoint extended with documents[] include clause

affects: [16-capital-activity-04, 16-capital-activity-05, 16-capital-activity-06, 17-lp-portal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - DistributionStatusButtons pattern: conditional render based on status (DRAFT/APPROVED/PAID) with ConfirmDialog — mirrors CapitalCall pattern from Plan 02
    - Document panel pattern: upload via FormData POST + link existing via PATCH + unlink via PATCH with null FK — reusable for any entity with document attachments
    - SWR mutate trigger: onStatusChange() calls mutate() on the parent SWR key to refresh page state after status transition

key-files:
  created:
    - src/components/features/capital/distribution-status-buttons.tsx
    - src/components/features/capital/distribution-document-panel.tsx
    - src/app/(gp)/transactions/distributions/[id]/page.tsx
  modified:
    - src/app/api/distributions/[id]/route.ts

key-decisions:
  - "DistributionStatusButtons renders conditionally: Approve button (DRAFT), Mark as Paid (APPROVED), paid badge (PAID), null (all others)"
  - "Mark as Paid ConfirmDialog message explicitly mentions capital account recompute and investor notification — user must understand side effects"
  - "distributionEventId field passed in POST FormData body, not URL — consistent with capitalCallId pattern from Plan 02"
  - "Unlink implemented via PATCH /api/documents with distributionEventId: null — leverages existing PATCH handler without new endpoint"

patterns-established:
  - "Distribution lifecycle UI: status-based conditional rendering, no skip allowed server-side (ALLOWED_TRANSITIONS enforced in API)"
  - "Document panel self-contained: fetches entity docs internally, handles upload/link/unlink, mutates parent SWR on success"

requirements-completed: [CAP-02, CAP-04]

# Metrics
duration: 5min
completed: 2026-03-10
---

# Phase 16 Plan 03: Distribution Detail Page Summary

**Distribution detail page with DRAFT→APPROVED→PAID lifecycle buttons, per-investor allocations table, and document attachment panel (upload + link existing)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-10T06:34:08Z
- **Completed:** 2026-03-10T06:39:00Z
- **Tasks:** 2
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments
- DistributionStatusButtons enforces full DRAFT→APPROVED→PAID lifecycle with ConfirmDialog on each transition; PAID shows a green badge with no further actions
- Distribution detail page renders entity info, dates, amounts, tax breakdown (ROC/income/LT gain/ST gain/carry), and per-investor allocations table with totals summary row
- DistributionDocumentPanel allows GP to upload new documents (POST with distributionEventId FormData field) or link existing entity documents (PATCH /api/documents); attached documents show with name, size, date, download link, and Unlink button
- Distribution GET endpoint updated to include documents[] relation for rendering in detail page

## Task Commits

Each task was committed atomically:

1. **Task 1: Distribution detail page with status buttons and line items** - `4f9c1ce` (feat)
2. **Task 2: Distribution document panel** - `32d6f86` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/components/features/capital/distribution-status-buttons.tsx` - Approve and Mark as Paid buttons with ConfirmDialog; PAID badge; status-conditional rendering
- `src/components/features/capital/distribution-document-panel.tsx` - Document upload (FormData + distributionEventId) and link existing entity docs (PATCH); unlink support; EmptyState CTA
- `src/app/(gp)/transactions/distributions/[id]/page.tsx` - Full distribution detail page: header with status badge + action buttons, Distribution Details panel (financial info + tax breakdown), Investor Allocations table, Documents section
- `src/app/api/distributions/[id]/route.ts` - GET handler extended with `documents { select: {...} }` include clause

## Decisions Made
- DistributionStatusButtons renders null for any unrecognized status (defensive) — matches PAID terminal state pattern
- Mark as Paid ConfirmDialog message explicitly calls out capital account recompute and investor notification so GP is aware of side effects before confirming
- DistributionDocumentPanel self-fetches entity docs via SWR (not passed as prop) — keeps parent page clean; uses `data.data` field since /api/documents returns paginated response
- Unlink uses PATCH /api/documents with `distributionEventId: null` — no new endpoint needed, existing PATCH handler already accepts undefined/null FK fields

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None. Both tasks compiled clean on first attempt. Build lock contention from prior run required `rm .next/lock` once.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Distribution detail page fully functional: status lifecycle, allocations, and document attachment all wired
- Distribution rows on /transactions now navigate to working detail pages (no longer 404)
- Plan 04 (capital call line items update) and Plans 05/06 can proceed independently
- DistributionDocumentPanel pattern can be referenced when building similar panels for other entity types

## Self-Check: PASSED

- FOUND: src/components/features/capital/distribution-status-buttons.tsx
- FOUND: src/components/features/capital/distribution-document-panel.tsx
- FOUND: src/app/(gp)/transactions/distributions/[id]/page.tsx
- FOUND: 4f9c1ce (Task 1 commit)
- FOUND: 32d6f86 (Task 2 commit)
- Build: clean (zero errors, exit code 0)
- Routes: /transactions/distributions/[id] in output

---
*Phase: 16-capital-activity*
*Completed: 2026-03-10*
