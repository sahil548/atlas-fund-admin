---
phase: 06
slug: lp-portal
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-08
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | package.json (inline vitest config) |
| **Quick run command** | `npx vitest run src/app/api/lp/__tests__/` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/app/api/lp/__tests__/`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | LP-01 | integration | `npx vitest run src/app/api/lp/__tests__/dashboard.test.ts` | ✅ | ✅ green |
| 06-01-01 | 01 | 1 | LP-02a | unit | `npx vitest run src/app/api/lp/__tests__/metrics-history.test.ts` | ✅ | ✅ green |
| 06-01-02 | 01 | 1 | LP-02b | unit | `npx vitest run "src/app/(lp)/__tests__/period-summaries.test.ts"` | ✅ | ✅ green |
| 06-02-01 | 02 | 1 | LP-03a | unit | `npx vitest run src/lib/__tests__/notification-prefs-schema.test.ts` | ✅ | ✅ green |
| 06-02-01 | 02 | 1 | LP-03b | integration | `npx vitest run src/app/api/investors/__tests__/notification-preferences.test.ts` | ✅ | ✅ green |
| 06-02-02 | 02 | 1 | LP-03c | unit | `npx vitest run src/lib/__tests__/lp-routes.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new framework install or fixture stubs needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PerformanceCharts renders Recharts LineChart + AreaChart with granularity toggle | LP-02 | Requires jsdom + testing-library for React component rendering (not configured) | Visit /lp-dashboard, verify charts render below stat cards with Quarterly/Monthly toggle |
| LP Settings auto-save toast feedback after 500ms debounce | LP-03 | Browser interaction timing + toast rendering | Visit /lp-settings, toggle a preference, wait 500ms, verify toast appears |
| MetricSnapshot accumulation populates charts over multiple days | LP-02 | Requires real passage of calendar days | Visit /lp-dashboard on 2+ separate days, verify chart shows data points |
| SMS channel warning appears when no phone number entered | LP-03 | Visual/interactive browser behavior | Visit /lp-settings, select SMS channel without phone, verify amber warning |

---

## Validation Audit 2026-03-08

| Metric | Count |
|--------|-------|
| Gaps found | 6 |
| Resolved | 6 |
| Escalated | 0 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 8s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-08
