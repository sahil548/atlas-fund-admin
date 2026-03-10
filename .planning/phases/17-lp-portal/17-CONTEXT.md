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
- Preset period dropdown + advanced toggle for custom start/end date pickers
- Presets: Q1-Q4 for each year with activity, FY options per year, and a Year-to-Date option
- When a period is selected: ledger entries and period summaries filter to the range; IRR/TVPI/DPI/RVPI metrics stay all-time (period-specific IRR is misleading for short windows)
- Placement: top right inline, next to the existing Recompute button in the capital account page header bar
- Default view: All Time (current behavior preserved)

### Document Center Filtering (LP-05)
- Horizontal tabs above the document list: All | K-1s | Financial | Legal | Reports | Other
- Category badges already exist per document — tabs filter to matching categories
- When K-1s tab is active: show additional entity dropdown and tax year dropdown filters above the list

### K-1 Acknowledgment Workflow (LP-08)
- Download-then-acknowledge pattern: LP must download the K-1 first (tracked), then an Acknowledge button appears
- After acknowledgment: shows "Acknowledged [date]" badge on the document
- GP-side tracking: K-1 management page shows per-investor acknowledgment status (acknowledged / pending / not downloaded) with dates
- GP has a "Send Reminder" button for LPs who haven't acknowledged — sends email nudge

### Per-Entity Performance (LP-07)
- Dashboard: expand existing "Commitments by Entity" section to show IRR + TVPI per entity alongside commitment/called amounts
- Portfolio page: new section at top showing full metrics per entity (IRR, TVPI, DPI, RVPI) before the asset look-through cards
- Current values only — no sparklines or expandable charts per entity
- Per-entity IRR computed using same xirr() approach, scoped to entity-specific cash flows

### LP Contact Information Verification (LP-09)
- Add "Your Information" section at top of existing LP settings page, above notification preferences
- Fields: LP legal name (read-only, set by GP), mailing address (editable), plus existing email and phone
- Annual verification prompt: amber banner at top of LP dashboard during tax season — "Please verify your contact information for tax season"
- Banner is non-blocking, dismissable after LP visits settings and confirms/updates info
- Verification creates an audit trail (verified date stored)

### Metrics Verification (LP-06)
- Dashboard API already computes IRR/TVPI/DPI/RVPI from real capital call/distribution data via xirr() + computeMetrics()
- Verification task: confirm all LP-facing metrics are computed (not seeded), add test coverage asserting computation from real transaction data
- Badge "Computed from ledger" already exists on capital account page — extend pattern to dashboard metrics

### Claude's Discretion
- Date picker component choice and calendar popup implementation
- Exact tab styling for document center (active state, counts per tab)
- K-1 download tracking mechanism (click event vs API log)
- Annual verification window timing and banner styling
- Loading states and error handling for per-entity metric computation
- Mailing address field structure (single textarea vs structured address fields)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **LP Dashboard** (`src/app/(lp)/lp-dashboard/page.tsx`): StatCards + metric display + "Commitments by Entity" section — extend entity cards with IRR/TVPI
- **Dashboard API** (`src/app/api/lp/[investorId]/dashboard/route.ts`): Already computes aggregate IRR via xirr(), TVPI/DPI/RVPI via computeMetrics(), saves MetricSnapshot fire-and-forget — add per-entity computation loop
- **Capital Account page** (`src/app/(lp)/lp-account/page.tsx`): Has computePeriodSummaries(), ledger display, Recompute button — add date range picker inline
- **Document Center** (`src/app/(lp)/lp-documents/page.tsx`): Category badges with categoryColor map, download links — add tab filtering and K-1 acknowledge button
- **LP Settings** (`src/app/(lp)/lp-settings/page.tsx`): Full notification preferences form with debounced save — add contact info section above
- **K-1 API routes** (`src/app/api/k1/route.ts`, `src/app/api/k1/upload/route.ts`): K-1 listing with entity/year filters, bulk upload with investor matching — extend for acknowledgment status
- **Performance Charts** (`src/components/features/lp/performance-charts.tsx`): Recharts-based time-series for aggregate metrics
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
- **Date range picker**: Query params on existing capital account API (`?startDate=...&endDate=...`)
- **Per-entity metrics**: Extend dashboard API response with `entityMetrics[]` array
- **K-1 acknowledgment**: New fields on Document model (downloadedAt, acknowledgedAt, acknowledgedByInvestorId) or new K1Acknowledgment model
- **Contact info**: Extend Investor model with mailing address fields, add verification fields (lastVerifiedAt)
- **Annual verification banner**: Check lastVerifiedAt against current year, render banner conditionally on dashboard

</code_context>

<specifics>
## Specific Ideas

- Download-then-acknowledge for K-1s ensures LPs actually opened the document before confirming receipt
- GP reminder capability closes the loop on K-1 distribution tracking — eliminates manual email follow-ups
- Annual verification banner is modeled after common tax-season patterns (e.g., brokerage account annual verification prompts)
- Per-entity metrics on dashboard give LPs fund-by-fund context without leaving the main view — portfolio page has the deep dive

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-lp-portal*
*Context gathered: 2026-03-09*
