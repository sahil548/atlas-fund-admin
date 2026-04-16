# Phase 21: Initial Manual Walkthrough (Baseline) - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Capture the GP's and an LP's first-person feedback on the Atlas app — as it stands today, BEFORE any v3.0 work begins — so the priorities for Phases 22–27 are informed by real-world friction, not just planning assumptions.

Scope is the walkthrough *mechanism*: Claude builds scaffolding (scripts, checklists, seed-data notes, capture templates), the user executes the walkthrough, Claude captures feedback and triages it into the two baseline files. The app itself is not modified in this phase.

Output artifacts:
- `.planning/walkthroughs/v3.0-gp-baseline.md`
- `.planning/walkthroughs/v3.0-lp-baseline.md`

Locked from ROADMAP.md:
- Triage categories: *urgent → v3.0* vs *non-urgent → v3.1+* with explicit reasoning
- Urgent items fold into P22–P27 plans OR the Phase 28 follow-up backlog
- P22–P27 plans are updated in-place when they absorb walkthrough items

</domain>

<decisions>
## Implementation Decisions

### Script structure
- Domain-clustered tour — organized the way the user already thinks about the app and the way `.planning/UI-GUIDE.md` already lays out its "Workflows — Step-by-Step Testing Reference" section
- GP-side domain order: Dashboard → Deal Desk → Assets → Entities → Capital Activity (calls/distributions) → Waterfall → Transactions → Cap Table → Directory/CRM → Tasks → Documents → Meetings → AI command bar → Settings
- LP-side domain order: LP dashboard → Positions/holdings → Capital activity history → Documents/K-1s → Notifications → Profile
- Each domain entry in the script: (a) what to click, (b) what to look at, (c) free-text "what feels off?" prompt

### Coverage depth + seed data
- **Prioritized**, not exhaustive. Two explicit coverage priorities:
  1. **v2.1 new surface area** (CRUD completion across 9+ entity domains, waterfall/pref changes, cap-table polish) — highest risk for "feels off" since it shipped off-GSD with zero regression UI verification
  2. **P22–P27 scope areas** — meeting detail page (FIN-01), waterfall templates (FIN-02/04), list pages that will be paginated (PAGE-02), routes that will be role-gated (RBAC-01/02)
