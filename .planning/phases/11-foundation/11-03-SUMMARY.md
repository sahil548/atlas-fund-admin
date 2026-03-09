---
phase: 11-foundation
plan: 03
subsystem: ui
tags: [react, tailwind, empty-state, skeleton, loading-states, dark-mode]

# Dependency graph
requires:
  - phase: 11-foundation
    provides: EmptyState and TableSkeleton components from Plan 01
provides:
  - 8 list pages migrated to EmptyState for zero-record states
  - 8 list pages migrated to skeleton loading (TableSkeleton or skeleton cards/kanban)
  - No early-return loading spinners remain on any list page
  - hasFilters/handleClearFilters pattern on every list page with filters
affects: [11-04, 11-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [TableSkeleton inside tbody for table-based pages, skeleton kanban grid for deals, skeleton card list for meetings, EmptyState with filtered/true-empty distinction]

key-files:
  created: []
  modified:
    - src/app/(gp)/assets/page.tsx
    - src/app/(gp)/entities/page.tsx
    - src/app/(gp)/transactions/page.tsx
    - src/app/(gp)/directory/page.tsx
    - src/app/(gp)/deals/page.tsx
    - src/app/(gp)/tasks/page.tsx
    - src/app/(gp)/documents/page.tsx
    - src/app/(gp)/meetings/page.tsx

key-decisions:
  - "Deals kanban uses inline skeleton grid (4 cols x 3 cards) instead of TableSkeleton"
  - "Meetings uses skeleton card list (5 cards) instead of TableSkeleton since it uses card layout"
  - "Transactions waterfall tab uses skeleton card blocks instead of TableSkeleton since templates are cards"
  - "Every page with filters gets hasFilters + handleClearFilters for filtered-empty distinction"

patterns-established:
  - "Table-based pages: isLoading && items.length === 0 -> TableSkeleton, items.length === 0 -> EmptyState, else -> data rows"
  - "Non-table pages: skeleton cards/kanban inline during load, EmptyState component for empty"
  - "No early-return loading blocks: page structure always rendered, only content area swaps"

requirements-completed: [FOUND-01, FOUND-02]

# Metrics
duration: 7min
completed: 2026-03-09
---

# Phase 11 Plan 03: List Page Skeleton + EmptyState Migration Summary

**All 8 list pages migrated to TableSkeleton/skeleton loading and EmptyState with contextual icons, CTAs, and filtered-empty distinction**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-09T07:53:20Z
- **Completed:** 2026-03-09T08:01:13Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Removed all early-return loading spinners ("Loading assets...", "Loading entities...", etc.) from 8 list pages -- no more layout shift during load
- Added TableSkeleton to 6 table-based pages (assets 13-col, entities 9-col, transactions calls 7-col + distributions 10-col, directory investors 9-col, tasks 6-col, documents 6-col)
- Added skeleton kanban grid to deals page (4 columns x 3 placeholder cards)
- Added skeleton card list to meetings page (5 placeholder cards)
- Added EmptyState with contextual Lucide icons (Package, Building, ArrowLeftRight, Users, LayoutList, CheckSquare, FileText, Video) and domain-appropriate CTAs
- Added true-empty vs filtered-empty distinction with "Clear filters" link on every page that has filters
- Directory page: EmptyState added to all 5 tabs (investors, companies, contacts, team, side letters)
- Transactions page: EmptyState added to all 3 tabs (capital calls, distributions, waterfall templates)

## Task Commits

Each task was committed atomically:

1. **Task 1: TableSkeleton + EmptyState to table-based list pages** - `ee281fe` (feat)
2. **Task 2: Skeleton + EmptyState to deals, tasks, documents, meetings** - `782652d` (feat)

## Files Created/Modified
- `src/app/(gp)/assets/page.tsx` - 13-col TableSkeleton + EmptyState with Package icon, "+ Add Asset" CTA
- `src/app/(gp)/entities/page.tsx` - 9-col TableSkeleton + EmptyState with Building icon, "+ Create Entity" CTA
- `src/app/(gp)/transactions/page.tsx` - TableSkeleton on calls (7 cols) and distributions (10 cols), skeleton cards on waterfall, EmptyState on all 3 tabs
- `src/app/(gp)/directory/page.tsx` - TableSkeleton on investors (9 cols), EmptyState on all 5 tabs with contextual CTAs
- `src/app/(gp)/deals/page.tsx` - Skeleton kanban grid (4 cols x 3 cards), EmptyState with LayoutList icon
- `src/app/(gp)/tasks/page.tsx` - 6-col TableSkeleton, EmptyState with CheckSquare icon, view-tab-aware copy
- `src/app/(gp)/documents/page.tsx` - 6-col TableSkeleton, EmptyState with FileText icon, "+ Upload Document" CTA
- `src/app/(gp)/meetings/page.tsx` - Skeleton card list (5 cards), EmptyState with Video icon, "+ Log Meeting" CTA

## Decisions Made
- Deals kanban uses inline skeleton grid (not TableSkeleton) because it's a card-based layout, not a table
- Meetings uses inline skeleton cards (not TableSkeleton) because it renders a vertical card list, not a table
- Transactions waterfall templates tab uses skeleton card blocks for the same reason
- Every list page with filter state gets a `hasFilters` boolean and `handleClearFilters` callback for the filtered-empty EmptyState variant

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Documents page had a JSX syntax error from an extra `}` in the map callback closing -- fixed by removing the redundant closing brace (auto-detected by build, corrected before commit)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 8 list pages now use EmptyState and skeleton loading from Plan 01 components
- Ready for Plan 04 (date/currency formatting migration) which may touch some of the same pages
- Ready for Plan 05 (PageHeader + SectionPanel migration)

## Self-Check: PASSED

All 8 modified files verified present. Both commits (`ee281fe`, `782652d`) verified in git log. All 8 list pages import EmptyState. No "Loading..." early-return patterns remain on any in-scope list page. Build passes with zero errors.

---
*Phase: 11-foundation*
*Completed: 2026-03-09*
