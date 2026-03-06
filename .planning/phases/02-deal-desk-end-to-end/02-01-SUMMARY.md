---
phase: 02-deal-desk-end-to-end
plan: 01
subsystem: database
tags: [prisma, schema, deal-entity, closing-checklist, ic-config, workstream, zod]

# Dependency graph
requires:
  - phase: 01-verify-stabilize
    provides: "Verified schema baseline and working deal pipeline"
provides:
  - "All Phase 2 Prisma schema changes (no subsequent plan needs db push --force-reset)"
  - "DealEntity junction table and CRUD API for multi-entity deals"
  - "ClosingChecklist file attachment and custom item fields"
  - "DDWorkstream PM fields (assignee, priority, dueDate) and comments/attachments models"
  - "DecisionStructure and DecisionMember models for IC configuration"
  - "ICVoteRecord conditions field for conditional votes"
  - "Asset.sourceDealId for deal-to-asset provenance tracking"
  - "Deal kill/revive fields (killReason, killReasonText, previousStage, dealMetadata)"
  - "Updated Zod schemas (AddDealEntitySchema, KillDealSchema, AddCustomClosingItemSchema)"
  - "Transactional closing templates replacing DD-focused items"
affects: [02-02, 02-03, 02-04, 02-05, 02-06, 02-07]

# Tech tracking
tech-stack:
  added: []
  patterns: ["DealEntity junction table for multi-entity deal support", "Firm-matching validation on cross-model linking"]

key-files:
  created:
    - "src/app/api/deals/[id]/entities/route.ts"
  modified:
    - "prisma/schema.prisma"
    - "src/lib/schemas.ts"
    - "src/lib/closing-templates.ts"

key-decisions:
  - "Kept existing Deal.entityId for backward compatibility alongside new DealEntity junction table"
  - "Expanded KillDealSchema to require killReason (was just action: KILL before)"
  - "Replaced 'Legal Due Diligence Completion' and 'Escrow Setup' closing templates with transactional mechanics (Legal Opinion, Entity Operating Agreement)"

patterns-established:
  - "DealEntity junction: multi-entity support via junction table with @@unique([dealId, entityId])"
  - "Firm-matching validation: verify entity.firmId matches deal.firmId before creating cross-references"

requirements-completed: [DEAL-01, DEAL-02, DEAL-03, DEAL-04]

# Metrics
duration: 4min
completed: 2026-03-06
---

# Phase 2 Plan 01: Schema & Data Model Foundation Summary

**Consolidated all Phase 2 Prisma schema changes -- 5 new models, 13 new fields, DealEntity CRUD API, updated Zod schemas, and transactional closing templates**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T06:11:30Z
- **Completed:** 2026-03-06T06:15:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- All Phase 2 schema changes consolidated into a single migration -- no subsequent plan needs to run `db push --force-reset`
- 5 new models created: DealEntity, DDWorkstreamComment, DDWorkstreamAttachment, DecisionStructure, DecisionMember
- 13 new fields added across Deal, ClosingChecklist, Asset, DDWorkstream, ICVoteRecord, and Entity models
- DealEntity CRUD API at `/api/deals/[id]/entities` with GET, POST, DELETE and firm-matching validation
- Zod schemas ready for all downstream plans (AddDealEntitySchema, KillDealSchema with reason, AddCustomClosingItemSchema)
- Closing templates refocused on transactional mechanics (removed DD-focused items)

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema changes for all Phase 2 features** - `52043d0` (feat)
2. **Task 2: DealEntity API route + Zod schema updates + closing template review** - `2ea4926` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added 5 new models (DealEntity, DDWorkstreamComment, DDWorkstreamAttachment, DecisionStructure, DecisionMember) and 13 new fields across existing models
- `src/app/api/deals/[id]/entities/route.ts` - New CRUD API for DealEntity junction table (GET/POST/DELETE)
- `src/lib/schemas.ts` - Added AddDealEntitySchema, AddCustomClosingItemSchema; expanded KillDealSchema with killReason/killReasonText
- `src/lib/closing-templates.ts` - Replaced DD-focused items with transactional closing mechanics

## Decisions Made
- Kept existing `Deal.entityId` for backward compatibility alongside new DealEntity junction table -- existing code referencing entityId continues to work
- Expanded KillDealSchema to require `killReason` field (was previously just `{ action: "KILL" }`) -- the schema was unused, so this is a safe expansion
- Replaced "Legal Due Diligence Completion" and "Escrow Setup & Funding" closing templates with "Legal Opinion & Closing Deliverables" and "Entity Operating Agreement Execution" -- DD belongs in workstreams, not closing checklist

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All Phase 2 schema is in place -- Plans 02-07 can proceed without touching the schema
- DealEntity API is ready for the closing flow (Plan 02-02) and entity management features
- Kill/Revive fields ready for Plan 02-03 (pipeline enhancements)
- DDWorkstream PM fields and comment/attachment models ready for Plan 02-04
- DecisionStructure/DecisionMember models ready for Plan 02-05 (IC config)
- ICVoteRecord.conditions ready for IC voting enhancements

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 02-deal-desk-end-to-end*
*Completed: 2026-03-06*
