---
phase: 19
slug: dashboard-supporting-modules
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (not installed — Wave 0 installs) |
| **Config file** | none — Wave 0 installs |
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
| 19-01-01 | 01 | 1 | DASH-01 | unit | `npx vitest run src/__tests__/dashboard/pipeline-summary.test.ts` | ❌ W0 | ⬜ pending |
| 19-01-02 | 01 | 1 | DASH-02 | unit | `npx vitest run src/__tests__/dashboard/alerts.test.ts` | ❌ W0 | ⬜ pending |
| 19-02-01 | 02 | 1 | DASH-03 | unit | `npx vitest run src/__tests__/dashboard/activity-feed.test.ts` | ❌ W0 | ⬜ pending |
| 19-03-01 | 03 | 1 | DASH-04 | unit | `npx vitest run src/__tests__/dashboard/entity-card.test.ts` | ❌ W0 | ⬜ pending |
| 19-04-01 | 04 | 2 | SUPP-01 | unit | `npx vitest run src/__tests__/reports/preview-modal.test.ts` | ❌ W0 | ⬜ pending |
| 19-04-02 | 04 | 2 | SUPP-04 | unit | `npx vitest run src/__tests__/reports/history.test.ts` | ❌ W0 | ⬜ pending |
| 19-05-01 | 05 | 2 | SUPP-02 | unit | `npx vitest run src/__tests__/settings/integrations.test.ts` | ❌ W0 | ⬜ pending |
| 19-05-02 | 05 | 2 | SUPP-03 | unit | `npx vitest run src/__tests__/settings/notifications.test.ts` | ❌ W0 | ⬜ pending |
| 19-05-03 | 05 | 2 | SUPP-05 | unit | `npx vitest run src/__tests__/settings/ai-test-connection.test.ts` | ❌ W0 | ⬜ pending |
| 19-06-01 | 06 | 2 | SUPP-06 | manual | grep scan for window.confirm | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install vitest + @testing-library/react + jsdom
- [ ] Create vitest.config.ts with jsdom environment
- [ ] `src/__tests__/dashboard/pipeline-summary.test.ts` — stubs for DASH-01
- [ ] `src/__tests__/dashboard/alerts.test.ts` — stubs for DASH-02
- [ ] `src/__tests__/dashboard/activity-feed.test.ts` — stubs for DASH-03
- [ ] `src/__tests__/dashboard/entity-card.test.ts` — stubs for DASH-04
- [ ] `src/__tests__/reports/preview-modal.test.ts` — stubs for SUPP-01
- [ ] `src/__tests__/reports/history.test.ts` — stubs for SUPP-04
- [ ] `src/__tests__/settings/integrations.test.ts` — stubs for SUPP-02
- [ ] `src/__tests__/settings/notifications.test.ts` — stubs for SUPP-03
- [ ] `src/__tests__/settings/ai-test-connection.test.ts` — stubs for SUPP-05

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pipeline funnel stage click → navigates to /deals filtered | DASH-01 | Browser navigation | Click each stage segment, verify URL query param |
| Alert items click → navigate to entity/asset detail | DASH-02 | Browser navigation | Click alert, verify correct page loads |
| Entity card quick actions open correct pages | DASH-04 | Browser navigation + UI | Click each icon, verify page/modal |
| Report preview modal renders PDF | SUPP-01 | PDF rendering in browser | Click report, verify modal shows PDF |
| ConfirmDialog audit (no window.confirm) | SUPP-06 | Grep scan | `grep -r "window.confirm\|confirm(" src/` |

*All primary logic (API responses, data transforms, filtering) have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
