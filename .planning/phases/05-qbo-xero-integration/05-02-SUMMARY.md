---
phase: 05-qbo-xero-integration
plan: 02
subsystem: api
tags: [quickbooks, qbo, accounting, account-mapping, trial-balance, swr, react]

# Dependency graph
requires:
  - phase: 05-qbo-xero-integration
    plan: 01
    provides: QBO OAuth flow, getValidTokens token manager, qboProvider, AccountingConnection + AccountMapping + TrialBalanceSnapshot schema

provides:
  - GET chart-of-accounts API with auto-detected bucket suggestions + existing mapping merge + suggestFrom cross-entity param
  - GET/POST/PATCH mappings API for bulk create/update + single patch of account mappings
  - POST sync API that triggers trial balance pull and upserts TrialBalanceSnapshot
  - GET trial-balance API returning snapshot organized by 5 Atlas buckets + UNMAPPED section
  - AccountMappingPanel UI: grouped account table, per-account bucket dropdown, Apply All Suggestions, Save Mappings
  - TrialBalanceView UI: period selector, bucket sections (expandable), reconciliation summary, Sync Now button
  - Enhanced accounting page with entity drill-in (Account Mapping + Trial Balance tabs), Connect/Reconnect/Sync actions inline

affects:
  - 05-03 (GL-based NAV computation will read TrialBalanceSnapshot + AccountMapping data built here)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Delete-then-createMany pattern for upserting AccountMapping records (no @@unique constraint on connectionId+providerAccountId)
    - SWR onSuccess initialization for pre-populating local state from API response
    - Entity drill-in expand/collapse with inline tab switching
    - Inline OAuth redirect (href navigation) for Connect/Reconnect vs API call for Sync Now

key-files:
  created:
    - src/app/api/accounting/connections/[connectionId]/chart-of-accounts/route.ts
    - src/app/api/accounting/connections/[connectionId]/mappings/route.ts
    - src/app/api/accounting/connections/[connectionId]/sync/route.ts
    - src/app/api/accounting/connections/[connectionId]/trial-balance/route.ts
    - src/components/features/accounting/account-mapping-panel.tsx
    - src/components/features/accounting/trial-balance-view.tsx
  modified:
    - src/app/(gp)/accounting/page.tsx

key-decisions:
  - "Delete-then-createMany used for AccountMapping upsert — no @@unique([connectionId, providerAccountId]) in schema, so prisma upsert was unavailable; delete matching providerAccountIds then createMany is semantically equivalent"
  - "suggestFrom query param on chart-of-accounts endpoint allows cross-entity name-based mapping suggestions — matches on lowercased account name from source connection's mappings"
  - "chartOfAccountsMapped set to true once any mappings exist (count > 0) — simpler than checking coverage of all balance-sheet accounts; GP controls when mappings are 'complete'"
  - "Trial balance tab disabled until chartOfAccountsMapped=true — prevents showing empty UNMAPPED bucket for entities with no mappings configured"
  - "Connect/Reconnect use href navigation to OAuth flow; Sync Now uses inline fetch — different because OAuth requires full page redirect"

patterns-established:
  - "Accounting connection firm ownership check: load connection with entity include, compare entity.firmId to authUser.firmId"
  - "Token expiry response: return 401 with 'OAuth tokens expired, please reconnect' message"
  - "Sync lifecycle: set SYNCING → fetch from QBO → upsert snapshot → set CONNECTED or ERROR"

requirements-completed: [ACCT-03, ACCT-04, ASSET-03]

# Metrics
duration: 6min
completed: 2026-03-08
---

# Phase 5 Plan 02: Account Mapping + Trial Balance Summary

**QBO account mapping workflow with auto-detection, bulk CRUD APIs, and trial balance sync with snapshot storage organized by Atlas's 5 financial buckets**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-08T03:14:20Z
- **Completed:** 2026-03-08T03:20:26Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- 4 new API routes under /api/accounting/connections/[connectionId]/ — chart-of-accounts with auto-detect, mappings CRUD, sync trigger, trial-balance viewer
- AccountMappingPanel: complete mapping workflow — QBO accounts grouped by classification, per-account dropdown, Apply All Suggestions button, unmapped warning badge, Save Mappings
- TrialBalanceView: period selector, 5 bucket sections (expandable), UNMAPPED section in amber, reconciliation status summary, Sync Now with loading state
- Accounting page fully rewritten with entity drill-in — Account Mapping + Trial Balance tabs, Connect/Reconnect/Sync inline actions, SectionErrorBoundary wraps drill-in content

