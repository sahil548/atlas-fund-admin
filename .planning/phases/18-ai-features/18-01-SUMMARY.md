---
phase: 18-ai-features
plan: "01"
subsystem: ai
tags: [vitest, nlp, intent-classification, command-bar, localStorage, typescript]

# Dependency graph
requires:
  - phase: 12-ai-configuration-document-intake
    provides: ai-service.ts searchAndAnalyze, createAIClient, buildSystemPrompt
provides:
  - classifyIntent() heuristic NL intent router (fuzzy_search | nl_query | nl_action)
  - getUnseenAlertCount() alert freshness utility
  - CommandBarProvider with pageContext, side panel state, conversation state, alert freshness
  - PageContext and ActionPlan types in command-bar-types.ts
  - searchAndAnalyze() with optional pageContext parameter
  - /api/ai/search route accepts pageContext in request body
  - Wave 0 test file with 19 passing unit tests
affects:
  - 18-02 (side panel and action execution consume provider state)
  - 18-03 (AI feature wiring uses pageContext from provider)
  - 18-04 (alert badge uses lastAlertSeenAt/updateLastAlertSeen from provider)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Heuristic NL intent classification: ACTION_VERBS array + QUERY_PHRASES array, short queries (<=2 words) default to fuzzy_search"
    - "Alert freshness via localStorage (atlas_last_alert_seen) — no schema changes needed"
    - "Provider-level conversation state — shared between inline dropdown and side panel"
    - "Optional pageContext parameter pattern for backward-compatible AI function extension"

key-files:
  created:
    - src/lib/ai-nl-intent.ts
    - src/lib/__tests__/ai-features.test.ts
  modified:
    - src/lib/command-bar-types.ts
    - src/components/features/command-bar/command-bar-provider.tsx
    - src/lib/ai-service.ts
    - src/lib/schemas.ts
    - src/app/api/ai/search/route.ts

key-decisions:
  - "classifyIntent uses heuristics (no LLM) — ACTION_VERBS prefix match for nl_action, QUERY_PHRASES prefix match for nl_query, <=2 words default to fuzzy_search"
  - "getUnseenAlertCount uses localStorage timestamp (not DB) — per CONTEXT.md constraint to avoid schema changes"
  - "Conversation state moved to CommandBarProvider (not command-bar.tsx) so dropdown and future side panel share same thread"
  - "pageContext parameter to searchAndAnalyze is optional — backward-compatible, existing callers unchanged"
  - "Page context section in system prompt omitted when pageType is 'other' or entityName/entityId absent"

patterns-established:
  - "Intent router pattern: classifyIntent() called before AI dispatch — short queries never hit LLM"
  - "Alert freshness pattern: lastAlertSeenAt from localStorage, updateLastAlertSeen() saves ISO timestamp"
  - "Provider conversation pattern: conversation[], addMessage(), clearConversation(), isSearching in provider context"

requirements-completed: [AI-01, AI-06]

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 18 Plan 01: AI Features Foundation Summary

**Heuristic NL intent classification (fuzzy_search/nl_query/nl_action), expanded CommandBarProvider with page context + conversation state + localStorage alert freshness, and page-context-aware searchAndAnalyze()**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T08:31:44Z
- **Completed:** 2026-03-10T08:36:33Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Created `classifyIntent()` heuristic router: 19 unit tests covering all intent paths pass (fuzzy search preserves fast paths, AI only activates for NL input)
- Expanded `CommandBarProvider` with 6 new state areas: pageContext, side panel open/close, conversation thread (shared across modes), isSearching flag, and localStorage-backed alert freshness
- Extended `searchAndAnalyze()` with optional `pageContext` parameter — injects "CURRENT PAGE CONTEXT" section into system prompt so "this deal" resolves correctly; all existing callers unaffected

## Task Commits

Each task was committed atomically:

1. **Task 1: NL intent classification module + Wave 0 tests** - `0f9e612` (feat + test — TDD)
2. **Task 2: Expand command bar types + provider** - `600bc6f` (feat)
3. **Task 3: Add page context injection to ai-service.ts** - `c267e0c` (feat)

**Plan metadata:** (docs commit — see below)

_Note: Task 1 used TDD: test file written first (RED), then implementation (GREEN). All 19 tests pass._

## Files Created/Modified

- `src/lib/ai-nl-intent.ts` — NL intent classification module: `classifyIntent()` and `getUnseenAlertCount()` exports
- `src/lib/__tests__/ai-features.test.ts` — 19 unit tests for intent classification (14 cases) and alert freshness (5 cases)
- `src/lib/command-bar-types.ts` — Added `PageContext` and `ActionPlan` interfaces
- `src/components/features/command-bar/command-bar-provider.tsx` — Expanded provider with pageContext, side panel, conversation, alert freshness state
- `src/lib/ai-service.ts` — `searchAndAnalyze()` and `buildSystemPrompt()` accept optional `pageContext`
- `src/lib/schemas.ts` — `AISearchSchema` extended with optional `pageContext` field
- `src/app/api/ai/search/route.ts` — Passes `pageContext` through to `searchAndAnalyze()`

## Decisions Made

- **Heuristic-only intent classification:** No LLM call for routing — ACTION_VERBS prefix check for nl_action, QUERY_PHRASES prefix check for nl_query, <=2-word queries default to fuzzy_search. Fast and deterministic.
- **localStorage for alert freshness:** Per CONTEXT.md and RESEARCH.md guidance — no schema changes, no DB writes, per-browser session which matches the intended UX.
- **Conversation state in provider:** Moved from component-local (would reset on pop-out) to CommandBarProvider so inline dropdown and side panel (Plan 02) share the same conversation thread.
- **Optional pageContext on searchAndAnalyze:** Backward-compatible API extension — all 30+ existing command bar uses continue without modification.
- **PageContext omitted from prompt when pageType=other:** Clean signal for non-specific pages (e.g., dashboard, settings) — only specific entity pages inject context.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `src/lib/__tests__/phase15-*.test.ts` and `src/app/api/lp/__tests__/entity-metrics.test.ts` were present before this plan. None were caused by or affect our changes. All errors in files we modified are clean (zero TypeScript errors in new/modified files).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 can now consume: `pageContext`/`setPageContext`, `isSidePanelOpen`/`openSidePanel`/`closeSidePanel`, `conversation`/`addMessage`/`clearConversation`/`isSearching` from `useCommandBar()`
- Plan 02 can build `CommandBarSidePanel` that reads `conversation` from provider (shared with inline dropdown)
- Plan 03 can wire command bar to call `classifyIntent()` before dispatching to fuzzy search vs AI
- Plan 04 can use `lastAlertSeenAt`/`updateLastAlertSeen` for proactive breach mention in command bar footer

---
*Phase: 18-ai-features*
*Completed: 2026-03-10*
