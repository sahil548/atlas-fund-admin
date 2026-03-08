---
phase: 04
slug: asset-entity-polish
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-03-08
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.0.18 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/lib/__tests__/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~0.5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/__tests__/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | FIN-07 | manual | N/A — Prisma-coupled side letter engine | N/A | ⚠️ manual-only |
| 04-01-02 | 01 | 1 | FIN-07 | manual | N/A — Prisma-coupled API routes | N/A | ⚠️ manual-only |
| 04-02-01 | 02 | 1 | CORE-02 | unit | `npx vitest run src/lib/__tests__/permissions.test.ts` | ✅ | ✅ green (16 tests) |
| 04-02-01 | 02 | 1 | CORE-02 (middleware) | manual | N/A — Clerk-coupled middleware | N/A | ⚠️ manual-only |
| 04-02-02 | 02 | 1 | CORE-03 | manual | N/A — Clerk/Prisma-coupled entity-access | N/A | ⚠️ manual-only |
| 04-03-01 | 03 | 1 | CORE-04 | unit | `npx vitest run src/lib/__tests__/pagination.test.ts` | ✅ | ✅ green (26 tests) |
| 04-03-01 | 03 | 1 | CORE-05 | manual | N/A — React class components | N/A | ⚠️ manual-only |
| 04-03-01 | 03 | 1 | CORE-06 | unit | `npx vitest run src/lib/__tests__/rate-limit.test.ts` | ✅ | ✅ green (15 tests) |
| 04-04-01 | 04 | 2 | FIN-08 | manual | N/A — Prisma-coupled dashboard APIs | N/A | ⚠️ manual-only |
| 04-04-01 | 04 | 2 | FIN-09 | manual | N/A — Prisma-coupled LP comparison API | N/A | ⚠️ manual-only |
| 04-04-02 | 04 | 2 | ASSET-02 | manual | N/A — React component | N/A | ⚠️ manual-only |
| 04-05-01 | 05 | 2 | FIN-10 | manual | N/A — Prisma-coupled attribution engine | N/A | ⚠️ manual-only |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ manual-only*

---

## Wave 0 Requirements

Existing infrastructure covers all automatable phase requirements.

- [x] `src/lib/__tests__/permissions.test.ts` — 16 tests for checkPermission, DEFAULT_PERMISSIONS, validatePermissions (CORE-02)
- [x] `src/lib/__tests__/pagination.test.ts` — 26 tests for parsePaginationParams, buildPrismaArgs, buildPaginatedResult (CORE-04)
- [x] `src/lib/__tests__/rate-limit.test.ts` — 15 tests for rateLimit with window/user isolation/GC (CORE-06)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Side letter FEE_DISCOUNT reduces net fee correctly | FIN-07 | `applySideLetterRules`, `detectMFNGaps`, `integrateSideLetterWithFeeCalc` all begin with Prisma queries; no extractable pure logic | 1. Seed side letter with FEE_DISCOUNT=10 for investor A, entity X 2. Call applySideLetterRules with standardFee=200000 3. Verify feeDiscount=20000, netFee=180000 |
| MFN gap detection flags LPs with worse terms | FIN-07 | Same Prisma coupling | 1. Create investor A (MFN + FEE_DISCOUNT=10) and investor B (FEE_DISCOUNT=15) for same entity 2. Call detectMFNGaps 3. Verify investor A flagged with hasGap=true |
| LP_INVESTOR redirected from GP routes | CORE-02 (middleware) | Middleware uses Clerk `publicMetadata.role` — requires running Next.js server with Clerk auth | 1. Sign in as LP_INVESTOR 2. Navigate to /dashboard 3. Verify redirect to /lp/dashboard |
| LP_INVESTOR blocked from GP API (403) | CORE-02 (middleware) | Same Clerk coupling | 1. Sign in as LP_INVESTOR 2. Fetch POST /api/deals 3. Verify 403 response |
| SERVICE_PROVIDER read-only on assigned entities | CORE-03 | Entity-access check at API layer requires Clerk + Prisma | 1. Create SERVICE_PROVIDER user with entityAccess=[entity-A] 2. GET /api/entities/entity-A → 200 3. GET /api/entities/entity-B → 403 4. POST /api/entities → 403 |
| Error boundary shows retry on component crash | CORE-05 | React class components require jsdom + rendering | 1. Force a JS error in a dashboard section 2. Verify "Something went wrong" with Retry button appears 3. Click Retry, verify section recovers |
| Dashboard entity cards show computed metrics | FIN-08 | /api/dashboard/entity-cards queries Prisma | 1. Navigate to /dashboard 2. Verify entity cards show NAV, IRR, TVPI per entity 3. Verify numbers match data |
| LP comparison shows per-entity metrics | FIN-09 | /api/dashboard/lp-comparison queries Prisma | 1. Navigate to /dashboard, expand LP Comparison 2. Verify all LPs shown with TVPI/IRR per entity |
| Entity card expands to show NAV breakdown | ASSET-02 | React component click interaction | 1. Click an entity card on dashboard 2. Verify expanded view shows cost basis, fair value, per-asset table |
| Asset performance tab shows projected vs actual | FIN-10 | computeAssetAttribution queries Prisma | 1. Navigate to asset detail 2. Click Performance tab 3. Verify projected vs actual with variance arrows |

---

## Validation Audit 2026-03-08

| Metric | Count |
|--------|-------|
| Total requirements | 10 |
| Gaps found | 9 |
| Resolved (automated) | 2 (CORE-04, CORE-06) |
| Already covered | 1 (CORE-02 partial — permissions logic) |
| Escalated (manual-only) | 7 (FIN-07, CORE-02 middleware, CORE-03, CORE-05, FIN-08, FIN-09, ASSET-02, FIN-10) |
| Total automated tests added | 41 (26 pagination + 15 rate-limit) |
| Total automated tests for phase | 57 (16 existing permissions + 41 new) |

---

## Validation Sign-Off

- [x] All tasks have automated verify or are documented as manual-only with instructions
- [x] Wave 0 covers all automatable gaps
- [ ] `nyquist_compliant: true` — NOT SET (7 manual-only items remain)
- [x] No watch-mode flags
- [x] Feedback latency < 1s

**Approval:** validated 2026-03-08 (partial — 7 manual-only items)
