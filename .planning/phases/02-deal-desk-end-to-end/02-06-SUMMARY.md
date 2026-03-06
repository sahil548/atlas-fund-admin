---
phase: 02-deal-desk-end-to-end
plan: 06
subsystem: api, ui
tags: [decision-structures, ic-voting, conditions, send-back, settings, prisma, zod, swr]

# Dependency graph
requires:
  - phase: 02-deal-desk-end-to-end
    plan: 01
    provides: "DecisionStructure, DecisionMember models; ICVoteRecord.conditions field; Entity.decisionStructureId"
  - phase: 02-deal-desk-end-to-end
    plan: 02
    provides: "Kill/Revive deal flow, InlineEditField improvements"
provides:
  - "Decision structures CRUD API (create, read, update, delete structures and members)"
  - "Settings page 'Decision Structures' tab with full management UI"
  - "In-app IC voting endpoint with duplicate check and conditions"
  - "sendBackToDueDiligence function in deal-stage-engine"
  - "Enhanced IC Review tab with voting panel, conditions, structure info, vote display"
  - "CastICVoteSchema, CreateDecisionStructureSchema, UpdateDecisionStructureSchema, AddDecisionMemberSchema Zod schemas"
affects: [02-07]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Decision structure CRUD with delete protection (409 if entities linked)", "In-app voting separate from final IC decision", "Conditions as optional text on votes"]

key-files:
  created:
    - "src/app/api/decision-structures/route.ts"
    - "src/app/api/decision-structures/[id]/route.ts"
    - "src/app/api/decision-structures/[id]/members/route.ts"
    - "src/app/api/deals/[id]/ic/vote/route.ts"
  modified:
    - "src/app/(gp)/settings/page.tsx"
    - "src/components/features/deals/deal-ic-review-tab.tsx"
    - "src/lib/deal-stage-engine.ts"
    - "src/lib/schemas.ts"
    - "src/app/api/deals/[id]/route.ts"

key-decisions:
  - "Separated in-app voting (individual votes) from final IC decision (existing ic-decision endpoint) -- both can coexist"
  - "Delete protection on structures: returns 409 with linked entity names instead of cascading"
  - "SEND_BACK vote auto-triggers sendBackToDueDiligence but other votes do not auto-advance deal"
  - "Deal API includes entity decisionStructure and dealEntities with structure data for IC Review tab"

patterns-established:
  - "Decision structure delete protection: check entity links before delete, return 409 with names"
  - "In-app voting: POST /api/deals/[id]/ic/vote with duplicate check (userId + icProcessId)"
  - "Conditions as display-only text: stored on ICVoteRecord, shown but not auto-creating checklist items"

requirements-completed: [DEAL-08]

# Metrics
duration: 8min
completed: 2026-03-06
---

# Phase 2 Plan 06: Decision Structures & IC Voting Summary

**Configurable IC decision structures with member management, in-app voting with conditions, and Send Back flow to return deals to Due Diligence**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-06T06:32:32Z
- **Completed:** 2026-03-06T06:40:49Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Full CRUD API for decision structures: create/edit/delete structures, add/remove members with role (VOTER/OBSERVER)
- Settings page "Decision Structures" tab: expandable list, inline member management, create/edit/delete, entity linking display
- In-app voting endpoint at /api/deals/[id]/ic/vote: duplicate vote check, conditions support, SEND_BACK triggers stage change
- Enhanced IC Review tab: voting panel with Approve/Reject/Send Back buttons, collapsible conditions textarea, vote records with conditions display, decision structure info banner
- sendBackToDueDiligence function in deal-stage-engine with activity logging and ICProcess status update

## Task Commits

Each task was committed atomically:

1. **Task 1: Decision structures API and settings UI** - `76c45cd` (feat)
2. **Task 2: In-app voting UI with conditions and Send Back flow** - `be0ca14` (feat)

## Files Created/Modified
- `src/app/api/decision-structures/route.ts` - GET (list by firmId) and POST (create structure)
- `src/app/api/decision-structures/[id]/route.ts` - GET (single), PATCH (update), DELETE (with entity link check)
- `src/app/api/decision-structures/[id]/members/route.ts` - POST (add member), DELETE (remove by userId)
- `src/app/api/deals/[id]/ic/vote/route.ts` - POST (cast vote with optional conditions, duplicate check, SEND_BACK trigger)
- `src/app/(gp)/settings/page.tsx` - Added "Decision Structures" tab with full CRUD UI
- `src/components/features/deals/deal-ic-review-tab.tsx` - In-app voting panel, conditions, structure info, enhanced vote display
- `src/lib/deal-stage-engine.ts` - Added sendBackToDueDiligence function
- `src/lib/schemas.ts` - Added CreateDecisionStructureSchema, UpdateDecisionStructureSchema, AddDecisionMemberSchema, CastICVoteSchema
- `src/app/api/deals/[id]/route.ts` - Extended GET to include entity decisionStructure and dealEntities with structures

## Decisions Made
- Separated in-app voting (individual vote records) from final IC decision endpoint -- existing ic-decision endpoint for final Approve/Reject/Send Back is preserved; new vote endpoint records individual committee member votes
- Delete protection on structures: cannot delete a structure if entities are linked to it (returns 409 with entity names list)
- SEND_BACK vote automatically triggers sendBackToDueDiligence (stage change + activity log), but APPROVE/REJECT votes only update vote counts -- they do NOT auto-advance the deal (final decision still goes through ic-decision endpoint)
- Deal detail API now includes entity decisionStructure data for IC Review tab to display quorum/threshold info

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Merged upstream changes into worktree**
- **Found during:** Pre-task setup
- **Issue:** Worktree was behind main branch; DecisionStructure/DecisionMember models from Plan 02-01 were not in the schema
- **Fix:** Merged commit 82727fb (main branch head) into worktree
- **Files modified:** All files from Plans 02-01, 02-02, 02-04
- **Verification:** Schema models confirmed present after merge

**2. [Rule 2 - Missing Critical] Added entity decisionStructure includes to deal API**
- **Found during:** Task 2 (IC Review tab enhancement)
- **Issue:** Deal detail API did not include entity's decisionStructure data -- IC Review tab could not show structure info
- **Fix:** Extended deal GET endpoint to include targetEntity.decisionStructure and dealEntities with structure data
- **Files modified:** src/app/api/deals/[id]/route.ts
- **Verification:** Build passes, structure data available to IC Review tab

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both fixes necessary for plan completion. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Decision structures ready for entity linking (dropdown on entity detail page, can be added in Plan 02-07 or entity management work)
- IC voting works alongside existing Slack voting -- votes from both sources appear in vote records table
- sendBackToDueDiligence available for any future Send Back triggers

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 02-deal-desk-end-to-end*
*Completed: 2026-03-06*
