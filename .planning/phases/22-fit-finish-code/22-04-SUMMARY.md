---
phase: 22
plan: "04"
subsystem: assets
tags: [edit-modal, sub-modals, lease, credit-agreement, valuation, tooltip, cost-basis, obs-10, obs-12, obs-24, obs-25]
dependency_graph:
  requires: [22-01, 22-02, 22-03]
  provides: [asset-edit-completeness, lease-edit, credit-agreement-edit, valuation-edit, allocation-tooltip, cost-basis-fix]
  affects: [asset-detail-page, entity-overview-tab, asset-contracts-tab]
tech_stack:
  added: []
  patterns:
    - discriminatedUnion Zod schema for type-conditional asset update
    - detectAssetKind() — kind detection from which one-to-one details record exists
    - Sub-modal edit pattern for child records (lease, credit agreement, valuation)
    - Tooltip via HTML title attribute on circular badge element
    - Derived cost-basis: allocationPercent/100 * asset.costBasis when allocation.costBasis is null
key_files:
  created:
    - src/lib/__tests__/api-assets-put.test.ts
    - src/app/api/assets/[id]/leases/[leaseId]/route.ts
    - src/app/api/assets/[id]/credit-agreements/[agreementId]/route.ts
    - src/components/features/assets/edit-lease-form.tsx
    - src/components/features/assets/edit-credit-agreement-form.tsx
    - src/components/features/assets/edit-valuation-form.tsx
  modified:
    - src/lib/schemas.ts
    - src/app/api/assets/[id]/route.ts
    - src/components/features/assets/edit-asset-form.tsx
    - src/components/features/assets/asset-contracts-tab.tsx
    - src/app/(gp)/assets/[id]/page.tsx
    - src/components/features/entities/tabs/entity-overview-tab.tsx
decisions:
  - "All AssetRealEstateDetails/CreditDetails/EquityDetails/FundLPDetails fields are String? in Prisma — Zod schemas use z.string().optional() not numbers"
  - "Asset has no 'type' enum field — kind detected by which one-to-one details record is non-null"
  - "EditValuationForm shows amber banner and disables fields for APPROVED valuations but still allows status change"
  - "Entity overview fair value column shows proportional share (allocationPercent/100 * asset.fairValue) for consistency with cost-basis column"
  - "Valuation edit buttons added as a history table on the performance tab — more visible than inline on chart"
metrics:
  duration: "~90 minutes (across two context windows)"
  completed: "2026-04-17"
  tasks_completed: 3
  files_created: 6
  files_modified: 6
  commits: 2
---

# Phase 22 Plan 04: Asset Correctness Sub-Modals — Summary

Ships asset correctness fixes from walkthrough observations 10, 12, 24, and 25.

**One-liner:** Expanded Edit Asset modal with type-conditional sections + sub-modals for lease/credit/valuation + allocation tooltip + proportional cost-basis display.

---

## What Was Built

### Task 1: Expand Edit Asset Modal (Obs 10)

Rewrote `edit-asset-form.tsx` to surface previously hidden editable fields:

- **Common scalars added:** `name`, `entryDate` (date picker), `costBasis` (CurrencyInput), `fairValue`
- **Type-conditional sections:** `detectAssetKind()` reads which one-to-one details record exists and renders the matching `<fieldset>` — Real Estate fields (propertyType, squareFeet, occupancy, noi, capRate, etc.), Private Credit fields (borrowerName, debtType, interestRate, etc.), Operating Equity fields (instrument, ownership, revenue, ebitda, etc.), and Fund LP fields (gpName, vintage, strategy, commitment, etc.)
- **API expansion:** `UpdateAssetSchema` replaced with a discriminatedUnion version supporting `typeDetails: { kind: "REAL_ESTATE" | "PRIVATE_CREDIT" | "OPERATING" | "LP_INTEREST", ...fields }`. PUT `/api/assets/[id]` fetches the existing asset, validates kind matches, then builds a nested Prisma update.
- **TDD:** 20 unit tests written RED then GREEN for the expanded schema.

Key discovery: all detail model fields are `String?` (not numeric), so Zod schemas use `z.string().optional()`.

### Task 2: Sub-modals for Lease, Credit Agreement, Valuation (Obs 12)

