---
phase: 08-auth-permissions-hardening
verified: 2026-03-07T10:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: true
  previous_status: gaps_found
  previous_score: 10/12
  gaps_closed:
    - "/api/notifications/[id] PATCH — getAuthUser() added, MARK_READ has ownership check (existing.userId !== authUser.id → 403), MARK_ALL_READ uses authUser.id instead of path param"
    - "settings/ai-config GET and PUT — explicit `if (!authUser) return unauthorized()` added before getFirmId(); same fix applied to settings/ai-prompts GET and PUT"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "GP_TEAM user with read_only deals permission can read but not write deals"
    expected: "GET /api/deals returns 200. POST /api/deals returns 403."
    why_human: "Requires a real Clerk session with a GP_TEAM user that has stored permissions. Cannot verify correct DB-level permission lookup without a live environment."
  - test: "SERVICE_PROVIDER sees only entities in their entityAccess array"
    expected: "GET /api/entities returns only the entities whose IDs are in the user's entityAccess array."
    why_human: "Requires a real Clerk session with a SERVICE_PROVIDER user with a populated entityAccess field."
  - test: "SERVICE_PROVIDER with expired accessExpiresAt gets 403 on /api/entities"
    expected: "GET /api/entities and GET /api/entities/[id] both return 403 when accessExpiresAt is in the past."
    why_human: "Requires a real Clerk session with SERVICE_PROVIDER role and a past accessExpiresAt date."
  - test: "Notification bell fetches notifications without userId in query string"
    expected: "Network tab shows GET /api/notifications (with optional ?type=...) but no userId= param. Notifications shown are the logged-in user's own."
    why_human: "Requires browser DevTools to inspect the actual network request."
---

# Phase 08: Auth & Permissions Hardening — Verification Report

**Phase Goal:** Close RBAC enforcement gaps found in v1.0 audit. Wire `getEffectivePermissions()` into GP API routes for GP_TEAM fine-grained access. Add entity-scope checks for SERVICE_PROVIDER. Fix security issues in notification and K-1 endpoints.
**Verified:** 2026-03-07
**Status:** passed — 12/12 must-haves verified. Both previous gaps closed. No regressions.
**Re-verification:** Yes — after gap closure

---

## Re-verification Summary

### Gaps Closed

**Gap 1 — IDOR in `/api/notifications/[id]` PATCH (was: Blocker)**

`src/app/api/notifications/[id]/route.ts` now has a full auth guard at the top of the PATCH handler:
- Line 9: `const authUser = await getAuthUser();`
- Line 10: `if (!authUser) return unauthorized();`
- MARK_READ (line 15-25): fetches the notification first, checks `existing.userId !== authUser.id` → 403 if mismatch. Ownership is verified before the update.
- MARK_ALL_READ (lines 27-34): `where: { userId: authUser.id, isRead: false }` — uses session userId, not the path `id` param. The path param is now irrelevant to the DB query for this action.

**Gap 2 — Settings routes returned 500 instead of 401 for unauthenticated requests (was: Warning)**

Both settings files have been restructured so each exported handler calls `getAuthUser()` directly and immediately guards with `if (!authUser) return unauthorized()` before any other logic, including `authUser.firmId!` access:

`src/app/api/settings/ai-config/route.ts`:
- GET (line 38-39): `const authUser = await getAuthUser(); if (!authUser) return unauthorized();`
- PUT (line 68-69): `const authUser = await getAuthUser(); if (!authUser) return unauthorized();`
- `const firmId = authUser.firmId!;` is reached only when authUser is confirmed non-null — no path to `getFirmId()` throw.

`src/app/api/settings/ai-prompts/route.ts`:
- GET (line 16-17): `const authUser = await getAuthUser(); if (!authUser) return unauthorized();`
- PUT (line 69-70): `const authUser = await getAuthUser(); if (!authUser) return unauthorized();`
- Same pattern: `firmId = authUser.firmId!` only after auth confirmed.

### Regressions

