---
phase: 20-schema-cleanup-ui-polish
plan: 05
subsystem: api
tags: [zod, validation, api-routes, json-schemas, prisma, parseBody]

# Dependency graph
requires:
  - phase: 20-01
    provides: json-schemas.ts with Zod schemas for all 39 JSON blob fields
  - phase: 20-03
    provides: logger migration (api routes were already updated in P03)
provides:
  - All POST/PUT/PATCH mutation API routes use parseBody with Zod validation
  - JSON blob fields sanitized on GET read paths (5 highest-traffic fields)
  - Zero raw req.json() for mutation endpoints without equivalent Zod validation
affects: [all-api-routes, data-integrity, security]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - parseBody pattern extended to 14 more API route files
    - safeParse on read path for JSON blob fields (returns null on corrupt data)

key-files:
  created: []
  modified:
    - src/lib/schemas.ts
    - src/app/api/tasks/route.ts
    - src/app/api/assets/route.ts
    - src/app/api/entities/[id]/route.ts
    - src/app/api/documents/route.ts
    - src/app/api/meetings/[id]/link/route.ts
    - src/app/api/notifications/[id]/route.ts
    - src/app/api/commitments/[id]/route.ts
    - src/app/api/fundraising/route.ts
    - src/app/api/users/[id]/fireflies/route.ts
    - src/app/api/settings/ai-config/test/route.ts
    - src/app/api/dd-categories/route.ts
    - src/app/api/deals/[id]/closing/route.ts
    - src/app/api/deals/[id]/route.ts
    - src/app/api/assets/[id]/route.ts
    - src/app/api/documents/[id]/route.ts
    - src/app/api/meetings/[id]/route.ts
    - src/app/api/settings/ai-config/route.ts
    - src/app/api/settings/ai-prompts/route.ts
    - src/app/api/tasks/[id]/checklist/route.ts
    - src/app/api/deals/[id]/tasks/route.ts
    - src/app/api/deals/[id]/documents/route.ts
    - src/app/api/esignature/route.ts
    - src/app/api/users/invite/route.ts

key-decisions:
  - "2 remaining raw req.json() calls are legitimate exceptions: docusign/webhook (external webhook with content-type detection) and contacts/[id]/tags DELETE (fallback body read for DELETE endpoint)"
  - "docusign/webhook exempt: external webhook needing content-type detection, not a standard mutation"
  - "contacts/[id]/tags DELETE reads body.id as fallback — acceptable for DELETE endpoints"
  - "deals/[id]/route.ts PATCH uses PatchDealBodySchema.passthrough() as top-level parse then re-validates with action-specific schemas (KillDealSchema, CloseDealSchema)"
  - "entities/[id]/route.ts PATCH uses inline flexible schema with action routing"
  - "FundraisingRoundStatus enum is PLANNING/OPEN/FINAL_CLOSE/CLOSED (no CANCELLED) — schema fixed accordingly"
  - "JSON blob safeParse on read: corrupt/unexpected data returns null instead of propagating to frontend"
  - "DocumentCategory as any fixed via parseDocumentCategory() typed helper — FormData routes cannot use parseBody"
  - "UpdateEntitySchema.navProxyConfig typed as NavProxyConfigSchema.optional() — entities/[id]/route.ts uses Record<string, unknown> cast to resolve Prisma EntityUpdateInput union ambiguity"
  - "UpdateDealSchema.dealMetadata uses DealMetadataSchema.optional(); UpdateAssetSchema.projectedMetrics uses ProjectedMetricsSchema.optional() — typed write-path validation"

patterns-established:
  - "Read path sanitization: safeParse JSON blob field, return null on failure — prevents corrupt DB data from reaching frontend"
  - "Action-based PATCH endpoints: use passthrough schema at top level then action-specific schemas for each branch"

requirements-completed: [SCHEMA-02]

# Metrics
duration: 53min
completed: 2026-03-11
---

# Phase 20 Plan 05: API Route Zod Validation Summary

