---
phase: 03-capital-activity
plan: 03
subsystem: api
tags: [prisma, metrics, irr, tvpi, nav, capital-accounts, dashboard]

# Dependency graph
requires:
  - phase: 03-capital-activity
    provides: capital call/distribution line item APIs, capital-activity-engine, navProxyConfig on Entity

provides:
  - Entity metrics API (TVPI, DPI, RVPI, MOIC, IRR from real cash flows)
  - Configurable NAV proxy values per entity (navProxyConfig JSON field)
  - NAV history snapshots (NAVComputation auto-upserted on every GET)
  - NAV history list API
  - Commitment PATCH with audit trail (Transaction record logged)
  - Capital account running ledger API (chronological entries + running balance)
  - GP dashboard cross-entity rollup (aggregateTVPI/DPI/RVPI/weightedIRR/totalNAV + entityMetrics table)
  - Entity detail page with real metrics display (6+4 metric cards, expandable capital calls/distributions with line item actions)
  - LP activity page capital account running ledger (entity summary + chronological ledger table)

affects:
  - All downstream dashboard views depend on real metrics
  - LP portal depends on running ledger format

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline NAV computation reused in entity metrics and dashboard stats routes"
    - "Cross-entity rollup: iterate entities, compute per-entity, aggregate"
    - "Real XIRR: funded capital call line items as outflows, PAID distribution line items as inflows, current NAV as terminal value"
    - "Capital account ledger: merge CONTRIBUTION/DISTRIBUTION/FEE entries, sort chronologically, compute running balance"

key-files:
  created:
    - src/app/api/entities/[id]/metrics/route.ts
    - src/app/api/nav/[entityId]/history/route.ts
    - src/app/api/commitments/[id]/route.ts
  modified:
    - src/app/api/nav/[entityId]/route.ts
    - src/app/api/investors/[id]/capital-account/route.ts
    - src/app/(gp)/entities/[id]/page.tsx
    - src/app/(gp)/dashboard/page.tsx
    - src/app/api/dashboard/stats/route.ts
    - src/app/(lp)/lp-activity/page.tsx

key-decisions:
  - "Entity-level MOIC computed as weighted average: sum(assetFairValue * allocationPct) / sum(assetCostBasis * allocationPct)"
  - "IRR uses xirr() with funded CapitalCallLineItem.paidDate as outflow dates (not CapitalCall.callDate)"
  - "NAV snapshot auto-saved on every GET /api/nav/[entityId] via fire-and-forget prisma.nAVComputation.upsert"
  - "Commitment audit trail: log Transaction(TRANSFER) with old->new amounts before updating Commitment.amount"
  - "Capital account ledger tracks contributions as negative (outflow from LP), distributions as positive"
  - "Dashboard fallback: if aggregatePaidIn=0 (no funded calls yet), uses asset-level IRR/TVPI as fallback"

patterns-established:
  - "Inline NAV computation: copy the same 15-line block into any route that needs NAV — avoids double round-trip to /api/nav"
  - "Fire-and-forget prisma upsert for snapshots: .catch() logs error without failing the main response"
  - "Cross-entity rollup pattern: for each active entity, compute metrics, push to array, aggregate at end"

requirements-completed: [FIN-01, FIN-03, FIN-04, FIN-05]

# Metrics
duration: 35min
completed: 2026-03-07
---

# Phase 3 Plan 03: Metrics Wiring Summary

**Real-time TVPI/DPI/RVPI/IRR/MOIC from actual funded capital calls and paid distributions — wired to entity detail pages, GP dashboard cross-entity rollup, and LP capital account running ledger**

## Performance

- **Duration:** 35 min
- **Started:** 2026-03-07T00:30:00Z
- **Completed:** 2026-03-07T01:05:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Five new/updated API routes providing real computation — entity metrics GET, NAV history GET, commitment PATCH with audit trail, updated NAV GET (configurable proxies + snapshot auto-save), capital account running ledger GET
- GP dashboard now shows per-entity metrics table (Entity | TVPI | DPI | RVPI | IRR | NAV) computed from real funded line items, plus aggregate cross-entity rollup for stat cards
- Entity detail page upgraded: 6+4 metric cards replacing the original 4 seeded cards; NAV tab adds editable proxy config and history table; Capital tab adds expandable rows with Fund/Approve/Mark Paid buttons

## Task Commits

1. **Task 1: Entity metrics API + NAV proxies + history + commitment audit trail + capital account ledger** — `e1d55ea` (feat)
2. **Task 2: Wire metrics to entity page + GP dashboard + LP capital account ledger UI** — `9786800` (feat)

## Files Created/Modified

