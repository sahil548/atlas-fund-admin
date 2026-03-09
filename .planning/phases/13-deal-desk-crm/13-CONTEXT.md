# Phase 13: Deal Desk & CRM - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Pipeline completeness (days-in-stage on kanban cards, column value totals, IC memo PDF export, dead deal analytics by kill reason, bulk deal status actions) and contact/relationship intelligence (contact detail page with activity timeline, interaction history logging, relationship tags, deal sourcing attribution, co-investor network tracking with deal participation history).

Requirements: DEAL-11, DEAL-12, DEAL-13, DEAL-14, DEAL-15, DEAL-16, CRM-01, CRM-02, CRM-03, CRM-04, CRM-05, CRM-06

</domain>

<decisions>
## Implementation Decisions

### Contact Detail Page
- Header + tabbed sections layout (like deal detail page pattern)
- Header card shows: name, title, company (linked), email, phone, contact type badge, relationship tags as badges, quick stats (deal count, entity count, last interaction date), initials avatar
- Separate pages for contacts (/contacts/[id]) and companies (/companies/[id]) — company page already exists, keep it separate
- Row click anywhere in directory table navigates to contact detail page
- Tabs for content sections (Activity, Deals, Entities, etc.) — exact tab structure at Claude's discretion

### Interaction & Activity Tracking
- Manual logging + auto-linked deal events — both sources feed the timeline
- Manual interaction types: Calls, Emails, Meetings, Notes
- Auto-linked events on timeline: deal stage changes, deal creation/close, meeting records (for deals/entities this contact is linked to)
- Single unified chronological timeline, filterable by type
- Inline quick form at top of timeline for logging (type selector, notes, optional deal/entity link) — same pattern as deal activity "Log Meeting/Call"
- Deal/entity linking is optional when logging an interaction
- Every interaction shows who logged it (GP team member initials avatar + timestamp)
- Interactions are editable and deletable after logging

### Deal Sourcing Attribution
- Structured contact-linked sourcing: add `sourcedByContactId` field on Deal linking to a Contact
- Keep existing free-text `source` field alongside for gradual migration — new deals use contact link, old deals keep their text, both display on deal page
- Source type remains (Referral, Broker, Direct, Network, etc.)
- Source contact dropdown on deal creation shows all contacts (no tag filtering)
- Contact detail page has a "Deals Sourced" section showing all deals this contact referred

### Co-Investor Network
- Co-investors tracked per deal via a junction model (DealCoInvestor or similar)
- Each co-investor record captures: contact or company link, role (Lead, Participant, Syndicate Member), allocation amount, status (Interested, Committed, Funded, Passed)
- Deal detail page gets a "Co-Investors" section
- Contact detail page has a separate "Co-Investments" section (distinct from "Deals Sourced")
- No network visualization — simple table/list of deals with participant info

### Relationship Tags
- Predefined core tags: Broker, Co-Investor, LP (current), LP Prospect, Advisor, Board Member, Service Provider
- GP can create custom tags beyond the predefined list
- Tags displayed as badges on the contact header card
- Deal-specific roles (Sponsor, Counterparty, Lender, Legal Counsel) are separate from relationship tags — they live on the deal-contact link, not on the contact itself

### Pipeline Enhancements — Kanban
- DEAL-11: Each kanban card shows days-in-stage counter (computed from DealActivity stage change records or createdAt fallback)
- DEAL-12: Column headers show deal count AND aggregate deal value per stage
- DEAL-13: Closed deal detail page shows "View Asset" link in the closed-deal banner (requires including sourceAssets relation in deal detail API)

### IC Memo PDF Export
- DEAL-14: Clean professional document format — deal name header, recommendation badge, executive summary, then each memo section
- Styled for printing/sharing with external parties — similar to existing quarterly report PDF template style
- Uses existing @react-pdf/renderer infrastructure

### Dead Deal Analytics
- DEAL-15: Kill reason breakdown chart added to existing /analytics page
- Mini summary (top 3 kill reasons) also shown in pipeline stats area on /deals page
- Groups dead deals by killReason field — shows count per reason

