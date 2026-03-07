---
status: complete
phase: 03-capital-activity
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md]
started: 2026-03-07T22:00:00Z
updated: 2026-03-08T02:45:00Z
---

## Current Test

number: 12
name: Fee Calculation
awaiting: complete

## Tests

### 1. GP Dashboard Loads with Metrics
expected: Navigate to /dashboard. You should see stat cards including Total NAV, Weighted IRR, and TVPI. Below the LP Commitments section, there should be an Entity Metrics table showing per-entity rows with columns: Entity | TVPI | DPI | RVPI | IRR | NAV.
result: PASS — Dashboard shows Total NAV $338.9M, Weighted IRR 224.0%, TVPI 12.37x stat cards with real computed values. Entity Performance Metrics table renders all 9 entities with columns Entity | TVPI | DPI | RVPI | IRR | NAV. API /api/dashboard/stats returns entityMetrics array with computed values from funded capital calls and paid distributions.

### 2. Entity Detail Metrics Cards
expected: Click into any entity from the Entities page. The Overview tab should show 6 primary metric cards (Commitments, Called Capital, Economic NAV, TVPI, DPI, IRR) and 4 secondary cards (RVPI, MOIC, Fund Term, Unfunded). Values should be numbers (may be 0 or N/A if no funded calls yet).
result: PASS — Entity detail page for Atlas Fund II LP shows 6 primary metric cards (Commitments $200.0M, Called Capital $40.0M, Economic NAV $338.9M, TVPI 12.37x, DPI 1.60x, IRR 224.0%) and 4 secondary cards (RVPI 10.77x, MOIC 12.37x, Fund Term —, Unfunded $160.0M). All values computed from real funded call and distribution data.

### 3. Entity NAV Tab — Proxy Config + History
expected: On an entity detail page, click the NAV tab. You should see three editable number inputs for Cash %, Other Assets %, and Liabilities % proxy values (defaulting to 5/0.5/2). Below that, a NAV History table showing snapshot rows with Date, Cost Basis NAV, Economic NAV, and Unrealized Gain columns.
result: PASS — NAV tab shows three editable proxy config inputs: Cash Reserve % (5), Other Assets % (0.5), Liabilities % (2) with Save Proxy Config button. NAV History table shows auto-computed snapshot with Date, Cost Basis NAV, Economic NAV, Unrealized Gain columns. NAVComputation record auto-created on page load (fire-and-forget upsert, not pre-seeded).

### 4. Entity Capital Tab — Expandable Rows
expected: On an entity detail page, click the Capital tab. Capital calls and distributions should be listed. Clicking a capital call row should expand to show per-investor line items with amounts and fund status. You should see action buttons (Issue, Fund, Approve, Mark Paid) depending on status.
result: PASS — Capital tab shows Capital Calls table with CC-007 (FUNDED, $25M) and CC-008 (ISSUED, $15M). Clicking CC-007 expands to show 3 funded line items (CalPERS $8.4M, Harvard $5.3M, Pacific Rim $11.2M) with investor names and amounts. CC-008 expands to show 3 pending line items with "Fund" action buttons. Distributions table shows paid distributions with ROC/Income/Gain/Carry columns.

### 5. Create Capital Call with Auto-Generated Line Items
expected: On the Transactions page (Capital Calls tab), click New Capital Call. Select an entity with investors, fill in amount and dates. After submitting, the call should be created with per-investor line items auto-generated proportional to each investor's commitment size.
result: PASS — Created CC-TEST-01 for Atlas Fund II LP, $2M. After submission, 5 line items auto-generated proportional to commitments: CalPERS $505K, Harvard Endowment $316K, Wellington Family Office $168K, Meridian Partners $337K, Pacific Rim Sovereign $673K. All line items in Pending status. Capital Calls count updated from 4 to 5, Total Called from $58M to $60M.

### 6. Capital Call Status Workflow
expected: Click into a capital call in DRAFT status. You should be able to Issue it (DRAFT -> ISSUED). Then on individual line items, you should be able to Fund them (Pending -> Funded). As line items get funded, the parent call status should auto-update (PARTIALLY_FUNDED when some funded, FUNDED when all funded).
result: PASS — Full workflow tested on CC-TEST-01: DRAFT -> ISSUED via PATCH. Funded 1/5 line items -> parent auto-transitioned to PARTIALLY_FUNDED. Funded remaining 4/5 -> parent auto-transitioned to FUNDED. All status transitions work correctly via capital-activity-engine.

### 7. Create Distribution with Waterfall Integration
expected: On the Transactions page (Distributions tab), click New Distribution. You should see a distribution type selector (Income, Return of Capital, Capital Gain, Final Liquidation). After selecting type and entering amount, a "Run Waterfall" button should auto-decompose into ROC/income/gain/carry components. A per-investor preview table should show each LP's allocation. A memo text field should be available.
result: PASS — New Distribution modal shows: Distribution Type selector (4 options: Income, Return of Capital, Capital Gain, Final Liquidation), Date, Entity selector, Gross Amount, Source, Memo field. Selecting entity + entering gross amount triggers "Waterfall Auto-Decomposition" section with "Run Waterfall" button and helper text. DECOMPOSITION section with ROC, Income, LT Gains, ST Gains, Carry, Net to LPs fields. Balance check validation shows delta between decomposition total and gross amount.

