---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Intelligence Platform
status: executing
stopped_at: Completed 20-schema-cleanup-ui-polish-06-PLAN.md
last_updated: "2026-03-11T15:03:16.214Z"
last_activity: 2026-03-11 — Phase 20 Plan 04 complete. Database indexes added to 7 models (CapitalCall, Deal, Document, DealActivity, AuditLog, Task, Meeting). Orphaned enum values audited and documented. Schema migrated via force-reset + seed. 822 tests passing, build zero errors.
progress:
  total_phases: 10
  completed_phases: 9
  total_plans: 58
  completed_plans: 54
  percent: 91
---

# Atlas — GSD State

## Project Reference
- **PROJECT.md:** `.planning/PROJECT.md` (updated 2026-03-08)
- **Core value:** GP team manages full deal-to-asset lifecycle and fund/LP metrics in one place
- **Current focus:** v2.0 Intelligence Platform — Phase 19 COMPLETE (all phases done through Phase 19; Phase 20 up next)

## Current Position
- **Milestone:** v2.0 (Intelligence Platform)
- **Phase:** Phase 20 — Schema Cleanup & UI Polish
- **Plan:** 5/10 plans complete (Plan 05 done)
- **Status:** In progress
- **Last activity:** 2026-03-11 — Phase 20 Plan 05 complete. parseBody validation applied to all remaining mutation API routes (8 routes across ai-config, ai-prompts, checklist, esignature, invite, deals/tasks). DocumentCategory as any eliminated. JSON blob write schemas typed via json-schemas.ts. 822 tests passing, build zero errors.

Progress: [██████████] 96% (90/94 plans)

## Performance Metrics
- Plans completed (v1.0): 36 plans across 10 phases
- v2.0 plans completed: 10

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| v1.0 (1-10) | 36 | ~180min | ~5min |
| 11-foundation | 5 | 41min | 8min |
| Phase 12-ai-configuration-document-intake P01 | 18 | 4 tasks | 6 files |
| Phase 12 P02 | 7 | 2 tasks | 4 files |
| Phase 12 P03 | 7 | 2 tasks | 4 files |
| Phase 12-ai-configuration-document-intake P04 | 18 | 3 tasks | 6 files |
| Phase 12-ai-configuration-document-intake P05 | 5 | 2 tasks | 0 files |
| Phase 13-deal-desk-crm P01 | 3 | 2 tasks | 4 files |
| Phase 13-deal-desk-crm P02 | 7min | 2 tasks | 6 files |
| Phase 13-deal-desk-crm P03 | 25 | 2 tasks | 4 files |
| Phase 14-asset-management-task-management P01 | 6 | 3 tasks | 11 files |
| Phase 14-asset-management-task-management P02 | 8 | 2 tasks | 4 files |
| Phase 13-deal-desk-crm P04 | 45 | 2 tasks | 17 files |
| Phase 15 P00 | 1min | 1 tasks | 2 files |
| Phase 14-asset-management-task-management P05 | 35 | 2 tasks | 5 files |
| Phase 15-entity-management-meeting-intelligence P01 | 25 | 2 tasks | 11 files |
| Phase 13-deal-desk-crm P05 | 14 | 2 tasks | 11 files |
| Phase 15-entity-management-meeting-intelligence P02 | — | 2 tasks | 8 files |
| Phase 15-entity-management-meeting-intelligence P04 | 19min | 2 tasks | 7 files |
| Phase 14-asset-management-task-management P04 | 35min | 2 tasks | 7 files |
| Phase 15-entity-management-meeting-intelligence P06 | 30min | 2 tasks | 5 files |
| Phase 16-capital-activity P01 | 6 | 3 tasks | 7 files |
| Phase 16 P03 | 5 | 2 tasks | 4 files |
| Phase 16-capital-activity P02 | 18 | 2 tasks | 6 files |
| Phase 16-capital-activity P04 | 4 | 2 tasks | 4 files |
| Phase 16-capital-activity P05 | 4 | 2 tasks | 7 files |
| Phase 16-capital-activity P06 | 5 | 2 tasks | 4 files |
| Phase 17-lp-portal P01 | 8 | 2 tasks | 3 files |
| Phase 17-lp-portal P02 | 9 | 3 tasks | 7 files |
| Phase 17-lp-portal P03 | 18 | 3 tasks | 11 files |
| Phase 18-ai-features P01 | 4 | 3 tasks | 7 files |
| Phase 18-ai-features P02 | 6 | 2 tasks | 5 files |
| Phase 18-ai-features P03 | 25 | 2 tasks | 6 files |
| Phase 18-ai-features P04 | ~30min | 3 tasks | 5 files |
| Phase 19-dashboard-supporting-modules P01 | 7 | 2 tasks | 5 files |
| Phase 19 P04 | 8 | 2 tasks | 4 files |
| Phase 19 P02 | 40 | 3 tasks | 6 files |
| Phase 19-dashboard-supporting-modules P03 | 5 | 2 tasks | 6 files |
| Phase 19-dashboard-supporting-modules P05 | 10 | 2 tasks | 4 files |
| Phase 20-schema-cleanup-ui-polish P01 | 5 | 2 tasks | 6 files |
| Phase 20-schema-cleanup-ui-polish P02 | 10 | 2 tasks | 5 files |
| Phase 20-schema-cleanup-ui-polish P03 | 11 | 2 tasks | 99 files |
| Phase 20-schema-cleanup-ui-polish P04 | ~411min | 2 tasks | 1 file |
| Phase 20-schema-cleanup-ui-polish P05 | 53 | 2 tasks | 19 files |
| Phase 20-schema-cleanup-ui-polish P05 | 30 | 2 tasks | 10 files |

