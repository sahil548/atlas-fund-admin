---
phase: 14
slug: asset-management-task-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vitest.config.ts` (inferred from package.json scripts) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green + `npm run build` zero errors
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | ASSET-04 | unit | `npm test -- exit` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | ASSET-04 | unit | `npm test -- exit` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 1 | ASSET-06 | unit | `npm test -- sort` | ❌ W0 | ⬜ pending |
| 14-02-02 | 02 | 1 | ASSET-07 | unit | `npm test -- monitoring` | ❌ W0 | ⬜ pending |
| 14-02-03 | 02 | 1 | ASSET-08 | unit | `npm test -- monitoring` | ❌ W0 | ⬜ pending |
| 14-03-01 | 03 | 2 | ASSET-09 | unit | `npm test -- chart` | ❌ W0 | ⬜ pending |
| 14-03-02 | 03 | 2 | ASSET-05 | manual | UI review | N/A | ⬜ pending |
| 14-04-01 | 04 | 2 | TASK-03 | unit | `npm test -- dnd` | ❌ W0 | ⬜ pending |
| 14-04-02 | 04 | 2 | TASK-01 | manual | Click-through in browser | N/A | ⬜ pending |
| 14-04-03 | 04 | 2 | TASK-02 | manual | Create task from asset detail | N/A | ⬜ pending |
| 14-04-04 | 04 | 2 | TASK-04 | manual | Filter by asset/deal | N/A | ⬜ pending |
| 14-05-01 | 05 | 3 | TASK-05 | unit | `npm test -- stage` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/asset-exit.test.ts` — stubs for ASSET-04 exit calculation and auto-task creation
- [ ] `src/lib/__tests__/asset-monitoring.test.ts` — stubs for ASSET-07/08 date window logic
- [ ] `src/lib/__tests__/task-sort.test.ts` — stubs for ASSET-06 client-side sort and TASK-03 arrayMove
- [ ] `src/lib/__tests__/deal-stage-tasks.test.ts` — stubs for TASK-05 auto-task creation
- [ ] Add task notification template tests to existing `src/lib/__tests__/email-templates.test.ts`

*Existing infrastructure covers Vitest framework — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Holding type adaptive UI renders correctly per asset class | ASSET-05 | Visual layout verification — different panels per asset type | Open asset detail pages for each type (RE, Fund LP, Credit, Equity) and verify correct controls appear |
| Task context links navigate to source deal/asset/entity | TASK-01 | Browser navigation verification | Click context link on task → verify correct detail page opens |
| Inline task creation pre-links to context | TASK-02 | UI interaction flow | Create task from asset detail page → verify task appears with correct assetId in tasks list |
| Context filter on tasks page filters correctly | TASK-04 | UI interaction with filter dropdown | Select deal/asset filter → verify only related tasks shown |
| Kanban drag-and-drop changes status | TASK-03 | DnD interaction in browser | Drag task between columns → verify status persists on refresh |
| Monitoring panel deep links to correct asset + tab | ASSET-07/08 | Navigation flow | Click monitoring alert → verify correct asset detail page opens on correct tab |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
