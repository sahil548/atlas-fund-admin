---
phase: 21
plan: 01
subsystem: walkthrough-baseline
tags: [walkthrough, triage, baseline, gp, lp, fit-and-finish]
dependency_graph:
  requires: []
  provides:
    - "GP walkthrough baseline with 47 observations triaged"
    - "LP walkthrough baseline with 6 observations triaged"
    - "FIN-09..12 requirements added to REQUIREMENTS.md"
    - "Phase 22 additions subsection with 21 urgent items folded in"
    - "Phase 23 additions subsection with 1 item folded in"
    - "Phase 28 backlog with LP-Obs 1 methodology finding"
  affects:
    - "Phase 22 scope (significantly expanded — 21 additional items)"
    - "Phase 23 scope (1 tooltip/docs item added)"
    - "Phase 28 final walkthrough scope (LP real-data pass required)"
tech_stack:
  added: []
  patterns:
    - "3-part triage rubric: blocks workflow + fits scope + no new feature surface"
    - "Observation-to-requirement traceability via FIN-09..12"
key_files:
  created:
    - ".planning/walkthroughs/v3.0-gp-baseline.md"
    - ".planning/walkthroughs/v3.0-lp-baseline.md"
    - ".planning/walkthroughs/SESSION-NOTES.md"
    - ".planning/phases/28-final-walkthrough-signoff/28-BACKLOG.md"
    - ".planning/phases/21-initial-manual-walkthrough-baseline/21-01-SUMMARY.md"
  modified:
    - ".planning/ROADMAP.md"
    - ".planning/REQUIREMENTS.md"
    - ".planning/phases/21-initial-manual-walkthrough-baseline/21-VALIDATION.md"
decisions:
  - "All 52 observations triaged with 3-part rubric; 21 urgent, 4 already scoped, 17 deferred, 10 positive"
  - "FIN-09 (error-copy cleanup), FIN-10 (list sort/filter), FIN-11 (integrated records), FIN-12 (LP calc quality) added to REQUIREMENTS.md as cross-cutting themes from walkthrough"
  - "LP-Obs 1 methodology finding deferred to Phase 28 backlog — portal functional but needs real-data validation before final sign-off"
  - "Seed bug (Obs 47) captured as triageable item — Phase 22 fix to delete order in seed.ts"
  - "LP-Obs 2 confirmed GP Obs 20 thesis: asset-layer errors cascade to LP statements — both items now Urgent Phase 22"
metrics:
  duration: "~2 hours (Wave 3 + Wave 4)"
  completed: "2026-04-16"
  tasks_completed: 2
  files_changed: 8
---

# Phase 21 Plan 01: Initial Manual Walkthrough — Baseline Summary

**One-liner:** GP and LP walkthroughs triaged 52 observations into 21 urgent Phase 22 items and 4 new cross-cutting FIN requirements, with asset-layer correctness emerging as the top strategic priority.

---

## What Was Done

Wave 1 and 2 (the human walkthrough sessions) were completed by the user prior to this execution. Wave 3 applied the locked 3-part triage rubric to every captured observation. Wave 4 folded urgent items into downstream phases, added new requirements, and ran 4-layer validation.

---

## Triage Distribution

| Category | Count | Notes |
|----------|-------|-------|
| Urgent → v3.0 | 21 | 19 GP + 2 LP — all routed to Phase 22 |
| Already scoped | 4 | FIN-01 (Obs 43), FIN-08 (Obs 5, BUG-02/03), Obs 11 (Phase 23) |
| Defer → v3.1+ | 17 | Fails one of the 3 rubric tests (see detail below) |
| Positive findings | 10 | March-5 bugs resolved, command bar clean, capital activity working |
| **Total** | **52** | 46 GP (including Obs 47 seed bug) + 6 LP |

---

## Three Hard Blockers

| # | Observation | Severity | Phase | Status |
|---|-------------|----------|-------|--------|
| GP Obs 35 | Add Side Letter form crashes with TypeError on open — `entities.map` fails after v2.1 response shape change | Blocker | Phase 22 | Urgent |
| GP Obs 40 | Document upload wizard stuck on step 1 — cannot advance, core upload flow broken | Blocker | Phase 22 | Urgent |
| LP-Obs 2 | LP Capital Account distribution total ($14M) does not reconcile with itemized breakdown ($8M) | Blocker | Phase 22 | Urgent |

LP-Obs 2 is the capstone finding: it proves GP Obs 20's thesis that asset-layer errors cascade upward. A $6M unexplained gap in a real LP statement is unacceptable.

---

## Cross-Cutting Themes — New FIN Requirements

Four recurring patterns emerged across multiple observations and became new requirements:

| Req ID | Theme | Source Observations | Phase |
|--------|-------|---------------------|-------|
| FIN-09 | Error-copy cleanup — "Unauthorized" used for non-auth conditions | GP Obs 3 (deal delete stage-gate), GP Obs 39 (AI summary access) | Phase 22 |
| FIN-10 | List sort/filter functional — controls render but don't work | GP Obs 8 (assets), GP Obs 21 (entities), GP Obs 44 (meetings) | Phase 22 |
| FIN-11 | Integrated records — tasks, investors, and activity feeds orphaned from central systems | GP Obs 18 (asset tasks), GP Obs 22 (entity tasks), GP Obs 27 (cap-table investors), GP Obs 6+19 (activity feeds) | Phase 22 |
| FIN-12 | LP display quality — distribution math reconciliation + invested vs. fair value | LP-Obs 2 (statement math), LP-Obs 3 (portfolio display) | Phase 22 |

