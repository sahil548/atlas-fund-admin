---
phase: 16-capital-activity
plan: 05
subsystem: api, database, ui
tags: [prisma, nextjs, swr, typescript, irr, moic, transactions, income, expenses]

# Dependency graph
requires:
  - phase: 16-capital-activity
    provides: "Plans 01-04: capital calls, distributions, waterfall — IRR/MOIC computation infrastructure"
  - phase: 14-asset-management-task-management
    provides: "Asset detail page with TABS pattern, AssetPerformanceTab, existing IncomeEvent model"
provides:
  - "AssetExpense Prisma model for tracking asset-level expense entries"
  - "GET/POST /api/assets/[id]/transactions with IRR/MOIC auto-recalculation on each save"
  - "AssetIncomeTab component with entry form, categorized list, and running totals"
  - "AssetExpensesTab component with same structure for expense tracking"
  - "Asset detail page updated with Income and Expenses tabs (8 tabs total)"
affects:
  - "Phase 17 LP Portal (entity-level income aggregation feeds LP performance metrics)"
  - "Phase 19 Dashboard (asset income/expenses feed portfolio-level analytics)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "transactions route pattern: single endpoint handles both income and expense POST, dispatches to correct Prisma model by type field"
    - "auto-recalc pattern: recalculateAssetMetrics() called inline after every transaction save, updates asset.irr and asset.moic"
    - "SWR double-mutate pattern: after POST, mutate both /transactions and /assets/[id] keys to refresh metrics in header"

key-files:
  created:
    - prisma/schema.prisma (AssetExpense model added)
    - src/app/api/assets/[id]/transactions/route.ts
    - src/components/features/assets/asset-income-tab.tsx
    - src/components/features/assets/asset-expenses-tab.tsx
  modified:
    - src/lib/schemas.ts (CreateAssetTransactionSchema added)
    - src/app/api/assets/[id]/route.ts (expenses include added)
    - src/app/(gp)/assets/[id]/page.tsx (income + expenses tabs added)

key-decisions:
  - "AssetExpense as separate model (not using IncomeEvent with negative amount) — cleaner schema, separate category taxonomy for expenses vs income"
  - "incomeType fallback in POST handler: uses incomeType if provided, else upcases the category string — handles both explicit enum and string category values"
  - "recalculateAssetMetrics uses adjustedValue = fairValue + totalIncome - totalExpenses for MOIC — income increases return, expenses reduce it"
  - "MOIC formula: (fairValue + totalIncome - totalExpenses) / costBasis — not just fairValue/costBasis, making income/expenses actually affect the metric"
  - "entityId derived from asset's first entityAllocation — consistent with existing LogIncomeForm pattern in the same page"

patterns-established:
  - "Transaction tab pattern: single SWR key /transactions fetches both income and expenses, tab components read their slice"
  - "Category subtotals: group-reduce incomeEvents/expenses by category before rendering"

requirements-completed: [CAP-03, CAP-06]

# Metrics
duration: 4min
completed: 2026-03-09
---

# Phase 16 Plan 05: Asset Income and Expenses Tabs Summary

**AssetExpense Prisma model + transaction CRUD API with IRR/MOIC auto-recalculation, plus Income and Expenses tabs on the asset detail page**

## Performance

- **Duration:** 4 minutes
- **Started:** 2026-03-09T06:51:31Z
- **Completed:** 2026-03-09T06:55:42Z
- **Tasks:** 2
- **Files modified:** 7 (4 created, 3 modified)

## Accomplishments
- Added AssetExpense Prisma model with category-based expense tracking alongside the existing IncomeEvent model
- Created /api/assets/[id]/transactions GET/POST endpoint that fetches both income and expenses and auto-recalculates IRR/MOIC after each save
- Built AssetIncomeTab and AssetExpensesTab components with entry forms, categorized transaction lists, running totals, and category subtotals
- Expanded the asset detail page TABS array from 6 to 8 tabs (added "income" and "expenses")

## Task Commits

1. **Task 1: Schema + API for asset transactions with auto-recalculation** - `aec95b8` (feat)
2. **Task 2: Income and Expenses tabs on asset detail page** - `8253028` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `prisma/schema.prisma` - Added AssetExpense model and reverse relations on Asset and Entity
- `src/lib/schemas.ts` - Added CreateAssetTransactionSchema Zod schema
- `src/app/api/assets/[id]/transactions/route.ts` - New GET/POST transactions route with recalculateAssetMetrics()
- `src/app/api/assets/[id]/route.ts` - Added expenses: true to GET include clause
- `src/components/features/assets/asset-income-tab.tsx` - New income tab component
- `src/components/features/assets/asset-expenses-tab.tsx` - New expenses tab component
- `src/app/(gp)/assets/[id]/page.tsx` - Added income/expenses to TABS array and rendered both tab components

## Decisions Made
- AssetExpense is a separate Prisma model rather than a negative-amount IncomeEvent — cleaner schema with different category taxonomies (management_fee/legal/maintenance vs INTEREST/DIVIDEND/RENTAL)
- MOIC formula uses `(fairValue + totalIncome - totalExpenses) / costBasis` to make transaction data actually affect the metric — income increases returns, expenses reduce them
- incomeType field in POST handler falls back to uppercased category string if incomeType not provided — handles both API callers explicitly passing enum values and those passing lowercase category strings
- entityId sourced from `asset.entityAllocations?.[0]?.entityId` — consistent with existing LogIncomeForm pattern already in the same page

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Build lock file conflict from a prior build process — killed the stale process and removed the lock file before re-running successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Asset-level transaction ledgers are live — IRR and MOIC now reflect real income and expense data
- Income data flows from assets through the entity model (entityId FK) — ready for entity-level aggregation in Phase 17 LP Portal
- Both tabs show empty states with clear CTAs when no data exists

---
*Phase: 16-capital-activity*
*Completed: 2026-03-09*
