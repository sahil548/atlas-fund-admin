---
phase: 19-dashboard-supporting-modules
plan: 03
subsystem: ui
tags: [react, swr, tailwind, dashboard, next-js]

# Dependency graph
requires:
  - phase: 19-01
    provides: /api/dashboard/pipeline-summary, /api/dashboard/alerts, /api/dashboard/stats endpoints
provides:
  - SummaryBar component (5-metric horizontal bar from stats + entity-cards APIs)
  - NeedsAttentionPanel component (grouped alerts from alerts API)
  - DealPipelineFunnel component (horizontal 4-stage funnel from pipeline-summary API)
  - EntityCard redesigned to compact 2-row format with quick action icons
  - Dashboard page restructured with new layout order; LP Comparison removed
  - phase19-dashboard-components.test.ts (22 smoke tests)
affects: [19-05, phase-20-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Compact entity card pattern: 2-row layout with metric pills and icon quick actions"
    - "Self-fetching dashboard panel pattern: each section fetches its own SWR data independently"
    - "Source inspection smoke tests: vitest reads file source to verify href patterns and API key patterns"

key-files:
  created:
    - src/components/features/dashboard/summary-bar.tsx
    - src/components/features/dashboard/needs-attention-panel.tsx
    - src/components/features/dashboard/deal-pipeline-funnel.tsx
    - src/lib/__tests__/phase19-dashboard-components.test.ts
  modified:
    - src/components/features/dashboard/entity-card.tsx
    - src/app/(gp)/dashboard/page.tsx

key-decisions:
  - "EntityCard expand/collapse removed — compact 2-row card is the new standard for dashboard entity listing"
  - "LP Comparison section removed from dashboard per locked CONTEXT.md decision"
  - "DealPipelineFunnel uses proportional widths with 20% minimum so labels are readable even at count=0"
  - "NeedsAttentionPanel sorts high severity first, then medium — consistent with morning-briefing urgency model"

patterns-established:
  - "Dashboard module pattern: each new section is a self-contained 'use client' component that owns its own SWR fetch"
  - "Smoke test pattern: import test verifies export exists as function; source-read test verifies href/API key patterns without mounting React"

requirements-completed: [DASH-01, DASH-02, DASH-04]

# Metrics
duration: 5min
completed: 2026-03-10
---

# Phase 19 Plan 03: Dashboard Supporting Modules Summary

**GP morning briefing dashboard with SummaryBar (5 metrics), NeedsAttentionPanel (alerts grouped by severity), DealPipelineFunnel (proportional 4-stage funnel), and compact EntityCard (2-row with Eye/DollarSign/FileText quick actions); LP Comparison removed**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-10T10:42:38Z
- **Completed:** 2026-03-10T10:46:39Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Built SummaryBar with 5 metrics (Total NAV, Portfolio IRR, TVPI, Active Deals, Dry Powder) consuming /api/dashboard/stats and /api/dashboard/entity-cards; skeleton loading state; IRR colored green/red
- Built NeedsAttentionPanel consuming /api/dashboard/alerts; high severity first, then medium; "All clear" empty state with CheckCircle icon; max 10 visible with "Show all" toggle
- Built DealPipelineFunnel consuming /api/dashboard/pipeline-summary; 4 stages (Screening/DD/IC/Closing) with proportional widths (20% minimum); SVG chevron connectors; each stage links to /deals?stage=X
- Redesigned EntityCard to compact 2-row format: Row 1 = name + type badge + NAV; Row 2 = IRR/TVPI/DPI/Assets metric pills + Eye/DollarSign/FileText quick action icons
- Restructured dashboard page to new layout order: SummaryBar → NeedsAttention → PipelineFunnel → CompactEntityCards (4-6 per row) → PortfolioOverview; LP Comparison section removed; initial entity count bumped to 12
- Created 22 smoke tests covering module exports, quick action href correctness, SWR key patterns, dark mode classes, and LP Comparison removal verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Summary bar + needs-attention panel + pipeline funnel components** - `a88d02e` (feat)
2. **Task 2: Redesign EntityCard to compact format + wire dashboard page + render tests** - `f14cd4e` (feat)

## Files Created/Modified

- `src/components/features/dashboard/summary-bar.tsx` - 5-metric horizontal bar fetching /api/dashboard/stats and /api/dashboard/entity-cards
- `src/components/features/dashboard/needs-attention-panel.tsx` - Grouped alert list from /api/dashboard/alerts with severity coloring and show-all toggle
- `src/components/features/dashboard/deal-pipeline-funnel.tsx` - Horizontal 4-stage funnel from /api/dashboard/pipeline-summary with proportional widths and clickable stage links
- `src/components/features/dashboard/entity-card.tsx` - Redesigned to compact 2-row format; removed expand/collapse, topAssets, perAssetBreakdown props
- `src/app/(gp)/dashboard/page.tsx` - New layout order, LP Comparison removed, compact grid (xl:grid-cols-4), initial count 12
- `src/lib/__tests__/phase19-dashboard-components.test.ts` - 22 smoke tests for all 4 components + dashboard page structure

## Decisions Made

- EntityCard expand/collapse removed entirely — compact 2-row card is the new dashboard standard; full detail available via Eye icon link to entity detail page
- LP Comparison section removed from dashboard per locked CONTEXT.md decision (plan frontmatter truths)
- DealPipelineFunnel uses proportional widths with 20% minimum — prevents zero-count stages from collapsing to nothing while still conveying relative deal distribution
- NeedsAttentionPanel sorts high severity alerts before medium — consistent with morning-briefing urgency model where critical items must be actioned first

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Dashboard top half is fully restructured; Plan 05 can now add Activity Feed section below PortfolioOverview
- All three new dashboard APIs (pipeline-summary, alerts, stats) are consumed correctly
- EntityCard compact format is in place; entity grid accepts 4-6 per row on large screens

---
*Phase: 19-dashboard-supporting-modules*
*Completed: 2026-03-10*
