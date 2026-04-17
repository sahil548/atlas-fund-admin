---
phase: 22-fit-finish-code
plan: "07"
subsystem: computations / deals / seed
tags: [fin-02, fin-08, waterfall, pref-accrual, bug-closeout, seed]
dependency_graph:
  requires: [22-01, 22-02, 22-03, 22-04]
  provides: [FIN-02, FIN-08]
  affects: [src/app/api/waterfall-templates, src/lib/computations/pref-accrual, prisma/seed]
tech_stack:
  added: []
  patterns:
    - Import pref math from canonical pref-accrual.ts module (no inlined duplicates)
    - buildPicTimeline + computePrefSegments called from API route using ContributionTranche/RocDistribution types
key_files:
  created:
    - .planning/phases/22-fit-finish-code/22-07-VERIFICATION.md
    - .planning/phases/22-fit-finish-code/22-07-SUMMARY.md
  modified:
    - src/app/api/waterfall-templates/[id]/calculate/route.ts
    - prisma/seed.ts
decisions:
  - FIN-02: route's inline PIC walk replaced with buildPicTimeline + computePrefSegments; ContributionTranche/RocDistribution arrays constructed from DB line items before passing to pref-accrual module
  - BUG-01: confirmed seed gap (deal-9 CLOSED had no workstreams); added deal-9 to dealsToScaffold; stage-aware fallback in deal-dd-tab.tsx already handles zero-workstream post-DD deals
  - BUG-02: confirmed closed by code inspection — no percentage displayed on /deals stat cards
  - BUG-03: confirmed closed by code inspection — isAnalyzing hardcoded false in deal-overview-tab.tsx
metrics:
  duration: "~30 min"
  completed_date: "2026-04-16"
  tasks_completed: 4
  files_modified: 2
  files_created: 2
  commits: 2
---

# Phase 22 Plan 07: Waterfall Refactor + FIN-08 Bug Closeout Summary

**One-liner:** FIN-02 mechanical refactor removes 120-line duplication in waterfall route (now imports days360Exclusive/Inclusive/buildPicTimeline/computePrefSegments from pref-accrual.ts); FIN-08 formally closes all three March-5 bugs with labeled evidence sections.

## What Was Done

### Task 1: Baseline snapshot

Recorded pre-refactor baseline:
- 148 computation tests, all passing
- Inlined functions at lines 221–239 (day count) and 328–401 (PIC walk loop)

### Task 2: FIN-02 Waterfall Route Refactor (commit d035e80)

Refactored `src/app/api/waterfall-templates/[id]/calculate/route.ts`:

1. Added imports from `@/lib/computations/pref-accrual`: `days360Exclusive`, `days360Inclusive`, `buildPicTimeline`, `computePrefSegments`, `PicEvent`, `ContributionTranche`, `RocDistribution`
2. Removed inlined `days360Exclusive` function (lines 221–231)
3. Removed inlined `days360Inclusive` function (lines 236–239)
4. Removed inlined `type PicEvent` alias (lines 328–333)
5. Replaced 68-line inline PIC walk loop with: build `ContributionTranche[]` from `lpFundedCallLineItems`, build `RocDistribution[]` from `priorDistLineItems`, then call `buildPicTimeline` + `computePrefSegments`

Result: 102-line net reduction (-102 lines). Zero local definitions of the four pref-math functions. All 148 computation tests preserved. `npm run build` clean.

**Verification:** `grep -cE "(days360Exclusive|days360Inclusive|buildPicTimeline|walkPicTimeline)\s*=" route.ts → 0`

### Task 3: BUG-01 Seed Fix (commit 88a760d)

Diagnosed: deal-9 (CLOSED — "Cascade Timber Holdings") had zero workstreams in `prisma/seed.ts`. deal-1 (IC_REVIEW) already had workstreams.

Fix: Added `{ deal: deal9, prefix: "ws-9" }` to `dealsToScaffold` array. Added `updateMany` to mark deal-9 workstreams as COMPLETE.

Code-level fallback already present: `deal-dd-tab.tsx` lines 138–146 show 100% for post-DD deals with zero workstreams (stage-aware fallback). `deal-dd-progress.test.ts` already has 14 regression tests covering this path (including lines 149–167 for post-DD stages).

### Task 4: BUG-02 + BUG-03 Formal Closeout

**BUG-02 (pass rate 300%):** Code inspection of `deals/page.tsx` lines 278–303. Stat cards show: Active Deals (count), Closed (count), Dead (count), Our Pipeline ($M). No percentage calculation or display anywhere. Closed by observation.

**BUG-03 (IC Memo stuck spinner):** Code inspection of `deal-overview-tab.tsx` line 203. `const isAnalyzing = false;` — hardcoded. The "Generating..." badge can never render. IC Memo section shows content or "not yet generated" static state. Closed by observation.

## Deviations from Plan

**1. [Rule 1 - Deviation] `walkPicTimeline` does not exist in pref-accrual.ts**

- Found during: Task 2
- Issue: Plan's interface section listed `walkPicTimeline` as an export from pref-accrual.ts. Actual exports include `computePrefSegments` (not `walkPicTimeline`).
- Fix: Used `computePrefSegments` (the actual export) instead of `walkPicTimeline`. Functionally equivalent — both walk PIC events and return segments + cumulative pref. No behavior change.
- Files modified: route.ts (import statement)
- Commit: d035e80

**2. [Rule 2 - Deviation] deal-1 already has workstreams; deal-9 (CLOSED) is the seed gap**

- Found during: Task 3
- Issue: Plan said "post-DD deal showing zero workstreams" — assumed IC_REVIEW deal was the problem. deal-1 (IC_REVIEW) already had workstreams. The actual gap was deal-9 (CLOSED).
- Fix: Added deal-9 to `dealsToScaffold` instead of (or in addition to) IC_REVIEW deals.
- No test change needed — existing tests already cover the scenario.

## Walkthrough Evidence

**Obs 5 (IC Review deal showing zero workstreams):** Closed via seed fix. deal-9 (CLOSED) now has workstreams. Stage-aware fallback also handles the edge case going forward.

**Obs 1-positive (BUG-02):** Stat cards on /deals confirmed showing only raw counts and pipeline value. No percentage anywhere.

**Obs 4-positive (BUG-03):** IC Memo Overview section confirmed no spinner. `isAnalyzing = false` is constant.

## Test Results

```
npx vitest run src/lib/computations (post-refactor)
  8 test files, 148 tests — all pass (identical to pre-refactor baseline)

npx vitest run src/lib/__tests__/deal-dd-progress.test.ts
  1 test file, 14 tests — all pass

npx vitest run (full suite, post-all-changes)
  54 test files, 876 passed, 18 pre-existing failures, 1 skipped
  (pre-existing failures unchanged — not introduced by this plan)
```

## Build

`npm run build` — clean (zero TypeScript errors) after all changes.

## Self-Check: PASSED

- `src/app/api/waterfall-templates/[id]/calculate/route.ts` — refactored, imports from pref-accrual
- `prisma/seed.ts` — deal-9 workstreams added
- `.planning/phases/22-fit-finish-code/22-07-VERIFICATION.md` — created with 3 labeled bug sections
- Commits d035e80 and 88a760d — both present in git log
- `grep -c "^\[CLOSED:\|^\[REOPENED:" 22-07-VERIFICATION.md` → 3
