---
phase: 06-lp-portal
plan: 02
subsystem: api, ui
tags: [zod, swr, prisma, lp-portal, notifications, preferences]

# Dependency graph
requires:
  - phase: 06-lp-portal-01
    provides: LP portal base pages and investor provider

provides:
  - GET/PUT /api/investors/[id]/notification-preferences (notification preferences CRUD)
  - UpdateNotificationPreferencesSchema Zod schema in schemas.ts
  - LP settings page at /lp-settings with 4-section notification preferences form
  - /lp-settings route registered in routes.ts LP sidebar

affects:
  - phase 07 notification engine (reads preferences to determine delivery channel/digest)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Debounced auto-save pattern: setTimeout/clearTimeout in form onChange, 500ms delay
    - GP override rule as read-only system constant returned on every GET (never stored)
    - Upsert with clean-data filter: strip undefined fields before Prisma upsert to avoid overwriting existing data with null

key-files:
  created:
    - src/app/api/investors/[id]/notification-preferences/route.ts
    - src/app/(lp)/lp-settings/page.tsx
  modified:
    - src/lib/schemas.ts
    - src/lib/routes.ts

key-decisions:
  - "gpOverrides.capitalCallsAlwaysImmediate returned as system constant on every GET/PUT response — not stored in DB, enforced by notification engine in Phase 7"
  - "Debounce auto-save at 500ms per section change — immediate UI feedback without excessive API calls"
  - "Undefined field filtering before Prisma upsert — prevents overwriting existing preferences when only a subset of fields are sent"
  - "SMS channel warning shown inline (not blocking) — user sees the issue but can still save other preferences"

patterns-established:
  - "Auto-save debounce: clearTimeout + setTimeout pattern, no external debounce library"
  - "Form opacity-70 + pointer-events-none during save — visual disabled state without disabling DOM inputs"
  - "useEffect to sync form state from SWR data on investor switch"

requirements-completed: [LP-03]

# Metrics
duration: 3min
completed: 2026-03-08
---

# Phase 6 Plan 02: LP Communication Preferences Summary

**Notification preferences CRUD API (GET/PUT) with Zod validation, LP settings page with 4-section form, auto-save debounce, and GP override rule (capital calls always immediate)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-08T04:06:25Z
- **Completed:** 2026-03-08T04:09:08Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Zod schema `UpdateNotificationPreferencesSchema` for notification preference payloads
- GET `/api/investors/[id]/notification-preferences` returns current preferences or defaults (email channel, immediate digest, all categories on)
- PUT `/api/investors/[id]/notification-preferences` upserts with validation; always appends `gpOverrides.capitalCallsAlwaysImmediate: true`
- LP settings page at `/lp-settings` with 4 sections: contact info, preferred channel, notification categories, digest preference
- Auto-save on form change with 500ms debounce and toast feedback
- `/lp-settings` registered in routes.ts (LP sidebar, priority 58, Settings icon)

## Task Commits

Each task was committed atomically:

1. **Task 1: Notification preferences API + Zod schema** - `493b61e` (feat)
2. **Task 2: LP settings page + route registration** - `a49dc46` (feat)

**Plan metadata:** (to be committed with SUMMARY.md)

## Files Created/Modified
- `src/lib/schemas.ts` - Added UpdateNotificationPreferencesSchema (channel, email, phone, digest, notificationTypes)
- `src/app/api/investors/[id]/notification-preferences/route.ts` - GET returns prefs or defaults; PUT upserts with Prisma; both append gpOverrides
- `src/app/(lp)/lp-settings/page.tsx` - 4-section form with auto-save debounce, SMS warning, capital call info box
- `src/lib/routes.ts` - /lp-settings added to LP portal routes (priority 58)

## Decisions Made
- `gpOverrides.capitalCallsAlwaysImmediate` is a system constant returned on every API response — never stored in DB. The notification engine in Phase 7 enforces this rule at delivery time.
- Debounce is 500ms with clearTimeout/setTimeout — no external library needed, matches plan spec.
- Undefined fields are filtered before Prisma upsert so a partial update (e.g., just changing the channel) doesn't null-out the email address already stored.
- SMS warning is shown inline below the channel radio group, not blocking — user can save other preferences while they remember to add their phone number.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Build lock contention from a prior build process — waited 5 seconds and retried successfully.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Notification preferences are stored and ready for Phase 7 notification engine
- Phase 7 can read preferred channel and digest preference per investor from `/api/investors/[id]/notification-preferences`
- Capital call bypass rule (`gpOverrides.capitalCallsAlwaysImmediate: true`) is documented in API responses

---
*Phase: 06-lp-portal*
*Completed: 2026-03-08*
