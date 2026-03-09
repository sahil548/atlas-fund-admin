---
phase: 11-foundation
plan: 01
subsystem: ui
tags: [react, tailwind, date-formatting, empty-state, skeleton, dark-mode, vitest]

# Dependency graph
requires: []
provides:
  - EmptyState component with true-empty and filtered-empty variants
  - TableSkeleton component with 5-row animate-pulse loading pattern
  - PageHeader component with breadcrumbs, title, subtitle, and actions slot
  - SectionPanel component wrapping standard white card pattern
  - formatDate, formatDateShort, formatRelativeTime in utils.ts
  - StatCard dark mode parity
  - Wave 0 test scaffold for foundation components and formatters
affects: [11-02, 11-03, 11-04, 11-05, 12-ai-config-doc-intake]

# Tech tracking
tech-stack:
  added: []
  patterns: [EmptyState true-empty/filtered-empty, TableSkeleton in-table skeleton rows, PageHeader breadcrumb trail, SectionPanel white card wrapper, native Intl.DateTimeFormat for date formatting]

key-files:
  created:
    - src/components/ui/empty-state.tsx
    - src/components/ui/table-skeleton.tsx
    - src/components/ui/page-header.tsx
    - src/components/ui/section-panel.tsx
    - src/lib/__tests__/foundation.test.ts
  modified:
    - src/lib/utils.ts
    - src/components/ui/stat-card.tsx

key-decisions:
  - "Used native Intl.DateTimeFormat instead of date-fns -- zero bundle cost, produces identical output"
  - "formatRelativeTime falls back to formatDate for 7+ day old items (not 14 as originally considered)"
  - "FOUND-03 confirm() grep-as-test added as .skip -- will enable after Plan 02 completes migration"
  - "Component tests use dynamic import to verify exports (node env, no jsdom needed)"

patterns-established:
  - "EmptyState: filtered prop switches between CTA button (true-empty) and Clear filters link (filtered-empty)"
  - "TableSkeleton: renders tr/td rows directly (caller wraps in tbody), first col w-32, last col w-12, middle w-20"
  - "PageHeader: text-lg font-bold standardized heading, breadcrumbs only when provided"
  - "SectionPanel: bg-white dark:bg-gray-900 rounded-xl border with optional header row and noPadding mode"
  - "Dark mode pattern: every light color class gets paired dark: class (gray-900/100, gray-200/700, gray-100/800)"

requirements-completed: [FOUND-01, FOUND-02, FOUND-04, FOUND-05, FOUND-06, FOUND-07, FOUND-08]

# Metrics
duration: 3min
completed: 2026-03-09
---

# Phase 11 Plan 01: Foundation Components Summary

**4 shared UI components (EmptyState, TableSkeleton, PageHeader, SectionPanel), 3 date formatters in utils.ts, StatCard dark mode fix, and 25-test Wave 0 scaffold**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-09T07:46:52Z
- **Completed:** 2026-03-09T07:50:15Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created 4 foundation UI components used by all subsequent migration plans (02-05)
- Added formatDate ("Mar 8, 2026"), formatDateShort ("Mar 8"), and formatRelativeTime ("3h ago") to canonical utils.ts
- Fixed StatCard dark mode (was completely missing dark: classes)
- Established Wave 0 test scaffold with 25 passing tests covering all new exports and dark mode audit

## Task Commits

Each task was committed atomically:

1. **Task 1 (TDD RED): Test scaffold** - `486e516` (test)
2. **Task 1 (TDD GREEN): Formatter implementations** - `f5fbabe` (feat)
3. **Task 2: Components + StatCard dark mode + tests** - `dbb40ef` (feat)

_TDD task had separate RED/GREEN commits per protocol._

## Files Created/Modified
- `src/components/ui/empty-state.tsx` - EmptyState with true-empty/filtered-empty variants and dark mode
- `src/components/ui/table-skeleton.tsx` - TableSkeleton with 5-row default and animate-pulse
- `src/components/ui/page-header.tsx` - PageHeader with breadcrumbs, title, subtitle, actions slot
- `src/components/ui/section-panel.tsx` - SectionPanel white card wrapper with optional header and noPadding
- `src/lib/utils.ts` - Added formatDate, formatDateShort, formatRelativeTime (existing fmt/pct/cn unchanged)
- `src/components/ui/stat-card.tsx` - Added dark:bg-gray-900, dark:border-gray-700, dark:text-gray-100/400, dark:text-emerald-400, dark:text-red-400
- `src/lib/__tests__/foundation.test.ts` - 25 passing tests + 1 skipped FOUND-03 grep test

## Decisions Made
- Used native Intl.DateTimeFormat instead of date-fns (zero bundle cost, produces identical "Mar 8, 2026" output)
- formatRelativeTime falls back to formatDate at 7+ days (consistent with activity feed UX)
- Component export tests use dynamic import (node vitest environment, no jsdom needed)
- FOUND-03 confirm() grep-as-test added as describe.skip (enable after Plan 02 migration)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 shared components ready for migration sweeps in Plans 02-05
- formatDate/formatDateShort/formatRelativeTime ready to replace 25+ raw toLocaleDateString calls
- Wave 0 test scaffold ready for expansion as migration tests are added
- StatCard dark mode fixed, consistent with new component patterns

## Self-Check: PASSED

All 8 files verified present. All 3 commits verified in git log.

---
*Phase: 11-foundation*
*Completed: 2026-03-09*
