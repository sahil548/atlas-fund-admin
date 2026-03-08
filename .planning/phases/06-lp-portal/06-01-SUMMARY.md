---
phase: 06-lp-portal
plan: 01
subsystem: api, database, ui
tags: [prisma, recharts, swr, next.js, lp-portal, metrics, time-series]

# Dependency graph
requires:
  - phase: 03-capital-activity
    provides: "Capital call and distribution line items, capital account ledger data"
  - phase: 04-asset-entity-polish
    provides: "IRR/TVPI/DPI/RVPI computation engines in metrics.ts and irr.ts"
provides:
  - MetricSnapshot model in Prisma schema with @@unique([investorId, entityId, periodDate])
  - Snapshot-on-compute: dashboard API fire-and-forget saves a MetricSnapshot on every GET
  - GET /api/lp/[investorId]/metrics-history endpoint with quarterly/monthly granularity
  - PerformanceCharts React component using Recharts LineChart and AreaChart
  - LP dashboard enhanced with time-series performance charts below commitments
  - LP capital account enhanced with quarterly period summaries table above the ledger
affects: [lp-portal, phase-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sentinel string '__AGGREGATE__' for non-relational grouping in @@unique constraints with nullable-intent fields"
    - "Fire-and-forget upsert pattern: .catch(err => console.error(...)) without await, never blocking API response"
    - "Recharts dual Y-axis pattern: yAxisId='multiple' for x-values, yAxisId='irr' for percentages on same chart"
    - "Client-side period grouping: Map<string, T> keyed by 'Q1 2026' / 'Jan 2026' for aggregate rollups"

key-files:
  created:
    - prisma/schema.prisma (MetricSnapshot model)
    - src/app/api/lp/[investorId]/metrics-history/route.ts
    - src/components/features/lp/performance-charts.tsx
  modified:
    - src/app/api/lp/[investorId]/dashboard/route.ts
    - src/app/(lp)/lp-dashboard/page.tsx
    - src/app/(lp)/lp-account/page.tsx

key-decisions:
  - "entityId in MetricSnapshot is a non-nullable String with '__AGGREGATE__' sentinel — avoids Prisma @@unique null uniqueness issue (each null treated as unique, defeating one-per-day intent)"
  - "MetricSnapshot has no FK relation to Entity — only Investor relation — to allow the sentinel value without FK violation"
  - "Recharts Tooltip formatter typed as (value: any, name: any) — Recharts v3 Formatter generic causes TS incompatibility with undefined union; eslint-disable-next-line suppresses lint warning"
  - "Period summaries computed client-side from existing ledger data — no new API needed, data already fetched via useSWR"

patterns-established:
  - "Fire-and-forget Prisma upsert: call without await, attach .catch() for error logging only"
  - "Recharts dual Y-axis: assign yAxisId to each Line/Area and matching YAxis components"

requirements-completed: [LP-01, LP-02]

# Metrics
duration: 25min
completed: 2026-03-07
---

# Phase 6 Plan 01: LP Dashboard Metrics + Time-Series Charts Summary

**MetricSnapshot model with snapshot-on-compute, Recharts IRR/TVPI/DPI/RVPI/NAV time-series charts on LP dashboard, and quarterly period summaries on capital account page**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-07T00:00:00Z
- **Completed:** 2026-03-07T00:25:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added MetricSnapshot Prisma model with @@unique([investorId, entityId, periodDate]) using a non-nullable string sentinel for aggregate snapshots
- Dashboard API now saves a MetricSnapshot fire-and-forget on every GET — historical data accumulates without blocking responses
- New metrics-history API endpoint groups snapshots by quarter or month and returns period-labeled time-series data
- PerformanceCharts component renders two Recharts panels: IRR/TVPI/DPI/RVPI LineChart with dual Y-axis + NAV AreaChart with gradient fill
- Quarterly/monthly toggle on charts fetches from metrics-history with appropriate granularity param
- Capital account page now shows quarterly period summaries table (contributions/distributions/fees/net change/ending balance) above the existing ledger
- Both features have informative empty states explaining how data accumulates over time

## Task Commits

Each task was committed atomically:

1. **Task 1: MetricSnapshot schema + snapshot-on-compute + metrics-history API** - `af78e66` (feat)
2. **Task 2: Time-series charts on LP dashboard + period summaries on capital account** - `33012fd` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `prisma/schema.prisma` - Added MetricSnapshot model + metricSnapshots relation on Investor
- `src/app/api/lp/[investorId]/dashboard/route.ts` - Added fire-and-forget snapshot save after metrics computation
- `src/app/api/lp/[investorId]/metrics-history/route.ts` - New GET endpoint: returns time-series snapshots grouped by quarter/month
- `src/components/features/lp/performance-charts.tsx` - New "use client" Recharts component: LineChart + AreaChart with toggle
- `src/app/(lp)/lp-dashboard/page.tsx` - Added PerformanceCharts import and render below commitments section
- `src/app/(lp)/lp-account/page.tsx` - Added Period Summary card above capital account, period summaries computed from ledger

## Decisions Made
- **Sentinel string for entityId:** Used `"__AGGREGATE__"` string instead of nullable entityId to make @@unique constraint work correctly. Prisma treats each NULL as unique, so nullable entityId would allow multiple aggregate snapshots per day. Non-nullable string with sentinel value enforces the one-per-day invariant.
- **No Entity FK on MetricSnapshot:** Removed the Entity @relation to avoid FK constraint violations when entityId = "__AGGREGATE__". Only Investor relation kept.
- **Recharts Tooltip typed as any:** Recharts v3's Formatter<T, N> generic requires exact value/name types, but Recharts internally passes undefined in some cases. Using `any` with eslint-disable comment is the correct pragmatic fix.
- **Client-side period summaries:** Quarterly summaries are computed from the already-fetched ledger data — no new API endpoint needed. The ledger data is grouped by quarter using getMonth().

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Recharts Tooltip TypeScript type error**
- **Found during:** Task 2 (performance-charts.tsx compilation)
- **Issue:** Recharts v3 `Formatter<number, string>` type requires exact `number` for value but TS infers `number | undefined` union, causing build failure
- **Fix:** Typed formatter parameters as `any` with eslint-disable-next-line comment — functionally correct, only suppresses overly strict generic check
- **Files modified:** `src/components/features/lp/performance-charts.tsx`
- **Verification:** `npm run build` passes with zero errors after fix
- **Committed in:** `33012fd` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Single TS type fix required by Recharts v3 strict generics. No scope creep.

## Issues Encountered
- Recharts v3 Tooltip formatter type signature stricter than v2 — `any` typing is the accepted workaround in Recharts ecosystem

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- MetricSnapshot data will accumulate over time as LPs visit their dashboard — charts will populate after multiple visits across different dates
- The metrics-history API is ready for any future per-entity breakdown (entityId param support)
- All existing LP functionality (stat cards, commitments list, ledger, recompute button) preserved unchanged
- Phase 6 Plan 02 can proceed (LP settings and notifications)

---
*Phase: 06-lp-portal*
*Completed: 2026-03-07*
