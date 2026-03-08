# Phase 8: Auth & Permissions Hardening — Research

**Researched:** 2026-03-07
**Domain:** Role-Based Access Control (RBAC), IDOR vulnerability fixes, Next.js API route authorization
**Confidence:** HIGH — all findings drawn directly from the codebase; no external library changes needed

---

## Summary

Phase 8 closes the gap between the permissions infrastructure built in Phase 4 and actual API-route enforcement. The `getEffectivePermissions()` function exists, is well-structured, and works correctly — but it is never called in any API route handler. The same is true of SERVICE_PROVIDER entity-scope checks: the `entityAccess[]` array is stored on `User`, and the middleware blocks write methods, but no route handler reads `entityAccess` to scope what a SERVICE_PROVIDER can read. Two additional point fixes are needed: `/api/notifications` accepts a `userId` query param instead of using the session (IDOR), and `/api/k1` already has an auth guard that works but the guard sits inside a try/catch and may silently swallow the 401 in a few edge paths.

The work is pure TypeScript additions to existing route files — no schema migrations, no new libraries, no new tables. The pattern is well-defined and consistent. Every route already imports `getAuthUser()` from `@/lib/auth`, so adding `getEffectivePermissions()` is a one-import, one-await, one-check addition per route. Dev mock mode is safe because `getAuthUser()` returns null in mock dev when no Clerk session is present; all permission checks are guarded by the early `if (!authUser)` return, so RBAC code is never reached in mock mode.

**Primary recommendation:** Wire `getEffectivePermissions()` into the 7 GP API route families (deals, entities, capital_activity, investors, documents, settings, reports). Add entity-scope filter for SERVICE_PROVIDER reads. Fix the two security items in notifications and K-1 as point fixes in the same plan.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CORE-02 | Role-based access enforced per route (not just modeled) | `getEffectivePermissions()` exists in `src/lib/permissions.ts` but is never imported by any API route. This phase wires it in across all GP API domains. |
| CORE-03 | Service provider scoped access (read-only, entity-specific, time-bound) | `User.entityAccess[]` is stored in schema. Middleware blocks writes. Per-route entity filtering against this array is the missing piece. |
</phase_requirements>

---

## What Exists (HIGH confidence — verified by reading source)

### Permissions Infrastructure (Phase 4 output)

| File | What it does | Status |
|------|--------------|--------|
| `src/lib/permissions-types.ts` | Pure-TS types. `PERMISSION_AREAS`, `DEFAULT_PERMISSIONS`, `checkPermission()`, `validatePermissions()` | Complete. No changes needed. |
| `src/lib/permissions.ts` | Server-only. `getEffectivePermissions(userId)` — DB lookup, role-based merge, returns `UserPermissions` record | Complete. No changes needed. |
| `src/middleware.ts` | Clerk middleware. Blocks LP_INVESTOR from GP pages/APIs. Blocks SERVICE_PROVIDER write methods. | Complete for coarse-grained control. Not where fine-grained work happens. |
| `src/lib/auth.ts` | `getAuthUser()` — returns full DB user (id, firmId, role, etc.) from Clerk session or null. `unauthorized()`, `forbidden()` helpers. | Complete. No changes needed. |

### Permission Areas Defined

```typescript
// src/lib/permissions-types.ts
export const PERMISSION_AREAS = [
  "deals",
  "entities",
  "capital_activity",
  "investors",
  "documents",
  "settings",
  "reports",
] as const;
```

These 7 areas map directly to the 7 API families this phase must protect.

### Service Provider Entity Access Storage

```typescript
// prisma/schema.prisma — User model
entityAccess    String[]  @default([])   // Array of entity IDs the SP can access
accessExpiresAt DateTime?                // Optional time-bound expiry
```

The entityAccess array contains entity IDs. For reads, the route must filter results to only entities whose ID is in this array. For single-resource routes (e.g., `/api/entities/[id]`), the route checks if the entity ID is in the array and returns 403 if not.

### Dev Mock Mode Behavior

In dev without Clerk:
- `getAuthUser()` calls `auth()` from Clerk — when no Clerk session, `clerkUserId` is null — function returns `null`
- All routes guard with `if (!authUser) return unauthorized()` (pattern already established)
- `getEffectivePermissions()` is never reached because the authUser check exits first
- Result: mock dev mode is unaffected — RBAC code path is only hit when `authUser` is non-null (i.e., real Clerk session)

