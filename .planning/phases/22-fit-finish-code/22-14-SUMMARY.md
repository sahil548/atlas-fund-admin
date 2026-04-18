---
plan: "22-14"
status: complete
completed: 2026-04-17
---

# Plan 22-14 — SUMMARY

**One-liner:** Projected metrics JSON blob now editable in Add/Edit Asset with per-kind fields (RE: cap rate + cash-on-cash; PC: YTM + current yield; OP: revenue multiple + EBITDA multiple). Schema/API was already there; UI just didn't touch it until now.

## What shipped

- `CreateAssetSchema` accepts `projectedMetrics: ProjectedMetricsSchema.optional()`.
- POST `/api/assets` persists the blob as Prisma `InputJsonValue`.
- Both Add and Edit Asset render a new "Projected Metrics" fieldset after the type-conditional section. Fields switch on detected kind.
- Edit form prefills from existing blob; submit scopes payload to current kind.
- LP Interest kind intentionally has no fields (schema has no LP-specific projection scalars).

## Evidence

- `npm run build` PASSED, 116/116 pages, zero TS errors.
- Browser verification queued — to be exercised against `atlas-fund-admin.vercel.app` once Vercel deploy completes.

## Known follow-up (remaining punch list)

- #7 type-conditional string-field range validation (Cap Rate as string means no numeric range check) — still deferred; bigger refactor.
- #8 end-to-end integrity loop (change cost basis → cascade into NAV / LP statements) — Kathryn / Phase 23.