- Lower priority (sample but don't exhaustively tour): AI command bar, Fireflies meetings, notifications — already validated in v2.0 quality gates
- **Fresh seed before each walkthrough session.** `npx prisma db seed` reset so inputs are known. "Is this urgent or just bad test data?" becomes answerable.

### Capture format + session cadence
- **Solo-then-return** model. Claude produces a markdown checklist the user fills in; triage happens in a follow-up paired session with Claude after the user finishes the click-through.
- **Two sessions, split by role:**
  - Session 1: GP-side walkthrough (signed in as `user-jk`, GP_ADMIN)
  - Session 2: LP-side walkthrough (signed in as the selected LP user)
- Capture template per comment: `page/action · observation · user's gut-call severity (blocker / annoying / nitpick) · Claude's triage (urgent v3.0 / defer v3.1+ / already-scoped-in-phase-N)`

### LP walkthrough scope
- **Two LP passes**, both portal-only:
  - Primary: multi-vehicle LP (e.g., Karen Miller) — stresses portal aggregation, multi-vehicle metric rollup
  - Secondary: single-vehicle LP — sanity pass to confirm the portal looks correct for a "normal" LP too
- **Out of scope for LP walkthrough:** email/SMS notification flow, K-1 acknowledgment flow (both already verified in v2.0). If they surface organically, note them but don't dig.

### Triage rubric (applied by Claude during the follow-up review)
An item is **urgent → v3.0** only if ALL three are true:
1. It blocks or materially degrades a user completing a real workflow (not an aesthetic nitpick)
2. It can be fixed inside the existing Phase 22–27 scope (or is a small enough Phase 28 follow-up) without requiring a new phase
3. It does not introduce a new feature surface (new feature surface → new phase → deferred)

Everything else is **non-urgent → v3.1+**, captured with a one-line reason. No ad-hoc "while we're here" scope absorption.

### March-5 bug re-verification hook
GP walkthrough script explicitly includes the three March-5 bugs so they get re-verified in-flow (DD tab 0%/NOT_STARTED, pipeline pass rate 300%, IC memo stuck spinner). If user hits them, they're handed off to Phase 22 (FIN-08). If user does not hit them, that's evidence for closure.

### Claude's Discretion
- Exact checklist markdown format and per-domain question wording
- Whether to pre-populate the baseline files with empty section scaffolds or let them fill in during triage
- How to handle LP-user selection if Karen Miller isn't the best multi-vehicle candidate in the current seed (pick whichever seeded LP has commitments in ≥2 vehicles)
- Whether to include a small "screenshot expected/actual for each domain" checkbox (nice-to-have for future diffs, not blocking)

</decisions>

<specifics>
## Specific Ideas

- Treat this like Plan 20-10's "human verification checkpoint" pattern, but broadened to the whole app. That pattern worked because it was structured and specific ("click X, expect Y, note if wrong"). Reuse that shape.
- Want the baseline files to be usable as **input documents** for Phase 22 and Phase 23 planning — meaning the triage section should produce phase-tagged items (e.g., "P22 · FIN-01 · meeting detail modal shows stale timestamp") rather than free-form prose.
- The walkthrough is a forcing function to catch anything off-GSD v2.1 introduced that the retroactive audit didn't surface.
- LP walkthrough signed in as an actual LP user (not GP impersonation) so the portal's role-aware behavior is tested as intended.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.planning/UI-GUIDE.md` — "Workflows — Step-by-Step Testing Reference" already enumerates Deal / Asset / Entity / Capital / LP / Other workflows. Use as the skeleton for the walkthrough script; adapt language from "testing steps" to "tour + observe".
- `.planning/codebase/STRUCTURE.md` — page surface area map; helpful for ensuring no major area is missed in the domain-clustered tour.
- `.planning/phases/20-schema-cleanup-ui-polish/20-10-PLAN.md` — reference pattern for a "human verification checkpoint" plan (structured checklist, blocking gate, user approval or gap list).
- Seed data: 3 GP users (user-jk GP_ADMIN, user-sm GP_TEAM, user-al GP_TEAM) + 5 LP users available from `npx prisma db seed`.
- Dev command: `npm run dev` on port 3000; user walks through in their browser.

### Established Patterns
- GSD phase artifacts live in `.planning/phases/XX-name/` — walkthrough artifacts should live in `.planning/walkthroughs/` (sibling, not nested), per the success criteria in ROADMAP.md.
- v2.0 used structured "what must be TRUE" truth lists for verification — the triage output can use the same style so P22–P27 plans can consume items directly.
- March-5 known issues live in `.claude/rules/coding-patterns.md` (DD tab 0%, pass rate 300%, IC memo spinner) with "needs re-verification" flags — walkthrough is the re-verification moment.

### Integration Points
- New directory: `.planning/walkthroughs/` (created in this phase)
- Output feeds into: Phase 22 plans (code fit & finish), Phase 23 plans (docs), Phase 24–27 plans (scope adjustments if urgent items land), Phase 28 follow-up backlog (anything that doesn't fit P22-27 but is still urgent)
- STATE.md update after this phase: record baseline captured, summarize the urgent-vs-deferred count, point to the two walkthrough files

</code_context>

<deferred>
## Deferred Ideas

- Full screenshot capture / visual regression baseline — nice-to-have for future diffs, but not blocking this phase. Revisit in v3.1+ if visual regression tooling becomes a priority.
- SERVICE_PROVIDER role walkthrough — intentionally out of scope for the baseline; RBAC-02 is the phase that builds SERVICE_PROVIDER scoping, so walking it through before that phase ships would be premature. Fold into Phase 28 final walkthrough.
- Notification / K-1 acknowledgment flow exploration — already verified in v2.0; only re-examined if it surfaces organically during LP walkthrough.
- AI command bar deep-dive — validated in v2.0 Phase 18, only sampled in this walkthrough.

</deferred>

---

*Phase: 21-initial-manual-walkthrough-baseline*
*Context gathered: 2026-04-16*
