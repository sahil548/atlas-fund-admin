---
phase: 10
slug: integration-wiring-ui-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | REPORT-01, REPORT-02, REPORT-05 | integration | `npx next build 2>&1 \| tail -5` | N/A | ⬜ pending |
| 10-01-02 | 01 | 1 | CORE-02, CORE-03 | unit | `npx vitest run --reporter=verbose` | N/A | ⬜ pending |
| 10-01-03 | 01 | 1 | FIN-07 | integration | `npx next build 2>&1 \| tail -5` | N/A | ⬜ pending |
| 10-01-04 | 01 | 1 | FIN-10 | integration | `npx next build 2>&1 \| tail -5` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Vitest already configured; Next.js build validation sufficient for UI wiring tasks.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LP document download link clickable | REPORT-01 | UI interaction | Navigate to LP Documents page, verify anchor tag renders with href for documents with fileUrl |
| Fee calculation button triggers API | FIN-07 | UI interaction | Navigate to entity detail, click "Calculate Fees", verify POST to /api/fees/calculate fires |
| Entity attribution section renders | FIN-10 | UI interaction | Navigate to entity detail, verify attribution data table renders from /api/entities/[id]/attribution |

*All manual behaviors also verified by build success (TypeScript compilation) + visual inspection.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
