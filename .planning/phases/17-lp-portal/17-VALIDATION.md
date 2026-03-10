---
phase: 17
slug: lp-portal
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (node environment) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/app/api/lp/__tests__/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/app/api/lp/__tests__/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | LP-06 | unit | `npx vitest run src/app/api/lp/__tests__/dashboard.test.ts` | YES (extend) | pending |
| 17-02-01 | 02 | 1 | LP-05 | manual | Browser test | N/A | pending |
| 17-03-01 | 03 | 2 | LP-04 | unit | `npx vitest run src/app/api/lp/__tests__/capital-account.test.ts` | NO — W0 | pending |
| 17-04-01 | 04 | 2 | LP-07 | unit | `npx vitest run src/app/api/lp/__tests__/entity-metrics.test.ts` | NO — W0 | pending |
| 17-05-01 | 05 | 3 | LP-08 | unit | `npx vitest run src/app/api/k1/__tests__/acknowledge.test.ts` | NO — W0 | pending |
| 17-06-01 | 06 | 3 | LP-09 | unit | `npx vitest run src/app/api/investors/__tests__/profile.test.ts` | NO — W0 | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `src/app/api/lp/__tests__/capital-account.test.ts` — stubs for LP-04 date-filter + metric recalculation
- [ ] `src/app/api/lp/__tests__/entity-metrics.test.ts` — stubs for LP-07 per-entity computation
- [ ] `src/app/api/k1/__tests__/acknowledge.test.ts` — stubs for LP-08 acknowledge endpoint
- [ ] `src/app/api/investors/__tests__/profile.test.ts` — stubs for LP-09 GET/PUT profile

*Existing `dashboard.test.ts` and `metrics-history.test.ts` continue to pass — no regression risk*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Document center tab filtering | LP-05 | Client-side state filtering; no API change to test | 1. Navigate to LP documents page 2. Click each tab (All, K-1s, Financial, Legal, Reports, Other) 3. Verify docs filter correctly by category 4. On K-1s tab, verify entity and tax year dropdowns appear |
| LP profile page layout | LP-09 | UI layout verification | 1. Navigate to /lp-profile 2. Verify legal name is read-only 3. Verify mailing address is editable 4. Verify tax ID shows masked, Edit button reveals full field |
| Per-entity sparklines | LP-07 | Visual chart rendering | 1. Check dashboard entity section for sparklines 2. Verify sparklines show trend direction |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
