---
phase: 16
slug: capital-activity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (vitest.config.ts) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/lib/computations` |
| **Full suite command** | `npx vitest run && npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npx vitest run && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | CAP-01 | Integration (manual browser) | `npm run build` | ✅ | ⬜ pending |
| 16-01-02 | 01 | 1 | CAP-02 | Integration (manual browser) | `npm run build` | ✅ | ⬜ pending |
| 16-02-01 | 02 | 1 | CAP-03 | Unit | `npx vitest run src/lib/computations` | ❌ W0 | ⬜ pending |
| 16-02-02 | 02 | 1 | CAP-06 | Manual browser | `npm run build` | ✅ | ⬜ pending |
| 16-03-01 | 03 | 2 | CAP-04 | Manual browser | `npm run build` | ❌ W0 | ⬜ pending |
| 16-04-01 | 04 | 2 | CAP-05 | Unit | `npx vitest run src/lib/computations` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/computations/__tests__/overdue-detection.test.ts` — stubs for CAP-03 overdue detection logic
- [ ] Verify `src/lib/computations/metrics.ts` exports and inputs before building entity financial summary card

*Existing Vitest infrastructure covers computation tests. Primary gaps are overdue detection and document attachment verification.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Capital call status buttons advance lifecycle | CAP-01 | UI interaction flow | Click Mark as Issued → confirm → verify status badge changes |
| Distribution status buttons advance lifecycle | CAP-02 | UI interaction flow | Click Approve → verify → click Mark as Paid → verify |
| Overdue badge appears on past-due calls | CAP-03 | Visual styling | Create call with past due date, verify red badge |
| Document upload attaches to capital call | CAP-04 | File upload UX | Upload PDF, verify appears in documents list |
| Waterfall preview shows without saving | CAP-05 | UI + DB state | Run preview, verify no WaterfallCalculation row created |
| Per-investor status table visible | CAP-06 | UI layout | Open capital call detail, verify investor line items visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
