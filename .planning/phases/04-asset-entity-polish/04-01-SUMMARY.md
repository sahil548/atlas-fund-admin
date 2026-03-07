---
phase: 04-asset-entity-polish
plan: 01
subsystem: database, api, ui
tags: [prisma, side-letters, fee-engine, mfn, typescript, zod, swr]

# Dependency graph
requires:
  - phase: 03-capital-activity
    provides: fee-engine.ts with FeeResult type and calculateFees function

provides:
  - SideLetterRuleType enum and SideLetterRule model in Prisma schema
  - applySideLetterRules: computes fee/carry adjustments as structured line items
  - detectMFNGaps: identifies LPs with MFN rights whose terms lag entity best
  - integrateSideLetterWithFeeCalc: bridges fee engine output to side letter adjustments
  - /api/side-letters/[id]/rules: CRUD for structured rules per side letter
  - /api/side-letters/[id]/mfn: MFN gap detection endpoint
  - side-letter-rules-panel.tsx: fee adjustment preview + rule management + MFN monitoring

affects: [05-lp-portal, reporting, fee-calculation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Structured side letter rules: enum-driven ruleType with optional value (%) and description"
    - "Fee adjustments as line items: standardFee → feeDiscount → netFee visible separately"
    - "MFN gap detection: compare each MFN holder against entity-wide best terms"
    - "Side letter + rules created atomically via prisma.$transaction"

key-files:
  created:
    - src/lib/computations/side-letter-engine.ts
    - src/app/api/side-letters/[id]/rules/route.ts
    - src/app/api/side-letters/[id]/mfn/route.ts
    - src/components/features/side-letters/side-letter-rules-panel.tsx
  modified:
    - prisma/schema.prisma
    - src/lib/schemas.ts
    - src/app/api/side-letters/route.ts
    - src/app/api/side-letters/[id]/route.ts
    - src/components/features/side-letters/create-side-letter-form.tsx

key-decisions:
  - "FEE_DISCOUNT takes highest active discount if multiple rules exist — protects LP"
  - "CARRY_OVERRIDE value stored as percentage (e.g. 15 for 15%), converted to decimal inside engine"
  - "MFN gap: fee gap = currentDiscount < bestDiscount; carry gap = currentOverride > bestOverride (lower carry is better for LP)"
  - "Rules cascade-delete on SideLetter delete — no orphaned rules"
  - "Side letter + rules created in prisma.$transaction — atomic or nothing"

patterns-established:
  - "applySideLetterRules returns structured adjustments array for display-as-line-items pattern"
  - "detectMFNGaps operates at entity level, not individual side letter level"

requirements-completed: [FIN-07]

# Metrics
duration: 6min
completed: 2026-03-07
---

# Phase 04 Plan 01: Side Letter Rules Engine Summary

**Structured side letter rule engine with FEE_DISCOUNT/CARRY_OVERRIDE/MFN/CO_INVEST_RIGHTS/CUSTOM types, fee adjustment line-item display, and MFN gap detection across entity investors**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-07T23:06:21Z
- **Completed:** 2026-03-07T23:12:10Z
- **Tasks:** 2
- **Files modified:** 8 (4 created, 4 updated)

## Accomplishments

- SideLetterRuleType enum and SideLetterRule model added to Prisma schema with cascade delete
- Side letter engine computes fee adjustments as structured line items (standard fee → discount → net fee) rather than just a final number
- MFN gap detection identifies LPs with MFN rights whose fee discount or carry rate lags the entity's best available terms
- API expanded with `/rules` CRUD and `/mfn` detection endpoints
- UI shows fee adjustment preview panel and MFN gap status per investor

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema expansion + Side letter engine** - `91b1d49` (feat)
2. **Task 2: Side letter API expansion + Rules management UI** - `d28b43d` (feat)

**Plan metadata:** (created below)

## Files Created/Modified

- `prisma/schema.prisma` - Added SideLetterRuleType enum + SideLetterRule model + hasMany rules on SideLetter
- `src/lib/schemas.ts` - Added CreateSideLetterRuleSchema, UpdateSideLetterRuleSchema, SIDE_LETTER_RULE_TYPES constant
- `src/lib/computations/side-letter-engine.ts` - New: applySideLetterRules, integrateSideLetterWithFeeCalc, detectMFNGaps
- `src/app/api/side-letters/route.ts` - GET now includes rules; POST accepts optional rules array + creates in transaction
- `src/app/api/side-letters/[id]/route.ts` - GET now includes rules
- `src/app/api/side-letters/[id]/rules/route.ts` - New: GET list, POST add, DELETE remove by ruleId query param
- `src/app/api/side-letters/[id]/mfn/route.ts` - New: GET runs detectMFNGaps for the side letter's entity
- `src/components/features/side-letters/create-side-letter-form.tsx` - Expanded with per-rule toggles + value/description inputs
- `src/components/features/side-letters/side-letter-rules-panel.tsx` - New: fee adjustment preview, rule CRUD, MFN gap monitoring

## Decisions Made

- **FEE_DISCOUNT takes highest active discount** if multiple rules exist — protects LP, avoids ambiguity
- **CARRY_OVERRIDE value stored as percentage** (e.g. 15 for 15%), converted to decimal only inside engine calculations
- **MFN gap logic:** fee gap when currentDiscount < bestDiscount; carry gap when currentOverride > bestOverride (lower carry is better for LP)
- **Rules cascade-delete** on SideLetter delete — no orphaned SideLetterRule records
- **Side letter + rules created atomically** via `prisma.$transaction` — partial creates never persist

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Side letter engine is ready to be integrated into fee calculation workflow
- `integrateSideLetterWithFeeCalc` is the hook point for wiring fee engine output through side letter adjustments
- MFN detection is live — any side letter GET with `/mfn` endpoint returns gap analysis
- `SideLetterRulesPanel` component is ready to embed in investor detail pages or entity LP management views

---
*Phase: 04-asset-entity-polish*
*Completed: 2026-03-07*