This is confirmed by the `user-provider.tsx` which checks `CLERK_ENABLED` at module level and uses `MockUserProvider` when Clerk is not configured.

---

## Architecture Patterns

### Pattern 1: GP_TEAM Permission Gate (READ operations)

Add after `getAuthUser()` call, before Prisma query:

```typescript
// Source: verified from src/lib/permissions.ts + existing route patterns
import { getEffectivePermissions, checkPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  // GP_TEAM fine-grained permission check
  if (authUser.role === "GP_TEAM") {
    const perms = await getEffectivePermissions(authUser.id);
    if (!checkPermission(perms, "deals", "read_only")) {
      return forbidden();
    }
  }

  // ... rest of handler
}
```

**Why only GP_TEAM:** GP_ADMIN always has full access (baked into `getEffectivePermissions`). LP_INVESTOR is already blocked by middleware. SERVICE_PROVIDER is handled separately by entity-scope logic.

### Pattern 2: GP_TEAM Permission Gate (WRITE operations)

```typescript
export async function POST(req: Request) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  // GP_TEAM fine-grained permission check — require "full" for writes
  if (authUser.role === "GP_TEAM") {
    const perms = await getEffectivePermissions(authUser.id);
    if (!checkPermission(perms, "deals", "full")) {
      return forbidden();
    }
  }

  // ... rest of handler
}
```

### Pattern 3: SERVICE_PROVIDER Entity-Scope Filter (LIST routes)

For list routes that return multiple entities:

```typescript
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  let firmId = authUser.firmId;

  // SERVICE_PROVIDER: scope to allowed entities only
  let entityScopeFilter: string[] | undefined;
  if (authUser.role === "SERVICE_PROVIDER") {
    entityScopeFilter = authUser.entityAccess; // String[] from DB user record
  }

  // Build where clause
  const baseWhere: Record<string, unknown> = { firmId };
  if (entityScopeFilter) {
    baseWhere.id = { in: entityScopeFilter }; // for entity routes
    // For capital-calls: baseWhere.entity = { id: { in: entityScopeFilter } }
  }

  // ... Prisma query
}
```

**Note:** `getAuthUser()` currently returns only these fields: `id, name, email, role, firmId, initials, isActive, contactId`. It does NOT return `entityAccess`. The `AUTH_USER_SELECT` constant in `src/lib/auth.ts` must be extended to include `entityAccess` and optionally `accessExpiresAt`.

### Pattern 4: SERVICE_PROVIDER Entity-Scope Check (SINGLE RESOURCE routes)

For routes that fetch one entity by ID:

```typescript
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  // SERVICE_PROVIDER: check entity is in allowed list
  if (authUser.role === "SERVICE_PROVIDER") {
    if (!authUser.entityAccess.includes(id)) {
      return forbidden();
    }
  }

  // ... fetch and return
}
```

### Pattern 5: IDOR Fix — Notifications Route

Current (VULNERABLE):
```typescript
// src/app/api/notifications/route.ts
const userId = req.nextUrl.searchParams.get("userId"); // Anyone can pass any userId
```

Fixed:
```typescript
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const userId = authUser.id; // Use session userId, not query param
  // ... rest unchanged
}
```

The `userId` query param should be removed from the GET handler entirely. Callers currently pass `?userId=...` — these call sites (notification bell component) must also be updated to not pass the param.

### Pattern 6: K-1 Auth Guard Review

