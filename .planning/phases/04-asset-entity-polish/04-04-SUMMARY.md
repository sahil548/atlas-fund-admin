---
phase: 04-asset-entity-polish
plan: 04
subsystem: dashboard, api, ui
tags: [dashboard, entity-cards, portfolio, lp-comparison, nav, irr, tvpi, swr, recharts]

# Dependency graph
requires:
  - phase: 04-asset-entity-polish
    plan: 01
    provides: side-letter engine (referenced in plan context)
  - phase: 03-capital-activity
    provides: entity metrics API, NAV computation, capital call/distribution line items, computeMetrics, xirr

provides:
  - /api/dashboard/entity-cards: per-entity NAV breakdown, IRR, TVPI, capital deployment, perAssetBreakdown
  - /api/dashboard/portfolio-aggregates: asset allocation, top/bottom performers, capital deployment tracker, recent activity
  - /api/dashboard/lp-comparison: all LPs with per-entity TVPI/DPI/RVPI/IRR and aggregate metrics
  - EntityCard component with expand/collapse NAV detail and per-asset table
  - PortfolioAggregates: 2x2 grid of TopBottomPerformers, CapitalDeploymentTracker, RecentActivityFeed, AssetAllocationChart
  - LPComparisonView: sortable table of investors with per-entity and aggregate metrics
  - Redesigned dashboard: "morning briefing" layout with entity cards top, portfolio overview bottom

