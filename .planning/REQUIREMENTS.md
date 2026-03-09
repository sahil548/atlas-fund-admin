# Requirements: Atlas v2.0

**Defined:** 2026-03-08
**Core Value:** GP team manages full deal-to-asset lifecycle and fund/LP metrics in one place

## v2.0 Requirements

Requirements for v2.0 Module Deep Pass. Each maps to roadmap phases.

### Foundation — Shared Components & Patterns

- [x] **FOUND-01**: All list pages show actionable empty states with CTAs (not blank white space)
- [x] **FOUND-02**: All data tables show skeleton loading states instead of "Loading..." text
- [x] **FOUND-03**: All destructive actions use ConfirmDialog component (no browser confirm() dialogs)
- [x] **FOUND-04**: Shared PageHeader component standardizes title + subtitle pattern across all pages
- [x] **FOUND-05**: Shared SectionPanel component standardizes card wrapper pattern across all pages
- [x] **FOUND-06**: Consistent date formatting (date-fns) across all pages
- [x] **FOUND-07**: Consistent number/currency formatting across all pages
- [x] **FOUND-08**: Dark mode parity — all new and modified components have dark: variants

### Deal Desk — Pipeline Completeness

- [x] **DEAL-11**: Kanban cards show days-in-stage metric
- [x] **DEAL-12**: Kanban columns show stage totals (deal count + aggregate deal value)
- [x] **DEAL-13**: Closed deal page shows "View Asset" navigation link to the created asset
- [x] **DEAL-14**: IC memo can be exported as PDF
- [x] **DEAL-15**: Dead deal reasons surfaced in pipeline analytics
- [x] **DEAL-16**: GP can perform bulk deal status actions (e.g., kill multiple deals)

### Asset Management — Holding Type Completion

- [ ] **ASSET-04**: GP can record asset exit (exit date, exit proceeds, final MOIC) and mark asset as EXITED
- [ ] **ASSET-05**: Asset detail pages show context-appropriate controls based on holding type (LP positions vs direct assets vs co-investments)
- [x] **ASSET-06**: Asset list supports column sorting
- [x] **ASSET-07**: Covenant breach monitor shows portfolio-level view across all assets
- [x] **ASSET-08**: Lease expiry forward view shows expirations in 90/180 day windows
- [ ] **ASSET-09**: Valuation history chart displays on asset detail page

### Entity Management — Structure & Navigation

- [x] **ENTITY-01**: Entity list shows parent-child hierarchy (fund → SPV → sidecar relationships)
- [ ] **ENTITY-02**: Formation workflow provides "what's next" guidance after completion
- [x] **ENTITY-03**: Regulatory filings tab has structured add/edit form (not empty shell)
- [x] **ENTITY-04**: GP can transition entity status (ACTIVE → WINDING_DOWN → DISSOLVED)
- [x] **ENTITY-05**: Side letter management wiring verified end-to-end

### Capital Activity — Workflow Completion

- [ ] **CAP-01**: GP can advance capital call status via UI buttons (DRAFT → ISSUED → FUNDED)
- [ ] **CAP-02**: GP can advance distribution status via UI buttons (DRAFT → APPROVED → PAID)
- [ ] **CAP-03**: Overdue capital calls show visual indicator in capital activity views
- [ ] **CAP-04**: GP can attach documents to capital calls
- [ ] **CAP-05**: Waterfall can be previewed (calculate without saving) for scenario analysis
- [ ] **CAP-06**: Per-investor capital call status visible at a glance

### LP Portal — Accuracy & Access

- [ ] **LP-04**: Capital account statement has period/date range picker
- [ ] **LP-05**: Document center has category filter (K-1s, financial statements, notices)
- [ ] **LP-06**: LP portal metrics verified as computed from real data (not seeded values)
- [ ] **LP-07**: LP can view per-entity performance breakdown (fund-by-fund IRR/TVPI)
- [ ] **LP-08**: K-1 acknowledgment receipt workflow
- [ ] **LP-09**: LP can view and verify their contact information

### Dashboard — Intelligence Surface

- [ ] **DASH-01**: Dashboard shows deal pipeline summary (deals by stage, aggregate value)
- [ ] **DASH-02**: Dashboard shows "needs attention" alerts (overdue calls, covenant breaches, lease expirations)
- [ ] **DASH-03**: Activity feed can be filtered by entity and type
- [ ] **DASH-04**: Entity cards have quick-action buttons (view entity, create capital call, etc.)

### AI & Command Bar

