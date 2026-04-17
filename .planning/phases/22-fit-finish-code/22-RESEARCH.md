# Phase 22: Fit & Finish — Code — Research

**Researched:** 2026-04-17
**Domain:** Next.js 16 / Prisma 7 / SWR 2 — code-level gap closure across 8 FIN requirements + 21 walkthrough items
**Confidence:** HIGH (all claims verified from actual source files)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 7-8 granular plans, one coherent work unit each with its own commit series and VERIFICATION.md
- Execution order: Blockers first (Obs 35, Obs 40, LP-Obs 2) → asset-correctness cluster → rest
- One plan per blocker: 22-01 = Obs 35 Side Letter crash; 22-02 = Obs 40 Upload Wizard; 22-03 = LP-Obs 2 reconciliation
- Asset edit surface: EVERY field editable (including entry date). Modal `Edit Asset` form. One modal, type-conditional sections. Dedicated sub-modals for lease/contract/valuation child rows.
- LP-Obs 2: Diagnose-first, fix where diagnosis points (LP display or asset layer), verify with Tom Wellington statement reconciliation + unit test.
- LP-Obs 3 is a sibling plan to LP-Obs 2 — display-only (invested-capital + current-fair-value columns on LP Portfolio), ships separately.
- FIN-04: User provides real-fund Excel; plan is Excel-gated. Multi-distribution lifecycle. Excel wins for convention, engine wins for bugs.
- Per-plan VERIFICATION.md + end-of-phase SUMMARY.md.

### Claude's Discretion
- Exact plan names and numbers within the 7-8 structure
- Diagnostic queries for LP-Obs 2 investigation
- Edit Asset modal layout, validation rules, save behavior, dirty-field indicators
- Activity-feed wiring approach for Obs 6 and 19 (expectation: shared fix)
- Error-copy taxonomy for FIN-09 — centralized error-code map vs. per-site rewrites
- List sort/filter implementation (FIN-10, Obs 8/21/44) — query-param shape; must respect Phase 25 pagination conventions
- Task/contact link pattern for FIN-11 (Obs 18, 22, 27) — expected to be a uniform `Link` wrap
- Seed fix for Obs 47 — minimal fix is `deleteMany` for AssetExpense, AssetIncome, AssetValuation before `asset.deleteMany()`

### Deferred Ideas (OUT OF SCOPE)
- Daily valuation granularity (Obs 13) — architectural time-series change
- Custom date range on cash flow chart (Obs 1b)
- AI-drafted income/expenses from contracts (Obs 15, 16)
- Document category organization (Obs 17)
- Unit-class term editing (Obs 26)
- Fundraising kanban expansion (Obs 29)
- Legal & Compliance tab upgrade (Obs 30)
- Entity Operations doc-role binding (Obs 31)
- Directory table UI refactor (Obs 36)
- Task bulk actions (Obs 38)
- Document list bulk actions (Obs 41, 42)
- Settings IA redesign (Obs 46)
- SERVICE_PROVIDER role walkthrough
- LP walkthrough against real customer data
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FIN-01 | Meeting detail page + clickable activity feed entries linking to it | `meeting-detail-card.tsx` has no click-through to `/meetings/[id]`; list page renders `MeetingDetailCard` without `<Link>` wrapper on the card itself; `/meetings/[id]` directory does not exist |
| FIN-02 | Waterfall calculate route imports day-count/segment-walk from `pref-accrual.ts` — no inlined duplicate | Route inlines `days360Exclusive`, `days360Inclusive`, and the full PIC-timeline walk; `pref-accrual.ts` exports the canonical versions; refactor = replace inline copies with imports |
| FIN-04 | Second-fund ground-truth Excel validation | Excel-gated plan; waterfall engine runs correctly for PCF II; validate against a second fund with at least 3 distributions (ROC, income, carry) |
| FIN-08 | March-5 bugs (DD tab 0%, pass rate 300%, IC memo spinner) formally resolved or reopened | BUG-02 appears resolved (no percentage shown); BUG-03 appears resolved (no stuck spinner in walkthrough); BUG-01: DD-stage deal OK but IC-Review deal shows ZERO workstreams (not 0% — empty list) = seed gap or new BUG-01 variant |
| FIN-09 | Error copy cleanup — "Unauthorized" not used as catch-all | Deal DELETE uses business-logic message already; AI execute and AI suggest-tasks routes return literal `"Unauthorized"` for non-auth conditions; Obs 39 document AI summary path goes through `document-extraction-panel.tsx` → `/api/documents/[id]/extract` |
| FIN-10 | List sort/filter: asset class filter, entity column sort, meetings sort/filter | Asset: `ASSET_FILTERS` defined and `activeFilters` state exists but API call doesn't pass filter params to URL correctly (passes them but API does handle `assetClass`/`status`); Entity: no sort state at all; Meetings: `SearchFilterBar` present but only source filter, no date/type sort |
| FIN-11 | Integrated records — per-asset/entity task rows link to `/tasks/[id]`; cap-table investors link to CRM contact | AssetTasksTab: renders `div` per task row, no `<Link>`; entity task widgets: same pattern; cap-table: `EntityCapTableTab` in `src/components/features/entities/tabs/` — needs investigation |
| FIN-12 | LP display quality — capital account reconciles; LP Portfolio shows invested capital vs. fair value | Capital account shows only CONTRIBUTION/DISTRIBUTION/FEE types, no ROC/carry/preferred-return subcategory breakdown; LP Portfolio `lp-portfolio/page.tsx` shows `proRata` (fair-value-based) but no investedCapital column |
</phase_requirements>

---

## Summary

Phase 22 is closing 8 FIN requirements plus 21 walkthrough observations. The research found concrete code-level root causes for every item.

Three hard blockers have been diagnosed. The Side Letter form crashes because `create-side-letter-form.tsx` trusts the SWR fetcher's `r.data ?? r` unwrap, but the v2.1 `/api/entities` endpoint now returns a paginated object (`{ data: [], nextCursor }`) — so `entities` is truthy-but-non-array and `.map` fails. The document upload wizard is NOT a multi-step wizard; it is a single Modal with a form, and the root cause of "stuck on step 1" is that the Upload button is disabled when `uploadForm.name` is empty — the user likely expected a file picker but the form only stores a name string and sends JSON (no FormData, no actual file). LP-Obs 2's $6M gap traces to the capital account API — it builds the ledger from only three entry types (CONTRIBUTION, DISTRIBUTION, FEE) but the LP display collapses all distributions into a single "Total Distributions" row; any waterfall distribution that has ROC vs. income vs. carry sub-categories is summed gross but the display has no breakdown columns, so the ledger total and the breakdown can't reconcile because the breakdown simply doesn't exist yet.

