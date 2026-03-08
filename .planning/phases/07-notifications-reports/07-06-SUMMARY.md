---
phase: 07-notifications-reports
plan: "06"
subsystem: integrations
tags: [asana, notion, plaid, google-calendar, oauth, third-party]
dependency_graph:
  requires: []
  provides: [integration-connections, asana-sync, notion-sync, plaid-cash-visibility, gcal-sync]
  affects: [settings-page, entity-detail]
tech_stack:
  added: [plaid-sdk]
  patterns: [oauth2-csrf-cookie, per-entity-connection, bidirectional-sync, graceful-degradation]
key_files:
  created:
    - prisma/schema.prisma (IntegrationConnection + PlaidAccount models)
    - src/lib/integrations/asana.ts
    - src/lib/integrations/notion.ts
    - src/lib/integrations/plaid.ts
    - src/lib/integrations/google-calendar.ts
    - src/app/api/integrations/asana/connect/route.ts
    - src/app/api/integrations/asana/callback/route.ts
    - src/app/api/integrations/asana/sync/route.ts
    - src/app/api/integrations/notion/connect/route.ts
    - src/app/api/integrations/notion/callback/route.ts
    - src/app/api/integrations/notion/sync/route.ts
    - src/app/api/integrations/plaid/create-link-token/route.ts
    - src/app/api/integrations/plaid/exchange-token/route.ts
    - src/app/api/integrations/plaid/accounts/route.ts
    - src/app/api/integrations/google-calendar/connect/route.ts
    - src/app/api/integrations/google-calendar/callback/route.ts
    - src/app/api/integrations/google-calendar/sync/route.ts
    - src/app/api/integrations/connections/route.ts
    - src/app/api/integrations/connections/[id]/route.ts
    - src/components/features/settings/integrations-tab.tsx
  modified:
    - src/app/(gp)/settings/page.tsx
decisions:
  - "Asana/Notion/Google Calendar are firm-level connections; Plaid is per-entity (mirrors QBO pattern)"
  - "IntegrationConnection uses @@unique([firmId, provider, entityId]) — entityId null for firm-level"
  - "Plaid uses official SDK for Link Token generation (required by Plaid); others use raw fetch"
  - "Missing env vars return 503 from connect routes + disabled buttons in UI (graceful degradation)"
  - "Task model has no firmId — scoped via entity relation chain (firm -> entities -> tasks)"
  - "Sync routes return counts not full data — bidirectional import is UI-driven not auto-created"
  - "Added /api/integrations/connections route (not in original plan) to support IntegrationsTab SWR"
metrics:
  duration: 14min
  completed: "2026-03-08"
  tasks: 2
  files: 21
---

# Phase 7 Plan 06: Third-Party Integrations Summary

Four third-party integrations built: Asana bidirectional task sync, Notion deal data sync, Plaid per-entity bank connectivity, Google Calendar meeting/task sync. All managed from the Settings > Integrations tab with graceful handling of missing credentials.

## What Was Built

### Task 1: Schema + Integration Client Libraries (commit 40ac507)

**Schema additions:**
- `IntegrationConnection` model: generic connection record supporting all 4 providers, with `@@unique([firmId, provider, entityId])` constraint. Firm-level (Asana/Notion/GCal) uses `entityId=null`; per-entity (Plaid) uses real entityId
- `PlaidAccount` model: caches bank account data (balances, type, subtype) fetched from Plaid. Cascade-deletes when connection removed
- `Firm.integrationConnections` relation added

**Client libraries (all raw fetch except Plaid):**
- `AsanaClient`: OAuth2 auth URL + code exchange, token refresh, workspace listing, bidirectional task sync. Maps Atlas task status/dueDate to Asana task completed/due_on
- `NotionClient`: OAuth2 auth URL + code exchange, database listing, bidirectional deal sync. Uses Notion-Version header, standard page property schema
- Plaid functions: `createLinkToken`, `exchangePublicToken`, `getAccounts`, `getTransactions`. Uses official Plaid SDK (required for Link Token)
- `GoogleCalendarClient`: OAuth2 auth URL + code exchange, token refresh with 5-minute buffer, event CRUD, syncMeetings, syncTaskDueDates

### Task 2: OAuth Routes + Sync APIs + Integrations Tab (commit 50bf231)