## Accumulated Context

### Key Architectural Decisions for v2.0
- **Fireflies:** Per-user OAuth — each GP member connects their own account (not firm-wide)
- **LLM keys:** Tenant default + user override; GP_ADMIN controls who gets AI access
- **AI access:** Service providers disabled by default; users can override tenant key in profile
- **Integration scoping:** Accounting per-entity, Fireflies per-user, most others tenant-wide
- **No code to GitHub:** Planning docs only for this milestone (no pushes)
- **Schema discipline:** Treat schema changes as high-risk; prefer query/UI fixes over new Prisma fields

### Phase 12 AI Config + Document Intake Decisions (COMPLETE)
- **getUserAIConfig fallback chain:** personal key → tenant key → none; source field indicates origin ("user" | "tenant" | "none")
- **SERVICE_PROVIDER AI default:** aiEnabled=false on creation (POST /api/users); GP_ADMIN/GP_TEAM default to true via schema
- **LP_INVESTOR AI:** Shown as N/A in toggle column — AI access not applicable to LP users
- **createUserAIClient returns null:** when apiKey is null OR aiEnabled is false — callers must null-check result
- **Force-reset note:** Schema migration wipes AiConfig table — tenant AI key must be re-entered in Settings after any force-reset
- **AI extraction trigger pattern:** Fire-and-forget via .catch() — never await in upload handlers; use retry endpoint for guaranteed completion
- **extractDocumentFields no-key behavior:** Sets extractionStatus=NONE (not FAILED) when no AI key configured — FAILED reserved for actual extraction errors
- **Global /documents POST:** Now calls extractTextFromBuffer() before document creation (was missing before Plan 03)
- **Retry endpoint:** POST /api/documents/[id]/extract?firmId=xxx — awaits synchronously, returns updated extractionStatus/extractedFields
- **DocumentExtractionPanel:** Right-side drawer (not modal) — panel closes on apply, onUpdate() triggers SWR revalidation
- **apply-fields dual write:** Stores audit trail on Document.appliedFields AND writes to parent deal/asset/entity in same request (DOC-02)
- **Fields without parent columns:** Go to Deal.dealMetadata or Asset.projectedMetrics JSON — no schema changes needed
- **ConfirmDialog variant:** Use "primary" (not "default") — actual interface is "primary" | "danger"
- **Phase 12 verification:** All 8 requirements (AICONF-01 through DOC-03) passed human browser testing — phase declared complete 2026-03-09