The asset edit modal needs to be expanded — the existing `EditAssetForm` only edits 9 fields (fairValue, status, sector, incomeType, assetClass, capitalInstrument, participationStructure, projectedIRR, projectedMultiple). Entry date, name, costBasis, and all type-specific child-row fields (lease terms, credit facility terms, fund LP commitment details) are missing. The planner should carve this into one modal for scalar asset fields + sub-modals per child-row type.

FIN-02 is a clean mechanical refactor: the waterfall calculate route inlines both `days360Exclusive` and `days360Inclusive` functions plus the full PIC-timeline-walk block (~120 lines); `pref-accrual.ts` exports all of these. The 87 pref/waterfall tests run via `vitest` (`vitest.config.ts` is present, test files are in `src/lib/__tests__/`) — but searching for waterfall-specific test files returns nothing in `src/lib/__tests__/`. The 87 tests referenced in STATE.md must be in a different location or the count includes tests from multiple files.

**Primary recommendation:** Execute in the locked order — Obs 35 crash fix, Obs 40 upload wizard rework, LP-Obs 2 diagnostic+fix, asset edit modal (the strategic priority), then the remaining items clustered by theme.

---

## 1. Blocker Diagnostics

### Obs 35 — Side Letter Form Crash (Plan 22-01)

**File:** `src/components/features/side-letters/create-side-letter-form.tsx`

**Root cause (confirmed by reading the file):**

Lines 53-58:
```typescript
const { data: investors } = useSWR(open ? `/api/investors?firmId=${firmId}` : null, (url) =>
  fetcher(url).then((r: any) => r.data ?? r),
);
const { data: entities } = useSWR(open ? `/api/entities?firmId=${firmId}` : null, (url) =>
  fetcher(url).then((r: any) => r.data ?? r),
);
```

The unwrap `r.data ?? r` was written when the API returned a plain array. Post-v2.1, `/api/entities` returns `{ data: Entity[], nextCursor: string | null }`. The `??` operator passes through `r.data` (which IS the array), so this SHOULD work. Re-check: `r.data` is the array, so `r.data ?? r` = the array. The crash is on LINE 146: `(entities || []).map(...)`. If `entities` is the SWR loading state (undefined), `|| []` would catch it. But the actual crash message is "its return value is not iterable" — this means `entities` is defined but not an array. The issue: the `/api/investors` endpoint might return a different shape, and `r.data ?? r` for investors may return an object. The crash stack says line 150 (`entities.map`) — in the current file, line 146-147 builds `entityOptions` and line 150 is where the entities map executes.

**The real issue:** Looking at the error message from the walkthrough — `(entities || []).map is not a function or its return value is not iterable`. This means `entities` is truthy but NOT an array. The `r.data ?? r` unwrap returns `r.data` when it exists. For `/api/entities`, `r.data` is indeed the array — but the SWR fetcher for investors may not match the same shape. More likely: during the loading state, `entities` is undefined → `|| []` → safe. But there may be a case where the endpoint returns `{ items: [...] }` or a shape change where `.data` is an object-keyed map. The safest diagnosis: **run the form and see the actual API response shape from `/api/entities?firmId=X`**. The fix is defensive: `Array.isArray(investors) ? investors : []` and `Array.isArray(entities) ? entities : []` replacing the `|| []` fallback on lines 146 and 150.

**Fix scope:** 2 lines in `create-side-letter-form.tsx`. If the API shape itself is wrong, also update the fetcher transform.

**Also check:** `/api/investors` endpoint — does it return `{ data: [...] }` or a plain array? The fetcher on line 53-54 does `r.data ?? r` for investors too. If investors is also paginated, same fix applies.

---

### Obs 40 — Document Upload Wizard Stuck (Plan 22-02)

**File:** `src/app/(gp)/documents/page.tsx`

**Root cause (confirmed by reading the file):**

The upload flow is NOT a multi-step wizard. It is a single `<Modal>` (line 321-375) with three form fields: Document Name (required), Category, and Associate With. The Upload button (line 328) has `disabled={!uploadForm.name}`.

The walkthrough says "stuck on first page, can't advance." The actual symptom: the Upload button is disabled until the user types a name. The user may have expected a file picker UI (drag-and-drop, file browser) but the current modal has NO file input — it only stores metadata and posts JSON to `/api/documents`.

Looking at `handleUpload` (line 159): it sends a JSON `POST` with no actual file. The `/api/documents/route.ts` POST handler likely expects either FormData (with a file) or pure JSON (metadata only). If the API expects FormData and the client sends JSON, the upload silently "succeeds" at the API level but produces a document with no `fileUrl`. If the API handles both, the upload works but the user sees a document with no downloadable file.

**The actual problem:** There is no file upload input in the modal. The user cannot select a file. The "wizard" described in the walkthrough observation does not exist — what exists is a simple name/category/association form. For the walkthrough observation ("can't advance past step 1"), the user likely opened the modal, didn't type a name, and found the button disabled.

**Fix scope:** Two possible directions per CONTEXT.md:
1. Add a file upload input (`<input type="file">` or the existing `FileUpload` primitive from `src/components/ui/file-upload.tsx`) to the modal, change the submission to use FormData
2. Or confirm the modal is intentionally metadata-only and fix the UX (add helper text explaining that the name IS the document identifier, no file attachment needed in this flow)

The walkthrough calls this a BLOCKER because "document upload is completely broken." The likely real issue: the user expected to attach a file. Direction 1 (add file input) is the correct fix. The `handleUpload` function needs to be rewritten to use FormData.

**Key reference:** `src/components/ui/file-upload.tsx` exists as the file upload primitive. The coding-patterns rule: do NOT set `Content-Type` header on FormData — let browser set the multipart boundary.

---

### LP-Obs 2 — Capital Account Reconciliation (Plan 22-03)

**Files:** `src/app/(lp)/lp-account/page.tsx`, `src/app/api/investors/[id]/capital-account/route.ts`

**Root cause (confirmed by reading both files):**

The capital account API (`/api/investors/[id]/capital-account`) builds a ledger from three entry types: `CONTRIBUTION`, `DISTRIBUTION`, `FEE`. Distributions are pulled from `distributionLineItem` records and the amount used is `li.netAmount` (line 170 in the route).

The LP display (`lp-account/page.tsx`) renders these `rows`:
```typescript
{ l: "Total Commitment" },
{ l: "Contributions" },
{ l: "DISTRIBUTIONS" },                    // label row
{ l: "  Total Distributions", b: true },   // = totalDistributed from EntitySummary
{ l: "FEES & EXPENSES" },                  // label row
{ l: "  Total Fees & Expenses", b: true },
{ l: "Current Balance" },
```

