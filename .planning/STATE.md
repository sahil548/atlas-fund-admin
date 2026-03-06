---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: 3 of 3 (phase complete)
status: phase-complete
stopped_at: "Phase 1 complete — all 3 plans done, GROUND-TRUTH.md approved"
last_updated: "2026-03-05T03:30:00.000Z"
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
---

# Atlas — GSD State

## Project Reference
- **PROJECT.md:** `.planning/PROJECT.md`
- **Core value:** GP team manages full deal-to-asset lifecycle and fund/LP metrics in one place

## Current Position
- **Milestone:** 1 (GP Production Ready)
- **Phase:** 1 of 7 (Verify & Stabilize) — COMPLETE
- **Phase status:** Complete — all 3 plans done, GROUND-TRUTH.md approved by user
- **Current Plan:** Phase 1 complete — next phase: 2 (Deal Desk End-to-End)
- **Active plan:** none (ready to start Phase 2)

## Performance Metrics
- Plans completed: 3
- Plans total: 19
- Phases completed: 0

## Accumulated Context

### Production Status
- Atlas is **deployed on Vercel with real Clerk auth and real data**
- Mock UserProvider available for local dev (8 pre-seeded users: 3 GP + 5 LP)
- CORE-01 (Clerk auth) is **DONE**

### Verified Working (Phase 1 progress)
- XIRR computation: Newton-Raphson converges to correct IRR, tested with real cash flows (Plan 01-01)
- Waterfall distribution: 4-tier European waterfall allocates correctly, LP+GP=distributableAmount invariant holds (Plan 01-01)
- Capital accounts: roll-forward formula correct, Math.abs on distributions/fees, proRataShare edge cases handled (Plan 01-01)
- Deal pipeline stage transitions: all 4 transitions verified complete (Screen->DD, DD->IC, IC->Closing, Closing->Closed) (Plan 01-02)
- Asset creation at deal close: correct — asset linked via entity allocations, not firmId (Plan 01-02)
- BUG-01 FIXED: DD tab now shows workstream-status-based progress when no tasks exist (Plan 01-02)
- BUG-02 FIXED: Pipeline conversion rates capped at Math.min(100, ...) — can never show >100% (Plan 01-02)
- BUG-03 FIXED: IC Memo generation has 90-second timeout — spinner cannot get permanently stuck (Plan 01-02)

### Verified Working — Phase 1 Final Results (Plan 01-03)
- Capital call creation: WORKS (header/event only — line item endpoint missing)
- Distribution creation: WORKS (header/event only — line item endpoint missing)
- Waterfall calculation API: WORKS — fully wired to real entity data
- Capital account compute API: WORKS — reads actual ledger data
- NAV computation API: WORKS — cost basis + economic NAV (5%/0.5%/2% proxy approximations documented)
- Slack IC voting: structurally sound, all DB fields exist (User.slackUserId, ICProcess.slackMessageId/slackChannel), requires workspace setup to test
- GROUND-TRUTH.md: created — definitive status of every Phase 1 feature

### Critical Gap Identified (Phase 2 Priority)
- CapitalCallLineItem and DistributionLineItem have NO API endpoints — cannot record per-investor amounts
- Impact: LP capital account compute returns $0 for contributions and distributions
- Severity: HIGH — blocks correct LP metrics until fixed

### What's Definitely Not Built
- QBO/Xero real OAuth or API calls (UI-only)
- Email/SMS notification delivery (in-app bell only)
- DocuSign real API (stub endpoint only)
- Role-based route enforcement (auth works, access control doesn't)
- Pagination, error boundaries, rate limiting
- PDF/Excel report generation
- Fee calculation engine, side letter rule application

### Patterns to Preserve
- Route registry (`routes.ts`) is single source of truth — never bypass
- Toast: `const toast = useToast()` — never destructure
- API: always use `parseBody(req, ZodSchema)` for validation
- Multi-tenancy: always use `useFirm()` for firmId — never hardcode
- SWR: always guard with `if (isLoading || !data)` before rendering
- Fallback progress: when totalTasks=0, use workstream COMPLETE count / total for DD progress
- Defensive caps: wrap all API percentage calculations in Math.min(100, ...)
- Long-running AI fetches: use Promise.race with 90-second timeout

## Decisions Log
- **2026-03-06 (01-01):** Used Vitest for financial computation tests — zero-config for TypeScript/ESM; no bugs found in any of the three computation engines
- **2026-03-06 (01-01):** Waterfall GP catch-up hardcodes 20% carry (gpTargetPct=0.20) — documented as known limitation; interface change needed to support configurable carry %
- **2026-03-05 (01-02):** DD tab uses workstream-status fallback (not "N/A") when no tasks — gives honest progress %
- **2026-03-05 (01-02):** Math.min(100,...) on conversion rates is defensive — cumulative counting already prevents >100% mathematically
- **2026-03-05 (01-02):** 90s IC Memo timeout — generous for slow environments without being infinite; finally block also guarantees cleanup
- **2026-03-05 (01-02):** Asset model has no firmId by design — linked to firm via entity allocation chain
- **2026-03-05 (01-03):** Capital/distribution line item endpoints missing — HIGH severity gap; Phase 2 must build CapitalCallLineItem and DistributionLineItem create/update APIs
- **2026-03-05 (01-03):** NAV proxy values (5%/0.5%/2%) are intentional approximations — documented, not changed (no cash balance field in data model)
- **2026-03-05 (01-03):** Slack integration structurally complete — all DB fields present, security hardened; "UNTESTABLE" status is workspace setup gap, not a code defect

## Session Continuity
- **Initialized:** 2026-03-05
- **Last session:** 2026-03-05T03:30:00.000Z
- **Stopped at:** Completed Phase 1 (01-verify-and-stabilize) — all 3 plans done, GROUND-TRUTH.md user-approved
