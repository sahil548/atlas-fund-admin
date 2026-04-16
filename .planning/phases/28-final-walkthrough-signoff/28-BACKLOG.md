# Phase 28 Follow-Up Backlog

**Created:** 2026-04-16
**Source:** Phase 21 walkthrough triage (Wave 4 fold-in)
**Purpose:** Urgent items from Phase 21 that don't fit Phases 22-27 scope land here for Phase 28 pickup. Also holds methodology carry-forwards for the final walkthrough session.

Items here should be incorporated into the Phase 28 planning document when that phase is planned. Every row was triaged against the Phase 21 rubric; items here either (a) passed all 3 rubric tests but couldn't be absorbed into Phases 22-27, or (b) are methodology/process findings that only become actionable in the context of the final walkthrough.

---

## Table

| # | Source | Observation | Rubric Justification | Notes for Phase 28 Planner |
|---|--------|-------------|----------------------|----------------------------|
| LP-Obs 1 | `.planning/walkthroughs/v3.0-lp-baseline.md` | CalPERS institutional LP view cannot be deeply evaluated from the GP's mental model — surface-level check confirmed portal functional, but real-depth validation requires real customer entity data | Fails rubric test 1 (no UI bug to fix) — structural evaluation methodology finding. LP portal rendered correctly; the gap is evaluation depth, not app correctness. | Phase 28 final walkthrough should include at minimum one LP-side pass with the GP's actual customer entities (not just seed data). Prioritize the LP Capital Account reconciliation path (see LP-Obs 2, now fixed in Phase 22) and the distribution breakdown display. User's own quote: "I'll just have to see it with my own entities once I test it." |

---

## Deferred Items for Phase 28 Scope Planning

These items were explicitly deferred to the Phase 28 final walkthrough for re-evaluation — they were NOT urgent at Phase 21 baseline, but should be revisited after Phases 22-27 ship:

- **Waterfall correctness (GP Obs 28):** CFO reports waterfalls working, but the GP did not personally stress-test. Phase 28 should include a CFO-led waterfall walkthrough after FIN-04 (second-fund ground truth) completes in Phase 22.
- **Accounting integration (GP Obs 32):** QBO/Xero is UI-only in the current build. Phase 28 review should note if real OAuth/API integration has landed or remains UI-only.
- **Fireflies integration (GP Obs 33):** Not tested in Phase 21 (requires a live meeting transcript). Phase 28 should include a Fireflies integration check if the integration has been exercised since Phase 21.
- **SERVICE_PROVIDER role walkthrough:** Intentionally out of scope for Phase 21 (RBAC-02 ships in Phase 24). Phase 28 final walkthrough should include a SERVICE_PROVIDER pass to verify entity-scoped access works as expected.
- **LP walkthrough with real data:** Per LP-Obs 1 methodology finding above — re-run LP walkthrough with the GP's actual customer entities before final sign-off.

---

*Phase 28 planner: reference `.planning/walkthroughs/v3.0-gp-baseline.md` and `.planning/walkthroughs/v3.0-lp-baseline.md` for the full observation corpus. The Phase 28 final walkthrough script should build on the v3.0-gp-baseline checklist, updated to reflect Phase 22-27 changes.*
