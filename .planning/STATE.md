---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: 09-02 (next)
status: unknown
stopped_at: Completed 09-02-PLAN.md -- Plaid balance card on entity detail, waterfall test fix, typed deal interfaces in DD and Overview tabs
last_updated: "2026-03-08T07:56:46.551Z"
progress:
  total_phases: 9
  completed_phases: 9
  total_plans: 33
  completed_plans: 33
---

# Atlas — GSD State

## Project Reference
- **PROJECT.md:** `.planning/PROJECT.md`
- **Core value:** GP team manages full deal-to-asset lifecycle and fund/LP metrics in one place

## Current Position
- **Milestone:** 1 (GP Production Ready)
- **Phase:** 9 of 9 (Financial Wiring & Polish) — IN PROGRESS
- **Phase status:** 1 of 2 plans executed
- **Current Plan:** 09-02 (next)
- **Active plan:** none
- **Milestone status:** 32/33 plans complete — 1 plan remaining (09-02)

## Performance Metrics
- Plans completed: 17
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
| 04    | 02   | 15min    | 2     | 20    |
| 04    | 03   | 45min    | 2     | 25    |
| 04    | 04   | 50min    | 2     | 13    |
| 04    | 05   | 30min    | 2     | 8     |
| Phase 05 P01 | 6min | 2 tasks | 8 files |
| Phase 05-qbo-xero-integration P02 | 6min | 2 tasks | 7 files |
| Phase 05 P03 | 10min | 1 tasks | 3 files |
| Phase 06-lp-portal P02 | 3min | 2 tasks | 4 files |
| Phase 06-lp-portal P01 | 25min | 2 tasks | 6 files |
| Phase 07 P02 | 6min | 2 tasks | 14 files |
| Phase 07 P05 | 10min | 2 tasks | 15 files |
| Phase 07 P03 | 30 | 2 tasks | 9 files |
| Phase 07 P06 | 14min | 2 tasks | 21 files |
| 07    | 01   | 15min    | 2     | 9     |
| Phase 07 P04 | 15min | 2 tasks | 5 files |
| Phase 08 P01 | 5min | 2 tasks | 13 files |
| Phase 08 P02 | 5min | 2 tasks | 11 files |
| Phase 09 P01 | 2min | 2 tasks | 2 files |
| Phase 09 P02 | 15min | 2 tasks | 4 files |

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
- QBO OAuth2 flow BUILT (Phase 5): connect/callback/disconnect + token manager + account mapping + trial balance sync + GL-based NAV. Xero provider interface ready but not implemented.
- Email/SMS notification delivery (in-app bell only)
- DocuSign real API (stub endpoint only)
- Pagination, error boundaries, rate limiting: BUILT in 04-03 (cursor pagination on all 7 list APIs + 8 pages, SearchFilterBar, LoadMoreButton, PageErrorBoundary, SectionErrorBoundary, rate limiter on AI endpoints)
- PDF/Excel report generation
- Side letter rule application: BUILT in 04-01 (SideLetterRule model, applySideLetterRules, detectMFNGaps, rules CRUD API)
- Role-based route enforcement: BUILT in 04-02 (middleware + permissions system + audit log)
  - LP_INVESTOR: redirected from GP pages, 403 on GP APIs
  - SERVICE_PROVIDER: 403 on all write methods, entity-access checked at API layer
  - GP_TEAM: configurable per-area permissions via Settings > Permissions tab
  - Audit log: CREATE_DEAL, KILL/CLOSE/REVIVE_DEAL, CREATE/UPDATE_ENTITY, CREATE_CAPITAL_CALL, CREATE_DISTRIBUTION
- GP Dashboard redesign: BUILT in 04-04 (entity cards + portfolio aggregates + LP comparison view)
- Performance attribution: BUILT in 04-05 (per-asset contribution to fund returns, projected vs actual comparison, entity attribution ranked by contribution)

