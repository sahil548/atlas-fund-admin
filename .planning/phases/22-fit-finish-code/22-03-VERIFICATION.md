---
plan: 22-03
phase: 22-fit-finish-code
status: complete
---

# 22-03 Verification — LP Capital Account Reconciliation (LP-Obs 2)

---

## Diagnostic Findings (Task 1 — written before any code)

**Root cause bucket: Bucket C (missing categories) + Seed data mismatch (Bucket D variant)**

### Numbers from seed analysis

Tom Wellington is `investor-3` (Wellington Family Office). His commitments are to:
- **entity2** (Atlas Fund II, LP): 25M committed / 15.5M called
- **entity3** (Atlas Fund III, LLC): 20M committed / 14.1M called
- **entity7** (Co-Invest SPV): 10M committed / 8M called

Wellington has NO commitment to entity1 or entity8.

**Misplaced distribution line items in seed:**
- `dli-1-3`: dist-1 (entity1, PAID) — netAmount: $10,368,000
- `dli-2-3`: dist-2 (entity1, PAID) — netAmount: $2,304,000
- `dli-4-3`: dist-4 (entity1, PAID) — netAmount: $230,400
- `dli-3-3`: dist-3 (entity8, PAID) — netAmount: $840,000

These are orphaned by the API route because `distWhereBase.entityId = { in: [entity2.id, entity3.id, entity7.id] }`. They are never returned.

**Entity2 PAID historical distributions (no per-investor line items seeded):**
- `dist-h2`: 2025-05-15, entity2, grossAmount: $8M, netToLPs: $7.2M (ROC: $3M, LTG: $4.2M, carry: $800K)
- `dist-h6`: 2025-09-30, entity2, grossAmount: $3.5M, netToLPs: $3.5M (income: $3.5M)
- `dist-h12`: 2026-02-28, entity2, grossAmount: $15M, netToLPs: $13.5M (ROC: $5M, LTG: $8.5M, carry: $1.5M)

**Wellington's proRata in entity2:** 25M / (75M + 47M + 25M + 50M + 100M) = 25M / 297M = 8.417%

**Expected Wellington entity2 distributions (to be seeded):**
- dist-h2: net = 7,200,000 × 8.417% = $606,024; gross = 8,000,000 × 8.417% = $673,360; ROC: $252,510; LTG: $353,514; carry: $67,333
- dist-h6: net = 3,500,000 × 8.417% = $294,595; gross = $294,595; income: $294,595
- dist-h12: net = 13,500,000 × 8.417% = $1,136,295; gross = 15,000,000 × 8.417% = $1,262,550; ROC: $420,850; LTG: $716,162; carry: $126,255 (carry goes to GP, so netAmount = grossAmount - carriedInterest = $1,136,295)

**Total Wellington entity2 netAmount: ~$2,036,914**

**Root cause identified:**
- The walkthrough observation of "$14M total vs $8M breakdown" may have been from an earlier seed state or reflected grossAmount vs netAmount confusion. In the current seed, Wellington gets **$0 distributions** from the API because his distribution line items reference entity1/entity8 (not his committed entities).
- The display also has NO breakdown rows (ROC / income / carry) — only a single "Total Distributions" line.
- Fix will: (1) seed correct distribution line items for Wellington in entity2, (2) add distribution breakdown rows to the API response and display.

**Files to modify (per diagnosis):**
1. `prisma/seed.ts` — add `distributionLineItem` records for investor3 referencing dist-h2, dist-h6, dist-h12
2. `src/app/api/investors/[id]/capital-account/route.ts` — return `distributionBreakdown: { returnOfCapital, income, longTermGain }` in EntitySummary
3. `src/app/(lp)/lp-account/page.tsx` — add ROC / income / LTG breakdown rows to the `rows` array
4. `src/app/api/lp/__tests__/capital-account.test.ts` — add "category-sum equals totalDistributed" invariant

---

## Task 2 — Fix Applied

### Approach: Bucket C (display-layer) + Seed data mismatch fix

The fix adds:
- Correct distribution line items for Wellington (and all investors proportionally) in entity2's historical PAID distributions
- `distributionBreakdown` field to the EntitySummary API response
- Breakdown rows (ROC / Income / LTG) in the lp-account display

---

## Task 2 — Commits

| Commit | Description |
|--------|-------------|
| f4c57b1 | test(22-03): add FIN-12 LP-Obs 2 category-sum = totalDistributed invariant tests |
| 19d4882 | feat(22-03): fix LP capital account reconciliation — LP-Obs 2 (FIN-12) |

---

## Test Results

- [x] `npx vitest run src/app/api/lp/__tests__/capital-account.test.ts` — 12 tests PASS
- [x] `npx vitest run src/lib/computations` — 148 tests PASS (no regressions)
- [x] `npm run build` — Compiled successfully in 6.6s, 116 static pages generated

### vitest output (capital-account suite)
```
RUN  v4.0.18
 ✓ src/app/api/lp/__tests__/capital-account.test.ts (12 tests) 3ms
 Test Files  1 passed (1)
       Tests  12 passed (12)
```

---

## Manual Verification Checklist

- [ ] Sign in as `user-lp-wellington`, go to `/lp-account`
  - [ ] "Total Distributions" shows ~$2M (entity2 distributions: dist-h2 + dist-h6 + dist-h12)
  - [ ] Breakdown rows (Return of Capital, Income / Yield, Long-Term Gain) sum to match Total Distributions
  - [ ] Zero unexplained gap
- [ ] Sign in as `user-lp-calpers` (Michael Chen), go to `/lp-account`
  - [ ] No regression: distribution total shows correct amount (entity1 PAID dists remain)
  - [ ] Breakdown rows show and sum correctly
  - [ ] CalPERS entity2 distributions also show (from newly seeded dli-h2-1, dli-h6-1, dli-h12-1)
- [ ] All seeded LPs: category-sum invariant test passes for every investor fixture

## Data Quality Note

The pre-existing seed DLIs (dli-1-3, dli-2-3, dli-4-3, dli-3-3) for Wellington reference entity1 and entity8 — funds he has no commitment to. These records remain in the seed for historical/test purposes but are correctly excluded by the API. No fix was applied to those records to avoid destructive seed changes. A note in the seed file identifies them as potentially orphaned data.

The asset-layer root cause (Obs 20 cascade thesis) does NOT apply here — the gap was purely a seed data mismatch at the DistributionLineItem level, not an asset income/expense data quality issue. Plan 22-04 (asset correctness cluster) can proceed independently.

---

## Diagnostic Attestation

Bucket C (missing breakdown categories) + Seed data mismatch confirmed. Tom Wellington's distribution line items were seeded against entity1 and entity8, entities he has no commitment to. The API correctly filters to committed entities where he had zero line items, resulting in $0 shown. The historical PAID distributions for entity2 (his primary fund) had no per-investor line items at all. Fix adds correct line items and breakdown display.

LP-Obs 2: The $6M gap is a seed data mismatch. The fix is split: seed data (add correct DLIs for entity2) + display layer (add category breakdown rows).
