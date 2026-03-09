---
phase: 12-ai-configuration-document-intake
plan: 02
subsystem: ui
tags: [profile, ai-config, api-endpoint, encryption, top-bar, routes]

# Dependency graph
requires:
  - phase: 12-01
    provides: getUserAIConfig() fallback chain, encryptApiKey/decryptApiKey, aiEnabled+personalAiConfig on User
provides:
  - GET /api/users/[id]/ai-config endpoint (aiEnabled, provider, model, hasPersonalKey, source)
  - PUT /api/users/[id]/ai-config endpoint (encrypt + store personal key)
  - /profile page with User Info + AI Settings section
  - Top bar user avatar linking to /profile
  - hiddenFromSidebar routing pattern for utility pages
affects:
  - 12-03+ (document intake can rely on per-user AI config being configurable)
  - 18-ai-features (profile page is where users manage their AI credentials)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "hiddenFromSidebar: true on AppRoute to exclude from sidebar without removing from route registry"
    - "Source badge indicator pattern: emerald=user-key, blue=firm-default, gray=none"
    - "API key form: preserves existing encrypted key when apiKey field omitted from PUT body"
    - "formInitialized guard: initialize form state from SWR once, then allow local edits"

key-files:
  created:
    - src/app/api/users/[id]/ai-config/route.ts
    - src/app/(gp)/profile/page.tsx
  modified:
    - src/lib/routes.ts
    - src/components/layout/top-bar.tsx

key-decisions:
  - "GET /api/users/[id]/ai-config never returns raw API key — returns hasPersonalKey boolean instead"
  - "PUT body: apiKey omitted preserves existing key; apiKey: null clears it; apiKey: string encrypts and replaces"
  - "Profile route hidden from sidebar via hiddenFromSidebar: true flag, not by omitting from APP_ROUTES"
  - "Top bar avatar is a direct Link to /profile (no dropdown menu — kept minimal per plan)"
  - "AI Settings card opacity-60 when aiEnabled=false; form fields fully hidden, only admin message shown"

patterns-established:
  - "hiddenFromSidebar pattern: add to AppRoute interface + filter in getSidebarNav + getModuleRoutes"
  - "formInitialized guard: prevents SWR data from overwriting in-progress user edits"

requirements-completed: [AICONF-03]

# Metrics
duration: 7min
completed: 2026-03-09
---

# Phase 12 Plan 02: Profile Page and Personal AI Config Summary

**Profile page with AI Settings section at /profile, personal AI config GET/PUT API endpoint, and user avatar in top bar linking to profile**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-09T09:01:03Z
- **Completed:** 2026-03-09T09:08:26Z
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 2

## Accomplishments

- Created GET /api/users/[id]/ai-config — returns resolved AI config with source indicator, never exposes raw key
- Created PUT /api/users/[id]/ai-config — accepts provider/model/optional apiKey; encrypts new keys via encryptApiKey(); preserves existing key when omitted; clears key when apiKey: null
- Created /profile page with User Info card (read-only: name, role, firm, initials) and AI Settings section
- AI Settings section: source badge, provider dropdown, model input, password key input with "****** (saved)" placeholder, Remove key button, Save button
- AI disabled state: full section grayed out (opacity-60) with admin contact message, form hidden
- Added /profile to APP_ROUTES with hiddenFromSidebar: true — route registered for command bar/AI/URL validation but not rendered in sidebar nav
- Added hiddenFromSidebar field to AppRoute interface; getSidebarNav() and getModuleRoutes() filter it out
- Updated top-bar.tsx: added user initials avatar as a Link to /profile

## Task Commits

Each task committed atomically:

1. **Task 1: Create personal AI config API endpoint** — `e152d58` (feat)
2. **Task 2: Create profile page with AI Settings section and navigation** — `2d9f8ea` (feat)

## Files Created/Modified

- `src/app/api/users/[id]/ai-config/route.ts` — GET/PUT handlers for personal AI config (156 lines)
- `src/app/(gp)/profile/page.tsx` — Profile page with user info + AI Settings section (241 lines)
- `src/lib/routes.ts` — Added hiddenFromSidebar field to AppRoute interface; added /profile entry; filtered in getSidebarNav and getModuleRoutes
- `src/components/layout/top-bar.tsx` — Added useUser() import and user avatar Link to /profile

## Decisions Made

- GET endpoint returns `hasPersonalKey: boolean` rather than any form of the key itself — client only needs to know whether a key exists to render the "****** (saved)" placeholder
- PUT body semantics: `apiKey` field **omitted** = preserve existing encrypted key; `apiKey: null` = clear personal key; `apiKey: "sk-..."` = encrypt and replace. This matches the principle of least surprise for partial updates
- Profile route uses `hiddenFromSidebar: true` rather than being excluded from APP_ROUTES entirely — this keeps it discoverable via command bar and AI navigation suggestions
- Top bar avatar is a plain Link (no dropdown) — plan specified "keep it minimal"
- AI Settings card uses `opacity-60` on the wrapper div when disabled, with the message inside — this visually communicates the locked state without a separate disabled component

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Notes

- `npm run build` exits with "Compiled successfully" and zero TypeScript errors. The final "Collecting page data" failure (`ENOENT: pages-manifest.json`) is a pre-existing infrastructure issue (OOM kill during Turbopack TypeScript check phase, present since Plan 01) — not caused by this plan's changes. `npx tsc --noEmit --skipLibCheck` passes cleanly.

## User Setup Required

None — no migration required, no external service needed.

## Next Phase Readiness

- Personal AI config is now manageable via /profile page
- API endpoint ready for document intake pipeline to use
- Top bar navigation to profile live — users can set their personal AI key before extraction features go live

## Self-Check: PASSED

All verified:
- FOUND: src/app/api/users/[id]/ai-config/route.ts (GET and PUT exports)
- FOUND: src/app/(gp)/profile/page.tsx (>100 lines, AI Settings section)
- FOUND: src/lib/routes.ts (contains /profile with hiddenFromSidebar: true)
- FOUND: src/components/layout/top-bar.tsx (Link to /profile)
- Commits verified: e152d58, 2d9f8ea both exist in git log
- TypeScript: npx tsc --noEmit --skipLibCheck exits 0
- Next.js compile: "✓ Compiled successfully" confirmed

---
*Phase: 12-ai-configuration-document-intake*
*Completed: 2026-03-09*
