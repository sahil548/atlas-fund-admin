---
phase: 18-ai-features
plan: "04"
subsystem: ai
tags: [command-bar, task-suggestions, lp-update, ai-endpoints, prisma, zod, nextjs, react, typescript]

# Dependency graph
requires:
  - phase: 18-ai-features plan 01
    provides: classifyIntent(), CommandBarProvider with pageContext/conversation state, getUnseenAlertCount()
  - phase: 18-ai-features plan 02
    provides: NL intent routing in command bar, side panel, shared conversation state, CommandBarSidePanel
  - phase: 18-ai-features plan 03
    provides: /api/ai/execute endpoint, ActionConfirmation component, planAction() in ai-service
  - phase: 12-ai-configuration-document-intake
    provides: createUserAIClient(), getUserAIConfig fallback chain (user key -> tenant key -> none)
provides:
  - POST /api/ai/suggest-tasks: context-aware task suggestions for DEAL/ASSET/ENTITY
  - POST /api/ai/draft-lp-update: LP quarterly update draft from real fund data
  - TaskSuggestionCard inline component: priority badge + one-click Add button wired to POST /api/tasks
  - LPUpdateDraft inline component: formatted draft text with Copy to Clipboard button
  - CommandBarMessage extended with taskSuggestions and lpUpdateDraft fields
  - isSuggestQuery detection in both command bar and side panel submitQuery
  - isLPUpdate detection with entity page guard
  - Phase 18 human-verified end-to-end: all 8 AI requirements (AI-01 through AI-08) confirmed working
affects:
  - 19-dashboard (AI infrastructure complete — no more AI-specific dependencies)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dedicated AI endpoint pattern: each AI capability gets its own /api/ai/[action] route using createUserAIClient + rateLimit + parseBody + jsonrepair"
    - "Data cap pattern for LP update: max 10 assets by fairValue, max 5 capital calls, max 5 distributions — prevents LLM token limit issues (RESEARCH.md Pitfall 5)"
    - "Inline component pattern for AI response types: TaskSuggestionCard and LPUpdateDraft defined inside component files (not separate files) per plan spec"
    - "Pattern detection before generic routing: isSuggestQuery and isLPUpdate checks come before the generic nl_action/nl_query branches in submitQuery"
    - "One-click task creation: POST /api/tasks with contextType + contextId derived from pageContext — no new endpoint needed"

key-files:
  created:
    - src/app/api/ai/suggest-tasks/route.ts
    - src/app/api/ai/draft-lp-update/route.ts
  modified:
    - src/lib/command-bar-types.ts
    - src/components/features/command-bar/command-bar.tsx
    - src/components/features/command-bar/command-bar-side-panel.tsx

key-decisions:
  - "suggest-tasks uses actual Prisma schema fields: CapitalCall.amount (not totalAmount), DistributionEvent.grossAmount — always verify against schema.prisma"
  - "Pattern detection ordered before generic nl_action routing: isSuggestQuery and isLPUpdate must be checked before classifyIntent nl_action/nl_query dispatch; discovered via post-verification fix (commit 0d0c718)"
  - "LP update returns guidance message when not on entity page: 'Which fund would you like to draft an LP update for? Navigate to a fund/entity page...' — clean UX for context-free queries"
  - "TaskSuggestion interface added to command-bar-types.ts: shared type for CommandBarMessage.taskSuggestions array"
  - "Task creation uses page context: firmId from useFirm(), contextType/contextId from pageContext, plus pageType-specific dealId/assetId/entityId fields"

patterns-established:
  - "AI capability endpoint pattern: POST /api/ai/[feature] — auth + rateLimit + parseBody(Zod) + createUserAIClient + DB gather + LLM prompt + jsonrepair + return structured response"
  - "Extended message type pattern: new AI response types added as optional fields on CommandBarMessage (taskSuggestions?, lpUpdateDraft?) — backward compatible, existing messages unaffected"
  - "Inline response component pattern: small UI components (TaskSuggestionCard, LPUpdateDraft) defined inline in the consuming component file — avoids extra file proliferation for simple rendering"

requirements-completed: [AI-07, AI-08]

# Metrics
duration: ~30min (implementation) + human verification
completed: 2026-03-10
---

