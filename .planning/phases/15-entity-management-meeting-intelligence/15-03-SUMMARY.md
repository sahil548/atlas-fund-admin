---
plan: "15-03"
status: complete
started: 2025-03-09
completed: 2025-03-09
---

## What Was Built

### Task 1: Post-Formation Checklist + Regulatory Schemas (TDD)

**Tests:** Un-skipped ENTITY-03 tests in `phase15-entity-hierarchy.test.ts` for regulatory filing schema validation.

**Schemas:** Added `RegulatoryFilingSchema`, `JurisdictionRecordSchema`, and `EntityRegulatoryDataSchema` to `src/lib/schemas.ts`.

**Post-Formation Checklist:** Created `src/components/features/entities/post-formation-checklist.tsx`:
- Context-aware "What's Next" banner on entity detail overview tab
- Deal-linked vehicles: SEC filings → add investors → issue capital call → verify funding → close on deal
- Standalone vehicles: add investors → configure waterfall → upload docs → connect QuickBooks → add filings
- Items already completed are pre-checked with links to relevant tabs

### Task 2: Regulatory Filings Tab

**Regulatory Tab:** Created `src/components/features/entities/regulatory-filings-tab.tsx`:
- Compliance Summary section with CTA Classification and FinCEN ID editable fields
- Jurisdictions section with status, registered-with agency, authorization date, filing number
- Filings table with type, jurisdiction, dates, status, filing number, notes, document attachment
- Add/edit/delete for both jurisdictions and filings
- Replaces raw JSON display on Regulatory tab

**Entity Detail Wiring:** Updated `src/app/(gp)/entities/[id]/page.tsx`:
- Imported PostFormationChecklist and RegulatoryFilingsTab
- Rendered checklist in overview tab for FORMED/REGISTERED entities
- Replaced raw JSON regulatory display with structured RegulatoryFilingsTab

## Self-Check

- [x] Post-formation checklist renders on overview tab
- [x] Deal-linked vs standalone logic differentiates checklist items
- [x] Regulatory tab shows structured form instead of raw JSON
- [x] CTA Classification and FinCEN ID fields are editable
- [x] Filing and jurisdiction CRUD operations work

## Key Files

### key-files.created
- src/components/features/entities/post-formation-checklist.tsx
- src/components/features/entities/regulatory-filings-tab.tsx

### key-files.modified
- src/app/(gp)/entities/[id]/page.tsx
- src/lib/schemas.ts
- src/lib/__tests__/phase15-entity-hierarchy.test.ts
