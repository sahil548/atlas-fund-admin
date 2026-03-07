---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: Not started
status: unknown
stopped_at: Completed 04-01-PLAN.md
last_updated: "2026-03-07T23:13:15.132Z"
progress:
  total_phases: 7
  completed_phases: 3
  total_plans: 18
  completed_plans: 14
---

# Atlas — GSD State

## Project Reference
- **PROJECT.md:** `.planning/PROJECT.md`
- **Core value:** GP team manages full deal-to-asset lifecycle and fund/LP metrics in one place

## Current Position
- **Milestone:** 1 (GP Production Ready)
- **Phase:** 3 of 7 (Capital Activity) — IN PROGRESS
- **Phase status:** Plans 01, 02, 03 complete — all computation engines wired to UI
- **Current Plan:** Not started
- **Active plan:** none

## Performance Metrics
- Plans completed: 13
- Plans total: 18 (3 Phase 1 + 7 Phase 2 + 3 Phase 3 so far)
- Phases completed: 2

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 02    | 02   | 5min     | 3     | 8     |
| 02    | 06   | 8min     | 2     | 9     |
| 02    | 07   | 7min     | 2     | 7     |
| 03    | 01   | 25min    | 2     | 11    |
| 03    | 02   | 12min    | 2     | 9     |
| Phase 03-capital-activity P03 | 35 | 2 tasks | 9 files |
| Phase 04-asset-entity-polish P01 | 6min | 2 tasks | 8 files |

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

### Critical Gap — CLOSED (Phase 3 Plan 01)
- CapitalCallLineItem and DistributionLineItem NOW have full API endpoints (GET list, POST create, PATCH update/fund)
- Transaction chain engine closes the loop: fund a capital call line item -> calledAmount updates -> capital account recomputes
- Distribution PAID -> all investor capital accounts recomputed

