---
phase: 14-asset-management-task-management
plan: "02"
subsystem: ui, api
tags: [swr, prisma, react, nextjs, tailwind, covenant, lease, monitoring]

# Dependency graph
requires:
  - phase: 14-01
    provides: Asset page foundation and task-sort-utils (parallel wave)
provides:
  - Client-side column sorting for all asset list columns
  - GET /api/assets/monitoring endpoint aggregating covenant breaches, lease expirations, loan maturities, overdue reviews
  - AssetMonitoringPanel collapsible alert panel at top of assets page
  - LeaseExpiryView table + timeline toggle component with 90/180 day color coding
affects:
  - 14-03 (asset detail tabs may reference monitoring)
  - 19-dashboard (dashboard may pull monitoring alerts)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Monitoring panel returns null when totalAlerts === 0 (disappear entirely, no empty state)"
    - "SWR fetch inside panel component — panel is self-contained, accepts no props"
    - "Client-side sort: sortedAssets computed array from allAssets state with null-safe comparison"
    - "Sort direction toggles on same key, resets to asc on new key"
    - "LeaseExpiryView: table/timeline toggle with CSS bar chart using inline style width%"
    - "Alert rows use border-l-4 severity color pattern (red/amber/blue)"

key-files:
  created:
    - src/app/api/assets/monitoring/route.ts
    - src/components/features/assets/lease-expiry-view.tsx
  modified:
    - src/app/(gp)/assets/page.tsx
    - src/components/features/assets/asset-monitoring-panel.tsx

key-decisions:
  - "Covenant breach uses status=BREACH (not BREACHED) — matching actual CovenantStatus enum"
  - "Monitoring panel default collapsed — badge count visible in header without expansion"
  - "Lease expiry 'View detail' toggle reveals LeaseExpiryView inside panel (not a separate page)"
  - "Client-side sort is fully in-memory: no API parameter changes to data fetching"
  - "Sort unrealized (computed field fairValue - costBasis) via special _unrealized key"
  - "Entities column is non-sortable (multi-value join field)"

patterns-established:
  - "Monitoring panel pattern: self-fetching component, renders null on zero alerts"
  - "SortHeader inline sub-component in page for clean th rendering"

requirements-completed:
  - ASSET-06
  - ASSET-07
  - ASSET-08

# Metrics
duration: 8min
completed: 2026-03-09
---

# Phase 14 Plan 02: Asset Monitoring Panel & Column Sorting Summary

**Sortable asset table with 11 clickable column headers plus collapsible monitoring panel aggregating covenant breaches, lease expirations, loan maturities, and overdue reviews with a table/timeline lease expiry view.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-09T20:31:28Z
- **Completed:** 2026-03-09T20:39:28Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- All 11 asset table column headers (name, assetClass, capitalInstrument, participationStructure, sector, costBasis, fairValue, unrealized, moic, irr, status) are now clickable with sort direction indicator
- GET /api/assets/monitoring aggregates 4 alert categories in parallel using Promise.all with proper 4-join firmId filtering chain
- AssetMonitoringPanel self-fetches data via SWR, collapses by default, disappears entirely when no alerts exist
- LeaseExpiryView shows lease data in table or horizontal bar timeline, with 90/180-day red/yellow/green color coding

## Task Commits

Each task was committed atomically:

1. **Task 1: Asset list client-side column sorting** - `551f218` (feat)
2. **Task 2: Monitoring panel API + collapsible panel UI + lease expiry view** - `737a6f1` (feat)

**Plan metadata:** (final docs commit)

## Files Created/Modified
- `src/app/(gp)/assets/page.tsx` - Added sortKey/sortDir state, handleSort(), sortedAssets, SortHeader sub-component, clickable column headers, AssetMonitoringPanel import above table
- `src/app/api/assets/monitoring/route.ts` - GET endpoint with firmId validation, parallel Prisma queries, 180-day window for leases/maturities
- `src/components/features/assets/asset-monitoring-panel.tsx` - Replaces stub; SWR-fetching collapsible panel with severity-coded alert rows and lease detail toggle
- `src/components/features/assets/lease-expiry-view.tsx` - New component; table + CSS timeline toggle with 90/180d color coding

## Decisions Made
- Covenant breach status is `BREACH` (not `BREACHED`) — matched actual `CovenantStatus` enum from schema
- Panel is default-collapsed so it doesn't clutter the page for GPs who have no alerts
- Sorting computed `unrealized` field uses special `_unrealized` key handled inline (no schema/API change)
- Entities column left non-sortable (multi-value array, not a simple scalar)

## Deviations from Plan

None - plan executed exactly as written. The plan referenced "BREACHED" as a possible covenant status but the actual enum uses "BREACH" — this was self-corrected via schema inspection, not a rule deviation.

## Issues Encountered
None - build passed on first attempt with zero type errors.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Monitoring panel is live on /assets page — GPs will see alerts when covenant breaches, expiring leases, approaching maturities, or overdue reviews exist
- LeaseExpiryView is reusable by other asset detail tabs if needed
- Ready for Phase 14 Plan 03 (asset detail tabs / performance tab)

---
*Phase: 14-asset-management-task-management*
*Completed: 2026-03-09*
