# Requirements: Atlas v1.1

**Defined:** 2026-03-08
**Core Value:** GP team manages full deal-to-asset lifecycle and fund/LP metrics in one place

## v1.1 Requirements

Requirements for v1.1 Module Deep Pass. Each maps to roadmap phases.

### Foundation — Shared Components & Patterns

- [ ] **FOUND-01**: All list pages show actionable empty states with CTAs (not blank white space)
- [ ] **FOUND-02**: All data tables show skeleton loading states instead of "Loading..." text
- [ ] **FOUND-03**: All destructive actions use ConfirmDialog component (no browser confirm() dialogs)
- [ ] **FOUND-04**: Shared PageHeader component standardizes title + subtitle pattern across all pages
- [ ] **FOUND-05**: Shared SectionPanel component standardizes card wrapper pattern across all pages
- [ ] **FOUND-06**: Consistent date formatting (date-fns) across all pages
- [ ] **FOUND-07**: Consistent number/currency formatting across all pages
- [ ] **FOUND-08**: Dark mode parity — all new and modified components have dark: variants

### Deal Desk — Pipeline Completeness

- [ ] **DEAL-11**: Kanban cards show days-in-stage metric
- [ ] **DEAL-12**: Kanban columns show stage totals (deal count + aggregate deal value)
- [ ] **DEAL-13**: Closed deal page shows "View Asset" navigation link to the created asset
- [ ] **DEAL-14**: IC memo can be exported as PDF
- [ ] **DEAL-15**: Dead deal reasons surfaced in pipeline analytics
- [ ] **DEAL-16**: GP can perform bulk deal status actions (e.g., kill multiple deals)

### Asset Management — Holding Type Completion

- [ ] **ASSET-04**: GP can record asset exit (exit date, exit proceeds, final MOIC) and mark asset as EXITED
- [ ] **ASSET-05**: Asset detail pages show context-appropriate controls based on holding type (LP positions vs direct assets vs co-investments)
- [ ] **ASSET-06**: Asset list supports column sorting
- [ ] **ASSET-07**: Covenant breach monitor shows portfolio-level view across all assets
- [ ] **ASSET-08**: Lease expiry forward view shows expirations in 90/180 day windows
- [ ] **ASSET-09**: Valuation history chart displays on asset detail page

### Entity Management — Structure & Navigation

- [ ] **ENTITY-01**: Entity list shows parent-child hierarchy (fund → SPV → sidecar relationships)
- [ ] **ENTITY-02**: Formation workflow provides "what's next" guidance after completion
- [ ] **ENTITY-03**: Regulatory filings tab has structured add/edit form (not empty shell)
- [ ] **ENTITY-04**: GP can transition entity status (ACTIVE → WINDING_DOWN → DISSOLVED)
- [ ] **ENTITY-05**: Side letter management wiring verified end-to-end

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

- [ ] **DOC-01**: Site-wide document upload extracts structured data via AI (CIMs, lease agreements, credit docs, K-1s)
- [ ] **DOC-02**: Extracted data auto-tagged and linked to relevant deal, asset, or entity
- [ ] **DOC-03**: Document processing status visible (processing, complete, failed) with extracted fields preview

### AI Configuration & Access

- [ ] **AICONF-01**: GP_ADMIN can set tenant-wide default LLM API key in Settings
- [ ] **AICONF-02**: GP_ADMIN can toggle AI access per user (enable/disable AI features per team member)
- [ ] **AICONF-03**: Users with AI access enabled can set their own API key override in profile settings
- [ ] **AICONF-04**: AI features check user key first, fall back to tenant key, show "No API key configured" if neither exists
- [ ] **AICONF-05**: Service providers have AI access disabled by default

### Directory / CRM

- [ ] **CRM-01**: Contact detail page shows activity timeline (meetings, deals, communications)
- [ ] **CRM-02**: Contacts have interaction history log (calls, emails, meetings)
- [ ] **CRM-03**: Contacts can be tagged with relationship types (broker, co-investor, LP prospect, advisor)
- [ ] **CRM-04**: Contact pages show all linked deals, entities, and assets
- [ ] **CRM-05**: Deal sourcing tracked — who referred what deal, broker relationships
- [ ] **CRM-06**: Co-investor network tracked with deal participation history

### Task Management

- [ ] **TASK-01**: Tasks linked to their context (deal, asset, entity, fundraising) with navigation back to source
- [ ] **TASK-02**: Tasks can be created from within deal, asset, and entity detail pages
- [ ] **TASK-03**: Tasks have drag-and-drop reordering and status changes
- [ ] **TASK-04**: Tasks filterable by context (show me all tasks for Fund III, all tasks for Deal X)
- [ ] **TASK-05**: Tasks auto-created from deal stage transitions (e.g., moving to DD creates DD tasks)

### Meeting Intelligence

- [ ] **MTG-01**: Fireflies integration via per-user OAuth — each GP team member connects their own Fireflies account
- [ ] **MTG-02**: Meeting summaries auto-generated from transcripts via AI
- [ ] **MTG-03**: Action items auto-extracted from meetings and created as linked tasks
- [ ] **MTG-04**: Meetings linked to deal/entity context and surfaced in activity feeds
- [ ] **MTG-05**: Aggregated meeting view across all connected team members' Fireflies accounts

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
| — | — | — |

**Coverage:**
- v1.1 requirements: 73 total
- Mapped to phases: 0
- Unmapped: 73 ⚠️

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-08 after initial definition*
