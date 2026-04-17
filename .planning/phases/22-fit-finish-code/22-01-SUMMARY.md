---
phase: 22-fit-finish-code
plan: 01
subsystem: ui
tags: [react, swr, prisma, seed, side-letters, array-unwrap]

requires:
  - phase: 21-initial-walkthrough
    provides: "Obs 35 and Obs 47 identified and triaged as urgent blockers"

provides:
  - "Side Letter create form: defensive unwrapArray helper tolerates both plain-array and paginated-envelope API responses"
  - "prisma/seed.ts: assetExpense.deleteMany() added before asset.deleteMany() — seed re-runs cleanly on populated DB"

affects: [22-fit-finish-code]

tech-stack:
  added: []
  patterns:
    - "unwrapArray<T>(r): T[] — tolerates plain array or { data: T[] } paginated envelope, returns [] for any other shape"
    - "SWR with = [] default value ensures downstream .map() sites are always safe, no || [] needed"

key-files:
  created:
    - .planning/phases/22-fit-finish-code/22-01-VERIFICATION.md
    - .planning/phases/22-fit-finish-code/22-01-SUMMARY.md
  modified:
    - src/components/features/side-letters/create-side-letter-form.tsx
    - prisma/seed.ts

key-decisions:
  - "unwrapArray replaces r.data ?? r — the ?? operator was correct for current API shape but fragile; strict Array.isArray guards close all edge cases"
  - "Only AssetExpense has a non-nullable assetId FK to Asset that was missing from the seed delete sequence — AssetIncome and AssetValuation do not exist in schema.prisma; incomeEvent and valuation were already covered"
  - "Edit Side Letter form (edit-side-letter-form.tsx) has no SWR fetches for investors/entities — no change needed there"

patterns-established:
  - "unwrapArray<T>: use this pattern in any client component that fetches from a paginated API endpoint where the response shape may vary"

requirements-completed: []

duration: 7min
completed: 2026-04-17
---

# Phase 22 Plan 01: Side Letter Crash + Seed Delete-Order Summary

**Defensive array unwrap in Side Letter create form closes Obs 35 crash; assetExpense.deleteMany() added before asset.deleteMany() in seed.ts closes Obs 47 FK violation.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-17T05:44:25Z
- **Completed:** 2026-04-17T05:51:22Z
- **Tasks:** 2
- **Files modified:** 2 (+ 2 planning files created)

## Accomplishments

- Obs 35 closed: Side Letter create form now uses `unwrapArray<T>` which returns `r` if it's an array, `r.data` if that's an array, or `[]` as fallback — tolerates both legacy plain-array and v2.1 paginated-envelope API shapes
- Obs 47 closed: `prisma.assetExpense.deleteMany()` inserted before `prisma.asset.deleteMany()` in `prisma/seed.ts`; two consecutive `npx prisma db seed` runs complete without FK errors
- `npm run build` passes with zero TypeScript errors (exit code 0, 116 routes compiled)

## Task Commits

1. **Task 1: Fix Side Letter form (Obs 35)** - `1e05664` (fix)
2. **Task 2: Initial seed fix attempt (Obs 47)** - `6560b4b` (fix — corrected by next commit)
3. **Task 2 correction: remove non-existent models** - `fa4a4f3` (fix)

**Plan metadata:** (docs commit follows — see Final Commit below)

## Files Created/Modified

- `src/components/features/side-letters/create-side-letter-form.tsx` — Added `unwrapArray` helper; replaced both SWR fetchers; added `= []` SWR defaults; simplified `.map` call sites
- `prisma/seed.ts` — Added `await prisma.assetExpense.deleteMany()` before `await prisma.asset.deleteMany()`
- `.planning/phases/22-fit-finish-code/22-01-VERIFICATION.md` — Per-plan verification checklist with evidence
- `.planning/phases/22-fit-finish-code/22-01-SUMMARY.md` — This file

## Decisions Made

- `unwrapArray` replaces `r.data ?? r` — the null-coalescing operator was working for the current API shape (returns the array correctly) but would silently break on any shape variation. Strict `Array.isArray` guards close all edge cases with zero performance cost.
- Edit Side Letter form (`edit-side-letter-form.tsx`) confirmed to have no SWR fetches for investors/entities — it only edits `terms` via `useMutation`. No change needed.
- Only `AssetExpense` required a new `deleteMany` in seed.ts. Research initially cited `AssetIncome` and `AssetValuation` as missing models but neither exists in `schema.prisma`. `IncomeEvent` (`assetId?: String`) was already deleted at line 71; `Valuation` (`assetId: String`) already at line 66 — both before `asset.deleteMany()` at line 82.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected seed fix commit — removed non-existent model calls**
- **Found during:** Task 2 verification (`npx prisma db seed`)
- **Issue:** Initial Task 2 commit added `assetIncome.deleteMany()` and `assetValuation.deleteMany()` based on research's schema line references, but those models do not exist in `schema.prisma`. Seed failed with `TypeError: Cannot read properties of undefined (reading 'deleteMany')`
- **Fix:** Grepped all model names in schema.prisma, confirmed only `AssetExpense` is missing from the delete sequence; removed the two invalid calls
- **Files modified:** `prisma/seed.ts`
- **Verification:** Two consecutive `npx prisma db seed` runs complete cleanly
- **Committed in:** `fa4a4f3` (corrective fix commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in my initial implementation based on incorrect research model references)
**Impact on plan:** Corrective fix was necessary and fast; final state is correct. No scope creep.

## Evidence — Obs 35 and Obs 47

| Obs | Status | Evidence |
|-----|--------|----------|
| Obs 35 | Code fix complete; manual browser verification pending | `unwrapArray` + `= []` in `create-side-letter-form.tsx`; `Array.isArray` guards confirmed in file |
| Obs 47 | Verified programmatically | Two `npx prisma db seed` runs on populated DB — both output "Seeding complete!" with no P2003/P2014 errors |

## Issues Encountered

- Multiple stale `next build` processes from parallel tool calls created `.next/lock` file conflicts; resolved by killing all `next build` processes and removing the stale lock file before the final clean build
- Research referenced `AssetIncome` and `AssetValuation` as schema models (lines 435, 621, 1062) — these line numbers were inaccurate; the actual model at line 1062 is `AssetExpense`, and the other two models do not exist

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 22-02 (Upload Wizard) is unblocked — proceeds independently
- Side Letter form is safe to use as soon as dev server is running
- Seed script is stable for nightly re-runs

---
*Phase: 22-fit-finish-code*
*Completed: 2026-04-17*