The `/api/k1/route.ts` already has an auth guard:
```typescript
const authUser = await getAuthUser();
if (!authUser) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

However, this is inside a `try/catch`. The catch block returns a 500, which means if `getAuthUser()` throws (rather than returning null), the 401 is never reached. The fix is to move the auth check before the try/catch, or ensure the try/catch re-throws auth errors. The existing pattern in well-written routes (like deals) does the auth check before the try/catch.

---

## Route-to-Permission Area Mapping

| API Family | Route Pattern | Permission Area | Read Level | Write Level |
|------------|---------------|-----------------|------------|-------------|
| Deals | `/api/deals*` | `deals` | `read_only` | `full` |
| Entities | `/api/entities*` | `entities` | `read_only` | `full` |
| Capital Activity | `/api/capital-calls*`, `/api/distributions*` | `capital_activity` | `read_only` | `full` |
| Investors | `/api/investors*` | `investors` | `read_only` | `full` |
| Documents | `/api/documents*` | `documents` | `read_only` | `full` |
| Settings | `/api/settings*` | `settings` | `read_only` | `full` |
| Reports | `/api/reports*`, `/api/k1*` | `reports` | `read_only` | `full` |

**Note on settings:** The `settings/permissions` route already enforces `GP_ADMIN` only via a direct role check. That check is correct and should be preserved. The `getEffectivePermissions` check for settings applies to non-admin GP_TEAM accessing other settings routes.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Permission level comparison | Custom string comparison | `checkPermission()` from `permissions-types.ts` | Already handles `LEVEL_ORDER` correctly |
| Role detection | Manual role string checks | `authUser.role` + conditional on `"GP_TEAM"` | Role is already on the auth user |
| Entity scope | Custom entity lookup table | `authUser.entityAccess` array (already in schema) | Data already stored; just need to read it |
| Auth helpers | New error response objects | `unauthorized()`, `forbidden()` from `@/lib/auth` | Consistent 401/403 responses |
| Permissions DB query | Direct Prisma query | `getEffectivePermissions(authUser.id)` | Handles GP_ADMIN bypass, defaults merge |

---

## Common Pitfalls

### Pitfall 1: AUTH_USER_SELECT Missing entityAccess

**What goes wrong:** `authUser.entityAccess` is `undefined` at runtime because `AUTH_USER_SELECT` in `src/lib/auth.ts` doesn't include `entityAccess`.

**Why it happens:** The `entityAccess` field was added to the schema in Phase 4 but `getAuthUser()` was written before full SERVICE_PROVIDER scope enforcement was needed.

**How to avoid:** Add `entityAccess: true` (and optionally `accessExpiresAt: true`) to `AUTH_USER_SELECT` in `src/lib/auth.ts` as the first change in this phase.

**Warning signs:** TypeScript will NOT catch this as a type error because Prisma's partial select returns a type that doesn't include the field. Test by logging `authUser.entityAccess` — it will be `undefined` if not selected.

### Pitfall 2: Permission Check Placed Inside try/catch

**What goes wrong:** If the auth or permission check is inside a try/catch and the outer catch swallows errors, a crash in `getEffectivePermissions` could return a 500 instead of a 401/403, leaking information.

**How to avoid:** Place auth + permission guards at the top of the handler, before any try/catch. Let them propagate naturally. The Prisma calls are what go inside try/catch.

### Pitfall 3: Forgetting to Update Notification Bell Client Component

**What goes wrong:** After fixing the IDOR in `/api/notifications`, the client-side notification bell still sends `?userId=...` in the URL. The fixed API ignores or errors on this parameter, but if the client is also passing it, the behavior changes.

**How to avoid:** Search for usages of `/api/notifications` in the frontend and remove the `userId` query param from all call sites. The session-based lookup replaces it.

### Pitfall 4: SERVICE_PROVIDER entityAccess Applied to Non-Entity Routes

**What goes wrong:** SERVICE_PROVIDER entity-scope only makes sense for data scoped to entities (capital calls, distributions, entity records themselves). Applying entity-scope to firm-level data (like Settings, Users) would be wrong.

**How to avoid:** Only add SERVICE_PROVIDER entity-scope filtering to routes where the underlying data has an `entityId` field or is accessed through an entity. For firm-level data, SERVICE_PROVIDER's read-only status (enforced by middleware) is sufficient.

### Pitfall 5: Double-Checking GP_ADMIN

**What goes wrong:** Adding an explicit `if (authUser.role === "GP_ADMIN") return` bypass before permission checks creates branching that is easy to get wrong.

**How to avoid:** `getEffectivePermissions()` already returns `full` for all areas when `role === "GP_ADMIN"`. So calling `checkPermission()` on the result of `getEffectivePermissions()` for a GP_ADMIN always returns `true`. No special-case needed.

---

## Code Examples

### Correct Pattern for a GP API Route (verified from codebase)

```typescript
// Source: pattern derived from src/app/api/settings/permissions/route.ts
// (already correctly uses role check) + src/lib/permissions.ts