---

## Asset-Correctness Cluster (Highest Strategic Priority)

Per GP Obs 20: "These calculations for assets are the leaves of the tree. Entity returns, investor returns, all the way up the chain are based on asset returns." This re-weighted several items:

| Obs | Issue | Priority Weight |
|-----|-------|-----------------|
| Obs 10 | Asset edit surface incomplete — entry date and fields locked | HIGH — calc error can't be corrected |
| Obs 12 | Lease/contract fields have no clear edit path | HIGH — contracts drive cash flow model |
| Obs 25 | Cost bases show zero — seed not properly connected | HIGH — entity NAV unmeasurable |
| LP-Obs 2 | Distribution total doesn't reconcile | HIGH — proves the cascade is real |

---

## Already Scoped Items (Phase 21 Confirms Known Issues)

| Obs | Finding | Phase | Requirement |
|-----|---------|-------|-------------|
| Obs 43 | Meeting cards not clickable (FIN-01 scope refinement: needs click handler + detail page) | Phase 22 | FIN-01 |
| Obs 5 | Post-DD deal shows zero workstreams (BUG-01 variant) | Phase 22 | FIN-08 |
| Obs 1-positive | BUG-02 (300% pass rate) appears resolved | Phase 22 | FIN-08 |
| Obs 11 | Next Review date logic opaque — needs tooltip/docs | Phase 23 | FIN-03 adjacent |

---

## Deferred to v3.1+ (17 items)

All deferred items fail at least one of the three rubric tests:

- **Fail test 3 (new feature surface):** Chart daily granularity (Obs 1, 13), AI-drafting from contracts (Obs 15, 16), unit-class term editing (Obs 26), fundraising enrichment (Obs 29), compliance calendar (Obs 30), entity doc upload + role binding (Obs 31), task bulk ops (Obs 38), document metadata/context (Obs 41), document bulk ops (Obs 42)
- **Fail test 1 (not workflow-blocking):** Custom date range (Obs 1b), filter removal intentional (Obs 2), no projections in seed (Obs 14), directory UI inconsistency (Obs 36), Settings IA (Obs 46)
- **Fail test 2 (too large for P22 scope):** Directory tab table inconsistency (Obs 36)

---

## Phase 28 Backlog

One item landed in `.planning/phases/28-final-walkthrough-signoff/28-BACKLOG.md`:

- **LP-Obs 1:** CalPERS institutional LP view cannot be deeply evaluated from GP's mental model. The portal is functionally correct for this seed data, but real-depth LP validation requires the GP's actual customer entities. Phase 28 final walkthrough must include an LP-side pass with real data.

Additional Phase 28 carry-forwards noted (not in backlog as blocker, but noted for planner):
- CFO-led waterfall stress test (post FIN-04)
- SERVICE_PROVIDER role walkthrough (post Phase 24 RBAC)
- Accounting/Fireflies integration check

---

## Positive Findings

The app is in better shape than worst-case: March-5 bugs (BUG-01/02/03) all appear resolved on the tested deal types. The central task detail view, AI command bar, capital activity flows, and cap table all work correctly. No site-wide 404s. CFO has been iterating on capital activity without complaints.

---

## Artifact Pointers

| Artifact | Path |
|----------|------|
| GP walkthrough + triage | `.planning/walkthroughs/v3.0-gp-baseline.md` |
| LP walkthrough + triage | `.planning/walkthroughs/v3.0-lp-baseline.md` |
| Session pre-flight notes | `.planning/walkthroughs/SESSION-NOTES.md` |
| Phase 28 backlog | `.planning/phases/28-final-walkthrough-signoff/28-BACKLOG.md` |
| Updated requirements | `.planning/REQUIREMENTS.md` (FIN-09..12 added) |
| Phase 22 additions | `.planning/ROADMAP.md` → Phase 22 section |

---

## Wave 3 + 4 Commits

- Wave 3: `097d80c` — docs(21): wave 3 triage — 52 observations classified per 3-part rubric
- Wave 4: (this commit) — docs(21): wave 4 fold-in — urgent items routed to P22-28, validation green, phase complete

---

## Self-Check

- [x] All 52 observations have Claude Triage, Triage Reason, Proposed Destination (Layer 2 green)
- [x] GP Obs 47 (seed bug) captured and triaged (Phase 22)
- [x] Triage summary tables populated in both baseline files
- [x] FIN-09..12 added to REQUIREMENTS.md with traceability
- [x] Phase 22 Additions subsection added to ROADMAP.md (21 items)
- [x] Phase 23 Additions subsection added to ROADMAP.md (1 item)
- [x] Phase 28 backlog created with LP-Obs 1 methodology finding
- [x] 21-VALIDATION.md flipped to nyquist_compliant: true
- [x] 4-layer validation: all layers green
- [x] Phase 21 marked complete in ROADMAP.md (phases list + progress table)
