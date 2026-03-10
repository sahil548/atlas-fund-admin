# Phase 16: Capital Activity - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

GPs can advance capital calls and distributions through their full status lifecycle via UI buttons, see which investors have paid, attach documents, and run waterfall scenarios without committing them. Additionally, assets get transaction ledgers (income, expenses, valuations) that feed into real IRR/MOIC computation at both asset and entity level — making financial metrics meaningful instead of placeholder values. The "Transactions" page is renamed to "Capital Activity."

</domain>

<decisions>
## Implementation Decisions

### Page Structure & Navigation
- Rename "Transactions" page to "Capital Activity" — keep existing 3-tab structure (Capital Calls, Distributions, Waterfall Templates)
- Enhance the list page: add overdue stat card, improve status badges, make rows clickable
- Add dedicated detail pages: `/transactions/capital-calls/[id]` and `/transactions/distributions/[id]`
- List rows show per-investor funded/pending count badge (e.g., "3/5 funded")

### Asset-Level Transaction Ledgers (Expanded Scope)
- Each asset gets a transaction ledger tracking income, expenses, and valuations
- Categorized tabs on asset detail page: Income tab, Expenses tab (each with entry form and running totals)
- Transaction entry: date, type (income/expense), category (rental, interest, dividend, management fee, etc.), amount, description
- Auto-recalculate asset IRR and MOIC on every transaction save
- Income from assets auto-aggregates at the entity level in real time
- Period-based breakdown view also available for entity-level reporting (monthly/quarterly, which assets contributed what)
- LP positions in external funds are just another asset — same transaction treatment, income flows up to entity

### Entity-Level Financial Metrics
- Dual metric view on entity detail page:
  - **Realized returns** from capital flows (calls/distributions) — TVPI, DPI, RVPI, Net IRR
  - **Unrealized returns** from current asset valuations — Gross IRR, portfolio MOIC
- Financial summary card on entity detail page: Total Called, Total Distributed, Unrealized Value (NAV), Gross IRR, Net IRR, TVPI, DPI, RVPI
- Metrics computed from real transaction data, not seeded/placeholder values

### Status Advancement UX
- Confirmation dialog before sending investor notifications when marking capital call as ISSUED ("This will notify X investors. Proceed?")
- Enforce full lifecycle for distributions: DRAFT → APPROVED → PAID (no skipping approval)
- Individual per-investor "Mark Funded" on capital call detail page — when all investors fund, call auto-advances to FUNDED
- Fix existing ALLOWED_TRANSITIONS map in API to include missing FUNDED transition paths

### Claude's Discretion (Status Buttons)
- Whether to show single next-step button or all valid transitions — Claude determines based on entity status transition pattern from Phase 15

### Overdue & Per-Investor Visibility
- Red "OVERDUE" badge + subtle red-tinted row background in the Capital Activity list
- Visual-only detection: computed on page load (dueDate < now && status not FUNDED) — no DB write, no background job
- Overdue stat card added to top of Capital Activity page alongside existing stat cards
- Per-investor capital call status shown as line items table on capital call detail page: investor name, amount owed, status (Funded/Pending), paid date

### Document Attachment
- Both upload new files AND link existing entity documents on capital call and distribution detail pages
- Reuse Vercel Blob upload pattern + existing Document model
- Add nullable FKs on Document model: capitalCallId, distributionEventId (schema change)
- Any file type accepted
- LPs can see attached documents in their portal (not GP-only)

