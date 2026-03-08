---
phase: 05-qbo-xero-integration
plan: 03
subsystem: accounting
tags: [quickbooks, nav, trial-balance, gl-data, entity-tab, react, prisma]

# Dependency graph
requires:
  - phase: 05-01
    provides: QBO OAuth connection, AccountingConnection model
  - phase: 05-02
    provides: AccountMappingPanel, TrialBalanceView, trial balance API routes, account mapping API routes

provides:
  - GL-based NAV cost basis branch using real trial balance data
  - Entity detail page Accounting tab with full connection management
  - navSource/glDataAsOf/lastSyncAt/syncStatus fields on NAV API response
  - EntityAccountingTab component with connection, mapping, trial balance, NAV source indicator sections

affects:
  - NAV computation accuracy for entities with mapped QBO connections
  - Entity detail page (new Accounting tab)
  - Any consumer of /api/nav/[entityId] (new response fields)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GL branch in NAV: if (hasGLData) use trial balance buckets, else use proxy percentages"
    - "NAV response enriched with navSource/glDataAsOf/lastSyncAt/syncStatus for UI display"
    - "EntityAccountingTab uses SWR on /api/nav/[entityId] for live connection status (piggybacks existing call)"

key-files:
  created:
    - src/components/features/accounting/entity-accounting-tab.tsx
  modified:
    - src/app/api/nav/[entityId]/route.ts
    - src/app/(gp)/entities/[id]/page.tsx

key-decisions:
  - "GL cost basis uses bucket totals from trial balance: CASH + INVESTMENTS_AT_COST + OTHER_ASSETS as totalAssets, abs(LIABILITIES) as liabilities"
  - "EntityAccountingTab piggybacks /api/nav/[entityId] SWR call for live connection data — avoids separate connection endpoint"
  - "navProxyConfig variables (cashPercent, otherAssetsPercent, liabilitiesPercent) preserved in else branch — no regression for proxy entities"
  - "providerAccountId null-guarded in mapping loop — schema has providerAccountId as String? (nullable)"

requirements-completed:
  - ACCT-05

# Metrics
duration: 10min
completed: 2026-03-08
---

# Phase 5 Plan 03: GL-Based NAV Endpoint + Entity Accounting Tab Summary

**NAV endpoint switches to real QBO trial balance data for GL-connected entities; entity detail page gains full Accounting tab for connection management**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-08T03:23:55Z
- **Completed:** 2026-03-08T03:33:00Z
- **Tasks:** 2 of 2 complete (Task 2 human-verify: PASSED — all UI verified in Chrome on localhost)
- **Files modified:** 3

## Accomplishments
- NAV endpoint now has a two-layer cost basis selection: GL branch (real trial balance) vs proxy branch (5%/0.5%/2%)
- hasGLData gate: connection exists AND not DISCONNECTED AND chartOfAccountsMapped=true AND at least one trial balance snapshot
- NAV response enriched with navSource ("GL" or "PROXY"), glDataAsOf, lastSyncAt, syncStatus
- EntityAccountingTab: connection status card, sync controls, account mapping section (with AccountMappingPanel inline), trial balance section (TrialBalanceView), NAV source indicator
- Entity detail page has "Accounting" tab — last tab in baseTabs array

## Task Commits

Each task was committed atomically:

1. **Task 1: NAV endpoint GL branch + entity Accounting tab** - `ee0a830` (feat)

## Files Created/Modified
- `src/app/api/nav/[entityId]/route.ts` - GL branch added to Layer 1 cost basis computation; accountMappings + trialBalanceSnapshots now included in entity query
- `src/components/features/accounting/entity-accounting-tab.tsx` - New "use client" component: connection status, sync/disconnect, mapping panel, trial balance view, NAV source indicator
- `src/app/(gp)/entities/[id]/page.tsx` - Added EntityAccountingTab import, "accounting" tab to baseTabs, tab content block with accountingConnection passed as prop

## Decisions Made
- GL cost basis computes `totalAssets = CASH + INVESTMENTS_AT_COST + OTHER_ASSETS` and `liabilities = abs(LIABILITIES bucket)` — handles typical credit-balance liability sign convention
- EntityAccountingTab uses `/api/nav/${entityId}` SWR to get live accountingConnection data — the NAV endpoint already includes accountingConnection in its response, so no additional API calls needed
- Null guard on `mapping.providerAccountId` — Prisma schema has it as `String?` (nullable); without the guard TypeScript errors at `mappingMap[null]`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed null index on providerAccountId in mapping loop**
- **Found during:** Task 1 (Build verification)
- **Issue:** `AccountMapping.providerAccountId` is `String?` in schema (nullable). Using it directly as a Record key caused TypeScript error: "Type 'null' cannot be used as an index type"
- **Fix:** Added `if (mapping.providerAccountId)` null guard before inserting into mappingMap
- **Files modified:** src/app/api/nav/[entityId]/route.ts
- **Verification:** Build passes with zero type errors
- **Committed in:** ee0a830

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Required fix for TypeScript correctness. Logic equivalent — null providerAccountId mappings would have been silently skipped anyway.

## Issues Encountered
None beyond the TypeScript null guard.

## Next Phase Readiness
- Task 2 (checkpoint:human-verify) PASSED — verified in Chrome on localhost:3000
- Verified: Accounting page drill-in, entity Accounting tab, NAV GL source indicator, Settings Integrations tab
- All code changes complete and UI functioning correctly

---
*Phase: 05-qbo-xero-integration*
*Completed: 2026-03-08*