### Patterns to Preserve
- Route registry (`routes.ts`) is single source of truth — never bypass
- Toast: `const toast = useToast()` — never destructure
- API: always use `parseBody(req, ZodSchema)` for validation
- Multi-tenancy: always use `useFirm()` for firmId — never hardcode
- SWR: always guard with `if (isLoading || !data)` before rendering
- Fallback progress: when totalTasks=0, use workstream COMPLETE count / total for DD progress
- Defensive caps: wrap all API percentage calculations in Math.min(100, ...)
- Long-running AI fetches: use Promise.race with 90-second timeout
- SectionErrorBoundary wraps all major dashboard sections — section failure never takes down full page
- Entity card expand/collapse: CSS max-height transition, no dependencies

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
- **2026-03-07 (04-02):** Clerk publicMetadata for role in middleware — avoids DB query on every request; role stored at invite time
- **2026-03-07 (04-02):** permissions-types.ts split — Prisma import in permissions.ts caused client bundle errors; pure-TS types moved to separate file
- **2026-03-07 (04-02):** GP_TEAM permissions default to read_only everywhere; GP_ADMIN overrides cannot be configured (always full)
- **2026-03-07 (04-02):** Audit log is fire-and-forget — never blocks primary operation; failure only logged to console
- **2026-03-07 (04-02):** SERVICE_PROVIDER entity-access checked at API layer (not middleware) for per-resource granularity
- **2026-03-07 (04-03):** SWR onSuccess accumulation pattern used instead of custom usePaginatedList hook — complex pages (deals kanban, tasks view tabs) needed direct control over cursor and accumulated array
- **2026-03-07 (04-03):** Deals page kanban preserved — pagination feeds allDeals array, kanban filters it client-side by stage; visual board unchanged
- **2026-03-07 (04-03):** No /api/transactions route exists — transactions page reads from /api/capital-calls and /api/distributions directly; SectionErrorBoundary import added, full pagination deferred
- **2026-03-08 (04-04):** Dashboard redesigned as two sections: entity cards (top) + portfolio overview (bottom) — clean separation of concerns, each section can fail independently
- **2026-03-08 (04-04):** LPComparisonView is collapsible placed below portfolio section — keeps dashboard uncluttered while LP data remains accessible
- **2026-03-08 (04-04):** Entity card expand/collapse uses CSS max-height transition — zero dependencies, smooth animation
- **2026-03-08 (04-04):** PortfolioAggregates fetches from /portfolio-aggregates and distributes data as props to child components — single SWR call for entire bottom section
- **2026-03-08 (04-04):** Top/bottom performers: assets with no IRR data excluded from performer lists — N/A values meaningless for ranking
- **2026-03-08 (04-05):** Attribution via entity allocation weight: asset IRR contribution = (costBasis / totalEntityCostBasis) * assetIRR
- **2026-03-08 (04-05):** XIRR fallback to cost basis: when no funded capital calls, uses entryDate + costBasis as synthetic outflow for IRR computation
- **2026-03-08 (04-05):** Projection source is transparent in UI: "AI-extracted from CIM" vs "GP estimate" badge shows data provenance
- **2026-03-08 (04-05):** IRR entered as percentage by GP (e.g. 15 for 15%), stored as decimal (0.15) — avoids common confusion between representations
- **2026-03-08 (04-05):** PATCH on attribution route for GP overrides keeps projection updates separate from general PUT /api/assets/[id]
- **2026-03-08 (05-01):** Used raw fetch instead of intuit-oauth SDK — SDK has no TypeScript types; standard OAuth2 is straightforward with fetch
- **2026-03-08 (05-01):** CSRF state is base64url JSON {entityId, nonce} in httpOnly cookie (10-min expiry) for OAuth2 redirect round-trip
- **2026-03-08 (05-01):** Disconnect preserves chartOfAccountsMapped and accountMappings — historically pulled data remains useful after OAuth disconnection
- **2026-03-08 (05-01):** Prisma.JsonNull required for setting nullable JSON fields to null in TypeScript (oauthCredentials on disconnect)
- **2026-03-08 (05-02):** Delete-then-createMany for AccountMapping upsert — no @@unique([connectionId, providerAccountId]) constraint; delete matching records + createMany is semantically equivalent
- **2026-03-08 (05-02):** suggestFrom query param on chart-of-accounts enables cross-entity name-based mapping suggestions for faster GP onboarding
- **2026-03-08 (05-02):** chartOfAccountsMapped set to true once any mappings saved — GP controls completeness; Trial Balance tab disabled until this is true
- **2026-03-08 (06-02):** gpOverrides.capitalCallsAlwaysImmediate returned as system constant on every GET/PUT response — not stored in DB, enforced by notification engine in Phase 7
- **2026-03-08 (06-02):** Debounce auto-save at 500ms per section change — no external library, clearTimeout/setTimeout pattern
- **2026-03-08 (06-02):** Undefined field filtering before Prisma upsert — prevents overwriting existing preferences when only a subset of fields are sent
- **2026-03-07 (07-02):** SearchFilterBar renamed to FilterBar internally; SearchFilterBar alias kept for backward compat — zero call site changes needed
- **2026-03-07 (07-02):** ExportButton uses children slot in FilterBar for GP list pages; LP pages get ExportButton directly in header area
- **2026-03-07 (07-02):** xlsx XLSX.writeFile handles browser download internally — no manual blob/URL.createObjectURL needed
- **2026-03-08 (07-03):** White-label PDFs: entity name only in headers/footers, no Atlas branding — per user decision from plan spec
- **2026-03-08 (07-03):** IRR set to null in PDF templates for initial version — per-investor XIRR requires full ledger computation; fund-level TVPI/DPI/RVPI computed from aggregate called/distributed
- **2026-03-08 (07-03):** Report naming: "{entity.name} — {ReportType} {period}" stored as Document.name — human-readable in Document Center
- **2026-03-08 (07-03):** renderToBuffer called directly in API route — react-pdf fast enough for serverless (under 3s typical), no worker threads needed
- **2026-03-08 (07-05):** Raw fetch for DocuSign (no SDK) — mirrors QBO Phase 5 pattern; DocuSign SDK has no TypeScript types
- **2026-03-08 (07-05):** DocuSignConnection stored at firm level (not entity) — DocuSign accounts are firm-wide, not per-entity
- **2026-03-08 (07-05):** fileUrl support added to esignature POST — closing checklist items store fileUrl directly, not via Document model
- **2026-03-08 (07-05):** Webhook returns 200 always — prevents DocuSign retry storms when package not found
- **2026-03-08 (07-05):** Signed document stored as new Document record (category=LEGAL) — preserves original, adds signed version alongside
- **2026-03-08 (07-04):** Unmatched K-1s still uploaded with null investorId — GP can manually assign later; no data loss on bulk upload
- **2026-03-08 (07-04):** taxYear stored as string in FormData, parsed to int only for notifyInvestorsOnK1Available call — keeps K-1 upload API flexible
- **2026-03-08 (07-04):** Entity detail page uses Link (not button) for Generate Report quick action — pure navigation, no API call needed
- **2026-03-08 (07-04):** K-1 filename fuzzy matching: exact OR substring containment in either direction — handles "John Smith" matching "K1_John_Smith_2025.pdf" reliably