### Waterfall Preview
- Preview available in both locations: waterfall template page ("Run Scenario" button) AND during distribution creation (preview step before committing)
- Full tier-by-tier breakdown showing each waterfall tier's computation (hurdle, catch-up, carry split) + per-investor detail
- Side-by-side comparison: GP can run 2-3 scenarios with different amounts and compare in columns
- Preview calculates without saving — results are transient (not persisted as WaterfallCalculation)
- Include a chart (Recharts) showing LP vs GP split alongside the numbers

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **CapitalCallStatus enum**: DRAFT, ISSUED, FUNDED, PARTIALLY_FUNDED, OVERDUE — already in schema
- **DistributionStatus enum**: DRAFT, APPROVED, PAID — already in schema
- **CapitalCallLineItem model**: Per-investor tracking with status ("Pending"/"Funded") and paidDate
- **IncomeEvent model**: Exists in schema with assetId, entityId, incomeType, amount — partially wired
- **PATCH /api/capital-calls/[id]**: Status transition validation with ALLOWED_TRANSITIONS map — needs FUNDED paths added
- **notifyInvestorsOnCapitalCall()**: Fire-and-forget notification wired for ISSUED transition
- **computeWaterfall()** (`src/lib/computations/waterfall.ts`): Tier-by-tier distribution engine — needs transient "preview mode"
- **computeMetrics()** (`src/lib/computations/metrics.ts`): TVPI, DPI, RVPI, MOIC computation
- **xirr()** (`src/lib/computations/irr.ts`): Newton-Raphson XIRR, production-ready
- **computeCapitalAccount()** (`src/lib/computations/capital-accounts.ts`): Roll-forward engine
- **Document model**: Vercel Blob integration — needs capitalCallId/distributionEventId FKs
- **Transactions page** (`src/app/(gp)/transactions/page.tsx`): Three-tab interface, stat cards, filters, export
- **CC_STATUS_COLORS / DIST_STATUS_COLORS**: Color maps for all statuses
- **PageHeader, SectionPanel, Badge, StatCard**: Shared UI components
- **Recharts 3**: Used throughout Atlas for charts
- **ConfirmDialog**: Shared component for important actions

### Established Patterns
- **Detail page pattern**: Deals, entities, assets use `/[module]/[id]/page.tsx` with breadcrumbs
- **Status transition pattern**: Phase 15 entity transitions use StatusTransitionDialog with validTransitions map
- **Fire-and-forget**: Used for notifications, audit logging, NAV snapshots
- **SWR data fetching**: Client-side with firmId scoping, revalidate on mutations
- **Vercel Blob upload**: Used across multiple upload points
- **Auto-recompute pattern**: Capital accounts auto-compute on transaction events (Phase 3 decision)

### Integration Points
- **Transactions page → detail pages**: Row click navigates to new detail pages
- **Line item PATCH → capital call auto-advance**: When last line item marked Funded → update call to FUNDED
- **Asset transaction save → metric recompute**: New chain for IRR/MOIC recalculation
- **Asset income → entity rollup**: Auto-aggregate income events at entity level
- **Document upload → capital call/distribution**: New FK relation on Document model
- **Waterfall calculate → preview mode**: Add `preview: true` param to skip persistence
- **Distribution creation → waterfall preview**: Wire form to calculate endpoint with preview flag
- **LP portal → attached documents**: Surface documents linked to capital calls/distributions

</code_context>

<specifics>
## Specific Ideas

- The user emphasizes that asset and entity level metrics (IRR, MOIC, TVPI, etc.) must come from real transaction data — "otherwise that shit still means nothing"
- Income flows from asset → entity → investor allocations (waterfall/partnership allocations); each level needs its own ledger view
- LP positions in external funds are just another asset type — same transaction treatment
- The user envisions eventually bringing full GL-style accounting in-house, but for now income + expenses + valuations is the right scope
- Dual metric view (realized vs unrealized) is essential — the GP needs to see both perspectives
- Per-investor "Mark Funded" with auto-advancement handles partial funding naturally
- Notification confirmation should show investor count before sending
- Side-by-side waterfall scenario comparison for what-if analysis before committing distributions

</specifics>

<deferred>
## Deferred Ideas

- **GL-style double-entry accounting** — User wants to bring accounting in-house eventually with full debits/credits. Captures the vision but deferred as too complex for this phase.
- **IRS 704(b) partnership special income allocations** — Complex tax allocation rules. Relevant but beyond current scope.
- **Commitment overview dashboard** — Cross-entity unfunded commitment view. Deferred from Phase 3.
- **Capital readiness checks at deal close** — Deferred from Phase 2.

</deferred>

---

*Phase: 16-capital-activity*
*Context gathered: 2026-03-09*
