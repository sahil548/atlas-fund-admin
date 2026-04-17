---
phase: 22-fit-finish-code
plan: "06"
subsystem: ui
tags: [filtering, sorting, usememo, link, error-messages, nextjs]

# Dependency graph
requires:
  - phase: 22-fit-finish-code plans 22-01 to 22-05
    provides: meeting detail page, asset edit modals, LP portfolio columns, activity feed routing
provides:
  - Asset class filter works end-to-end (parsePaginationParams knownParams bug fixed)
  - Entity list: client-side sort by name/type/vintage/status + search bar
  - Meetings list: client-side sort by date/title with useMemo
  - Asset task rows link to /tasks/[id] via Next Link
  - Entity Operations Tasks sub-tab rows link to /tasks/[id] via Next Link
  - Cap table investor rows confirmed already linked to /investors/[id]
  - Centralized src/lib/error-messages.ts with ERR taxonomy (AI, deal stage-gate, document extraction)
  - Document AI panel shows ERR.DOC_EXTRACT_NO_AI when AI key is absent
  - Deal delete error copy confirmed correct (stage-gate 400, not 401)
  - API Unauthorized strings confirmed to be genuine 401 auth failures (not business-logic mis-labeling)
  - Obs 7 deletion bypass confirmed non-existent (two-step Kill→DEAD→Delete is by design)
affects: [23-fit-finish-docs, FIN-09, FIN-10, FIN-11]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useMemo client-side sort on accumulated SWR array — compatible with Phase 25 Load More pagination"
    - "parsePaginationParams knownParams must only list true infrastructure params (firmId/cursor/limit/search); business filter params must be omitted so they flow to params.filters"
    - "Centralized ERR const in src/lib/error-messages.ts — import and reference rather than inline copy"

key-files:
  created:
    - src/lib/error-messages.ts
  modified:
    - src/app/api/assets/route.ts
    - src/app/(gp)/entities/page.tsx
    - src/app/(gp)/meetings/page.tsx
    - src/app/(gp)/assets/[id]/page.tsx
    - src/components/features/entities/tabs/entity-operations-tab.tsx
    - src/components/features/documents/document-extraction-panel.tsx

key-decisions:
  - "parsePaginationParams knownParams set to only [firmId, cursor, limit, search] — business filter params (assetClass, status, entityId) must NOT be in knownParams or they never reach params.filters"
  - "Client-side sort via useMemo on accumulated allEntities/allMeetings arrays — not URL-param sort — so it survives Load More pagination in Phase 25"
  - "Entity list search uses buildUrl + mutate/reset pattern (same as assets page) so search resets cursor and accumulation"
  - "Document AI NONE state now branches: if extractionError includes 'no ai api key' shows ERR.DOC_EXTRACT_NO_AI; otherwise shows generic not-processed message"
  - "Obs 7 deletion bypass: no bypass exists. Delete button is conditionally rendered only for SCREENING/DEAD deals. Kill Deal (PATCH action:KILL) moves to DEAD first. The two-step path is intentional UX."
  - "All 13 Unauthorized occurrences in src/app/api/ are genuine HTTP 401 auth failures — none are misused for business logic"

patterns-established:
  - "useMemo sort pattern: const sortedItems = useMemo(() => [...allItems].sort((a, b) => {...}), [allItems, sortKey, sortDir])"
  - "Sort toggle: handleSort(k) sets key and toggles dir if same key, else resets to default dir for that key"
  - "ERR taxonomy pattern: import { ERR } from '@/lib/error-messages'; return NextResponse.json({ error: ERR.AI_NO_KEY }, { status: 400 })"

requirements-completed: [FIN-09, FIN-10, FIN-11]

# Metrics
duration: ~90min
completed: "2026-04-17"
---

# Phase 22 Plan 06: List Controls, Record Linkage, Error Copy, and Obs 7 Investigation Summary

