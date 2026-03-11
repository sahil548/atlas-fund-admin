---
phase: 20-schema-cleanup-ui-polish
plan: 02
subsystem: api
tags: [timeout, error-handling, promise-race, dd-progress, pipeline-analytics, bug-fix]

requires:
  - phase: 20-01
    provides: raceWithTimeout pattern tested in bug03-timeout.test.ts; logger utility

provides:
  - 504 timeout responses from extract-metadata and dd-analyze API routes
  - Frontend 504 error handling with spinner clearance and toast in deal-overview-tab and deal-dd-tab
  - Clamped DD progress (Math.min 100) on both task-based and workstream-based paths
  - Stage-aware DD progress fallback: IC_REVIEW/CLOSING/CLOSED deals with no workstreams show 100%
  - Verified pipeline conversion rate Math.min(100) guard on all 3 rates in deals/route.ts

affects: [deal-overview, deal-dd-tab, extract-metadata, dd-analyze, pipeline-analytics]

tech-stack:
  added: []
  patterns:
    - "BUG-03 timeout: Promise.race([aiCall, new Promise(reject after 55s)]); catch TIMEOUT -> 504, other -> 500"
    - "Frontend 504 guard: check res.status === 504 before res.ok; clear spinner in both branches"
    - "Stage-aware progress fallback: POST_DD_STAGES.includes(deal.stage) -> 100 when no workstreams"

key-files:
  created: []
  modified:
    - src/app/api/deals/[id]/extract-metadata/route.ts
    - src/app/api/deals/[id]/dd-analyze/route.ts
    - src/components/features/deals/deal-overview-tab.tsx
    - src/components/features/deals/deal-dd-tab.tsx
    - src/lib/__tests__/deal-dd-progress.test.ts

key-decisions:
  - "55-second timeout chosen to leave 5s buffer before Vercel's 60s maxDuration cutoff"
  - "TIMEOUT sentinel string used in Error.message for 504 vs 500 discrimination"
  - "Stage-aware fallback only applies when workstreams.length === 0 (0 means no workstreams, not 0 tasks in workstreams)"
  - "BUG-02 Math.min(100) guard already in place on all 3 conversion rates — verification only, no code change"
  - "Math.min(100) added to task-based path in deal-dd-tab to handle anomalous completedTasks > totalTasks data"

patterns-established:
  - "All AI routes must use Promise.race with 55s timeout returning 504 on TIMEOUT error"
  - "Frontend fetch handlers must check res.status === 504 explicitly before res.ok to clear spinners"

requirements-completed: [INTEG-01, INTEG-02, INTEG-03]

duration: 10min
completed: 2026-03-10
---

# Phase 20 Plan 02: Bug Fixes Summary

**Three bugs eliminated: IC memo spinner no longer hangs (504 timeout), DD progress no longer shows 0% for post-DD deals, pipeline conversion rates verified capped at 100%**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-11T01:00:00Z
- **Completed:** 2026-03-11T01:10:00Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments
- BUG-03 fixed: both AI API routes (extract-metadata, dd-analyze) now use Promise.race with 55s timeout, returning 504 on timeout instead of hanging until Vercel kills the function
- BUG-03 frontend fixed: deal-overview-tab and deal-dd-tab both check res.status === 504 first, clear the spinner, and show toast — no code path can leave spinner stuck
- BUG-01 fixed: DD progress now shows 100% for IC_REVIEW/CLOSING/CLOSED deals with no workstreams; Math.min(100) clamp added to both calculation paths
- BUG-02 verified: Math.min(100) guard already present on all three conversion rates in deals/route.ts; no changes needed

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix BUG-03 — IC memo timeout with 504 error handling** - `a5b60a9` (fix)
2. **Task 2: Fix BUG-01 DD 0% progress + verify BUG-02 conversion rate guard** - `2bf829c` (fix)

## Files Created/Modified
- `src/app/api/deals/[id]/extract-metadata/route.ts` - Changed 90s timeout to 55s; catch TIMEOUT -> 504, others -> 500
- `src/app/api/deals/[id]/dd-analyze/route.ts` - Added Promise.race wrapping runDDAnalysis; same TIMEOUT -> 504 pattern
- `src/components/features/deals/deal-overview-tab.tsx` - Added res.status === 504 check in extractMetadata, clears spinner via finally block
- `src/components/features/deals/deal-dd-tab.tsx` - Added 504 check in runWorkstreamAnalysis; added stage-aware progress fallback; Math.min(100) clamps
- `src/lib/__tests__/deal-dd-progress.test.ts` - Updated computeOverallPct to mirror new clamped logic; added 5 stage-aware regression tests

## Decisions Made
- 55-second timeout chosen (5s buffer before Vercel's 60s maxDuration) — same pattern as bug03-timeout.test.ts documented in Plan 01
- TIMEOUT sentinel string in Error.message enables clean discrimination between 504 and 500 in catch blocks
- Stage-aware fallback (IC_REVIEW/CLOSING/CLOSED -> 100%) only triggers when there are zero workstreams — deals with workstreams still use workstream-status calculation
- BUG-02 guard was already in place; Plan 02 verification confirmed all three conversion rates have Math.min(100) guards

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated deal-dd-progress.test.ts to match new clamped implementation**
- **Found during:** Task 2 (BUG-01 fix)
- **Issue:** Existing test at line 130-144 documented that task-based path does NOT clamp — that documentation would be wrong after adding Math.min(100)
- **Fix:** Updated computeOverallPct mirror function in test to include Math.min(100); updated the assertion from "documents unclamped behavior" to "expects clamped result of 100"; added 5 new stage-aware regression tests
- **Files modified:** src/lib/__tests__/deal-dd-progress.test.ts
- **Verification:** 822 tests pass (5 new tests added)
- **Committed in:** 2bf829c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug: test updated to match implementation)
**Impact on plan:** Test update was necessary for correctness — old test documented broken behavior. New tests add coverage for stage-aware fallback. No scope creep.

## Issues Encountered
- extract-metadata/route.ts originally had a 90-second timeout (not 55s) — corrected to 55s to match the plan's spec
- The original catch block in extract-metadata returned `err.message` directly as the error body, which would expose internal error messages. Changed to return "AI extraction failed" for non-timeout errors (same security improvement the plan requested)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 3 known bugs from CLAUDE.md and CONCERNS.md are now fixed
- Existing test suite passes with 822 tests (5 new regression tests added)
- Build succeeds with zero errors
- Ready for Plan 03 (logger migration to API routes)

## Self-Check: PASSED

- FOUND: src/app/api/deals/[id]/extract-metadata/route.ts — contains "TIMEOUT", "504", "55_000"
- FOUND: src/app/api/deals/[id]/dd-analyze/route.ts — contains "TIMEOUT", "504", "55_000"
- FOUND: src/components/features/deals/deal-overview-tab.tsx — contains "res.status === 504"
- FOUND: src/components/features/deals/deal-dd-tab.tsx — contains "res.status === 504"
- FOUND: .planning/phases/20-schema-cleanup-ui-polish/20-02-SUMMARY.md
- FOUND commit a5b60a9 (Task 1: BUG-03 timeout fix)
- FOUND commit 2bf829c (Task 2: BUG-01 progress + BUG-02 verification)
- Tests: 822 passed, 1 skipped (5 new tests added)
- Build: zero errors

---
*Phase: 20-schema-cleanup-ui-polish*
*Completed: 2026-03-10*