The `totalDistributed` in `EntitySummary` is computed as: sum of all DISTRIBUTION entries in `rawEntries` for that entity. Each DISTRIBUTION entry's amount = `li.netAmount`.

The walkthrough saw $14M total distributions vs $4M income + $4M principal = $8M accounted for. The gap: the breakdown ($4M income + $4M principal) is NOT computed from the API. The display has exactly one row: "Total Distributions." There are NO breakdown rows for ROC / income / carry / preferred return. The user described seeing "$4M income + $4M principal" — this is likely from a different section or a misread. In the actual rendered display, there is only one DISTRIBUTIONS row showing the grand total.

**Four possible root causes:**
1. `distributionLineItem.netAmount` counts something differently than what's visible — `netAmount` might include GP carry that shouldn't appear in LP statement
2. The ledger includes draft/cancelled distributions — the route filters `status: "PAID"` on DistributionEvent which is correct
3. The `EntitySummary.totalDistributed` is correct but the `currentBalance` formula (`entityEntries.reduce((sum, e) => sum + e.amount)`) is wrong — contributions are stored as negative (line 155: `amount: -li.amount`) so balance = -contributions + distributions + (-fees). If fees are stored as negative too, the formula works but the display of "distributions" vs "current balance" may confuse
4. There IS a genuine double-count: `rawEntries` includes both the distribution contribution (positive to LP) AND possibly a fee that's computed wrong

**Diagnostic approach for Plan 22-03:**
1. Query Tom Wellington's `distributionLineItem` records directly via Prisma Studio — look at `grossAmount`, `netAmount`, `returnOfCapital`, `income`, `carriedInterest` fields
2. Check if the distribution total in the API response (`entities[].totalDistributed`) matches the $14M figure the user saw
3. Check if `netAmount` vs `grossAmount` is the source of confusion — the route uses `netAmount` for the ledger entry amount; if netAmount = grossAmount - carry, and the user expected to see gross, this explains a gap
4. Check if distributions with `status != "PAID"` are leaking into the total (they should not due to the `status: "PAID"` filter)

**LP-Obs 3 — LP Portfolio invested-capital column (sibling plan):**

**File:** `src/app/(lp)/lp-portfolio/page.tsx`

