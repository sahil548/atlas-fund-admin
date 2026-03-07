---
phase: 03-capital-activity
plan: 01
subsystem: api
tags: [prisma, capital-calls, distributions, line-items, transaction-chains, capital-accounts]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: computeCapitalAccount, proRataShare computation engine
  - phase: 02-deal-desk
    provides: schema foundation, entity/investor/commitment models

provides:
  - Capital call line item CRUD APIs (GET, POST, PATCH fund)
  - Distribution line item CRUD APIs (GET, POST, PATCH)
  - Capital call status workflows (DRAFT -> ISSUED -> PARTIALLY_FUNDED -> FUNDED -> OVERDUE)
  - Distribution status workflows (DRAFT -> APPROVED -> PAID)
  - Transaction chain engine (funded call -> calledAmount update -> capital account recompute)
  - Auto-generation of pro-rata line items on capital call/distribution creation
  - Phase 3 schema additions (fee config on WaterfallTemplate, distributionType/memo on DistributionEvent, navProxyConfig on Entity)

affects:
  - 03-capital-activity (all downstream plans depend on this foundation)
  - LP metrics computation (capital account roll-forward now has real data)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Capital activity engine: pure async functions imported by API routes for transaction chains"
    - "Forward-only status transitions enforced in API handlers with explicit allowlist"
    - "Pro-rata line item auto-generation on capital call/distribution creation"

key-files:
  created:
    - src/lib/capital-activity-engine.ts
    - src/app/api/capital-calls/[id]/route.ts
    - src/app/api/capital-calls/[id]/line-items/route.ts
    - src/app/api/capital-calls/[id]/line-items/[lineItemId]/route.ts
    - src/app/api/distributions/[id]/route.ts
    - src/app/api/distributions/[id]/line-items/route.ts
    - src/app/api/distributions/[id]/line-items/[lineItemId]/route.ts
  modified:
    - prisma/schema.prisma
    - src/lib/schemas.ts
    - src/app/api/capital-calls/route.ts
    - src/app/api/distributions/route.ts

key-decisions:
  - "autoGenerateLineItems defaults to true — pro-rata line items created on call/distribution creation from entity commitments"
  - "Unfunded commitment warning: warn via X-Warning response header but do NOT block the create (user decision to allow overruns)"
  - "Distribution line item updates restricted to DRAFT status only — prevents edits after approval/payment"
  - "Capital account recompute uses today's date as periodDate and upserts, so repeated triggers are idempotent"
  - "NAVComputation uses periodDate for ordering (not computedAt) since that's the actual business date"

patterns-established:
  - "Status transitions: define ALLOWED_TRANSITIONS dict; check existing status; return 400 on invalid direction"
  - "Transaction chain: capital call line item PATCH -> updateCommitmentCalledAmount -> recomputeCapitalAccountForInvestor -> updateCapitalCallStatus"
  - "Engine functions: pure async, imported by route handlers, use prisma directly"

requirements-completed: [FIN-01, FIN-02]

# Metrics
duration: 25min
completed: 2026-03-07
---

# Phase 3 Plan 01: Capital Activity Foundation Summary

**Line item CRUD APIs for capital calls and distributions with forward-only status workflows and a transaction chain engine that auto-recomputes capital accounts when calls are funded or distributions are paid**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-07T00:00:00Z
- **Completed:** 2026-03-07T00:25:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Phase 3 schema additions: fee config on WaterfallTemplate (8 new fields), distributionType/memo/waterfallCalculationId on DistributionEvent, distributionType on DistributionLineItem, navProxyConfig on Entity — DB reset + seed complete
- Six new API routes covering the full capital call and distribution line item lifecycle, with firmId filtering and try-catch on all handlers
- Capital activity engine with 4 functions: `updateCommitmentCalledAmount`, `recomputeCapitalAccountForInvestor`, `recomputeAllInvestorCapitalAccounts`, `updateCapitalCallStatus` — closes the HIGH severity gap identified in Phase 1

## Task Commits

1. **Task 1: Schema consolidation + Zod schemas for Phase 3** — `7a96118` (feat)
2. **Task 2: Capital call/distribution line item APIs + status workflows + transaction chains** — `3ea1cf8` (feat)

## Files Created/Modified

