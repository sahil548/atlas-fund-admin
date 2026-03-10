# Phase 16: Capital Activity - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

GPs can advance capital calls and distributions through their full status lifecycle via UI buttons, see which investors have paid, attach documents, and run waterfall scenarios without committing them. This phase adds detail pages with workflow controls, overdue detection, document attachment, and waterfall preview — building on the capital activity infrastructure shipped in v1.0 Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Status Advancement UX
- Add dedicated detail pages: `/transactions/capital-calls/[id]` and `/transactions/distributions/[id]`
- Click a row in the Transactions list table to navigate to the detail page
- Single next-step button on each detail page (not all valid transitions) — guided linear workflow
- Capital call buttons: DRAFT shows "Mark as Issued", ISSUED shows "Mark as Funded"
- Distribution buttons: DRAFT shows "Approve", APPROVED shows "Mark as Paid"
- Enforce full lifecycle for distributions: DRAFT → APPROVED → PAID (no skip to PAID)
- When marking capital call as ISSUED, show confirmation dialog: "This will notify X investors. Proceed?" — then fire notifications
- Fix existing ALLOWED_TRANSITIONS map in API to add DRAFT→FUNDED and ISSUED→FUNDED paths (currently missing)

### Overdue & Per-Investor Visibility
- Red "OVERDUE" badge on status column + subtle red-tinted row background in the Transactions list
- Overdue detection on page load: check dueDate < now && status not FUNDED — no background job (fits no-cron constraint)
- Overdue count shown in stat cards at top of Transactions page (e.g., "Overdue: 2")
- Per-investor capital call status shown as line items table on the detail page: investor name, amount owed, status (Funded/Pending), paid date
- Individual "Mark Funded" button per investor line item
- When all investors are funded, the capital call auto-advances to FUNDED status

### Document Attachment
- Upload section on the capital call AND distribution detail pages (drag-and-drop)
- Reuse existing Vercel Blob upload pattern + Document model
- Add capitalCallId and distributionEventId nullable FKs on Document model (schema change)
- Any file type accepted (PDFs, Excel, wire confirmations, receipts)
- Documents are GP-only for now — LP portal document visibility is Phase 17 scope

### Waterfall Preview
- Preview available in two locations: waterfall template page ("Run Scenario" button) AND during distribution creation (preview step before committing)
- Single scenario at a time — no side-by-side comparison
- Preview calculates without saving — results are transient (not persisted as WaterfallCalculation)
- Breakdown shows: summary section (total LP allocation vs GP carry split) + per-investor allocation table
- Include a stacked bar or pie chart (Recharts) showing LP vs GP split for quick visual

### Claude's Discretion
- Detail page layout and section ordering
- Exact status badge color shades and row highlight opacity
- Overdue stat card placement relative to existing stat cards
- Upload dropzone styling and file size limits
- Waterfall preview chart type (stacked bar vs pie) and positioning
- Error state handling for failed uploads or calculations
- Mobile/responsive behavior of detail pages

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **CapitalCallStatus enum**: DRAFT, ISSUED, FUNDED, PARTIALLY_FUNDED, OVERDUE — already in schema
- **DistributionStatus enum**: DRAFT, APPROVED, PAID — already in schema
- **CapitalCallLineItem model**: Per-investor tracking with status ("Pending"/"Funded") and paidDate — ready for per-LP status UI
- **PATCH /api/capital-calls/[id]**: Status transition validation exists (ALLOWED_TRANSITIONS map) — needs FUNDED transition paths added
- **notifyInvestorsOnCapitalCall()**: Fire-and-forget notification already wired for ISSUED transition
- **Transactions page** (`src/app/(gp)/transactions/page.tsx`): Three-tab interface with filters, stat cards, export — add row click navigation
- **CC_STATUS_COLORS / DIST_STATUS_COLORS**: Color maps already defined for all statuses
- **computeWaterfall()** (`src/lib/computations/waterfall.ts`): Tier-by-tier distribution engine — needs "preview mode" (skip save)
- **Document model**: Exists with Vercel Blob integration — needs capitalCallId/distributionEventId FKs
- **PageHeader, SectionPanel, Badge**: Shared UI components for detail page layout
- **Recharts 3**: Already used throughout Atlas for charts
- **StatCard**: Already on Transactions page — add overdue count card

### Established Patterns
- **Detail page pattern**: Deals, entities, assets all use `/[module]/[id]/page.tsx` with breadcrumb nav
- **Status transition pattern**: Entity status transitions use StatusTransitionDialog with validTransitions map (Phase 15)
- **Fire-and-forget notifications**: Used for capital call notifications, audit logging
- **SWR data fetching**: All capital data via useSWR with firmId scoping, revalidate on mutations
- **Document upload**: Vercel Blob upload pattern used across multiple upload points
- **ConfirmDialog**: Shared component for destructive/important actions — use for notification confirmation

### Integration Points
- **Transactions page → detail pages**: Row click navigates to new detail pages
- **Detail page → line items API**: GET /api/capital-calls/[id] already returns lineItems with investor details
- **Line item PATCH → capital call auto-advance**: New chain — when last line item marked Funded, update capital call to FUNDED
- **Document upload → capital call/distribution**: New FK relation on Document model
- **Waterfall calculate → preview mode**: Add `preview: true` param to skip WaterfallCalculation persistence
- **Distribution creation → waterfall preview**: Wire CreateDistributionForm to waterfall calculate endpoint with preview flag

</code_context>

<specifics>
## Specific Ideas

- Per-investor "Mark Funded" with auto-advancement handles partial funding naturally (PARTIALLY_FUNDED → FUNDED)
- Notification confirmation dialog should show the count of investors who will be notified
- Overdue detection should work without any background jobs — purely on page load, consistent with Atlas's no-cron architecture
- Waterfall preview during distribution creation should auto-populate the distribution amounts but allow GP to override (carrying forward Phase 3 decision)

</specifics>

<deferred>
## Deferred Ideas

- LP portal visibility of attached documents — Phase 17 scope
- Side-by-side waterfall scenario comparison — future enhancement if GPs need it
- Commitment overview dashboard — deferred from Phase 3
- Capital readiness checks at deal close — deferred from Phase 2
- Expandable per-investor preview rows in the list view — detail page is sufficient for now

</deferred>

---

*Phase: 16-capital-activity*
*Context gathered: 2026-03-09*