**Zod parseBody validation applied to all POST/PUT/PATCH mutation routes across 2 execution sessions — zero raw req.json() for mutations (2 legitimate exceptions), DocumentCategory as any cast eliminated, JSON blob schemas wired into both read and write paths**

## Performance

- **Duration:** ~83 min total (2 sessions: 53min initial + 30min cleanup)
- **Started:** 2026-03-11T01:21:34Z
- **Completed:** 2026-03-11T07:25:00Z
- **Tasks:** 2/2
- **Files modified:** 24

## Accomplishments

- Added 18 new Zod schemas to `schemas.ts` for previously unvalidated routes (12 in session 1, 6 in session 2)
- Replaced raw `req.json()` with `parseBody()` in 22 API route files across 2 sessions, eliminating all unvalidated mutation paths
- Added safeParse read-path sanitization for 5 high-traffic JSON blob fields (dealMetadata, navProxyConfig, projectedMetrics, extractedFields/appliedFields, decisions)
- `DocumentCategory as any` eliminated from FormData upload routes — typed `parseDocumentCategory()` helper validates against Prisma enum
- JSON blob write schemas updated: DealMetadataSchema, NavProxyConfigSchema, ProjectedMetricsSchema used in UpdateDealSchema, UpdateEntitySchema, UpdateAssetSchema respectively
- All 822 tests pass, build zero errors

## Task Commits

Session 1 (commits `ed1a2c0`, `a9b6073`):
1. **Task 1: Audit and fix Zod validation (round 1)** - `ed1a2c0` (feat)
2. **Task 2: Wire JSON blob schemas into read paths** - `a9b6073` (feat)

Session 2 (commits `99509b1`, `c8ba9f6`):
1. **Task 1: Fix remaining raw req.json() calls** - `99509b1` (feat)
2. **Task 2: Wire JSON blob schemas into write paths** - `c8ba9f6` (feat)

## Files Created/Modified

**Session 1 files (14 routes + read-path sanitization):**
- `src/lib/schemas.ts` — Added 12 new schemas
- `src/app/api/tasks/route.ts` — POST/PATCH use parseBody
- `src/app/api/assets/route.ts` — POST uses parseBody
- `src/app/api/entities/[id]/route.ts` — PATCH uses parseBody; GET sanitizes navProxyConfig
- `src/app/api/documents/route.ts` — PATCH uses parseBody
- `src/app/api/meetings/[id]/link/route.ts` — PATCH uses parseBody
- `src/app/api/notifications/[id]/route.ts` — PATCH uses parseBody
- `src/app/api/commitments/[id]/route.ts` — PATCH uses parseBody
- `src/app/api/fundraising/route.ts` — POST uses parseBody (fixed enum)
- `src/app/api/users/[id]/fireflies/route.ts` — PUT uses parseBody
- `src/app/api/settings/ai-config/test/route.ts` — POST uses parseBody
- `src/app/api/dd-categories/route.ts` — POST/PUT use parseBody
- `src/app/api/deals/[id]/closing/route.ts` — POST uses parseBody
- `src/app/api/deals/[id]/route.ts` — PATCH uses parseBody; GET sanitizes dealMetadata
- `src/app/api/assets/[id]/route.ts` — GET sanitizes projectedMetrics
- `src/app/api/documents/[id]/route.ts` — GET sanitizes extractedFields and appliedFields
- `src/app/api/meetings/[id]/route.ts` — GET sanitizes decisions field

**Session 2 files (8 more routes + write-path typed schemas):**
- `src/lib/schemas.ts` — Added 6 new schemas; imported json-schemas types; typed dealMetadata/projectedMetrics/navProxyConfig fields
- `src/app/api/settings/ai-config/route.ts` — PUT uses parseBody
- `src/app/api/settings/ai-prompts/route.ts` — PUT uses parseBody
- `src/app/api/tasks/[id]/checklist/route.ts` — POST/PATCH/DELETE use parseBody; schemas moved to schemas.ts
- `src/app/api/deals/[id]/tasks/route.ts` — DELETE uses parseBody with DeleteDDTaskSchema
- `src/app/api/deals/[id]/documents/route.ts` — parseDocumentCategory() helper; category as any removed
- `src/app/api/esignature/route.ts` — POST uses parseBody; local schema moved to schemas.ts
- `src/app/api/users/invite/route.ts` — POST uses parseBody; local InviteSchema moved to schemas.ts

