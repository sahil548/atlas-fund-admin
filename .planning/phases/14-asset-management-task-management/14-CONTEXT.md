# Phase 14: Asset Management & Task Management - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

GPs can record asset exits, each asset type shows controls appropriate to its holding structure and active management needs, the asset list supports column sorting, a portfolio-level monitoring panel surfaces covenant breaches/lease expirations/loan maturities/overdue reviews, valuation history charts display on asset detail pages, and tasks are linked to their source context with drag-and-drop management and auto-creation from deal stage transitions.

Requirements: ASSET-04, ASSET-05, ASSET-06, ASSET-07, ASSET-08, ASSET-09, TASK-01, TASK-02, TASK-03, TASK-04, TASK-05

</domain>

<decisions>
## Implementation Decisions

### Asset Exit Workflow
- Minimal exit fields: exit date, exit proceeds, optional exit notes
- MOIC auto-calculated from proceeds vs cost basis
- Exit is a deliberate action — modal flow triggered from action menu (similar to close-deal modal), not a casual button
- Exit modal shows live preview of final MOIC, hold period, and gain/loss as GP enters proceeds — catch data entry errors before committing
- After exit, the overview tab shows an exit performance card: entry date → exit date, hold period, total invested, exit proceeds, final MOIC, final IRR (like a deal tombstone)
- Exited assets stay inline in the asset list with dimmed/greyed styling and "EXITED" badge — status filter lets GP show/hide them
- Asset exit auto-creates closing tasks (e.g., "File exit paperwork", "Notify LPs", "Record final distribution") similar to deal stage transition auto-tasks
- Full exits only — no partial exits for this phase
- New schema fields needed: `exitDate`, `exitProceeds`, `exitNotes` on Asset model

### Holding Type-Adaptive UI & Active Management
- Shared tab structure across all asset types (Overview, Contracts, Performance, Documents, Tasks, Activity) with adaptive content inside each tab based on asset type
- Each asset type has its own active management focus:

**Real Estate:**
- Lease & tenant management: lease roll schedule (upcoming expirations), rent escalation timeline, tenant payment status, vacancy tracking — Lease model already has full terms
- Financial performance: NOI tracking, cap rate trends, operating expense breakdown
- Both equally weighted — full operating dashboard per RE asset
- Note: Directly held RE is mostly NNN so tenant management is light — focus on lease expiration tracking and rent escalation schedules over heavy OpEx management

**Fund LP Positions:**
- GP reporting tracker: GP-reported NAV, capital called vs uncalled, distributions received, GP-reported IRR/TVPI, "next report expected" date
- Commitment lifecycle: total commitment, called amount, uncalled/dry powder, distribution history timeline
- Internal valuation vs GP-reported NAV comparison — see if own view differs from GP's
- AssetFundLPDetails model already has gpName, commitment, calledAmount, uncalledAmount, distributions, gpNav, gpIrr, gpTvpi

**Credit/Loans:**
- Payment & covenant tracking: payment schedule with received/missed status, covenant compliance dashboard per agreement, maturity countdown, interest rate reset dates
- CreditAgreement and Covenant models already exist with full fields
- Focus on tracking and compliance, not borrower health metrics

**Equity/Venture:**
- Valuation & milestone tracking: last valuation date, valuation history chart, key milestones (fundraise rounds, revenue targets), board meeting schedule, next review date
- Focus on "when did we last look at this and what's changed?"

### Ownership Stake
- Add `ownershipPercent` field to Asset model — tracks what percentage of the underlying asset the firm owns (e.g., 12% of an operating business, 30% co-invest stake, 100% direct)
- Also track `shareCount` / `unitCount` where applicable (e.g., 500,000 shares of Series B, or 12 units in a fund)
- Different from AssetEntityAllocation which tracks how the investment is split across the firm's own entities

### Per-Asset Review Schedule
- GP sets review frequency per individual asset (quarterly, semi-annual, annual) — `nextReview` field already exists on Asset model, add `reviewFrequency` field
- Explicit "Mark Reviewed" button on asset detail page: logs review date, auto-advances nextReview based on asset's cadence, creates audit trail
- Type-aware suggestions when review is due: RE → "Consider: lease expirations, market comp update, tenant status"; Credit → "Consider: covenant status, payment history, maturity timeline"
- Overdue reviews surface in the unified monitoring panel on the assets page