### Bulk Deal Actions
- DEAL-16: Three bulk actions available: bulk kill, bulk assign deal lead, bulk stage advance
- Checkbox per kanban card — floating action bar appears at bottom when 1+ cards selected
- Bulk kill prompts for shared kill reason
- Bulk assign shows GP team member picker
- Bulk stage advance moves all selected to next stage (validates all are in same stage)

### Claude's Discretion
- Contact detail page tab names and exact tab structure
- Exact layout/spacing of contact header card
- Timeline item visual design and grouping (by day? continuous?)
- IC memo PDF typography, margins, header/footer design
- Dead deal analytics chart type (bar, pie, donut)
- Floating action bar visual design and positioning
- Empty state designs for contact pages with no interactions/deals
- How to handle days-in-stage when no DealActivity record exists (fallback logic)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Kanban board** (`src/app/(gp)/deals/page.tsx`): Fully functional 4-column board with drag-drop. Needs days-in-stage on cards and value totals on column headers.
- **Deal activity tab** (`src/components/features/deals/deal-activity-tab.tsx`): Has "Log Meeting/Call/Event" inline form pattern — reuse for contact interaction logging.
- **Kill deal modal** (`src/components/features/deals/kill-deal-modal.tsx`): Structured kill reason capture. Extend for bulk kill.
- **Company detail page** (`src/app/(gp)/companies/[id]/page.tsx`): Existing detail page pattern with header + stats + contacts table. Contact detail page follows similar structure.
- **Directory page** (`src/app/(gp)/directory/page.tsx`): 5-tab table view. Contact names need to become clickable links.
- **PDF infrastructure** (`src/lib/pdf/`): quarterly-report.tsx, capital-account-statement.tsx, fund-summary.tsx as templates. @react-pdf/renderer installed. IC memo PDF follows same pattern.
- **Analytics page** (`src/app/(gp)/analytics/page.tsx`): Has pipeline charts. Add dead deal breakdown chart.
- **Pipeline analytics API** (`src/app/api/analytics/pipeline/route.ts`): Computes time-in-stage from DealActivity records.

### Established Patterns
- **SWR data fetching**: All pages fetch via useSWR with firmId scoping
- **Zod validation**: API routes use parseBody(req, Schema)
- **Toast notifications**: useToast() (never destructure)
- **Activity logging**: DealActivity model records stage transitions — same pattern for ContactInteraction
- **Pagination**: Cursor-based with parsePaginationParams/buildPrismaArgs/buildPaginatedResult
- **File upload**: FormData → Vercel Blob → document record

### Integration Points
- **Deal → Contact sourcing**: Deal.sourcedByContactId (new field) links to Contact. Deal creation wizard gets source contact dropdown.
- **Deal → Co-investors**: DealCoInvestor junction model linking Deal to Contact/Company with role, allocation, status.
- **Contact → Deals/Entities**: Contact detail page aggregates across DealCoInvestor, Deal.sourcedByContactId, and any deal/entity activity involving the contact.
- **Contact → Interactions**: New ContactInteraction model for manual logging. Auto-linked events pulled from DealActivity where contact is involved.
- **Contact → Tags**: New ContactTag model or JSON field for relationship tags (core + custom).

</code_context>

<specifics>
## Specific Ideas

- Contact detail page follows the deal detail page pattern (header card + tabs)
- Interaction timeline should feel like a CRM activity feed — not just a log table
- IC memo PDF should be professional enough to share with external parties (co-investors, advisors)
- Bulk actions use the Gmail/Notion pattern: checkboxes appear, floating bar at bottom with actions
- "Deals Sourced" and "Co-Investments" are explicitly separate sections on the contact page — different relationship types

</specifics>

<deferred>
## Deferred Ideas

- Network graph visualization for co-investor relationships — decided against for now, use simple tables
- Fireflies auto-import of meetings to contact timeline — Phase 15 (Meeting Intelligence)
- AI-powered relationship insights or deal sourcing suggestions — Phase 18 (AI Features)
- Contact search/filtering beyond directory table — not discussed, potential future enhancement

</deferred>

---

*Phase: 13-deal-desk-crm*
*Context gathered: 2026-03-08*
