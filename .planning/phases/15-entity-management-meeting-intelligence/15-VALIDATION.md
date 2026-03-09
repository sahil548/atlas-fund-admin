---
phase: 15
slug: entity-management-meeting-intelligence
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-09
---

# Phase 15 -- Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (existing -- test files in `src/lib/__tests__/`) |
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
| 15-00-01 | 00 | 0 | ENTITY-01/03/04, MTG-01/03/05 | scaffold | `npx jest --testPathPattern="phase15" --no-coverage` | created by this task | pending |
| 15-01-01 | 01 | 1 | ENTITY-04 (rename + schema) | build | `npm run build` | n/a | pending |
| 15-01-02 | 01 | 1 | ENTITY-04 (status transitions) | unit + build | `npx jest --testPathPattern="phase15-entity-hierarchy" -x && npm run build` | W0 stub | pending |
| 15-02-01 | 02 | 2 | ENTITY-01 (view components) | unit + build | `npx jest --testPathPattern="phase15-entity-hierarchy" -x && npm run build` | W0 stub | pending |
| 15-02-02 | 02 | 2 | ENTITY-01 (view mode toggle) | build | `npm run build` | n/a | pending |
| 15-03-01 | 03 | 2 | ENTITY-02/03 (checklist + schemas) | unit + build | `npx jest --testPathPattern="phase15-entity-hierarchy" -x && npm run build` | W0 stub | pending |
| 15-03-02 | 03 | 2 | ENTITY-02/03 (regulatory tab + wire) | build | `npm run build` | n/a | pending |
| 15-04-01 | 04 | 2 | MTG-01/05 (fireflies lib + routes) | unit + build | `npx jest --testPathPattern="phase15-fireflies-sync" -x && npm run build` | W0 stub | pending |
| 15-04-02 | 04 | 2 | MTG-01/05 (profile page UI + sync button) | build | `npm run build` | n/a | pending |
| 15-05-01 | 05 | 2 | ENTITY-05 (side letter verify) | manual + build | `npm run build` | existing code | pending |
| 15-06-01 | 06 | 3 | MTG-02/03/04 (meeting card + link API) | unit + build | `npx jest --testPathPattern="phase15-fireflies-sync" -x && npm run build` | W0 stub | pending |
| 15-06-02 | 06 | 3 | MTG-02/03/04 (integrate + auto-tasks) | full suite + build | `npx jest --testPathPattern="phase15" --no-coverage && npm run build` | W0 stub | pending |
| 15-07-01 | 07 | 4 | ALL | checkpoint | `npx jest --testPathPattern="phase15" --no-coverage && npm run build` | W0 stub | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements (covered by Plan 00)

- [x] `src/lib/__tests__/phase15-entity-hierarchy.test.ts` -- stubs for ENTITY-01, ENTITY-03, ENTITY-04
- [x] `src/lib/__tests__/phase15-fireflies-sync.test.ts` -- stubs for MTG-01, MTG-03, MTG-05

Both created by Plan 00, Wave 0. All subsequent plans depend_on 15-00.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Side letter CRUD round-trip | ENTITY-05 | Verifying existing Phase 4 wiring, not new code | Create side letter, view on entity, edit terms, confirm changes persist |
| AI summary generation from transcript | MTG-02 | Requires live AI API key | Connect Fireflies, sync a meeting with transcript, verify AI summary appears on meeting card |
| End-to-end Fireflies connect -> sync -> meeting appears | MTG-01/03/04/05 | Integration test across real Fireflies API | Enter Fireflies API key in user profile page (/profile), trigger sync, verify meetings appear in aggregated view with correct entity/deal links |

---

## Sampling Continuity Check

No 3 consecutive tasks without an automated test command:

- 15-00-01: automated (jest phase15)
- 15-01-01: automated (build)
- 15-01-02: automated (jest + build)
- 15-02-01: automated (jest + build)
- 15-02-02: automated (build)
- 15-03-01: automated (jest + build)
- 15-03-02: automated (build)
- 15-04-01: automated (jest + build)
- 15-04-02: automated (build)
- 15-05-01: automated (build) -- manual verification is supplementary
- 15-06-01: automated (jest + build)
- 15-06-02: automated (full jest + build)
- 15-07-01: automated (full jest + build) + manual checkpoint

Continuity: PASS -- no 3 consecutive tasks lack targeted automated commands.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Plan 00 creates both test files)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