No regressions detected. All 10 truths that passed in the initial verification still pass. Spot-checked:
- `deals/route.ts` — GP_TEAM gate at lines 15-17 (GET) and 136-138 (POST): unchanged.
- `entities/route.ts` — SERVICE_PROVIDER entityAccess filter at lines 35-36 and expiry at lines 21-23: unchanged.
- `investors/route.ts` — GP_TEAM gate at lines 13-15 (GET) and 83-85 (POST): unchanged.
- `documents/route.ts` — GP_TEAM read_only gate at lines 15-17 (GET) and full gate at lines 74-76 (POST): unchanged.
- `notifications/route.ts` — `const userId = authUser.id` at line 23, no `userId` query param: unchanged.
- `notification-bell.tsx` — No `userId=` in SWR key: confirmed by grep (no matches).
- `k1/route.ts` — auth guard at lines 21-22 before `try` at line 29: unchanged.
- `auth.ts` — `entityAccess: true` at line 37, `accessExpiresAt: true` at line 38: unchanged.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GP_TEAM user with read_only deals permission gets 403 on POST /api/deals | VERIFIED | `deals/route.ts` POST: `if (authUser.role === "GP_TEAM")` + `checkPermission(perms, "deals", "full")` at lines 136-138 |
| 2 | GP_TEAM user with full deals permission can POST /api/deals successfully | VERIFIED | Same gate — passes when checkPermission returns true |
| 3 | GP_ADMIN always passes permission checks | VERIFIED | `getEffectivePermissions()` returns full for all areas for GP_ADMIN per DEFAULT_PERMISSIONS |
| 4 | SERVICE_PROVIDER can only read entities in their entityAccess array | VERIFIED | `entities/route.ts` GET: `baseWhere.id = { in: authUser.entityAccess }` at lines 35-36; `entities/[id]/route.ts` GET: `!authUser.entityAccess.includes(id)` check present |
| 5 | SERVICE_PROVIDER cannot see capital calls for entities outside their entityAccess | VERIFIED | `capital-calls/route.ts` GET: `entity: { id: { in: authUser.entityAccess } }` filter; `capital-calls/[id]/route.ts` GET: post-fetch entityId membership check |
| 6 | Dev mock mode still works (null authUser skips permission code) | VERIFIED | GET permission checks wrapped in `if (authUser && authUser.role === "GP_TEAM")` throughout; null authUser skips the block entirely |
| 7 | GP_TEAM user with none investors permission gets 403 on GET /api/investors | VERIFIED | `investors/route.ts` GET: `if (authUser && authUser.role === "GP_TEAM")` + `checkPermission(perms, "investors", "read_only")` at lines 13-15 |
| 8 | GP_TEAM user with read_only documents permission can GET but gets 403 on POST | VERIFIED | `documents/route.ts`: GET uses read_only check (lines 15-17), POST uses full check (lines 74-76) |
| 9 | GP_TEAM user with none settings permission gets 403 on GET /api/settings/ai-config | VERIFIED | `ai-config/route.ts` GET (line 38): `const authUser = await getAuthUser(); if (!authUser) return unauthorized();` — 401 for unauthenticated. GP_TEAM gate (lines 40-43) returns 403. Both paths now return correct HTTP status. |
| 10 | /api/notifications GET returns the authenticated user's own notifications (not arbitrary userId) | VERIFIED | `notifications/route.ts` GET: `const userId = authUser.id` at line 23; no `searchParams.get("userId")` call exists |
| 11 | /api/k1 GET returns 401 when not authenticated (auth guard outside try/catch) | VERIFIED | `k1/route.ts`: `getAuthUser()` at line 21, `if (!authUser) return unauthorized()` at line 22, `try` at line 29. Auth guard is before try. |
| 12 | Notification bell component fetches notifications without userId query param | VERIFIED | `notification-bell.tsx` swrKey uses no userId param. Grep for `userId=` returns no matches in the file. |

