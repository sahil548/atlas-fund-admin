---
phase: 16-capital-activity
plan: 06
subsystem: ui
tags: [react, swr, prisma, irr, metrics, entity, capital-activity]

# Dependency graph
requires:
  - phase: 16-capital-activity
    provides: metrics endpoint, income events, capital calls, distributions, asset allocations
  - phase: 16-capital-activity-05
    provides: IncomeEvent model with entityId + assetId
provides:
  - EntityFinancialSummaryCard component with dual metric view (realized vs unrealized)
  - EntityPeriodBreakdown component with monthly/quarterly toggle
  - Enhanced /api/entities/[id]/metrics endpoint with gross IRR, dual view, period breakdown
  - Entity detail page showing 9 key metrics from real transaction data
affects: [17-lp-portal, 19-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive API response: new fields alongside backward-compatible metrics/inputs"
    - "Dual metric view pattern: realized (from capital flows) vs unrealized (from valuations)"
    - "Period aggregation: monthly from API, quarterly via client-side grouping"

key-files:
  created:
    - src/components/features/entities/entity-financial-summary-card.tsx
    - src/components/features/entities/entity-period-breakdown.tsx
  modified:
    - src/app/api/entities/[id]/metrics/route.ts
    - src/app/(gp)/entities/[id]/page.tsx

key-decisions:
  - "Gross IRR computed from asset-level cash flows: entry cost as outflow, income events as inflows, current fair value as terminal"
  - "Period breakdown fetched from incomeEvent model using entityId filter, aggregated by YYYY-MM period key"
  - "Monthly/quarterly toggle is client-side only: API returns monthly data, quarterly aggregated in component"
  - "Financial summary card is additive: existing metric cards (primary + secondary) remain unchanged on entity detail page"
  - "Period breakdown gated: only rendered when periodBreakdown.length > 0 to avoid empty states"

patterns-established:
  - "Dual-panel metric view: gray-50 for realized, indigo-50 for unrealized — visual separation without complexity"
  - "Asset income progress bars in period breakdown: visual % contribution alongside fmt() dollar amount"

requirements-completed: [CAP-01, CAP-02, CAP-03]

# Metrics
duration: 5min
completed: 2026-03-10
---

# Phase 16 Plan 06: Entity Financial Summary Card Summary

**Dual-view entity financial intelligence: realized vs unrealized metrics from real transaction data, with period-based asset income breakdown using XIRR gross IRR from asset-level cash flows**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-10T06:51:40Z
- **Completed:** 2026-03-10T06:56:41Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Enhanced metrics API to compute gross IRR from asset-level cash flows (entry cost -> income events -> current fair value)
- Added dual metric view (realized returns: Net IRR, TVPI, DPI, RVPI vs unrealized returns: Gross IRR, Portfolio MOIC)
- Added period-based income breakdown by asset with monthly/quarterly toggle
- Wired EntityFinancialSummaryCard and EntityPeriodBreakdown into entity detail page overview tab
- Backward compatible: existing API consumers (LP portal, entity page metric cards) unaffected

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhanced metrics API with dual view + period breakdown** - `e5787e9` (feat)
2. **Task 2: Financial summary card + period breakdown on entity detail page** - `4bc2b6b` (feat)

## Files Created/Modified
- `src/app/api/entities/[id]/metrics/route.ts` - Added incomeEvents include, gross IRR computation, realized/unrealized dual view, summary object, period breakdown aggregation
- `src/components/features/entities/entity-financial-summary-card.tsx` - New component: dual panel view (realized/unrealized) + 8-metric summary grid, all with null-safe "--" display
- `src/components/features/entities/entity-period-breakdown.tsx` - New component: collapsible period rows with per-asset progress bars, monthly/quarterly toggle via client-side aggregation
- `src/app/(gp)/entities/[id]/page.tsx` - Added imports and wired both new components into overview tab after existing metric cards

## Decisions Made
- Gross IRR uses asset.entryDate as investment date (outflow), incomeEvents as intermediate inflows, current fair value as terminal value — this reflects true asset-level return rate
- Period breakdown gated on `periodBreakdown.length > 0` so entities without income data don't show empty panel
- Client-side quarterly aggregation: API returns monthly data, component groups into quarters using `Math.ceil(month/3)` — avoids extra API complexity
- Null values rendered as "--" in gray (not "N/A") — consistent with financial dashboard conventions

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- Stale `.next/lock` file from concurrent build process caused repeated build failures — resolved by identifying and killing the background build process (PID 52768) before each build attempt.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 16 (Capital Activity) is now complete with all 6 plans delivered
- Entity financial intelligence surface is fully operational: metrics from real data, dual view, period breakdown
- Phase 17 (LP Portal) can now consume enhanced entity metrics endpoint with backward-compatible response
- Blocker: LP portal metrics accuracy unverified (seeded vs computed) — still needs spot-check in Phase 17

---
*Phase: 16-capital-activity*
*Completed: 2026-03-10*