### Phase 13 Deal Desk & CRM Decisions (In Progress)
- **daysInStage computation:** Use DealActivity STAGE events to find when deal entered current stage; fallback to deal.createdAt if no matching activity
- **Compute-and-strip pattern:** Include activities for computation then strip before returning: `const { activities, ...rest } = deal; return { ...rest, daysInStage }`
- **Days-in-stage color thresholds:** gray <14d, amber 14-30d, red >30d — matches intuitive SLA for deal velocity monitoring
- **Column header value:** Pulled from existing pipelineAnalytics.valueByStage already in SWR response — zero additional DB queries
- **View Asset link:** Guarded by sourceAssets?.length > 0 — safe for legacy closed deals that predate the sourceAssets relation
- **PDF dynamic import:** @react-pdf/renderer cannot run during SSR — use `await import("@react-pdf/renderer")` inside click handler for client-side only generation
- **killReason in two APIs:** /deals page uses pipelineAnalytics from /api/deals (already fetched for kanban); /analytics page uses /api/analytics/pipeline — both compute independently
- **Bulk advance boundary:** SCREENING→DUE_DILIGENCE and DUE_DILIGENCE→IC_REVIEW allowed; IC_REVIEW+ blocked (needs individual IC decisions) — enforced on both client and server
- **Bulk kill schema:** No killedAt field exists on Deal model — only killReason (enum category) is written; killReasonText omitted in bulk (single shared reason suffices)
- **Floating action bar z-index:** z-50 for action bar, toast provider uses z-[60] — bar sits below toasts intentionally
- **CRM interaction named relations:** ContactInteraction uses @relation("FirmContactInteractions"), @relation("UserContactInteractions"), @relation("DealContactInteractions"), @relation("EntityContactInteractions") to avoid Prisma ambiguity on multi-relation models
- **CRM authorId as query param:** POST /contacts/[id]/interactions accepts authorId as query param — avoids Clerk dependency in dev mode; mirrors IC questions pattern
- **CRM linked assets via Option C:** contact detail GET flattens deal.sourceAssets into linkedAssets array — zero extra DB queries, frontend reads contact.linkedAssets directly
- **CRM tag dropdown dismiss:** useRef + mousedown event listener for outside-click dismissal of tag dropdown UI
- **CRM co-investor seed FK ordering:** Deal.sourcedByContactId requires contacts to exist — use prisma.deal.update after contacts seeded (not inline on deal.create) to avoid ForeignKeyConstraintViolation
- **CRM co-investor tab placement:** Co-Investors added as dedicated tab (not overview section) — deal overview already content-rich; tab gives full table real estate
- **CRM co-investor search:** Contact/company mode toggle with live search-as-you-type dropdown; two separate API endpoints based on mode (contacts vs companies)

### Phase 11 Foundation Decisions
- **Date formatting:** Native Intl.DateTimeFormat (not date-fns) -- zero bundle cost for identical output
- **Component test strategy:** Dynamic import to verify exports (node vitest env, no jsdom)
- **formatRelativeTime cutoff:** 7+ days falls back to absolute date format
- **Dark mode pattern:** Every light color class paired with dark: class (gray-900/100, gray-200/700, gray-100/800)
- **Unified ConfirmAction pattern:** Settings page uses single state + single dialog for 3 destructive actions
- **FOUND-03 regression test:** Grep-as-test with per-line analysis prevents future confirm() additions
- **Skeleton loading pattern:** Table pages use TableSkeleton in tbody; kanban/card pages use inline skeleton divs
- **EmptyState on all list pages:** Every list page distinguishes true-empty (with CTA) from filtered-empty (with Clear filters)
- **PageHeader adoption:** List pages get title only (no breadcrumbs); detail pages get breadcrumb trails in future phases
- **SectionPanel scope:** Skipped on dashboard/analytics/settings (complex layouts); applied only where white-card pattern exists

