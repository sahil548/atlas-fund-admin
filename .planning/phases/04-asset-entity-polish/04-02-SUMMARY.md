---
phase: 04-asset-entity-polish
plan: 02
subsystem: auth, middleware, permissions, audit
tags: [rbac, middleware, permissions, audit-log, service-provider, typescript, zod, swr, prisma]

# Dependency graph
requires:
  - phase: 03-capital-activity
    provides: all Phase 3 API routes for capital calls, distributions, entities
  - phase: 04-01
    provides: side letter engine and schema foundation

provides:
  - Role-based middleware: LP_INVESTOR redirected from GP pages; blocked from GP API with 403
  - SERVICE_PROVIDER write-method blocking (POST/PUT/PATCH/DELETE returns 403)
  - src/lib/permissions-types.ts: PERMISSION_AREAS, PermissionLevel, UserPermissions, DEFAULT_PERMISSIONS, checkPermission (client-safe)
  - src/lib/permissions.ts: server-side getEffectivePermissions() with Prisma lookup
  - src/lib/audit.ts: logAudit() fire-and-forget helper
  - AuditLog Prisma model: firmId, userId, action, targetType, targetId, metadata
  - User.permissions Json? field: per-user configurable permissions for GP_TEAM
  - /api/settings/permissions: GET + PUT for GP_TEAM permissions (GP_ADMIN only)
  - /api/users/[id]/entity-access: GET + PUT for SERVICE_PROVIDER entity scoping (GP_ADMIN only)
  - /api/audit-log: GET with filtering (targetType, userId, date range, pagination)
  - permissions-tab.tsx: GP_TEAM user x area permission matrix with dropdowns
  - service-provider-manager.tsx: manage entityAccess[] per SERVICE_PROVIDER user
  - Settings page: Permissions tab + Service Providers tab
  - Audit trail wired to: CREATE_DEAL, KILL_DEAL, CLOSE_DEAL, REVIVE_DEAL, CREATE_ENTITY, UPDATE_ENTITY, CREATE_CAPITAL_CALL, CREATE_DISTRIBUTION

