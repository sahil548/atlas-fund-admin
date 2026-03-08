---
phase: 09-financial-wiring-polish
plan: 02
subsystem: entity-detail, financial-computations, deal-components
tags: [plaid, bank-accounts, typescript, eslint, waterfall-tests, tech-debt]
dependency_graph:
  requires: []
  provides: [plaid-entity-balance-card, typed-deal-interfaces, waterfall-test-fix]
  affects: [entity-detail-page, deal-dd-tab, deal-overview-tab, waterfall-tests]
tech_stack:
  added: []
  patterns: [swr-conditional-fetch, typed-api-response-interfaces, pragmatic-any-suppression]
key_files:
  created: []
  modified:
    - src/app/(gp)/entities/[id]/page.tsx
    - src/lib/computations/__tests__/waterfall.test.ts
    - src/components/features/deals/deal-dd-tab.tsx
    - src/components/features/deals/deal-overview-tab.tsx
decisions:
  - "Blanket eslint-disable retained in deal-dd-tab and deal-overview-tab because >5 any usages remain for API response JSON shapes (workstreams, tasks, memo sections); plan rule: keep blanket if >5 new lint errors would result"
  - "performance-charts.tsx Recharts Tooltip any disables left as-is — already documented as expected in STATE.md decisions (Recharts v3 Formatter<T,N> generic incompatibility)"
  - "DealForDDTab and DealForOverviewTab interfaces use assetClass as required string (not nullable) to satisfy TypeScript Record<string, X> index key requirements"
metrics:
  duration: 15min
  completed: 2026-03-08T07:55:50Z
  tasks_completed: 2
  files_modified: 4
---

# Phase 9 Plan 02: Tech Debt Cleanup — Plaid Card, Waterfall Test Fix, Type Improvements Summary

Tech debt cleanup pass: Plaid bank balance card on entity detail page, waterfall test TypeScript fix, and typed deal prop interfaces replacing blanket `any` in two deal tab components.

## Tasks Completed

### Task 1: Plaid balance card + waterfall test fix

**Plaid Bank Accounts card on entity detail page:**
- Added `useSWR` fetch for `/api/integrations/plaid/accounts?entityId=${id}` in entity detail page
- Card renders in the Overview tab after Asset Allocations, only when `plaidData?.connected === true`
- Card hidden completely when no Plaid connection — no visual change for entities without Plaid
- Displays account name, official name (if different), type/subtype, current balance, available balance per account
- Uses `fmt()` for balance formatting; green "Connected" badge in header
- Follows existing card styling pattern (`bg-white rounded-xl border border-gray-200`)

**Waterfall test TypeScript fix:**
- Added `beforeEach` to the existing vitest import on line 1 of `waterfall.test.ts`
- `beforeEach` was used at line 48 but not imported — TypeScript error `Cannot find name 'beforeEach'`
- All 13 waterfall tests continue to pass

**Commit:** `156b669`

### Task 2: eslint-disable any-type cleanup

**deal-dd-tab.tsx:**
- Added `DealForDDTab` interface typing the `deal` prop with all 6 accessed properties (id, stage, workstreams array with full shape, dealLead, screeningResult)
- Blanket `/* eslint-disable */` retained with explanatory comment — 20+ remaining `any` usages in workstream/task JSON response shapes (exceeds 5-error threshold in plan rule)

**deal-overview-tab.tsx:**
- Added `DealForOverviewTab` interface typing all 15 accessed deal properties
- `assetClass` typed as required `string` (not `string | null`) to satisfy `Record<string, X>` index key requirements
- `screeningResult.memo` typed as `Record<string, any>` to allow rendering dynamic JSON fields as ReactNode
- Blanket `/* eslint-disable */` retained with explanatory comment — 8+ remaining `any` usages in memo/previousVersions JSON shapes

**performance-charts.tsx:**
- Left untouched — 2 inline `// eslint-disable-next-line` on Recharts Tooltip formatter are already correctly scoped (expected per STATE.md decision 2026-03-07 06-01)

**Commit:** `705f96f`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Multiple TypeScript errors from interface typing**
- **Found during:** Task 2
- **Issue:** Typed interface for `DealForOverviewTab` introduced 3 cascading TS errors: `assetClass` as nullable failed as Record index, `InlineEditField.value` prop type mismatch (`undefined` vs `string | null`), and `screeningResult.memo` as `Record<string, unknown>` blocked ReactNode rendering
- **Fix:** Made `assetClass` a required `string` (always present on deals), made text fields `string | null` (required, not optional), typed memo as `Record<string, any>`
- **Files modified:** `src/components/features/deals/deal-overview-tab.tsx`
- **Commit:** `705f96f`

## Verification Results

- `npx tsc --noEmit 2>&1 | grep waterfall` — zero hits (0 TypeScript errors on waterfall file)
- `npx vitest run src/lib/computations/__tests__/waterfall.test.ts` — 13/13 tests pass
- `npm run build` — zero errors, all pages compiled
- Entity detail page includes Plaid SWR fetch wired to `/api/integrations/plaid/accounts?entityId={id}`
- `grep -c "eslint-disable @typescript-eslint/no-explicit-any" deal-dd-tab.tsx deal-overview-tab.tsx` — 1 each (blanket retained per >5 threshold rule, with explanatory comments added)

## Self-Check: PASSED

Files exist:
- `src/app/(gp)/entities/[id]/page.tsx` — FOUND (contains `plaid` fetch and card)
- `src/lib/computations/__tests__/waterfall.test.ts` — FOUND (contains `beforeEach` in import)
- `src/components/features/deals/deal-dd-tab.tsx` — FOUND (contains `DealForDDTab` interface)
- `src/components/features/deals/deal-overview-tab.tsx` — FOUND (contains `DealForOverviewTab` interface)

Commits exist:
- `156b669` — feat(09-02): add Plaid balance card + fix waterfall test
- `705f96f` — refactor(09-02): clean up eslint-disable any-type workarounds
