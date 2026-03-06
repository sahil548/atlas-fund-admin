---
phase: 01-verify-and-stabilize
plan: "03"
subsystem: api
tags: [capital-calls, distributions, slack, waterfall, capital-accounts, nav, verification]

# Dependency graph
requires:
  - phase: 01-verify-and-stabilize
    provides: "computation engines verified (01-01), bugs fixed and pipeline verified (01-02)"
provides:
  - "Capital call creation API verified: WORKS for header creation, PARTIAL (no line item endpoint)"
  - "Distribution creation API verified: WORKS for event creation, PARTIAL (no line item endpoint)"
  - "Waterfall calculation API verified: fully wired to real entity data"
  - "Capital account compute API verified: reads actual ledger data correctly"
  - "NAV computation API verified: cost basis + economic NAV with documented approximations"
  - "Slack IC voting reviewed: structurally sound, untestable without workspace setup"
  - "GROUND-TRUTH.md: definitive Phase 1 status for all features (270 lines)"
affects:
  - "02-financial-accuracy: capital call and distribution line item endpoints must be built"
  - "03-ic-workflow: Slack setup documented for future test"
  - "05-lp-portal: capital account compute depends on line items being present"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "NAV proxy approximations: 5% cash, 0.5% other assets, 2% liabilities (documented, not changed)"
    - "Slack graceful degradation: returns null / warns when env vars not set (no crash)"
    - "Waterfall API: yearsOutstanding defaults to 1 when no capital calls exist"

key-files:
  created:
    - ".planning/phases/01-verify-and-stabilize/GROUND-TRUTH.md"
  modified: []

key-decisions:
  - "Capital call and distribution line item endpoints are MISSING — core gap for Phase 2 to address"
  - "NAV proxy values (5%/0.5%/2%) are intentional approximations — documented, not changed"
  - "Slack integration is structurally complete and security-hardened — requires workspace setup to test"
  - "Waterfall API defaults to yearsOutstanding=1 when no capital calls exist — reasonable safe default"

patterns-established:
  - "GROUND-TRUTH pattern: every feature gets WORKS/PARTIAL/BROKEN/UNTESTABLE status with impact description"

requirements-completed:
  - VERIFY-02
  - VERIFY-04

# Metrics
duration: 15min
completed: 2026-03-05
---

# Phase 1 Plan 3: Capital Workflow Verification and Ground Truth Summary

**Capital call, distribution, waterfall, NAV, and Slack APIs verified via code review; GROUND-TRUTH.md created with definitive status of all 15+ features tested in Phase 1**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-05T03:00:00Z
- **Completed:** 2026-03-05T03:15:00Z
- **Tasks:** 2 of 3 (Task 3 is human-verify checkpoint — awaiting user review)
- **Files modified:** 1 (GROUND-TRUTH.md created)

## Accomplishments

- Verified 6 API endpoints via full code review: capital calls, distributions, waterfall calculation, capital account compute, NAV computation, Slack IC interactions
- Identified the key gap: no endpoints exist to create per-investor line items (CapitalCallLineItem, DistributionLineItem) — this is the most important finding for Phase 2 planning
- Confirmed all required Slack integration database fields exist: User.slackUserId, ICProcess.slackMessageId, ICProcess.slackChannel
- Created GROUND-TRUTH.md with 270 lines covering every feature tested in Phase 1 — definitive reference for remaining 6 phases

## Task Commits

1. **Task 1+2: Verify capital workflows, Slack integration, and create GROUND-TRUTH.md** - `bd6d30f` (docs)
2. **Task 3: User review of ground truth document** - CHECKPOINT (awaiting)

## Files Created/Modified

- `.planning/phases/01-verify-and-stabilize/GROUND-TRUTH.md` — 270-line ground truth document covering all Phase 1 verification targets

## Decisions Made

- **Capital/distribution line items are a Phase 2 priority:** The CapitalCallLineItem and DistributionLineItem models exist in the schema but have no API endpoints. Without them, LP capital account statements show $0 contributions and $0 distributions. This is a HIGH severity gap that blocks correct LP metrics.
- **NAV proxy values stay as-is:** The 5% cash / 0.5% other assets / 2% liabilities approximations are intentional and documented. No change needed — the code acknowledges these are estimates.
- **Slack is "UNTESTABLE" not "BROKEN":** The code is structurally correct and security-hardened. It cannot be tested without a real Slack workspace. Setup requirements are fully documented in GROUND-TRUTH.md.
- **Waterfall 1-year default is sound:** When no capital calls exist for an entity, yearsOutstanding defaults to 1. This prevents division-by-zero and gives a reasonable hurdle rate calculation.

## Deviations from Plan

None — plan executed exactly as written. No bugs were found in any of the reviewed APIs. The capital call and distribution line item gap was anticipated by the plan ("check if there is a way to add line items") and documented as PARTIAL per plan instructions.

## Issues Encountered

None. Build passed with 0 errors (verified before and after).

## User Setup Required

**Slack IC Voting (to test end-to-end):**
1. Create a Slack app at api.slack.com for your workspace
2. Enable "Interactivity & Shortcuts" — Request URL: `https://your-atlas-domain.com/api/slack/interactions`
3. Add the bot to your IC channel
4. Set environment variables in Vercel: `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_IC_CHANNEL`
5. For each GP team member: find their Slack User ID (in their Slack profile) and set `slackUserId` on their Atlas user record in the database
6. Trigger an IC_REVIEW on any deal — the Slack message should appear; have a GP member click Approve/Reject

## Next Phase Readiness

- GROUND-TRUTH.md is the definitive foundation for Phase 2+ planning
- Most critical gap to address in Phase 2: capital call and distribution line item endpoints (without them, LP capital account compute returns sparse/zero data)
- Slack integration can be enabled at any time once env vars and user mappings are configured — no code changes needed
- Financial computation engines are verified and reliable as a foundation
- All 3 bugs from the CLAUDE.md known issues list are now fixed

## Self-Check: PASSED

- FOUND: .planning/phases/01-verify-and-stabilize/GROUND-TRUTH.md (270 lines)
- FOUND: commit bd6d30f (Task 1+2)
- FOUND: .planning/phases/01-verify-and-stabilize/01-03-SUMMARY.md

---
*Phase: 01-verify-and-stabilize*
*Completed: 2026-03-05*
