---
phase: 11
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run src/lib/__tests__/foundation.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/__tests__/foundation.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | FOUND-06 | unit | `npx vitest run src/lib/__tests__/foundation.test.ts` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | FOUND-07 | unit | `npx vitest run src/lib/__tests__/foundation.test.ts` | ❌ W0 | ⬜ pending |
| 11-01-03 | 01 | 1 | FOUND-01 | unit | `npx vitest run src/lib/__tests__/foundation.test.ts` | ❌ W0 | ⬜ pending |
| 11-01-04 | 01 | 1 | FOUND-02 | unit | `npx vitest run src/lib/__tests__/foundation.test.ts` | ❌ W0 | ⬜ pending |
| 11-01-05 | 01 | 1 | FOUND-04 | unit | `npx vitest run src/lib/__tests__/foundation.test.ts` | ❌ W0 | ⬜ pending |
| 11-01-06 | 01 | 1 | FOUND-05 | unit | `npx vitest run src/lib/__tests__/foundation.test.ts` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 2 | FOUND-03 | unit | `npx vitest run src/lib/__tests__/foundation.test.ts` | ❌ W0 | ⬜ pending |
| 11-03-01 | 03 | 2 | FOUND-02 | unit | `npx vitest run src/lib/__tests__/foundation.test.ts` | ❌ W0 | ⬜ pending |
| 11-04-01 | 04 | 2 | FOUND-01 | unit | `npx vitest run src/lib/__tests__/foundation.test.ts` | ❌ W0 | ⬜ pending |
| 11-05-01 | 05 | 3 | FOUND-06 | unit | `npx vitest run src/lib/__tests__/foundation.test.ts` | ❌ W0 | ⬜ pending |
| 11-06-01 | 06 | 3 | FOUND-04, FOUND-05 | unit | `npx vitest run src/lib/__tests__/foundation.test.ts` | ❌ W0 | ⬜ pending |
| 11-07-01 | 07 | 3 | FOUND-08 | manual | Toggle Settings → Dark Mode, audit all components | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/foundation.test.ts` — stubs for FOUND-01 through FOUND-07 (unit tests for new components and formatters)
- [ ] Framework already installed — no install step needed

*Existing `pdf-format-helpers.test.ts` covers the existing `formatDate` in pdf/shared-styles.ts — these tests do NOT need to change. The new tests in `foundation.test.ts` cover the new `formatDate` export from utils.ts.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dark mode parity on all new/modified components | FOUND-08 | Visual concern — cannot be meaningfully automated in node test environment | Toggle Settings → Dark Mode, visually audit EmptyState, TableSkeleton, PageHeader, SectionPanel, StatCard for correct dark: classes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