import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { getEffectivePermissions, checkPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  // GP_TEAM fine-grained check (GP_ADMIN always passes; LP/SP handled by middleware)
  if (authUser.role === "GP_TEAM") {
    const perms = await getEffectivePermissions(authUser.id);
    if (!checkPermission(perms, "deals", "read_only")) return forbidden();
  }

  // SERVICE_PROVIDER entity-scope (for routes with entity data)
  if (authUser.role === "SERVICE_PROVIDER") {
    // entityAccess is now on authUser (after fix to AUTH_USER_SELECT)
    // Apply as filter to Prisma where clause
  }

  // ... normal Prisma logic
}
```

### AUTH_USER_SELECT Extension (required as first change)

```typescript
// Source: src/lib/auth.ts — extend this const
const AUTH_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  firmId: true,
  initials: true,
  isActive: true,
  contactId: true,
  entityAccess: true,      // ADD THIS
  accessExpiresAt: true,   // ADD THIS (for future time-bound enforcement)
} as const;
```

### IDOR-Fixed Notifications Route

```typescript
// Source: src/app/api/notifications/route.ts — rewrite GET
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  // Use session userId, NOT query param (was IDOR vulnerability)
  const userId = authUser.id;

  const typeParam = req.nextUrl.searchParams.get("type");
  const typeFilter =
    typeParam && VALID_TYPES.has(typeParam)
      ? (typeParam as NotificationType)
      : undefined;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, ...(typeFilter ? { type: typeFilter } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
```

---

## Files Requiring Changes

### 1. `src/lib/auth.ts`
- Add `entityAccess: true` and `accessExpiresAt: true` to `AUTH_USER_SELECT`
- This cascades the fix to all callers of `getAuthUser()` automatically

### 2. `src/app/api/deals/route.ts` (and `/api/deals/[id]/route.ts`, sub-routes)
- Add GP_TEAM permission gate for `"deals"` area in GET (read_only) and POST/PUT/PATCH/DELETE (full)

### 3. `src/app/api/entities/route.ts` (and `/api/entities/[id]/route.ts`)
- Add GP_TEAM permission gate for `"entities"` area
- Add SERVICE_PROVIDER entity-scope filter (entityAccess array constraint on `id` field)

### 4. `src/app/api/capital-calls/route.ts`, `src/app/api/distributions/route.ts` (and sub-routes)
- Add GP_TEAM permission gate for `"capital_activity"` area
- Add SERVICE_PROVIDER entity-scope filter (constraint on `entity.id`)

### 5. `src/app/api/investors/route.ts` (and `/api/investors/[id]/route.ts`)
- Add GP_TEAM permission gate for `"investors"` area
- SERVICE_PROVIDER entity-scope: investors are accessed through commitments scoped to entities

### 6. `src/app/api/documents/route.ts` (and sub-routes)
- Add GP_TEAM permission gate for `"documents"` area

### 7. `src/app/api/settings/ai-config/route.ts`, `src/app/api/settings/ai-prompts/route.ts`
- Add GP_TEAM permission gate for `"settings"` area (settings/permissions already has GP_ADMIN-only check)

### 8. `src/app/api/reports/route.ts`, `src/app/api/k1/route.ts`
- Add GP_TEAM permission gate for `"reports"` area
- Move K-1 auth guard outside try/catch

### 9. `src/app/api/notifications/route.ts`
- Remove `userId` query param
- Replace with `authUser.id` from session

### 10. Client component: notification bell
- Remove `?userId=...` from fetch URL (use session, server resolves it)

---

## Scope Boundaries

**In scope (Phase 8):**
- `getEffectivePermissions()` call in the 7 GP API route families listed above
- SERVICE_PROVIDER entity-scope on entity, capital-call, and distribution routes
- Notifications IDOR fix
- K-1 auth guard hardening

**Out of scope (do not touch):**
- LP routes (`/api/lp/*`) — LP access controlled by middleware correctly
- AI routes (`/api/ai/*`, `/api/agent/*`) — rate limiting but no fine-grained area
- Webhook routes — must remain unauthenticated by design
- Audit log route — internal, GP_ADMIN read-only pattern already correct
- Settings > Permissions route — GP_ADMIN-only already enforced correctly

---

## Dev Mock Mode Impact Assessment

**Safe by design.** Dev mock mode uses `MockUserProvider` on the client (no Clerk session). When the client calls an API, `getAuthUser()` calls `auth()` from Clerk, gets null `clerkUserId`, and returns null. The `if (!authUser) return unauthorized()` guard fires before any permission check. RBAC code is unreachable.

However: the current behavior is that many routes skip the `unauthorized()` return when no auth user exists (they fall through to Prisma with a null firmId filter). This is tolerated in dev because mock users don't have real Clerk sessions. Phase 8 should be careful NOT to break the dev workflow by making the auth guard universally hard-fail.

**Recommended approach:** Keep the existing pattern where `if (!authUser) return unauthorized()` is at the top of mutating handlers (POST, PUT, PATCH, DELETE) — this is already done. For GET handlers, some routes currently do `const firmId = authUser?.firmId || req.nextUrl.searchParams.get("firmId")` which allows dev with explicit firmId query param. This fallback should be preserved. The permission check itself should only run when `authUser` is non-null.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (established in Phase 1, zero-config TS/ESM) |
| Config file | Not found — ran as `vitest` directly |
| Quick run command | `npx vitest run src/lib` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CORE-02 | `checkPermission()` returns false for GP_TEAM with read_only when full required | unit | `npx vitest run src/lib/permissions` | No — Wave 0 gap |
| CORE-02 | `getEffectivePermissions()` merges stored permissions over defaults for GP_TEAM | unit | `npx vitest run src/lib/permissions` | No — Wave 0 gap |
| CORE-02 | GP_ADMIN always gets full permissions from `getEffectivePermissions()` | unit | `npx vitest run src/lib/permissions` | No — Wave 0 gap |
| CORE-03 | SERVICE_PROVIDER entity-scope filter excludes non-allowed entity IDs | unit | `npx vitest run src/lib/permissions` | No — Wave 0 gap |
| IDOR fix | `/api/notifications` ignores userId query param, uses session | manual-only | Browser test: pass `?userId=other-user-id`, verify own notifications returned | N/A |
| K-1 guard | `/api/k1` returns 401 without session | manual-only | `curl /api/k1` without auth header → expect 401 | N/A |

**Note:** The IDOR fix and K-1 guard are best verified by manual API calls or integration tests. Unit tests for permission logic are automated.

### Wave 0 Gaps

- [ ] `src/lib/__tests__/permissions.test.ts` — unit tests for `checkPermission()`, `getEffectivePermissions()`, and entity-scope filter logic
- [ ] Framework install: already present (Vitest from Phase 1)

---

## Sources

### Primary (HIGH confidence)
- `src/lib/permissions.ts` — `getEffectivePermissions()` implementation, verified complete
- `src/lib/permissions-types.ts` — `checkPermission()`, `PERMISSION_AREAS`, `DEFAULT_PERMISSIONS`
- `src/middleware.ts` — Clerk middleware, coarse-grained role enforcement
- `src/lib/auth.ts` — `getAuthUser()`, `AUTH_USER_SELECT`, `unauthorized()`, `forbidden()`
- `src/app/api/notifications/route.ts` — IDOR vulnerability confirmed (userId from query param)
- `src/app/api/k1/route.ts` — auth guard exists but inside try/catch
- `prisma/schema.prisma` (lines 492-520) — User model with `entityAccess String[]` confirmed
- `.planning/v1.0-MILESTONE-AUDIT.md` — CORE-02, CORE-03 gap evidence section

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` decisions log (2026-03-07 04-02 entries) — documents original Phase 4 design intent

### Tertiary (LOW confidence)
- None — all findings are from direct source code inspection

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all existing infrastructure
- Architecture (permission gate pattern): HIGH — derived from existing `settings/permissions/route.ts` which correctly enforces role checks
- Pitfalls: HIGH — derived from direct code inspection of `auth.ts` (missing entityAccess field) and `notifications/route.ts` (IDOR)
- Dev mock mode safety: HIGH — traced through `user-provider.tsx` and `auth.ts` call chain

**Research date:** 2026-03-07
**Valid until:** Stable — no external library dependencies; only internal code changes
