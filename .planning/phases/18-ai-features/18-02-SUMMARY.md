---
phase: 18-ai-features
plan: "02"
subsystem: ui
tags: [command-bar, side-panel, intent-routing, alerts, swr, react, typescript, nextjs]

# Dependency graph
requires:
  - phase: 18-ai-features plan 01
    provides: classifyIntent(), getUnseenAlertCount(), CommandBarProvider with conversation/pageContext/sidePanel state
  - phase: 12-ai-configuration-document-intake
    provides: /api/ai/search endpoint, ai-service.ts searchAndAnalyze
  - phase: 14-asset-management-task-management
    provides: /api/assets/monitoring endpoint with breach/expiration/maturity alerts
provides:
  - NL-aware command bar: classifyIntent routes fuzzy_search to DB-only, nl_query/nl_action to AI with pageContext
  - Proactive alert banner in dropdown: unseen breach/expiration count with dismiss + view link
  - Pop-out button in conversation area: moves conversation to persistent side panel
  - CommandBarSidePanel: fixed right-side panel with full conversation thread + follow-up input
  - AlertBadge: SWR-based unseen count badge (60s refresh) for command bar entry point
  - Pathname-based page context auto-detection in CommandBarProvider
  - AppShell conditionally renders CommandBarSidePanel when isSidePanelOpen
affects:
  - 18-03 (action execution in command bar; nl_action currently falls through to nl_query)
  - 18-04 (LP update draft — side panel conversation threading)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Intent-based API dispatch: classifyIntent() called before any API call; fuzzy_search → DB only, nl_query/nl_action → AI + DB"
    - "Provider-shared conversation: command bar dropdown and side panel read same conversation[] from CommandBarProvider"
    - "One-shot alert fetch: useRef to track alertFetchedRef prevents re-fetching on every dropdown open"
    - "SWR-based alert badge: refreshInterval:60000, revalidateOnFocus:false to avoid excessive /api/assets/monitoring calls"
    - "Fixed side panel layout: z-40 (below modals z-50), does not push page content"
    - "Pathname-based page context: usePathname() in CommandBarProvider auto-detects deal/asset/entity/contact/dashboard context from URL"

key-files:
  created:
    - src/components/features/command-bar/command-bar-side-panel.tsx
    - src/components/features/command-bar/alert-badge.tsx
  modified:
    - src/components/features/command-bar/command-bar.tsx
    - src/components/features/command-bar/command-bar-provider.tsx
    - src/components/layout/app-shell.tsx

key-decisions:
  - "Pop-out button only visible during active AI conversation (conversation.length > 0) — avoids UI noise when starting fresh"
  - "Alert banner links to /assets page (not /monitoring which doesn't exist as a route) — monitoring panel lives on assets page"
  - "DB debounced search only fires for fuzzy_search intent — avoids unnecessary DB calls when user types NL queries"
  - "Side panel z-40 (not z-50) — panels below modals/toasts so confirmations still work"
  - "alertFetchedRef tracks one-shot fetch per dropdown open session — avoids pinging /api/assets/monitoring every time command bar opens/closes"

patterns-established:
  - "Intent-dispatch pattern: classifyIntent() before any API call in both command bar and side panel — consistent routing"
  - "Shared conversation thread: both command bar dropdown and side panel addMessage() to same provider state"
  - "Alert freshness integration: AlertBadge + proactive banner both use getUnseenAlertCount() with lastAlertSeenAt from provider"

requirements-completed: [AI-01, AI-06]

# Metrics
duration: 6min
completed: 2026-03-10
---

# Phase 18 Plan 02: AI Features Command Bar UI Summary

**NL intent routing wired into command bar with AI response rendering, persistent side panel for pop-out conversations, and proactive unseen-alert banner driven by covenant breach/expiration monitoring**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-10T08:40:15Z
- **Completed:** 2026-03-10T08:46:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Wired `classifyIntent()` into command bar submit flow: short/fuzzy queries route to DB-only search, NL questions route to AI with `pageContext` injected — existing fuzzy search behavior fully preserved
- Built `CommandBarSidePanel` (380px fixed right panel, z-40) with full conversation thread, follow-up input, search result rendering, and close button; shares conversation state from provider so pop-out is seamless
- Added proactive alert banner at bottom of dropdown showing unseen breach/expiration count (via `getUnseenAlertCount()`) with dismiss button and link to assets page; `AlertBadge` component provides SWR-backed count badge (60s refresh)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire NL intent routing into command bar + AI response rendering + page context hooks** - `f750c7b` (feat)
2. **Task 2: Create side panel component + wire into app-shell + alert badge** - `70bde56` (feat)

## Files Created/Modified

- `src/components/features/command-bar/command-bar.tsx` — NL intent routing via `classifyIntent()`, provider conversation state, pop-out button, proactive alert banner, restricted DB debounce to fuzzy_search intent only
- `src/components/features/command-bar/command-bar-provider.tsx` — Added `usePathname()` auto-detection: deals/assets/entities/contacts/dashboard context from URL patterns
- `src/components/features/command-bar/command-bar-side-panel.tsx` — New: persistent right-side panel with conversation thread, follow-up input, search results, clear button, close button
- `src/components/features/command-bar/alert-badge.tsx` — New: SWR-based unseen alert count badge using `getUnseenAlertCount()` with `lastAlertSeenAt` from provider
- `src/components/layout/app-shell.tsx` — Added `CommandBarSidePanel` render slot; conditionally renders when `isSidePanelOpen` is true

## Decisions Made

- **Alert banner links to `/assets`:** No `/monitoring` route exists as a Next.js page — monitoring panel lives on the assets page. Using `/assets` is the closest valid route.
- **DB debounce only for fuzzy_search intent:** When user is typing a natural language question, debounced DB search would fire unnecessarily. `classifyIntent()` on the live query gates the debounce to only run for short/fuzzy inputs.
- **Pop-out only shown when conversation.length > 0:** Avoids showing pop-out button in the empty/default suggestions view — cleaner initial UX.
- **Side panel z-40 (not z-50):** Modal/toast providers use z-50 — side panel sits below them so confirmation dialogs continue to work normally.
- **alertFetchedRef to prevent repeat fetches:** Using a ref (not state) to track whether the alert fetch happened this session prevents pinging the monitoring endpoint every time the dropdown opens/closes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03 can implement `nl_action` execution: the command bar already routes nl_action intent to the same AI path; Plan 03 just needs to intercept and show the `ActionPlan` confirmation UI before executing
- Side panel is live and persists across navigation; Plan 04 LP update draft feature can use the side panel conversation thread directly
- `AlertBadge` component is ready to be placed on the sidebar command bar trigger button (wherever the trigger is rendered)

---
*Phase: 18-ai-features*
*Completed: 2026-03-10*
