---
phase: 14-asset-management-task-management
plan: "01"
subsystem: database
tags: [prisma, postgresql, schema-migration, pure-functions, vitest, api, asset-management]

# Dependency graph
requires:
  - phase: 13-deal-desk-crm
    provides: deal stage engine, task model, asset model foundation
provides:
  - Asset model extended with exitDate, exitProceeds, exitNotes, ownershipPercent, shareCount, reviewFrequency
  - TaskChecklistItem model with taskId, title, isChecked, position fields and Task relation
  - POST /api/assets/[id]/exit endpoint with Zod validation, MOIC calculation, atomic task creation
  - asset-exit-utils.ts: calculateExitMetrics + getExitClosingTasks
  - asset-monitoring-utils.ts: categorizeLeaseExpiry + isOverdueReview
  - task-sort-utils.ts: sortAssets + toggleSortDirection
  - deal-auto-tasks.ts: getDDAutoTasks + getClosingAutoTasks + getExitAutoTasks
  - 4 Wave 0 test files covering all Phase 14 testable behaviors (44 new tests)
affects:
  - 14-02 (asset monitoring UI)
  - 14-03 (task checklist UI)
  - 14-04 (deal stage auto-tasks UI)
  - All Phase 14 plans depend on schema and utilities from this plan

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure utility functions extracted for testability — API routes import from lib utilities
    - prisma.$transaction for atomic multi-model writes (asset update + task creates)
    - TDD pattern: write GREEN implementation with passing tests in one pass (utilities are correct by design)
    - categorizeLeaseExpiry uses day-floor arithmetic for precise boundary conditions

key-files:
  created:
    - src/lib/asset-exit-utils.ts
    - src/lib/asset-monitoring-utils.ts
    - src/lib/task-sort-utils.ts
    - src/lib/deal-auto-tasks.ts
    - src/lib/__tests__/asset-exit.test.ts
    - src/lib/__tests__/asset-monitoring.test.ts
    - src/lib/__tests__/task-sort.test.ts
    - src/lib/__tests__/deal-stage-tasks.test.ts
    - src/app/api/assets/[id]/exit/route.ts
  modified:
    - prisma/schema.prisma
    - src/lib/schemas.ts

key-decisions:
  - "getExitAutoTasks returns AutoTask[] (with title + priority) not just strings — API route destructures for prisma.task.create"
  - "sortAssets uses T extends object (not index-signature Sortable) for TypeScript test compatibility"
  - "categorizeLeaseExpiry uses Math.floor for day arithmetic; day 90 = critical, day 91+ = warning, day 180 = warning, day 181+ = safe"
  - "prisma.$transaction spreads task creates into array — asset update returns [0] for typed response"
  - "MOIC on exit endpoint is exitProceeds / costBasis (same formula as calculateExitMetrics); guard returns 0 for zero costBasis"

patterns-established:
  - "Exit endpoint pattern: validate → findUnique guard → status guard → $transaction([update, ...creates]) → return updatedAsset"
  - "Pure utility exports: testable functions in src/lib/*-utils.ts or src/lib/deal-auto-tasks.ts; API routes import from there"
  - "Wave 0 tests: test files created alongside utility implementations, all GREEN from the start"

requirements-completed:
  - ASSET-04

# Metrics
duration: 6min
completed: "2026-03-09"
---

# Phase 14 Plan 01: Schema Migration, Wave 0 Tests, and Asset Exit API Summary

**Prisma schema extended with 6 new Asset fields + TaskChecklistItem model; 4 Wave 0 test files with 44 tests (all green); POST /api/assets/[id]/exit with atomic MOIC calculation and auto-task creation**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-09T20:31:05Z
- **Completed:** 2026-03-09T20:36:33Z
- **Tasks:** 3 of 3
- **Files modified:** 11

## Accomplishments

- Extended Asset model with exit workflow fields (exitDate, exitProceeds, exitNotes), ownership tracking (ownershipPercent, shareCount), and review scheduling (reviewFrequency); added TaskChecklistItem model with cascade-delete relation to Task
- Created 4 pure utility libraries (asset-exit-utils, asset-monitoring-utils, task-sort-utils, deal-auto-tasks) and 4 matching test files covering all Wave 0 behaviors — all 585 tests pass
- Built POST /api/assets/[id]/exit using prisma.$transaction to atomically mark asset EXITED, calculate MOIC, and auto-create closing tasks from getExitAutoTasks()

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration** - `e9584c1` (feat)
2. **Task 2: Wave 0 test scaffolds + utilities** - `0cfe3d3` (feat)
3. **Task 3: Asset exit API endpoint** - `a1cc8ed` (feat)