## Decisions Made

- 2 remaining raw req.json() calls are legitimate exceptions: docusign/webhook (external webhook with content-type detection) and contacts/[id]/tags DELETE (body fallback for DELETE endpoint)
- docusign/webhook is an external webhook requiring content-type detection — exempt from parseBody pattern
- DELETE endpoints reading body for ID — acceptable pattern for DELETE routes (excluded per plan)
- FundraisingRoundStatus enum is PLANNING/OPEN/FINAL_CLOSE/CLOSED (no CANCELLED) — discovered during type checking
- JSON blob safeParse on read path: returns null on failure rather than propagating corrupt data
- DocumentCategory as any fix: FormData routes can't use parseBody; typed helper validates against Prisma enum, defaults to OTHER
- Entity PUT route: `rest as Record<string, unknown>` cast resolves Prisma EntityUpdateInput/EntityUncheckedUpdateInput union conflict

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FundraisingRoundStatus enum mismatch**
- **Found during:** Session 1, Task 1 (fundraising/route.ts fix)
- **Issue:** CreateFundraisingRoundSchema originally used `z.string().optional()` for status — CANCELLED doesn't exist in schema
- **Fix:** Changed schema to `z.enum(["PLANNING", "OPEN", "FINAL_CLOSE", "CLOSED"])` matching actual Prisma enum
- **Files modified:** src/lib/schemas.ts, src/app/api/fundraising/route.ts
- **Committed in:** `ed1a2c0`

**2. [Rule 1 - Bug] deals/[id]/closing.ts ADD_CUSTOM branch type error**
- **Found during:** Session 1, Task 1 (closing route refactoring)
- **Issue:** After Zod union type narrowing, TypeScript required explicit type assertion for `body.title` in ADD_CUSTOM branch
- **Fix:** Added type cast `(body as { action: "ADD_CUSTOM"; title: string }).title.trim()`
- **Files modified:** src/app/api/deals/[id]/closing/route.ts
- **Committed in:** `ed1a2c0`

**3. [Rule 1 - Bug] entities/[id]/route.ts TRANSITION_STATUS newStatus undefined**
- **Found during:** Session 1, Task 1 (entities PATCH refactoring)
- **Issue:** `newStatus` typed as `string | undefined` after flexible schema parse, but `validTransitions[].includes(newStatus)` requires `string`
- **Fix:** Added explicit null guard `if (!newStatus) return 400`
- **Files modified:** src/app/api/entities/[id]/route.ts
- **Committed in:** `ed1a2c0`

**4. [Rule 1 - Bug] TypeScript error introduced by typed navProxyConfig in UpdateEntitySchema**
- **Found during:** Session 2, Task 2 (wire JSON blob schemas)
- **Issue:** Adding `navProxyConfig: NavProxyConfigSchema.optional()` exposed Prisma `EntityUpdateInput`/`EntityUncheckedUpdateInput` union ambiguity caused by `waterfallTemplateId`
- **Fix:** Cast `rest` to `Record<string, unknown>` in entities/[id]/route.ts PUT handler
- **Files modified:** src/app/api/entities/[id]/route.ts
- **Committed in:** `c8ba9f6`

---

**Total deviations:** 4 auto-fixed (all Rule 1 - TypeScript/type errors)
**Impact on plan:** All auto-fixes necessary for TypeScript correctness. No scope creep.

## Issues Encountered
- None beyond the auto-fixed TypeScript issues above

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness

- All mutation API routes now have Zod validation — ready for Plan 06 (console migration for client-side components)
- Zero raw req.json() for mutation endpoints (2 documented legitimate exceptions)
- JSON blob read-path sanitization covers all 5 highest-traffic fields; write paths use typed schemas for 3 top fields
- 822 tests passing, build zero errors

---
*Phase: 20-schema-cleanup-ui-polish*
*Completed: 2026-03-11*
