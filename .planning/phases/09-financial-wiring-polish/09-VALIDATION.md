---
phase: 09
slug: financial-wiring-polish
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-03-08
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.0.18 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/lib/__tests__/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~0.9 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | FIN-07 | manual | N/A — Prisma-coupled side letter integration in API route | N/A | ⚠️ manual-only |
| 09-01-02 | 01 | 1 | NOTIF-03 | manual | N/A — Prisma-coupled digest preference gate | N/A | ⚠️ manual-only |
| 09-02-01 | 02 | 1 | (polish) | build | `npm run build` | N/A | ✅ build passes |
| 09-02-02 | 02 | 1 | (polish) | build | `npm run build` | N/A | ✅ build passes |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ manual-only*

---

## Wave 0 Requirements

No automatable gaps exist. Both phase requirements (FIN-07, NOTIF-03) involve Prisma-coupled integration wiring with no extractable pure computation logic.

Existing related tests (from other phases):
- `src/lib/computations/fee-engine.test.ts` — 11 tests for `calculateFees` (base fee computation, Phase 3)
- `src/lib/__tests__/notification-delivery.test.ts` — 5 tests for export signatures (Phase 7)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fee calculation returns per-investor side letter adjustments | FIN-07 | `integrateSideLetterWithFeeCalc` called inside API route for each commitment; queries Prisma for side letter rules | 1. Seed a side letter with FEE_DISCOUNT=10 for investor A, entity X 2. POST /api/fees/calculate with entityId=X 3. Verify `perInvestorAdjustments` includes investor A with feeDiscount > 0, netFee < standardFee 4. Verify base managementFee/carriedInterest unchanged |
| Fee calc without side letters remains identical | FIN-07 | Same Prisma coupling — backward compatibility | 1. POST /api/fees/calculate for entity with no side letters 2. Verify `perInvestorAdjustments` is empty array 3. Verify all other response fields identical to pre-Phase-9 behavior |
| Side letter integration failure is graceful | FIN-07 | Error path requires simulated DB failure | 1. Temporarily break side letter query (e.g., invalid model) 2. POST /api/fees/calculate 3. Verify base fee result returned, perInvestorAdjustments=[], error logged |
| Digest preference DAILY_DIGEST skips email/SMS | NOTIF-03 | `deliverNotification` reads `digestPreference` from Prisma; early return interleaved with DB operations | 1. Set investor's digestPreference to DAILY_DIGEST in DB 2. Trigger capital call notification for that investor 3. Verify log: "Queued for DAILY_DIGEST -- skipping immediate external delivery" 4. Verify in-app notification created, no email sent |
| Digest preference IMMEDIATE unchanged | NOTIF-03 | Same Prisma coupling — backward compatibility | 1. Ensure investor has IMMEDIATE (default) digestPreference 2. Trigger notification 3. Verify email/SMS dispatched as before |
| Plaid balance card visible on entity detail | (polish) | Requires running dev server with Plaid-connected entity | 1. Navigate to entity with Plaid connection 2. Verify "Bank Accounts (Plaid)" card in Overview tab 3. Navigate to entity without Plaid — card absent |

---

## Validation Audit 2026-03-08

| Metric | Count |
|--------|-------|
| Total requirements | 2 (FIN-07, NOTIF-03) |
| Gaps found | 2 |
| Resolved (automated) | 0 |
| Escalated (manual-only) | 2 |
| Total automated tests added | 0 |
| Verification report coverage | 8/8 truths verified (code inspection) |

---

## Validation Sign-Off

- [x] All tasks have automated verify or are documented as manual-only with instructions
- [x] VERIFICATION.md confirms 8/8 observable truths via code inspection
- [ ] `nyquist_compliant: true` — NOT SET (2 manual-only items remain)
- [x] No watch-mode flags
- [x] Feedback latency < 1s

**Approval:** validated 2026-03-08 (manual-only — both requirements Prisma-coupled)
