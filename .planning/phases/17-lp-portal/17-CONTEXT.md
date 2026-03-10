# Phase 17: LP Portal - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

LP portal metrics are verified to come from real computed data, LPs have full self-service access to their statements and documents, and the K-1 acknowledgment workflow is complete. Requirements: LP-04, LP-05, LP-06, LP-07, LP-08, LP-09.

</domain>

<decisions>
## Implementation Decisions

### Capital Account Date Range Picker (LP-04)
- Custom date picker (start + end) always available — transactions happen on any day, not just quarter boundaries
- Quick-preset buttons for common periods (quarters, FY, YTD) alongside the custom date inputs for convenience
- When a date range is selected: EVERYTHING filters — ledger entries, period summaries, AND metrics (IRR/TVPI/DPI/RVPI) all recalculate for the selected period (full point-in-time view)
- Default view: All Time (current behavior preserved)
- Note: full transaction ledger not in scope for this phase — focus is capital account statement date filtering

### Document Center Filtering (LP-05)
- Horizontal tabs above the document list: All | K-1s | Financial | Legal | Reports | Other
- Category badges already exist per document — tabs filter to matching categories
- When K-1s tab is active: show additional entity dropdown and tax year dropdown filters above the list

### K-1 Acknowledgment Workflow (LP-08)
- Batch acknowledge pattern: LP sees a "Review & Acknowledge" page with all unacknowledged K-1s, checks them off in bulk, then submits
- After acknowledgment: shows "Acknowledged [date]" badge on the document
- GP-side tracking: K-1 management page shows per-investor acknowledgment status (acknowledged / pending) with dates
- GP has a "Send Reminder" button for LPs who haven't acknowledged — sends email nudge

### Per-Entity Performance (LP-07)
- Dashboard: expand existing "Commitments by Entity" section to show IRR + TVPI per entity (headline metrics only)
- Portfolio page: new section at top showing full metrics per entity (IRR, TVPI, DPI, RVPI, NAV) before the asset look-through cards
- Sparkline per entity showing trend direction next to metrics — adds visual context
- Entity cards are clickable — navigate to entity-filtered views (capital account, activity filtered to that entity)
- Per-entity IRR computed using same xirr() approach, scoped to entity-specific cash flows

### LP Contact Information & Profile (LP-09)
- New separate "Profile" page in the LP nav (not merged into settings) — separates identity info from notification preferences
- Full profile: legal name (read-only, GP sets it), mailing address (editable), tax ID (masked display, editable by LP via Edit button), entity affiliation list, email, phone
- View + edit is sufficient — no explicit "Verify" action needed; if the LP visits and doesn't change, it's implicitly verified
- Tax ID is editable by the LP (masked ***-**-1234 display, Edit button reveals full field)

### Metrics Verification (LP-06)
- Dashboard API already computes IRR/TVPI/DPI/RVPI from real capital call/distribution data via xirr() + computeMetrics()
- Verification task: confirm all LP-facing metrics are computed (not seeded), add test coverage asserting computation from real transaction data
- Badge "Computed from ledger" already exists on capital account page — extend pattern to dashboard metrics

### Claude's Discretion
- Date range picker placement on the capital account page
- Date picker component choice and calendar popup implementation
- Exact tab styling for document center (active state, counts per tab)
- Per-entity metric computation trigger (fire-and-forget on dashboard load vs separate)
- Per-entity section layout on portfolio page (cards vs table)
- Entity-filtered navigation wiring (URL params vs state)
- K-1 batch acknowledge page layout
- Loading states and error handling
- Mailing address field structure (single textarea vs structured fields)
- LP profile page layout and nav placement

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **LP Dashboard** (`src/app/(lp)/lp-dashboard/page.tsx`): StatCards + metric display + "Commitments by Entity" section — extend entity cards with IRR/TVPI + sparklines
- **Dashboard API** (`src/app/api/lp/[investorId]/dashboard/route.ts`): Already computes aggregate IRR via xirr(), TVPI/DPI/RVPI via computeMetrics(), saves MetricSnapshot fire-and-forget — add per-entity computation loop
- **Capital Account page** (`src/app/(lp)/lp-account/page.tsx`): Has computePeriodSummaries(), ledger display, Recompute button — add date range picker with presets
- **Document Center** (`src/app/(lp)/lp-documents/page.tsx`): Category badges with categoryColor map, download links — add tab filtering and K-1 batch acknowledge
- **LP Settings** (`src/app/(lp)/lp-settings/page.tsx`): Full notification preferences form with debounced save — remains for notifications; profile gets its own page
- **K-1 API routes** (`src/app/api/k1/route.ts`, `src/app/api/k1/upload/route.ts`): K-1 listing with entity/year filters, bulk upload with investor matching — extend for acknowledgment status
- **Performance Charts** (`src/components/features/lp/performance-charts.tsx`): Recharts-based time-series for aggregate metrics — sparkline pattern available
- **MetricSnapshot model**: Already stores per-investor aggregate snapshots with entityId="__AGGREGATE__" — extend for per-entity snapshots
- **InvestorProvider** (`src/components/providers/investor-provider.tsx`): Multi-investor context with useInvestor() hook
- **xirr** (`src/lib/computations/irr.ts`): Proven IRR computation — reuse per-entity
- **computeMetrics** (`src/lib/computations/metrics.ts`): TVPI/DPI/RVPI from called/distributed/NAV

### Established Patterns
- SWR data fetching with investorId scoping: `useSWR(investorId ? url : null, fetcher)`
- Loading guard: `if (!investorId || isLoading || !data) return <Loading/>`
- Fire-and-forget metric snapshots via `.catch()` on dashboard GET
- Badge component for status indicators
- ExportButton component for CSV export
- Debounced auto-save pattern on LP settings form

### Integration Points
- **Date range picker**: Query params on existing capital account API (`?startDate=...&endDate=...`) + metric recalculation endpoint
- **Per-entity metrics**: Extend dashboard API response with `entityMetrics[]` array; MetricSnapshot per entityId for sparklines
- **Entity-filtered views**: Capital account and activity pages accept entity filter to show single-entity data
- **K-1 acknowledgment**: New fields on Document model (downloadedAt, acknowledgedAt, acknowledgedByInvestorId) or new K1Acknowledgment model
- **LP profile**: New route in `(lp)/` group — `/lp-profile`; extend Investor model with mailing address, tax ID fields
- **GP K-1 tracking**: Extend existing reports/K-1 GP page with acknowledgment status columns + reminder action

</code_context>

<specifics>
## Specific Ideas

- Capital account date filtering should support any arbitrary date range since transactions can happen on any day — not just quarter boundaries
- Batch K-1 acknowledge page lets LPs review all outstanding K-1s in one go rather than acknowledging one at a time
- GP reminder button eliminates manual email follow-ups for K-1 acknowledgment tracking
- Sparklines on per-entity metrics provide trend direction at a glance without cluttering the view
- Clickable entity cards on portfolio create a natural drill-down flow: dashboard overview → entity detail → asset look-through
- Full LP profile with editable tax ID gives LPs ownership of their sensitive data while keeping legal name GP-controlled

</specifics>

<deferred>
## Deferred Ideas

- Full transaction ledger across all transaction types (mentioned during date range discussion) — potential future phase

</deferred>

---

*Phase: 17-lp-portal*
*Context gathered: 2026-03-09*
