---
phase: 02-deal-desk-end-to-end
plan: 07
subsystem: asset-detail-analytics
tags: [asset-detail, source-deal, ai-intelligence, pipeline-analytics, recharts, conversion-funnel]

# Dependency graph
requires:
  - phase: 02-deal-desk-end-to-end
    plan: 01
    provides: "Schema: Asset.sourceDealId, DealEntity junction table"
  - phase: 02-deal-desk-end-to-end
    plan: 03
    provides: "Deal-to-asset transition with sourceDealId provenance tracking"
  - phase: 02-deal-desk-end-to-end
    plan: 04
    provides: "DD workstreams, screening results, deal metadata extraction"
provides:
  - "Asset detail page with source deal attribution banner and AI intelligence section"
  - "Dedicated /analytics page with pipeline value, time-in-stage, velocity, funnel charts"
  - "GET /api/analytics/pipeline endpoint for pipeline metrics"
  - "Analytics route registered in sidebar navigation"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["Recharts bar/line charts for pipeline analytics", "Collapsible AI intelligence section with score/strengths/risks"]

key-files:
  created:
    - "src/components/features/assets/asset-originated-from.tsx"
    - "src/app/(gp)/analytics/page.tsx"
    - "src/app/api/analytics/pipeline/route.ts"
  modified:
    - "src/app/api/assets/[id]/route.ts"
    - "src/app/(gp)/assets/[id]/page.tsx"
    - "src/app/(gp)/deals/page.tsx"
    - "src/lib/routes.ts"

key-decisions:
  - "sourceDeal include fetches screeningResult, workstreams with tasks, icProcess with votes, dealMetadata, and dealLead"
  - "AI Deal Intelligence section on asset overview is collapsible (expandable) to avoid overwhelming the page"
  - "Analytics route registered at priority 81 between Accounting (82) and Meetings (80)"
  - "Pipeline analytics API computes time-in-stage from DealActivity STAGE_CHANGE metadata"

patterns-established:
  - "Collapsible section pattern: gradient header button with expand/collapse arrow, white content area"
  - "Analytics API returns structured metrics object with summary, per-stage breakdowns, and time-series data"

requirements-completed: [ASSET-01, DEAL-10]

# Metrics
duration: 7min
completed: 2026-03-06
---

# Phase 2 Plan 07: Asset Detail Polish & Pipeline Analytics Summary

**Asset detail with source deal attribution banner, collapsible AI intelligence section, and dedicated analytics page with Recharts pipeline value/time-in-stage/velocity/funnel charts**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-06T06:51:08Z
- **Completed:** 2026-03-06T06:58:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Asset detail page shows "Originated from: [Deal Name]" banner with clickable link to source deal when asset was created from a closed deal
- Collapsible AI Deal Intelligence section on asset overview displays AI score badge, executive summary, key strengths (green), and key risks (red) from the deal screening
- New dedicated /analytics page with four Recharts visualizations: pipeline value by stage (bar), average time in stage (bar), deal velocity over 6 months (line), and conversion funnel (horizontal bars)
- Analytics API endpoint computes pipeline value, time-in-stage from DealActivity records, deal velocity, conversion rates, and throughput metrics
- Added equity tab for equity-type assets and entity allocations card on overview
- Type-specific tabs show placeholder messages when no detail records exist

## Task Commits

Each task was committed atomically:

1. **Task 1: Asset detail polish with source deal link and AI intelligence** - `9130255` (feat)
2. **Task 2: Enhanced deals page summary cards + dedicated analytics page** - `17cc3b3` (feat)

## Files Created/Modified

- `src/app/api/assets/[id]/route.ts` - Added sourceDeal include with screeningResult, workstreams, icProcess, dealMetadata
- `src/components/features/assets/asset-originated-from.tsx` - New component: subtle indigo banner with deal name link and arrow
- `src/app/(gp)/assets/[id]/page.tsx` - Added originated-from banner, AI intelligence section, equity tab, entity allocations card, type-specific placeholders
- `src/app/(gp)/deals/page.tsx` - Added "View Full Analytics" link in pipeline analytics header
- `src/app/api/analytics/pipeline/route.ts` - New endpoint: pipeline value by stage, time-in-stage, velocity, conversion, throughput, funnel
- `src/app/(gp)/analytics/page.tsx` - New page: 4 stat cards + 4 chart panels + throughput section using Recharts
- `src/lib/routes.ts` - Added /analytics route entry (priority 81, BarChart3 icon)

## Decisions Made

- sourceDeal Prisma include fetches a comprehensive set of related data (screeningResult, workstreams with tasks, icProcess with votes, dealLead) to power both the AI intelligence section and the full deal intel tab
- AI Deal Intelligence section defaults to collapsed state to keep the overview clean -- user expands to see screening details
- Analytics route placed at priority 81 (between Accounting at 82 and Meetings at 80) to appear naturally in the sidebar
- Time-in-stage calculation uses DealActivity records with STAGE_CHANGE metadata to find when each deal entered its current stage; falls back to deal creation date if no activity found
- Asset page now references `a.sourceDeal` (the Prisma relation name) instead of the previous nonexistent `a.deal` field

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree missing Plan 01-06 changes**
- **Found during:** Pre-execution setup
- **Issue:** Worktree was based on older branch, missing schema changes (Asset.sourceDealId, DealEntity, DecisionStructure) and all Plan 01-06 UI changes
- **Fix:** Merged main branch into worktree to bring in all changes
- **Files modified:** All schema and prior plan files via git merge

**2. [Rule 1 - Bug] Fixed asset page referencing nonexistent `a.deal` field**
- **Found during:** Task 1 (asset detail page enhancement)
- **Issue:** The existing page checked `a.deal` for the deal intel tab, but the Asset model has no `deal` field -- the relation is `sourceDeal`
- **Fix:** Changed all references from `a.deal` to `a.sourceDeal` and updated the API to include the sourceDeal relation
- **Files modified:** src/app/(gp)/assets/[id]/page.tsx, src/app/api/assets/[id]/route.ts

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correct operation. No scope creep.

## Issues Encountered

- Recharts Tooltip `formatter` prop expects `value: number | undefined` but TypeScript complained about explicit `number` type annotations. Fixed by using `any` type for Recharts callback parameters (standard pattern for Recharts v3 with strict TypeScript).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Asset detail pages fully functional with source deal attribution and AI intelligence carry-over
- Pipeline analytics available via sidebar navigation at /analytics
- Deal flow health metrics (bottlenecks, velocity, conversion) visible to GP team
- Phase 2 Deal Desk End-to-End is now feature-complete with all 7 plans executed

## Self-Check: PASSED

All 7 files verified present. Both commits (9130255, 17cc3b3) verified in git log.

---
*Phase: 02-deal-desk-end-to-end*
*Completed: 2026-03-06*
