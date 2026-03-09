---
phase: 13-deal-desk-crm
plan: "01"
subsystem: ui
tags: [deals, kanban, pipeline, crm, prisma, swr, nextjs]

# Dependency graph
requires:
  - phase: 11-foundation
    provides: shared UI components and patterns used in kanban board
  - phase: 12-ai-configuration-document-intake
    provides: stable deal API foundation this builds on
provides:
  - daysInStage computed field in /api/deals list response
  - Color-coded days-in-stage badge on every kanban card
  - Enhanced kanban column headers with deal count and aggregate $ value
  - sourceAssets relation in /api/deals/[id] response
  - View Asset link in closed deal banner linking to /assets/{id}
affects: [14-assets-tasks, 19-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "daysInStage via DealActivity STAGE events: find entry with newStage === deal.stage, fallback to deal.createdAt"
    - "Strip computed-from fields before returning to client: destructure and spread pattern"
    - "Conditional link pattern: only render Link when sourceAssets?.length > 0"

key-files:
  created: []
  modified:
    - src/app/api/deals/route.ts
    - src/app/(gp)/deals/page.tsx
    - src/app/api/deals/[id]/route.ts
    - src/app/(gp)/deals/[id]/page.tsx

key-decisions:
  - "daysInStage stripped from activities before API response - client only sees computed number, not raw activity data"
  - "Days-in-stage color thresholds: gray <14d, amber 14-30d, red >30d (matches SLA intuition for deal velocity)"
  - "Column header value uses existing pipelineAnalytics.valueByStage already computed in API - no extra DB query"
  - "View Asset link only shown when sourceAssets.length > 0 - safe for legacy closed deals without asset record"

patterns-established:
  - "Compute-and-strip pattern: include relation for computation, delete before return: { activities, ...rest } = deal"
  - "daysInStage color coding: <14 gray, 14-30 amber, >30 red"

requirements-completed:
  - DEAL-11
  - DEAL-12
  - DEAL-13

# Metrics
duration: 3min
completed: 2026-03-09
---

# Phase 13 Plan 01: Deal Desk CRM — Pipeline Intelligence Summary

**Kanban board now shows per-card days-in-stage badges (color-coded gray/amber/red) + column headers with deal count and $ value; closed deal pages have a direct "View Asset" link**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-09T20:11:40Z
- **Completed:** 2026-03-09T20:14:19Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `daysInStage` computed field to `/api/deals` list response using DealActivity STAGE events (matching the pattern already established in analytics/pipeline/route.ts)
- Enhanced kanban cards with color-coded days-in-stage badge: gray for <14 days, amber for 14-30 days, red for >30 days — gives GPs instant visual pipeline health signal
- Enhanced column headers to show deal count and aggregate $ value sourced from existing `pipelineAnalytics.valueByStage` — no extra DB query needed
- Added `sourceAssets: { select: { id, name } }` to the deal detail API include block
- Added "View Asset" link in the closed deal green banner, guarded by `sourceAssets?.length > 0` — works correctly for legacy closed deals that have no asset record

## Task Commits

Each task was committed atomically:

1. **Task 1: daysInStage API and kanban board enhancements** - `5efc650` (feat)
2. **Task 2: sourceAssets API and View Asset link on closed deals** - `20ce80c` (feat)

**Plan metadata:** _(committed with final state update)_

## Files Created/Modified

- `src/app/api/deals/route.ts` - Added STAGE activities include, compute daysInStage, strip activities before response
- `src/app/(gp)/deals/page.tsx` - Added days-in-stage badge on cards, enhanced column headers with count + value
- `src/app/api/deals/[id]/route.ts` - Added `sourceAssets: { select: { id, name } }` to Prisma include
- `src/app/(gp)/deals/[id]/page.tsx` - Added "View Asset" link in the closed deal banner

## Decisions Made

- Used destructure-and-spread to strip `activities` from API response: `const { activities, ...rest } = deal; return { ...rest, daysInStage }`. This ensures the raw activity array never reaches the client, keeping the response payload lean.
- Column header value pulled from existing `analytics?.valueByStage` SWR data already present on the page — zero additional API calls.
- Days badge only shows when `typeof p.daysInStage === "number"` — safe guard against old API responses or undefined fields during pagination.
- View Asset link uses `deal.sourceAssets[0].id` — for the common one-deal-one-asset case. Multiple assets not expected in practice.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Build lock file was stale from a previous process. Cleared with `pkill -f "next build"` and `rm .next/lock`. Subsequent build passed cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Pipeline intelligence features are live in the kanban board
- `daysInStage` field is now available in deal list responses for any future analytics work
- `sourceAssets` is now included in deal detail responses for any future closed-deal workflows
- Phase 13 Plan 02 can proceed (whatever the next deal desk CRM plan covers)

---
*Phase: 13-deal-desk-crm*
*Completed: 2026-03-09*