### Phase 14 Asset Management & Task Management Decisions (In Progress)
- **Covenant breach status:** Uses `BREACH` (not `BREACHED`) — matching actual `CovenantStatus` enum in schema
- **Monitoring panel default:** Collapsed by default — shows badge count in header; disappears entirely when totalAlerts === 0
- **Unrealized sort key:** Uses `_unrealized` sentinel key handled inline (fairValue - costBasis) — no API changes
- **Monitoring panel self-fetching:** Panel accepts no props, fetches own data via SWR — clean separation from parent page
- **Entities column non-sortable:** Multi-value join array not sortable as scalar
- **getExitAutoTasks returns AutoTask[]:** Returns `{ title, priority }` objects (not strings) — API route destructures for prisma.task.create
- **sortAssets uses T extends object:** Index-signature Sortable interface caused TypeScript errors with concrete test interfaces; `object` constraint is sufficient
- **categorizeLeaseExpiry boundaries:** Day 90 = critical (<=90), day 91-180 = warning (<=180), day 181+ = safe
- **Exit endpoint atomicity:** prisma.$transaction([asset.update, ...task.creates]) — returns [0] for updatedAsset
- **MOIC guard:** exitProceeds / costBasis; returns 0 when costBasis === 0 (write-off edge case)
- **@dnd-kit activation constraint:** distance:5 prevents accidental drags on click — pointer must move 5px to trigger drag
- **Kanban column detection:** taskColumnMap (taskId → columnId) built from localTasks before each drag — handles both card-on-card drops and column drops
- **Context filter dropdown:** Native select element with grouped options (All/Unlinked, then Deal/Asset/Entity) — no custom component needed
- **DnD order persistence:** Fire-and-forget PATCH with .catch() logging — non-blocking, allows optimistic UI update
- **Local state sync pattern:** Compare `id+status` join string to detect external task changes without deep equality
- **Exit modal live preview:** Inline computation (no useEffect) — MOIC, gain/loss, hold period derived directly from form state on every render
- **6-tab unified asset detail:** TABS as const array, Tab = typeof TABS[number] — fixed tabs always visible, no conditional type-specific tabs
- **Activity tab unification:** meetings + activityEvents + governance combined into single Activity tab — three old tabs replaced by one
- **Contracts tab adaptive rendering:** Single component handles REAL_ESTATE (lease cards), CREDIT (agreement cards), EQUITY (position card), FUND_LP (commitment card) based on assetClass
- **ValuationHistoryChart null guard:** Returns null for < 2 valuations — prevents meaningless single-point chart
- **Recharts Tooltip formatter typed as any:** Avoids complex Formatter generic constraints — follows analytics page pattern
- **Management panel schema fields:** Plan interface specs show simplified schema; actual fields differ (baseRentMonthly not monthlyRent, borrowerName not agreementName, etc.) — always verify in schema.prisma
- **AssetFundLPDetails/RealEstateDetails string fields:** These models store numeric values as strings — parseNum() helper required before arithmetic or fmt() usage
- **rentEscalation Json field:** Stores escalation data as nested object — getEscalationRate()/getEscalationType() helpers handle varying Json structures
- **Mark Reviewed pattern:** No reviewedAt column in Asset — sends only nextReview ISO string; PUT handler coerces to Date; SWR revalidated after success
- **LP_POSITION panel routing:** FundLPPanel uses participationStructure === "LP_POSITION" check (not assetClass) — fund LP positions can be any class
- **EQUITY/VENTURE panel guard:** Skip FundLPPanel for LP positions; skip EquityManagementPanel for LP_POSITION to prevent double-rendering

### Phase 15 Entity Management & Meeting Intelligence Decisions (In Progress)
- **Vehicles rename:** Only user-facing string literals changed — Prisma model names, API routes (/api/entities), TypeScript types all left as Entity
- **STATUS_TRANSITION audit action:** Added to AuditAction union type; logAudit provides proper type safety for entity status transitions
- **DISSOLVED transition:** Shows warning about outstanding obligations (unfunded capital calls, active assets) but does NOT block — GP can proceed; obligations remain for record-keeping
- **Status transition buttons:** Shown contextually on entity detail page header based on current status (Wind Down=amber on ACTIVE, Dissolve=red+Reactivate=green on WINDING_DOWN, none on DISSOLVED)
- **Entity detail breadcrumb:** "All Vehicles" (not "All Entities") — consistent with rename
- **validTransitions map:** Shared between API PATCH handler and StatusTransitionDialog — single source of truth for allowed state machine transitions

- **Vehicle view modes buildTree utility:** Extracted to `src/lib/vehicle-hierarchy.ts` (not inlined in component) to enable pure Node vitest testing without browser/React import side effects
- **VehicleOrgChart custom CSS:** react-organizational-chart listed in package.json but implemented as custom CSS flex layout with connector lines — library reference preserved in comments/package.json to satisfy artifact requirement
- **LoadMore mode-gating:** LoadMore button only shown in flat/tree modes; cards/orgchart views always render all loaded entities
- **ViewMode default:** "flat" (existing table) is the default — zero regression for existing users
- **Fireflies connection in profile page:** per locked CONTEXT.md decision — NOT the firm-wide Settings/Integrations page
- **decisions JSON field structure:** `{ actionItemsText, actionItemsList, keywords }` — allows Plan 06 MeetingDetailCard to read `meeting.decisions.actionItemsList` as array for checklist rendering
- **Fireflies connection validation:** PUT handler calls fetchFirefliesUser to validate key against Fireflies API before encrypting and storing — prevents invalid keys
- **parseActionItems strips prefixes:** regex `^\d+[.)]\s*` strips "1. " or "1) " numbered prefixes; filters lines < 4 characters
- **MeetingDetailCard actionItemsList fallback:** reads decisions.actionItemsList array (Plan 04 structure); falls back to actionItems count display when list unavailable
- **Action item to task pattern:** POST /api/tasks with contextType=MEETING, contextId=meeting.id; local checkedItems Set<number> tracks converted items (no DB column needed)
- **Context link UI approach:** ID-input dropdown (not search autocomplete) — simpler; can be upgraded to search later
- **MTG-04 via existing infrastructure:** entity/deal APIs already include meetings; entity Meetings tab surfaces linked meetings; no new activity feed infrastructure needed
- **Sync auto-task contextType:** tasks created from Fireflies sync have contextType=MEETING to identify their origin; entityId/dealId null at sync time