### Unified Monitoring Panel (Assets Page)
- Collapsible panel with badge count ("5 items need attention") at the top of the assets page — expands on click, GP can collapse after reviewing
- Disappears entirely when no alerts exist
- Shows: covenant breaches, lease expirations (90/180 day windows), loan maturities approaching, overdue asset reviews
- Organized by severity then type: critical first (breaches, expired leases, overdue maturities), then warnings (within 90 days), then upcoming (90-180 days)
- Each alert deep-links to the specific asset + relevant tab (e.g., covenant breach → asset detail Contracts tab)

### Lease Expiration Forward View
- Both table and timeline views available with a toggle
- Table (default): all leases sorted by expiration date, with 90-day and 180-day badges, filterable by asset
- Timeline view: horizontal calendar with color coding — red (<90 days), yellow (90-180 days), green (>180 days)

### Covenant Status Display
- Status display only (compliant/breached/waived) — GP manually updates status
- No covenant test history tracking — keep it simple

### Asset List Column Sorting
- All data columns sortable: Name, Asset Class, Instrument, Participation, Sector, Entities, Cost Basis, Fair Value, Unrealized, MOIC, IRR, Status
- Click column header to toggle asc/desc, with sort direction indicator
- Client-side sorting (instant, no API calls) — works fine for current portfolio size
- Default sort: by name alphabetically

### Valuation History Chart
- Fair value over time line chart on all asset types (if 2+ valuations exist)
- Hover to see exact value and date
- Uses Recharts 3 (already in stack)

### Asset Detail Page Layout
- Tab order: Overview, Contracts, Performance, Documents, Tasks, Activity
- Overview tab: main content (key metrics, type-specific fields, ownership info) + sidebar (asset notes, next review date, key dates — entry, exit, maturity). Inspired by Stessa's property notes sidebar.
- Contracts tab: default to Stessa-style cards (one card per lease/agreement with key info and status) with Active/Expired/Draft filter pills; toggle available to switch to table view for data-dense display

### Task Context Linking
- Tasks linked two-way: task shows "Deal: Acme Acquisition" as clickable link, AND deal/asset/entity detail pages show a Tasks section listing all linked tasks
- Inline quick-add from within deal/asset/entity detail pages: small "+ Add Task" button opens compact inline form (title, assignee, due date) pre-linked to that context
- Context filter dropdown on main tasks page: filter by specific deal, asset, entity, or "Unlinked tasks only"
- Task API already supports dealId/entityId/assetId query params

### Task Drag-and-Drop
- Both views available on tasks page:
  - Default table/list view (current) with drag-and-drop reordering (uses `order` field on Task model)
  - Toggle to kanban board view: three columns (To Do, In Progress, Done), drag between columns to change status
- Similar to how deals pipeline has kanban

### Task Auto-Creation
- Key deal stage transitions only: Screening → Due Diligence (creates DD checklist tasks), IC Approved → Closing (creates closing checklist tasks)
- Asset exit also auto-creates closing tasks
- Auto-created tasks assigned to the deal lead or asset manager; if no lead assigned, left unassigned
- Deal stage engine already exists for transition hooks

### Task Subtasks (Checklist Items)
- Tasks support checklist items (like GitHub issue checkboxes)
- Shows progress: "3/5 items complete"
- Useful for DD checklists, closing tasks, and auto-created task sets

### Task Notifications
- Email notification when a task is assigned to someone
- Uses existing Resend email infrastructure

### Claude's Discretion
- Exact closing task templates for deal transitions and asset exits
- Loading skeleton design for new components
- Kanban board layout details and card design
- Chart axis formatting and responsive behavior
- Monitoring panel exact visual styling and animation
- Type-aware review suggestion text per asset class
- Mobile/responsive considerations for drag-and-drop

</decisions>

<specifics>
## Specific Ideas

