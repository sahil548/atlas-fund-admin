---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: 02-03
status: in-progress
stopped_at: Completed 02-02-PLAN.md
last_updated: "2026-03-06T06:25:23Z"
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 10
  completed_plans: 5
---

# Atlas — GSD State

## Project Reference
- **PROJECT.md:** `.planning/PROJECT.md`
- **Core value:** GP team manages full deal-to-asset lifecycle and fund/LP metrics in one place

## Current Position
- **Milestone:** 1 (GP Production Ready)
- **Phase:** 2 of 7 (Deal Desk End-to-End) — IN PROGRESS
- **Phase status:** Plans 01-02 complete, 5 plans remaining
- **Current Plan:** 02-03 (next to execute)
- **Active plan:** none (ready for 02-03)

## Performance Metrics
- Plans completed: 5
- Plans total: 10 (3 Phase 1 + 7 Phase 2)
- Phases completed: 1

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 02    | 02   | 5min     | 3     | 8     |

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
- **2026-03-06 (02-01):** Kept existing Deal.entityId for backward compatibility alongside new DealEntity junction table
- **2026-03-06 (02-01):** Expanded KillDealSchema to require killReason (was just action: KILL) — schema was unused, safe expansion
- **2026-03-06 (02-01):** Replaced DD-focused closing templates with transactional mechanics — DD belongs in workstreams, not closing checklist
- **2026-03-06 (02-02):** Step 2 document requirement enforced via toast, not blocking Step 1->2 navigation — user can explore Step 2 before adding docs
- **2026-03-06 (02-02):** Counterparty inline creation defaults to COUNTERPARTY type — most common for new companies during deal creation
- **2026-03-06 (02-02):** InlineEditField keeps edit mode open on save failure — prevents losing typed input on API errors
- **2026-03-06 (02-02):** Textarea Enter inserts newline, Ctrl+Enter or blur saves — natural text editing behavior
- **2026-03-06 (02-02):** Revive deal falls back to SCREENING if no previousStage — handles edge case of pre-existing dead deals

### Phase 2 Schema Foundation (Plan 02-01)
- All Phase 2 schema changes consolidated — no subsequent plan needs db push --force-reset
- 5 new models: DealEntity, DDWorkstreamComment, DDWorkstreamAttachment, DecisionStructure, DecisionMember
- 13 new fields across Deal, ClosingChecklist, Asset, DDWorkstream, ICVoteRecord, Entity
- DealEntity CRUD API at /api/deals/[id]/entities with firm-matching validation
- Updated Zod schemas: AddDealEntitySchema, KillDealSchema (with killReason), AddCustomClosingItemSchema
- Transactional closing templates (8 items focused on execution mechanics)

### Phase 2 Wizard, Inline Edit, Kill/Revive (Plan 02-02)
- CreateDealWizard: inline validation + toast, participation structure, deal lead defaults, counterparty inline creation, Step 2 requires docs
- InlineEditField: double-save prevention (savingRef + justSavedRef), error toast, textarea newline support
- KillDealModal: reason dropdown required (Pricing, Risk, Timing, Sponsor, Other) + optional free text
- reviveDeal(): restores deal to previous stage, clears kill metadata
- Pipeline: closing checklist progress % on Closing cards, kill reason badges on dead deal cards

## Session Continuity
- **Initialized:** 2026-03-05
- **Last session:** 2026-03-06T06:25:23Z
- **Stopped at:** Completed 02-02-PLAN.md
