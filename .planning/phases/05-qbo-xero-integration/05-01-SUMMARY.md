---
phase: 05-qbo-xero-integration
plan: 01
subsystem: api
tags: [oauth2, quickbooks, qbo, intuit, prisma, accounting, token-manager]

# Dependency graph
requires:
  - phase: 04-asset-entity-polish
    provides: entity management, firm-based multi-tenancy, getAuthUser/GP_ADMIN role enforcement
provides:
  - QBO OAuth2 connect/callback/disconnect flow with CSRF state protection
  - Provider-agnostic accounting interfaces (AccountingProviderInterface) ready for Xero
  - Token manager with auto-refresh (1hr access / 100day refresh lifecycle)
  - TrialBalanceSnapshot model for future sync storage
  - AccountMapping model expanded for auto-detected mappings
affects:
  - 05-02 (account mapping UI will use AccountingConnection + token-manager)
  - 05-03 (trial balance sync will use qboProvider.fetchTrialBalance + TrialBalanceSnapshot)

# Tech tracking
tech-stack:
  added: [intuit-oauth (installed but unused - raw fetch preferred for TypeScript compatibility)]
  patterns:
    - Raw fetch to Intuit OAuth2 endpoints (no SDK dependency)
    - CSRF state cookie pattern for OAuth2 callback protection
    - Token auto-refresh with 60-second buffer before expiry
    - Fire-and-forget token revocation on disconnect
    - Prisma.JsonNull for nullable JSON fields

key-files:
  created:
    - src/lib/accounting/provider-types.ts
    - src/lib/accounting/qbo-provider.ts
    - src/lib/accounting/token-manager.ts
    - src/app/api/integrations/qbo/connect/route.ts
    - src/app/api/integrations/qbo/callback/route.ts
    - src/app/api/integrations/qbo/disconnect/route.ts
  modified:
    - prisma/schema.prisma
    - src/lib/schemas.ts

key-decisions:
  - "Used raw fetch instead of intuit-oauth SDK — SDK has no TypeScript types; standard OAuth2 is straightforward with fetch"
  - "State payload is base64url-encoded JSON {entityId, nonce} stored in httpOnly cookie for CSRF protection"
  - "Token refresh preserves realmId from existing tokens since Intuit refresh response omits it"
  - "Disconnect preserves chartOfAccountsMapped and accountMappings (historical data kept on disconnection)"
  - "Company name fetch after callback is non-fatal — cosmetic display only"
  - "Prisma.JsonNull used for oauthCredentials: null — TypeScript requires explicit null value type for nullable JSON fields"

patterns-established:
  - "Accounting providers: implement AccountingProviderInterface — Xero follows same contract"
  - "OAuth routes: connect -> CSRF cookie -> redirect, callback -> verify cookie -> exchange -> store"
  - "Token refresh: 60-second buffer before accessTokenExpiresAt to avoid borderline expiry"

requirements-completed: [ACCT-01, ACCT-02]

# Metrics
duration: 6min
completed: 2026-03-08
---

# Phase 5 Plan 01: QBO OAuth Integration Summary

**QBO OAuth2 connect/callback/disconnect with provider-agnostic TypeScript interfaces, auto-refresh token manager, and TrialBalanceSnapshot schema for future sync storage**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-08T03:04:37Z
- **Completed:** 2026-03-08T03:10:47Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Schema foundation: TrialBalanceSnapshot model, SYNCING status, AccountMapping fields (isAutoDetected, updatedAt), AccountingConnection enhanced with lastSyncError + relation
- Provider-agnostic interface layer in src/lib/accounting/ — QBOProvider, AccountingProviderInterface, detectAtlasBucket; Xero can implement the same interface later
- Complete QBO OAuth2 flow: connect (CSRF cookie + Intuit redirect), callback (token exchange + DB upsert + company name fetch), disconnect (token revoke + DISCONNECTED status)
- Token manager with automatic access token refresh, expired refresh token detection, and error state marking

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema changes + provider abstraction interfaces** - `7c1a7df` (feat)
2. **Task 2: QBO OAuth flow (connect, callback, disconnect) + token manager** - `1657ca5` (feat)

**Plan metadata:** (created after this summary)

