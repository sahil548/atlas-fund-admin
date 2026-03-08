---
phase: 08-auth-permissions-hardening
plan: "02"
subsystem: auth-permissions
tags: [auth, permissions, security, gp-team, idor, notifications, k1]
dependency_graph:
  requires: [CORE-02, CORE-03, 08-01]
  provides: [GP_TEAM_PERMISSION_ENFORCEMENT_COMPLETE, NOTIFICATIONS_IDOR_CLOSED]
  affects: [investors-api, documents-api, settings-api, reports-api, k1-api, notifications-api, notification-bell]
tech_stack:
  added: []
  patterns:
    - "GP_TEAM permission gate pattern (GET): if (authUser && authUser.role === 'GP_TEAM') { const perms = await getEffectivePermissions(authUser.id); if (!checkPermission(perms, AREA, 'read_only')) return forbidden(); }"
    - "GP_TEAM permission gate pattern (POST/PUT/DELETE): after unauthorized() check, if (authUser.role === 'GP_TEAM') { ... checkPermission(perms, AREA, 'full') ... }"
    - "IDOR fix pattern: userId from authUser.id (session) not from query param"
    - "K-1 auth guard before try/catch: auth gate must be outside try to return 401 not 500"
key_files:
  created: []
  modified:
    - src/app/api/investors/route.ts
    - src/app/api/investors/[id]/route.ts
    - src/app/api/documents/route.ts
    - src/app/api/settings/ai-config/route.ts
    - src/app/api/settings/ai-prompts/route.ts
    - src/app/api/reports/route.ts
    - src/app/api/reports/generate/route.ts
    - src/app/api/k1/route.ts
    - src/app/api/k1/upload/route.ts
    - src/app/api/notifications/route.ts
    - src/components/ui/notification-bell.tsx
decisions:
  - "markAllRead in notification-bell passes userId as path segment to PATCH /api/notifications/[id] — secondary IDOR concern noted, not fixed in this plan (the [id] route treats MARK_ALL_READ with the id as userId for updateMany)"
  - "K-1 auth guard placed before try/catch — ensures unauthenticated requests return 401 via unauthorized() helper, not 500 via catch block; authUser still accessible inside try via closure"
  - "documents/route.ts GET: firmId now prefers authUser.firmId over query param when user is authenticated — consistent with other list routes"
metrics:
  duration: "5 minutes"
  completed_date: "2026-03-08"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 11
---

# Phase 08 Plan 02: Auth & Permissions Hardening — Remaining Routes + IDOR Fix Summary

**One-liner:** Wired GP_TEAM permission gates into all remaining 9 route files (investors, documents, settings, reports, K-1), fixed K-1 auth guard placement, and closed the notifications IDOR by using session userId instead of query param.

## What Was Built

### Task 1: GP_TEAM Permission Gates on 9 Route Files + K-1 Auth Guard Fix

Applied the same GP_TEAM permission gate pattern from Plan 01 to 9 more route files covering the remaining 3 permission areas:

**investors (area: "investors"):**
- `investors/route.ts`: GP_TEAM gate on GET (read_only) and POST (full); added `unauthorized()` guard on POST
- `investors/[id]/route.ts`: GP_TEAM gate on GET (read_only), PUT (full), DELETE (full); added `getAuthUser` import

**documents (area: "documents"):**
- `documents/route.ts`: Added `getAuthUser` import (route previously had no auth); GP_TEAM gate on GET (read_only) and POST (full); firmId now uses `authUser?.firmId || query_param`

**settings (area: "settings"):**
- `settings/ai-config/route.ts`: GP_TEAM gate on GET (read_only) and PUT (full); `getAuthUser()` called directly in handlers alongside `getFirmId()`
- `settings/ai-prompts/route.ts`: GP_TEAM gate on GET (read_only) and PUT (full); same approach

**reports (area: "reports"):**
- `reports/route.ts`: GP_TEAM gate on GET (read_only)
- `reports/generate/route.ts`: GP_TEAM gate on POST (full); replaced inline 401 response with `unauthorized()` helper

**K-1 (area: "reports" — K-1 is report sub-domain):**
- `k1/route.ts`: **CRITICAL fix** — auth guard moved from inside try/catch to before try/catch; GP_TEAM gate added; unauthenticated requests now correctly return 401 (not 500)
- `k1/upload/route.ts`: GP_TEAM gate on POST (full); replaced inline 401 with `unauthorized()` helper

### Task 2: Notifications IDOR Fix + Notification Bell Update

**IDOR fix in `/api/notifications/route.ts`:**
- Rewrote GET handler to use `authUser.id` from Clerk session instead of `userId` query param
- Added `getAuthUser` and `unauthorized` imports
- Returns 401 if not authenticated
- Completely removes the ability for an authenticated user to read another user's notifications by manipulating the query string
- Type filter validation preserved (VALID_TYPES set check before casting to Prisma enum)

**Notification bell component update (`src/components/ui/notification-bell.tsx`):**
- SWR key changed from `/api/notifications?userId=${userId}&type=...` to `/api/notifications?type=...`
- `userId` from `useUser()` still gates the SWR call (no fetch until user is loaded) — just no longer sent to server
- `markAllRead` still passes `userId` to `PATCH /api/notifications/${userId}` — separate secondary IDOR noted in decisions, not changed per plan scope

## Verification Results

1. `npm run build` — zero TypeScript errors (only unrelated workspace root warning)
2. `grep -r "getEffectivePermissions"` confirms presence in all 9 route files across 5 API families
3. `grep "userId.*searchParams" notifications/route.ts` — no matches (IDOR removed)
4. `grep "authUser.id" notifications/route.ts` — confirms `const userId = authUser.id`
5. `grep "userId=" notification-bell.tsx` — no matches (param removed from client)
6. K-1 auth guard at lines 21-22, `try` at line 29 — auth guard is BEFORE try

## Combined Plan 01 + 02 Coverage

All 7 PERMISSION_AREAS now have API-layer enforcement:
- `deals` — Plan 01
- `entities` — Plan 01
- `capital_activity` (capital-calls + distributions) — Plan 01
- `investors` — Plan 02
- `documents` — Plan 02
- `settings` — Plan 02
- `reports` (reports + K-1) — Plan 02

## Commits

| Hash | Description |
|------|-------------|
| 44952dc | feat(08-02): wire GP_TEAM permission gates into 9 route files + fix K-1 auth guard |
| ae2de08 | fix(08-02): close notifications IDOR + remove userId query param from bell component |

## Deviations from Plan

None — plan executed exactly as written.

The plan noted the `markAllRead` IDOR concern in `[id]/route.ts` and explicitly instructed not to change that route in this task. That decision was honored; the concern is documented in decisions.

## Self-Check: PASSED

All modified files confirmed present:
- FOUND: src/app/api/investors/route.ts
- FOUND: src/app/api/investors/[id]/route.ts
- FOUND: src/app/api/documents/route.ts
- FOUND: src/app/api/settings/ai-config/route.ts
- FOUND: src/app/api/settings/ai-prompts/route.ts
- FOUND: src/app/api/reports/route.ts
- FOUND: src/app/api/reports/generate/route.ts
- FOUND: src/app/api/k1/route.ts
- FOUND: src/app/api/k1/upload/route.ts
- FOUND: src/app/api/notifications/route.ts
- FOUND: src/components/ui/notification-bell.tsx

All commits confirmed in git log:
- FOUND: 44952dc (Task 1)
- FOUND: ae2de08 (Task 2)
