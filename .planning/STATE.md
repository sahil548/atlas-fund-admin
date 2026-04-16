---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: CRUD Completion & Waterfall Correctness
status: in_review
stopped_at: v2.1 retroactively documented; 6-commit branch pending merge review
last_updated: "2026-04-16T12:40:00.000Z"
last_activity: "2026-04-16 — Kathryn's 71 commits (2026-03-24 → 2026-04-09) documented as v2.1 retroactive milestone. 45 regression tests added for waterfall + pref-accrual. 6-commit branch feat/edit-delete-across-entities pending merge review."
progress:
  total_phases: "N/A (off-GSD)"
  completed_phases: "N/A"
  total_plans: "N/A"
  completed_plans: "N/A"
  percent: "N/A"
---

# Atlas — GSD State

## Project Reference
- **PROJECT.md:** `.planning/PROJECT.md` (updated 2026-03-18 — predates v2.1 work)
- **Core value:** GP team manages full deal-to-asset lifecycle and fund/LP metrics in one place
- **Current focus:** Close out v2.1 (merge branch, decide on v3.0 scope)

## Current Position

- **Milestone:** v2.1 (CRUD Completion & Waterfall Correctness) — IN REVIEW
- **Status:** 65 of 71 commits landed on `origin/main`. 6 commits on `feat/edit-delete-across-entities` pending merge.
- **Active branch (local review):** `review/kathryn-v2.1` — tracks `origin/feat/edit-delete-across-entities`
- **Last activity:** 2026-04-16 — retroactive documentation + regression tests added

### Open decisions
1. **Merge `feat/edit-delete-across-entities` into main?**
   - Recommendation: yes, fast-forward, after UI smoke-test on PCF II distribution
   - Regression tests already added (87 passing in waterfall domain)
2. **What is v3.0 scope?**
   - See continuation plan below
3. **Rename branch before archiving?**
   - Current name is misleading (tip commits are pref-return, not edit/delete)
   - Suggested: `feat/waterfall-pref-corrections`

## Accumulated Context

### Key Architectural Decisions (from v2.1)
1. **30/360 inclusive day count** for pref accrual (Excel convention, not standard NASD)
2. **ROC flows into PIC base effective first day of following month** (Excel convention)
3. **Final 100%-GP tier treated as remainder-to-GP bucket** when no subsequent profit-split tier exists
4. **GP detection is firm-wide and multi-signal** — normalized name, Fund Manager type, unit classes, non-fund fallback
5. **Multiple waterfall templates per vehicle** (was 1:1)
6. **Multiple investor profiles per contact** (was 1:1)
7. **Pref offset excludes ROC** — only income/gains reduce accrued pref
8. **`precomputedPrefAmount` config** on waterfall engine — caller provides PIC-weighted pref, engine uses directly

### Blockers/Concerns
1. **Route duplication:** `waterfall-templates/[id]/calculate/route.ts` still inlines day-count and segment-walk logic that duplicates `src/lib/computations/pref-accrual.ts`. Refactor needed in v3.0.
2. **Single-fund validation:** all ground-truth values come from CG Private Credit Fund II. Other fund shapes not exercised.
3. **CRUD work is untested:** 17 CRUD requirements shipped with zero regression tests.
4. **Process gap:** v2.1 shipped outside the GSD workflow. No PROJECT.md, PLAN.md, RESEARCH.md, or per-phase VERIFICATION.md were produced during the work.

## Performance Metrics

- Plans completed (v1.0): 36 plans across 10 phases
- Plans completed (v2.0): 58 plans across 10 phases
- v2.1 (off-GSD): 71 commits, no plan breakdown
- Test coverage (waterfall + pref domain): 87 tests passing (was 42 before 2026-04-16)

## Session Continuity

- **Initialized:** 2026-03-08
- **v2.0 shipped:** 2026-03-18
- **v2.1 work (off-GSD):** 2026-03-24 → 2026-04-09 (Kathryn)
- **v2.1 retroactive intake + tests:** 2026-04-16
- **Last session:** 2026-04-16
- **Stopped at:** v2.1 documented; merge-review pending + v3.0 scope pending
- **Resume file:** None

## Next Steps (when user returns)

1. **Smoke-test the branch** on PCF II 9/30/25 distribution → confirm debug panel shows `120,750 LP pref / 5,638.72 GP carry`
2. **Rename branch** to `feat/waterfall-pref-corrections`
3. **Merge** via fast-forward
4. **Commit** test additions + v2.1 planning docs
5. **Tag** `v2.1`
6. **Kick off v3.0** — see proposed scope in the chat summary