**Score: 12/12 truths verified**

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/auth.ts` | AUTH_USER_SELECT with entityAccess and accessExpiresAt fields | VERIFIED | `entityAccess: true` at line 37, `accessExpiresAt: true` at line 38 |
| `src/lib/__tests__/permissions.test.ts` | Unit tests for checkPermission, getEffectivePermissions, entity-scope logic (min 50 lines) | VERIFIED | 152 lines; 16 tests covering checkPermission, DEFAULT_PERMISSIONS, validatePermissions |
| `src/app/api/deals/route.ts` | GP_TEAM permission gate on deals API | VERIFIED | `getEffectivePermissions` at lines 6, 16, 137; GET and POST both gated |
| `src/app/api/entities/route.ts` | GP_TEAM permission gate + SERVICE_PROVIDER entity-scope on entities API | VERIFIED | `entityAccess` filter at lines 35-36; SERVICE_PROVIDER expiry at lines 21-23 |

### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/notifications/route.ts` | Session-based userId lookup (IDOR fix) | VERIFIED | `const userId = authUser.id` at line 23; no query param lookup |
| `src/app/api/notifications/[id]/route.ts` | Auth guard + ownership check on PATCH (gap fix) | VERIFIED | `getAuthUser()` at line 9, `if (!authUser) return unauthorized()` at line 10, `existing.userId !== authUser.id` ownership check at line 18, `authUser.id` used for MARK_ALL_READ at line 30 |
| `src/app/api/k1/route.ts` | Auth guard outside try/catch | VERIFIED | Auth guard lines 21-22, try at line 29 |
| `src/components/ui/notification-bell.tsx` | Notification fetch without userId param | VERIFIED | swrKey uses no userId param; confirmed by grep |
| `src/app/api/investors/route.ts` | GP_TEAM permission gate on investors API | VERIFIED | `getEffectivePermissions` at lines 6, 13-15, 83-85; both GET and POST gated |
| `src/app/api/settings/ai-config/route.ts` | Auth guard before getFirmId + GP_TEAM settings gate (gap fix) | VERIFIED | GET: `getAuthUser()` + `if (!authUser) return unauthorized()` at lines 38-39 before `authUser.firmId!` at line 45. PUT: same at lines 68-69 before line 75. No path through which unauthenticated callers reach getFirmId(). |
| `src/app/api/settings/ai-prompts/route.ts` | Auth guard before getFirmId + GP_TEAM settings gate (gap fix) | VERIFIED | GET: `getAuthUser()` + `if (!authUser) return unauthorized()` at lines 16-17 before `authUser.firmId!` at line 23. PUT: same at lines 69-70 before line 76. |

---

## Key Link Verification

### Plan 01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/auth.ts` | all API routes | AUTH_USER_SELECT includes entityAccess | WIRED | `entityAccess: true` at line 37 confirmed in AUTH_USER_SELECT constant |
| `src/app/api/deals/route.ts` | `src/lib/permissions.ts` | import getEffectivePermissions + checkPermission | WIRED | Import at line 6; both functions called in GET (line 16) and POST (line 137) |
| `src/app/api/entities/route.ts` | authUser.entityAccess | SERVICE_PROVIDER entity-scope filter | WIRED | `baseWhere.id = { in: authUser.entityAccess }` at line 36 |

### Plan 02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/components/ui/notification-bell.tsx` | `src/app/api/notifications/route.ts` | fetch /api/notifications (no userId param) | WIRED | swrKey confirmed without userId param |
| `src/app/api/notifications/route.ts` | `src/lib/auth.ts` | getAuthUser() for session userId | WIRED | `getAuthUser` imported; called at line 19; `const userId = authUser.id` at line 23 |
| `src/app/api/k1/route.ts` | `src/lib/auth.ts` | Auth guard before try/catch | WIRED | `getAuthUser` + `unauthorized()` at lines 21-22, `try` at line 29 |
| `src/app/api/notifications/[id]/route.ts` | `src/lib/auth.ts` | Auth guard + session-based ownership (gap fix) | WIRED | `getAuthUser` + `unauthorized()` at lines 9-10; `authUser.id` used at lines 18 and 30 |
| `src/app/api/settings/ai-config/route.ts` | `src/lib/auth.ts` | Auth guard before any firmId access (gap fix) | WIRED | `getAuthUser()` + `if (!authUser) return unauthorized()` at lines 38-39 (GET) and 68-69 (PUT); `authUser.firmId!` accessed only after guard passes |
| `src/app/api/settings/ai-prompts/route.ts` | `src/lib/auth.ts` | Auth guard before any firmId access (gap fix) | WIRED | `getAuthUser()` + `if (!authUser) return unauthorized()` at lines 16-17 (GET) and 69-70 (PUT); `authUser.firmId!` accessed only after guard passes |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CORE-02 | 08-01, 08-02 | Role-based access enforced per route (not just modeled) | VERIFIED | GP_TEAM permission gates wired into all route files across all 7 permission areas (deals, entities, capital_activity, investors, documents, settings, reports). Notifications IDOR closed. K-1 auth guard hardened. Settings routes now return correct 401 for unauthenticated callers. No remaining routes without auth enforcement in scope. |
| CORE-03 | 08-01 | Service provider scoped access (read-only, entity-specific, time-bound) | VERIFIED | entityAccess filter in entities GET list; entityAccess.includes() check in entities [id] GET/PUT; capital-calls and distributions list routes filter by `entity: { id: { in: authUser.entityAccess } }`; [id] routes do post-fetch entity membership check; accessExpiresAt expiry check in entities routes. |