affects: [05-lp-portal, reporting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Entity card expand/collapse via CSS max-height transition — no extra dependencies"
    - "Portfolio aggregates fetched from single endpoint, components receive props (not individual SWR calls)"
    - "LP comparison table: Fragment key pattern for multi-column per-entity rows"
    - "Stacked deployment bars: pure Tailwind absolute positioning — no Recharts needed"
    - "NAV proxy reused inline from stats endpoint pattern — same cashPct/otherPct/liabPct config"

key-files:
  created:
    - src/app/api/dashboard/entity-cards/route.ts
    - src/app/api/dashboard/portfolio-aggregates/route.ts
    - src/app/api/dashboard/lp-comparison/route.ts
    - src/components/features/dashboard/entity-card.tsx
    - src/components/features/dashboard/portfolio-aggregates.tsx
    - src/components/features/dashboard/top-bottom-performers.tsx
    - src/components/features/dashboard/capital-deployment-tracker.tsx
    - src/components/features/dashboard/recent-activity-feed.tsx
    - src/components/features/dashboard/lp-comparison-view.tsx
  modified:
    - src/app/(gp)/dashboard/page.tsx
    - src/app/api/assets/[id]/route.ts
    - src/app/api/assets/[id]/attribution/route.ts

key-decisions:
  - "Dashboard redesigned as two sections: entity cards (top, fetch from /entity-cards) + portfolio overview (bottom, fetch from /portfolio-aggregates) — clean separation of concerns"
  - "LPComparisonView is collapsible and placed below portfolio section — keeps dashboard uncluttered while LP data remains accessible"
  - "Entity card expand/collapse uses CSS max-height transition — zero dependencies, smooth animation"
  - "PortfolioAggregates component fetches from /portfolio-aggregates and distributes data as props to child components — single SWR call for entire bottom section"
  - "Top/bottom performers: assets with no IRR data are excluded from performer lists — N/A values are meaningless for ranking"

patterns-established:
  - "SectionErrorBoundary wraps each major dashboard section — section failure never takes down full page"
  - "Entity cards show first 6 by default with Show all toggle — prevents cognitive overload at ~9 entities"

requirements-completed: [FIN-08, FIN-09, ASSET-02]

# Metrics
duration: 50min
completed: 2026-03-08
---

# Phase 04 Plan 04: GP Dashboard Redesign Summary

**Redesigned GP dashboard as "morning briefing" with entity cards (NAV, IRR, TVPI, capital deployment with expandable per-asset NAV breakdown) at top and 2x2 portfolio overview (allocation, performers, deployment tracker, activity) at bottom, plus collapsible LP comparison table**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-03-08T00:00:00Z
- **Completed:** 2026-03-08T00:50:34Z
- **Tasks:** 2
- **Files modified:** 13 (11 created, 2 updated from this plan; 2 pre-existing bug fixes)

## Accomplishments

- Three new API endpoints created for specialized dashboard data: entity cards with full NAV breakdown, portfolio aggregates (allocation + performers + deployment + activity), and LP comparison with per-entity metrics
- Dashboard page fully redesigned from flat stat cards to "morning briefing" layout: entity cards in a responsive grid at top, 2x2 portfolio overview at bottom
- EntityCard component: compact view with NAV, IRR, TVPI, deployment progress bar; click to expand reveals NAV cost basis vs fair value breakdown and per-asset contribution table
- TopBottomPerformers: split panel showing top/bottom 5 assets by IRR with MOIC and entity context
- CapitalDeploymentTracker: stacked Tailwind bars per entity showing committed vs called vs deployed, with aggregate dry powder summary
- RecentActivityFeed: timeline of last 10 firm-wide actions (deal activity + capital calls + distributions merged and sorted)
- LPComparisonView: sortable table with per-entity TVPI + IRR columns and aggregate column, collapsible below portfolio section
- SectionErrorBoundary wraps each major section — no single failure takes down the full dashboard

## Task Commits

Each task was committed atomically:

1. **Task 1: Entity cards + Portfolio aggregates + LP comparison API endpoints** - pending commit (git blocked by project policy)
2. **Task 2: Dashboard redesign + all UI components** - pending commit (git blocked by project policy)

> Note: Git commits require explicit user approval per CLAUDE.md ("Only commit when I say 'commit', 'ship it', 'push it'"). All code is written and build passes — awaiting user commit approval.

## Files Created/Modified

**API endpoints (new):**
- `src/app/api/dashboard/entity-cards/route.ts` — Per-entity NAV (costBasis/fairValue/unrealizedGain/total), IRR, TVPI/DPI/RVPI, capitalDeployed, dryPowder, deploymentPct, assetCount, topAssets, perAssetBreakdown
- `src/app/api/dashboard/portfolio-aggregates/route.ts` — Asset allocation, top/bottom performers by IRR, capital deployment per entity + aggregate, recent activity (deal activity + capital calls + distributions merged)
- `src/app/api/dashboard/lp-comparison/route.ts` — All investors with per-entity committed/called/distributed/TVPI/DPI/RVPI/IRR and aggregate metrics, sorted by totalCommitted desc

**UI components (new):**
- `src/components/features/dashboard/entity-card.tsx` — Compact entity card with CSS max-height expand/collapse NAV detail
- `src/components/features/dashboard/portfolio-aggregates.tsx` — Container that fetches from /portfolio-aggregates and distributes props
- `src/components/features/dashboard/top-bottom-performers.tsx` — Split green/red panel for top/bottom IRR performers
- `src/components/features/dashboard/capital-deployment-tracker.tsx` — Stacked Tailwind bars + aggregate totals with dry powder highlight
- `src/components/features/dashboard/recent-activity-feed.tsx` — Timeline with color-coded type icons and relative timestamps
- `src/components/features/dashboard/lp-comparison-view.tsx` — Sortable investor table with per-entity + aggregate metric columns; Fragment key pattern for multi-column rows

**Modified:**
- `src/app/(gp)/dashboard/page.tsx` — Fully redesigned: "Your Entities" section (responsive grid with show-all toggle) + "Portfolio Overview" section (2x2 grid) + "LP Comparison" section (collapsible)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing TypeScript error in assets/[id] PUT endpoint**
- **Found during:** Task 1 build verification
- **Issue:** `projectedMetrics: Record<string, unknown> | null | undefined` not assignable to Prisma's `NullableJsonNullValueInput | InputJsonValue`. Two files affected: `assets/[id]/route.ts` and `assets/[id]/attribution/route.ts`
- **Fix:** Destructured `projectedMetrics` separately and cast to `Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput` before passing to Prisma update
- **Files modified:** `src/app/api/assets/[id]/route.ts`, `src/app/api/assets/[id]/attribution/route.ts`
- **Impact:** Zero behavior change — only TypeScript type satisfaction

## Issues Encountered

None beyond the pre-existing type error caught during build verification.

## User Setup Required

None — no external service configuration required. Dashboard is fully self-contained with existing database data.

## Next Phase Readiness

- Entity cards are ready for Phase 5 (LP portal can reuse entity card metrics via the /entity-cards endpoint)
- LP comparison view exposes TVPI/DPI/RVPI/IRR per LP per entity — directly feeds Phase 5 LP-side metrics display
- Portfolio aggregates endpoint provides top/bottom performers — can be surfaced in reporting phase

---

## Self-Check

**Files created:**
- [x] `src/app/api/dashboard/entity-cards/route.ts` — exists
- [x] `src/app/api/dashboard/portfolio-aggregates/route.ts` — exists
- [x] `src/app/api/dashboard/lp-comparison/route.ts` — exists
- [x] `src/components/features/dashboard/entity-card.tsx` — exists
- [x] `src/components/features/dashboard/portfolio-aggregates.tsx` — exists
- [x] `src/components/features/dashboard/top-bottom-performers.tsx` — exists
- [x] `src/components/features/dashboard/capital-deployment-tracker.tsx` — exists
- [x] `src/components/features/dashboard/recent-activity-feed.tsx` — exists
- [x] `src/components/features/dashboard/lp-comparison-view.tsx` — exists
- [x] `src/app/(gp)/dashboard/page.tsx` — modified

**Build:** PASSED — zero TypeScript errors, zero compilation errors

## Self-Check: PASSED

All files present, build passes with zero errors.

---
*Phase: 04-asset-entity-polish*
*Completed: 2026-03-08*