**New API routes:**
- `GET/PUT /api/assets/[id]/leases/[leaseId]` — validates with `UpdateLeaseSchema`, converts date fields
- `GET/PUT /api/assets/[id]/credit-agreements/[agreementId]` — validates with `UpdateCreditAgreementSchema`, converts `maturityDate`

**New modal components:**
- `EditLeaseForm` — all Lease fields (tenantName, leaseType, baseRentMonthly/Annual, dates, CAM, security deposit, TI allowance, status, notes)
- `EditCreditAgreementForm` — borrowerName, agreementType, principal fields, interest rate type/fixed rate/reference rate/spread, maturityDate, subordination, status
- `EditValuationForm` — valuationDate, method, fairValue, MOIC, notes, status. DRAFT-aware: shows amber banner and disables all fields except status when valuation is APPROVED

**Wiring:**
- `asset-contracts-tab.tsx`: Edit buttons on each lease card (absolute top-right), Edit column in lease table, Edit buttons on each credit agreement card
- `page.tsx`: Full valuation history table on performance tab with per-row Edit buttons, `EditValuationForm` modal added to modal block

### Task 3: Allocation Tooltip + Cost-Basis Fix (Obs 24, 25)

**Obs 24 — Tooltip:**
Added a circular `?` badge with `title="Percentage of each asset owned by this fund vehicle."` next to the "Asset Allocations" heading in `entity-overview-tab.tsx`.

**Obs 25 — Cost-basis zeros:**
`AssetEntityAllocation.costBasis` is nullable. Seed data does not populate it.

Fix: `const derivedCostBasis = a.costBasis ?? ((a.allocationPercent / 100) * (a.asset.costBasis || 0));`

Bonus: Fair Value column also fixed to show proportional share `(allocationPercent / 100) * asset.fairValue` for internal consistency.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Asset has no `description` field**
- **Found during:** Task 1 (schema investigation)
- **Issue:** Plan included `description` in UpdateAssetSchema and PUT handler destructuring, but `prisma/schema.prisma` has no `description` field on the Asset model
- **Fix:** Removed `description` from schema and API handler before committing
- **Files modified:** `src/lib/schemas.ts`, `src/app/api/assets/[id]/route.ts`

**2. [Rule 1 - Bug] All detail fields are String? not Float/Int**
- **Found during:** Task 1 (schema investigation)
- **Issue:** Plan showed numeric fields (capRate as number, spread as number) but Prisma stores them as `String?`
- **Fix:** All Zod detail schemas use `z.string().optional()` matching actual storage format
- **Files modified:** `src/lib/schemas.ts`

**3. [Rule 1 - Bug] git add fails on bracket paths in zsh**
- **Found during:** Task 1 commit
- **Issue:** `git add src/app/api/assets/[id]/route.ts` fails with "no matches found" in zsh
- **Fix:** Quote paths with brackets: `git add "src/app/api/assets/[id]/route.ts"`

**4. [Rule 2 - Enhancement] Entity fair value column also proportional**
- **Found during:** Task 3 implementation
- **Issue:** The entity overview fair value column showed full asset fair value, not the vehicle's proportional share — internally inconsistent with cost-basis column
- **Fix:** Changed to `(allocationPercent / 100) * asset.fairValue` for consistency

---

## Self-Check

### Files Exist

- src/app/api/assets/[id]/leases/[leaseId]/route.ts — FOUND
- src/app/api/assets/[id]/credit-agreements/[agreementId]/route.ts — FOUND
- src/components/features/assets/edit-lease-form.tsx — FOUND
- src/components/features/assets/edit-credit-agreement-form.tsx — FOUND
- src/components/features/assets/edit-valuation-form.tsx — FOUND
- src/lib/__tests__/api-assets-put.test.ts — FOUND

### Commits Exist

- 39af1fe — feat(22-04): Task 1 — expand Edit Asset modal common scalars + type-conditional section
- 7f79a01 — feat(22-04): add sub-modals for lease, credit agreement, and valuation editing
- 827ba98 — feat(22-04): add allocation % tooltip and fix entity overview cost-basis display

### Build

`npm run build` — zero errors, all new routes appear in the build manifest.

## Self-Check: PASSED