## Files Created/Modified

- `prisma/schema.prisma` - Added 6 Asset fields + TaskChecklistItem model + checklistItems relation on Task
- `src/lib/asset-exit-utils.ts` - calculateExitMetrics (moic, gainLoss, holdPeriodDays) + getExitClosingTasks
- `src/lib/asset-monitoring-utils.ts` - categorizeLeaseExpiry (critical/warning/safe/expired) + isOverdueReview
- `src/lib/task-sort-utils.ts` - sortAssets (null-to-end, asc/desc) + toggleSortDirection
- `src/lib/deal-auto-tasks.ts` - getDDAutoTasks + getClosingAutoTasks + getExitAutoTasks (AutoTask[])
- `src/lib/__tests__/asset-exit.test.ts` - 10 tests: MOIC, hold period, gain/loss, zero costBasis edge case, task titles
- `src/lib/__tests__/asset-monitoring.test.ts` - 11 tests: lease window boundaries, overdue review logic
- `src/lib/__tests__/task-sort.test.ts` - 9 tests: asc/desc sort, numeric sort, null-to-end, immutability
- `src/lib/__tests__/deal-stage-tasks.test.ts` - 15 tests: DD tasks, closing tasks, exit tasks, assignee contract
- `src/app/api/assets/[id]/exit/route.ts` - POST handler with parseBody, status guard, $transaction
- `src/lib/schemas.ts` - Added ExitAssetSchema (exitDate, exitProceeds, exitNotes)

## Decisions Made

- `getExitAutoTasks` returns `AutoTask[]` (title + priority) rather than bare strings — the exit route destructures both fields for `prisma.task.create`, allowing priority to be set on auto-created tasks
- `sortAssets` uses `T extends object` constraint rather than an index-signature `Sortable` interface — the index signature caused TypeScript errors when passing typed test interfaces; `object` constraint is sufficient since we only access via `keyof T`
- `categorizeLeaseExpiry` boundary: day 90 = critical, day 91 = warning, day 180 = warning, day 181+ = safe (matches plan spec: "within 90 days" = critical, "90-180 days" = warning)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript incompatibility in task-sort-utils.ts Sortable type**
- **Found during:** Task 3 verification (npx tsc --noEmit)
- **Issue:** `interface Sortable { [key: string]: unknown }` caused TypeScript error when test passed `SimpleAsset[]` — index signatures are incompatible with concrete interfaces
- **Fix:** Changed `T extends Sortable` to `T extends object`; removed the `Sortable` interface export
- **Files modified:** src/lib/task-sort-utils.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors; all 585 tests still pass
- **Committed in:** a1cc8ed (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - TypeScript type bug)
**Impact on plan:** Single type fix required for build correctness. No scope creep.

## Issues Encountered

- `npm run build` was killed (OOM during Next.js TypeScript check step) — verified type correctness via `npx tsc --noEmit` instead, which passed with zero errors. Build compilation step (Turbopack) shows "Compiled successfully" before the kill, confirming no compilation errors.

## User Setup Required

None - no external service configuration required. Schema was reset and re-seeded automatically.

## Next Phase Readiness

- Schema foundation is complete — all Phase 14 plans can now reference exitDate, ownershipPercent, reviewFrequency, and TaskChecklistItem
- Pure utility functions are imported by Phase 14 API routes (no duplication needed)
- Wave 0 tests provide regression coverage from day one — all 585 tests green
- POST /api/assets/[id]/exit is ready to wire up to UI in subsequent plans

---
*Phase: 14-asset-management-task-management*
*Completed: 2026-03-09*

## Self-Check: PASSED

All files verified present:
- src/lib/asset-exit-utils.ts: FOUND
- src/lib/asset-monitoring-utils.ts: FOUND
- src/lib/task-sort-utils.ts: FOUND
- src/lib/deal-auto-tasks.ts: FOUND
- src/lib/__tests__/asset-exit.test.ts: FOUND
- src/lib/__tests__/asset-monitoring.test.ts: FOUND
- src/lib/__tests__/task-sort.test.ts: FOUND
- src/lib/__tests__/deal-stage-tasks.test.ts: FOUND
- src/app/api/assets/[id]/exit/route.ts: FOUND
- .planning/phases/14-asset-management-task-management/14-01-SUMMARY.md: FOUND

Commits verified (hashes from creation output):
- e9584c1: feat(14-01) schema migration
- 0cfe3d3: feat(14-01) Wave 0 test scaffolds
- a1cc8ed: feat(14-01) asset exit API endpoint
