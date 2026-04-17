---
plan: "22-12"
status: complete
completed: 2026-04-17
---

# Plan 22-12 — SUMMARY

**One-liner:** Add Asset now supports multi-entity allocation (e.g., 60/40 across two funds) with per-row cost-basis splitting; sum-to-100 validation enforced client- and server-side; HTML min/max guardrails added to structured number fields (Ownership %, Share Count, Projected IRR/Multiple) on both Add and Edit forms.

## What shipped

- `CreateAssetSchema` — `allocations: Array<{entityId, allocationPercent}>` field with a refine chain: sum = 100 ± 0.01, no duplicate entityIds. Legacy single-entity shape (`entityId` + `allocationPercent`) still accepted for back-compat.
- `POST /api/assets` — derives per-allocation `costBasis` as `totalCostBasis × allocationPercent/100`, creates multiple `AssetEntityAllocation` rows when `allocations` is passed.
- Add Asset form — "Entity Allocations *" fieldset with repeatable rows (Entity select + Allocation %), + Add entity button, × remove button per row (only shows when > 1 row), running total indicator (amber when ≠ 100).
- Client submit validation mirrors server (sum = 100, no duplicates, at least one entity).
- HTML `min`/`max`/`step` on number inputs (Projected IRR, Projected Multiple, Ownership %, Share Count) on both Add and Edit. Prevents scroll-wheel / spinner crossing sane bounds.

## Evidence

- `npm run build` — PASSED, 116/116 pages generated, zero TS errors.
- Browser: Add Asset modal shows three fieldsets ("Entity Allocations *", "Review & Ownership", "Ownership & Financials"); running total shows "Total: 100.00%" at open.
- `POST /api/assets` with 60% + 40% split: response confirmed 2 AssetEntityAllocation rows created, Atlas Fund I $6M / Atlas Fund II $4M (cost basis split proportionally from $10M total).
- `POST /api/assets` with 70% + 20% (sums to 90%): rejected with `400` and `{fieldErrors: {allocations: ["Allocation percentages must sum to 100"]}}`.
- Test asset cleaned up via DELETE.

## Known follow-up (still on the punch list)

- **Gap #4 (Projected Metrics JSON blob):** per-asset-class rich projection blob (cap rate, yield-to-maturity, etc.) still not exposed.
- **Gap #6 (Valuation audit trail):** approved-valuation history view.
- **Gap #7 (type-conditional string fields):** fields like Cap Rate, Occupancy, Maturity are stored as strings — real range validation requires a type refactor. Deferred.
- **Gap #8 (end-to-end integrity loop):** Kathryn / Phase 23.
- Multi-entity allocation editing on the Edit Asset modal is still handled via the asset-overview-tab's existing allocation panel — not moved into the modal.