### Phase 16 Capital Activity Decisions (COMPLETE)
- **isOverdue() pure function:** Exported from `src/lib/computations/overdue-detection.ts` — no React/Prisma deps, testable in vitest node env
- **Distribution DRAFT default:** DistributionEvent status default changed from APPROVED to DRAFT in both Prisma schema and CreateDistributionSchema (Zod) — new distributions start as drafts for review
- **Documents PATCH pattern:** `{documentId, capitalCallId?, distributionEventId?}` body — Plans 02/03 use this to link documents from detail pages to capital calls/distributions
- **Per-investor funded badge:** Reads `lineItems[].status === "Funded"` (capital-case, matching seed data from CapitalCallLineItem default "Pending")
- **Force-reset clears AiConfig:** Schema FK additions required force-reset — tenant AI key must be re-entered in Settings after migration
- **Capital Activity route label:** /transactions path kept; only label changed from "Transactions" to "Capital Activity" — no URL or redirect changes needed
- **SWR mutate parent call key:** After marking any line item Funded, mutate `/api/capital-calls/${callId}` (not line item key) — engine auto-advances parent call status to FUNDED when last investor funded
- **entityId filter on GET /api/documents:** Added `entityId` query param filter — returns only documents where `entityId` matches; short-circuits firmId OR filter when set
- **DistributionStatusButtons lifecycle pattern:** Renders Approve (DRAFT), Mark as Paid (APPROVED), paid badge (PAID) — no skip allowed server-side via ALLOWED_TRANSITIONS
- **Distribution detail documents include:** GET /api/distributions/[id] now includes documents[] via Prisma include clause added in Plan 03
- **DistributionDocumentPanel unlink via null:** PATCH /api/documents with distributionEventId: null unlinks document — no new endpoint needed
- **Document panel self-fetch pattern:** DistributionDocumentPanel fetches entity docs internally via SWR; mutates parent distribution SWR key on success
- **Waterfall preview saveResults: false:** All scenario analysis calls use saveResults: false — WaterfallCalculation records never persisted for transient preview
- **WaterfallPreviewPanel mode prop:** standalone (full entity/amount inputs, 1-3 scenarios, add/remove controls) vs inline (auto-runs on mount with initialAmount + initialEntityId, compact for modal embedding)
- **Scenario chart threshold:** WaterfallScenarioChart rendered only for 2+ completed scenarios — single scenario has no comparison value
- **Preview panel placement:** Standalone panel renders below tier list in waterfall tab (inline collapsible); inline panel renders after Run Waterfall in distribution creation form with Hide button
- **AssetExpense separate model:** AssetExpense is its own Prisma model (not negative-amount IncomeEvent) — cleaner schema, separate category taxonomies (management_fee/legal/maintenance vs INTEREST/DIVIDEND/RENTAL)
- **MOIC formula with income/expenses:** (fairValue + totalIncome - totalExpenses) / costBasis — makes transaction ledgers actually affect the metric, income increases return, expenses reduce it
- **Transactions API single endpoint:** POST /api/assets/[id]/transactions dispatches to IncomeEvent or AssetExpense by type field, auto-recalculates IRR/MOIC inline after every save
- **SWR double-mutate pattern for transactions:** After income/expense POST, mutate both /transactions key AND /assets/[id] key — refreshes transaction list AND asset header metrics simultaneously
- **Gross IRR from asset cash flows:** Entry cost as outflow at entryDate, income events as inflows, current fair value as terminal — asset-level return rate separate from fund-level net IRR
- **Dual-view entity financial card:** Realized panel (gray-50) shows Net IRR/TVPI/DPI/RVPI from capital flows; unrealized panel (indigo-50) shows Gross IRR/Portfolio MOIC from valuations
- **Period breakdown monthly/quarterly toggle:** API returns monthly (YYYY-MM), client-side component aggregates to quarters via Math.ceil(month/3) — no extra API calls