**Asset class filter fixed (parsePaginationParams knownParams bug), entity list sort+search and meetings sort added via useMemo, task rows wired to /tasks/[id] in assets and entities, centralized ERR taxonomy in error-messages.ts with document AI panel updated, and Obs 7 deletion bypass confirmed non-existent**

## Performance

- **Duration:** ~90 min
- **Started:** 2026-04-17T06:40:00Z
- **Completed:** 2026-04-17T08:10:00Z
- **Tasks:** 4
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments

- Fixed root-cause bug where asset class filter buttons rendered but did not filter — `parsePaginationParams` was treating `assetClass` as a known infrastructure param so it never reached `params.filters`
- Added client-side sort (name/type/vintage/status) and search to entity list, and client-side sort (date/title) to meetings list, both compatible with Phase 25 Load More pagination via useMemo over accumulated SWR array
- Wired task row `<Link>` navigation to `/tasks/[id]` in asset Tasks tab and entity Operations Tasks sub-tab; confirmed cap table investor rows already linked
- Created centralized `src/lib/error-messages.ts` with ERR const covering AI prerequisites, deal stage-gate, and document extraction; applied to document AI extraction panel NONE state

## Task Commits

Each task was committed atomically:

1. **Task 1: FIN-10 list sort/filter controls** - `5c627b8` (feat)
2. **Task 2: FIN-11 record linkage — task rows and cap table** - `39c94ff` (feat)
3. **Task 3: FIN-09 centralized error messages + document AI copy** - `6e7bbc9` (feat)
4. **Task 4: Obs 7 deletion bypass investigation** - `7b0d9b3` (docs)

## Per-Item Evidence (13 entries — scope-density rule)

### Obs 8 / FIN-10 — Asset Class Filter

**Status:** Fixed

**Root cause:** `src/app/api/assets/route.ts` was passing `["firmId", "cursor", "limit", "search", "assetClass", "status", "entityId"]` as `knownParams` to `parsePaginationParams`. Since `parsePaginationParams` treats knownParams as infrastructure (consumed, not passed to `params.filters`), `assetClass` was always stripped out. The API then reads `params.filters?.assetClass` — always `undefined`.

**Fix:** Changed knownParams to `["firmId", "cursor", "limit", "search"]` only. Now `assetClass`, `status`, and `entityId` fall through to `params.filters` and are applied to `baseWhere`.

**Commit:** `5c627b8`

---

### Obs 21 / FIN-10 — Entity List Sort + Search

**Status:** Implemented

**What shipped:**
- `sortKey` state defaulting to `"name"`, `sortDir` defaulting to `"asc"`
- `sortedEntities` useMemo over `[...allEntities].sort(...)` — sort survives Load More accumulation
- `SearchFilterBar` in PageHeader actions slot (search only, no filter chips)
- Table headers for Vehicle/Type/Vintage/Formation are clickable with ↑/↓ indicators using `cn()` for active state
- Search resets `allEntities` and `cursor` on change to avoid stale accumulated state

**Commit:** `5c627b8`

---

### Obs 44 / FIN-10 — Meetings List Sort

**Status:** Implemented

**What shipped:**
- `sortKey` state defaulting to `"meetingDate"`, `sortDir` defaulting to `"desc"`
- `sortedMeetings` useMemo — meetings render from `sortedMeetings.map(...)` not `allMeetings.map(...)`
- Sort buttons UI below stat cards (Date and Title) with indigo highlight for active
- `handleSort(k)`: title sort defaults to asc, date sort defaults to desc when switching; same-key click toggles direction
- `href={/meetings/${m.id}}` preserved on `MeetingDetailCard` — View details link continues to work

**Commit:** `5c627b8`

---

### Obs 18 / FIN-11 — Asset Task Rows Link to /tasks/[id]

**Status:** Fixed

**What changed:** `AssetTasksTab` in `src/app/(gp)/assets/[id]/page.tsx` — task row changed from `<div>` to `<Link href={/tasks/${t.id}}>` with hover state. `Link` was already imported in the file.

**Commit:** `39c94ff`

---

### Obs 22 / FIN-11 — Entity Task Widget Links to /tasks/[id]

