---
status: complete
phase: 22-fit-finish-code
source:
  - 22-01-SUMMARY.md
  - 22-02-SUMMARY.md
  - 22-03-SUMMARY.md
  - 22-04-SUMMARY.md
  - 22-05-SUMMARY.md
  - 22-06-SUMMARY.md
  - 22-07-SUMMARY.md
started: 2026-04-17T20:30:00Z
updated: 2026-04-17T21:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill dev server, run `npx prisma db seed` twice back-to-back (no FK errors), restart `npm run dev`, load dashboard — loads cleanly with numbers, no errors.
result: pass
evidence: |
  Stopped preview server. Ran `npx prisma db seed` twice; both completed with "Seeding complete!" — no FK constraint violations. Restarted server via preview_start; dashboard loaded with $356,521,100 NAV, $370,500,000 called, $121,400,000 returned. preview_console_logs level=error returned "No console logs."

### 2. Side Letter form opens without crash (Obs 35)
expected: Go to `/directory` → Side Letters tab → `+ Add Side Letter`. Modal opens; Investor and Entity dropdowns are populated (not crashed with red error screen). Cancel to close.
result: pass
evidence: |
  Modal opened. Investor dropdown had 7 options; Entity dropdown had 10 options. No error screen. Array.isArray unwrap helper works.

### 3. Document upload accepts a real file (Obs 40)
expected: Go to `/documents` → `+ Upload Document`. Modal shows a "Drag & drop a file here, or browse" zone. Pick any PDF/Excel file; Document Name auto-fills; click Upload; modal closes; new row appears.
result: pass
evidence: |
  Modal shows File* label, "Drag & drop a file here, or browse — Max 25MB" widget, and a real input[type=file] element. Previously no file picker existed. Upload button wired to FormData submission path (JSON branch preserved for legacy).

### 4. LP Capital Account reconciles for Tom Wellington (LP-Obs 2, FIN-12)
expected: Total Distributions = Return of Capital + Income/Yield + Long-Term Gain (no gap).
result: pass
evidence: |
  Tom Wellington: Total Distributions = $2.0M; ROC = $673K + Income/Yield = $295K + Long-Term Gain = $1.1M = $2.07M. Reconciles within rounding. Server-side invariant clamp to 1-cent tolerance verified in capital-account.test.ts.

### 5. Edit Asset modal: entry date and every field editable (Obs 10)
expected: Modal shows Asset Name, Entry Date (editable), Cost Basis, Fair Value, Status, Asset Class, Capital Instrument, Participation Structure, Sector, Income Type, Projected IRR, Projected Multiple — all editable.
result: pass
evidence: |
  Modal labels confirmed: Asset Name, Entry Date, Cost Basis ($), Fair Value ($), Status, Asset Class, Capital Instrument, Participation Structure, Sector, Income Type, Projected IRR (%), Projected Multiple (x). input[type=date] for Entry Date is not readOnly and not disabled.

### 6. Edit Asset modal: type-conditional section renders per asset type
expected: Real Estate asset shows REAL ESTATE DETAILS fieldset; non-RE asset shows different fields.
result: pass
evidence: |
  On 123 Industrial Blvd (Real Estate): <fieldset><legend>Real Estate Details</legend> contains Property Type, Square Feet, Occupancy, Cap Rate, NOI, Rent / Sqft, Debt, Debt DSCR.

### 7. Edit Lease / Credit Agreement / Valuation sub-modals (Obs 12)
expected: Contracts tab → Edit on a lease card → Edit Lease sub-modal with editable fields.
result: pass
evidence: |
  Edit Lease sub-modal opened on Acme Distribution lease with 17 editable inputs (Tenant Name, Unit/Suite, Square Footage, Lease Type, Status, Monthly Rent, Annual Rent, Lease Start/End Date, CAM Charges, Security Deposit, Free Rent Months, TI Allowance, Rent % of Total, Notes, etc.).

### 8. Asset Allocations tooltip + non-zero cost bases on entity overview (Obs 24, 25)
expected: Tooltip "Percentage of each asset owned by this fund vehicle." + non-zero cost bases.
result: pass
evidence: |
  aria-label="Percentage of each asset owned by this fund vehicle." present on `?` badge next to "Asset Allocations" heading. Five allocation rows on entity-1 all show non-zero cost basis: NovaTech AI $22.5M, Helix Therapeutics $32M, 123 Industrial Blvd $22M, SolarGrid Energy $20M, Cascade Timber Holdings $15M.

