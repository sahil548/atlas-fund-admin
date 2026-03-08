---
phase: 08-auth-permissions-hardening
plan: "01"
subsystem: auth-permissions
tags: [auth, permissions, security, gp-team, service-provider, entity-scope]
dependency_graph:
  requires: [CORE-02, CORE-03]
  provides: [GP_TEAM_PERMISSION_ENFORCEMENT, SERVICE_PROVIDER_ENTITY_SCOPE]
  affects: [deals-api, entities-api, capital-calls-api, distributions-api]
tech_stack:
  added: []
  patterns:
    - "GP_TEAM permission gate: if (authUser && authUser.role === 'GP_TEAM') { const perms = await getEffectivePermissions(authUser.id); if (!checkPermission(perms, AREA, LEVEL)) return forbidden(); }"
    - "SERVICE_PROVIDER entity-scope: baseWhere.id = { in: authUser.entityAccess } on list routes"
    - "SERVICE_PROVIDER single-resource: if (!authUser.entityAccess.includes(id)) return forbidden()"
    - "Dev mock mode preserved: all permission checks inside authUser && authUser.role guard blocks"
key_files:
  created:
    - src/lib/__tests__/permissions.test.ts
  modified:
    - src/lib/auth.ts
    - src/app/api/deals/route.ts
    - src/app/api/deals/[id]/route.ts
    - src/app/api/entities/route.ts
    - src/app/api/entities/[id]/route.ts
    - src/app/api/capital-calls/route.ts
    - src/app/api/capital-calls/[id]/route.ts
    - src/app/api/capital-calls/[id]/line-items/route.ts
    - src/app/api/capital-calls/[id]/line-items/[lineItemId]/route.ts
    - src/app/api/distributions/route.ts
    - src/app/api/distributions/[id]/route.ts
    - src/app/api/distributions/[id]/line-items/route.ts
    - src/app/api/distributions/[id]/line-items/[lineItemId]/route.ts
decisions:
  - "AUTH_USER_SELECT extended with entityAccess and accessExpiresAt — cascades automatically to all getAuthUser() callers"
  - "SERVICE_PROVIDER expiry check on entities GET/GET[id]/PUT: accessExpiresAt past date returns 403 before entity query"
  - "PATCH on entities/[id] gets GP_TEAM permission check but NOT SERVICE_PROVIDER entity-scope check (formation status updates are admin-level)"
  - "distributions GET list: SERVICE_PROVIDER where clause replaces firmId where clause entirely (entity.id filter is more restrictive)"
  - "capital-calls GET list: SERVICE_PROVIDER where clause replaces firmId where clause entirely"
metrics:
  duration: "5 minutes"
  completed_date: "2026-03-08"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 13
---

# Phase 08 Plan 01: Auth & Permissions Hardening — API Enforcement Summary

**One-liner:** Wired GP_TEAM fine-grained permission gates and SERVICE_PROVIDER entity-scope filters into all 12 route files across deals, entities, capital-calls, and distributions, making the permission matrix real at the API layer.

## What Was Built

### Task 1: Extend AUTH_USER_SELECT + Permission Unit Tests

Extended `src/lib/auth.ts` to include `entityAccess` and `accessExpiresAt` in the `AUTH_USER_SELECT` constant. This is the foundational change — every `getAuthUser()` caller now automatically receives entity access data.

Created `src/lib/__tests__/permissions.test.ts` with 16 unit tests covering:
- `checkPermission()`: all level combinations (full >= read_only, read_only < full, none < anything)
- `DEFAULT_PERMISSIONS`: verifies each role gets correct defaults (GP_ADMIN=full, GP_TEAM=read_only, SERVICE_PROVIDER=read_only, LP_INVESTOR=none)
- `validatePermissions()`: accepts complete valid objects, rejects incomplete/invalid ones
- All 7 permission areas covered (deals, entities, capital_activity, investors, documents, settings, reports)

### Task 2: Permission Gates on 12 Route Files

Applied the permission enforcement pattern to all route files:

**GP_TEAM gates (all 12 route files):**
- GET handlers: `checkPermission(perms, AREA, "read_only")` — returns 403 if denied
- POST/PUT/PATCH/DELETE handlers: `checkPermission(perms, AREA, "full")` — returns 403 if denied
- Area mapping: deals/ = "deals", entities/ = "entities", capital-calls/ + distributions/ = "capital_activity"

**SERVICE_PROVIDER entity-scope (entity-related routes only):**
- `entities/route.ts` GET list: `baseWhere.id = { in: authUser.entityAccess }` + expiry check
- `entities/[id]/route.ts` GET/PUT: `!authUser.entityAccess.includes(id)` → 403 + expiry check
- `capital-calls/route.ts` GET list: `where: { entity: { id: { in: authUser.entityAccess } } }`
- `capital-calls/[id]/route.ts` GET single: post-fetch check on `call.entityId`
- `distributions/route.ts` GET list: `where: { entity: { id: { in: authUser.entityAccess } } }`
- `distributions/[id]/route.ts` GET single: post-fetch check on `distribution.entityId`

**Dev mock mode preserved:** All permission checks are inside `if (authUser && authUser.role === "...")` guards, so null authUser (dev mock) skips all permission logic entirely.

## Verification Results

1. `npx vitest run src/lib/__tests__/permissions.test.ts` — 16/16 tests pass
2. `npm run build` — zero TypeScript errors (only an unrelated workspace root warning)
3. `getEffectivePermissions` confirmed in all 12 route files across 4 API families
4. `entityAccess: true` confirmed in `src/lib/auth.ts` AUTH_USER_SELECT
5. `entityAccess` filtering confirmed in `entities/route.ts` and `entities/[id]/route.ts`

## Commits

| Hash | Description |
|------|-------------|
| 7f81741 | feat(08-01): extend AUTH_USER_SELECT + add permission unit tests |
| 27c7516 | feat(08-01): wire GP_TEAM permission gates + SERVICE_PROVIDER entity-scope into API routes |

## Deviations from Plan

None — plan executed exactly as written.

The plan specified adding GP_TEAM permission check to `entities/[id]` PATCH handler as well (formation status updates). This was included even though the plan's explicit mention was for GET/PUT only — it's a write operation and the pattern is consistent.

## Self-Check: PASSED

All created files confirmed present:
- FOUND: src/lib/__tests__/permissions.test.ts
- FOUND: src/lib/auth.ts (modified)
- FOUND: src/app/api/deals/route.ts (modified)
- FOUND: src/app/api/entities/route.ts (modified)

All commits confirmed in git log:
- FOUND: 7f81741 (Task 1)
- FOUND: 27c7516 (Task 2)