**Status:** Fixed

**What changed:** `TasksInline` component inside `entity-operations-tab.tsx` (Operations > Tasks sub-tab) — task row changed from `<div>` to `<Link href={/tasks/${t.id}}>`. Added `import Link from "next/link"` (was not previously imported in this file).

**Target clarification:** Initial assumption was `entity-overview-tab.tsx`; reading revealed that component has no tasks section. The task widget lives in `entity-operations-tab.tsx` under the Tasks sub-tab.

**Commit:** `39c94ff`

---

### Obs 27 / FIN-11 — Cap Table Investor Links Already Present

**Status:** Confirmed (no change needed)

**Evidence from `entity-cap-table-tab.tsx`:**
- Line 444: `<Link href={/investors/${ou.investor.id}}>` in ownership units table
- Line 486: `<Link href={/investors/${ou.investor.id}}>` (second pattern in same table)
- Line 565: `<Link href={/investors/${invId}}>` in Ownership Summary section
- Line 676: `<Link href={/investors/${c.investor.id}}>` in Commitments table

All four link sites already wired. No code changes required.

**Commit:** N/A (verified, no change)

---

### Obs 3 / FIN-09 — Deal Delete Error Copy Already Correct

**Status:** Confirmed (no change needed)

**Evidence from `src/app/(gp)/deals/[id]/page.tsx` lines 995-1008:** Delete handler reads `json.error` and passes to toast. The API route (`src/app/api/deals/[id]/route.ts` lines 294-298) returns a descriptive 400 stage-gate message ("Can't delete a deal in X stage...") — not a generic 401 Unauthorized. The ERR.DEAL_STAGE_GATE factory added to `error-messages.ts` consolidates this copy for future use.

**Commit:** `6e7bbc9`

---

### Obs 39 / FIN-09 — Document AI Panel Shows ERR.DOC_EXTRACT_NO_AI

**Status:** Implemented

**What changed:** `document-extraction-panel.tsx` NONE state block now branches on `document.extractionError?.toLowerCase().includes("no ai api key")`:
- If true: shows `ERR.DOC_EXTRACT_NO_AI` ("Document AI summary requires AI access. Go to Settings → AI Config to enable it.") in amber text
- Otherwise: shows original gray "not processed yet" message with Run AI summarization button

**Import added:** `import { ERR } from "@/lib/error-messages"`

**Commit:** `6e7bbc9`

---

### FIN-09 — AI Execute Route Copy (ai/execute/route.ts)

**Status:** Confirmed — genuine 401, no change

**Evidence:** Line `if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })` is a real Clerk authentication check. "Unauthorized" is the correct HTTP standard for 401. Not a business-logic misuse. No change warranted.

---

### FIN-09 — AI Suggest-Tasks Route Copy (ai/suggest-tasks/route.ts)

**Status:** Confirmed — already descriptive for missing AI key

**Evidence:** Route checks `createUserAIClient` and returns descriptive message when AI key is absent. The Unauthorized line is a genuine auth check (HTTP 401). No change needed.

---

### FIN-09 — AI Draft-LP-Update Route Copy (ai/draft-lp-update/route.ts)

**Status:** Confirmed — already descriptive for missing AI key

**Evidence:** Same pattern as suggest-tasks. Genuine auth check for 401. Descriptive message for missing AI prerequisites. No change needed.

---

### FIN-09 — Grep Audit of All Unauthorized Strings

**Status:** Confirmed — all 13 hits are genuine HTTP 401 auth failures

**Method:** `grep -rn "Unauthorized" src/app/api/` — 13 occurrences across auth routes, firm routes, and feature routes. Every occurrence is an authentication check (`if (!authUser)` or equivalent) returning HTTP 401. None are used for business-logic failures (stage gates, missing data, permission denials that should be 403/400). ERR taxonomy created for future business-logic copy without touching these.

---

### Obs 7 — Deletion Bypass Investigation

**Status:** No bypass found — two-step path is intentional design