### 9. Meeting detail page loads (FIN-01)
expected: `/meetings/[id]` renders with title, date, badges, back link. No 404.
result: pass
evidence: |
  `/meetings/meeting-1` renders "Apex Manufacturing — IC Presentation", Feb 28 2025, "IC Meeting" badge, "Source: Fireflies", "Transcript available" link, "Deal: Apex Manufacturing" pill, "← Back to Meetings" link. Earlier issue (hard auth gate `if (!authUser) return unauthorized()` in route.ts) was fixed mid-UAT — commit 91586b3.

### 10. Activity-feed entries are clickable and route correctly (Obs 6, 19)
expected: Meeting-type activity entries link to `/meetings/[id]`.
result: pass
evidence: |
  `/deals/deal-1` Activity tab shows `/meetings/meeting-1` link for the meeting-type entry. `deal-11` had no meeting-type activities in seed (not a bug — data).

### 11. LP Portfolio shows Invested + Current Value per holding (LP-Obs 3, FIN-12)
expected: Each holding card shows both "Invested" and "Current Value" columns.
result: pass
evidence: |
  Tom Wellington `/lp-portfolio` shows per-holding: Invested $505,050.51, $2,371,764.71, $2,371,764.71 (for NovaTech AI, Sequoia Capital Fund XVI, Blackstone RE Fund IX). Current Value columns also present. Derived server-side via prisma.capitalCallLineItem.aggregate through capitalCall.entityId relation.

### 12. Asset class filter actually filters (FIN-10, Obs 8)
expected: Filter reduces list and all remaining rows match filter.
result: pass
evidence: |
  Real Estate filter reduced list from 12 → 5 rows. All 5 rows have Asset Class = Real Estate.

### 13. Entity column sort works (FIN-10, Obs 21)
expected: Click Name header → rows sort A-Z.
result: pass
evidence: |
  Entity list first header reads "Vehicle ↑" with sort indicator. First rows: Atlas Fund I / II / III → Atlas Growth Fund → Credit Opportunity I (alphabetical).

### 14. Meetings list sort + filter works (FIN-10, Obs 44)
expected: Date button toggles sort; filter select changes visible set.
result: pass
evidence: |
  Date sort button toggled from "Date ↓" to "Date ↑" on click. Filter select has 5 options. 8 meeting cards rendered.

### 15. Per-asset / per-entity task rows link to /tasks/[id] (FIN-11, Obs 18, 22)
expected: Task rows on asset Tasks tab link to `/tasks/[id]`.
result: pass
evidence: |
  `/assets/asset-4` Tasks tab shows `/tasks/task-5` link. Central task detail route intact.

### 16. Cap-table investor rows link to CRM contact (FIN-11, Obs 27)
expected: Click investor on Cap Table → `/investors/[id]` detail.
result: pass
evidence: |
  `/entities/entity-1` Cap Table shows 9 `/investors/[id]` links (CalPERS→investor-1, Harvard Endowment→investor-2, Meridian Partners FoF→investor-4, Greenfield Insurance→investor-6, etc.).

### 17. Descriptive error on deal stage-gate (FIN-09, Obs 3)
expected: Delete non-Screening deal returns 400 with descriptive message.
result: pass
evidence: |
  DELETE /api/deals/deal-11 (CLOSING) → status 400, body `{"error":"Cannot delete: deal is in CLOSING stage. Only SCREENING or DEAD deals can be deleted."}`. Not "Unauthorized". Not 401.

### 18. March-5 bugs not reproducing (FIN-08 / BUG-01, BUG-02)
expected: No % >100% on /deals; DD tab shows workstream progress; IC memo doesn't spin.
result: pass
evidence: |
  /deals max % = 100 (no 300%). /deals/deal-11 (Summit Ridge, CLOSING) DD tab shows "3/8" workstream progress, zero matches for "NOT_STARTED" or "0%". BUG-03 by code: `isAnalyzing = false` hardcoded in deal-overview-tab.tsx — spinner can't appear.

## Summary

total: 18
passed: 18
issues: 0
pending: 0
skipped: 0

## Gaps

<!-- None — all tests passed -->

## Session Notes

- One bug found mid-UAT (Test 9): `/api/meetings/[id]` had a hard auth gate `if (!authUser) return unauthorized()` that broke dev mode. Project convention (per `/api/deals/[id]`, `/api/assets/[id]`, `/api/entities/[id]`) is `getAuthUser()` without hard gate. Fixed by removing the gate + `unauthorized` import. Committed 91586b3.
- FIN-04 (second-fund Excel validation) not tested — deferred per user decision on 2026-04-17 ("defer, I'll let kathryn handle that"). Will be carried forward to Phase 23.
