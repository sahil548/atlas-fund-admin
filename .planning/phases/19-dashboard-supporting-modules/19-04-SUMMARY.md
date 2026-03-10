---
phase: 19-dashboard-supporting-modules
plan: 04
subsystem: api
tags: [activity-feed, swr, prisma, filtering, pagination, dashboard, tdd]

# Dependency graph
requires:
  - phase: 16-capital-activity
    provides: CapitalCall, DistributionEvent models
  - phase: 15-entity-management-meeting-intelligence
    provides: Meeting, AuditLog, Entity models
  - phase: 13-deal-desk-crm
    provides: DealActivity model
  - phase: 14-asset-management-task-management
    provides: Task, Document models
provides:
  - GET /api/activity unified feed aggregating 7 data sources with filtering + pagination
  - ActivityFeedSection component with chip toggles, entity dropdown, load-more
  - activity-feed-helpers.ts pure helpers (mergeAndSortActivities, filterByTypes, filterByEntity, paginateActivities)
affects: dashboard page integration, any page showing firm-wide activity

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED-GREEN: write failing tests first, then implement helpers, then API route"
    - "Pure helpers pattern: extract testable functions into lib/ separate from API route"
    - "Promise.all with .catch(() => []) for parallel fault-tolerant DB queries"
    - "Filter-at-DB + filter-at-app: DB filters entityId when possible; app-level filterByEntity handles complex joins (DealActivity)"
    - "SWR accumulator pattern: reset allItems on offset=0 (filter change), append on offset>0 (load-more)"

key-files:
  created:
    - src/lib/activity-feed-helpers.ts
    - src/app/api/activity/route.ts
    - src/components/features/dashboard/activity-feed-section.tsx
    - src/lib/__tests__/phase19-activity-feed.test.ts
  modified: []

key-decisions:
  - "Activity feed helpers extracted to src/lib/activity-feed-helpers.ts (not inlined in API route) to enable vitest node env testing without Prisma/Next.js deps"
  - "filterByTypes with empty Set returns all items (empty = show all); this maps to 'All' chip in UI"
  - "Entity filter applied at both DB query level (entityId in where) and app level (filterByEntity) to handle DealActivity which filters via deal.entities join"
  - "AuditLog filtered to STATUS_TRANSITION action only — avoids noise from bulk create/update events"
  - "SWR onSuccess callback handles both reset (offset=0) and append (offset>0) to accumulated allItems state"
  - "DealActivity links to /deals/[dealId] (not deal entity pages) — deal is the primary context"

patterns-established:
  - "Pure helper pattern: activity-feed-helpers.ts exports side-effect-free functions testable in vitest node env"
  - "7-source parallel query with fault tolerance: Promise.all + .catch(() => []) ensures one failing source never blocks others"

requirements-completed: [DASH-03]

# Metrics
duration: 8min
completed: 2026-03-10
---

# Phase 19 Plan 04: Activity Feed Summary

**Unified /api/activity endpoint aggregating 7 data sources (DealActivity, CapitalCall, DistributionEvent, Meeting, Task, Document, AuditLog) with entity/type filtering, plus full-width ActivityFeedSection component with chip toggles and load-more pagination**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-10T17:22:15Z
- **Completed:** 2026-03-10T17:30:50Z
- **Tasks:** 2 (TDD task = 3 commits: RED, GREEN, feat)
- **Files modified:** 4 created, 0 modified

## Accomplishments
- Created pure helper module (`activity-feed-helpers.ts`) with 4 testable functions: `mergeAndSortActivities`, `filterByTypes`, `filterByEntity`, `paginateActivities`
- Built GET /api/activity with 7-source parallel query, entity/type filtering, limit/offset pagination returning `{ items, total, hasMore }`
- Built ActivityFeedSection "use client" component with chip toggles (8 types), entity dropdown, load-more pagination, skeleton loading, empty state, and dark mode
- All 20 unit tests pass (TDD RED then GREEN)
- Build passes with zero type errors

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests** - `58516ff` (test)
2. **Task 1 (GREEN): activity-feed-helpers.ts + route.ts** - `6350a57` (feat)
3. **Task 2: ActivityFeedSection component** - `843a1c5` (feat)

**Plan metadata:** _(created next)_

_Note: TDD task had 2 commits: RED (failing tests) then GREEN (implementation)_

## Files Created/Modified
- `src/lib/activity-feed-helpers.ts` — Pure helpers: merge/sort, type filter, entity filter, paginate
- `src/app/api/activity/route.ts` — GET handler with 7-source Promise.all, fault tolerant, returns `{ items, total, hasMore }`
- `src/components/features/dashboard/activity-feed-section.tsx` — Full-width activity feed with chip toggles, entity dropdown, load-more
- `src/lib/__tests__/phase19-activity-feed.test.ts` — 20 unit tests for pure helper functions

## Decisions Made
- **Pure helpers in lib/**: `activity-feed-helpers.ts` is framework-agnostic so vitest node env can test it without mocking Next.js or Prisma
- **filterByTypes empty set = show all**: Consistent with "All" chip UX — clicking All clears the type filter, empty set means no filter applied
- **Dual-level entity filtering**: DB-level `entityId` filter applied where schema supports direct field; app-level `filterByEntity` applied after merge handles DealActivity (which filters via deal.entities relation, not direct entityId)
- **AuditLog STATUS_TRANSITION only**: Restricts AuditLog to status change events to avoid noise from routine create/update audit entries
- **SWR accumulator pattern**: `allItems` state resets on offset=0 (triggered by filter change), appends on offset>0 (load more) — prevents duplicate items

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Turbopack build cache corruption during first `npm run build` attempt — resolved by clearing `.next/` and re-running build. Second build completed successfully.
- Pre-existing `pipeline-summary/route.ts` build error (`dealValue` field doesn't exist in Deal model) was already fixed by a prior plan before this execution. Not a deviation from this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `/api/activity` endpoint ready to consume from any page
- `ActivityFeedSection` component ready to drop into the dashboard page
- All 7 data source types wired; filtering by entity and type fully functional
- Load-more pagination tested and working

## Self-Check: PASSED

- FOUND: src/lib/activity-feed-helpers.ts
- FOUND: src/app/api/activity/route.ts
- FOUND: src/components/features/dashboard/activity-feed-section.tsx
- FOUND: src/lib/__tests__/phase19-activity-feed.test.ts
- FOUND commit 58516ff (TDD RED: failing tests)
- FOUND commit 6350a57 (TDD GREEN: helpers + API route)
- FOUND commit 843a1c5 (feat: ActivityFeedSection component)

---
*Phase: 19-dashboard-supporting-modules*
*Completed: 2026-03-10*