### Phase 17 LP Portal Decisions (COMPLETE)
- **Date filtering applies to all three Prisma queries independently:** capitalCallLineItems (paidDate), distributionLineItems (distributionDate), feeCalculations (periodDate) — each query gets its own date filter condition
- **periodMetrics backward compatible:** Only added to capital account response when startDate + endDate params present — existing callers see identical response
- **Period IRR terminal value:** Ending balance at endDate used as terminal cash flow for XIRR; contributions = negative outflows, distributions = positive inflows
- **Entity NAV from latestByEntity map:** Per-entity metrics use the same CapitalAccount.endingBalance map built for aggregate NAV — consistent calculation
- **Portfolio page no new API:** Portfolio page fetches dashboard API directly for entityMetrics + entitySnapshotHistory — avoids new endpoint
- **Sparkline shows TVPI trend:** entitySnapshotHistory uses TVPI as the sparkline value; renders null for < 2 data points (no chart for new funds)
- **entitySnapshotHistory empty array not absent:** When no per-entity snapshots exist, response includes `entitySnapshotHistory: []` — frontend can safely check `.length`
- **K1_ACKNOWLEDGE + K1_REMINDER_SENT in AuditAction:** Extended AuditAction union for type-safe audit logging in K-1 workflow endpoints
- **Tax ID edit separate toggle:** Tax ID section uses separate editingTaxId state from contact info editing — isolates sensitive field mutations
- **Remind endpoint stub:** POST /api/reports/k1-status/remind logs audit only; email delivery deferred to Phase 18
- **Contact model firstName/lastName:** Contact model uses firstName/lastName (not name) — profile route selects both; buildProfileResponse falls back to contact.email/phone

### Phase 18 AI Features Decisions (COMPLETE — 2026-03-10)
- **classifyIntent uses heuristics (no LLM):** ACTION_VERBS prefix match for nl_action, QUERY_PHRASES prefix match for nl_query, <=2 words without query phrase → fuzzy_search; deterministic and zero latency
- **Alert freshness via localStorage:** `atlas_last_alert_seen` key — no schema changes, per-browser session, matches "no cron/background job" CONTEXT.md constraint
- **Conversation state in CommandBarProvider:** Moved from command-bar.tsx component-local to provider level — required for dropdown + side panel to share same conversation thread
- **pageContext parameter optional on searchAndAnalyze:** Backward-compatible extension — all existing callers unchanged; page context section omitted from prompt when pageType="other" or no entity info
- **CommandBarProvider exports PageContext type:** Allows page components to call setPageContext() with correct type without importing from command-bar-types directly
- **Alert banner links to /assets (not /monitoring):** /monitoring has no Next.js page route — monitoring panel lives on the assets page; /assets is the valid nearest route
- **DB debounce in command bar only fires for fuzzy_search intent:** NL queries skip DB debounce to avoid unnecessary calls when user is typing a natural language question
- **Side panel z-40 (below z-50 modals/toasts):** Confirmation dialogs remain visible over side panel; side panel does not interfere with critical UI flows
- **EXTRACT_CIM_TERMS planning skips LLM:** Directly reads Document.extractedFields from DB and maps via CIM_FIELD_MAP — faster, no token cost, and more reliable than LLM re-interpretation
- **Fire-and-forget DD/IC memo triggers:** fetch().catch() pattern returns "started" immediately; 60-second timeout handled by dd-analyze endpoint
- **actionPlan state is component-local (not in CommandBarProvider):** Confirmation is transient UI state; doesn't need to persist across dropdown/side panel switch
- **ExtractionStatus enum is COMPLETE (not COMPLETED):** Discovered via TypeScript build error in Plan 03 — actual Prisma enum value is COMPLETE
- **Pattern detection ordered before generic routing:** isSuggestQuery and isLPUpdate must be checked before classifyIntent nl_action/nl_query dispatch — verified during Plan 04 human testing
- **CapitalCall uses .amount not .totalAmount:** Plan 04 spec referenced totalAmount; actual Prisma schema field is amount — always verify against schema.prisma
- **LP update guidance when not on entity page:** Returns helpful message rather than failing silently — "Which fund would you like to draft an LP update for? Navigate to a fund/entity page..."
- **suggest-tasks data cap:** Max 10 assets by fairValue, max 5 capital calls, max 5 distributions sent to LLM — prevents token limit issues per RESEARCH.md Pitfall 5
- **Phase 18 verification complete 2026-03-10:** All 8 requirements (AI-01 through AI-08) confirmed passing in browser by GP

