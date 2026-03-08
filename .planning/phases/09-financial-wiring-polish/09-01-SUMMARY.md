---
phase: 09-financial-wiring-polish
plan: 01
subsystem: financial-wiring
tags: [fee-calculation, side-letters, notifications, digest-preference]
dependency_graph:
  requires: [04-01, 03-02, 07-01]
  provides: [FIN-07, NOTIF-03]
  affects: [fees/calculate, notification-delivery]
tech_stack:
  added: []
  patterns: [side-letter-engine-integration, digest-preference-gate]
key_files:
  created: []
  modified:
    - src/app/api/fees/calculate/route.ts
    - src/lib/notification-delivery.ts
decisions:
  - "2026-03-08 (09-01): perInvestorAdjustments are informational only — base managementFee/carriedInterest on FeeCalculation unchanged; side letter adjustments stored in details JSON"
  - "2026-03-08 (09-01): Side letter integration failure wrapped in try/catch — base fee result always returned even if side letter DB query fails"
  - "2026-03-08 (09-01): Digest check placed after in-app notification creation — digest investors still receive in-app bell notification, just no email/SMS"
  - "2026-03-08 (09-01): Full batch digest processor (cron job) is out of scope for this plan — this plan ensures skip of immediate dispatch; digest emails are a future enhancement"
metrics:
  duration: 2min
  completed_date: "2026-03-08"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 09 Plan 01: Financial Wiring & Polish Summary

**One-liner:** Wired side letter engine into fee calculation API (per-investor adjustments) and enforced digest preference in notification delivery (DAILY/WEEKLY_DIGEST skips immediate email/SMS).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wire integrateSideLetterWithFeeCalc into /api/fees/calculate | 32e893f | src/app/api/fees/calculate/route.ts |
| 2 | Enforce digestPreference in deliverNotification | 42f672d | src/lib/notification-delivery.ts |

## What Was Built

### Task 1: Side Letter Integration in Fee Calculation (FIN-07)

`POST /api/fees/calculate` now calls `integrateSideLetterWithFeeCalc()` for every investor commitment on the entity. This produces a `perInvestorAdjustments` array in the response with:
- `investorId`
- `standardFee`, `feeDiscount`, `netFee` (management fee adjustments)
- `standardCarry`, `carryOverride`, `netCarry` (carried interest adjustments)
- `adjustments` array with structured line items (FEE_DISCOUNT, CARRY_OVERRIDE, MFN, CO_INVEST_RIGHTS, CUSTOM)

The adjustments are also persisted in `FeeCalculation.details` JSON for historical record. The base `managementFee` and `carriedInterest` fields on the upserted `FeeCalculation` record are NOT changed — they remain the fund-level standard fee computation as before.

A `try/catch` around the side letter loop ensures that if Prisma fails to query side letters (e.g., DB connection issue), the base fee result is returned cleanly with an empty `perInvestorAdjustments` array and an error logged to console.

### Task 2: Digest Preference Enforcement in Notification Delivery (NOTIF-03)

`deliverNotification()` now reads `pref?.digestPreference` (defaults to `"IMMEDIATE"` per schema) immediately after the `categoryEnabled` check. For `DAILY_DIGEST` or `WEEKLY_DIGEST` investors:
- The in-app `Notification` record is STILL created (same as before)
- External email/SMS dispatch is SKIPPED
- A log message is emitted: `[notification-delivery] Queued for DAILY_DIGEST -- skipping immediate external delivery for investor: {id}`
- Function returns early

For `IMMEDIATE` investors (the default): zero behavioral change — email/SMS dispatched exactly as before.

## Broken E2E Flows Closed

| Flow | Status Before | Status After |
|------|---------------|--------------|
| Side letter rule -> fee adjustment at calculation time | BROKEN (integrateSideLetterWithFeeCalc never called in API) | WIRED |
| LP digest preference -> batched notification (no immediate email/SMS) | BROKEN (deliverNotification always dispatched immediately) | WIRED |

## Deviations from Plan

None — plan executed exactly as written.

## Verification

```
grep -n "integrateSideLetterWithFeeCalc" src/app/api/fees/calculate/route.ts
# Line 7: import
# Line 106: called in loop

grep -n "digestPreference" src/lib/notification-delivery.ts
# Line 93: read from pref
# Line 94: conditional check
# Line 96: log message

npm run build → ✓ Compiled successfully (zero errors)
```

## Self-Check: PASSED

- src/app/api/fees/calculate/route.ts: EXISTS, modified with import + integration loop
- src/lib/notification-delivery.ts: EXISTS, modified with digestPreference gate
- Commit 32e893f: FOUND (feat(09-01): wire integrateSideLetterWithFeeCalc)
- Commit 42f672d: FOUND (feat(09-01): enforce digestPreference in deliverNotification)
- Build: zero errors
