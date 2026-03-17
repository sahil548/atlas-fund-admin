# Phase 18 — Deferred Items

## Pre-existing TypeScript Error (Out of Scope)

**File:** `src/app/api/dashboard/alerts/route.ts`
**Status:** Untracked (never committed — pre-existing from a prior session)
**Error:** `Type error: Object literal may only specify known properties, and 'creditAgreement' does not exist in type 'CovenantWhereInput'`
**Discovered:** During Phase 18 Plan 04 final build verification
**Scope:** This file belongs to Phase 19 work (dashboard alerts API). It is outside Phase 18 scope and was not created or modified by Plan 04.
**Action required:** Fix in Phase 19 when dashboard alerts endpoint is implemented.

Note: Build was passing at the time of each Plan 04 task commit (verified via `npm run build` after tasks 1 and 2). The pre-existing untracked file only appeared in the final post-verification build.
