# Atlas — GSD Roadmap

## Milestones

- ✅ **v1.0 GP Production Ready** — Phases 1-10 (shipped 2026-03-08) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Intelligence Platform** — Phases 11-20 (shipped 2026-03-18) — [archive](milestones/v2.0-ROADMAP.md)
- 🔶 **v2.1 CRUD Completion & Waterfall Correctness** — retroactive, 71 commits 2026-03-24 → 2026-04-09 (Kathryn, off-GSD) — [archive](milestones/v2.1-ROADMAP.md)

---

<details>
<summary>✅ v1.0 GP Production Ready (Phases 1-10) — SHIPPED 2026-03-08</summary>

See [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) for full phase details.

Phases 1-10 shipped 2026-03-08. 231 commits, 497 files changed, ~92K LOC TypeScript.

</details>

<details>
<summary>🔶 v2.1 CRUD Completion & Waterfall Correctness — IN REVIEW 2026-04-16 (retroactive)</summary>

See [milestones/v2.1-ROADMAP.md](milestones/v2.1-ROADMAP.md) and [milestones/v2.1-REQUIREMENTS.md](milestones/v2.1-REQUIREMENTS.md).

71 commits between 2026-03-24 and 2026-04-09 by Kathryn. 65 on `origin/main`, 6 on unmerged branch `feat/edit-delete-across-entities`. Shipped outside the GSD workflow; documented retroactively 2026-04-16.

**Themes:**
- CRUD completion across 9+ entity domains (11 new API routes)
- Waterfall + pref-return correctness (PIC-weighted, 30/360, ROC handling, final-tier-remainder)
- GP detection hardening
- Cap table + investor activity polish

**Regression tests added retroactively:** 45 (87 total in waterfall/pref domain, all passing).

**Pending:** merge of 6-commit branch after UI smoke-test on PCF II distribution.

</details>

<details>
<summary>✅ v2.0 Intelligence Platform (Phases 11-20) — SHIPPED 2026-03-18</summary>

See [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md) for full phase details.

Phases 11-20 shipped 2026-03-18. 264 commits, 545 files changed, ~91K LOC TypeScript. 99 requirements across 14 categories.

- [x] Phase 11: Foundation (5/5 plans)
- [x] Phase 12: AI Configuration & Document Intake (5/5 plans)
- [x] Phase 13: Deal Desk & CRM (5/5 plans)
- [x] Phase 14: Asset Management & Task Management (7/7 plans)
- [x] Phase 15: Entity Management & Meeting Intelligence (8/8 plans)
- [x] Phase 16: Capital Activity (6/6 plans)
- [x] Phase 17: LP Portal (3/3 plans)
- [x] Phase 18: AI Features (4/4 plans)
- [x] Phase 19: Dashboard & Supporting Modules (5/5 plans)
- [x] Phase 20: Schema Cleanup & UI Polish (10/10 plans)

</details>

---

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1-10. v1.0 Phases | v1.0 | 36/36 | Complete | 2026-03-08 |
| 11. Foundation | v2.0 | 5/5 | Complete | 2026-03-09 |
| 12. AI Configuration & Document Intake | v2.0 | 5/5 | Complete | 2026-03-09 |
| 13. Deal Desk & CRM | v2.0 | 5/5 | Complete | 2026-03-09 |
| 14. Asset Management & Task Management | v2.0 | 7/7 | Complete | 2026-03-10 |
| 15. Entity Management & Meeting Intelligence | v2.0 | 8/8 | Complete | 2026-03-10 |
| 16. Capital Activity | v2.0 | 6/6 | Complete | 2026-03-10 |
| 17. LP Portal | v2.0 | 3/3 | Complete | 2026-03-10 |
| 18. AI Features | v2.0 | 4/4 | Complete | 2026-03-10 |
| 19. Dashboard & Supporting Modules | v2.0 | 5/5 | Complete | 2026-03-10 |
| 20. Schema Cleanup & UI Polish | v2.0 | 10/10 | Complete | 2026-03-11 |
| v2.1 (retroactive, off-GSD) | v2.1 | N/A (71 commits) | In Review | 2026-04-09 (last commit) |
