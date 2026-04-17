---
plan: "22-10"
status: complete
completed: 2026-04-17
commits: []
---

# Plan 22-10 — SUMMARY

**One-liner:** Closed two post-deploy gaps — existing production assets now show the type-conditional edit fieldset via fallback detection + upsert on save; Add Asset form now matches Edit Asset parity (Entry Date, Projected IRR/Multiple, per-type scalar fieldset).

## What shipped

- `CreateAssetSchema` extended with `entryDate`, `projectedIRR`, `projectedMultiple`, and the `typeDetails` discriminated union (RE / Credit / Operating / LP).
- `POST /api/assets` accepts the new fields and creates the appropriate nested detail record (RealEstate / Credit / Equity / FundLP) on asset creation.
- `PUT /api/assets/[id]` replaces the "Type mismatch: asset has no X details record → 400" block with `upsert: { create, update }` on each nested detail relation. Existing assets without detail records can now populate them on first edit instead of being silently blocked.
- `detectAssetKind` in Edit Asset form falls back to `assetClass` / `capitalInstrument` / `participationStructure` when no detail record exists. Existing prod assets created before the child tables were populated now surface the correct fieldset.
- `create-asset-form.tsx` rewritten to mirror Edit Asset: Entry Date (defaults to today), Projected IRR (%), Projected Multiple (x), type-conditional fieldset that tracks the user's Asset Class / Instrument / Participation selection.

## Evidence

- `npm run build` — PASSED, zero TypeScript errors, 116/116 pages generated.
- Created a Real Estate asset via POST without `typeDetails` → response confirmed `realEstateDetails: null` (simulating a legacy prod asset).
- Opened Edit Asset on that legacy-style asset → "Real Estate Details" fieldset visible with all 8 RE fields (Property Type, Square Feet, Occupancy, Cap Rate, NOI, Rent / Sqft, Debt, Debt DSCR).
- Submitted PUT with `{ typeDetails: { kind: "REAL_ESTATE", propertyType, capRate, occupancy } }` → response confirmed `realEstateDetails.propertyType = "Industrial Warehouse"`, `capRate = "7.5%"`, `occupancy = "92%"`. Upsert confirmed.
- Opened Add Asset modal on `/assets` → Entry Date pre-filled to 2026-04-17, Projected IRR / Projected Multiple labels present, type-conditional fieldset renders (default "OWNERSHIP & FINANCIALS" for Operating Business default).
- Test asset cleaned up via DELETE.

## Known follow-up

- Validation guardrails (negative cap rate, occupancy > 100%, maturity before entry date) still not enforced. Out of scope here — deferred.
- End-to-end "change cost basis → LP metrics shift" integrity loop still untested. Owner: Kathryn / Phase 23.
