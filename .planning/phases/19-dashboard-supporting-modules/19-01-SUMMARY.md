---
phase: 19-dashboard-supporting-modules
plan: 01
subsystem: api
tags: [dashboard, pipeline, alerts, prisma, groupby, promise-all, vitest, tdd]

# Dependency graph
requires:
  - phase: 16-capital-activity
    provides: CapitalCall model with ISSUED status and dueDate
  - phase: 14-asset-management-task-management
    provides: Covenant model with BREACH status, Lease model with ACTIVE status
  - phase: 13-deal-desk-crm
    provides: Deal model with stage enum (SCREENING, DUE_DILIGENCE, IC_REVIEW, CLOSING, CLOSED, DEAD)
provides:
  - GET /api/dashboard/pipeline-summary — deals grouped by active stage (count per stage, 4 active stages always returned)
  - GET /api/dashboard/alerts — overdue capital calls + covenant breaches + expiring leases (90-day window)
  - groupPipelineStages() pure function in dashboard-pipeline-utils.ts
  - buildAlerts() pure function in dashboard-alerts-utils.ts
  - 13 unit tests covering both utilities
affects: [19-dashboard-ui, 19-03, 19-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure utility functions extracted from API routes for vitest-testable logic"
    - "Promise.all parallel Prisma queries for multi-model alert aggregation"
    - "searchParams firmId fallback: authUser?.firmId ?? url.searchParams.get('firmId')"
    - "Stage normalization: groupBy returns only present stages; fill missing with count=0/totalValue=0"

key-files:
  created:
    - src/app/api/dashboard/pipeline-summary/route.ts
    - src/app/api/dashboard/alerts/route.ts
    - src/lib/dashboard-pipeline-utils.ts
    - src/lib/dashboard-alerts-utils.ts
    - src/lib/__tests__/phase19-dashboard-apis.test.ts
  modified: []

key-decisions:
  - "Deal model has no numeric dealValue field (targetSize is String) — pipeline summary returns count only, totalValue=0; dashboard UI in Plans 03/05 should display count-based funnel"
  - "Covenant Prisma relation name is 'agreement' not 'creditAgreement' — plan spec used wrong field name; fixed to match schema"
  - "Alert sorting: sort by date descending with nulls last — covenant breaches have no date so they sort after dated alerts"
  - "buildAlerts() input type uses 'agreement' field name matching actual Prisma include shape"

patterns-established:
  - "Dashboard API pattern: getAuthUser() with searchParams firmId fallback for dev/testing"
  - "groupPipelineStages: always returns all 4 active stages even when DB has 0 deals — prevents UI from rendering missing stages"
  - "Alert severity: OVERDUE_CAPITAL_CALL=high, COVENANT_BREACH=high, LEASE_EXPIRY=medium"

requirements-completed: [DASH-01, DASH-02]

# Metrics
duration: 7min
completed: 2026-03-10
---

# Phase 19 Plan 01: Dashboard Supporting Modules Summary

**Pipeline summary and cross-module alerts APIs with pure utility functions backed by 13 vitest unit tests**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-10T17:21:51Z
- **Completed:** 2026-03-10T17:29:10Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created GET /api/dashboard/pipeline-summary — returns all 4 active deal stages (SCREENING through CLOSING) with counts; missing stages filled with 0
- Created GET /api/dashboard/alerts — parallel queries for overdue capital calls, covenant breaches, and 90-day expiring leases; returns unified alert array with severity and navigation links
- 13 unit tests pass covering stage ordering, missing stages, null value handling, alert grouping, severity, linkPath, and counts

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 tests + pipeline summary API** - `8edc00f` (feat)
2. **Task 2: Alerts API endpoint** - `6b906db` (feat)

**Plan metadata:** `2d965eb` (docs: complete plan)

_Note: TDD tasks — tests written first (RED), then implementation (GREEN), both committed in task commit_

## Files Created/Modified

- `src/app/api/dashboard/pipeline-summary/route.ts` - GET handler for deal pipeline groupBy; uses groupPipelineStages()
- `src/app/api/dashboard/alerts/route.ts` - GET handler for cross-module alerts via Promise.all
- `src/lib/dashboard-pipeline-utils.ts` - groupPipelineStages() pure function; maps Prisma groupBy output to ordered 4-stage array
- `src/lib/dashboard-alerts-utils.ts` - buildAlerts() pure function; transforms capital calls/covenants/leases into unified alert shape with severity, linkPath, counts
- `src/lib/__tests__/phase19-dashboard-apis.test.ts` - 13 unit tests for both utilities (vitest node env)

## Decisions Made

- Deal model has no numeric `dealValue` Float field (`targetSize` is a String). The pipeline summary groupBy uses `_count` only; `totalValue` is always 0. Dashboard UI plans (03/05) should render the funnel as count-based.
- Covenant Prisma relation is `agreement` (not `creditAgreement`) — the plan spec used the wrong field name. Fixed to match actual schema.
- Alert sort order: by date descending, nulls last — covenant breaches have no date so they sort after capital call and lease alerts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Covenant relation name from `creditAgreement` to `agreement`**
- **Found during:** Task 2 (Alerts API endpoint)
- **Issue:** Plan spec used `creditAgreement` as the Prisma relation name. Actual schema defines `agreement CreditAgreement @relation(...)` on the Covenant model.
- **Fix:** Changed all references in route.ts, dashboard-alerts-utils.ts, and test file from `creditAgreement` to `agreement`
- **Files modified:** src/app/api/dashboard/alerts/route.ts, src/lib/dashboard-alerts-utils.ts, src/lib/__tests__/phase19-dashboard-apis.test.ts
- **Verification:** TypeScript build passes; 13 tests pass
- **Committed in:** 6b906db (Task 2 commit)

**2. [Rule 1 - Bug] Removed non-existent `dealValue` field from pipeline groupBy `_sum`**
- **Found during:** Task 2 build verification
- **Issue:** Plan spec used `_sum: { dealValue: true }` but Deal model has no numeric `dealValue` column (`targetSize` is String type, not Float)
- **Fix:** Removed `_sum` from groupBy query; normalized output to include `_sum: { dealValue: null }` for shape compatibility; `totalValue` always returns 0
- **Files modified:** src/app/api/dashboard/pipeline-summary/route.ts
- **Verification:** TypeScript build passes with zero type errors
- **Committed in:** 6b906db (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 - bugs from schema mismatches in plan spec)
**Impact on plan:** Both fixes required for type correctness. Pipeline funnel shows counts only (no aggregate value) until a numeric value field is added to Deal model — functionally useful as-is.

## Issues Encountered

Build initially failed with lock file contention (`.next/lock`) from a previous interrupted build process. Resolved by removing `.next/` directory for a clean rebuild.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GET /api/dashboard/pipeline-summary ready for consumption by dashboard UI (Plans 03/05)
- GET /api/dashboard/alerts ready for consumption by morning briefing component
- Both endpoints handle empty data gracefully (no crashes, return empty arrays)
- Both support `?firmId=` query param for dev testing without auth
- Remaining concern: `totalValue` in pipeline summary is always 0 — dashboard UI should plan for count-only display or a future Deal schema addition of a numeric value field

---
*Phase: 19-dashboard-supporting-modules*
*Completed: 2026-03-10*
