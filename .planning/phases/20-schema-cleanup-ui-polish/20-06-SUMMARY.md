---
phase: 20-schema-cleanup-ui-polish
plan: 06
subsystem: ui
tags: [typescript, eslint, dead-code, cleanup, logging]

# Dependency graph
requires:
  - phase: 20-03
    provides: Console migration for src/lib/ and src/app/api/ files
provides:
  - Zero console.* calls across entire src/ tree (excluding tests and logger.ts)
  - Dead code cleanup: unused imports removed from 27 files
  - Unused eslint-disable directives removed from 16 files
  - Unused variables and dead functions removed
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Underscore-prefix convention for intentionally unused params (_firmId, _provider)"
    - "Remove eslint-disable directives when no longer needed — keeps codebase honest"

key-files:
  created: []
  modified:
    - src/components/features/deals/deal-dd-tab.tsx
    - src/components/features/settings/integrations-tab.tsx
    - src/components/features/settings/prompt-templates-editor.tsx
    - src/components/features/waterfall/waterfall-preview-panel.tsx
    - src/components/features/assets/asset-active-management/credit-management-panel.tsx
    - src/lib/dashboard-pipeline-utils.ts
    - src/lib/deal-stage-engine.ts
    - src/lib/pdf/quarterly-report.tsx
    - src/lib/pdf/shared-styles.ts
    - src/middleware.ts
    - src/lib/integrations/asana.ts
    - src/app/(gp)/contacts/[id]/page.tsx
    - src/components/features/dashboard/activity-feed-section.tsx
    - src/components/features/dashboard/capital-deployment-tracker.tsx
    - src/components/features/dashboard/entity-card.tsx
    - src/components/features/dashboard/lp-comparison-view.tsx
    - src/components/features/dashboard/needs-attention-panel.tsx
    - src/components/features/dashboard/portfolio-aggregates.tsx
    - src/components/features/dashboard/recent-activity-feed.tsx
    - src/components/features/dashboard/top-bottom-performers.tsx
    - src/components/features/documents/document-extraction-panel.tsx
    - src/components/providers/user-provider.tsx

key-decisions:
  - "Task 1 (console migration) was already complete from Plan 03 — zero console.* calls verified, no files needed changes"
  - "Unused eslint-disable @typescript-eslint/no-explicit-any directives removed from 16 files — they accumulated from early dev when any was common"
  - "Dead queries removed: ws findUnique in recalcWorkstreamProgress had no effect on output"
  - "priorityColor function in deal-dd-tab.tsx removed — function was defined but never called"
  - "ActiveStage type in dashboard-pipeline-utils.ts removed — the ACTIVE_PIPELINE_STAGES const was used but the derived type was not"

patterns-established: []

requirements-completed: [INTEG-09]

# Metrics
duration: 25min
completed: 2026-03-11
---

# Phase 20 Plan 06: Dead Code Cleanup Summary

**Zero console.* calls verified across entire src/ tree; 27 files cleaned of unused imports, dead variables, and stale eslint-disable directives**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-11T08:24:50Z
- **Completed:** 2026-03-11T08:49:50Z
- **Tasks:** 2
- **Files modified:** 27

## Accomplishments
- Verified zero console.* calls remain in entire src/ tree (console migration from Plan 03 was comprehensive)
- Removed unused imports from 11 files: Badge/Select/Input, pct, useFirm, DEFAULT_PROMPT_TEMPLATES, getDDAutoTasks, StyleSheet, Font
- Removed unused variables and dead functions: effectiveRate, ActiveStage type, priorityColor, isSelected, unused ws query, pathname
- Removed 16 unused `/* eslint-disable @typescript-eslint/no-explicit-any */` directives from dashboard, document, entity, and provider components
- Build passes with zero errors; all 822 tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Console migration verification** - already complete from Plan 03 (zero changes needed, zero console.* calls)
2. **Task 2: Dead code cleanup** - `dd05e69` (chore)

## Files Created/Modified
- `src/components/features/deals/deal-dd-tab.tsx` - Removed Badge/Select/Input imports, priorityColor function, isSelected variable
- `src/components/features/settings/integrations-tab.tsx` - Removed unused useFirm import, renamed `provider` to `_provider`
- `src/components/features/settings/prompt-templates-editor.tsx` - Removed DEFAULT_PROMPT_TEMPLATES import
- `src/components/features/waterfall/waterfall-preview-panel.tsx` - Removed unused pct import
- `src/components/features/assets/asset-active-management/credit-management-panel.tsx` - Removed unused effectiveRate variable
- `src/lib/dashboard-pipeline-utils.ts` - Removed unused ActiveStage type alias
- `src/lib/deal-stage-engine.ts` - Removed getDDAutoTasks import + dead findUnique query in recalcWorkstreamProgress
- `src/lib/pdf/quarterly-report.tsx` - Removed unused StyleSheet import
- `src/lib/pdf/shared-styles.ts` - Removed unused Font import
- `src/middleware.ts` - Removed unused pathname destructure
- `src/lib/integrations/asana.ts` - Renamed firmId to _firmId in exchangeCode
- 16 dashboard/document/entity/provider files - Removed stale eslint-disable @typescript-eslint/no-explicit-any directives

## Decisions Made
- Task 1 verification confirmed Plan 03 was complete: zero console.* calls remain in src/ tree
- Pre-existing ESLint errors (setState in useEffect in providers/app-shell) are out of scope — these are React pattern warnings in pre-existing code, not introduced by this plan
- Test file warnings skipped per plan spec: "Do NOT remove: Any code in test files"
- `_`-prefixed unused params (like `_firmId`, `_provider`) are intentional — standard TypeScript convention for "signature must match but param not needed"

## Deviations from Plan

None - plan executed exactly as written. Task 1 was already complete from Plan 03.

## Issues Encountered
None - build and tests passed cleanly on first run after changes.

## Next Phase Readiness
- Dead code cleanup complete — codebase is clean of console.* calls, unused imports, and stale lint directives
- Phase 20 Plans 07-10 can proceed with a clean, consistent codebase

---
*Phase: 20-schema-cleanup-ui-polish*
*Completed: 2026-03-11*