## Files Created/Modified
- `prisma/schema.prisma` - Added SYNCING to SyncStatus, expanded AccountMapping, new TrialBalanceSnapshot model, AccountingConnection lastSyncError + trialBalanceSnapshots relation
- `src/lib/schemas.ts` - Added AtlasAccountBucketEnum, CreateAccountMappingSchema, UpdateAccountMappingSchema; updated UpdateAccountingConnectionSchema to include SYNCING
- `src/lib/accounting/provider-types.ts` - AccountingProviderInterface, OAuthTokens, ChartOfAccountsEntry, AtlasAccountBucket, TrialBalanceEntry, TrialBalanceResult, detectAtlasBucket
- `src/lib/accounting/qbo-provider.ts` - QBOProvider class with all 6 interface methods using raw fetch to Intuit OAuth2 + REST API v3
- `src/lib/accounting/token-manager.ts` - storeTokens, getValidTokens (auto-refresh), refreshTokensIfNeeded
- `src/app/api/integrations/qbo/connect/route.ts` - GET endpoint: GP_ADMIN guard, entity validation, CSRF cookie, Intuit redirect
- `src/app/api/integrations/qbo/callback/route.ts` - GET endpoint: CSRF verify, token exchange, DB upsert, company name fetch, redirect to /accounting
- `src/app/api/integrations/qbo/disconnect/route.ts` - POST endpoint: token revoke (fire-and-forget), DISCONNECTED status, preserve mapped data

## Decisions Made
- Used raw fetch to Intuit OAuth2 endpoints instead of intuit-oauth SDK — SDK has no TypeScript type definitions; standard OAuth2 is simple enough to implement directly
- CSRF state is base64url-encoded JSON `{entityId, nonce}` stored in httpOnly cookie (10-min expiry) to survive the OAuth redirect round-trip
- Token refresh preserves the existing `realmId` from DB since Intuit's refresh token response omits it
- Disconnect preserves `chartOfAccountsMapped` and `accountMappings` — previously pulled data remains useful even after OAuth disconnection
- `Prisma.JsonNull` required for setting nullable JSON field to null (TypeScript type system demands explicit null value vs undefined)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error: null assignment to nullable JSON field**
- **Found during:** Task 2 (disconnect route)
- **Issue:** `oauthCredentials: null` caused TS2322 — Prisma's nullable JSON type requires `Prisma.JsonNull` not native null
- **Fix:** Imported `Prisma` from `@prisma/client` and used `Prisma.JsonNull`
- **Files modified:** src/app/api/integrations/qbo/disconnect/route.ts
- **Verification:** TypeScript compiles with no errors
- **Committed in:** 1657ca5 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed TypeScript error: accessing .id on ColData value object**
- **Found during:** Task 2 (qbo-provider.ts trial balance parser)
- **Issue:** QBO ColData items type is `{ value: string }` — accessing `.id` causes TS2339
- **Fix:** Changed to access `row.Header.ColData[0].id` instead, which uses a wider typed interface
- **Files modified:** src/lib/accounting/qbo-provider.ts
- **Verification:** TypeScript compiles with no errors
- **Committed in:** 1657ca5 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug, TypeScript type errors)
**Impact on plan:** Both fixes necessary for correct TypeScript compilation. No scope creep.

## Issues Encountered
- `intuit-oauth` npm package installed successfully but has no TypeScript types and no ESM support. Per plan note, raw fetch used instead. Package remains in node_modules but is unused.

## User Setup Required

**External service requires manual configuration.** The QBO OAuth flow requires an Intuit Developer app:

1. Create account at https://developer.intuit.com
2. Create a QuickBooks Online app
3. Add redirect URI: `https://your-domain.com/api/integrations/qbo/callback` (must match exactly)
4. Add these environment variables:
   - `QBO_CLIENT_ID` — from Intuit Developer Portal > App > Keys & credentials
   - `QBO_CLIENT_SECRET` — from same location
   - `QBO_REDIRECT_URI` — must match what you registered in Intuit portal
   - `QBO_ENVIRONMENT` — set to `sandbox` for development, `production` for live

## Next Phase Readiness
- OAuth flow is complete and ready for QBO connection testing once env vars are configured
- Account mapping UI (next plan) can use `AccountingConnection.id` + `token-manager.getValidTokens` to fetch chart of accounts
- Trial balance sync (future plan) can use `qboProvider.fetchTrialBalance` + `TrialBalanceSnapshot` model
- Provider abstraction ready: Xero provider just needs to implement `AccountingProviderInterface`

---
*Phase: 05-qbo-xero-integration*
*Completed: 2026-03-08*

## Self-Check: PASSED

- provider-types.ts: FOUND
- qbo-provider.ts: FOUND
- token-manager.ts: FOUND
- connect/route.ts: FOUND
- callback/route.ts: FOUND
- disconnect/route.ts: FOUND
- SUMMARY.md: FOUND
- Commit 7c1a7df: FOUND
- Commit 1657ca5: FOUND
