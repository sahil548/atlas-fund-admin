---
phase: 01
slug: verify-and-stabilize
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-03-07
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.0.18 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/lib/__tests__/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/__tests__/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | VERIFY-01 | unit | `npx vitest run src/lib/computations/__tests__/irr.test.ts` | ✅ | ✅ green (10 tests) |
| 01-01-02 | 01 | 1 | VERIFY-01 | unit | `npx vitest run src/lib/computations/__tests__/waterfall.test.ts src/lib/computations/__tests__/capital-accounts.test.ts` | ✅ | ✅ green (29 tests) |
| 01-02-01 | 02 | 1 | BUG-01 | unit | `npx vitest run src/lib/__tests__/deal-dd-progress.test.ts` | ✅ | ✅ green (9 tests) |
| 01-02-01 | 02 | 1 | BUG-02 | unit | `npx vitest run src/lib/__tests__/pipeline-conversion-rates.test.ts` | ✅ | ✅ green (11 tests) |
| 01-02-01 | 02 | 1 | BUG-03 | manual | N/A — React component timeout | N/A | ⚠️ manual-only |
| 01-02-01 | 02 | 1 | VERIFY-05 | unit | Covered by BUG-01 + BUG-02 tests above | ✅ | ✅ green |
| 01-02-02 | 02 | 1 | VERIFY-03 | manual | N/A — Prisma-coupled stage engine | N/A | ⚠️ manual-only |
| 01-03-01 | 03 | 2 | VERIFY-02 | manual | N/A — requires Slack workspace | N/A | ⚠️ manual-only |
| 01-03-01 | 03 | 2 | VERIFY-04 | manual | N/A — Prisma-coupled API routes | N/A | ⚠️ manual-only |
| 01-03-02 | 03 | 2 | VERIFY-04 | artifact | `test -f .planning/phases/01-verify-and-stabilize/GROUND-TRUTH.md` | ✅ | ✅ exists (270 lines) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ manual-only*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements that are automatable.

- [x] vitest installed and configured (Plan 01-01)
- [x] `src/lib/computations/__tests__/` — 3 financial computation test files (39 tests)
- [x] `src/lib/__tests__/deal-dd-progress.test.ts` — DD tab progress fallback regression (9 tests)
- [x] `src/lib/__tests__/pipeline-conversion-rates.test.ts` — conversion rate cap regression (11 tests)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| IC Memo timeout clears spinner after 90s | BUG-03 | Timeout logic embedded in React useCallback with state hooks; extracting requires jsdom + testing-library | 1. Open a deal, click "Start Screening" 2. Simulate slow network (DevTools > Network > Slow 3G) or block `/api/deals/[id]/dd-analyze` 3. Expected: after 90s, spinner clears, toast appears 4. Verify `analysisProgress` is null after completion |
| Deal pipeline stage transitions work E2E | VERIFY-03 | `deal-stage-engine.ts` functions are tightly coupled to Prisma calls — no extractable pure logic | 1. Create deal, click "Start Screening" → verify DUE_DILIGENCE 2. Click "Send to IC Review" → verify IC_REVIEW 3. Cast APPROVED vote → verify CLOSING 4. Complete checklist, click "Close Deal" → verify CLOSED + Asset created |
| Slack IC voting posts and records votes | VERIFY-02 | Requires real Slack workspace, OAuth token, user mapping | 1. Create Slack app, enable interactivity 2. Set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_IC_CHANNEL 3. Map GP users via slackUserId 4. Move deal to IC_REVIEW, verify Slack message 5. Click Approve → verify vote recorded in Atlas |
| Capital call/distribution APIs create records | VERIFY-04 | API routes tightly coupled to Prisma + Next.js Request/Response | 1. POST /api/capital-calls with entityId, callDate, dueDate, amount 2. GET /api/capital-calls → verify record appears 3. POST /api/distributions with entityId, distributionDate, grossAmount 4. GET /api/distributions → verify record appears |

---

## Validation Audit 2026-03-07

| Metric | Count |
|--------|-------|
| Gaps found | 7 |
| Resolved (automated) | 3 (BUG-01, BUG-02, VERIFY-05) |
| Escalated (manual-only) | 4 (BUG-03, VERIFY-02, VERIFY-03, VERIFY-04) |
| Total automated tests | 59 (39 existing + 20 new) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are documented as manual-only with instructions
- [x] Wave 0 covers all automatable gaps
- [ ] `nyquist_compliant: true` — NOT SET (4 manual-only items remain)
- [x] No watch-mode flags
- [x] Feedback latency < 2s

**Approval:** validated 2026-03-07 (partial — 4 manual-only items)