- [ ] **AI-01**: Command bar supports natural language queries ("show me all deals over $10M", "what's our total NAV")
- [ ] **AI-02**: Command bar supports action execution (create deal, log note, assign task, trigger report) without navigation
- [ ] **AI-03**: AI can auto-extract deal terms from uploaded CIMs/documents
- [ ] **AI-04**: AI can generate DD summary reports from workstream data
- [ ] **AI-05**: AI can draft IC memos from deal data and DD findings
- [ ] **AI-06**: AI monitors portfolio for covenant breaches and generates alerts
- [ ] **AI-07**: AI drafts LP update communications from fund performance data
- [ ] **AI-08**: AI suggests next tasks based on deal stage and asset type context

### Document Intake Engine

- [x] **DOC-01**: Site-wide document upload extracts structured data via AI (CIMs, lease agreements, credit docs, K-1s)
- [x] **DOC-02**: Extracted data auto-tagged and linked to relevant deal, asset, or entity
- [x] **DOC-03**: Document processing status visible (processing, complete, failed) with extracted fields preview

### AI Configuration & Access

- [x] **AICONF-01**: GP_ADMIN can set tenant-wide default LLM API key in Settings
- [x] **AICONF-02**: GP_ADMIN can toggle AI access per user (enable/disable AI features per team member)
- [x] **AICONF-03**: Users with AI access enabled can set their own API key override in profile settings
- [x] **AICONF-04**: AI features check user key first, fall back to tenant key, show "No API key configured" if neither exists
- [x] **AICONF-05**: Service providers have AI access disabled by default

### Directory / CRM

- [x] **CRM-01**: Contact detail page shows activity timeline (meetings, deals, communications)
- [x] **CRM-02**: Contacts have interaction history log (calls, emails, meetings)
- [x] **CRM-03**: Contacts can be tagged with relationship types (broker, co-investor, LP prospect, advisor)
- [x] **CRM-04**: Contact pages show all linked deals, entities, and assets
- [x] **CRM-05**: Deal sourcing tracked — who referred what deal, broker relationships
- [x] **CRM-06**: Co-investor network tracked with deal participation history

### Task Management

- [ ] **TASK-01**: Tasks linked to their context (deal, asset, entity, fundraising) with navigation back to source
- [ ] **TASK-02**: Tasks can be created from within deal, asset, and entity detail pages
- [ ] **TASK-03**: Tasks have drag-and-drop reordering and status changes
- [ ] **TASK-04**: Tasks filterable by context (show me all tasks for Fund III, all tasks for Deal X)
- [ ] **TASK-05**: Tasks auto-created from deal stage transitions (e.g., moving to DD creates DD tasks)

### Meeting Intelligence

- [x] **MTG-01**: Fireflies integration via per-user OAuth — each GP team member connects their own Fireflies account
- [ ] **MTG-02**: Meeting summaries auto-generated from transcripts via AI
- [x] **MTG-03**: Action items auto-extracted from meetings and created as linked tasks
- [ ] **MTG-04**: Meetings linked to deal/entity context and surfaced in activity feeds
- [x] **MTG-05**: Aggregated meeting view across all connected team members' Fireflies accounts

### Supporting Modules — Reports, Accounting, Settings

- [ ] **SUPP-01**: Report preview available before download
- [ ] **SUPP-02**: Unified integrations status page shows all integrations with connection status
- [ ] **SUPP-03**: GP notification preferences configurable
- [ ] **SUPP-04**: Report history tracked per entity per period
- [ ] **SUPP-05**: AI config has test connection button
- [ ] **SUPP-06**: Settings confirm dialogs migrated from browser confirm() to ConfirmDialog

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Accounting

- **ACCT-06**: Real QBO OAuth connection flow (high complexity, deferred)
- **ACCT-07**: Xero OAuth implementation

### Reports

- **REPORT-06**: Distribution notice PDF generation
- **REPORT-07**: Bulk report generation at quarter-end
- **REPORT-08**: Report delivery to LP email list

### Integrations

- **INTEG-07**: Bi-directional Asana task sync (full two-way)
- **INTEG-08**: AI quarterly narrative draft

### Advanced