### What's Definitely Not Built
- QBO/Xero real OAuth or API calls (UI-only)
- Email/SMS notification delivery (in-app bell only)
- DocuSign real API (stub endpoint only)
- Role-based route enforcement (auth works, access control doesn't)
- Pagination, error boundaries, rate limiting
- PDF/Excel report generation
- Side letter rule application: BUILT in 04-01 (SideLetterRule model, applySideLetterRules, detectMFNGaps, rules CRUD API)

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
- **2026-03-06 (02-06):** Separated in-app voting (individual votes) from final IC decision — both endpoints coexist, votes don't auto-advance deal
- **2026-03-06 (02-06):** Delete protection on decision structures — returns 409 with linked entity names instead of cascading
- **2026-03-06 (02-06):** SEND_BACK vote auto-triggers sendBackToDueDiligence — APPROVE/REJECT only update counts (final decision via ic-decision endpoint)

- **2026-03-07 (03-01):** autoGenerateLineItems defaults to true — pro-rata line items auto-created from entity commitments on capital call/distribution creation
- **2026-03-07 (03-01):** Unfunded commitment warning uses X-Warning header, does NOT block create — "Warn but allow" per user decision
- **2026-03-07 (03-01):** Distribution line item PATCH requires DRAFT status — prevents edits after approval/payment
- **2026-03-07 (03-01):** Capital account upsert uses today's date as periodDate — idempotent; same-day recomputes simply overwrite
- **2026-03-07 (03-03):** Entity-level MOIC computed as weighted average: sum(fairValue * allocationPct) / sum(costBasis * allocationPct)
- **2026-03-07 (03-03):** IRR outflows dated to CapitalCallLineItem.paidDate (not CapitalCall.callDate) — actual money movement date for correct XIRR
- **2026-03-07 (03-03):** Dashboard falls back to asset-level IRR/TVPI when aggregatePaidIn=0 — avoids N/A display on fresh entities with no funded calls
- **2026-03-07 (03-03):** NAV snapshots auto-saved as fire-and-forget on every GET /api/nav/[entityId] — doesn't block response
- **2026-03-07 (03-03):** Commitment audit trail: Transaction(TRANSFER) record created with old->new description before updating Commitment.amount
- **2026-03-07 (04-01):** FEE_DISCOUNT takes highest active discount if multiple rules exist — protects LP from ambiguity in multi-rule scenarios
- **2026-03-07 (04-01):** CARRY_OVERRIDE stored as percentage (e.g. 15 for 15%), converted to decimal only inside engine — keeps DB values human-readable
- **2026-03-07 (04-01):** MFN gap: fee gap when currentDiscount < bestDiscount; carry gap when currentOverride > bestOverride (lower carry is better for LP)
- **2026-03-07 (04-01):** SideLetterRules cascade-delete on SideLetter delete; side letter + rules created atomically via prisma.$transaction

### Phase 3 Metrics Wiring (Plan 03-03)
- Entity metrics API: TVPI, DPI, RVPI, MOIC, IRR from real funded capital calls + paid distributions + inline NAV
- GP dashboard cross-entity rollup: aggregateTVPI/DPI/RVPI/weightedIRR/totalNAV + entityMetrics table
- NAV proxy configuration editable per entity; snapshot auto-saved on every NAV GET
- LP activity capital account running ledger: CONTRIBUTION/DISTRIBUTION/FEE entries with running balance
- Commitment PATCH with audit trail — Transaction(TRANSFER) logged on every edit

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

### Phase 2 Closing, Deal-to-Asset, Multi-Entity (Plan 02-03)
- Closing tab: "Add Item" button for custom checklist items, per-item file upload/download, warn-on-incomplete override dialog
- closeDeal(): sets sourceDealId on Asset, carries dealMetadata, auto-redirect to /assets/[id]
- DealEntity section rewritten to use junction table API — add/remove entities, allocation % and roles
- Close modal pre-populates allocation rows from DealEntity junction records

### Phase 2 DD Workstreams PM-Style (Plan 02-05)
- DD tab redesigned as PM-style list: assignee avatars, status/priority dropdowns, due dates, progress bar
- WorkstreamDetailPanel: split-view with threaded comments and file attachments
- New APIs: PATCH workstream (assignee/priority/due), comments CRUD, attachments CRUD
- Workstream status flow: NOT_STARTED → IN_PROGRESS → COMPLETE with inline editing

- **2026-03-06 (02-07):** sourceDeal include fetches screeningResult, workstreams, icProcess, dealMetadata, dealLead for comprehensive deal intelligence on asset pages
- **2026-03-06 (02-07):** AI Deal Intelligence section defaults collapsed on asset overview -- avoids overwhelming the page while keeping data accessible
- **2026-03-06 (02-07):** Analytics route at priority 81 between Accounting (82) and Meetings (80) for natural sidebar placement
- **2026-03-06 (02-07):** Time-in-stage uses DealActivity STAGE_CHANGE metadata with fallback to deal createdAt

### Phase 2 Decision Structures & IC Voting (Plan 02-06)
- Decision structures CRUD API: 3 route files (structures, [id], [id]/members)
- Settings page "Decision Structures" tab with create/edit/delete, expandable member management
- In-app voting endpoint: POST /api/deals/[id]/ic/vote with duplicate check, conditions, SEND_BACK trigger
- sendBackToDueDiligence function in deal-stage-engine: stage change + activity log + ICProcess status
- Enhanced IC Review tab: voting panel, conditions textarea, structure info banner, vote display with conditions
- Zod schemas: CreateDecisionStructureSchema, UpdateDecisionStructureSchema, AddDecisionMemberSchema, CastICVoteSchema

### Phase 2 Asset Detail & Analytics (Plan 02-07)
- Asset detail page: "Originated from" banner with source deal link, collapsible AI intelligence section (score, strengths, risks)
- New equity tab + entity allocations card on overview + type-specific placeholders
- Dedicated /analytics page: 4 Recharts panels (pipeline value by stage, time-in-stage, deal velocity, conversion funnel) + throughput chart
- GET /api/analytics/pipeline: pipeline value, time-in-stage, velocity, conversion, throughput metrics
- Analytics registered in routes.ts (sidebar, command bar, AI prompt auto-updated)

### Phase 3 Capital Activity Foundation (Plan 03-01)
- Phase 3 schema complete: fee config on WaterfallTemplate (8 fields), distributionType/memo on DistributionEvent, navProxyConfig on Entity
- All Phase 3 schema done — no subsequent plan needs db push --force-reset
- Capital activity engine: updateCommitmentCalledAmount, recomputeCapitalAccountForInvestor, recomputeAllInvestorCapitalAccounts, updateCapitalCallStatus
- 6 new API routes: capital-calls/[id], capital-calls/[id]/line-items, capital-calls/[id]/line-items/[lineItemId], distributions/[id], distributions/[id]/line-items, distributions/[id]/line-items/[lineItemId]
- Auto-generation of pro-rata line items on capital call/distribution creation (autoGenerateLineItems=true default)
- Status transition validation: forward-only, allowlist per state

### Phase 3 Waterfall Engine Enhancement + Fee Calculation (Plan 03-02)
- Waterfall engine now fully configurable: carry %, pref SIMPLE/COMPOUND compounding, offset-by-prior-distributions, income-counts-toward-pref, GP co-invest %, clawback liability — 40 tests all pass
- Fee calculation engine: computeManagementFee (3 bases: COMMITTED_CAPITAL, INVESTED_CAPITAL, NAV), computeCarriedInterest, calculateFees
- POST /api/fees/calculate: reads entity waterfall template fee config, aggregates commitments/NAV, upserts FeeCalculation record
- Enhanced /api/waterfall-templates/[id]/calculate: WaterfallConfig from template fields, per-investor breakdown, clawbackLiability, saveResults=false for scenario mode
- DELETE /api/waterfall-templates/[id]/tiers: tier removal endpoint
- Distribution form: type selector (Income/ROC/Capital Gain/Final Liquidation), Run Waterfall button (auto-decomposes), editable per-investor LP table, memo field

- **2026-03-07 (03-02):** GP catch-up formula preserved as distributableAmount * carryPercent — backward compatible; carryPercent now configurable (default 0.20)
- **2026-03-07 (03-02):** saveResults=false in waterfall calculate — scenario mode for distribution form without DB write
- **2026-03-07 (03-02):** Per-investor proRata based on Commitment.amount (total committed), not calledAmount — LP ownership stake for distribution allocation
- **2026-03-07 (03-02):** clawbackLiability is display-only, always 0 in correct single-period waterfall; useful for multi-period over-distribution detection

## Session Continuity
- **Initialized:** 2026-03-05
- **Last session:** 2026-03-07T23:13:15.130Z
- **Stopped at:** Completed 04-01-PLAN.md