# Phase 18 Plan 04: Task Suggestions and LP Update Drafting Summary

**On-demand task suggestion endpoint (DEAL/ASSET/ENTITY context-aware) and LP quarterly update drafting from real fund data, both wired into command bar dropdown and side panel with TaskSuggestionCard one-click creation and LPUpdateDraft Copy button — completing all 8 Phase 18 AI requirements (AI-01 through AI-08)**

## Performance

- **Duration:** ~30 min (implementation) + human verification session
- **Started:** 2026-03-10T09:52:24Z
- **Completed:** 2026-03-10T17:17:00Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 5

## Accomplishments

- Built `/api/ai/suggest-tasks` POST endpoint: gathers DEAL (activities, tasks, documents), ASSET (activity events, tasks), or ENTITY (asset allocations, tasks) context; sends structured prompt to LLM; parses with `jsonrepair`; returns `{ tasks: [{ title, priority, rationale }] }` capped to 5 suggestions
- Built `/api/ai/draft-lp-update` POST endpoint: gathers entity data with capped includes (max 10 assets by fairValue, max 5 capital calls, max 5 distributions); formats numbers with `fmt()`; sends 4-section LP update prompt; returns `{ draft: string, entityName: string }`
- Extended `CommandBarMessage` type with optional `taskSuggestions` and `lpUpdateDraft` fields; added `TaskSuggestion` interface to `command-bar-types.ts`
- Added pattern detection in both `command-bar.tsx` and `command-bar-side-panel.tsx`: `isSuggestQuery` regex detects "what should I do / next steps / suggest tasks", `isLPUpdate` regex detects "draft LP update / LP quarterly / investor update"
- `TaskSuggestionCard` renders each suggestion with priority badge (HIGH/MEDIUM/LOW color coded) and "+ Add" button that calls `POST /api/tasks` with `contextType/contextId/dealId/assetId/entityId` from page context; shows "✓ Added" state and toast confirmation
- `LPUpdateDraft` renders full draft text in scrollable container with "Copy to Clipboard" button and copy confirmation toast

## Task Commits

Each task was committed atomically:

1. **Task 1: Create suggest-tasks and draft-lp-update endpoints** - `db4caa1` (feat)
2. **Task 2: Wire task suggestions and LP update into command bar and side panel** - `e069718` (feat)
3. **Fix: Reorder special pattern checks before generic nl_action handler** - `0d0c718` (fix — applied post-verification)
4. **Task 3: Human verification checkpoint** — All 8 AI requirements confirmed passing in browser

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/app/api/ai/suggest-tasks/route.ts` — New: context-aware task suggestion endpoint for DEAL/ASSET/ENTITY with rate limiting, Zod validation, createUserAIClient, jsonrepair parsing
- `src/app/api/ai/draft-lp-update/route.ts` — New: LP quarterly update drafting endpoint with capped fund data aggregation and fmt() number formatting
- `src/lib/command-bar-types.ts` — Added `TaskSuggestion` interface and `taskSuggestions?` / `lpUpdateDraft?` fields to `CommandBarMessage`
- `src/components/features/command-bar/command-bar.tsx` — Added isSuggestQuery/isLPUpdate detection in submitQuery; TaskSuggestionCard and LPUpdateDraft inline components; rendering in conversation thread
- `src/components/features/command-bar/command-bar-side-panel.tsx` — Same pattern detection and rendering as command-bar.tsx; side panel TaskSuggestionCard/LPUpdateDraft variants

## Decisions Made

- **Pattern detection ordered before generic routing:** `isSuggestQuery` and `isLPUpdate` must be checked before the generic `nl_action`/`nl_query` dispatch. Discovered during post-verification: LP update query matched `nl_action` classification and was intercepted before reaching the LP update handler. Fixed in commit `0d0c718`.
- **CapitalCall uses `.amount` not `.totalAmount`:** Plan spec referenced `totalAmount` but actual Prisma schema field is `amount`. Corrected to match schema.prisma.
- **LP update guidance when not on entity page:** Returns a clear message "Which fund would you like to draft an LP update for? Navigate to a fund/entity page..." rather than failing silently — clean UX for context-free queries.
- **Inline component pattern:** `TaskSuggestionCard` and `LPUpdateDraft` defined inline in the consuming component files rather than as separate files — avoids over-engineering for small UI components per plan spec.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reordered pattern detection before generic intent routing**
- **Found during:** Task 3 (human verification — LP update item 6)
- **Issue:** `isLPUpdate` and `isSuggestQuery` checks were placed after the `nl_action` branch in `submitQuery`. Queries like "draft an LP update for this fund" were classified as `nl_action` by `classifyIntent()` and intercepted before reaching the LP update handler — showing the action confirmation UI instead of the LP draft.
- **Fix:** Moved `isSuggestQuery` and `isLPUpdate` detection to run before the `nl_action` branch check. Both now short-circuit with their specialized handlers before generic routing takes effect.
- **Files modified:** src/components/features/command-bar/command-bar.tsx, src/components/features/command-bar/command-bar-side-panel.tsx
- **Verification:** LP update query now correctly renders the draft in the conversation thread; task suggestion query correctly shows TaskSuggestionCards
- **Committed in:** 0d0c718 (post-verification fix)

---

**Total deviations:** 1 auto-fixed (Rule 1 — ordering bug caught during human verification)
**Impact on plan:** Ordering fix required for AI-07 and AI-08 to work correctly. No behavior change beyond the intended design. No scope creep.

## Human Verification Results

All 7 verification steps passed in browser:

1. **AI-01 (NL Query):** "show me all deals over $10M" returned AI-generated answer inline; "deals" showed fuzzy search only
2. **AI-02 (Action Execution):** "create a task" returned AMBIGUOUS clarification; provided details; task created with success toast
3. **AI-03/04/05 (Deal Lifecycle):** "generate DD summary for this deal" triggered ActionConfirmation with 60-second warning; deal context resolved via page context
4. **AI-06 (Proactive Alerts):** "Heads up: 10 new alerts since your last visit" amber banner displayed in dropdown
5. **Side Panel Pop-Out:** Pop-out transferred conversation to persistent right panel; survived page navigation
6. **AI-07 (LP Update):** "draft an LP update for this fund" on entity page rendered formatted quarterly update with Copy to Clipboard button (after ordering fix)
7. **AI-08 (Task Suggestions):** "what should I do next on this deal" on deal page returned 5 suggestions with priority badges and Add buttons; clicking Add created task with success toast

## Issues Encountered

None beyond the ordering bug auto-fixed above.

## User Setup Required

None - no external service configuration required. An AI API key (OpenAI or Anthropic) must be configured in Settings → AI Configuration or Profile → AI Settings for AI features to function. This is pre-existing infrastructure from Phase 12.

## Phase 18 Completion

All 8 AI requirements delivered across 4 plans:

| Requirement | Plan | Status |
|-------------|------|--------|
| AI-01: NL query in command bar | 18-01, 18-02 | Complete |
| AI-02: Action execution via command bar | 18-03 | Complete |
| AI-03: CIM extraction to deal fields | 18-03 | Complete |
| AI-04: DD summary via command bar | 18-03 | Complete |
| AI-05: IC memo via command bar | 18-03 | Complete |
| AI-06: Covenant breach proactive alerts | 18-01, 18-02 | Complete |
| AI-07: LP update drafting | 18-04 | Complete |
| AI-08: Task suggestions with one-click creation | 18-04 | Complete |

## Next Phase Readiness

- Phase 19 (Dashboard & Supporting Modules) can begin immediately
- All 8 AI requirements verified working end-to-end
- The `CommandBarProvider` conversation state, `pageContext`, and AI endpoints are all stable infrastructure for Phase 19
- No outstanding blockers from Phase 18

## Self-Check: PASSED

- src/app/api/ai/suggest-tasks/route.ts: FOUND
- src/app/api/ai/draft-lp-update/route.ts: FOUND
- src/components/features/command-bar/command-bar.tsx: FOUND
- src/components/features/command-bar/command-bar-side-panel.tsx: FOUND
- src/lib/command-bar-types.ts: FOUND
- .planning/phases/18-ai-features/18-04-SUMMARY.md: FOUND
- Commit db4caa1: FOUND
- Commit e069718: FOUND
- Commit 0d0c718: FOUND

---
*Phase: 18-ai-features*
*Completed: 2026-03-10*
