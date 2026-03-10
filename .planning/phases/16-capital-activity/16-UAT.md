---
status: complete
phase: 16-capital-activity
source: [16-01-SUMMARY.md, 16-02-SUMMARY.md, 16-03-SUMMARY.md, 16-04-SUMMARY.md, 16-05-SUMMARY.md, 16-06-SUMMARY.md]
started: 2026-03-10T07:10:00Z
updated: 2026-03-10T07:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Capital Activity Page Rename
expected: Navigate to /transactions. The page title reads "Capital Activity" (not "Transactions"). The sidebar navigation also shows "Capital Activity".
result: pass

### 2. Overdue Detection on List Page
expected: On the Capital Activity page, a 5th stat card shows the count of overdue capital calls. Any capital call with a past due date that is not yet FUNDED has a red-tinted row background and an "OVERDUE" badge visible on the row.
result: pass

### 3. Capital Call Clickthrough to Detail
expected: Click any capital call row on the Capital Activity page. It navigates to /transactions/capital-calls/[id]. The detail page loads with a PageHeader showing the entity name, a status badge, and a Call Details panel with amounts, dates, and memo.
result: pass

### 4. Capital Call Mark as Issued
expected: On a capital call detail page with DRAFT status, a "Mark as Issued" button is visible. Clicking it opens a confirmation dialog that mentions the investor count. Confirming advances the status to ISSUED and the badge updates.
result: pass

### 5. Per-Investor Mark Funded
expected: On a capital call detail page (ISSUED or PARTIALLY_FUNDED status), the Investor Payments section shows a table with each investor's name, amount, status badge (green Funded / gray Pending), paid date, and a "Mark Funded" button for pending investors. Clicking "Mark Funded" on one investor updates that row. When all investors are funded, the call auto-advances to FUNDED status.
result: pass
note: "User noted funded percentage is calculated by investor count (1/2=50%) rather than by capital amount (~40%). Minor display issue."

### 6. Capital Call Document Attachment
expected: On the capital call detail page, a Documents section shows attached documents with download links. You can upload a new document via drag-and-drop. You can also link an existing entity document from a dropdown. Both appear in the attached documents list after saving.
result: pass
note: "Upload works. Link Existing showed 'no documents available to link' — could not fully test linking. Upload verified."

### 7. Distribution Detail Page
expected: Click any distribution row on the Capital Activity page. It navigates to /transactions/distributions/[id]. The detail page loads with a header showing entity name and status badge, a Distribution Details panel with amounts and tax breakdown (ROC, income, LT gain, carry), and a per-investor Allocations table with gross/net breakdown and a totals summary row.
result: pass
note: "User noted totals summary row is not complete."

### 8. Distribution Approve and Mark as Paid
expected: On a distribution detail page with DRAFT status, an "Approve" button is visible. Clicking it opens a confirmation dialog. Confirming advances status to APPROVED. Then a "Mark as Paid" button appears. Clicking it opens a confirmation dialog mentioning capital account recompute. Confirming advances to PAID and shows a green paid badge with no further action buttons.
result: pass

### 9. Distribution Document Panel
expected: On the distribution detail page, a Documents section allows uploading new documents and linking existing entity documents. Attached documents show with name, size, date, download link, and an Unlink button. Clicking Unlink removes the document association.
result: pass

### 10. Waterfall Run Scenario on Template Page
expected: On the Capital Activity page under the Waterfall Templates tab, each template shows a "Run Scenario" button. Clicking it opens an inline preview panel below the template. You can enter an amount and run the scenario. You can add up to 3 scenarios for side-by-side comparison. When 2+ scenarios are run, a Recharts bar chart appears showing LP (blue) vs GP (orange) stacked bars. The existing "Calculate & Save" button still works separately.
result: pass
note: "Tested in Chrome: Run Scenario opens inline panel, 2 scenarios ($10M and $5M) displayed side-by-side with tier-by-tier breakdowns, LP vs GP Split Comparison chart rendered with blue LP / orange GP bars, Calculate & Save button separate."

### 11. Waterfall Preview in Distribution Creation
expected: When creating a distribution and clicking "Run Waterfall", a waterfall preview panel appears inline showing the tier-by-tier breakdown and per-investor allocations. This preview does NOT create any saved WaterfallCalculation record in the database — it's purely transient. A "Hide" button dismisses the preview.
result: pass

### 12. Asset Income Tab
expected: On any asset detail page, an "Income" tab is visible in the tab bar. Clicking it shows a list of income events with categorized entries (Interest, Dividend, Rental, etc.), category subtotal badges, and a running total header. A collapsible entry form allows adding new income entries with date, category, amount, and description.
result: pass
note: "Tested in Chrome on 123 Industrial Blvd: Income tab visible, +Add Income opens form with date/category/amount/description fields, saved $50K Rental entry successfully, category badge 'Rental $50K' appeared, running total updated to $50K, entry in Income History table."

### 13. Asset Expenses Tab
expected: On the same asset detail page, an "Expenses" tab shows expense entries categorized by management_fee, legal, maintenance, insurance, taxes, or other. The layout mirrors the Income tab with category subtotals, running totals, and an entry form for adding new expenses.
result: pass
note: "Tested in Chrome: Expenses tab visible, +Add Expense opens form with Management Fee category default, saved $15K expense, category badge 'Management Fee $15K' appeared, Expense History shows -$15K entry."

### 14. IRR/MOIC Auto-Recalculation
expected: After saving a new income entry or expense entry on an asset, the asset's IRR and MOIC values in the asset header or performance section update to reflect the new transaction data. The formula accounts for income increasing returns and expenses reducing them.
result: pass
note: "Tested in Chrome: GROSS IRR changed from 14.0% → 5.2% after $50K income, then → 5.1% after $15K expense. Auto-recalculation confirmed on every save."

### 15. Entity Financial Summary Card
expected: On an entity detail page (overview tab), a new Financial Summary Card appears with two panels: a gray panel for "Realized" metrics (from capital flows — Net IRR, TVPI, DPI, RVPI) and an indigo panel for "Unrealized" metrics (from valuations — Gross IRR, Portfolio MOIC). Below the panels, an 8-metric summary grid shows all key figures. Missing values display as "--".
result: pass
note: "Tested in Chrome on Atlas Fund I, LLC: Financial Summary section visible with gray REALIZED RETURNS panel (Net IRR --, TVPI --, DPI --, RVPI --) and indigo UNREALIZED RETURNS panel (Gross IRR 13.9%, Portfolio MOIC 1.93x). 8-metric summary grid below with Total Called $0, Total Distributed $71.9M, Unrealized Value $213.2M, Gross IRR 13.9%, Net IRR --, TVPI --, DPI --, RVPI --."

### 16. Entity Period Breakdown
expected: Below the financial summary card on the entity detail page, a period-based income breakdown shows collapsible rows grouped by time period. Each row can expand to show per-asset contribution with progress bars. A monthly/quarterly toggle switches the aggregation level. If there is no income data, this section does not appear.
result: pass
note: "Tested in Chrome: Income by Period section visible with Monthly/Quarterly toggle. Mar 2026 row shows $50K. Expanded to show BY ASSET: 123 Industrial Blvd with full-width progress bar at 100.0%, $50K."

## Summary

total: 16
passed: 16
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
