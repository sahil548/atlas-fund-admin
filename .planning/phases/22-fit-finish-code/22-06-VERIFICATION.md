# Phase 22 Plan 06: Verification

**Plan:** 22-06 — FIN-10 list controls, FIN-11 record linkage, FIN-09 error copy, Obs 7 deletion bypass
**Build:** `npm run build` — PASSED (clean, no TypeScript errors)
**Vitest:** 18 failures pre-existing (same count before and after this plan's changes — confirmed via `git stash` test run)

---

## Per-Item Evidence (13 entries — scope-density rule)

### Obs 8 / FIN-10 — Asset Class Filter Works

**Status:** Fixed

**Root cause diagnosed:** `parsePaginationParams` in `src/lib/pagination.ts` treats params in its `knownParams` list as infrastructure params (not filters). The assets route was passing `["firmId", "cursor", "limit", "search", "assetClass", "status", "entityId"]` as `knownParams`, so `assetClass` and `status` were consumed as known params and never added to `params.filters`. The API then reads `params.filters?.assetClass` — which was always `undefined`.

**Fix applied:** `src/app/api/assets/route.ts` — changed `knownParams` to `["firmId", "cursor", "limit", "search"]` only. Now `assetClass`, `status`, and `entityId` fall through to `params.filters` and are correctly applied to `baseWhere`.

**Verification steps:**
1. Go to `/assets`
2. Click a filter option (e.g., Real Estate class)
3. Observe network request: URL now contains `assetClass=REAL_ESTATE`
4. List renders only Real Estate assets
5. Clear filter — full list returns

---

### Obs 21 / FIN-10 — Entity List Sort + Search Works

**Status:** Implemented

**Changes:** `src/app/(gp)/entities/page.tsx`
- Added `sortKey` / `sortDir` state (type `EntitySortKey = "name" | "entityType" | "vintageYear" | "status"`)
- Added `handleSort()` toggle function
- Added `sortedEntities` useMemo over accumulated array (Phase 25 compatible)
- Table headers for Vehicle, Type, Vintage, Formation are now clickable with ↑/↓ indicators
- Added `SearchFilterBar` with search input; `buildUrl` passes `search` param to `/api/entities`
- `roots` in the flat view hierarchy render uses `sortedEntities` for sort order

**Verification steps:**
1. Go to `/entities` (flat view)
2. Click "Vehicle" column header → list sorts A-Z, arrow shows ↑
3. Click again → Z-A, arrow shows ↓
4. Click "Type" column → sorts by entity type
5. Click "Vintage" column → sorts by vintage year
6. Type a partial entity name in the search box → list narrows in real time

---

### Obs 44 / FIN-10 — Meetings Sort Works

**Status:** Implemented

**Changes:** `src/app/(gp)/meetings/page.tsx`
- Added `sortKey` / `sortDir` state (`MeetingSortKey = "meetingDate" | "title"`)
- Added `handleSort()` toggle function
- Added `sortedMeetings` useMemo
- Sort buttons ("Date", "Title") rendered below stat cards when meetings are present
- Active sort button highlighted in indigo; inactive in gray
- `sortedMeetings` used in the render loop instead of `allMeetings`
- Default sort: date descending (newest first)

**Verification steps:**
1. Go to `/meetings`
2. See sort buttons below stat cards
3. Click "Date" → meetings sort by date (default desc), indicator shows ↓
4. Click "Date" again → toggle to asc, shows ↑
5. Click "Title" → meetings sort alphabetically by title

---

### Obs 18 / FIN-11 — Asset Task Row → /tasks/[id]

**Status:** Fixed

**Change:** `src/app/(gp)/assets/[id]/page.tsx` — `AssetTasksTab` component
- Changed task row `<div>` to `<Link href={/tasks/${t.id}}>` 
- Added hover state: `hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`
- No nested buttons inside the task row, so no stopPropagation needed

**Verification steps:**
1. Go to any asset with tasks (e.g., `/assets/[id]`)
2. Click "Tasks" tab
3. Click any task row
4. Browser navigates to `/tasks/[taskId]`

---

### Obs 22 / FIN-11 — Entity Task Widget → /tasks/[id]

**Status:** Fixed

**Change:** `src/components/features/entities/tabs/entity-operations-tab.tsx` — `TasksInline` component
- Added `import Link from "next/link"`
- Changed task row `<div>` to `<Link href={/tasks/${t.id}}>`
- Added hover state: `hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`

**Verification steps:**
1. Go to any entity (e.g., `/entities/[id]`)
2. Click "Operations" tab → "Tasks" sub-tab
3. Click any task row
4. Browser navigates to `/tasks/[taskId]`

---

### Obs 27 / FIN-11 — Cap Table Investor → /investors/[id]

**Status:** Already implemented (confirmed by code inspection)

**Finding:** `src/components/features/entities/tabs/entity-cap-table-tab.tsx` already had `<Link href={/investors/${invId}}>` in three places:
- **Ownership units table** (lines 444, 486): `<Link href={/investors/${ou.investor.id}}>`
- **Ownership Summary section** (line 565): `<Link href={/investors/${invId}}>`  
- **Commitments table** (line 676): `<Link href={/investors/${c.investor.id}}>`

No change needed. All investor name cells in the cap table are already linked to the investor detail page.

**Verification steps:**
1. Go to any entity → Cap Table tab
2. Click any investor name in the Ownership Summary table
3. Browser navigates to `/investors/[investorId]`

---

### Obs 3 / FIN-09 — Deal Delete Stage-Gate Copy Shown in Toast

**Status:** Already correct (confirmed by code inspection)

**Finding:** The deal delete handler in `src/app/(gp)/deals/[id]/page.tsx` (lines 995-1008) already correctly surfaces the API error:
```typescript
const res = await fetch(`/api/deals/${id}`, { method: "DELETE" });
const json = await res.json();
if (!res.ok) throw new Error(json.error || "Failed to delete");
// ...
toast.error(err instanceof Error ? err.message : "Failed to delete deal");
```

The API returns `{ error: "Cannot delete: deal is in IC_REVIEW stage. Only SCREENING or DEAD deals can be deleted." }` with `status: 400`. The client reads `json.error` and passes it to `toast.error`. No "Unauthorized" is involved.

Additionally, the "Delete" button is only rendered when `deal.stage === "SCREENING" || isDead` (line 685). Users on IC Review stage see only "Kill Deal" — they cannot even attempt to delete without first killing.

**Verification steps:**
1. Go to any deal in SCREENING stage
2. Click "Delete" button → confirm dialog appears
3. If you open network devtools and the DELETE API is called, it succeeds for SCREENING
4. For IC Review: the Delete button is not rendered at all — only Kill Deal is shown

---

### Obs 39 / FIN-09 — Document AI Summary Shows Actionable Copy

**Status:** Fixed

**Change:** `src/components/features/documents/document-extraction-panel.tsx`
- Added `import { ERR } from "@/lib/error-messages"`
- In the NONE state: checks if `document.extractionError?.toLowerCase().includes("no ai api key")`
  - If true: shows `ERR.DOC_EXTRACT_NO_AI` = "Document AI summary requires AI access. Go to Settings → AI Config to enable it."
  - If false: shows original "This document has not been processed by AI yet."

**How it works:** When the user clicks "Run AI summarization" with no AI key configured:
1. The route calls `extractDocumentFields`
2. `extractDocumentFields` detects no AI key → sets `extractionStatus: "NONE"`, `extractionError: "No AI API key configured"`
3. On next page refresh, the panel shows the actionable message pointing to Settings → AI Config

**Verification steps:**
1. Ensure no AI key is configured in Settings → AI Config
2. Open any document with `extractionStatus: "NONE"`
3. Click "Run AI summarization"
4. After the API call completes (the document will show NONE with error)
5. Refresh → panel shows: "Document AI summary requires AI access. Go to Settings → AI Config to enable it."

---

### FIN-09 — AI Execute Actionable Copy

**Status:** Already correct

**Finding:** `src/app/api/ai/execute/route.ts` line 36: `if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })` — this is a genuine auth check (no session). This is correct.

The AI execute route calls `planAction()` which calls `createUserAIClient`. If no AI key is configured, `planAction` returns a descriptive plan rather than throwing — the UX handles this gracefully. No "Unauthorized" is returned for missing AI keys in this route.

---

### FIN-09 — AI Suggest-Tasks Actionable Copy

**Status:** Already correct

**Finding:** `src/app/api/ai/suggest-tasks/route.ts` has:
```typescript
const aiClient = await createUserAIClient(authUser.id, firmId);
if (!aiClient) {
  return NextResponse.json(
    { error: "No API key configured. Add one in Settings → AI Configuration." },
    { status: 400 },
  );
}
```
This is already descriptive and actionable. No change needed.

---

### FIN-09 — AI Draft-LP-Update Actionable Copy

**Status:** Already correct

**Finding:** `src/app/api/ai/draft-lp-update/route.ts` has the same pattern as suggest-tasks — `createUserAIClient` check returns `"No API key configured. Add one in Settings → AI Configuration."` when no key is present. Already actionable.

---

### FIN-09 — Grep Audit of "Unauthorized" in src/app/api/

**Status:** Clean — all remaining strings are genuine auth failures

**Terminal output:**
```
src/app/api/settings/permissions/route.ts:15:  if (!authUser) return ... { error: "Unauthorized" }, { status: 401 }
src/app/api/settings/permissions/route.ts:57:  if (!authUser) return ... { error: "Unauthorized" }, { status: 401 }
src/app/api/deals/[id]/tasks/[taskId]/comments/route.ts:75:  ... { error: "Unauthorized" }, { status: 401 }
src/app/api/deals/[id]/tasks/[taskId]/attachments/route.ts:60:  ... { error: "Unauthorized" }, { status: 401 }
src/app/api/deals/[id]/workstreams/[workstreamId]/comments/route.ts:64:  ... { error: "Unauthorized" }, { status: 401 }
src/app/api/deals/[id]/workstreams/[workstreamId]/attachments/route.ts:49:  ... { error: "Unauthorized" }, { status: 401 }
src/app/api/audit-log/route.ts:14:  if (!authUser) return ... { error: "Unauthorized" }, { status: 401 }
src/app/api/ai/draft-lp-update/route.ts:19:  if (!authUser) return ... { error: "Unauthorized" }, { status: 401 }
src/app/api/ai/suggest-tasks/route.ts:20:  if (!authUser) return ... { error: "Unauthorized" }, { status: 401 }
src/app/api/ai/execute/route.ts:36:  if (!authUser) return ... { error: "Unauthorized" }, { status: 401 }
src/app/api/users/[id]/entity-access/route.ts:18:  if (!authUser) return ... { error: "Unauthorized" }, { status: 401 }
src/app/api/users/[id]/entity-access/route.ts:66:  if (!authUser) return ... { error: "Unauthorized" }, { status: 401 }
src/app/api/entities/[id]/route.ts:216:  if (!authUser) return ... { error: "Unauthorized" }, { status: 401 }
```

**Justification per entry:**
- All return `status: 401` (not 400 or 403)
- All guard with `if (!authUser)` — genuine missing session
- None are business-logic conditions (deal stage, missing AI key, etc.)
- The AI routes' `!authUser` checks are before any AI-key or `aiAccess` checks

**Verdict: No non-auth "Unauthorized" strings remain in `src/app/api/`.**

---

### Obs 7 — Deletion Bypass Diagnosis

**Status:** No bypass found — intended two-step flow confirmed

**Reproduction steps:**
1. Open any deal in IC Review stage (`/deals/[id]`)
2. Observe the action buttons in the header
3. **Expected:** "Kill Deal" button is visible; "Delete" button is NOT rendered
4. **Actual:** Confirmed — line 685 in `deals/[id]/page.tsx`: `{(deal.stage === "SCREENING" || isDead) && <Button>Delete</Button>}`

**What the walkthrough user experienced:**
- The user clicked "Kill Deal" (PATCH action:KILL → moves deal to DEAD stage)
- The Kill Deal modal shows: "This will move it to the Dead stage. You can revive it later."
- After confirming, deal moved to DEAD
- User then clicked "Delete" on the now-DEAD deal
- Delete succeeded because DEAD is an allowed stage for deletion

**Code evidence:**
- `deals/[id]/page.tsx` line 685: Delete button rendered only for `SCREENING` or `isDead`
- `deals/[id]/route.ts` line 294-298: API stage-gate independently enforces the same rule
- `kill-deal-modal.tsx` line 71: "This will move it to the Dead stage" — user intent communicated

**Resolution:** No code change needed. The flow is: Kill Deal (→ DEAD) → Delete. Both steps are explicit and labeled. The Kill Deal modal explains what happens.

**Optional UX improvement considered:** Could rename "Kill Deal" to "Mark as Dead / Kill Deal" to make the two-step nature even clearer. Deferred as out of scope for this plan — the modal already explains the outcome.

---

## Automated Checks

```bash
# Build check — PASSED
npm run build
# Output: ✓ Compiled successfully

# Grep audit — PASSED (all Unauthorized are real auth failures)
grep -rn '"Unauthorized"' src/app/api/
# 13 results — all if (!authUser) guards with status: 401

# Vitest — pre-existing failures (not caused by this plan)
npx vitest run
# 18 failures | 876 passed | 1 skipped
# VERIFIED: same count in git stash baseline (before this plan's changes)
```

---

## ERR Module Created

`src/lib/error-messages.ts` exports `ERR` with:
- `DEAL_STAGE_GATE(stage)` — deal deletion blocked
- `AI_NO_KEY` — no API key configured
- `AI_NO_ACCESS` — aiAccess flag false
- `AI_MODEL_UNAVAILABLE` — model not available
- `DOC_EXTRACT_NO_AI` — document extraction with no AI
- `DOC_EXTRACT_NO_FILE` — document has no attached file

Currently used in: `document-extraction-panel.tsx` (DOC_EXTRACT_NO_AI). Other ERR entries are available for Phase 23 retrofit and future use.