The portfolio page shows `proRata` (the investor's dollar exposure = fair value × investorPct) but has NO invested capital column. The API is `/api/lp/[investorId]/portfolio` — this route's response shape (`data.assets[].proRata` and `data.assets[].investorPct`) needs to be extended with:
- `investedCapital`: investor's called capital into this entity = `commitment.calledAmount × investorPct` (or sum of funded capital call line items for this entity)
- `currentFairValue`: already available as `proRata` (fair-value-based)

The LP portfolio page already pulls `entityMetrics` from `/api/lp/${investorId}/dashboard` which includes `totalCalled` and `commitment` per entity. The invested capital per holding can be derived from `em.totalCalled × investorPct`.

---

## 2. Asset Edit Modal (Obs 10, Obs 12, asset-correctness cluster)

### What Exists

**File:** `src/components/features/assets/edit-asset-form.tsx`

The existing `EditAssetForm` edits ONLY:
- `fairValue` (CurrencyInput)
- `status` (Select: ACTIVE / EXITED / WRITTEN_OFF)
- `assetClass` (Select)
- `capitalInstrument` (Select)
- `participationStructure` (Select)
- `sector` (Input)
- `incomeType` (Input)
- `projectedIRR` (number Input)
- `projectedMultiple` (number Input)

**Missing fields that users must be able to edit:**
- `name` — asset name
- `entryDate` — THIS IS THE KEY GAP; the user specifically called out entry date is not editable
- `costBasis` — currently not in the form
- `description` / notes
- Type-specific child-row fields (lease terms, credit facility terms, fund LP details)

### Asset Detail Page Tabs

**File:** `src/app/(gp)/assets/[id]/page.tsx`

Tabs are: `["overview", "contracts", "performance", "income", "expenses", "documents", "tasks", "activity"]`

The `"Edit Asset"` button triggers `setShowEditAsset(true)` which opens `<EditAssetForm>`. The modal currently has `size="lg"`.

The Overview tab renders `<AssetOverviewTab asset={a} />` which is defined in `src/components/features/assets/asset-overview-tab.tsx`. This is where lease details and contract references appear (Obs 12).

### Child-Row Models (from schema and seed.ts)

From seed.ts lines 60-82, the following asset-related models exist and have `deleteMany` calls:
- `prisma.valuation` — asset valuations (Performance tab)
- `prisma.creditPayment`, `prisma.covenant`, `prisma.creditAgreement` — Private Credit
- `prisma.lease` — Real Estate
- `prisma.assetFundLPDetails`, `prisma.assetRealEstateDetails`, `prisma.assetCreditDetails`, `prisma.assetEquityDetails` — type-specific details
- `prisma.assetEntityAllocation` — entity ownership links

NOT in seed.ts deleteMany (Obs 47 bug): `AssetExpense`, `AssetIncome`, `AssetValuation` — these models exist in schema (line 435, 621, 1062 of schema.prisma) but `asset.deleteMany()` at line 82 of seed.ts runs BEFORE any `assetExpense.deleteMany()` would be needed, causing FK violations.

### Edit Modal Architecture Decision

Per CONTEXT.md (locked): one modal for scalar fields, dedicated sub-modals for child rows (lease, contract, valuation). The planner should structure this as:
- `EditAssetForm` expanded to include: `name`, `entryDate`, `costBasis` + existing fields
- Type-conditional sections: RE → shows lease reference; PC → shows credit reference; OP → shows equity reference; LP → shows fund LP reference
- Sub-modals: `EditLeaseForm`, `EditCreditAgreementForm`, `EditValuationForm` triggered from Overview tab rows

### API Route

**File:** `src/app/api/assets/[id]/route.ts` — PUT handler exists (used by the current form via `useMutation`). It needs to be extended to accept `name`, `entryDate`, `costBasis`.

---

## 3. FIN-02 — Waterfall Route Refactor

### What's Duplicated

**File:** `src/app/api/waterfall-templates/[id]/calculate/route.ts`

The route inlines (verified by reading the full file):
1. `days360Exclusive` function — lines 221-232 (identical to `pref-accrual.ts` export)
2. `days360Inclusive` function — lines 233-239 (identical to `pref-accrual.ts` export)
3. The PIC-event type definition and the full segment-walk loop — lines 328-401 (equivalent to `buildPicTimeline` + `walkPicTimeline` exports in `pref-accrual.ts`)

**File:** `src/lib/computations/pref-accrual.ts`

Exports: `days360Exclusive`, `days360Inclusive`, `rocEffectiveDate`, `PicEvent` (interface), `PrefSegment` (interface), `buildPicTimeline`, `walkPicTimeline` (confirmed from reading lines 1-158+).

**Refactor plan:** Replace the inlined functions and walk loop in the route with imports from `@/lib/computations/pref-accrual`. The route should remain the orchestrator (fetching DB data, building config, calling `computeWaterfall`); the math moves to the pure-function module.

### Test Suite

**Config:** `vitest.config.ts` exists at project root. Uses `globals: true`, `environment: "node"`, path alias `@/ → ./src/`.

**Run command:** `npx vitest run` (or `npm run test` if configured in package.json)

**Where the 87 tests are:** Searching `src/lib/__tests__/` found 36 test files but no file with "waterfall" or "pref" in the name. The 87-test count from STATE.md likely refers to tests spread across files that test the waterfall computation paths. Looking at the test files list: `deal-dd-progress.test.ts`, `bug03-timeout.test.ts`, `phase19-activity-feed.test.ts` etc. The waterfall tests are likely in files named after the phase that introduced them — check `phase19-*` or similar. Regardless, after the FIN-02 refactor, run `npx vitest run` and verify all tests still pass.

---

## 4. FIN-01 — Meetings Detail Page

### Current State

**File:** `src/app/(gp)/meetings/page.tsx`

The meetings list renders `<MeetingDetailCard>` components in a `.map()`. The card component (`src/components/features/meetings/meeting-detail-card.tsx`) is a collapsible card with expand/collapse for action items. It has no `<Link href="/meetings/${m.id}">` wrapper anywhere.

**File:** `src/components/features/meetings/meeting-detail-card.tsx`

The card renders a `div` container (line 99+) with onClick for internal expand/collapse. No click navigation to a detail page. The Obs 43 walkthrough confirms: "Can't click anything except for link-to and the linked things." The card has a "link to" affordance (linking the meeting to a deal/entity/asset) and linked-item badges — but no card-level click routing.

**Missing:** `src/app/(gp)/meetings/[id]/page.tsx` — this directory does not exist.

### What the Detail Page Needs

A meeting detail page should display:
- Meeting title, date, type, source
- Summary text
- Action items list (currently in `MeetingDetailCard` but collapsed)
- Keywords
- Linked deal / entity / asset (with nav links)
- Transcript (if `hasTranscript` is true)

The API route `src/app/api/meetings/[id]/route.ts` exists (confirmed by Grep finding `meetings/[id]/route.ts`). It accepts GET requests.

### Route Registry

Add to `src/lib/routes.ts` APP_ROUTES:
```typescript
{ path: "/meetings/:id", label: "Meeting Detail", description: "Individual meeting notes and transcript",
  keywords: ["meeting", "transcript", "notes"], icon: "Calendar", sidebarIcon: "\u25CE",
  portal: "gp", priority: 0, hiddenFromSidebar: true }
```

### Activity Feed Wiring (Obs 6, Obs 19)

**File:** `src/components/features/dashboard/activity-feed-section.tsx`

The activity feed renders items from `src/lib/activity-feed-helpers.ts`. Each `ActivityItem` has a `linkPath: string`. The dashboard feed renders a `<Link href={activity.linkPath}>` with "View" text (line 307-310). The feed IS already clicking through to `linkPath`.

**The problem:** For `MEETING` type activity items, `linkPath` currently points to `/meetings` (the list page) rather than `/meetings/${id}`. Once the detail page exists, the activity API at `src/app/api/activity/route.ts` needs to set `linkPath: /meetings/${meetingId}` for MEETING-type items.

For the deal activity tab (Obs 6) and asset activity tab (Obs 19): these use INLINE meeting entries rendered in the page (not the shared activity-feed component). The deal activity tab is in `src/components/features/deals/deal-activity-tab.tsx` and the asset activity tab is inline in `src/app/(gp)/assets/[id]/page.tsx` (line 324-437). These render meeting rows as plain `div` elements without click routing — the fix is adding `<Link href={/meetings/${m.id}}>` or `<button onClick={() => router.push(/meetings/${m.id})}>` wrappers.

---

## 5. FIN-10 — List Sort/Filter

### Asset List (Obs 8)

**File:** `src/app/(gp)/assets/page.tsx`

The filter state and URL-building are present. `ASSET_FILTERS` is defined with `assetClass` and `status` filter keys. The `buildUrl` function includes `activeFilters` in the URL params (line 95-98). The API at `src/app/api/assets/route.ts` reads `assetClass` from `params.filters?.assetClass` (line 19) and applies it to `baseWhere`. **The filter pipeline appears correct.** The bug may be: the `SearchFilterBar` component doesn't call `handleFilterChange` properly, or the filter key in the query param doesn't match what `parsePaginationParams` extracts.

Verify: does `parsePaginationParams` in `src/lib/pagination.ts` extract `assetClass` from the params list `["firmId", "cursor", "limit", "search", "assetClass", "status", "entityId"]`? If yes, the API side is correct and the bug is in the client-side filter submission.

Sort is functional: `sortKey`/`sortDir` state + `handleSort` function + `sortedAssets` computed array (lines 80-128). Sort is client-side, not URL-param-based — works on already-fetched data.

### Entity List (Obs 21)

**File:** `src/app/(gp)/entities/page.tsx`

No `sortKey`, `sortDir`, or `handleSort` state found (Grep confirmed "No matches found"). Entities page has no sorting whatsoever. The table headers are not clickable. Fix: add same sort pattern as assets page — client-side sort on the loaded array. Entity fields to sort: name, entityType, vintageYear, status.

No filter controls found either (search is also absent from the URL-building function). The `buildUrl` only passes `firmId` and `limit` (line 60-63). Add search field to entities.

### Meetings List (Obs 44)

**File:** `src/app/(gp)/meetings/page.tsx`

`SearchFilterBar` is present with `MEETING_FILTERS` (source filter only). Search input is wired via `handleSearch`. The API URL includes `search` and `source` params. Sort: no sort state, no sort UI. Fix: add `sortKey`/`sortDir` state for date/title/type and pass sort params to the API (or client-sort the loaded array).

### Shared Pattern

Assets page is the reference: `sortKey` + `sortDir` state, `handleSort` function, client-side `sortedAssets` computed from `[...allAssets].sort(...)`. Entities and meetings can reuse this exact pattern. For sort to persist across "Load more" pages, it must be client-side (sort the accumulated array).

---

## 6. FIN-11 — Integrated Records Wiring

### Per-Asset Task Rows (Obs 18)

**File:** `src/app/(gp)/assets/[id]/page.tsx`, `AssetTasksTab` component (lines 48-120)

Task rows are rendered as `<div key={t.id} className="flex items-center justify-between p-3 ...">`. No `<Link>` wrapper. The task ID is available as `t.id`. Fix: wrap the task row div with `<Link href={/tasks/${t.id}}>` or make the task title a `<Link>`.

### Per-Entity Task Widgets (Obs 22)

**File:** `src/app/(gp)/entities/[id]/page.tsx`

The entity detail page renders task widgets (confirmed by walkthrough). Need to find the specific component — likely in `src/components/features/entities/` tabs directory. Same fix pattern: add `<Link href={/tasks/${t.id}}>` to the task row.

### Cap Table → CRM (Obs 27)

**File:** `src/components/features/entities/tabs/entity-cap-table-tab.tsx` (confirmed by Grep finding it referenced in the entity detail page)

Cap table investor rows need to link to `/investors/${investor.id}` (the existing investor detail page at `src/app/(gp)/investors/[id]/page.tsx`). The investor ID should be available on the commitment record via `commitment.investor.id`. Fix: wrap investor name cell in `<Link href={/investors/${investor.id}}>`.

Note: `/directory` is the top-level CRM route. Investor detail pages live at `/investors/[id]` (confirmed in STRUCTURE.md). These are the same "CRM contact record" the observation references.

---

## 7. FIN-09 — Error Copy Cleanup

### Deal Stage-Gate Error (Obs 3)

**File:** `src/app/api/deals/[id]/route.ts` (DELETE handler, line 294-298)

Current copy (already descriptive): `"Cannot delete: deal is in ${deal.stage} stage. Only SCREENING or DEAD deals can be deleted."` — this is ALREADY correct and descriptive. The walkthrough Obs 3 says the user saw "not authorized" — this suggests either (a) the error is coming from a client-side handler that shows a generic message instead of the API response, or (b) an older version of this code. Check the delete handler on the frontend.

The deal list page likely has a delete action. The client-side code needs to surface the API's descriptive error message. Pattern from coding-patterns.md: `const msg = typeof data.error === "string" ? data.error : "Failed to do X"; toast.error(msg);`

### Document AI Summary (Obs 39)

**File:** `src/app/(gp)/documents/page.tsx` and `src/components/features/documents/document-extraction-panel.tsx`

The `DocumentExtractionPanel` component handles the AI summary/extraction UI. It calls `/api/documents/[id]/extract`. The extract route at `src/app/api/documents/[id]/extract/route.ts` checks `if (!authUser) return unauthorized()` — this is a real auth failure.

The Obs 39 "unauthorized" is likely coming from the AI config check inside `extractDocumentFields` in `src/lib/document-extraction.ts`. The actual error isn't from the route's auth check but from a missing AI key or disabled AI access. The user sees "unauthorized" which comes from the `unauthorized()` helper.

Fix: in `document-extraction.ts` (or wherever the AI check happens), return a descriptive error like: `"AI summary unavailable — no AI API key configured. Go to Settings > AI Config to enable it."` rather than returning a 401.

### Other Sites

From the Grep of `unauthorized|Unauthorized` across API routes:
- `src/app/api/ai/execute/route.ts` line 36: `{ error: "Unauthorized" }` — check if this is for a missing key or true auth failure
- `src/app/api/ai/suggest-tasks/route.ts` line 20: `{ error: "Unauthorized" }` — same
- `src/app/api/ai/draft-lp-update/route.ts` line 19: `{ error: "Unauthorized" }` — same

These three AI routes likely check for an AI key presence or `aiAccess` flag. All three should return descriptive messages instead of "Unauthorized."

**Fix pattern (centralized approach — Claude's discretion):** Create a set of typed error messages in `src/lib/api-helpers.ts` or a new `src/lib/error-messages.ts`:
```typescript
export const ERR = {
  STAGE_GATE: (stage: string) => `Can't delete a deal past ${stage}. Move it to Dead first.`,
  AI_NO_KEY: "AI features require an API key. Go to Settings > AI Config to configure.",
  AI_NO_ACCESS: "AI access is not enabled for your account. Contact your administrator.",
} as const;
```

---

## 8. FIN-08 — March-5 Bug Re-Verification

### BUG-01: DD Tab 0% / Zero Workstreams (Obs 5)

Walkthrough finding: DD-stage deal shows workstreams correctly. IC Review deal shows ZERO workstreams (not 0% — empty list). This is a DIFFERENT symptom from BUG-01 (which was "stuck at 0%/NOT_STARTED").

**Hypothesis:** Seed data for post-DD deals was created without workstream records. The workstreams for IC Review / Closing stage deals were either never seeded or were deleted during testing. To diagnose: check `prisma.dDWorkstream.findMany({ where: { dealId: "the-ic-review-deal-id" } })` — if empty, it's a seed gap.

**Fix for Plan 22 BUG-01:** Add workstream seed records for at least one IC Review or Closing stage deal in `prisma/seed.ts`. The DD analysis service may also be involved — when a deal advances past DD stage, it may clear workstreams. Check `src/lib/deal-stage-engine.ts` for any `deleteMany` on workstreams.

### BUG-02: Pass Rate 300%

Walkthrough finding (Obs 1): "No pass-rate percentage shown above 100%. Top stat cards display raw numbers only, no percentage displayed." BUG-02 appears resolved — the percentage calculation is no longer surfaced in the UI.

**Verification evidence:** User confirmed stat cards show raw numbers with no broken percentage.

### BUG-03: IC Memo Stuck Spinner

Walkthrough finding (Obs 4): "IC Memo visible on Overview — no stuck spinner." BUG-03 appears resolved.

**Verification evidence:** User confirmed memo shows content correctly.

---

## 9. Seed Fix (Obs 47)

**File:** `prisma/seed.ts`

**Confirmed gap:** The seed `deleteMany` sequence (lines 16-96) does NOT include `AssetExpense`, `AssetIncome`, or `AssetValuation` deleteMany calls before `prisma.asset.deleteMany()` at line 82. The schema confirms these models exist with foreign keys pointing to `Asset` (schema.prisma lines 435, 621, 1062).

**What's missing (add BEFORE `prisma.asset.deleteMany()`):**
```typescript
await prisma.assetExpense.deleteMany();
await prisma.assetIncome.deleteMany();
await prisma.assetValuation.deleteMany();
```

Note: `prisma.valuation` (line 66 in seed.ts) is a different model from `AssetValuation`. Both may need to be checked — `Valuation` is a separate entity-level valuation model while `AssetValuation` is asset-specific (if it exists). Verify in schema.prisma.

**Also audit while in the file:** Check if other asset-detail models (equity details, credit details, real estate details, fund LP details) are correctly ordered. From seed.ts, these ARE already deleted (lines 76-81: `assetFundLPDetails`, `assetRealEstateDetails`, `assetCreditDetails`, `assetEquityDetails`) before `asset.deleteMany()` at line 82. The only missing ones are the expense/income/valuation variants.

---

## 10. Activity Feed Wiring (Obs 6, 19)

### Dashboard Feed (Already Working)

**File:** `src/components/features/dashboard/activity-feed-section.tsx`

The dashboard activity feed renders `<Link href={activity.linkPath}>` for each item (line 307-310). The feed IS clickable. Items navigate to `linkPath`. The problem for meetings: `linkPath` is currently set to `/meetings` (the list). Once `/meetings/[id]` exists, the activity API sets `linkPath: /meetings/${id}`.

### Deal Activity Tab (Obs 6)

**File:** `src/components/features/deals/deal-activity-tab.tsx` (inferred from STRUCTURE.md — file exists in deals features directory)

The walkthrough says "nothing is clickable in activity tab." The fix: find meeting rows in this tab and add `<Link href={/meetings/${m.id}}>` wrappers. This is a separate component from the dashboard feed — it renders inline meeting entries from `deal.meetings[]`.

### Asset Activity Tab (Obs 19)

**File:** `src/app/(gp)/assets/[id]/page.tsx`, lines 324-437

The asset activity tab renders meetings from `a.meetings[]` (line 331-357) as plain `<div>` elements with `cursor-pointer` class but no click handler. The fix: add `onClick={() => router.push(/meetings/${m.id})}` or wrap in `<Link>`. The `router` from `useRouter()` is already imported at line 131.

### Activity API Route

**File:** `src/app/api/activity/route.ts` — builds `ActivityItem` objects with `linkPath`. For MEETING type, set `linkPath: /meetings/${meeting.id}` instead of `/meetings`.

---

## 11. FIN-12 — LP Display Details

### Capital Account Breakdown Gap (LP-Obs 2)

**Root cause analysis** (from reading `lp-account/page.tsx` and the capital account API):

The LP display renders a fixed `rows` array (line 213-221):
- Total Commitment
- Contributions
- DISTRIBUTIONS (label)
  - Total Distributions (= `totalDistributed`)
- FEES & EXPENSES (label)
  - Total Fees & Expenses (= `totalFees`)
- Current Balance

There are NO breakdown rows for distribution subcategories (ROC / income / carry / preferred return). The `DistributionLineItem` model has fields: `grossAmount`, `netAmount`, `returnOfCapital`, `income`, `carriedInterest`. The API currently uses only `li.netAmount` for the ledger entry amount. None of the subcategory fields flow through to the display.

**The $6M gap explained:** If `totalDistributed` (from EntitySummary) is computed from `li.netAmount` but the user expected `li.grossAmount` (or vice versa), or if some distributions are excluded by the `status: "PAID"` filter while the user sees them elsewhere — this is the reconciliation gap. The plan must:
1. Query Tom Wellington's distributions to see actual field values
2. Determine whether gross vs. net is the issue
3. Either: add subcategory breakdown rows to the display, OR fix the total calculation

### LP Portfolio — Invested Capital Column (LP-Obs 3)

**File:** `src/app/(lp)/lp-portfolio/page.tsx`

Currently shows per-asset:
- `a.name`, `a.assetClass`, `a.sector`, `a.status`, `a.moic`, `a.incomeType`
- `proRata` = investor's fair-value exposure (LP's share of fair value)
- `investorPct` = LP's ownership percentage

Missing: invested capital = LP's called capital into this position. This can be derived from `entityMetrics` (already fetched from dashboard) — `em.totalCalled × investorPct` gives called capital per entity. Per-asset breakdown is harder (assets are inside entities, not directly called).

**Pragmatic approach:** Show "Invested" as the LP's total called into the entity that holds this asset. The `entityMetrics[]` array already has `totalCalled` per entity. Map assets to their entity (via `assetEntityAllocation`) and show `em.totalCalled × investorPct` as the invested figure.

---

## 12. Deal Deletion Bypass (Obs 7)

**File:** `src/app/api/deals/[id]/route.ts`

The DELETE handler (lines 270-344) already has correct stage-gate logic:
```typescript
if (deal.stage !== "SCREENING" && deal.stage !== "DEAD") {
  return NextResponse.json(
    { error: `Cannot delete: deal is in ${deal.stage} stage. Only SCREENING or DEAD deals can be deleted.` },
    { status: 400 },
  );
}
```

**The walkthrough finding (Obs 7):** User "was able to kill this deal for some reason" on an IC Review deal. Possible explanations:
1. The deal appeared to be in IC Review visually but was actually in DEAD stage (the user misidentified the stage badge)
2. There is a separate "kill deal" flow via `PATCH /api/deals/[id]` with `action: "kill"` — the `killDeal` function from `deal-stage-engine.ts` which moves a deal to DEAD stage, then the user separately deleted it from DEAD (which IS allowed)
3. Some admin-level bypass exists

**Diagnosis for the plan:** Test the delete flow in dev — try deleting an IC Review deal from the three-dot menu. If it succeeds, trace the request to confirm which endpoint is hit. If the `PATCH action:"kill"` first moves to DEAD, then a subsequent DELETE is legitimate.

The stage-gate IS implemented in the API. The most likely explanation is the two-step path: kill → dead → delete. The fix may just be adding clarity to the UI (the "Kill Deal" action should explain it moves to Dead, then the user can delete from Dead) rather than a code change.

---

## 13. Asset Allocation Tooltip (Obs 24)

**File:** `src/components/features/assets/asset-overview-tab.tsx` (or entity overview tab)

The "Asset Allocations" section appears on the entity Overview tab. The percentage shown is `allocationPercent` from `AssetEntityAllocation`. The ambiguity: does 50% mean "this entity owns 50% of the asset" OR "this asset is 50% of the entity's portfolio"? The correct semantic is the former (entity's ownership stake IN the asset).

**Fix:** Add a tooltip (`title` attribute or a `Tooltip` component) to the "Asset Allocations" heading: "Percentage of each asset owned by this fund vehicle." Check if a Tooltip primitive exists in `src/components/ui/` — the STRUCTURE.md mentions `error-boundary.tsx`, `file-upload.tsx`, etc. but not an explicit tooltip component. A `title` attribute is the simplest approach.

---

## 14. Obs 25 — Cost Basis Seed Fix

**File:** `prisma/seed.ts`

Cost bases ARE defined in the seed for each asset (confirmed: lines 658, 676, 694, etc. all have `costBasis: N`). And `assetEntityAllocation` records are seeded (lines 856-871 etc.) with `allocationPercent`.

The entity overview shows "cost bases are zero." This suggests the ENTITY level view computes cost basis from `assetEntityAllocation.allocationPercent × asset.costBasis` and either:
1. The computation is not running (the entity overview fetches assets but doesn't compute allocated cost basis)
2. The allocations are seeded with `allocationPercent: 50` (fractional form, 0-100 scale) but the display treats it as decimal (0-1 scale)

**Fix for plan:** Investigate the entity overview's cost basis calculation — whether it's being computed at all and whether the percentage scale is consistent.

---

## 15. Testing Architecture

### Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts present) |
| Config file | `vitest.config.ts` at project root |
| Quick run command | `npx vitest run --reporter=verbose 2>&1 \| tail -20` |
| Full suite command | `npx vitest run` |
| Test location | `src/lib/__tests__/` — 36 files |
| Test naming | `describe("Unit — description", () => { ... })` |

### Finding the 87 Waterfall/Pref Tests

The test files in `src/lib/__tests__/` have names like `phase19-activity-feed.test.ts`, `deal-stage-tasks.test.ts`, etc. There are no files with "waterfall" or "pref" in the name. The 87 tests from STATE.md are likely distributed across multiple existing test files — search for `computeWaterfall` or `pref` in test file contents to find them. After FIN-02 refactor, all 87 must still pass.

### New Tests for Phase 22

| Plan | Test to add | Location |
|------|-------------|----------|
| LP-Obs 2 | Category-sum reconciliation: assert `sum(breakdown rows) === total` for every investor in seed | `src/lib/__tests__/lp-statement-reconciliation.test.ts` |
| FIN-02 | Import-smoke-test: assert `days360Exclusive` and `days360Inclusive` from `pref-accrual.ts` return same values as the route's inline copies | Extend existing pref tests or new file |
| FIN-08 | Regression: assert DD workstream list is not empty for post-DD deals | `src/lib/__tests__/deal-dd-progress.test.ts` (already exists) |

---

## Validation Architecture

### Per-Requirement Verification Map

| Req ID | Behavior | Test Type | Command | Evidence Location |
|--------|----------|-----------|---------|------------------|
| FIN-01 | Click meeting in activity feed → lands on `/meetings/[id]` page | Manual | Navigate to `/deals/[id]` → Activity tab → click meeting | VERIFICATION.md: screenshot or description of detail page loading |
| FIN-01 | Meeting list cards click through to detail | Manual | Go to `/meetings` → click any card | VERIFICATION.md: detail page URL shows meeting ID |
| FIN-02 | Route no longer inlines `days360Exclusive`/`days360Inclusive`/PIC walk | Build + grep | `npm run build && grep -n "days360Exclusive" src/app/api/waterfall-templates/[id]/calculate/route.ts` → should find only an import | VERIFICATION.md: grep output showing import not inline |
| FIN-02 | All 87 pref/waterfall tests pass | Unit | `npx vitest run` | VERIFICATION.md: vitest output with count |
| FIN-04 | Second-fund Excel matches engine output for 3+ distributions | Manual | Run waterfall calculate route against second fund; compare to Excel row by row | VERIFICATION.md: table of Excel vs engine for each distribution |
| FIN-08 | BUG-01 (zero workstreams on IC deal) resolved | Manual | Go to IC Review deal → Due Diligence tab → see workstreams | VERIFICATION.md: screenshot of populated workstreams |
| FIN-08 | BUG-02 (300% pass rate) — formally closed | Manual | Check `/deals` stat cards | VERIFICATION.md: confirm no >100% percentage displayed |
| FIN-08 | BUG-03 (IC memo spinner) — formally closed | Manual | Open DD-stage deal → Overview tab → IC Memo visible | VERIFICATION.md: confirm memo content shown |
| FIN-09 | Deal delete on non-SCREENING/DEAD deal shows business-rule message | Manual | Try to delete IC Review deal → see descriptive error toast | VERIFICATION.md: exact error copy shown |
| FIN-09 | Document AI summary shows actionable copy | Manual | Run AI summary with no key configured → see setup instruction | VERIFICATION.md: exact error copy shown |
| FIN-10 | Asset class filter works | Manual | Go to `/assets` → click Real Estate filter → list shows only RE assets | VERIFICATION.md: filtered list screenshot |
| FIN-10 | Entity list column sort works | Manual | Go to `/entities` → click Name header → list sorts A-Z then Z-A | VERIFICATION.md: sorted order description |
| FIN-10 | Meetings sort works | Manual | Go to `/meetings` → sort by date → meetings reorder | VERIFICATION.md: sorted order description |
| FIN-11 | Asset task rows link to `/tasks/[id]` | Manual | Go to asset → Tasks tab → click a task → `/tasks/[taskid]` loads | VERIFICATION.md: task detail URL confirmed |
| FIN-11 | Entity task widgets link to `/tasks/[id]` | Manual | Go to entity → Overview → click task → `/tasks/[taskid]` loads | VERIFICATION.md: task detail URL confirmed |
| FIN-11 | Cap table investor rows link to CRM | Manual | Go to entity → Cap Table → click investor name → `/investors/[id]` loads | VERIFICATION.md: investor detail URL confirmed |
| FIN-12 | Tom Wellington capital account reconciles | Manual + Unit | Check `/lp-account` as Tom Wellington; run reconciliation unit test | VERIFICATION.md: total === sum of breakdown; test passes |
| FIN-12 | LP Portfolio shows invested capital | Manual | Go to `/lp-portfolio` as Tom Wellington → see "Invested" column | VERIFICATION.md: column present with non-zero values |

### Sampling

- Per-plan commit: `npm run build` (zero TypeScript errors before any commit)
- Per-plan close: `npx vitest run` to confirm no regressions
- Phase gate: all VERIFICATION.md checkboxes ticked + `npm run build` clean before SUMMARY.md

---

## Sources

### Primary (HIGH confidence — read from actual files)
- `src/components/features/side-letters/create-side-letter-form.tsx` — Obs 35 crash site, exact code read
- `src/app/(gp)/documents/page.tsx` — Obs 40 upload modal, exact code read
- `src/app/(lp)/lp-account/page.tsx` — LP-Obs 2 display, exact code read
- `src/app/api/investors/[id]/capital-account/route.ts` — LP-Obs 2 API, exact code read
- `src/app/(lp)/lp-portfolio/page.tsx` — LP-Obs 3, exact code read
- `src/components/features/assets/edit-asset-form.tsx` — asset edit scope, exact code read
- `src/app/(gp)/assets/[id]/page.tsx` — asset detail page, tabs, task tab, exact code read
- `src/app/api/waterfall-templates/[id]/calculate/route.ts` — FIN-02, inlined functions confirmed
- `src/lib/computations/pref-accrual.ts` — FIN-02, exported functions confirmed
- `src/app/(gp)/meetings/page.tsx` — FIN-01, no `/meetings/[id]` route confirmed
- `src/components/features/meetings/meeting-detail-card.tsx` — FIN-01, no click routing confirmed
- `src/components/features/dashboard/activity-feed-section.tsx` — activity feed has `<Link>` confirmed
- `src/lib/activity-feed-helpers.ts` — ActivityItem.linkPath pattern confirmed
- `src/app/api/deals/[id]/route.ts` — Obs 3/7 deal delete stage-gate read
- `prisma/seed.ts` — Obs 47, missing deleteMany confirmed
- `src/app/(gp)/assets/page.tsx` — FIN-10 sort/filter state read
- `src/app/(gp)/entities/page.tsx` — FIN-10, no sort state confirmed
- `src/lib/computations/capital-accounts.ts` — computeCapitalAccount function, exact code read
- `src/lib/routes.ts` — route registry, all GP/LP routes confirmed
- `vitest.config.ts` — test framework confirmed

### Secondary (MEDIUM confidence — cross-referenced)
- 87 waterfall/pref tests from STATE.md — not found as named files, likely distributed across existing test files; must run `npx vitest run` to confirm count
- `AssetExpense`, `AssetIncome`, `AssetValuation` existence confirmed from schema.prisma grep; exact model field shapes not fully read

---

## Plan Boundaries Suggestion

The following clusters naturally group into 7-8 plans in the locked execution order:

**Plan 22-01 — Side Letter Crash (BLOCKER)**
- Obs 35: fix `create-side-letter-form.tsx` entity/investor array unwrap
- Obs 47: fix `prisma/seed.ts` deleteMany order (small, same file visit pattern — might fold in here or make a tiny standalone plan)
- Size: XS–S

**Plan 22-02 — Document Upload Wizard (BLOCKER)**
- Obs 40: rewrite the upload modal to include a file input, use FormData submission
- FIN-09 (Obs 39): fix document AI summary error copy (same file context)
- FIN-09 (Obs 3): fix deal delete error copy on client side; AI routes (ai/execute, ai/suggest-tasks, ai/draft-lp-update) descriptive error copy
- Size: S–M

**Plan 22-03 — LP Capital Account Reconciliation (BLOCKER)**
- LP-Obs 2: diagnose + fix distribution total vs breakdown gap for Tom Wellington
- Unit test: category-sum reconciliation for all seed investors
- Size: S–M (diagnostic-first)

**Plan 22-04 — Asset Correctness (HIGH PRIORITY — strategic)**
- Obs 10 + Obs 12: expand EditAssetForm to include name, entryDate, costBasis; add type-conditional sections; add sub-modals for lease / contract / valuation rows
- Obs 25: investigate and fix entity cost basis display (seed linkage or computation)
- Obs 24: add Asset Allocations tooltip on entity overview
- Size: L (largest plan — asset edit is substantial)

**Plan 22-05 — LP Portfolio + Meetings Detail**
- LP-Obs 3: add invested-capital + current-fair-value columns to LP Portfolio
- FIN-01: create `/meetings/[id]` detail page + add click routing on meeting list cards
- Activity feed wiring (Obs 6, 19): wire deal and asset activity tab meeting entries to route to `/meetings/[id]`; update activity API linkPath for MEETING type
- Size: M

**Plan 22-06 — List Controls + Seed + Misc Wiring**
- FIN-10: fix asset class filter (debug filter pipeline); add entity list sort + search; add meetings list sort
- FIN-11: wire asset task rows → `/tasks/[id]`; entity task rows → `/tasks/[id]`; cap table investor rows → `/investors/[id]`
- Obs 47 (if not folded into 22-01): seed deleteMany fix
- Obs 7: investigate and document deal deletion bypass finding
- Size: M

**Plan 22-07 — Waterfall Refactor + Second-Fund Validation**
- FIN-02: refactor waterfall calculate route to import from `pref-accrual.ts`; verify 87 tests pass
- FIN-08: formally close BUG-01/02/03 with evidence; fix zero-workstream seed issue for post-DD deals
- FIN-04: second-fund Excel validation (Excel-gated — plan can be drafted now but execution waits on Excel)
- Size: M

**Plan 22-08 — SUMMARY**
- End-of-phase: roll up all VERIFICATION.md files into SUMMARY.md; final `npm run build` clean; all FIN checkboxes marked complete

This is 7 execution plans + 1 summary = 8 total, fitting the locked structure.

---

## Open Questions

1. **LP-Obs 2 root cause — gross vs net:** The capital account API uses `li.netAmount` for distribution entries. If `netAmount` excludes carry (it represents what the LP actually receives net of GP carry), then the "total distributions" displayed may be $14M gross but only $8M net — and the user is seeing gross in one place and net in another. Need to verify `DistributionLineItem.netAmount` vs `grossAmount` definitions in schema.prisma.

2. **Asset Valuation model name:** The seed.ts has `prisma.valuation.deleteMany()` (line 66) AND the schema has a model referenced at line 1062 as `AssetValuation`. Are these the same model? If not, the Obs 47 fix needs BOTH. Check if `prisma.assetValuation.deleteMany()` is a valid call.

3. **Where are the 87 waterfall tests?** `src/lib/__tests__/` has 36 files but none named with "waterfall" or "pref." The planner should note: FIN-02 plan must include a step to run `npx vitest run` and confirm the count before and after the refactor.

4. **Obs 40 upload — is there an existing FileUpload wizard component?** The `src/components/ui/file-upload.tsx` primitive exists. The Obs 40 fix needs to check if this is a drag-drop component and whether it emits a `File` object to pass to FormData.

5. **Entity cap table investor CRM link — does investor have a contactId?** The `Investor` model may or may not have a direct `contactId` field linking to `Contact`. If investors are created independently from contacts (which is likely given the separate "Investors" tab in directory), the link may go to `/investors/[id]` not `/contacts/[id]`. Verify the investor detail page path.

---

*Research date: 2026-04-17*
*Valid until: 2026-05-17 (stable codebase — no external dependency changes expected)*