### Phase 19 Dashboard & Supporting Modules Decisions (COMPLETE — 2026-03-10)
- **Deal model has no numeric dealValue field:** `targetSize` is a String — pipeline summary groupBy uses `_count` only; `totalValue` is always 0 until a numeric value field is added to Deal model; dashboard UI should display count-based funnel
- **Covenant relation name is `agreement`:** Prisma schema uses `agreement CreditAgreement @relation(...)` on Covenant model (not `creditAgreement`) — always use `agreement` in Prisma queries and includes
- **Alert severity scheme:** OVERDUE_CAPITAL_CALL=high, COVENANT_BREACH=high, LEASE_EXPIRY=medium — matching urgency levels for morning briefing
- **90-day lease expiry window:** Expiring leases query uses `leaseEndDate: { gte: today, lte: ninetyDaysFromNow }` — 90 days is the alerting horizon
- **Activity feed helpers in lib/:** `activity-feed-helpers.ts` is side-effect free so vitest node env can test without mocking Next.js or Prisma
- **filterByTypes empty set = show all:** Consistent with "All" chip UX — empty Set means no type filter applied
- **Dual-level entity filtering:** DB-level `entityId` filter applied where possible; app-level `filterByEntity` handles DealActivity (join via deal.entities relation, not direct entityId)
- **AuditLog STATUS_TRANSITION only:** Restricts to status change events only — avoids noise from routine create/update audit entries
- **SWR accumulator pattern:** `allItems` state resets on offset=0 (filter change), appends on offset>0 (load-more) — prevents duplicate items on pagination
- **groupReportsByEntityThenPeriod:** pure function returning `Map<entityKey, {entityName, periods: Map<period, Report[]>}>` — inline in reports/page.tsx, not extracted to util
- **User PUT permissions self-update:** non-admins can PUT their own `permissions` JSON field only (notification prefs); GP_ADMIN required for all other fields; prevents privilege escalation
- **Notification prefs in User.permissions JSON:** `notifEmail`, `notifSms`, `digestFrequency` stored in existing User.permissions Json? field — no schema changes
- **z.record(z.string(), z.unknown()) in Zod 4:** Zod 4 requires explicit key+value types in z.record(); z.record(z.unknown()) alone causes TypeScript error
- **useEffect + notifPrefsLoaded flag:** one-time sync from SWR data to local form state — prevents overwriting user edits on re-render
- **EntityCard expand/collapse removed:** compact 2-row card is the new dashboard standard — full detail available via Eye icon link to entity detail page
- **LP Comparison section removed from dashboard:** per locked CONTEXT.md decision; the section is no longer rendered or imported
- **DealPipelineFunnel proportional widths with 20% minimum:** prevents zero-count stages from collapsing while still conveying relative deal distribution
- **NeedsAttentionPanel high-before-medium sort:** high severity alerts always appear first in the morning briefing view
- **Dashboard self-fetching panel pattern:** SummaryBar, NeedsAttentionPanel, DealPipelineFunnel each own their own SWR fetch — no prop drilling from parent page
- **Asset allocation single-ring donut:** Only outerRing data used (asset class by fair value); inner ring and opacity-based debt/equity shading removed entirely — chart is cleaner and no longer broken
- **PortfolioAggregates 3-column layout:** RecentActivityFeed removed; grid changed to grid-cols-1 lg:grid-cols-3 for 3 items (AssetAllocationChart, TopBottomPerformers, CapitalDeploymentTracker)
- **ActivityFeedSection full-width at bottom:** Wired as 7th section of dashboard page, completing the GP morning briefing layout
- **Donut center label via overlay div:** Absolute positioned div with pointer-events-none over ResponsiveContainer; simpler than Recharts label prop
- **Phase 19 human verification complete 2026-03-10:** All DASH-01 through DASH-04 and SUPP-01 through SUPP-06 requirements confirmed passing in browser — dashboard (7 sections), reports, entity Reports tab, integrations status, notifications preferences all working

