---
status: complete
phase: 09-financial-wiring-polish
source: [09-01-SUMMARY.md, 09-02-SUMMARY.md]
started: 2026-03-08T09:00:00Z
updated: 2026-03-08T09:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Fee Calculation with Side Letter Adjustments
expected: Navigate to an entity with investor commitments. Trigger a fee calculation. The API response includes `perInvestorAdjustments` with per-investor side letter fee discounts and carry overrides. Base fund-level fees unchanged.
result: pass

### 2. Fee Calculation Without Side Letters (Backward Compatible)
expected: For an entity/investor with no side letters, fee calculation works identically to before — no errors, `perInvestorAdjustments` returns as empty array.
result: pass

### 3. Notification Delivery — Digest Preference Skips Email
expected: An LP investor with `digestPreference` set to DAILY_DIGEST or WEEKLY_DIGEST still receives in-app bell notifications, but email/SMS is NOT dispatched immediately. Console log shows "Queued for DAILY_DIGEST -- skipping immediate external delivery".
result: pass

### 4. Notification Delivery — Immediate Preference Unchanged
expected: An LP investor with IMMEDIATE digest preference (the default) receives notifications exactly as before — in-app notification AND email/SMS dispatched.
result: pass

### 5. Plaid Bank Balance Card on Entity Detail
expected: Navigate to an entity detail page. If the entity has a Plaid connection, a "Bank Accounts" card appears in the Overview tab showing account name, type/subtype, current balance, and available balance with a green "Connected" badge. If no Plaid connection, no card is visible.
result: pass

### 6. Waterfall Tests Pass
expected: Run `npx vitest run src/lib/computations/__tests__/waterfall.test.ts` — all 13 tests pass with no TypeScript errors.
result: pass

### 7. Deal DD Tab Renders Without Errors
expected: Open a deal in Due Diligence stage. The DD tab renders workstreams, tasks, and screening results without any console errors or blank sections.
result: pass

### 8. Deal Overview Tab Renders Without Errors
expected: Open any deal's Overview tab. All fields (asset class, screening memo, deal lead, etc.) render correctly without console errors.
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