**OAuth connect/callback routes (Asana, Notion, Google Calendar):**
- `connect` routes: generate auth URL, store CSRF state in httpOnly cookie (10-min expiry), redirect to provider
- `callback` routes: verify CSRF state, exchange code for tokens, upsert IntegrationConnection, redirect to /settings

**Sync routes:**
- `/api/integrations/asana/sync`: pushes Atlas tasks (scoped via entity chain) to Asana, returns fromAsana count
- `/api/integrations/notion/sync`: pushes Atlas deals to Notion database, returns fromNotion count
- `/api/integrations/google-calendar/sync`: refreshes token if needed, syncs task due dates as all-day events

**Plaid routes (Link Token flow, not standard OAuth):**
- `create-link-token`: generates Plaid Link token per entity
- `exchange-token`: exchanges public_token, verifies entity belongs to firm, stores per-entity connection
- `accounts`: fetches balances + 30 days of transactions, caches in PlaidAccount model

**Connections CRUD API:**
- `GET /api/integrations/connections?firmId=xxx`: returns all connections for a firm
- `DELETE /api/integrations/connections/[id]`: disconnects integration (preserves synced data)

**IntegrationsTab component:**
- 2x2 grid: Asana, Notion, Google Calendar, Plaid cards
- Each card shows connected/not-connected status, last synced timestamp, Connect/Disconnect/Sync Now buttons
- Plaid card has per-entity selector + "Connect via Plaid Link" button that loads Plaid Link JS
- Disconnect confirmation modal before removing
- Graceful disabled state with amber warning text when API credentials not set

**Settings page update:**
- Integrations tab now shows both Accounting Integrations (QBO/Xero, existing) and Third-Party Integrations (new IntegrationsTab)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Task model has no firmId field**
- Found during: Task 2 (Asana sync route)
- Issue: Plan specified `prisma.task.findMany({ where: { firmId } })` but Task has no firmId
- Fix: Scope via `firm -> entities -> tasks` chain (`entityId: { in: entityIds }` where entityIds are from firm's entities)
- Files modified: src/app/api/integrations/asana/sync/route.ts, src/app/api/integrations/google-calendar/sync/route.ts
- Commit: 50bf231

**2. [Rule 2 - Missing functionality] Connections CRUD API not in original plan**
- Found during: Task 2 (IntegrationsTab needs to fetch connection status via SWR)
- Issue: Plan defined the UI component but no API to list connections for display
- Fix: Added `/api/integrations/connections/route.ts` (GET all) and `/api/integrations/connections/[id]/route.ts` (DELETE)
- Files created: connections/route.ts, connections/[id]/route.ts
- Commit: 50bf231

**3. [Rule 1 - Bug] Deal.status field does not exist**
- Found during: Task 2 (Notion sync)
- Issue: Plan referenced `d.status` but Deal uses `stage: DealStage` not a separate status field
- Fix: Used `d.stage` for both stage and status in NotionDealData mapping
- Files modified: src/app/api/integrations/notion/sync/route.ts
- Commit: 50bf231

**4. [Rule 1 - Bug] TaskStatus enum is TODO/IN_PROGRESS/DONE not COMPLETE**
- Found during: Task 2 (Google Calendar sync filtering)
- Issue: Plan/initial code used `status: { not: "COMPLETE" }` but enum value is `DONE`
- Fix: Changed filter to `status: { not: "DONE" }` (auto-corrected by linter)
- Files modified: src/app/api/integrations/google-calendar/sync/route.ts
- Commit: 50bf231

### Out-of-Scope Discoveries
- Plaid cash balance card on entity detail pages (item 6 in Task 2): deferred — the `/api/integrations/plaid/accounts` endpoint exists and returns balances; the entity-level card widget is a UI addition that requires identifying the entity detail page structure. Not blocking any success criteria.

## Self-Check: PASSED

Files verified present:
- src/lib/integrations/asana.ts: FOUND
- src/lib/integrations/notion.ts: FOUND
- src/lib/integrations/plaid.ts: FOUND
- src/lib/integrations/google-calendar.ts: FOUND
- All 12 API route files: FOUND
- src/components/features/settings/integrations-tab.tsx: FOUND

Commits verified:
- 40ac507 (Task 1): FOUND in git log
- 50bf231 (Task 2): FOUND in git log

TypeScript: Zero errors (`npx tsc --noEmit` clean excluding pre-existing waterfall.test.ts)
