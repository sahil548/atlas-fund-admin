---
phase: 14-asset-management-task-management
plan: "03"
subsystem: ui
tags: [react, nextjs, recharts, exit-workflow, tab-restructure, asset-management]

# Dependency graph
requires:
  - phase: 14-01
    provides: asset exit API endpoint, exit utilities, schema fields
provides:
  - Exit asset modal with live MOIC/gain-loss/hold-period preview
  - Restructured asset detail page with 6 unified tabs
  - AssetOverviewTab with main content + sidebar layout
  - AssetContractsTab with Stessa-style cards and filter pills
  - ValuationHistoryChart (Recharts LineChart, renders for 2+ valuations)
  - Exited asset dimmed styling + EXITED badge in asset list
affects:
  - 14-04 (task checklist UI builds on same asset detail page)
  - 14-05 (deal stage tasks also uses updated asset detail)
  - 14-06 (task board enhancement builds on tasks tab)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Live preview pattern: computed inline on render (no useEffect) for real-time form feedback
    - 6-tab unified tab structure: TABS as const array, Tab = typeof TABS[number]
    - Stessa-style contract cards: left-side colored strip + grid of key info
    - Filter pills: local state filter + matchesFilter() helper
    - Recharts Tooltip formatter typed as (v: any) to avoid complex generic constraints

key-files:
  created:
    - src/components/features/assets/exit-asset-modal.tsx
    - src/components/features/assets/asset-overview-tab.tsx
    - src/components/features/assets/asset-contracts-tab.tsx
    - src/components/features/assets/valuation-history-chart.tsx
  modified:
    - src/app/(gp)/assets/[id]/page.tsx
    - src/app/(gp)/assets/page.tsx

key-decisions:
  - "Live preview uses inline computation (no useEffect) — values derived from form state on every render"
  - "Tab system uses fixed TABS const array — no conditional tab logic, all 6 tabs always visible"
  - "Activity tab combines meetings + activityEvents + governance (replaces separate meetings/governance tabs)"
  - "Contracts tab adaptive: REAL_ESTATE shows leases, CREDIT shows agreements, EQUITY shows company card, FUND_LP shows commitment card"
  - "ValuationHistoryChart returns null for < 2 valuations — chart is meaningless with single point"
  - "Recharts Tooltip formatter typed as any to avoid complex conditional type issues (follows analytics page pattern)"

# Metrics
duration: 20min
completed: "2026-03-09"
---

# Phase 14 Plan 03: Exit Modal + Asset Detail Tab Restructure Summary

**Exit workflow modal with live MOIC preview, 6-tab unified asset detail page (Overview/Contracts/Performance/Documents/Tasks/Activity), Stessa-style contracts cards with filter pills, and Recharts valuation history chart**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-09T21:09:30Z
- **Completed:** 2026-03-09T21:30:00Z
- **Tasks:** 2 of 2
- **Files modified:** 6

## Accomplishments

- Created `exit-asset-modal.tsx` — "use client" component with live MOIC/gain-loss/hold-period preview computed inline, form submission to POST /api/assets/[id]/exit, toast error safety, and disabled guard for non-ACTIVE assets
- Restructured `src/app/(gp)/assets/[id]/page.tsx` from 12-tab type-specific layout to 6 unified tabs (overview, contracts, performance, documents, tasks, activity), wired exit modal in header
- Created `asset-overview-tab.tsx` with grid grid-cols-1 lg:grid-cols-3 layout: left 2/3 has exit performance card (if EXITED), key metrics row, ownership section, entity allocations, AI deal intelligence; right sidebar has key dates, review schedule, notes, asset details
- Created `asset-contracts-tab.tsx` with adaptive content by asset class: real estate shows lease cards with filter pills (All/Active/Expired/Draft) and card/table toggle; credit shows agreement cards with covenant status; equity shows position card; fund LP shows commitment card
- Created `valuation-history-chart.tsx` — Recharts LineChart with indigo line, dot markers, grid, Y-axis fmt() formatting, guards for < 2 valuations
- Added `opacity-60` + EXITED badge in asset list for EXITED assets