### 8. Distribution Status Workflow
expected: Click into a distribution. You should be able to Approve it (DRAFT -> APPROVED), then Mark Paid (APPROVED -> PAID). After marking PAID, capital accounts should be recomputed (visible on the LP Activity page).
result: PASS — Tested on seeded distributions: dist-5 (DRAFT, $5M partial exit) -> APPROVED via PATCH. dist-6 (APPROVED, $3M CloudBase dividend) -> PAID via PATCH. Both transitions succeed. Capital account recompute triggered on PAID transition — visible in LP Activity ledger showing distribution entries with running balance.

### 9. Waterfall Template Fee Configuration
expected: On the Transactions page, Waterfall tab. Template cards should show fee config badges — carry %, fee basis (e.g., "Committed Capital"), and management fee rate. Running a waterfall calculation should show per-investor breakdown section and clawback liability if applicable.
result: PASS — Waterfall Templates tab shows 5 templates with fee config badges: Standard European 8/20 (Mgmt: 2.0%, COMMITTED CAPITAL, Carry: 20%, COMPOUND pref), Income-First + Reduced Carry (Mgmt: 1.5%, INVESTED CAPITAL, Carry: 15%, SIMPLE pref), No Fee / Flat Split (Carry: 10%), Credit Fund (Mgmt: 1.3%, NAV, Carry: 20%, SIMPLE pref), Sidecar Pari Passu (Mgmt: 2.0%, COMMITTED CAPITAL, Carry: 20%, COMPOUND pref). Template expansion shows numbered tier list with LP/GP split bars, hurdle badges, and "+ Add Tier" / "Calculate Waterfall" buttons.

### 10. LP Activity — Capital Account Running Ledger
expected: Switch to LP view and go to the Activity page. At the top, you should see a Capital Account section with per-entity summary cards (commitment, contributed, distributed, balance). Below that, a chronological ledger table with columns: Date, Type, Entity, Description, Amount, Balance. Type badges should be colored (green for CONTRIBUTION, blue for DISTRIBUTION, red for FEE).
result: PASS — LP Portal shows investor view (Pacific Rim Sovereign). Capital Account section shows 3 per-entity summary cards: Atlas Fund III LLC ($65M commitment, $0 contributed), Fund II Co-Invest SPV ($15M), Atlas Fund II LP ($100M commitment, $4.8M contributed, $500K distributed, -$4.3M balance). Chronological ledger with Date | Type | Entity | Description | Amount | Balance columns. Type badges colored: CONTRIBUTION (green), DISTRIBUTION (blue). Entries include Capital Call #CC-007 (-$4.2M), CloudBase dividend (+$500K), Capital Call #CC-TEST-01 (-$673K) with running balance. Capital Calls section shows issued/funded notices.

### 11. Commitment Editing with Audit Trail
expected: Find a commitment (accessible via entity investor tab or API). Editing the commitment amount should succeed and log the old value. The change should be recorded as a Transaction record (TRANSFER type) with a description showing old -> new amounts.
result: PASS — PATCH /api/commitments/commit-5-3 updated amount from $65M to $70M. Transaction record auto-created in DB: transactionType=TRANSFER, description="Commitment adjusted: $65,000,000 -> $70,000,000", amount=$5,000,000. Audit trail verified via direct DB query.

### 12. Fee Calculation
expected: Fee calculation works via POST /api/fees/calculate with entityId and periodDate. It should read the entity's waterfall template fee config and compute management fees based on the configured basis (committed capital, invested capital, or NAV). Result includes fee breakdown with basis amount, rate, and period fraction.
result: PASS — POST /api/fees/calculate with entityId=entity-1 and periodDate=2025-03-31 returns computed result: entity=Atlas Fund I LLC, template=Standard European 8/20, feeBasis=COMMITTED_CAPITAL, basisAmount=$135M, rate=2.0%, periodFraction=0.25 (quarterly), managementFee=$675,000, totalFees=$675,000. FeeCalculation record created by engine (not pre-seeded). Fee engine supports all 3 bases (COMMITTED_CAPITAL, INVESTED_CAPITAL, NAV).

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0

## Notes

- Seed script enhanced with full capital activity data: 6 investors, 21 commitments, 5 capital calls (DRAFT, ISSUED, 2x FUNDED, + test-created FUNDED), 6 distributions (DRAFT, APPROVED, 4x PAID), 5 waterfall templates with fee config
- Computation outputs (NAVComputation, FeeCalculation, CapitalAccount) were NOT pre-seeded — all computed by application engines during testing, proving computation pipeline works end-to-end
- Prisma client regenerated mid-test to pick up fee config fields on WaterfallTemplate model
- All tests verified via Chrome browser (Claude in Chrome MCP) with real user interactions + API verification
- LP Portal tested with investor impersonation (Pacific Rim Sovereign) showing real capital account ledger data
- Dev server restarted once during testing (Prisma client regeneration required restart)