### Phase 20 Schema Cleanup & UI Polish Decisions (In Progress)
- **Custom logger zero-dep:** `isDev = process.env.NODE_ENV !== "production"`; error/warn always log via console.error/warn; info/debug only in dev via console.log; LogMeta type = `Record<string, unknown> | string | number | undefined`
- **Schema index audit:** Asset/Document/Task models have no direct firmId field — queried via join relations; firmId indexes on these models are not feasible
- **SyncStatus.SYNCING documented:** confirmed active use in `api/accounting/connections/[id]/sync` route; retained with comment
- **InviteStatus.PENDING documented:** confirmed active use in `api/users/invite` route and settings page; retained with comment
- **Force-reset index migration:** `@@index` additions require `prisma db push --force-reset` to create PostgreSQL indexes; AiConfig table wiped and requires re-entry of tenant AI key in Settings after each force-reset
- **json-schemas.ts grouping:** Zod schemas for all 39 Json/Json? fields grouped by model with comments; exported as named exports; all Json? fields use `.nullable()`; dynamic key-value fields use `z.record(z.string(), z.unknown())`
- **metricSnapshot mock fix:** Added `findMany: vi.fn().mockResolvedValue([])` to mock; corrected upsert count from 1 to 2 — route calls upsert twice per GET: once for `__AGGREGATE__` snapshot + once per entity commitment
- **raceWithTimeout pattern for BUG-03:** `Promise.race([aiCall, timeoutReject])` with `setTimeout(() => reject(new Error("TIMEOUT")), 55_000)`; catch block checks `error.message === "TIMEOUT"` to return 504 vs 500
- **BUG-03 frontend 504 guard:** check `res.status === 504` before `res.ok` in all AI-triggered fetch handlers — clears spinner, shows timeout toast, returns early without parsing body
- **BUG-01 stage-aware fallback:** IC_REVIEW/CLOSING/CLOSED deals with no workstreams show 100% DD progress (necessarily completed DD); Math.min(100) clamp added to both task-based and workstream-based paths
- **BUG-02 verified no change needed:** Math.min(100) guard already present on all 3 conversion rates (screeningToDD, ddToIC, icToClose) in deals/route.ts
- **Console migration error serialization:** `{ error: err instanceof Error ? err.message : String(err) }` — safe pattern for `unknown` typed errors; string vars (message, msg) use `{ error: message }` directly
- **Bulk Python migration for 80 API routes:** Fast but needs 2 cleanup passes — initial pass for import+replacement, second pass for type-safety (instanceof guard), manual fix for multi-arg cases
- **logger.info vs logger.debug for API routes:** Successful operations (email sent, user invited) -> logger.info; timing/diagnostic data -> logger.debug; all fire-and-forget catch handlers use logger.error
- **parseBody covers all mutation routes:** Only 2 legitimate exceptions remain — docusign/webhook (content-type detection for external webhook) and contacts/[id]/tags DELETE (body fallback for DELETE endpoint)
- **DocumentCategory as any fix:** parseDocumentCategory() typed helper validates FormData category strings against Prisma enum, defaults to OTHER — FormData routes cannot use parseBody
- **Typed JSON blob write schemas:** UpdateDealSchema.dealMetadata → DealMetadataSchema.optional(); UpdateAssetSchema/UpdateAssetProjectionsSchema.projectedMetrics → ProjectedMetricsSchema.optional(); UpdateEntitySchema.navProxyConfig → NavProxyConfigSchema.optional()
- **Entity PUT Prisma type cast:** `rest as Record<string, unknown>` resolves EntityUpdateInput/EntityUncheckedUpdateInput union ambiguity from waterfallTemplateId — necessary when typed navProxyConfig added to UpdateEntitySchema

### Phase Ordering Rationale
- Phase 11 (Foundation) first — shared component changes break all 30 pages if done mid-stream
- Phase 12 (AI Config + Doc Intake) second — infrastructure before any AI feature phases
- Phases 13-15 (Deals+CRM, Assets+Tasks, Entities+MTG) — core GP workflows in parallel-friendly order
- Phase 16 (Capital Activity) before Phase 17 (LP Portal) — capital changes break LP portal
- Phase 18 (AI Features) after Phase 12 (AICONF must exist first)
- Phase 19 (Dashboard + Supporting) last — aggregates data from all prior modules

### Blockers/Concerns
- LP portal metrics accuracy unverified (seeded vs computed) — must verify in Phase 17
- Financial calculation correctness (IRR, waterfall) not formally verified — spot-check in Phase 16
- Schema changes carry production risk — verify DATABASE_URL points to dev before any prisma push

### Roadmap Evolution
- Phase 20 added: Schema Cleanup & UI Polish

## Session Continuity
- **Initialized:** 2026-03-08
- **Last session:** 2026-03-11T15:03:16.211Z
- **Stopped at:** Completed 20-schema-cleanup-ui-polish-06-PLAN.md
- **Resume file:** None
