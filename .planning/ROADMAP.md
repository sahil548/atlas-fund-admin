# Atlas — GSD Roadmap

## Milestones

- ✅ **v1.0 GP Production Ready** — Phases 1-10 (shipped 2026-03-08) — [archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v2.0 Intelligence Platform** — Phases 11-20 (in progress)

---

<details>
<summary>✅ v1.0 GP Production Ready (Phases 1-10) — SHIPPED 2026-03-08</summary>

See [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) for full phase details.

Phases 1-10 shipped 2026-03-08. 231 commits, 497 files changed, ~92K LOC TypeScript.

</details>

---

## 🚧 v2.0 Intelligence Platform (In Progress)

**Milestone Goal:** Module-by-module deep pass across all areas of Atlas — filling feature gaps and polishing UI/UX to production quality, with equal weight on functionality and user experience. 79 requirements across 14 categories.

### Phases

- [x] **Phase 11: Foundation** - Shared component standardization that ripples across all 30 pages
- [x] **Phase 12: AI Configuration & Document Intake** - Infrastructure for all AI features: key management, access control, document processing engine
- [x] **Phase 13: Deal Desk & CRM** - Pipeline completeness and contact/relationship intelligence (completed 2026-03-09)
- [ ] **Phase 14: Asset Management & Task Management** - Asset exit workflow, holding type–adaptive UI, and task context linking
- [x] **Phase 15: Entity Management & Meeting Intelligence** - Entity structure clarity and Fireflies per-user OAuth integration (completed 2026-03-10)
- [x] **Phase 16: Capital Activity** - Status advancement workflows, waterfall scenario analysis, asset transaction ledgers, entity financial metrics (completed 2026-03-10)
- [x] **Phase 17: LP Portal** - Accuracy verification and LP self-service access improvements (completed 2026-03-10)
- [x] **Phase 18: AI Features** - Command bar natural language, AI-assisted deal analysis, and portfolio monitoring (completed 2026-03-10)
- [ ] **Phase 19: Dashboard & Supporting Modules** - Aggregated intelligence surface, report polish, and settings cleanup
- [ ] **Phase 20: Schema Cleanup & UI Polish** - Full reconciliation of Phases 11-19, exhaustive schema audit, and UI overhaul — zero accumulated debt, airtight database, $50K SaaS-grade interface

---

## Phase Details

### Phase 11: Foundation
**Goal**: Every page in Atlas uses consistent, production-quality shared components — no blank loading states, no browser confirm() dialogs, no inconsistent date/number formatting
**Depends on**: Phase 10 (v1.0 complete)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, FOUND-08
**Success Criteria** (what must be TRUE):
  1. Every list page (deals, assets, entities, transactions, contacts, tasks) shows an actionable empty state with a CTA button when no records exist — no blank white space
  2. Every major data table shows animated skeleton rows during load instead of "Loading..." text — the page never appears broken on first visit
  3. Every destructive action (delete deal, kill deal, dissolve entity, remove LP) shows a ConfirmDialog with confirmation text — no browser-native confirm() popup appears anywhere in the app
  4. Page titles, subtitles, and section card wrappers look identical across all GP pages — no one-off heading styles or ad-hoc card borders
  5. All dates display consistently (e.g., "Mar 8, 2026") and all currency values display consistently (e.g., "$1.5M") across every page including dark mode
**Plans:** 5/5 plans complete
Plans:
- [x] 11-01-PLAN.md — Create shared components (EmptyState, TableSkeleton, PageHeader, SectionPanel), formatter functions, and Wave 0 tests
- [x] 11-02-PLAN.md — Migrate all 7 browser confirm() calls to ConfirmDialog component
- [x] 11-03-PLAN.md — Add skeleton loading and empty states to all 8 list pages
- [x] 11-04-PLAN.md — Consolidate date and currency formatting across all pages
- [x] 11-05-PLAN.md — Adopt PageHeader/SectionPanel across all GP pages + dark mode verification

### Phase 12: AI Configuration & Document Intake
**Goal**: The tenant has a working AI key infrastructure and a document processing pipeline — admins control who gets AI access, users can set their own keys, and uploaded documents extract structured data automatically
**Depends on**: Phase 11
**Requirements**: AICONF-01, AICONF-02, AICONF-03, AICONF-04, AICONF-05, DOC-01, DOC-02, DOC-03
**Success Criteria** (what must be TRUE):
  1. GP_ADMIN can open Settings and set a tenant-wide default LLM API key, and can toggle AI access on or off per team member — service providers have AI disabled by default
  2. A user with AI access enabled can set their own API key override in their profile, and AI features use their key first, the tenant default key second, and show "No API key configured" only when neither exists
  3. When a user uploads a CIM, lease agreement, credit document, or K-1 to any upload point in the app, the document goes through AI extraction automatically — no manual trigger needed
  4. Extracted fields (deal terms, lease dates, credit covenants, LP tax info) are tagged and linked to the relevant deal, asset, or entity automatically
  5. The GP can see document processing status (processing / complete / failed) and preview the extracted fields before they are applied
**Plans:** 5/5 plans complete
Plans:
- [x] 12-01-PLAN.md — Schema foundation, AI config fallback chain, admin AI toggle
- [x] 12-02-PLAN.md — Profile page with personal AI settings
- [x] 12-03-PLAN.md — Document extraction engine and upload endpoint wiring
- [x] 12-04-PLAN.md — Document status UI and extraction preview side panel
- [x] 12-05-PLAN.md — End-to-end verification checkpoint

### Phase 13: Deal Desk & CRM
**Goal**: The deal pipeline shows complete deal intelligence at a glance and the contact directory tracks relationship context, deal sourcing, and co-investor history
**Depends on**: Phase 11
**Requirements**: DEAL-11, DEAL-12, DEAL-13, DEAL-14, DEAL-15, DEAL-16, CRM-01, CRM-02, CRM-03, CRM-04, CRM-05, CRM-06
**Success Criteria** (what must be TRUE):
  1. Each kanban card shows how many days the deal has been in its current stage, and each column header shows the deal count and aggregate deal value for that stage
  2. A closed deal's detail page has a visible "View Asset" link that navigates directly to the asset created from that deal — no manual searching required
  3. The GP can export the IC memo as a PDF and can perform bulk status actions (e.g., kill multiple dead deals at once) from the pipeline view
  4. Dead deal analytics surface the most common kill reasons so the GP can see patterns in why deals fall through
  5. A contact's detail page shows their full activity timeline, all linked deals/entities/assets, interaction history, relationship tags, deal sourcing attribution, and co-investment participation history
**Plans:** 5/5 plans complete
Plans:
- [ ] 13-01-PLAN.md — Kanban pipeline enhancements (days-in-stage, column totals, View Asset link)
- [ ] 13-02-PLAN.md — IC memo PDF export + dead deal analytics charts
- [ ] 13-03-PLAN.md — Bulk deal actions (checkbox selection, floating action bar, bulk API)
- [ ] 13-04-PLAN.md — CRM foundation (schema, contact detail page, interaction timeline, relationship tags)
- [ ] 13-05-PLAN.md — Deal sourcing attribution + co-investor network tracking

### Phase 14: Asset Management & Task Management
**Goal**: GPs can record asset exits, each asset type shows controls appropriate to its holding structure, and tasks are linked to their source context with drag-and-drop management
**Depends on**: Phase 11
**Requirements**: ASSET-04, ASSET-05, ASSET-06, ASSET-07, ASSET-08, ASSET-09, TASK-01, TASK-02, TASK-03, TASK-04, TASK-05
**Success Criteria** (what must be TRUE):
  1. The GP can record an asset exit by entering exit date and exit proceeds — the asset is marked EXITED, final MOIC is calculated, and the asset is visually distinguished from active holdings
  2. LP position assets show LP-appropriate controls (fund manager contact, distributions received) rather than the same controls shown on direct assets — each holding type renders its own relevant fields
  3. The asset list can be sorted by any column (name, type, NAV, IRR, cost basis) with a single click
  4. A portfolio-level covenant breach monitor shows all breached covenants across all assets in one view, and lease expirations within 90 and 180 days are surfaced in a forward-looking calendar view
  5. Tasks created from within a deal, asset, or entity detail page are linked to that context — the task shows which deal/asset/entity it belongs to and clicking navigates back; tasks auto-created on deal stage transitions appear automatically
**Plans:** 4/7 plans executed
Plans:
- [x] 14-01-PLAN.md — Schema migration (Asset exit/ownership/review fields + TaskChecklistItem model), Wave 0 tests, asset exit API endpoint
- [x] 14-02-PLAN.md — Asset list column sorting + portfolio monitoring panel (covenant breaches, lease expirations, overdue reviews)
- [x] 14-03-PLAN.md — Exit modal UI + asset detail page tab restructure (6 unified tabs, overview sidebar, Stessa-style contracts, valuation chart)
- [x] 14-04-PLAN.md — Holding-type adaptive management panels (RE lease roll, Fund LP GP reporting, Credit covenant dashboard, Equity milestones) + review schedule
- [x] 14-05-PLAN.md — @dnd-kit installation + tasks kanban board + list view drag-and-drop reordering + context filter
- [ ] 14-06-PLAN.md — Task context linking on detail pages + inline quick-add + deal stage auto-task creation
- [ ] 14-07-PLAN.md — Task subtasks (checklist items) + task assignment email notification

### Phase 15: Entity Management & Meeting Intelligence
**Goal**: The entity list shows parent-child fund structure clearly with multiple view modes, formation workflows guide GPs to next steps, the regulatory tab provides CSC-style structured compliance tracking, all user-facing "Entities" labels are renamed to "Vehicles", and each GP team member can connect their own Fireflies account so meeting transcripts flow into Atlas with AI-generated summaries and auto-created tasks
**Depends on**: Phase 11
**Requirements**: ENTITY-01, ENTITY-02, ENTITY-03, ENTITY-04, ENTITY-05, MTG-01, MTG-02, MTG-03, MTG-04, MTG-05
**Success Criteria** (what must be TRUE):
  1. The entity list visually shows the fund → SPV → sidecar hierarchy — child entities are indented or grouped under their parent fund, not shown as a flat list
  2. After completing entity formation, the GP sees a "what's next" checklist — not a dead-end page — with suggested follow-up actions (add investors, configure waterfall, create capital call)
  3. Regulatory filings can be added and edited through a structured form (not an empty shell tab) and entity status can be transitioned (ACTIVE → WINDING_DOWN → DISSOLVED) via UI controls
  4. Each GP team member can connect their own Fireflies account via OAuth — meetings from all connected accounts appear in an aggregated meeting view in Atlas
  5. AI-generated meeting summaries and auto-extracted action items appear on each meeting record, action items are linked as tasks to the relevant deal or entity, and meetings surface in the activity feed for their linked context
**Plans:** 8/8 plans complete
Plans:
- [x] 15-00-PLAN.md — Wave 0 test scaffold (phase15-entity-hierarchy + phase15-fireflies-sync test stubs)
- [x] 15-01-PLAN.md — Schema migration (Fireflies fields on User, externalId on Meeting), "Vehicles" rename sweep, entity status transitions
- [x] 15-02-PLAN.md — Vehicle list 4 view modes (Flat | Tree | Org Chart | Cards) with hierarchy visualization
- [ ] 15-03-PLAN.md — Post-formation "What's Next" checklist + CSC-style structured regulatory filings tab
- [x] 15-04-PLAN.md — Fireflies per-user API key connection, encrypted storage, meeting sync route, profile UI, meetings sync button
- [ ] 15-05-PLAN.md — Side letter management end-to-end verification
- [x] 15-06-PLAN.md — Rich meeting cards with AI summaries, action item task creation, context linking
- [ ] 15-07-PLAN.md — End-to-end verification checkpoint

### Phase 16: Capital Activity
**Goal**: GPs can advance capital calls and distributions through their full status lifecycle via UI buttons, see which investors have paid, attach documents, run waterfall scenarios without committing them, record asset-level income/expenses that feed real IRR/MOIC metrics, and view entity-level financial performance from real transaction data
**Depends on**: Phase 15
**Requirements**: CAP-01, CAP-02, CAP-03, CAP-04, CAP-05, CAP-06
**Success Criteria** (what must be TRUE):
  1. A capital call detail page has explicit "Mark as Issued" and "Mark as Funded" buttons that advance the call through DRAFT → ISSUED → FUNDED — no manual status editing required
  2. A distribution detail page has explicit "Approve" and "Mark as Paid" buttons that advance through DRAFT → APPROVED → PAID
  3. Overdue capital calls (past due date, still not FUNDED) show a visual indicator (red badge or warning) in all capital activity views so the GP can identify them at a glance
  4. The GP can attach supporting documents directly to a capital call (e.g., the call notice PDF)
  5. The waterfall can be previewed — showing the full distribution breakdown per investor — without saving the result, enabling scenario analysis before committing (available on waterfall template page AND during distribution creation)
  6. Per-investor capital call status (funded / outstanding / overdue) is visible at a glance within the capital call detail, not hidden behind navigation
  7. Each asset has Income and Expenses tabs with entry forms, running totals, and auto-recalculated IRR/MOIC on every save
  8. Entity detail page shows a financial summary card with dual metric view (realized vs unrealized) computed from real transaction data
**Plans:** 6/6 plans complete
Plans:
- [ ] 16-01-PLAN.md — Schema migration (Document FKs, Distribution default fix), page rename to Capital Activity, overdue detection + stat card + unit tests, per-investor badge, clickable rows
- [ ] 16-02-PLAN.md — Capital call detail page with status buttons (Mark as Issued), per-investor line items table (Mark Funded), document attachment panel
- [ ] 16-03-PLAN.md — Distribution detail page with status buttons (Approve, Mark as Paid), line items breakdown, document attachment panel
- [ ] 16-04-PLAN.md — Waterfall preview with scenario comparison (up to 3 side-by-side), LP/GP split Recharts chart, no-save preview mode, distribution creation preview step
- [ ] 16-05-PLAN.md — Asset-level transaction ledgers (Income/Expenses tabs on asset detail, transaction API, auto-recalculate IRR/MOIC)
- [ ] 16-06-PLAN.md — Entity financial summary card with dual metric view (realized vs unrealized), period-based income breakdown by asset

### Phase 17: LP Portal
**Goal**: LP portal metrics are verified to come from real computed data, LPs have full self-service access to their statements and documents, and the K-1 acknowledgment workflow is complete
**Depends on**: Phase 16
**Requirements**: LP-04, LP-05, LP-06, LP-07, LP-08, LP-09
**Success Criteria** (what must be TRUE):
  1. The capital account statement has a date range picker — LPs can generate statements for any period, not just the default view
  2. The document center has a category filter (K-1s, financial statements, notices) so LPs can find specific document types without scrolling through everything
  3. LP portal IRR, TVPI, DPI, and RVPI metrics are confirmed to be computed from real capital call and distribution data — not seeded placeholder values
  4. LPs can view per-entity performance (fund-by-fund IRR and TVPI) so they understand their returns from each fund separately
  5. LPs can acknowledge receipt of their K-1 through the portal, and LPs can view and verify their own contact information
**Plans:** 3/3 plans complete
Plans:
- [ ] 17-01-PLAN.md — Schema migration (Document + Investor fields), LP-06 metrics verification tests, document center tab filtering (LP-05)
- [ ] 17-02-PLAN.md — Capital account date range picker with metric recalculation (LP-04), per-entity performance metrics on dashboard + portfolio (LP-07)
- [ ] 17-03-PLAN.md — K-1 acknowledgment workflow with GP tracking (LP-08), LP profile page with contact info management (LP-09)

### Phase 18: AI Features
**Goal**: The command bar understands natural language queries and can execute actions, AI assists with deal analysis and document extraction across the deal lifecycle, and the portfolio is monitored for covenant breaches automatically
**Depends on**: Phase 12
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, AI-08
**Success Criteria** (what must be TRUE):
  1. The GP can type a natural language query into the command bar ("show me all deals over $10M", "what's our total NAV") and get a direct answer or filtered result — no navigation required
  2. The GP can trigger actions from the command bar (create deal, log note, assign task, trigger report) without leaving the current page
  3. AI can extract deal terms from an uploaded CIM and pre-fill deal fields, generate a DD summary from workstream data, and draft an IC memo from deal data and DD findings
  4. AI monitors the portfolio for covenant breaches and generates alerts when a breach is detected — the GP does not need to check manually
  5. AI can draft LP update communications from fund performance data, and AI suggests next tasks based on deal stage and asset type context
**Plans:** 4/4 plans complete
Plans:
- [x] 18-01-PLAN.md — NL intent classification, command bar provider expansion (page context, side panel state, alert freshness), AI service page context injection
- [x] 18-02-PLAN.md — Command bar NL query routing, AI response rendering, side panel pop-out, proactive alert mentions
- [x] 18-03-PLAN.md — AI action execution endpoint, confirmation UX, deal lifecycle AI wiring (DD summary, IC memo, CIM extraction)
- [x] 18-04-PLAN.md — Task suggestions with one-click creation, LP update drafting, end-to-end verification checkpoint

### Phase 19: Dashboard & Supporting Modules
**Goal**: The dashboard is the definitive morning briefing — surfacing pipeline status, alerts, and quick actions from all modules — and supporting modules (reports, settings, integrations) are polished and complete
**Depends on**: Phases 13-18 (aggregates data from all modules)
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, SUPP-01, SUPP-02, SUPP-03, SUPP-04, SUPP-05, SUPP-06
**Success Criteria** (what must be TRUE):
  1. The dashboard shows a deal pipeline summary (deals by stage with aggregate value) and a "needs attention" section (overdue capital calls, covenant breaches, lease expirations within 90 days) -- the GP gets their full situational awareness from the first screen
  2. The activity feed can be filtered by entity and type -- the GP can see all activity for a specific fund without noise from others
  3. Entity cards have quick-action buttons (view entity, create capital call, view report) so common actions take one click from the dashboard
  4. Reports can be previewed before downloading, report history is tracked per entity per period, and GP notification preferences are configurable
  5. A unified integrations status page shows all integrations with their connection status (green/red), and the AI config page has a test connection button that validates the API key works
**Plans:** 2/5 plans executed
Plans:
- [ ] 19-01-PLAN.md -- Dashboard API endpoints (pipeline-summary + alerts) with Wave 0 tests
- [ ] 19-02-PLAN.md -- Supporting modules polish (report preview/history, integrations status, notifications, SUPP-05/06 verification)
- [ ] 19-03-PLAN.md -- Dashboard restructure top half (summary bar, alerts panel, pipeline funnel, compact entity cards)
- [ ] 19-04-PLAN.md -- Activity feed API + full-width filterable activity feed component
- [ ] 19-05-PLAN.md -- Dashboard final assembly (chart redesign, activity feed wiring) + human verification checkpoint


### Phase 20: Schema Cleanup & UI Polish

**Goal:** Exhaustive three-track hardening pass that earns the v2.0 moniker. Track 1 (Integration Audit): Reconcile all changes from Phases 11-19 — find and fix conflicts, regressions, dead code, inconsistencies, and broken cross-module interactions that accumulated across 9 phases of rapid feature development. Track 2 (Schema): Audit every Prisma model, relation, and JSON field — fix broken nested lists, ensure all dynamic content is properly wired, verify relational integrity across the full data model, and eliminate any orphaned or mistyped fields. Track 3 (UI): Systematically review every page and component against best-in-class references (21st.dev, shadcn/ui, Radix primitives, premium dashboard templates) — replace or upgrade components with more professional, cleaner, and visually stronger alternatives. The end state is a codebase with zero accumulated tech debt from v2.0 development, an airtight database, and a UI that looks like a $50K SaaS product.
**Requirements**: INTEG-* (cross-phase integration audit & fixes), SCHEMA-* (schema audit & fixes), UIPOL-* (UI component upgrades) — to be defined during planning
**Depends on:** Phase 19
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 20 to break down)

---

## Progress

**Execution Order:** 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-10. v1.0 Phases | v1.0 | 36/36 | Complete | 2026-03-08 |
| 11. Foundation | v2.0 | Complete    | 2026-03-09 | 2026-03-09 |
| 12. AI Configuration & Document Intake | v2.0 | 5/5 | Complete | 2026-03-09 |
| 13. Deal Desk & CRM | 5/5 | Complete   | 2026-03-09 | - |
| 14. Asset Management & Task Management | 4/7 | In Progress|  | - |
| 15. Entity Management & Meeting Intelligence | 8/8 | Complete   | 2026-03-10 | - |
| 16. Capital Activity | 6/6 | Complete    | 2026-03-10 | - |
| 17. LP Portal | 3/3 | Complete    | 2026-03-10 | - |
| 18. AI Features | v2.0 | 4/4 | Complete | 2026-03-10 |
| 19. Dashboard & Supporting Modules | 2/5 | In Progress|  | - |
