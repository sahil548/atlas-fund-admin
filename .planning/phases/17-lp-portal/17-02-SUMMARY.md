---
phase: 17-lp-portal
plan: 02
subsystem: lp-portal
tags: [lp, capital-account, date-filtering, metrics, irr, tvpi, sparklines]
requires: []
provides: [LP-04-date-range-filter, LP-07-per-entity-metrics]
affects: [lp-dashboard, lp-portfolio, lp-account, capital-account-api, dashboard-api]
tech-stack:
  added: []
  patterns: [date-filtered-prisma-queries, period-scoped-metric-recalculation, per-entity-computation-loop, fire-and-forget-snapshot-save, recharts-sparklines]
key-files:
  created:
    - src/app/api/lp/__tests__/capital-account.test.ts
    - src/app/api/lp/__tests__/entity-metrics.test.ts
  modified:
    - src/app/api/investors/[id]/capital-account/route.ts
    - src/app/(lp)/lp-account/page.tsx
    - src/app/api/lp/[investorId]/dashboard/route.ts
    - src/app/(lp)/lp-dashboard/page.tsx
    - src/app/(lp)/lp-portfolio/page.tsx
decisions:
  - "Date filtering applies to capitalCallLineItems (paidDate), distributionLineItems (distributionDate), feeCalculations (periodDate) — all three Prisma queries scoped independently"
  - "periodMetrics only added to capital account response when date params are present — backward compatible"
  - "Period IRR uses contribution entries as negative outflows + ending balance as terminal value at endDate"
  - "Entity NAV sourced from latestByEntity map (latest CapitalAccount.endingBalance per entity) — consistent with aggregate NAV logic"
  - "entitySnapshotHistory groups MetricSnapshot rows by entityId, returns empty array (not absent) when no history yet"
  - "Portfolio page fetches dashboard API for entityMetrics — no new API endpoint needed"
  - "Sparkline shows TVPI trend from entitySnapshotHistory; renders null for < 2 data points"
metrics:
  duration: 9min
  completed: 2026-03-10
  tasks: 3
  files: 7
---

# Phase 17 Plan 02: Capital Account Date Filtering + Per-Entity Metrics Summary

LP-04 date range filtering on capital account with metric recalculation, and LP-07 per-entity IRR/TVPI/DPI/RVPI across dashboard and portfolio pages with sparklines.

## What Was Built

### LP-04: Capital Account Date Range Filtering

**API (`src/app/api/investors/[id]/capital-account/route.ts`):**
- Parses optional `startDate` and `endDate` query params from URL
- Applies date filters to all three Prisma queries: capital call line items (paidDate), distribution line items (distributionDate), fee calculations (periodDate)
- When date range active: computes `periodMetrics` object with scoped IRR, TVPI, DPI, RVPI using the filtered entries as cash flows
- Period IRR: contributions as negative flows + distributions as positive + ending balance at endDate as terminal value
- Backward compatible: no date params = identical response to before (no `periodMetrics` field)

**Frontend (`src/app/(lp)/lp-account/page.tsx`):**
- Date range state with `startDate`/`endDate` strings
- SWR key dynamically appends `?startDate=X&endDate=Y` when both params set
- Preset buttons row: Q1, Q2, Q3, Q4 (current year), FY (full year), YTD (Jan 1 to today), All Time (clears)
- Active preset auto-detected by comparing current dates against computed preset ranges
- "Showing: {date} to {date}" label with clear button when active
- Metrics section uses `data.periodMetrics` when date range active (shows "Period" label), falls back to dashboard aggregate

### LP-07: Per-Entity Performance Metrics

**Dashboard API (`src/app/api/lp/[investorId]/dashboard/route.ts`):**
- Per-entity computation loop over `investor.commitments`
- For each entity: fetches entity-scoped capitalCallLineItems and distributionLineItems
- Computes: entityCalled, entityDistributed, entityNAV (from latestByEntity map), entityMetricsCalc (TVPI/DPI/RVPI), entityIRR (XIRR on entity cash flows + NAV terminal)
- Fire-and-forget upsert of per-entity MetricSnapshot (entityId = real entity ID)
- Fetches MetricSnapshot history (excluding __AGGREGATE__), groups by entityId
- Response adds `entityMetrics[]` and `entitySnapshotHistory[]` alongside existing fields

**Dashboard page (`src/app/(lp)/lp-dashboard/page.tsx`):**
- Commitments section replaced with enhanced entity cards showing IRR + TVPI
- Each card wrapped in `<Link href="/lp-account?entityId={id}">` for clickable navigation
- IRR formatted as percentage, TVPI as multiple, both colored green when positive/above 1
- Fallback to simple list if entityMetrics not available

**Portfolio page (`src/app/(lp)/lp-portfolio/page.tsx`):**
- Fetches dashboard API alongside portfolio API for entityMetrics + entitySnapshotHistory
- "Fund Performance" section above "Portfolio Look-Through" with per-entity cards
- Each card shows: entity name, commitment/called, IRR, TVPI, DPI, RVPI, NAV in a grid
- Inline `Sparkline` component (Recharts `LineChart` + `Line` in `ResponsiveContainer 60x24`) shows TVPI trend
- Sparkline renders null for < 2 data points — graceful empty state
- All entity cards clickable — navigate to `/lp-account?entityId={id}`
- Dark mode classes on new sections

### Wave 0 Tests
All 9 tests pass across both test files:
- `capital-account.test.ts`: 5/5 — backward compat, date filter, period metrics, Q1 preset, empty range
- `entity-metrics.test.ts`: 4/4 — computeMetrics unit, xirr unit, dashboard API entityMetrics shape, entitySnapshotHistory grouping

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All 7 implementation files exist. All 3 task commits verified (b204ae2, feaf9f5, 44da546). Build passes with zero errors. 9/9 tests pass.