**Evidence from `src/app/(gp)/deals/[id]/page.tsx`:**
- Line 685: `{(deal.stage === "SCREENING" || isDead) && <Button>Delete</Button>}` — Delete button conditionally rendered only for SCREENING/DEAD deals. IC Review/Closing deals do not see the Delete button.
- Lines 669-676: Kill Deal button shown for all non-dead, non-closed deals — calls PATCH action:KILL which moves to DEAD first.

**API enforcement (`src/app/api/deals/[id]/route.ts` lines 294-298):** DELETE handler returns 400 if stage is not SCREENING or DEAD — server-side gate independent of UI.

**Conclusion:** No bypass exists. An admin cannot directly delete an IC Review or Closing deal. The intended path is Kill Deal (→ DEAD) → Delete. The Kill Deal modal UI explicitly states "This will move it to the Dead stage." This is by design.

**Commit:** `7b0d9b3`

## Files Created/Modified

- `src/lib/error-messages.ts` — Created: centralized ERR const with DEAL_STAGE_GATE factory, AI_NO_KEY, AI_NO_ACCESS, AI_MODEL_UNAVAILABLE, DOC_EXTRACT_NO_AI, DOC_EXTRACT_NO_FILE
- `src/app/api/assets/route.ts` — Fixed parsePaginationParams knownParams (removed assetClass/status/entityId from knownParams list)
- `src/app/(gp)/entities/page.tsx` — Added sort state + sortedEntities useMemo + SearchFilterBar + clickable column headers
- `src/app/(gp)/meetings/page.tsx` — Added sort state + sortedMeetings useMemo + sort buttons UI
- `src/app/(gp)/assets/[id]/page.tsx` — Task row changed from div to Link in AssetTasksTab
- `src/components/features/entities/tabs/entity-operations-tab.tsx` — Added Link import; task row changed from div to Link in TasksInline
- `src/components/features/documents/document-extraction-panel.tsx` — Added ERR import; NONE state branches on AI key error message

## Decisions Made

- **parsePaginationParams knownParams must only contain true infrastructure params.** Any business filter param (assetClass, status, entityId) placed in knownParams is silently consumed and never reaches params.filters, causing filter to be ignored. This is a footgun worth documenting — added to patterns-established.
- **Client-side sort via useMemo, not URL param sort.** Phase 25 will use Load More (accumulated SWR array). URL-param sort would reset the accumulated array on each sort change. useMemo on the accumulated array avoids this problem.
- **Obs 7 is not a bug.** The two-step Kill→DEAD→Delete path is intentional. No code change. Documented with evidence for closure.
- **AI Unauthorized strings are untouched.** All 13 occurrences are genuine HTTP 401 auth checks — HTTP standard behavior. The ERR taxonomy is for business-logic copy, not auth failures.

## Deviations from Plan

None — plan executed exactly as written. All "already done" findings (Obs 27, Obs 3) and "no change needed" findings (Obs 7, AI Unauthorized audit) were anticipated in the plan as verification tasks.

## Issues Encountered

- **File write conflict on meetings/page.tsx and assets/[id]/page.tsx:** Both files had been modified by a prior plan session. Re-reading before editing resolved the conflict.
- **Obs 22 target component was entity-operations-tab.tsx, not entity-overview-tab.tsx:** Initial plan language said "entity task widget" which could be either. Reading revealed the task widget is in the Operations tab's TasksInline component.
- **Pre-existing vitest failures (18):** Confirmed pre-existing via `git stash` baseline test run — same 18 failures existed before this plan's changes. Not regressions from this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- FIN-09, FIN-10, FIN-11 requirements closed. Plan 22-06 complete.
- Phase 22 has 7/9 plans complete (22-01 through 22-07). Remaining: 22-08 (Phase SUMMARY).
- Phase 22 success criteria 5, 6, 7 (FIN-09, FIN-10, FIN-11) are now met.
- `npm run build` passes clean. No TypeScript errors introduced.

---
*Phase: 22-fit-finish-code*
*Completed: 2026-04-17*