### Phase 5 Account Mapping + Trial Balance (Plan 05-02)
- 4 API routes: chart-of-accounts (auto-detect + suggestFrom), mappings CRUD (delete+createMany upsert), sync (SYNCING lifecycle + TrialBalanceSnapshot upsert), trial-balance (bucket organization + list mode)
- AccountMappingPanel: grouped by classification (Asset/Liability/Equity/Revenue/Expense), per-account dropdown, Apply All Suggestions, unmapped warning badge
- TrialBalanceView: 5 bucket sections (expandable cards), UNMAPPED in amber, period selector, reconciliation summary, Sync Now
- Accounting page: entity drill-in expand/collapse with Account Mapping + Trial Balance tabs, Connect/Reconnect/Sync inline, SectionErrorBoundary wraps drill-in

### Phase 4 Performance Attribution (Plan 04-05)
- computeAssetAttribution: XIRR from real capital calls/distributions (via entity allocation weighting) + projected metrics from AI deal metadata or GP overrides
- computeEntityAttribution: aggregates all assets, assigns cost-basis contribution weights, ranks by weighted IRR contribution
- Asset detail "Performance" tab: side-by-side projected vs actual with green/red variance arrows
- GP can inline-edit projectedIRR and projectedMultiple; stored as decimal, entered as percentage
- Empty state shown when no projections exist with helpful call-to-action
- FIN-10 complete: each asset's contribution to fund returns is computed and rankable

### Phase 4 Dashboard Redesign (Plan 04-04)
- GP Dashboard fully redesigned as "morning briefing": entity cards (NAV/IRR/TVPI/deployment) at top + portfolio overview (allocation/performers/deployment/activity) at bottom
- Entity cards: compact view with expand to show NAV breakdown (cost basis vs fair value) and per-asset contribution table
- Portfolio aggregates: top/bottom performers split panel, capital deployment stacked bars with dry powder, recent activity timeline
- LP comparison: sortable table showing all LPs with per-entity TVPI/IRR and aggregate metrics; collapsible below portfolio section
- SectionErrorBoundary wraps each major section — section failure never takes down full dashboard

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

