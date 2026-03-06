---
phase: 02-deal-desk-end-to-end
plan: 03
subsystem: deal-closing
tags: [closing-checklist, deal-to-asset, multi-entity, file-attachments, auto-redirect, junction-table]

# Dependency graph
requires:
  - phase: 02-deal-desk-end-to-end
    plan: 01
    provides: "Schema changes: DealEntity junction, ClosingChecklist file fields, Asset.sourceDealId"
  - phase: 02-deal-desk-end-to-end
    plan: 02
    provides: "Kill/revive flow, wizard polish, inline edit field"
provides:
  - "Enhanced closing checklist with custom items and per-item file attachments"
  - "Deal-to-asset transition with sourceDealId provenance tracking"
  - "Multi-entity deal support via DealEntity junction table UI"
  - "Close modal pre-populates allocations from DealEntity junction records"
  - "Auto-redirect to new asset page after deal close"
affects: [02-07]

# Tech tracking
tech-stack:
  added: []
  patterns: ["FormData file upload for closing checklist attachments", "DealEntity junction table UI with formation status badges"]

key-files:
  created: []
  modified:
    - "src/components/features/deals/deal-closing-tab.tsx"
    - "src/app/api/deals/[id]/closing/route.ts"
    - "src/lib/schemas.ts"
    - "src/lib/deal-stage-engine.ts"
    - "src/components/features/deals/deal-entity-section.tsx"
    - "src/components/features/deals/close-deal-modal.tsx"
    - "src/components/features/deals/deal-overview-tab.tsx"
    - "src/app/(gp)/deals/[id]/page.tsx"

key-decisions:
  - "File attachments on closing items use same Vercel Blob pattern as deal documents (private access + proxy serve)"
  - "PATCH route uses content-type detection to handle both FormData (file upload) and JSON (standard updates)"
  - "CloseDealModal pre-populates from DealEntity junction records first, falls back to legacy initialEntityId"
  - "DealEntitySection always visible at every deal stage (rendered in both screening and post-screening overview sections)"

patterns-established:
  - "Content-type detection in PATCH route: multipart/form-data for file uploads, application/json for standard updates"
  - "Junction table pre-population in modal: fetch junction records, normalize to 100% if needed, fallback to legacy FK"

requirements-completed: [DEAL-02, DEAL-03, DEAL-04]

# Metrics
duration: 9min
completed: 2026-03-06
---

# Phase 2 Plan 03: Closing Workflow, Deal-to-Asset, Multi-Entity Summary

**Enhanced closing checklist with custom items and file attachments, deal-to-asset transition with sourceDealId and auto-redirect, multi-entity deal support via junction table UI**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-06T06:32:29Z
- **Completed:** 2026-03-06T06:41:19Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Closing checklist enhanced with custom item creation ("Add Item" button with inline form) and per-item file attachments (upload via FormData to Vercel Blob)
- Custom items tagged with "Custom" badge, ordered after template items, persisted with isCustom flag
- File attachments displayed as clickable links with download icon and "Remove" button
- API route handles ADD_CUSTOM (POST), ATTACH_FILE (PATCH with FormData), and REMOVE_FILE (PATCH with JSON) actions
- Deal close now sets sourceDealId on created Asset for provenance tracking
- DealEntitySection completely rewritten to use DealEntity junction table instead of single entityId FK
- Multi-entity list shows entity name, type badge, formation status badge, allocation percentage, and remove button
- Entity creation and linking available at every deal stage (section always visible in overview tab)
- CloseDealModal pre-populates allocations from DealEntity junction records with their allocationPercent values
- Auto-redirect to new asset page after successful deal close via router.push

## Task Commits

Each task was committed atomically:

1. **Task 1: Closing tab enhancements with custom items and file attachments** - `3a23f68` (feat)
2. **Task 2: Deal-to-asset carryover + multi-entity UI + close modal + auto-redirect** - `1858504` (feat)

## Files Created/Modified

- `src/components/features/deals/deal-closing-tab.tsx` - Added custom item creation, file upload/display per item, "Add Item" inline form
- `src/app/api/deals/[id]/closing/route.ts` - Added ADD_CUSTOM POST action, ATTACH_FILE/REMOVE_FILE PATCH actions with FormData handling
- `src/lib/schemas.ts` - Added action field to UpdateClosingChecklistItemSchema for REMOVE_FILE support
- `src/lib/deal-stage-engine.ts` - Added sourceDealId to asset creation in closeDeal()
- `src/components/features/deals/deal-entity-section.tsx` - Complete rewrite to use DealEntity junction table API
- `src/components/features/deals/close-deal-modal.tsx` - Added dealId prop, pre-populate from DealEntity junction records
- `src/components/features/deals/deal-overview-tab.tsx` - Updated DealEntitySection usage (removed targetEntity prop)
- `src/app/(gp)/deals/[id]/page.tsx` - Added auto-redirect after close, passed dealId to CloseDealModal

## Decisions Made

- File attachments on closing checklist items use the same Vercel Blob pattern as deal documents (private access with proxy serve route for both prod and dev)
- PATCH route uses content-type detection (multipart/form-data vs application/json) to handle both file uploads and standard JSON updates in a single handler
- CloseDealModal pre-populates from DealEntity junction records first, then falls back to legacy initialEntityId if no junction records exist
- DealEntitySection is always visible at every deal stage -- it renders in both the screening and post-screening sections of the overview tab

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree missing Plan 01+02 changes**
- **Found during:** Pre-execution setup
- **Issue:** Worktree was based on older branch, missing schema changes (DealEntity model, ClosingChecklist file fields, Asset.sourceDealId) and Plan 02 UI changes
- **Fix:** Merged main branch into worktree to bring in all Plan 01+02 changes
- **Files modified:** All schema and prior plan files via git merge

## Issues Encountered

None beyond the worktree sync issue documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Closing workflow is fully functional with custom items, file attachments, and warn-on-incomplete
- Deal-to-asset transition carries sourceDealId -- asset detail pages can show deal provenance (Plan 02-07)
- Multi-entity junction table UI enables pipeline analytics to show entity allocation breakdowns (Plan 02-07)
- Auto-redirect after close creates seamless deal-to-asset user flow

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 02-deal-desk-end-to-end*
*Completed: 2026-03-06*
