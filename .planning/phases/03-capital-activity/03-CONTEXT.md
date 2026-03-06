# Phase 3: Capital Activity - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Capital calls, distributions, capital accounts, and waterfall calculations all work correctly with real data. The GP team can manage capital activity reliably. Includes: wiring computation engines to UI (replacing seeded display values), fee calculation engine, return metrics (TVPI, DPI, RVPI, MOIC) wired end-to-end, waterfall enhancements (configurable carry, pref return options, clawback, GP co-invest), capital call/distribution status workflows, NAV refinement, and commitment tracking.

</domain>

<decisions>
## Implementation Decisions

### Fee Calculation Rules
- Fee basis configurable per entity (committed capital, invested capital, or NAV-based)
- Carried interest style configurable per entity (European whole-fund or American deal-by-deal)
- Single management fee rate per entity (no stepped schedules)
- Manual trigger — GP clicks "Calculate Fees" for a specific entity and period
- Fee configuration lives in the waterfall template (carry + fees together)
- Fund expenses: manual entry per period when calculating fees
- Claude's discretion: fee display format (detailed breakdown vs summary) and fee history (timeline vs latest only)

### Capital Account UX
- Auto-compute on every transaction event (capital call funded, distribution paid) AND recompute on page load as fallback
- Running ledger format (chronological transactions with running balance), not quarterly periods
- Capital account visible on existing LP Activity page (no new dedicated page)
- Full chain: transaction event → update commitment calledAmount → recompute capital account

### Metrics Placement
- TVPI, DPI, RVPI, IRR on both entity detail page AND GP dashboard (cross-entity rollup)
- MOIC at both asset level (per-investment) AND entity level (weighted average)
- Real-time computation on page load (no caching, always current)
- GP dashboard: summary stat cards at top + entity metrics table below

### Waterfall Usage Model
- Both scenario modeling (hypothetical "what if") AND tied to actual distribution events
- Save waterfall results only when linked to a real distribution event (scenarios are transient)
- Auto-populate distribution decomposition from waterfall results (carry, ROC, income split) — GP can override
- Waterfall required for all entities before distributions can be created
- Unified waterfall with `appliesTo` field on tiers for income vs capital routing (not dual tracks)
- Preferred return: configurable per template whether offset by prior distributions or not
- Preferred return: configurable simple annual vs compounding per template
- Preferred return: configurable whether income distributions count toward satisfying pref hurdle
- GP carry percentage configurable per template (remove 20% hardcode)
- Clawback tracking: calculate and display potential GP clawback liability
- GP co-invest supported: GP commits capital alongside LPs, gets LP treatment for ROC + pref, plus carry on GP side
- Waterfall results: summary view (LP aggregate vs GP totals) with expandable per-investor breakdown

### Commitment Tracking
- calledAmount auto-updates when capital call line items are funded
- Warn (but allow) when capital call would exceed investor's unfunded commitment
- No commitment overview dashboard in this phase (deferred)
- Commitments editable with audit trail (old value logged)

### Distribution Workflow
- Full status workflow: DRAFT → APPROVED → PAID
- Approval authority configurable per entity (ties to Phase 2 decision-making structures)
- GP selects distribution type first (income vs capital vs final liquidation — Claude decides exact types)
- Then enters amount → waterfall auto-decomposes → GP reviews
- Show per-investor allocation table before submitting
- GP can override individual LP allocations (editable per LP, for side letter situations)
- Free text memo field on distributions
- Marking PAID auto-triggers capital account recomputation for all affected investors

### NAV Computation Refinement
- Proxy values (cash, other assets, liabilities) configurable per entity
- NAV on both entity detail page AND GP dashboard (cross-entity total)
- Show both layers: cost basis NAV and economic NAV side by side
- Auto-recompute when asset valuations change
- Per-asset breakdown: show each asset's cost basis, fair value, allocation %, contribution to entity NAV
- NAV history: store snapshots with periodDate, GP can see NAV over time

### Capital Call Workflow
- Full status workflow: DRAFT → ISSUED → PARTIALLY_FUNDED → FUNDED (+ OVERDUE)
- Per-LP line item status tracking (Pending → Funded)
- Auto-mark OVERDUE when due date passes and call not fully funded
- Full chain on funding: mark funded → update calledAmount → recompute capital account

