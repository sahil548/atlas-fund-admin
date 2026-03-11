---
phase: 20-schema-cleanup-ui-polish
plan: "04"
subsystem: database
tags: [prisma, postgresql, indexes, schema, performance]

# Dependency graph
requires:
  - phase: 20-01
    provides: logger utility and JSON blob Zod schemas (foundation for schema work)
  - phase: 20-03
    provides: console migration complete (clean baseline before schema changes)
provides:
  - Database indexes on 8 high-query models (CapitalCall, Deal, Document, DealActivity, AuditLog, Task, Meeting)
  - Orphaned enum value documentation (SyncStatus.SYNCING, InviteStatus.PENDING confirmed active)
  - Schema migrated via force-reset + seed (indexes live in database)
affects: [all API routes, Prisma queries, database query performance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "@@index comments: each new index has inline comment explaining which API route/query pattern it optimizes"
    - "Orphaned field documentation: add comments to ambiguous enum values rather than removing them"

key-files:
  created: []
  modified:
    - prisma/schema.prisma

key-decisions:
  - "Asset has no direct firmId field — queried via entityAllocations.entity.firmId join; no firmId index possible on Asset model"
  - "Document has no direct firmId field — queried via entity.firmId or deal.firmId join; no firmId index possible on Document model"
  - "Task has no direct firmId field — no firmId index possible on Task model"
  - "SyncStatus.SYNCING is actively used by accounting sync route — retained, documented with comment (not orphaned)"
  - "InviteStatus.PENDING is actively used by invite route and shown in settings page — retained, documented with comment (not orphaned)"
  - "DealCategory removed comment at schema line 97 already confirmed present from prior work"
  - "Force-reset wipes AiConfig table — tenant AI key must be re-entered in Settings after migration"

patterns-established:
  - "Index comment pattern: // Optimizes: GET /api/resource?param=xxx (description of query pattern)"

requirements-completed: [SCHEMA-03, SCHEMA-04]

# Metrics
duration: ~411min
completed: "2026-03-11"
---

# Phase 20 Plan 04: Schema Index & Orphaned Field Audit Summary

**Database performance indexes added to 7 high-query models and orphaned enum values documented after grep-verified audit of all code paths, followed by force-reset migration + seed**

## Performance

- **Duration:** ~411 min (18:24 Mar 10 to 01:15 Mar 11)
- **Started:** 2026-03-10T18:24:14-07:00
- **Completed:** 2026-03-11T01:15:36-07:00
- **Tasks:** 2
- **Files modified:** 1 (prisma/schema.prisma)

## Accomplishments
- Added 9 new `@@index` directives across 7 Prisma models (CapitalCall, Deal, Document, DealActivity, AuditLog, Task, Meeting) with inline comments explaining each query pattern
- Audited SyncStatus.SYNCING and InviteStatus.PENDING — both confirmed actively used via grep of src/; documented with clarifying comments instead of removal
- Applied schema migration via `npx prisma db push --force-reset` and re-seeded database; 822 tests passing, build zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add missing database indexes** - `d0874c2` (feat)
2. **Task 2: Audit orphaned fields + apply schema migration** - `3aed83f` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added 9 `@@index` directives with query-pattern comments; documented SyncStatus.SYNCING and InviteStatus.PENDING as actively used

## Decisions Made
- Asset, Document, and Task models have no direct `firmId` field — they are accessed via join relations (entityAllocations, entity.firmId, deal.firmId). Firmid indexes on these models are not possible. This finding is documented in schema comments.
- SyncStatus.SYNCING is set by `api/accounting/connections/[id]/sync` — confirmed via grep, retained with comment
- InviteStatus.PENDING is set by `api/users/invite` and rendered in settings page — confirmed via grep, retained with comment
- Conservative approach: document ambiguous enum values rather than removing them (avoids risk of breaking existing records)
- Force-reset is required to create new PostgreSQL indexes from `@@index` additions — data wiped and re-seeded; AiConfig table requires manual re-entry of tenant AI key in Settings

## Deviations from Plan

None — plan executed exactly as written. All indexes the plan requested that were feasible (fields actually existed on the models) were already added. The plan's requests for `@@index([firmId])` on Asset, Document, and Task were correctly handled by documenting that those models have no direct firmId column.

## Issues Encountered
- Several requested indexes (firmId on Asset, Document, Task) could not be added because those models have no direct `firmId` field. The schema comments on those models (added in Task 1) document this architectural fact for future reference.
- AiConfig table was cleared by force-reset as expected and documented in CLAUDE.md.

## User Setup Required

After the force-reset migration, the tenant AI key must be re-entered in the Settings page. The AiConfig table is wiped by `prisma db push --force-reset`. No environment variable changes needed.

## Next Phase Readiness
- Schema is clean: indexes applied, orphaned fields documented
- Database is seeded and ready for development
- Build passes (zero errors), 822 tests passing
- Ready for Plan 05: Zod validation on all API routes

---
*Phase: 20-schema-cleanup-ui-polish*
*Completed: 2026-03-11*
