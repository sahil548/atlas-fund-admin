---
phase: 21
slug: initial-manual-walkthrough-baseline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

**Note:** Phase 21 is a user-experience walkthrough phase — its output is human-written markdown, not code. Standard unit/E2E tests do not apply. This validation strategy uses shell-based schema checks and a structured manual audit in place of automated tests. See `21-RESEARCH.md` § "Validation Architecture" for the full rationale.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Shell-based schema checks (no test framework — output is markdown, not code) |
| **Config file** | None — ad-hoc verification commands |
| **Quick run command** | `ls .planning/walkthroughs/v3.0-gp-baseline.md .planning/walkthroughs/v3.0-lp-baseline.md` |
| **Full suite command** | See "Layer 1–4 Validation Commands" below |
| **Estimated runtime** | < 5 seconds for shell checks; ~15 min for Layer 3 manual triage audit |

---

## Sampling Rate

- **After walkthrough session 1 (GP) commit:** Run Layer 1 file-existence check for `v3.0-gp-baseline.md`
- **After walkthrough session 2 (LP) commit:** Run Layer 1 file-existence check for `v3.0-lp-baseline.md`
- **After triage session commit:** Run Layers 2 + 3 + 4
- **Before `/gsd:verify-work`:** All 4 layers green
- **Max feedback latency:** < 5 seconds for automated layers; Layer 3 is a deliberate pause-and-review

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | MAN-01, MAN-02 | scaffolding | `test -d .planning/walkthroughs && test -f .planning/walkthroughs/v3.0-gp-baseline.md && test -f .planning/walkthroughs/v3.0-lp-baseline.md` | ❌ W0 | ⬜ pending |
| 21-01-02 | 01 | 2 | MAN-01 | human-checkpoint | Manual — user executes GP walkthrough, Claude observes | N/A | ⬜ pending |
| 21-01-03 | 01 | 3 | MAN-02 | human-checkpoint | Manual — user executes LP walkthrough, Claude observes | N/A | ⬜ pending |
| 21-01-04 | 01 | 4 | MAN-01, MAN-02 | triage-audit | Layer 2 + Layer 3 (see below) | N/A | ⬜ pending |
| 21-01-05 | 01 | 4 | MAN-01, MAN-02 | cross-reference | Layer 4 (see below) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs are illustrative — the planner will finalize. Point of this map: every requirement has a verification mechanism, even though none are traditional unit tests.*

---

## Wave 0 Requirements

- [ ] `.planning/walkthroughs/` directory — `mkdir -p .planning/walkthroughs`
- [ ] `.planning/walkthroughs/v3.0-gp-baseline.md` — empty skeleton scaffolded from template (see RESEARCH § "Baseline File Skeleton")
- [ ] `.planning/walkthroughs/v3.0-lp-baseline.md` — empty skeleton scaffolded from template
- [ ] No test framework installation needed — verification is shell-based

---

## Layer 1 — File Existence Checks

```bash
# Quick
ls .planning/walkthroughs/v3.0-gp-baseline.md && echo "GP baseline: OK"
ls .planning/walkthroughs/v3.0-lp-baseline.md && echo "LP baseline: OK"

# Non-empty check
[ -s .planning/walkthroughs/v3.0-gp-baseline.md ] && echo "GP baseline populated"
[ -s .planning/walkthroughs/v3.0-lp-baseline.md ] && echo "LP baseline populated"
```

Both files must exist AND be non-empty.

---

## Layer 2 — Schema Checks (Markdown Structure)

Every captured comment block must contain all required fields:

```bash
# Required field presence
grep -c "Page / Action:" .planning/walkthroughs/v3.0-gp-baseline.md
grep -c "What I saw:" .planning/walkthroughs/v3.0-gp-baseline.md
grep -c "Claude Triage:" .planning/walkthroughs/v3.0-gp-baseline.md
grep -c "Triage Reason:" .planning/walkthroughs/v3.0-gp-baseline.md
grep -c "Proposed Destination:" .planning/walkthroughs/v3.0-gp-baseline.md

# No empty values
grep "Proposed Destination: *$" .planning/walkthroughs/v3.0-gp-baseline.md && echo "FAIL: empty Proposed Destination" || echo "OK"
grep "Triage Reason: *$" .planning/walkthroughs/v3.0-gp-baseline.md && echo "FAIL: empty Triage Reason" || echo "OK"

# One severity + one triage box ticked per comment
grep -c "\[x\] Blocker\|\[x\] Annoying\|\[x\] Nitpick" .planning/walkthroughs/v3.0-gp-baseline.md
grep -c "\[x\] Urgent → v3.0\|\[x\] Defer → v3.1+\|\[x\] Already scoped in Phase" .planning/walkthroughs/v3.0-gp-baseline.md
```

