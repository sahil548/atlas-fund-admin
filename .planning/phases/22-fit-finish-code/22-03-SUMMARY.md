---
phase: 22-fit-finish-code
plan: "03"
subsystem: lp-portal
tags: [fin-12, lp-obs-2, capital-account, distributions, reconciliation, seed]
requirements: [FIN-12]
walkthrough_items: [LP-Obs-2]

dependency_graph:
  requires: []
  provides: [reconciled-lp-capital-account, distribution-breakdown-api, category-sum-test-invariant]
  affects: [lp-account-page, capital-account-api, seed-data]

tech_stack:
  added: []
  patterns:
    - distributionBreakdown field on EntitySummary (ROC / income / LTG subcategories)
    - Breakdown rows conditionally rendered in lp-account display when totalDistributed > 0
    - Server-side clamp with warning log if breakdown sum drifts > 1 cent from totalDistributed
    - ProRata seed pattern for entity2 historical distributions across all committed investors

key_files:
  created:
    - .planning/phases/22-fit-finish-code/22-03-VERIFICATION.md
  modified:
    - prisma/seed.ts
    - src/app/api/investors/[id]/capital-account/route.ts
    - src/app/(lp)/lp-account/page.tsx
    - src/app/api/lp/__tests__/capital-account.test.ts

decisions:
  - "Seed data mismatch (not asset-layer cascade): Wellington's DLIs referenced entity1/entity8, not his committed funds — entity2 historical dists had no per-investor DLIs at all"
  - "Fix adds DLIs for all entity2 investors on dist-h2, dist-h6, dist-h12 using actual commitment-weighted proRata (25M/297M = 8.42% for Wellington)"
  - "Asset-layer cascade (Obs 20 thesis) does NOT apply here — 22-04 proceeds independently"
  - "Breakdown uses ROC + income + LTG (carry excluded: stays with GP, not in LP netAmount)"
  - "Display shows breakdown rows only when at least one entity has non-zero totalDistributed and distributionBreakdown present"

metrics:
  duration: "9 minutes"
  completed_date: "2026-04-17"
  tasks_completed: 2
  files_modified: 4
  files_created: 1
  tests_added: 7
  tests_total: 12
---

# Phase 22 Plan 03: LP Capital Account Reconciliation Summary

**One-liner:** Seed-level DistributionLineItem mismatch caused Wellington to see $0 distributions; fixed by adding proRata entity2 DLIs and a ROC/income/LTG breakdown in the API and display.

---

## What Was Built

LP-Obs 2 (Tom Wellington capital account gap) closed. Three layers fixed:

**1. Seed data (prisma/seed.ts)**
Added 15 new `DistributionLineItem` records for all entity2 investors (investor1–investor5) across the three PAID historical distributions for entity2 (dist-h2, dist-h6, dist-h12). Previously these `DistributionEvent` records had no per-investor line items, so every investor with entity2 commitments showed $0 distributions.

Wellington (investor-3, 8.42% proRata of entity2's 297M total) now receives:
- dist-h2 (Helix Therapeutics partial exit): net $606,060 (ROC $252,525 + LTG $353,535)
- dist-h6 (CloudBase Q3 dividend): net $294,613 (pure income)
- dist-h12 (FreshRoute Logistics full exit): net $1,136,363 (ROC $420,875 + LTG $715,488)
- **Total Wellington entity2: ~$2,037,036**

**2. API route (capital-account/route.ts)**
`EntitySummary` now includes `distributionBreakdown: { returnOfCapital, income, longTermGain }`. Computed by aggregating subcategory fields from all PAID `DistributionLineItem` records per entity. A server-side invariant clamps the breakdown to `totalDistributed` within 1-cent float tolerance and logs a warning if drift is detected.

**3. Display (lp-account/page.tsx)**
The capital account statement now renders breakdown rows (Return of Capital / Income / Yield / Long-Term Gain) above "Total Distributions" when `totalDistributed > 0` and the API returns subcategory data. Breakdown rows are conditionally included — LPs with $0 distributions see no extra rows.

**4. Tests (capital-account.test.ts)**
7 new tests added under `"FIN-12 LP-Obs 2 — capital account reconciliation"` describe block. Tests use synthetic EntitySummary fixtures (pure functions — no Prisma dependency). Covers: zero distributions, pure income, mixed ROC+LTG, CalPERS entity1, absent breakdown, all seeded LP fixtures, float rounding. All 12 tests in the file pass.

---

## Diagnostic Record (LP-Obs 2)

**Bucket: C (missing categories) + Seed data mismatch**

The walkthrough observation "$14M total vs $8M breakdown" traced to:
1. Wellington's existing DLIs (dli-1-3, dli-2-3, dli-4-3, dli-3-3) reference entity1 and entity8 — funds he has no commitment to
2. The API correctly filters to committed entities (entity2, entity3, entity7)
3. Entity2's three PAID historical distributions had no per-investor DLIs for any investor

Result: Wellington's API call returned $0 distributions. The display also had no breakdown rows at all — only "Total Distributions." Both issues are now resolved.

The asset-layer cascade predicted by Obs 20 does NOT apply. The gap was purely a seed data authoring error, not an upstream asset income/expense data quality issue.

---

## Deviations from Plan

**[Rule 2 - Missing critical data] Added entity2 DLIs for ALL investors, not just Wellington**

- **Found during:** Task 2 (seed fix)
- **Issue:** dist-h2, dist-h6, dist-h12 had no DLIs for any entity2 investor — all 5 investors (inv1, inv2, inv3, inv4, inv5) would show $0 entity2 distributions
- **Fix:** Added 15 DLIs (5 investors × 3 distributions) using commitment-weighted proRata
- **Files modified:** prisma/seed.ts
- **Rationale:** Correct data for all investors, not just the blocker LP

**Pre-existing misplaced DLIs preserved (dli-1-3, dli-2-3, dli-4-3, dli-3-3)**

Wellington's existing DLIs reference entity1/entity8. These were left in place (removing them would be destructive and they may serve other test purposes). They are correctly excluded by the API's entity filter.

---

## Evidence

LP-Obs 2 explicitly closed: Tom Wellington receives ~$2.04M in entity2 distributions (dist-h2 + dist-h6 + dist-h12), displayed with ROC/income/LTG breakdown rows that sum exactly to the "Total Distributions" figure. The API's `distributionBreakdown` invariant is enforced server-side and validated by 7 new unit tests.

---

## Self-Check: PASSED

- FOUND: `.planning/phases/22-fit-finish-code/22-03-VERIFICATION.md`
- FOUND: `.planning/phases/22-fit-finish-code/22-03-SUMMARY.md`
- FOUND: commit da15735 (Task 1 diagnostic)
- FOUND: commit f4c57b1 (test: invariant tests)
- FOUND: commit 19d4882 (feat: fix applied)
- Tests: 12 passed, 0 failed
- Build: compiled successfully, 0 TypeScript errors in changed files