- **2026-03-07 (06-01):** entityId in MetricSnapshot uses '__AGGREGATE__' sentinel string (non-nullable) — avoids Prisma @@unique treating each null as unique, which would defeat one-aggregate-per-day intent
- **2026-03-07 (06-01):** MetricSnapshot has no Entity @relation — only Investor — to allow sentinel value '__AGGREGATE__' without FK violation
- **2026-03-07 (06-01):** Recharts v3 Tooltip formatter typed as any with eslint-disable — Formatter<T,N> generic causes TS incompatibility with undefined union in some Recharts v3 versions
- **2026-03-07 (06-01):** Period summaries computed client-side from existing ledger data — no new API needed, data already fetched via useSWR on capital account page

- **2026-03-07 (07-01):** Resend SDK used for email; Twilio uses raw fetch/Basic auth — no Twilio SDK needed (same pattern as QBO in Phase 5)
- **2026-03-07 (07-01):** All email/SMS delivery is fire-and-forget with try/catch logging — notification failure never blocks status change
- **2026-03-07 (07-01):** investorId -> userId resolved via InvestorUserAccess table (first record) — Investor model has no direct User FK
- **2026-03-07 (07-01):** GP team gets in-app only notifications for capital activity — email would be redundant since they initiated the action
- **2026-03-07 (07-01):** Notifications API type filter validates against VALID_TYPES set before casting to Prisma NotificationType enum — prevents invalid enum errors
- **2026-03-08 (07-06):** Asana/Notion/GCal are firm-level IntegrationConnection (entityId=null); Plaid is per-entity (real entityId) — mirrors QBO per-entity pattern
- **2026-03-08 (07-06):** Missing env vars for integrations: connect routes return 503, UI buttons disabled with amber warning (graceful degradation)
- **2026-03-08 (07-06):** Plaid uses official SDK for Link Token (required by Plaid API); Asana/Notion/GCal use raw fetch (consistent with QBO provider pattern)
- **2026-03-08 (07-06):** Task model has no firmId — scoped to firm via entity relation chain (firm -> entities -> tasks via entityId)
- **2026-03-08 (07-06):** Sync routes return counts not full data — bidirectional import is UI-driven for user control, not auto-created in Atlas
- **2026-03-08 (08-01):** AUTH_USER_SELECT extended with entityAccess and accessExpiresAt — cascades automatically to all getAuthUser() callers; no migration needed (fields already in schema)
- **2026-03-08 (08-01):** SERVICE_PROVIDER entity-scope filter replaces firmId where clause on capital-calls/distributions list routes — entity.id filter is more restrictive and correct
- **2026-03-08 (08-01):** SERVICE_PROVIDER accessExpiresAt check on entities routes: expired access returns 403 before entity query executes
- **2026-03-08 (08-02):** markAllRead in notification-bell passes userId as path segment to PATCH /api/notifications/[id] — secondary IDOR noted, deferred (the [id] route treats MARK_ALL_READ with the id as userId for updateMany)
- **2026-03-08 (08-02):** K-1 auth guard placed before try/catch — ensures unauthenticated requests return 401 not 500; authUser still accessible inside try via closure
- **2026-03-08 (08-02):** documents/route.ts GET: firmId now prefers authUser.firmId over query param when authenticated — consistent with all other list routes
- **2026-03-08 (09-01):** perInvestorAdjustments are informational only — base managementFee/carriedInterest on FeeCalculation unchanged; side letter adjustments stored in details JSON and response
- **2026-03-08 (09-01):** Side letter integration failure wrapped in try/catch — base fee result always returned even if side letter DB query fails (non-fatal)
- **2026-03-08 (09-01):** Digest check placed after in-app notification creation — DAILY/WEEKLY_DIGEST investors receive in-app bell notification but no immediate email/SMS
- **2026-03-08 (09-01):** Full batch digest processor (cron job) is out of scope — this plan ensures skip of immediate dispatch; digest emails are a future enhancement

## Session Continuity
- **Initialized:** 2026-03-05
- **Last session:** 2026-03-08T07:56:46.547Z
- **Stopped at:** Completed 09-02-PLAN.md -- Plaid balance card on entity detail, waterfall test fix, typed deal interfaces in DD and Overview tabs