**Requirement traceability check (REQUIREMENTS.md):**
- Phase 8 owns exactly CORE-02 and CORE-03 per the traceability table (line 162).
- Both plans (08-01, 08-02) declare both requirement IDs in their frontmatter `requirements:` field.
- No orphaned requirements: no other requirement IDs map to Phase 8 in REQUIREMENTS.md.
- Both requirements are now VERIFIED after gap closure. REQUIREMENTS.md notes for both can be updated from "PARTIAL" to "DONE (08-01/08-02)".

---

## Anti-Patterns Found

No new anti-patterns introduced in the gap fixes. The previous blockers and warnings are resolved:

| File | Previous Issue | Current Status |
|------|---------------|----------------|
| `src/app/api/notifications/[id]/route.ts` | No auth guard on PATCH — IDOR | RESOLVED: `getAuthUser()` + ownership check wired |
| `src/app/api/settings/ai-config/route.ts` | getFirmId() could throw 500 for unauthenticated callers | RESOLVED: explicit `if (!authUser) return unauthorized()` before firmId access |
| `src/app/api/settings/ai-prompts/route.ts` | Same getFirmId() 500 issue | RESOLVED: same fix applied |

No new TODOs, placeholders, or empty implementations introduced.

---

## Human Verification Required

These items are unchanged from the initial verification. All require a live environment with real Clerk sessions.

### 1. GP_TEAM Permission Enforcement End-to-End

**Test:** Log in as a GP_TEAM user (e.g., user-sm Sarah Mitchell). Using browser DevTools Network tab or curl, attempt POST /api/deals with a valid payload.
**Expected:** 403 Forbidden response when the GP_TEAM user has read_only or none for "deals".
**Why human:** Requires a real Clerk session with a GP_TEAM role and specific stored permissions in the DB. Cannot trace DB-level permission lookup programmatically.

### 2. SERVICE_PROVIDER Entity Scoping

**Test:** Log in as a SERVICE_PROVIDER user. Navigate to or fetch GET /api/entities.
**Expected:** Response contains only the entities whose IDs appear in the user's `entityAccess` array.
**Why human:** Requires a SERVICE_PROVIDER Clerk user with a populated `entityAccess` array and other entities in the firm that should be excluded.

### 3. SERVICE_PROVIDER Access Expiry

**Test:** Set a SERVICE_PROVIDER user's `accessExpiresAt` to a past date. Attempt GET /api/entities and GET /api/entities/[id].
**Expected:** Both return 403 Forbidden.
**Why human:** Requires DB manipulation and a real Clerk session.

### 4. Notification Bell Has No userId in Query String

**Test:** Log in as any user. Open browser DevTools Network tab. Observe requests to `/api/notifications`.
**Expected:** URL is `/api/notifications` or `/api/notifications?type=CAPITAL_CALL` — never includes `?userId=...` or `&userId=...`.
**Why human:** Requires browser interaction to observe actual network traffic.

---

## Gaps Summary

No gaps remain. Both gaps identified in the initial verification have been closed:

1. The `/api/notifications/[id]` PATCH handler now has full auth enforcement: `getAuthUser()` + `unauthorized()` at the top, ownership check for MARK_READ, and session userId for MARK_ALL_READ. The IDOR vulnerability is closed on both action paths.

2. Both settings route files (`ai-config` and `ai-prompts`) now call `getAuthUser()` and guard with `if (!authUser) return unauthorized()` as the first action in each handler, before any access to `authUser.firmId`. Unauthenticated requests now correctly receive 401 instead of 500.

All 12 must-have truths are verified. All required artifacts exist, are substantive, and are wired. Both CORE-02 and CORE-03 are satisfied. Phase 08 goal is achieved.

---

_Verified: 2026-03-07_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — after gap closure_
