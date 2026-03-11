---
phase: 20-schema-cleanup-ui-polish
plan: 03
subsystem: logging
tags: [logger, console, structured-logging, api-routes, lib]

# Dependency graph
requires:
  - phase: 20-01
    provides: logger utility (src/lib/logger.ts) that this plan migrates all console.* calls to
provides:
  - Zero console.* calls in src/lib/ (all 19 files migrated)
  - Zero console.* calls in src/app/api/ (all 80 files migrated)
  - Consistent structured logging across entire server-side codebase
affects: [all future lib and api route development — use logger not console]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "logger.error(msg, { error: err instanceof Error ? err.message : String(err) }) — safe unknown error serialization"
    - "logger.info/debug for informational logs (only fires in dev), logger.error/warn always fire"
    - "Multi-arg console calls collapsed into structured metadata objects"
    - ".catch(console.error) replaced with explicit arrow function handlers"

key-files:
  created: []
  modified:
    - src/lib/ai-service.ts
    - src/lib/ai-config.ts
    - src/lib/audit.ts
    - src/lib/auth.ts
    - src/lib/slack.ts
    - src/lib/deal-stage-engine.ts
    - src/lib/document-extraction.ts
    - src/lib/dd-analysis-service.ts
    - src/lib/notification-delivery.ts
    - src/lib/email.ts
    - src/lib/sms.ts
    - src/lib/intake-service.ts
    - src/lib/agent-registry.ts
    - src/lib/accounting/qbo-provider.ts
    - src/lib/accounting/token-manager.ts
    - src/lib/integrations/notion.ts
    - src/lib/integrations/google-calendar.ts
    - src/lib/integrations/asana.ts
    - src/lib/computations/performance-attribution.ts
    - "src/app/api/**/*.ts (80 route files)"

key-decisions:
  - "Bulk migration via Python script for 80 API routes — consistent, safe, all logger imports added automatically"
  - "console.log for informational success events -> logger.info (fires in dev, suppressed in prod)"
  - "console.log for debug/trace events (timing, token counts) -> logger.debug"
  - "All raw error objects serialized to string via err instanceof Error ? err.message : String(err)"

patterns-established:
  - "Error serialization pattern: { error: err instanceof Error ? err.message : String(err) }"
  - "String variable pattern: { error: message } (no instanceof check needed for already-extracted strings)"
  - "Multi-arg pattern: collapsed into single metadata object { investorId, error: ... }"

requirements-completed: [INTEG-04]

# Metrics
duration: 11min
completed: 2026-03-11
---

# Phase 20 Plan 03: Console Migration Summary

**Replaced all console.log/warn/error calls across 99 server-side files (19 lib + 80 API routes) with structured logger, achieving zero console.* calls in production server-side code**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-11T01:04:21Z
- **Completed:** 2026-03-11T01:15:25Z
- **Tasks:** 2/2
- **Files modified:** 99

## Accomplishments
- Migrated all 19 src/lib/ files — zero console.* calls remain in library files
- Migrated all 80 src/app/api/ route files — zero console.* calls remain in API routes
- Error objects consistently serialized as strings to prevent unserializable objects from reaching the logger
- Build passes with zero TypeScript errors, all 822 tests passing

## Task Commits

1. **Task 1: Migrate console.* to logger in src/lib/ files** - `f0f8c09` (feat)
2. **Task 2: Migrate console.* to logger in src/app/api/ route files** - `74a7a60` (feat)

## Files Created/Modified

**src/lib/ files (19 files):**
- `src/lib/ai-service.ts` — 2 console.error -> logger.error
- `src/lib/ai-config.ts` — 2 calls (debug token usage, error decrypt)
- `src/lib/audit.ts` — 1 console.error -> logger.error
- `src/lib/auth.ts` — 1 console.log -> logger.info (auto-provision)
- `src/lib/slack.ts` — 7 calls (warn missing config, error on failures)
- `src/lib/deal-stage-engine.ts` — 1 .catch(console.error) -> explicit handler
- `src/lib/document-extraction.ts` — 3 calls + .catch(console.error) replaced
- `src/lib/dd-analysis-service.ts` — 7 calls (error, warn, debug timing)
- `src/lib/notification-delivery.ts` — 10 calls across multiple functions
- `src/lib/email.ts` — 3 calls
- `src/lib/sms.ts` — 3 calls
- `src/lib/intake-service.ts` — 1 console.error -> logger.error
- `src/lib/agent-registry.ts` — 1 console.error -> logger.error
- `src/lib/accounting/qbo-provider.ts` — 1 console.error -> logger.error
- `src/lib/accounting/token-manager.ts` — 1 console.error -> logger.error
- `src/lib/integrations/notion.ts` — 2 console.error -> logger.error
- `src/lib/integrations/google-calendar.ts` — 2 console.error -> logger.error
- `src/lib/integrations/asana.ts` — 2 console.error -> logger.error
- `src/lib/computations/performance-attribution.ts` — 1 console.error -> logger.error

