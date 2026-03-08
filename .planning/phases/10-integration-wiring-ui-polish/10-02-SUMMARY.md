---
phase: 10-integration-wiring-ui-polish
plan: "02"
subsystem: entity-detail-ui
tags: [fees, attribution, entity-detail, overview-tab, wiring]
dependency_graph:
  requires:
    - src/app/api/fees/calculate/route.ts
    - src/app/api/entities/[id]/attribution/route.ts
  provides:
    - Entity detail Overview tab fee calculation UI
    - Entity detail Overview tab performance attribution table
  affects:
    - src/app/(gp)/entities/[id]/page.tsx
tech_stack:
  added: []
  patterns:
    - useSWR for attribution data fetch
    - fetch + useState for fee calculation mutation
    - Conditional rendering with attributionData guard
key_files:
  created: []
  modified:
    - src/app/(gp)/entities/[id]/page.tsx
decisions:
  - "Fee calculation uses fire-and-shoot POST with local useState — no SWR mutation needed since result is transient display only"
  - "Attribution table guards on attributionData truthy (not isLoading) — attribution is supplemental, not blocking page load"
  - "feeResult state cleared on each new calculation attempt to avoid showing stale data"
metrics:
  duration: 2min
  completed_date: "2026-03-08"
  tasks_completed: 2
  files_modified: 1
requirements_fulfilled:
  - FIN-07
  - FIN-10
---

# Phase 10 Plan 02: Fee Calculation UI and Performance Attribution Wiring Summary

**One-liner:** Wired POST /api/fees/calculate and GET /api/entities/[id]/attribution into the entity detail Overview tab with a Calculate Fees button showing managementFee/carriedInterest results and a ranked attribution table.

## What Was Built

Two new UI sections added to the entity detail Overview tab (`src/app/(gp)/entities/[id]/page.tsx`), both appended after the existing Plaid bank accounts card:

### 1. Fee Calculation Card
- "Calculate Fees" button that POSTs to `/api/fees/calculate` with the current entityId, today's date as periodDate, fundExpenses=0, and periodFraction=0.25 (quarterly)
- Button shows "Calculating..." and is disabled during the async request
- On success: displays a 3-column grid of Management Fee, Carried Interest, and Period date formatted with `fmt()`
- On error: toast with the API error message (type-checked before passing to avoid React crash)
- Result cleared on each new calculation to prevent stale display

### 2. Performance Attribution Table
- Fetches from `/api/entities/${id}/attribution` via useSWR — loads automatically alongside the page
- Conditionally renders only when `attributionData` is truthy (non-blocking)
- Header shows entity-level Fund IRR and TVPI metrics when available
- Table columns: Rank, Asset, IRR, MOIC, Contribution %, vs Projected (IRR delta with green/red coloring)
- Empty state shown when `rankedByContribution` array is empty
- All numeric formatting inline (toFixed) — no utility import needed for percentages at this precision

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add SWR attribution fetch and fee calculation state | 5b2f85a | src/app/(gp)/entities/[id]/page.tsx |
| 2 | Render fee calculation button and attribution table in Overview tab | bd0a1ca | src/app/(gp)/entities/[id]/page.tsx |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `npx tsc --noEmit` after Task 1: zero errors
- `npx next build` after Task 2: zero errors, build succeeded
- Grep verification confirmed all required patterns present:
  - `useSWR(id ? /api/entities/${id}/attribution` at line 45
  - `handleCalculateFees` defined at line 207
  - POST to `/api/fees/calculate` at line 211
  - `attributionData.rankedByContribution` rendered at line 574

## Self-Check: PASSED

Files exist:
- FOUND: src/app/(gp)/entities/[id]/page.tsx

Commits exist:
- 5b2f85a: feat(10-02): add attribution SWR fetch and fee calculation state to entity detail page
- bd0a1ca: feat(10-02): render fee calculation button and attribution table in entity detail Overview tab