- `prisma/schema.prisma` — Added Phase 3 fields to WaterfallTemplate, DistributionEvent, DistributionLineItem, Entity
- `src/lib/schemas.ts` — Added UpdateCapitalCallSchema, CreateCapitalCallLineItemSchema, UpdateCapitalCallLineItemSchema, UpdateDistributionSchema, CreateDistributionLineItemSchema, UpdateDistributionLineItemSchema; extended Create schemas with new fields
- `src/lib/capital-activity-engine.ts` — Transaction chain engine: updateCommitmentCalledAmount, recomputeCapitalAccountForInvestor, recomputeAllInvestorCapitalAccounts, updateCapitalCallStatus
- `src/app/api/capital-calls/route.ts` — Updated POST to auto-generate pro-rata line items; added try-catch
- `src/app/api/capital-calls/[id]/route.ts` — GET detail + PATCH status transitions (DRAFT -> ISSUED -> OVERDUE; auto-computed PARTIALLY_FUNDED/FUNDED)
- `src/app/api/capital-calls/[id]/line-items/route.ts` — GET list with commitment info; POST with duplicate check, commitment validation, overfunded warning header
- `src/app/api/capital-calls/[id]/line-items/[lineItemId]/route.ts` — PATCH fund triggers full transaction chain
- `src/app/api/distributions/route.ts` — Updated POST to auto-generate pro-rata line items (grossAmount + decomposition fields split pro-rata)
- `src/app/api/distributions/[id]/route.ts` — GET detail + PATCH with status transitions; PAID triggers recomputeAllInvestorCapitalAccounts
- `src/app/api/distributions/[id]/line-items/route.ts` — GET list; POST create (DRAFT-only check removed per spec — accessible at any status)
- `src/app/api/distributions/[id]/line-items/[lineItemId]/route.ts` — PATCH update (DRAFT-only guard enforced)

## Decisions Made

- `autoGenerateLineItems` defaults to true — when creating a capital call or distribution, line items are auto-created for all investors with commitments using their pro-rata share of the call/distribution amount
- Unfunded commitment warning uses `X-Warning` response header to warn but never block the create — follows the "Warn but allow" user decision from the plan
- Distribution line item PATCH requires parent distribution to be in DRAFT status — prevents modifying amounts after approval/payment
- Capital account upsert uses today's date truncated to day as `periodDate` — repeated triggers are idempotent (same-day recomputes simply overwrite)
- NAVComputation uses `periodDate` for ordering (not `computedAt`) — correct business date ordering for unrealized gain computation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] NAVComputation field names corrected**
- **Found during:** Task 2 (capital-activity-engine.ts)
- **Issue:** Plan referred to `totalNAV` and `costBasis` fields, but actual Prisma model uses `economicNAV`, `costBasisNAV`, and `unrealizedGain`
- **Fix:** Used correct field names; added fallback to compute unrealized gain from economicNAV - costBasisNAV if unrealizedGain is null
- **Files modified:** src/lib/capital-activity-engine.ts
- **Verification:** TypeScript build passes with zero errors
- **Committed in:** 3ea1cf8 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential correction — wrong field names would cause runtime Prisma errors. No scope creep.

## Issues Encountered

- Pre-existing TypeScript error in `src/lib/computations/__tests__/waterfall.test.ts` (`beforeEach` not found) — pre-existing, out of scope, not touched

## Self-Check

- `src/lib/capital-activity-engine.ts` — EXISTS
- `src/app/api/capital-calls/[id]/route.ts` — EXISTS
- `src/app/api/capital-calls/[id]/line-items/route.ts` — EXISTS
- `src/app/api/capital-calls/[id]/line-items/[lineItemId]/route.ts` — EXISTS
- `src/app/api/distributions/[id]/route.ts` — EXISTS
- `src/app/api/distributions/[id]/line-items/route.ts` — EXISTS
- `src/app/api/distributions/[id]/line-items/[lineItemId]/route.ts` — EXISTS
- Commit `7a96118` — EXISTS (Task 1)
- Commit `3ea1cf8` — EXISTS (Task 2)
- Build: PASSED (zero errors)

## Self-Check: PASSED

## Next Phase Readiness

- Line item CRUD APIs complete — the HIGH severity gap (CapitalCallLineItem and DistributionLineItem have no endpoints) is now closed
- Transaction chain engine ready — funding a capital call line item now triggers calledAmount update + capital account recomputation
- Distribution PAID status now triggers full capital account recompute for all investors
- Phase 3 schema complete — all downstream plans in 03-capital-activity can build on this foundation without another db push --force-reset

---
*Phase: 03-capital-activity*
*Completed: 2026-03-07*