**src/app/api/ files (80 files):** All route files across all domains migrated

## Decisions Made
- Used Python script for bulk API route migration (80 files) — consistent replacement pattern, all logger imports added automatically
- `logger.info` for successful operations (invite sent, document processed, etc.)
- `logger.debug` for diagnostic/timing information (DD timing report, token counts)
- Multi-arg console calls (e.g., `console.error("msg:", id, err)`) collapsed into single metadata object `{ investorId, error: ... }`
- `.catch(console.error)` fire-and-forget patterns replaced with explicit arrow function handlers that call `logger.error`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript type errors from raw `unknown` error variables**
- **Found during:** Task 2 (API route migration)
- **Issue:** Python bulk migration left `logger.error("msg", err)` where `err: unknown` — TypeScript rejects `unknown` as `LogMeta`
- **Fix:** Second pass Python script wrapped all bare error variables: `{ error: err instanceof Error ? err.message : String(err) }`
- **Files modified:** 76 API route files
- **Verification:** `npm run build` succeeded with zero TypeScript errors
- **Committed in:** 74a7a60 (Task 2 commit)

**2. [Rule 1 - Bug] Double-wrapping of already-extracted string variables**
- **Found during:** Task 2 error fix pass
- **Issue:** Pattern `const message = err instanceof Error ? err.message : "fallback"` followed by `logger.error("msg", message)` — second pass incorrectly wrapped `message` with another `instanceof Error` check
- **Fix:** Third pass detected string variable names (message, msg) and simplified to `{ error: message }`
- **Files modified:** 4 files (closing, extract-metadata, documents routes)
- **Verification:** `npm run build` succeeded
- **Committed in:** 74a7a60 (Task 2 commit)

**3. [Rule 1 - Bug] Multi-arg logger call in k1/upload/route.ts**
- **Found during:** Build verification
- **Issue:** `console.error("msg:", investorId, err)` was migrated to a 3-arg `logger.error(...)` — logger only accepts 1-2 args
- **Fix:** Manually collapsed to `logger.error("msg", { investorId, error: ... })`
- **Files modified:** `src/app/api/k1/upload/route.ts`
- **Verification:** `npm run build` succeeded
- **Committed in:** 74a7a60 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (Rule 1 bugs from automated migration)
**Impact on plan:** All auto-fixes necessary for TypeScript correctness. No scope creep. All 3 were direct consequences of the bulk migration strategy and fully resolved before commit.

## Issues Encountered
- Python regex bulk migration fast but imprecise — required 2 cleanup passes for type correctness. Manual per-file migration would have been cleaner but 5x slower. The 3 auto-fixes caught all issues.

## Next Phase Readiness
- All server-side logging now goes through structured logger
- Plan 05 (API route parseBody migration) and Plan 06 (remaining component console calls) can proceed
- Logger is now the single logging interface — zero direct console.* usage in lib/ or api/ code

---
*Phase: 20-schema-cleanup-ui-polish*
*Completed: 2026-03-11*

## Self-Check: PASSED

- FOUND: `.planning/phases/20-schema-cleanup-ui-polish/20-03-SUMMARY.md`
- FOUND: commit f0f8c09 (Task 1 — lib migration)
- FOUND: commit 74a7a60 (Task 2 — API route migration)
- VERIFIED: 0 console.* calls in src/lib/ (excluding tests/logger.ts)
- VERIFIED: 0 console.* calls in src/app/api/ (excluding __tests__)
- VERIFIED: All 822 tests passing
- VERIFIED: Build succeeds with zero TypeScript errors
