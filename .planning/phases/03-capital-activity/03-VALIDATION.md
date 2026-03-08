---
phase: 03
slug: capital-activity
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-08
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (globals enabled) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/lib/computations/__tests__/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/computations/__tests__/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | FIN-01 | unit | `npx vitest run src/lib/computations/__tests__/capital-accounts.test.ts` | ✅ | ✅ green |
| 03-01-02 | 01 | 1 | FIN-02 | unit | `npx vitest run src/lib/computations/__tests__/waterfall.test.ts` | ✅ | ✅ green |
| 03-02-01 | 02 | 2 | FIN-02 | unit | `npx vitest run src/lib/computations/waterfall.test.ts` | ✅ | ✅ green |
| 03-02-02 | 02 | 2 | FIN-06 | unit | `npx vitest run src/lib/computations/fee-engine.test.ts` | ✅ | ✅ green |
| 03-03-01 | 03 | 2 | FIN-03 | unit | `npx vitest run src/lib/computations/__tests__/irr.test.ts` | ✅ | ✅ green |
| 03-03-02 | 03 | 2 | FIN-04 | unit | `npx vitest run src/lib/computations/__tests__/metrics.test.ts` | ✅ | ✅ green |
| 03-03-03 | 03 | 2 | FIN-05 | unit | `npx vitest run src/lib/computations/__tests__/metrics.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Test File Inventory

| File | Tests | Requirements | Created |
|------|-------|-------------|---------|
| `src/lib/computations/__tests__/capital-accounts.test.ts` | 12 | FIN-01 | Phase 1 |
| `src/lib/computations/__tests__/waterfall.test.ts` | 13 | FIN-02 | Phase 1 |
| `src/lib/computations/waterfall.test.ts` | 28 | FIN-02 | Phase 3 Plan 02 |
| `src/lib/computations/fee-engine.test.ts` | 8 | FIN-06 | Phase 3 Plan 02 |
| `src/lib/computations/__tests__/irr.test.ts` | 10 | FIN-03 | Phase 1 |
| `src/lib/computations/__tests__/metrics.test.ts` | 18 | FIN-04, FIN-05 | Phase 3 validation audit |

**Total: 89 tests across 6 files covering all 6 Phase 3 requirements.**

---

## Validation Audit 2026-03-08

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (no Wave 0 needed)
- [x] No watch-mode flags
- [x] Feedback latency < 3s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-08

---

_Validated: 2026-03-08_
_Validator: Claude (gsd:validate-phase orchestrator + gsd-nyquist-auditor)_