- **ADV-01**: Fundraising pipeline end-to-end workflow
- **ADV-02**: MCP server exposure for external AI tool access

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native mobile app | PWA later, native much later |
| SOC 2 compliance | Build toward it, not yet |
| Multi-currency support | USD only for current scale |
| Secondary market transactions | Not a current use case |
| Automated wire initiation | Regulatory complexity |
| White-labeling / custom branding | Not needed for single family office |
| Automated K-1 generation | Upload only — generation is CPA's job |
| Public market portfolio tracking | Out of domain |
| Real-time chat/messaging | Overkill for 3-person GP team |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 11 | Complete |
| FOUND-02 | Phase 11 | Complete |
| FOUND-03 | Phase 11 | Complete |
| FOUND-04 | Phase 11 | Complete |
| FOUND-05 | Phase 11 | Complete |
| FOUND-06 | Phase 11 | Complete |
| FOUND-07 | Phase 11 | Complete |
| FOUND-08 | Phase 11 | Complete |
| AICONF-01 | Phase 12 | Complete |
| AICONF-02 | Phase 12 | Complete |
| AICONF-03 | Phase 12 | Complete |
| AICONF-04 | Phase 12 | Complete |
| AICONF-05 | Phase 12 | Complete |
| DOC-01 | Phase 12 | Complete |
| DOC-02 | Phase 12 | Complete |
| DOC-03 | Phase 12 | Complete |
| DEAL-11 | Phase 13 | Complete |
| DEAL-12 | Phase 13 | Complete |
| DEAL-13 | Phase 13 | Complete |
| DEAL-14 | Phase 13 | Complete |
| DEAL-15 | Phase 13 | Complete |
| DEAL-16 | Phase 13 | Complete |
| CRM-01 | Phase 13 | Complete |
| CRM-02 | Phase 13 | Complete |
| CRM-03 | Phase 13 | Complete |
| CRM-04 | Phase 13 | Complete |
| CRM-05 | Phase 13 | Complete |
| CRM-06 | Phase 13 | Complete |
| ASSET-04 | Phase 14 | Pending |
| ASSET-05 | Phase 14 | Pending |
| ASSET-06 | Phase 14 | Complete |
| ASSET-07 | Phase 14 | Complete |
| ASSET-08 | Phase 14 | Complete |
| ASSET-09 | Phase 14 | Pending |
| TASK-01 | Phase 14 | Pending |
| TASK-02 | Phase 14 | Pending |
| TASK-03 | Phase 14 | Pending |
| TASK-04 | Phase 14 | Pending |
| TASK-05 | Phase 14 | Pending |
| ENTITY-01 | Phase 15 | Complete |
| ENTITY-02 | Phase 15 | Pending |
| ENTITY-03 | Phase 15 | Complete |
| ENTITY-04 | Phase 15 | Complete |
| ENTITY-05 | Phase 15 | Complete |
| MTG-01 | Phase 15 | Complete |
| MTG-02 | Phase 15 | Pending |
| MTG-03 | Phase 15 | Complete |
| MTG-04 | Phase 15 | Pending |
| MTG-05 | Phase 15 | Complete |
| CAP-01 | Phase 16 | Pending |
| CAP-02 | Phase 16 | Pending |
| CAP-03 | Phase 16 | Pending |
| CAP-04 | Phase 16 | Pending |
| CAP-05 | Phase 16 | Pending |
| CAP-06 | Phase 16 | Pending |
| LP-04 | Phase 17 | Pending |
| LP-05 | Phase 17 | Pending |
| LP-06 | Phase 17 | Pending |
| LP-07 | Phase 17 | Pending |
| LP-08 | Phase 17 | Pending |
| LP-09 | Phase 17 | Pending |
| AI-01 | Phase 18 | Pending |
| AI-02 | Phase 18 | Pending |
| AI-03 | Phase 18 | Pending |
| AI-04 | Phase 18 | Pending |
| AI-05 | Phase 18 | Pending |
| AI-06 | Phase 18 | Pending |
| AI-07 | Phase 18 | Pending |
| AI-08 | Phase 18 | Pending |
| DASH-01 | Phase 19 | Pending |
| DASH-02 | Phase 19 | Pending |
| DASH-03 | Phase 19 | Pending |
| DASH-04 | Phase 19 | Pending |
| SUPP-01 | Phase 19 | Pending |
| SUPP-02 | Phase 19 | Pending |
| SUPP-03 | Phase 19 | Pending |
| SUPP-04 | Phase 19 | Pending |
| SUPP-05 | Phase 19 | Pending |
| SUPP-06 | Phase 19 | Pending |

**Coverage:**
- v2.0 requirements: 79 total (8 FOUND + 6 DEAL + 6 ASSET + 5 ENTITY + 6 CAP + 6 LP + 4 DASH + 8 AI + 3 DOC + 5 AICONF + 6 CRM + 5 TASK + 5 MTG + 6 SUPP)
- Mapped to phases: 79
- Unmapped: 0 ✓

**Note:** REQUIREMENTS.md header listed 73 requirements. Actual count from requirement IDs is 79. The discrepancy of 6 is confirmed by listing all IDs — 79 is the correct count.

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-08 — traceability filled after roadmap creation*
