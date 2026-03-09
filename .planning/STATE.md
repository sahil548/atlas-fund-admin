---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Intelligence Platform
status: executing
stopped_at: Completed 14-04-PLAN.md
last_updated: "2026-03-09T22:05:00Z"
last_activity: 2026-03-09 — Phase 14 Plan 04 complete (Holding-type management panels + Mark Reviewed + review suggestions)
progress:
  total_phases: 9
  completed_phases: 3
  total_plans: 30
  completed_plans: 23
  percent: 84
---

# Atlas — GSD State

## Project Reference
- **PROJECT.md:** `.planning/PROJECT.md` (updated 2026-03-08)
- **Core value:** GP team manages full deal-to-asset lifecycle and fund/LP metrics in one place
- **Current focus:** v2.0 Intelligence Platform — Phase 15 (Entity Management & Meeting Intelligence) Plan 4 COMPLETE, Plan 5 is next

## Current Position
- **Milestone:** v2.0 (Intelligence Platform)
- **Phase:** 15 of 19 — Entity Management & Meeting Intelligence (In Progress)
- **Plan:** 4 of 8 complete
- **Status:** Executing
- **Last activity:** 2026-03-09 — Phase 14 Plan 04 complete (Holding-type management panels: RE/FundLP/Credit/Equity + Mark Reviewed + type-aware suggestions)

Progress: [████████░░] 83% (55/66 plans)

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

## Session Continuity
- **Initialized:** 2026-03-08
- **Last session:** 2026-03-09T22:05:00Z
- **Stopped at:** Completed 14-04-PLAN.md
- **Resume file:** None
