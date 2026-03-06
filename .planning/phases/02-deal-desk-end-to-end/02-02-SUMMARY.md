---
phase: 02-deal-desk-end-to-end
plan: 02
subsystem: ui
tags: [wizard, validation, inline-edit, kill-deal, revive-deal, pipeline, closing-checklist, counterparty]

# Dependency graph
requires:
  - phase: 02-deal-desk-end-to-end
    plan: 01
    provides: "Schema fields (killReason, killReasonText, previousStage, participationStructure), KillDealSchema with reason"
provides:
  - "Enhanced CreateDealWizard with inline validation, participation structure, deal lead defaults, counterparty inline creation, document requirement"
  - "Reliable InlineEditField with double-save prevention, error toast, textarea newline support"
  - "KillDealModal with required reason dropdown and free text"
  - "reviveDeal() engine function restoring deal to previous stage"
  - "REVIVE action on PATCH /api/deals/[id]"
  - "Closing checklist progress on pipeline Closing column cards"
  - "Kill reason badges on dead deal cards in pipeline modal"
affects: [02-03, 02-04, 02-05, 02-06, 02-07]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Counterparty inline creation via Add New Company option", "justSavedRef pattern for preventing blur-after-Enter double-save"]

key-files:
  created:
    - "src/components/features/deals/kill-deal-modal.tsx"
  modified:
    - "src/components/features/deals/create-deal-wizard.tsx"
    - "src/components/features/deals/inline-edit-field.tsx"
    - "src/lib/deal-stage-engine.ts"
    - "src/app/api/deals/[id]/route.ts"
    - "src/app/(gp)/deals/[id]/page.tsx"
    - "src/app/(gp)/deals/page.tsx"
    - "src/app/api/deals/route.ts"

key-decisions:
  - "Step 2 document requirement enforced via toast error, not blocking navigation from Step 1 to Step 2"
  - "Counterparty inline creation creates COUNTERPARTY type company by default"
  - "Textarea Enter inserts newline (natural behavior), Ctrl+Enter saves -- blur also saves"
  - "InlineEditField keeps edit mode open on save failure so user doesn't lose input"
  - "Revive deal restores to previousStage or falls back to SCREENING if no previousStage recorded"

patterns-established:
  - "justSavedRef + savingRef pattern: prevents double-save from Enter then blur in InlineEditField"
  - "Inline company creation: Select with __NEW__ sentinel value triggers inline form"

requirements-completed: [DEAL-01, DEAL-05, DEAL-09]

# Metrics
duration: 5min
completed: 2026-03-06
---

# Phase 2 Plan 02: Wizard Polish, Inline Edit, Kill/Revive Summary

**Enhanced deal creation wizard with inline validation and counterparty creation, fixed InlineEditField double-save bug, and built kill/revive deal flow with required reasons and pipeline UI**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-06T06:19:24Z
- **Completed:** 2026-03-06T06:25:23Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- CreateDealWizard now shows inline red error text under each invalid field plus a toast summary, includes Participation Structure dropdown, defaults deal lead to current user, supports counterparty inline creation, and requires at least 1 document on Step 2
- InlineEditField prevents double-save from Enter+blur sequence via savingRef/justSavedRef guards, shows toast error on save failure (safe string check prevents React crash), and allows textarea newline with Enter (only blur or Ctrl+Enter saves)
- Kill deal now requires a reason (Pricing, Risk, Timing, Sponsor, Other) via KillDealModal, stores previousStage for revive, and shows reason on dead deal banner
- Revive deal restores to the stage the deal was in when killed, clears all kill metadata
- Pipeline Closing column cards show closing checklist progress %, dead deal modal cards show kill reason badges

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance Create Deal Wizard** - `8109015` (feat)
2. **Task 2: Fix InlineEditField reliability** - `1da111f` (fix)
3. **Task 3: Kill/revive deal with reasons + Dead Deals UI** - `956e191` (feat)

## Files Created/Modified
- `src/components/features/deals/create-deal-wizard.tsx` - Added participation structure, inline validation, counterparty creation, deal lead default, document requirement
- `src/components/features/deals/inline-edit-field.tsx` - Fixed double-save, added error toast, textarea newline behavior
- `src/components/features/deals/kill-deal-modal.tsx` - New modal with reason dropdown and free text
- `src/lib/deal-stage-engine.ts` - Updated killDeal() signature, added reviveDeal()
- `src/app/api/deals/[id]/route.ts` - KILL validates with KillDealSchema, added REVIVE action
- `src/app/(gp)/deals/[id]/page.tsx` - KillDealModal, revive button on dead banner, kill reason display
- `src/app/(gp)/deals/page.tsx` - Closing checklist progress on pipeline cards, kill reason badges on dead deals
- `src/app/api/deals/route.ts` - Added closingChecklist include for pipeline progress display

## Decisions Made
- Step 2 document requirement enforced via toast error (not blocking Step 1 -> Step 2 navigation) -- user can browse Step 2 and understand what's needed before adding docs
- Counterparty inline creation defaults to COUNTERPARTY company type -- most common use case for new companies during deal creation
- InlineEditField keeps edit mode open on save failure -- prevents user from losing their typed input when API errors occur
- Revive deal falls back to SCREENING if no previousStage recorded -- handles edge case of deals killed before the previousStage field existed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree missing 02-01 schema changes**
- **Found during:** Pre-execution setup
- **Issue:** Worktree branch was behind main -- missing all Phase 2 schema additions (killReason, killReasonText, previousStage fields)
- **Fix:** Merged main into worktree (fast-forward)
- **Verification:** Schema fields confirmed present after merge
- **Impact:** None -- fast-forward merge, no conflicts

**2. [Rule 2 - Missing Critical] Added closingChecklist to deals list API**
- **Found during:** Task 3 (pipeline closing progress)
- **Issue:** GET /api/deals did not include closingChecklist data -- pipeline cards could not show closing progress
- **Fix:** Added `closingChecklist: { select: { id: true, status: true } }` to the deals list query include
- **Files modified:** src/app/api/deals/route.ts
- **Verification:** Build passes, closingChecklist data available for pipeline progress calculation

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both necessary for correct operation. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Wizard, inline edit, and kill/revive are complete and build-verified
- Deal overview dashboard redesign (Plan 02-03) can proceed
- DD workstream interactive features (Plan 02-04) can proceed
- IC decision structures (Plan 02-05) can proceed

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 02-deal-desk-end-to-end*
*Completed: 2026-03-06*
