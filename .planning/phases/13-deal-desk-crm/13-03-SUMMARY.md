---
phase: 13-deal-desk-crm
plan: 03
subsystem: ui, api
tags: [bulk-actions, kanban, deals, swr, prisma, zod]

# Dependency graph
requires:
  - phase: 13-deal-desk-crm
    provides: Deal pipeline kanban view and deal management infrastructure

provides:
  - POST /api/deals/bulk endpoint handling kill, assign, advance bulk actions
  - BulkDealActionSchema Zod schema for validation
  - Checkbox multi-select on kanban cards
  - Floating action bar with 3 bulk operation buttons
  - Bulk kill modal with kill reason picker
  - Bulk assign modal with GP team member picker
  - Bulk advance with client-side same-stage validation

affects: [deals, pipeline, crm]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bulk action bar pattern: fixed bottom-center bar appears conditionally on selection count > 0"
    - "Cross-tenant bulk security: verify all IDs belong to firmId before any updateMany"
    - "Selection clear before mutate: clear Set before SWR revalidation prevents stale state"

key-files:
  created:
    - src/app/api/deals/bulk/route.ts
  modified:
    - src/lib/schemas.ts
    - src/app/(gp)/deals/page.tsx

key-decisions:
  - "Bulk advance blocked at IC_REVIEW+: validates via VALID_ADVANCE_STAGES map on both client and server"
  - "DealActivity logged per deal in kill/advance (loop, not updateMany) to preserve unique dealId context"
  - "Bulk assign does not log DealActivity per plan spec (no activity needed for assignment changes)"
  - "Kill modal uses Select dropdown (not free text) for reason — matches existing single-kill UX"
  - "killedAt field not used in bulk kill (field does not exist in Prisma schema)"
  - "GP team members fetched from /api/users?firmId=X filtered to GP_ADMIN and GP_TEAM roles"

patterns-established:
  - "Floating action bar: fixed bottom-6, left-1/2, -translate-x-1/2, z-50, animate-in slide-in-from-bottom-4"
  - "Checkbox visibility: opacity-0 group-hover:opacity-100, always visible when anySelected"
  - "Toast error safety: typeof result.error === 'string' ? result.error : fallback message"

requirements-completed:
  - DEAL-16

# Metrics
duration: 25min
completed: 2026-03-09
---

# Phase 13 Plan 03: Bulk Deal Actions Summary

**Bulk deal actions on kanban pipeline — checkbox multi-select, floating bar, and POST /api/deals/bulk endpoint for kill/assign/advance operations**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-09T00:00:00Z
- **Completed:** 2026-03-09T00:25:00Z
- **Tasks:** 2
- **Files modified:** 3 modified, 1 created

## Accomplishments

- Built POST /api/deals/bulk route with cross-tenant security, handling all three action types
- Added checkbox selection to every kanban card with hover/selection-aware visibility
- Floating action bar slides in from bottom showing count + Kill All / Assign Lead / Advance Stage / Clear
- All bulk actions clear selection and revalidate SWR cache after success, with toast feedback

## Task Commits

1. **Task 1: Create bulk deal actions API endpoint and Zod schema** - `57769e9` (feat)
2. **Task 2: Add checkbox selection and floating action bar to kanban board** - `789c8e3` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/app/api/deals/bulk/route.ts` - POST endpoint for bulk kill, assign, advance with firmId security check
- `src/lib/schemas.ts` - Added BulkDealActionSchema (dealIds array, action enum, killReason, assignLeadId, firmId)
- `src/app/(gp)/deals/page.tsx` - Checkbox multi-select on kanban cards + floating action bar + bulk modals

## Decisions Made

- Used `Partial<Record<DealStage, DealStage>>` typed map for valid stage transitions to satisfy TypeScript's Prisma enum requirements
- `killedAt` field removed from bulk kill — field does not exist in the Prisma Deal schema (only killReason, killReasonText, previousStage exist)
- Kill modal uses dropdown select (not free text) to match existing single-kill modal UX
- GP team members for assign filtered to GP_ADMIN and GP_TEAM roles from /api/users endpoint
- No DealActivity logged for bulk assign (per plan spec — optional at Claude's discretion, kept clean)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed killedAt from bulk kill updateMany**
- **Found during:** Task 1 (API endpoint implementation)
- **Issue:** Plan spec used `killedAt: new Date()` in updateMany but the Prisma Deal model has no `killedAt` field
- **Fix:** Removed `killedAt` from the updateMany data payload; only `stage` and `killReason` are updated
- **Files modified:** src/app/api/deals/bulk/route.ts
- **Verification:** TypeScript tsc --noEmit passes, build succeeds
- **Committed in:** 57769e9 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed DealStage type mismatch on advance updateMany**
- **Found during:** Task 1 (TypeScript build verification)
- **Issue:** `VALID_ADVANCE_STAGES` typed as `Record<string, string>` caused type error on `prisma.deal.updateMany({ data: { stage: nextStage } })` — Prisma expects `DealStage` enum not `string`
- **Fix:** Typed map as `Partial<Record<DealStage, DealStage>>` and imported `DealStage` from `@prisma/client`
- **Files modified:** src/app/api/deals/bulk/route.ts
- **Verification:** TypeScript passes, build succeeds
- **Committed in:** 57769e9 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs caught during TypeScript verification)
**Impact on plan:** Both fixes essential for schema correctness. No scope creep.

## Issues Encountered

- Next.js build lock conflicts during first few build attempts (stale `.next/lock` file from a previous process) — resolved by removing lock file with `rm -f .next/lock` and retrying

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Bulk deal actions fully operational end-to-end
- /api/deals/bulk handles kill, assign, and advance with security, validation, and audit logging
- Kanban board now supports multi-select workflow for high-volume pipeline management
- Ready to continue with remaining Phase 13 plans (contact management, notes, CRM views)

---
*Phase: 13-deal-desk-crm*
*Completed: 2026-03-09*