- `src/app/api/entities/[id]/metrics/route.ts` — New GET: computes TVPI/DPI/RVPI/MOIC/IRR from funded capital call line items + PAID distribution line items + inline NAV
- `src/app/api/nav/[entityId]/route.ts` — Updated: reads navProxyConfig from entity instead of hardcoded 5%/0.5%/2%; auto-upserts NAVComputation snapshot; adds allocationPercent to per-asset breakdown
- `src/app/api/nav/[entityId]/history/route.ts` — New GET: returns all NAVComputation records for entity ordered by periodDate desc
- `src/app/api/commitments/[id]/route.ts` — New PATCH: logs old->new amount as Transaction(TRANSFER) audit record then updates Commitment.amount
- `src/app/api/investors/[id]/capital-account/route.ts` — Rewritten: chronological running ledger (CONTRIBUTION/DISTRIBUTION/FEE) with running balance + per-entity summary
- `src/app/api/dashboard/stats/route.ts` — Enhanced: computes per-entity metrics inline, cross-entity rollup (aggregateTVPI/DPI/RVPI/weightedIRR/totalNAV), adds entityMetrics array; preserves all existing response fields
- `src/app/(gp)/entities/[id]/page.tsx` — Overview: 6+4 metric cards from /metrics API; NAV tab: proxy config editor + history table; Capital tab: expandable rows with line items + Fund/Approve/Mark Paid buttons
- `src/app/(gp)/dashboard/page.tsx` — Total NAV stat card; Weighted IRR + TVPI from real data; entity metrics table below LP Commitments section
- `src/app/(lp)/lp-activity/page.tsx` — Capital Account section at top: per-entity summary cards + chronological ledger table with type badges and running balance

## Decisions Made

- Entity-level MOIC uses weighted average across asset allocations: `sum(fairValue * allocationPct) / sum(costBasis * allocationPct)` — consistent with "MOIC at entity level (weighted average)" user decision
- IRR outflows dated to `CapitalCallLineItem.paidDate` (not `CapitalCall.callDate`) — the actual money movement date for correct XIRR
- NAV snapshots auto-saved as fire-and-forget via `.catch()` — does not block the NAV response
- Dashboard falls back to asset-level IRR/TVPI if no funded calls exist yet (`aggregatePaidIn === 0`) — prevents N/A display on fresh entities
- Capital account ledger shows CONTRIBUTION as negative amount from LP's perspective (money going out) — cash flow convention matches IRR computation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Dashboard stats route already includes entities with full assetAllocations**

- **Found during:** Task 2 (dashboard stats enhancement)
- **Issue:** Plan said to "call the NAV computation logic inline" per entity — this required fetching assetAllocations and feeCalculations on the entity include in the dashboard query
- **Fix:** Extended the `entities` query in dashboard stats to include `assetAllocations { include: { asset { include: { valuations } } } }`, `capitalCalls { include: { lineItems } }`, `distributions { include: { lineItems } }`, and `feeCalculations` — allows full inline NAV computation without separate queries
- **Files modified:** src/app/api/dashboard/stats/route.ts
- **Verification:** Build passes; all types match
- **Committed in:** 9786800 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - Missing Critical)
**Impact on plan:** Necessary — without extended entity include, inline NAV computation would fail with undefined asset data. No scope creep.

## Issues Encountered

- Pre-existing TypeScript error in `src/lib/computations/__tests__/waterfall.test.ts` — out of scope, not touched

## Next Phase Readiness

- Phase 3 "last mile" complete — all computation engines now wired to real UI
- Entity detail pages show real TVPI/DPI/RVPI/IRR/MOIC from actual funded calls and paid distributions
- GP dashboard has cross-entity rollup with entity-level metrics table
- LP activity page has capital account running ledger
- NAV proxy configuration is editable per entity with automatic snapshot history
- Commitments are editable with full audit trail via Transaction records

## Self-Check: PASSED

All created/modified files confirmed present:
- `src/app/api/entities/[id]/metrics/route.ts` — EXISTS
- `src/app/api/nav/[entityId]/history/route.ts` — EXISTS
- `src/app/api/commitments/[id]/route.ts` — EXISTS
- `src/app/api/nav/[entityId]/route.ts` — EXISTS (updated)
- `src/app/api/investors/[id]/capital-account/route.ts` — EXISTS (updated)
- `src/app/(gp)/entities/[id]/page.tsx` — EXISTS (updated)
- `src/app/(gp)/dashboard/page.tsx` — EXISTS (updated)
- `src/app/api/dashboard/stats/route.ts` — EXISTS (updated)
- `src/app/(lp)/lp-activity/page.tsx` — EXISTS (updated)

Task commits:
- `e1d55ea` — EXISTS (Task 1: API routes)
- `9786800` — EXISTS (Task 2: UI wiring)

Build: PASSED (zero TypeScript errors)

---
*Phase: 03-capital-activity*
*Completed: 2026-03-07*