### Claude's Discretion
- Fee display format (detailed breakdown vs summary totals)
- Fee history display (timeline vs latest only)
- Distribution type options (exact list based on PE/family office conventions)
- Exact layout of metrics on entity detail and GP dashboard
- MOIC weighted average calculation method at entity level
- NAV proxy configuration UI design
- Overdue detection mechanism (cron-like check vs on-page-load)
- Capital account running ledger UI design
- Waterfall clawback calculation algorithm

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **computeCapitalAccount()** (`src/lib/computations/capital-accounts.ts`): Roll-forward engine, fully tested. Needs to be triggered automatically on transactions.
- **proRataShare()** (`src/lib/computations/capital-accounts.ts`): Pro-rata allocation from commitments. Used for line item generation and per-investor waterfall breakdown.
- **xirr()** (`src/lib/computations/irr.ts`): Newton-Raphson XIRR, production-ready. Already used by LP dashboard.
- **computeWaterfall()** (`src/lib/computations/waterfall.ts`): Tier-by-tier distribution engine, 13 tests. Needs enhancement: configurable carry %, pref return options, clawback.
- **computeMetrics()** (`src/lib/computations/metrics.ts`): TVPI, DPI, RVPI, MOIC computation with division-by-zero guards.
- **CreateCapitalCallForm** (`src/components/features/...`): Modal for capital call creation. Extend with unfunded commitment warning.
- **CreateDistributionForm** (`src/components/features/...`): Modal for distributions. Extend with distribution type selector + waterfall auto-decomposition + per-investor preview.
- **Transactions page** (`/transactions`): Three-tab interface (Capital Calls, Distributions, Waterfall Templates). Extend with enhanced status workflows and waterfall integration.
- **LP Activity page** (`/lp-activity`): Shows capital call and distribution line items. Add capital account running ledger.
- **LP Dashboard** (`/lp-dashboard`): Computes IRR + metrics on-the-fly. Pattern to replicate for GP dashboard + entity detail.

### Established Patterns
- **SWR data fetching**: All capital data fetched via useSWR with firmId scoping. Revalidate on mutations.
- **Zod validation**: All API routes use parseBody(req, ZodSchema). Extend schemas for new fields.
- **Auto line item generation**: Capital call/distribution POST already auto-creates per-investor line items at pro-rata.
- **Two-layer NAV**: Cost basis + economic NAV already computed in `/api/nav/[entityId]`. Extend with configurable proxies.
- **Waterfall template → entity linking**: WaterfallTemplate ↔ Entity many-to-many already in data model.
- **FeeCalculation model**: Exists with managementFee, fundExpenses, carriedInterest, details JSON. Needs computation logic.

### Integration Points
- **Capital call funded → commitment update → capital account recompute**: New chain to build
- **Distribution PAID → capital account recompute**: New chain to build
- **Distribution creation → waterfall auto-run**: Connect distribution form to waterfall calculate endpoint
- **Asset valuation change → NAV recompute**: New trigger to build
- **GP dashboard → cross-entity metrics aggregation**: New API endpoint needed
- **Entity detail → per-entity metrics display**: Wire existing computation functions to entity pages
- **Waterfall template → fee configuration**: Extend template model with fee parameters

</code_context>

<specifics>
## Specific Ideas

- Capital accounts should auto-compute from transactions, not require manual trigger — "shouldn't it really be automatic based on the transactions in the system"
- Distribution type selection determines waterfall tier routing — income distributions vs capital distributions have different effects on the waterfall
- Preferred return interaction with distributions is nuanced: prior distributions may or may not offset pref, income may or may not count toward pref — all configurable per template
- GP co-invest is a real pattern: GP puts in capital alongside LPs, gets LP treatment for ROC + pref, then also receives carry as GP
- Full chain pattern: every transaction event triggers downstream recomputation (funded call → calledAmount → capital account; paid distribution → capital account; valuation change → NAV)
- Waterfall carry hardcoded at 20% (flagged in Phase 1) — must be made configurable per template

</specifics>

<deferred>
## Deferred Ideas

- **Commitment overview dashboard** — Cross-entity view of unfunded commitments. Useful for capital planning but not needed in Phase 3.
- **Capital readiness checks at deal close** — Warn at close if entity doesn't have enough committed capital. Mentioned in Phase 2 as deferred.
- **Fundraising workflow** — Tracking LP commitments, subscription docs, capital readiness per entity. Phase 3+ or future milestone.
- **Side letter rule application** — Per-LP fee modifications. Phase 4 (FIN-07).
- **Cross-entity NAV dashboard** — Dedicated dashboard for all entities' NAV. Phase 4 (ASSET-02) — though GP dashboard total NAV is included here.
- **LP notification on capital calls/distributions** — Email/SMS delivery when calls are issued or distributions paid. Phase 7 (NOTIF-01, NOTIF-02).
- **Capital account statement PDF export** — Phase 7 (REPORT-02).

</deferred>

---

*Phase: 03-capital-activity*
*Context gathered: 2026-03-06*