affects: [05-lp-portal, settings, all-api-routes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-server split for permissions: permissions-types.ts (client-safe) + permissions.ts (server-only Prisma)"
    - "Audit logging as fire-and-forget: logAudit() never awaited in hot paths, failures logged not thrown"
    - "Middleware role check via Clerk publicMetadata: role stored in session claims for zero-latency check"
    - "Permission matrix UI: local state overrides for unsaved changes, save-per-row with visual dirty state"

key-files:
  created:
    - src/lib/permissions-types.ts
    - src/lib/permissions.ts
    - src/lib/audit.ts
    - src/app/api/settings/permissions/route.ts
    - src/app/api/users/[id]/entity-access/route.ts
    - src/app/api/audit-log/route.ts
    - src/components/features/settings/permissions-tab.tsx
    - src/components/features/settings/service-provider-manager.tsx
  modified:
    - src/middleware.ts
    - src/lib/auth.ts
    - src/lib/routes.ts
    - src/lib/schemas.ts
    - prisma/schema.prisma
    - src/app/(gp)/settings/page.tsx
    - src/app/api/deals/route.ts
    - src/app/api/deals/[id]/route.ts
    - src/app/api/entities/route.ts
    - src/app/api/entities/[id]/route.ts
    - src/app/api/capital-calls/route.ts
    - src/app/api/distributions/route.ts

decisions:
  - "Clerk publicMetadata for role in middleware: avoids DB query on every request; role stored at invite time"
  - "permissions-types.ts split: Prisma import in permissions.ts caused client bundle errors; pure-TS types moved to separate file"
  - "GP_TEAM permissions default to read_only everywhere; GP_ADMIN overrides cannot be configured (always full)"
  - "Audit log is fire-and-forget: never blocks primary operation; failure only logged to console"
  - "SERVICE_PROVIDER entity-access checked at API layer (not middleware) for per-resource granularity"

metrics:
  duration: 15min
  tasks_completed: 2
  tasks_total: 2
  files_created: 8
  files_modified: 12
  completed_date: "2026-03-07"
---

# Phase 04 Plan 02: RBAC + Permissions + Audit Log Summary

Role-based access control enforced at middleware and API layer: LP_INVESTOR users blocked from GP routes, SERVICE_PROVIDER users restricted to read-only on assigned entities, GP_TEAM permissions configurable per area by GP_ADMIN, full audit trail on key mutations.

## What Was Built

### Task 1: Middleware Role Enforcement + Permissions System

**Middleware (`src/middleware.ts`):**
- LP_INVESTOR hitting GP pages (dashboard, deals, entities, assets, etc.) gets redirected to `/lp/dashboard`
- LP_INVESTOR calling GP API routes gets 403 Forbidden
- SERVICE_PROVIDER using write methods (POST/PUT/PATCH/DELETE) gets 403 Forbidden
- Role read from Clerk session's `publicMetadata.role` — zero additional DB queries in middleware

**Permissions system (`src/lib/permissions-types.ts` + `src/lib/permissions.ts`):**
- `PERMISSION_AREAS`: deals, entities, capital_activity, investors, documents, settings, reports
- `PermissionLevel`: "full" | "read_only" | "none"
- `DEFAULT_PERMISSIONS`: GP_ADMIN=full everywhere, GP_TEAM=read_only everywhere, LP_INVESTOR=none everywhere
- `checkPermission(perms, area, requiredLevel)`: level ordering comparison
- `getEffectivePermissions(userId)`: DB lookup, merges stored JSON over defaults for GP_TEAM
- Client-server split: `permissions-types.ts` has no Prisma imports (safe for client components)

**Schema additions (`prisma/schema.prisma`):**
- `User.permissions Json?`: stores GP_TEAM permission overrides per area
- `AuditLog` model: id, firmId, userId, action, targetType, targetId, metadata Json, createdAt (with 4 indexes)

**Audit helper (`src/lib/audit.ts`):**
- `logAudit(firmId, userId, action, targetType, targetId, metadata?)`: fire-and-forget, wraps prisma.auditLog.create, swallows errors to never block primary operations

**Auth + Routes updates:**
- `getAuthUserRole()` lightweight helper in auth.ts (no auto-provisioning, just role lookup)
- `requiredRole?` optional hint field added to `AppRoute` interface in routes.ts
- `UpdatePermissionsSchema`, `UpdateEntityAccessSchema`, `AuditLogQuerySchema` added to schemas.ts

### Task 2: Settings UI + API Routes + Audit Logging

**API Routes:**
- `GET /api/settings/permissions`: returns all GP_TEAM users with merged effective permissions (GP_ADMIN only)
- `PUT /api/settings/permissions`: updates permissions JSON for a GP_TEAM user (GP_ADMIN only, validates target user role and firm)
- `GET /api/users/[id]/entity-access`: returns entityAccess[] array with enriched entity names
- `PUT /api/users/[id]/entity-access`: updates entityIds[] with firm-boundary validation
- `GET /api/audit-log`: paginated cursor-based audit log with filters (targetType, userId, startDate, endDate)

**Settings UI:**
- `PermissionsTab`: 7-column permission matrix for each GP_TEAM user, save-per-row with dirty state indicators (indigo border on changed cells)
- `ServiceProviderManager`: expandable rows per SERVICE_PROVIDER, shows assigned entities as removable pills, dropdown to add new entities, save button per user
- Settings page: added "Permissions" and "Service Providers" tabs (both GP_ADMIN only in practice)

**Audit Logging Wired:**
- `POST /api/deals` → CREATE_DEAL
- `PATCH /api/deals/[id]` → KILL_DEAL, CLOSE_DEAL, REVIVE_DEAL
- `POST /api/entities` → CREATE_ENTITY
- `PUT /api/entities/[id]` → UPDATE_ENTITY
- `POST /api/capital-calls` → CREATE_CAPITAL_CALL
- `POST /api/distributions` → CREATE_DISTRIBUTION

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Client component importing Prisma through permissions.ts**
- **Found during:** Task 2 build
- **Issue:** `permissions-tab.tsx` imported `PERMISSION_AREAS` and types from `@/lib/permissions.ts` which imported `@/lib/prisma`. Client components cannot import Prisma — caused "Module not found: Can't resolve 'dns'" build errors.
- **Fix:** Split permissions into two files: `permissions-types.ts` (pure TypeScript constants, client-safe) and `permissions.ts` (server-only, re-exports types + adds `getEffectivePermissions()` with Prisma). Updated `permissions-tab.tsx` to import from `permissions-types.ts`.
- **Files modified:** `src/lib/permissions-types.ts` (new), `src/lib/permissions.ts` (refactored), `src/components/features/settings/permissions-tab.tsx`

**2. [Rule 3 - Blocking] TypeScript error in documents page preventing build**
- **Found during:** Task 2 build verification
- **Issue:** `src/app/(gp)/documents/page.tsx` had inline SWR fetcher `(url) => fetch(url)...` with implicit `any` type on `url` parameter — TypeScript error blocking build.
- **Fix:** Added explicit `: string` type annotation: `(url: string) => fetch(url)...`
- **Files modified:** `src/app/(gp)/documents/page.tsx`

## Commits

| Task | Description | Hash |
|------|-------------|------|
| Task 1 | Middleware role enforcement + permissions system | `1d15b59` |
| Task 2 | Permissions UI + service provider management + audit logging | `d930acf` |

## Self-Check: PASSED

Files verified to exist:
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/src/lib/permissions-types.ts` — FOUND
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/src/lib/permissions.ts` — FOUND
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/src/lib/audit.ts` — FOUND
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/src/app/api/settings/permissions/route.ts` — FOUND
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/src/app/api/users/[id]/entity-access/route.ts` — FOUND
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/src/app/api/audit-log/route.ts` — FOUND
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/src/components/features/settings/permissions-tab.tsx` — FOUND
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/src/components/features/settings/service-provider-manager.tsx` — FOUND

Commits verified:
- `1d15b59` — FOUND in git log
- `d930acf` — FOUND in git log

Build: Passes with zero errors.