Run identical commands against `v3.0-lp-baseline.md`.

**Pass criteria:**
- Field counts for `Page / Action`, `What I saw`, `Claude Triage`, `Triage Reason`, `Proposed Destination` are equal within each file (every comment block has the full set).
- Zero empty values for `Triage Reason` and `Proposed Destination`.
- Severity + triage ticked-box counts equal the comment count.

---

## Layer 3 — Triage Sanity Audit (Manual, Claude-performed)

**For every item marked `Urgent → v3.0`:**
1. Does the Triage Reason name which of the 3 rubric tests it passes (blocks workflow / fits P22–27 scope / no new feature surface)? Missing → re-evaluate.
2. Does the Proposed Destination map to a plausible phase? (e.g., documentation fix → Phase 23, not Phase 22.)
3. Is it actually workflow-blocking, or cosmetic with "Blocker" rated in frustration? If cosmetic → downgrade severity and re-triage.

**For every item marked `Defer → v3.1+`:**
1. Is the deferral reason concrete (e.g., "fails rubric test 3 — requires new feature surface"), not vague ("not important")?
2. If user rated `Blocker` but item is deferred, the reason must explicitly name which rubric test failed.

**Flags that trigger re-review:**
- Any urgent item without a specific phase destination.
- Any urgent item whose destination phase doesn't have a matching requirement in REQUIREMENTS.md.
- Any defer item rated `Blocker` without explicit rubric failure.
- Triage summary showing 0 urgent items (possible but suspicious — flag for human review).

---

## Layer 4 — Cross-Reference Check

```bash
# Count urgent items
grep -c "Urgent → v3.0" .planning/walkthroughs/v3.0-gp-baseline.md
grep -c "Urgent → v3.0" .planning/walkthroughs/v3.0-lp-baseline.md

# Every Phase N destination must correspond to a phase in ROADMAP.md
grep -oE "Phase 2[2-8]" .planning/walkthroughs/v3.0-gp-baseline.md | sort -u
grep -oE "Phase 2[2-8]" .planning/walkthroughs/v3.0-lp-baseline.md | sort -u
# Each must appear as a "### Phase 2X:" heading in ROADMAP.md
```

**Pass criteria:** Every Phase N destination in the triage summary is listed as a phase in `.planning/ROADMAP.md`. Unfittable urgent items → Phase 28 follow-up backlog (NOT a new phase).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Walkthrough captures real user friction | MAN-01 | User's subjective experience cannot be scripted | User executes domain-clustered GP tour; Claude reviews captures for completeness against route inventory |
| LP portal walkthrough reflects actual LP POV | MAN-02 | Must be performed while signed-in as an LP user, not via GP impersonation | User signs in as Michael Chen (multi-vehicle) then Tom Wellington (simpler); Claude verifies each LP route was visited |
| Triage rubric correctly applied | MAN-01, MAN-02 | Rubric application requires human judgment; audit is the fallback | Claude performs Layer 3 audit per rubric |
| Urgent items fold into correct downstream phase | MAN-01, MAN-02 | Requires knowing P22–27 scope semantically | Layer 4 cross-reference + Claude review of destination appropriateness |

---

## Validation Sign-Off

- [ ] Wave 0 complete: `.planning/walkthroughs/` dir + both baseline skeletons created
- [ ] Layer 1 green: both baseline files exist and are non-empty post-walkthrough
- [ ] Layer 2 green: schema checks pass — all required fields populated, no empty values
- [ ] Layer 3 green: triage sanity audit completed, no unresolved flags
- [ ] Layer 4 green: every urgent destination maps to an existing phase in ROADMAP.md
- [ ] Sampling continuity: Layer 1 runs post each walkthrough session, Layers 2–4 run post-triage
- [ ] No watch-mode flags (N/A — no test runner)
- [ ] Feedback latency < 5s for automated layers
- [ ] `nyquist_compliant: true` set in frontmatter after all layers green

**Approval:** pending
