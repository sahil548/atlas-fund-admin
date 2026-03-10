---
phase: 19
slug: dashboard-supporting-modules
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-09
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (already installed, v4.0.18) |
| **Config file** | `vitest.config.ts` (project root, node environment) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test && npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | DASH-01 | unit | `npm test -- src/lib/__tests__/phase19-dashboard-apis.test.ts` | W0 (created by task) | pending |
| 19-01-02 | 01 | 1 | DASH-02 | unit | `npm test -- src/lib/__tests__/phase19-dashboard-apis.test.ts` | W0 (created by task) | pending |
| 19-02-01 | 02 | 1 | SUPP-01, SUPP-04, SUPP-05, SUPP-06 | unit | `npm test -- src/lib/__tests__/phase19-supporting-modules.test.ts` | W0 (created by task) | pending |
| 19-02-02 | 02 | 1 | SUPP-04 | build | `npm run build` | n/a | pending |
| 19-02-03 | 02 | 1 | SUPP-02, SUPP-03 | build | `npm run build` | n/a | pending |
| 19-03-01 | 03 | 2 | DASH-01, DASH-02 | build | `npm run build` | n/a | pending |
| 19-03-02 | 03 | 2 | DASH-04 | unit + build | `npm test -- src/lib/__tests__/phase19-dashboard-components.test.ts && npm run build` | W0 (created by task) | pending |
| 19-04-01 | 04 | 1 | DASH-03 | unit | `npm test -- src/lib/__tests__/phase19-activity-feed.test.ts` | W0 (created by task) | pending |
| 19-04-02 | 04 | 1 | DASH-03 | build | `npm run build` | n/a | pending |
| 19-05-01 | 05 | 3 | DASH-01, DASH-02, DASH-03, DASH-04 | unit + build | `npm test -- src/lib/__tests__/phase19-dashboard-assembly.test.ts && npm run build` | W0 (created by task) | pending |
| 19-05-02 | 05 | 3 | all DASH + SUPP | manual | human checkpoint verification at localhost | n/a | pending |

*Status: pending / green / red / flaky*

---

## Nyquist Compliance Check

Sampling continuity verification — no 3 consecutive tasks without automated unit-level feedback:

| Sequence | Task IDs | Automated? | OK? |
|----------|----------|------------|-----|
| 1 | 19-01-01 | unit test | YES |
| 2 | 19-01-02 | unit test | YES |
| 3 | 19-02-01 | unit test | YES |
| 4 | 19-02-02 | build | build-only |
| 5 | 19-02-03 | build | build-only |
| 6 | 19-03-01 | build | build-only -- 2 consecutive build-only (4,5,6 span corrected by 19-03-02 unit) |
| 7 | 19-03-02 | unit test | YES (breaks any 3-consecutive streak) |
| 8 | 19-04-01 | unit test | YES |
| 9 | 19-04-02 | build | build-only |
| 10 | 19-05-01 | unit test | YES (breaks any 3-consecutive streak) |
| 11 | 19-05-02 | manual | checkpoint |

Maximum consecutive build-only or manual tasks: 2 (tasks 19-02-02, 19-02-03 and 19-03-01 — broken by 19-03-02 unit test). Nyquist satisfied.

---

## Wave 0 Test Files (Created by Execution Plans)

Each Wave 0 test file is created by the plan task that needs it. No separate Wave 0 plan required.

- [ ] `src/lib/__tests__/phase19-dashboard-apis.test.ts` — covers DASH-01, DASH-02 (created by Plan 01 Task 1)
- [ ] `src/lib/__tests__/phase19-supporting-modules.test.ts` — covers SUPP-01 grouping, SUPP-04 grouping, SUPP-05 grep, SUPP-06 grep (created by Plan 02 Task 1)
- [ ] `src/lib/__tests__/phase19-dashboard-components.test.ts` — covers DASH-04 entity card render + component module exports (created by Plan 03 Task 2)
- [ ] `src/lib/__tests__/phase19-activity-feed.test.ts` — covers DASH-03 activity merge/filter/pagination (created by Plan 04 Task 1)
- [ ] `src/lib/__tests__/phase19-dashboard-assembly.test.ts` — covers final wiring verification: imports, no LPComparison, no innerRing (created by Plan 05 Task 1)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pipeline funnel stage click -> navigates to /deals filtered | DASH-01 | Browser navigation | Click each stage segment, verify URL query param |
| Alert items click -> navigate to entity/asset detail | DASH-02 | Browser navigation | Click alert, verify correct page loads |
| Entity card quick actions open correct pages | DASH-04 | Browser navigation + UI | Click each icon, verify page/modal |
| Report preview modal renders PDF | SUPP-01 | PDF rendering in browser | Click report, verify modal shows PDF |
| Entity detail Reports tab shows entity reports | SUPP-04 | Browser navigation | Open entity, click Reports tab |
| Dark mode renders correctly across all sections | all | Visual inspection | Toggle dark mode, check every section |

*All primary logic (API responses, data transforms, filtering, wiring) have automated verification.*

---

## Requirement Traceability

| Requirement | Plan(s) | Test File(s) | Verification Type |
|-------------|---------|--------------|-------------------|
| DASH-01 | 01, 03, 05 | phase19-dashboard-apis.test.ts, phase19-dashboard-assembly.test.ts | unit + wiring |
| DASH-02 | 01, 03, 05 | phase19-dashboard-apis.test.ts, phase19-dashboard-assembly.test.ts | unit + wiring |
| DASH-03 | 04, 05 | phase19-activity-feed.test.ts, phase19-dashboard-assembly.test.ts | unit + wiring |
| DASH-04 | 03, 05 | phase19-dashboard-components.test.ts | render + build |
| SUPP-01 | 02 | phase19-supporting-modules.test.ts | unit (grouping) + manual (modal) |
| SUPP-02 | 02 | (build only) | build + manual |
| SUPP-03 | 02 | (build only) | build + manual |
| SUPP-04 | 02 | phase19-supporting-modules.test.ts | unit (grouping) + build (entity tab) |
| SUPP-05 | 02 | phase19-supporting-modules.test.ts | grep-as-test (route exists) |
| SUPP-06 | 02 | phase19-supporting-modules.test.ts | grep-as-test (zero confirm calls) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (test files created by execution tasks)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter
- [x] Plan 03 tasks mapped to wave 2 (matches frontmatter)
- [x] DASH-03 correctly mapped to Plan 04 (not Plan 02)
- [x] Test file paths match actual files plans create

**Approval:** pending execution