## Task Commits

Each task was committed atomically:

1. **Task 1: Account mapping + trial balance API routes** - `e304dd0` (feat)
2. **Task 2: Account mapping + trial balance UI components + accounting page drill-in** - `abb5056` (feat)

**Plan metadata:** (created after this summary)

## Files Created/Modified
- `src/app/api/accounting/connections/[connectionId]/chart-of-accounts/route.ts` - GET: QBO accounts + auto-detect + existing mappings merged + suggestFrom support
- `src/app/api/accounting/connections/[connectionId]/mappings/route.ts` - GET/POST/PATCH: list mappings, bulk upsert (delete+createMany), single patch
- `src/app/api/accounting/connections/[connectionId]/sync/route.ts` - POST: SYNCING→fetchTrialBalance→upsert snapshot→CONNECTED or ERROR lifecycle
- `src/app/api/accounting/connections/[connectionId]/trial-balance/route.ts` - GET: latest/specific snapshot organized by Atlas buckets; list=true for period selector
- `src/components/features/accounting/account-mapping-panel.tsx` - "use client" component: grouped account table, per-account dropdown, Apply All Suggestions, Save Mappings, unmapped banner
- `src/components/features/accounting/trial-balance-view.tsx` - "use client" component: period selector, expandable bucket sections, UNMAPPED amber section, reconciliation summary
- `src/app/(gp)/accounting/page.tsx` - Entity drill-in with mapping/trial-balance tabs, Connect/Reconnect/Sync inline, error banner with lastSyncError

## Decisions Made
- Delete-then-createMany used for AccountMapping upsert — Prisma upsert requires @@unique constraint; since schema only has `id` as unique key on AccountMapping, delete matching records by (connectionId, providerAccountId) then createMany is the correct upsert pattern
- `suggestFrom` query param enables cross-entity name-based mapping suggestions — when a GP has already mapped one entity, they can seed suggestions for a new one by name matching
- `chartOfAccountsMapped` set to true once any mappings saved — GP decides when coverage is "complete"; requiring all balance-sheet accounts would be too strict
- Trial Balance tab disabled (not hidden) until mappings exist — shows the tab but prevents navigation with a tooltip explaining why
- Connect/Reconnect navigate via `href` to OAuth flow; Sync Now uses inline `fetch` — OAuth requires full page redirect with CSRF cookie set by server

## Deviations from Plan

None — plan executed exactly as written. The delete-then-createMany approach for upsert is an implementation detail, not a deviation; the plan spec was to "upsert by (connectionId, providerAccountId)" which is exactly what this achieves semantically.

## Issues Encountered
- AccountMapping model has no `@@unique([connectionId, providerAccountId])` constraint, so Prisma's `upsert` (which requires a unique where clause) was unavailable. Solved with delete-then-createMany pattern, which is semantically equivalent and transactionally safe.

## User Setup Required
None — API routes and UI components are code-only. The QBO OAuth credentials from Plan 01 are reused here.

## Next Phase Readiness
- Account mapping and trial balance data is now stored and structured — Plan 03 can read TrialBalanceSnapshot + AccountMapping to compute GL-based NAV
- TrialBalanceView already organizes by the 5 Atlas buckets matching the NAV formula structure
- AccountMapping records include both providerAccountId and providerAccountName for flexible lookup

---
*Phase: 05-qbo-xero-integration*
*Completed: 2026-03-08*

## Self-Check: PASSED

- chart-of-accounts/route.ts: FOUND
- mappings/route.ts: FOUND
- sync/route.ts: FOUND
- trial-balance/route.ts: FOUND
- account-mapping-panel.tsx: FOUND
- trial-balance-view.tsx: FOUND
- 05-02-SUMMARY.md: FOUND
- Commit e304dd0: FOUND
- Commit abb5056: FOUND