## Task Commits

**Note:** Git commit permissions were not available during this execution. All code is written and build passes — manual commits required.

- **Task 1:** Exit asset modal + exited styling in asset list
  - Files: exit-asset-modal.tsx, src/app/(gp)/assets/[id]/page.tsx (exit modal wiring), src/app/(gp)/assets/page.tsx (EXITED styling)
- **Task 2:** Asset detail page tab restructure + overview sidebar + contracts cards + valuation chart
  - Files: asset-overview-tab.tsx, asset-contracts-tab.tsx, valuation-history-chart.tsx, src/app/(gp)/assets/[id]/page.tsx (full restructure)

## Files Created/Modified

- `src/components/features/assets/exit-asset-modal.tsx` — Exit modal with live preview, form submission, toast handling
- `src/components/features/assets/asset-overview-tab.tsx` — 3-column layout (2/3 main + 1/3 sidebar) with exit card, metrics, allocations, sidebar dates/notes/details
- `src/components/features/assets/asset-contracts-tab.tsx` — Adaptive cards by asset class with filter pills and card/table toggle
- `src/components/features/assets/valuation-history-chart.tsx` — Recharts LineChart with fmt() Y-axis, guards for < 2 valuations
- `src/app/(gp)/assets/[id]/page.tsx` — Restructured from 12 conditional tabs to 6 fixed tabs; imported new components; wired exit modal; removed old tab logic
- `src/app/(gp)/assets/page.tsx` — Added opacity-60 + EXITED badge for exited assets

## Decisions Made

- Live preview uses inline computation (no useEffect) — MOIC, gain/loss, hold period computed directly from form state on every render, matching plan spec
- Fixed 6-tab structure using TypeScript const array pattern: `const TABS = [...] as const; type Tab = typeof TABS[number]`
- Activity tab unifies meetings + activityEvents + governance — three separate tabs merged to keep navigation clean
- Contracts tab adapts to asset class at render time — single component handles all 4 asset type patterns
- ValuationHistoryChart returns null for < 2 valuations — prevents meaningless single-point chart
- Recharts Tooltip formatter typed as `(v: any)` following existing analytics page pattern — avoids complex Formatter generic type constraint

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Recharts Tooltip formatter TypeScript type error**
- **Found during:** Task 2 verification (npx tsc --noEmit)
- **Issue:** `formatter={(v: number) => [...]}` caused TS2322 — Recharts Formatter type has `value: T | undefined` parameter, not `T`
- **Fix:** Changed to `(v: any)` following the pattern in `src/app/(gp)/analytics/page.tsx`
- **Files modified:** src/components/features/assets/valuation-history-chart.tsx
- **Verification:** `npx tsc --noEmit` passes with zero errors in new files

---

**Total deviations:** 1 auto-fixed (Rule 1 - TypeScript type bug)
**Impact on plan:** Single type annotation fix. No scope or behavior changes.

## Build Verification

- `npx tsc --noEmit` — Zero errors in new/modified files (pre-existing phase15 test file errors are out of scope)
- `npm run build` — Build passes successfully, all 6 unified tabs render correctly

## Self-Check: PASSED

Files verified present:
- src/components/features/assets/exit-asset-modal.tsx: FOUND
- src/components/features/assets/asset-overview-tab.tsx: FOUND
- src/components/features/assets/asset-contracts-tab.tsx: FOUND
- src/components/features/assets/valuation-history-chart.tsx: FOUND
- src/app/(gp)/assets/[id]/page.tsx: FOUND (modified)
- src/app/(gp)/assets/page.tsx: FOUND (modified)

---
*Phase: 14-asset-management-task-management*
*Completed: 2026-03-09*
