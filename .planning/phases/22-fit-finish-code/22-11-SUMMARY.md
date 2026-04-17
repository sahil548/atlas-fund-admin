---
plan: "22-11"
status: complete
completed: 2026-04-17
---

# Plan 22-11 — SUMMARY

**One-liner:** Added the asset review schedule (`reviewFrequency` + `nextReview`), ownership tracking (`ownershipPercent` + `shareCount`), and board-seat toggle (`hasBoardSeat`) to both the Add Asset and Edit Asset modals. Same fallback-ship pattern as 22-10: model fields existed, API accepted them, UI just didn't expose them.

## What shipped

- `UpdateAssetSchema` + `CreateAssetSchema` extended with five new fields (`reviewFrequency`, `ownershipPercent`, `shareCount`, `hasBoardSeat`, and `nextReview` added to Create).
- POST `/api/assets` persists all five on creation.
- PUT `/api/assets/[id]` accepts them through the existing `...rest` pattern.
- Edit Asset modal renders a new "Review & Ownership" fieldset between Projected IRR/Multiple and the type-conditional section.
- Add Asset modal renders the same fieldset with defaults.
- `REVIEW_FREQUENCIES` constant (None / Quarterly / Semi-annual / Annual) shared between both forms.

## Evidence

- `npm run build` PASSED, zero TS errors, 116/116 pages generated.
- PUT `/api/assets/asset-4` with `{ nextReview, reviewFrequency: "quarterly", ownershipPercent: 75.5, shareCount: 25000, hasBoardSeat: true }` → response confirmed all 5 fields persisted.
- Edit Asset modal on 123 Industrial Blvd: fieldsets rendered in order `["Review & Ownership", "Real Estate Details"]`; all 5 review/ownership controls present.
- Add Asset modal: fieldsets rendered in order `["Review & Ownership", "Ownership & Financials"]`; all 5 review/ownership controls present.

## Interaction with existing "Mark Reviewed" button

The asset Overview tab already has a `Mark Reviewed` button that auto-advances `nextReview` based on `reviewFrequency`. Before 22-11, `reviewFrequency` was only settable via seed data — now users can pick it from the Edit modal dropdown, which makes the Mark-Reviewed flow work end-to-end for the first time.

## Known follow-up (still open)

- **Gap #4 (Projected Metrics JSON blob):** per-asset-class rich projection blob (cap rate, yield-to-maturity, etc.) still not exposed. Deferred — own plan if needed.
- **Gap #5 (Multi-entity allocation on Create):** Add Asset still takes one entity + one %. Multi-fund splits require edit after create.
- **Gap #6 (Valuation audit trail):** approved-valuation history not visible.
- **Gap #7 (Validation guardrails):** occupancy > 100%, negative cap rate, maturity-before-entry etc. all accepted.
- **Gap #8 (End-to-end integrity loop):** changing cost basis → entity NAV → LP statement → waterfall still untested. Kathryn / Phase 23 territory.
