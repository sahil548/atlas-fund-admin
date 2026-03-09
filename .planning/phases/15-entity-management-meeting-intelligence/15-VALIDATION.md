---
phase: 15
slug: entity-management-meeting-intelligence
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (existing — test files in `src/lib/__tests__/`) |
| **Config file** | `jest.config.ts` or `package.json` jest field |
| **Quick run command** | `npx jest --testPathPattern="phase15" --no-coverage` |
| **Full suite command** | `npx jest --no-coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="phase15" --no-coverage`
- **After every plan wave:** Run `npx jest --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | ENTITY-01 | unit | `npx jest --testPathPattern="vehicle-tree" -x` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | ENTITY-02 | unit | `npx jest --testPathPattern="post-formation" -x` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 1 | ENTITY-03 | unit | `npx jest --testPathPattern="regulatory" -x` | ❌ W0 | ⬜ pending |
| 15-02-02 | 02 | 1 | ENTITY-04 | unit | `npx jest --testPathPattern="status-transition" -x` | ❌ W0 | ⬜ pending |
| 15-03-01 | 03 | 1 | ENTITY-05 | manual smoke | n/a — manual verification | existing code | ⬜ pending |
| 15-04-01 | 04 | 2 | MTG-01 | unit | `npx jest --testPathPattern="fireflies" -x` | ❌ W0 | ⬜ pending |
| 15-04-02 | 04 | 2 | MTG-03 | unit | `npx jest --testPathPattern="fireflies-sync" -x` | ❌ W0 | ⬜ pending |
| 15-04-03 | 04 | 2 | MTG-04 | unit | included in MTG-03 test | ❌ W0 | ⬜ pending |
| 15-04-04 | 04 | 2 | MTG-05 | unit | included in MTG-01 test | ❌ W0 | ⬜ pending |
| 15-05-01 | 05 | 2 | MTG-02 | manual | n/a — requires AI key | existing infra | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/phase15-entity-hierarchy.test.ts` — stubs for ENTITY-01, ENTITY-02, ENTITY-03, ENTITY-04
- [ ] `src/lib/__tests__/phase15-fireflies-sync.test.ts` — stubs for MTG-01, MTG-03, MTG-04, MTG-05

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Side letter CRUD round-trip | ENTITY-05 | Verifying existing Phase 4 wiring, not new code | Create side letter, view on entity, edit terms, confirm changes persist |
| AI summary generation from transcript | MTG-02 | Requires live AI API key | Connect Fireflies, sync a meeting with transcript, verify AI summary appears on meeting card |
| End-to-end Fireflies connect → sync → meeting appears | MTG-01/03/04/05 | Integration test across real Fireflies API | Enter Fireflies API key in profile, trigger sync, verify meetings appear in aggregated view with correct entity/deal links |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
