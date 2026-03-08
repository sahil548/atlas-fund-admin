# Phase 5 — QBO/Xero Integration: VALIDATION

**Phase:** 05-qbo-xero-integration
**Validated:** 2026-03-08
**Status:** PARTIAL (automated tests cover pure logic + schemas; OAuth routes + DB-dependent flows require manual/integration testing)

---

## Verification Map

| Req ID   | Requirement                                         | Test Type   | Automated Command                                                                | Status  |
|----------|-----------------------------------------------------|-------------|----------------------------------------------------------------------------------|---------|
| ACCT-01  | QBO OAuth2 connect URL building                     | Unit        | `npx vitest run src/lib/__tests__/phase5-qbo-provider.test.ts`                   | green   |
| ACCT-01  | QBO OAuth2 connect/callback/disconnect routes        | Integration | Manual — requires Intuit Developer credentials + running server                  | manual  |
| ACCT-02  | Provider abstraction (detectAtlasBucket)             | Unit        | `npx vitest run src/lib/__tests__/phase5-detect-atlas-bucket.test.ts`            | green   |
| ACCT-02  | Provider interface contract (6 methods)              | Structural  | Verified via TypeScript compilation (`npm run build`)                             | green   |
| ACCT-03  | Account mapping schema validation                    | Unit        | `npx vitest run src/lib/__tests__/phase5-accounting-schemas.test.ts`             | green   |
| ACCT-03  | Account mapping UI (auto-detect + manual override)   | E2E         | Manual — requires connected QBO + UI interaction                                 | manual  |
| ACCT-04  | Trial balance parsing (row extraction, isBalanced)   | Unit        | `npx vitest run src/lib/__tests__/phase5-qbo-provider.test.ts`                   | green   |
| ACCT-04  | Trial balance sync + historical snapshots            | Integration | Manual — requires DB + QBO connection                                            | manual  |
| ACCT-05  | Two-layer NAV (GL cost basis vs proxy fallback)      | Integration | Manual — requires entity with accounting connection + trial balance snapshot      | manual  |
| ASSET-03 | Atlas bucket enum (5 values)                         | Unit        | `npx vitest run src/lib/__tests__/phase5-accounting-schemas.test.ts`             | green   |

---

## Test Files

| # | File                                                              | Type | Tests | Command                                                                       |
|---|-------------------------------------------------------------------|------|-------|-------------------------------------------------------------------------------|
| 1 | `src/lib/__tests__/phase5-detect-atlas-bucket.test.ts`            | Unit | 29    | `npx vitest run src/lib/__tests__/phase5-detect-atlas-bucket.test.ts`         |
| 2 | `src/lib/__tests__/phase5-accounting-schemas.test.ts`             | Unit | 32    | `npx vitest run src/lib/__tests__/phase5-accounting-schemas.test.ts`          |
| 3 | `src/lib/__tests__/phase5-qbo-provider.test.ts`                  | Unit | 18    | `npx vitest run src/lib/__tests__/phase5-qbo-provider.test.ts`                |

**Run all phase 5 tests:**
```bash
npx vitest run src/lib/__tests__/phase5-detect-atlas-bucket.test.ts src/lib/__tests__/phase5-accounting-schemas.test.ts src/lib/__tests__/phase5-qbo-provider.test.ts
```

---

## Coverage Summary

### detectAtlasBucket (29 tests)
- CASH: Bank type, cash/checking/savings/money-market subtypes (6 tests)
- INVESTMENTS_AT_COST: investment/portfolio name, investment subtype, asset+equity/loan/note-receivable name (6 tests)
- LIABILITIES: classification-based detection, case insensitivity, long-term variants (3 tests)
- EQUITY_PARTNERS_CAPITAL: classification, type, partner/capital name patterns (4 tests)
- OTHER_ASSETS: catch-all for remaining assets (3 tests)
- null return: Revenue, Expense, COGS (3 tests)
- Priority/edge cases: CASH vs INVESTMENTS priority, missing subType, LIABILITIES vs EQUITY priority (4 tests)

### Accounting Schemas (32 tests)
- AtlasAccountBucketEnum: all 5 valid values, invalid/empty/null/number rejection (9 tests)
- CreateAccountMappingSchema: valid payloads, all required field validation, 5-bucket acceptance (11 tests)
- UpdateAccountMappingSchema: valid update, invalid/missing rejection (3 tests)
- UpdateAccountingConnectionSchema: 4 sync statuses, optional lastSyncAt, missing/empty field rejection (9 tests)

### QBOProvider (18 tests)
- getAuthorizationUrl: URL base, client_id, redirect_uri, response_type, scope, state params (7 tests)
- fetchTrialBalance: entry extraction, debit/credit parsing, totals, isBalanced true/false, Section/GrandTotal skip, short-row skip, EndPeriod vs fallback date, HTTP error, sandbox URL, empty-name skip (11 tests)

---

## Not Automated (Requires Manual Testing)

| Req ID  | What                                           | Why Not Automated                                           |
|---------|-------------------------------------------------|-------------------------------------------------------------|
| ACCT-01 | Full OAuth connect/callback/disconnect flow     | Requires Intuit Developer credentials + running Next.js app |
| ACCT-03 | Account mapping UI with auto-detect             | Requires connected QBO + browser interaction                |
| ACCT-04 | Trial balance sync to DB + snapshot storage      | Requires Prisma DB + QBO connection                         |
| ACCT-05 | NAV endpoint GL vs proxy branching               | Requires entity with accounting connection in DB            |

### Manual Test Instructions

**ACCT-01 (OAuth Flow):**
1. Set QBO_CLIENT_ID, QBO_CLIENT_SECRET, QBO_REDIRECT_URI, QBO_ENVIRONMENT env vars
2. Navigate to /accounting, select an entity, click "Connect QuickBooks"
3. Complete Intuit OAuth flow, verify redirect back to /accounting with CONNECTED status
4. Click "Disconnect", verify status returns to DISCONNECTED

**ACCT-05 (Two-Layer NAV):**
1. Connect an entity to QBO and sync trial balance
2. GET /api/nav/{entityId} -- verify navSource="GL" and layer1 values from GL buckets
3. Disconnect QBO from entity
4. GET /api/nav/{entityId} -- verify navSource="PROXY" and layer1 values from proxy calculation
