# 22-07 Verification Record

**Plan:** 22-07 — Waterfall Route Refactor + FIN-08 Bug Closeout
**Date:** 2026-04-16
**Executor:** Claude Sonnet 4.6

---

## FIN-02 — Waterfall Route Refactor

### Baseline (pre-refactor)

```
npx vitest run src/lib/computations
Test Files: 8 passed (8)
Tests:      148 passed (148)
```

Inlined functions recorded at:
- `days360Exclusive` — lines 221–231 of route.ts
- `days360Inclusive` — lines 236–239 of route.ts
- `type PicEvent` — lines 328–333 of route.ts
- Inline PIC walk loop — lines 334–401 of route.ts

### Post-Refactor

**Grep check (zero local definitions):**
```
grep -cE "(days360Exclusive|days360Inclusive|buildPicTimeline|walkPicTimeline)\s*=" \
  src/app/api/waterfall-templates/[id]/calculate/route.ts
→ 0
```

**Import check (imports present):**
```typescript
import {
  days360Exclusive,
  days360Inclusive,
  buildPicTimeline,
  computePrefSegments,
  type PicEvent,
  type ContributionTranche,
  type RocDistribution,
} from "@/lib/computations/pref-accrual";
```

**Test count preserved:**
```
npx vitest run src/lib/computations
Test Files: 8 passed (8)
Tests:      148 passed (148)  // identical to baseline
```

**Build:** `npm run build` — clean (zero TypeScript errors)

**Commit:** d035e80 — refactor(22-07): FIN-02 waterfall route imports pref math from pref-accrual.ts

---

## FIN-08 — March-5 Bug Formal Closeout

### BUG-01 — DD tab zero workstreams on post-DD deals (Obs 5)

[CLOSED: seed gap fixed — added dDWorkstream records for deal-9 (CLOSED stage) in prisma/seed.ts; all post-DD stage deals now have workstream history; stage-aware 100% fallback already in place for edge cases]

**Root cause diagnosis:**
- deal-1 (IC_REVIEW): already had workstreams seeded (ws-1-1 through ws-1-6) — no gap here
- deal-9 (CLOSED — "Cascade Timber Holdings"): had ZERO workstreams in seed — confirmed seed gap
- deal-11 (CLOSING): already had workstreams seeded (ws-11-1 through ws-11-8) — no gap here
- deal-stage-engine.ts confirmed: no `deleteMany` on dDWorkstream when advancing stages — code does NOT delete workstreams

**Fix applied:**
- Added `{ deal: deal9, prefix: "ws-9" }` to `dealsToScaffold` in `prisma/seed.ts`
- Added `updateMany` to mark deal-9 workstreams as COMPLETE (status=COMPLETE, completedTasks=5, totalTasks=5) — deal is CLOSED so DD was completed
- Code-level fallback (stage-aware 100% for post-DD deals with zero workstreams) already present in deal-dd-tab.tsx lines 138–146; regression tests already in deal-dd-progress.test.ts lines 149–167

**Evidence:**
- Seed executed successfully: `npx prisma db seed` — exit 0
- Regression tests: `npx vitest run src/lib/__tests__/deal-dd-progress.test.ts` → 14 passed (14)
- Build: `npm run build` — clean
- Commit: a9e3bb2 — fix(22-07): BUG-01 seed gap — add workstreams for deal-9 CLOSED stage deal

---

### BUG-02 — Pipeline pass rate 300% on /deals stat cards

[CLOSED: percentage display removed entirely — /deals stat cards show raw counts and pipeline dollar value only, no pass-rate percentage rendered anywhere]

**Verification:**
- Read `src/app/(gp)/deals/page.tsx` lines 277–303: stat cards render `analytics.totalActiveDeals`, `analytics.totalClosedDeals`, `analytics.totalDeadDeals`, `analytics.pipelineValue` — all raw numbers/dollars
- Grep confirmed: no `passRate`, `pass_rate`, `conversionRates` display in the rendered stat cards section (only defined in the `analytics` type, never rendered in JSX)
- No percentage calculation anywhere in the stat card grid
- Walkthrough finding (Obs 1): "No pass-rate percentage shown above 100%. Top stat cards display raw numbers only." — confirmed by code inspection

**Evidence:**
- Code read of deals/page.tsx lines 278–303 — zero percentage display in stat cards
- Build: `npm run build` — clean (no code change needed; bug was already resolved)

---

### BUG-03 — IC Memo stuck "Generating..." spinner on DD-stage deals

[CLOSED: spinner removed entirely — isAnalyzing is hardcoded to false in deal-overview-tab.tsx; IC Memo section shows content or "not yet generated" without any stuck spinner state]

**Verification:**
- Read `src/components/features/deals/deal-overview-tab.tsx` line 203: `const isAnalyzing = false;`
- The `isAnalyzing` flag is hardcoded false — the "Generating..." badge (line 419) can never appear
- IC Memo section renders: hasMemo ? full memo content with version history : "IC Memo not yet generated."
- No async state machine for memo generation on the overview tab; generation is done in DD tab (workstream analysis), not overview
- Walkthrough finding (Obs 4): "IC Memo visible on Overview — no stuck spinner." — confirmed by code inspection

**Evidence:**
- Code read of deal-overview-tab.tsx line 203 — `isAnalyzing = false` (constant, never true)
- Build: `npm run build` — clean (no code change needed; bug was already resolved)

---

## Grep Check (mandatory)

```bash
grep -c "^\[CLOSED:\|^\[REOPENED:" .planning/phases/22-fit-finish-code/22-07-VERIFICATION.md
# Expected: 3
```

All three bug sections begin with exactly `[CLOSED:` — three matches confirmed.
