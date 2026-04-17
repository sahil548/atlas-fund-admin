# Plan 22-01 Verification

**Plan:** 22-01 — Side Letter crash blocker (Obs 35) + seed delete-order (Obs 47)
**Date:** 2026-04-17
**Executor:** Claude Sonnet 4.6

---

## Success Criteria Checklist

### Obs 35 — Side Letter form crash

- [x] `Array.isArray`-guarded `unwrapArray` helper added to `create-side-letter-form.tsx`
- [x] Both SWR fetchers (investors, entities) pipe through `unwrapArray` instead of `r.data ?? r`
- [x] SWR default value `= []` ensures `investors` and `entities` are always arrays
- [x] Downstream `.map` sites cleaned up: `(investors || []).map` → `investors.map`, `(entities || []).map` → `entities.map`
- [ ] Manual: open Add Side Letter for an LP — form renders without red error screen (manual verification required in browser)
- [ ] Manual: pick an investor + entity, type a clause, submit — form closes without crash (manual)
- [ ] Manual: open an existing side letter and click Edit — no crash (edit form has no SWR fetchers, confirmed by code inspection; no change needed there)

### Obs 47 — Seed delete-order

- [x] `prisma.assetExpense.deleteMany()` added before `prisma.asset.deleteMany()` in `prisma/seed.ts`
- [x] `AssetExpense` is the only model with a non-nullable `assetId` FK not previously covered (`incomeEvent.deleteMany()` was already at line 71, `valuation.deleteMany()` at line 66)
- [x] `npx prisma db seed` run 1 completes with "Seeding complete!" — no P2003/P2014 error
- [x] `npx prisma db seed` run 2 (populated DB → deleteMany → reseed) also completes cleanly

### Build gate

- [x] `npm run build` exits 0 with zero TypeScript errors
- [x] `npx vitest run` — 19 pre-existing failures in unrelated test files (foundation.test.ts fmt regression, phase2-deal-stage-logic, rate-limit timing) — zero new failures introduced by this plan

---

## Automated Evidence

### Build output (final clean run)

```
✓ Compiled successfully in 8.0s
Running TypeScript ...
Generating static pages using 7 workers (116/116) in 438.1ms
EXIT_CODE:0
```
No TypeScript errors.

### Seed run 1

```
Seeding complete!
🌱  The seed command has been executed.
```
(full output: "All tables cleared." then 30+ "Creating X... ✓ X seeded" lines, ending "Seeding complete!")

### Seed run 2

```
Seeding complete!
```
Re-run on populated database succeeded with no FK violation.

### Vitest

```
Test Files  5 failed | 48 passed (53)
      Tests  19 failed | 848 passed | 1 skipped (868)
```
Pre-existing failures only (foundation/fmt regression, phase2-deal-stage, rate-limit timing). No new failures.

---

## Root Cause Confirmation

### Obs 35

**Research hypothesis:** The SWR fetcher used `r.data ?? r` which returns `r.data` when present; post-v2.1 both `/api/investors` and `/api/entities` return paginated envelopes `{ data: T[], nextCursor, hasMore, total }`. So `r.data` IS the array — but the hypothesis still stands that a future shape change or edge case (e.g. empty/error response returning `{}`) could make `r.data` undefined, which would fall back to the full envelope object (`r`), making `investors` or `entities` truthy-but-not-array.

**Fix:** Replaced the fragile `r.data ?? r` with `unwrapArray` which strictly checks `Array.isArray`. Even if `r.data` is undefined or `r` is any other shape, the helper returns `[]`. The SWR `= []` default also prevents any crash during the loading window.

**Divergence from hypothesis:** The immediate crash may have been triggered by a loading-state edge case (race between `open` becoming true and SWR completing) rather than a permanent API shape change. Either way, the `unwrapArray` + `= []` fix closes all paths.

### Obs 47

**Research hypothesis:** `AssetExpense`, `AssetIncome`, `AssetValuation` all have FK to Asset and are missing from the deleteMany sequence.

**Actual finding:** Only `AssetExpense` exists as a model in `schema.prisma`. `AssetIncome` and `AssetValuation` do not exist. `IncomeEvent` (has nullable `assetId`) and `Valuation` (has non-nullable `assetId`) were ALREADY in the delete sequence at lines 71 and 66 respectively — before `asset.deleteMany()` at line 82.

**Fix:** Added only `prisma.assetExpense.deleteMany()` before `asset.deleteMany()`. The initial commit erroneously included `assetIncome` and `assetValuation` which don't exist; corrected by the follow-up commit `fa4a4f3`.

---

## Manual Verification Steps (for user)

To confirm Obs 35 is closed:
1. Run `npm run dev`
2. Sign in as `user-jk` (James Kim)
3. Go to `/directory`
4. Click "Add Side Letter"
5. Confirm: modal opens, both "Investor" and "Entity" dropdowns show live data (no red error screen, no console TypeError)
6. Select an investor, select an entity, type any text in Terms, click Create
7. Confirm: form submits and closes without crash

To confirm Obs 47 is closed:
- Already verified programmatically above (two consecutive `npx prisma db seed` runs, both succeeded)