- "I'm envisioning something similar to Stessa for real estate — but extending active management and tracking to all asset types: venture, loans, fund LP positions. Any investment that needs or could use active oversight."
- "Directly held RE is mostly NNN so low management" — lease expiration tracking matters more than heavy tenant/OpEx management
- "The exit of an asset isn't a common occurrence — it should have a similar workflow to closing a deal" — deliberate modal flow, not a casual action
- Stessa reference patterns to adopt: lease cards with status filter pills (Active/Past/Draft), sidebar for notes and key dates on detail pages, "EXPIRED" badges on time-sensitive items
- Ownership stake is important because the firm may invest in the same asset through two different funds (entity allocation), but also needs to track what percentage of the underlying asset they own (e.g., 12% of an operating business)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Asset model** (`prisma/schema.prisma:540`): Full model with assetClass, status (ACTIVE/EXITED/WRITTEN_OFF), costBasis, fairValue, moic, irr, nextReview, projectedIRR/projectedMultiple. Missing: exitDate, exitProceeds, exitNotes, ownershipPercent, shareCount, reviewFrequency
- **AssetEntityAllocation** (`prisma/schema.prisma:586`): Links asset to entities with allocationPercent and costBasis — handles multi-entity ownership
- **AssetFundLPDetails** (`prisma/schema.prisma:644`): gpName, commitment, calledAmount, uncalledAmount, distributions, gpNav, gpIrr, gpTvpi — ready for fund LP adaptive UI
- **Lease model** (`prisma/schema.prisma:666`): Full lease terms (tenant, dates, rent, escalations, renewal options, security deposit, TI allowance) — ready for lease management
- **CreditAgreement model** (`prisma/schema.prisma:696`): Full loan terms (principal, rates, maturity, collateral, guarantors)
- **Covenant model** (`prisma/schema.prisma:733`): covenantType, threshold, lastTestedDate, currentStatus (COMPLIANT/BREACHED/WAIVED), breachHistory
- **Task model** (`prisma/schema.prisma:1461`): title, status (TODO/IN_PROGRESS/DONE), priority, assigneeId, dueDate, order, contextType, contextId, assetId, dealId, entityId — all context linking fields exist
- **Task API** (`src/app/api/tasks/route.ts`): GET with pagination + filters (contextType, contextId, dealId, entityId, status, priority), POST, PATCH — already supports context-scoped queries
- **Tasks page** (`src/app/(gp)/tasks/page.tsx`): Table with My/All/Overdue tabs, status toggle, search, filters, pagination — needs kanban view and drag-drop added
- **Assets page** (`src/app/(gp)/assets/page.tsx`): Table with filters and pagination — needs column sorting and monitoring panel added
- **deal-stage-engine.ts**: Deal workflow state machine — hook point for auto-creating tasks on transitions
- **SearchFilterBar component**: Reusable filter bar already used on tasks and assets pages
- **Recharts 3**: Already installed for charts — use for valuation history chart
- **Notification system** (Resend + Twilio): Already exists for email/SMS notifications

### Established Patterns
- **SWR data fetching**: All list pages use `useSWR` with firmId scoping
- **Cursor-based pagination**: `parsePaginationParams` + `buildPaginatedResult` pattern
- **Zod validation**: All API routes use `parseBody(req, ZodSchema)`
- **Toast notifications**: `useToast()` (never destructure)
- **Feature components**: `src/components/features/{domain}/` directory per domain
- **Modal pattern**: Modal component with open/close state for forms
- **Badge component**: Color-coded status badges used throughout

### Integration Points
- **Asset detail page** (`src/app/(gp)/assets/[id]/page.tsx`): Needs tab restructuring for shared tabs with adaptive content
- **Deal stage engine**: Hook auto-task creation into stage transition logic
- **Asset API** (`src/app/api/assets/[id]/route.ts`): Needs exit endpoint (PATCH with exit fields)
- **Route registry** (`src/lib/routes.ts`): May need updates for new monitoring panel routes
- **Notification system**: Wire task assignment and due date notifications
- **create-task-form.tsx** in assets features: Already exists — extend for inline quick-add pattern

</code_context>

<deferred>
## Deferred Ideas

- **Structured insurance policy model** — Policy number, carrier, expiry date, renewal alerts per asset (seen in Stessa). New capability, separate phase.
- **Mortgage/loan tracking per RE asset** — Lender, rate, payment, balance (seen in Stessa). New data model, separate phase.
- **Tax assessment tracking** — Year-over-year assessed values with % change (seen in Stessa). New data model, separate phase.
- **Partial exits** — Selling a portion of a position, adjusting remaining cost basis. Adds complexity, defer to later phase.
- **Borrower health metrics for credit** — DSCR, LTV, collateral value tracking, watchlist, risk tier. More forward-looking risk monitoring, future phase.
- **Portfolio company operating metrics** — Revenue, burn rate, runway, headcount for equity/venture. Detailed data entry, future phase.
- **Configurable task templates per stage transition** — GP-defined templates in settings. Maximum flexibility but too much setup for now.
- **Covenant test history tracking** — Logging each test date, actual value, pass/fail. Building compliance history over time. Future enhancement.
- **Due date reminder emails** — Email the day before task is due. Requires background job infrastructure (cron/scheduled tasks). Future phase.
- **Overdue task notification trigger** — Auto-send email when task passes due date. Same background job dependency. Future phase.

</deferred>

---

*Phase: 14-asset-management-task-management*
*Context gathered: 2026-03-09*
