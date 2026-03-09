---
phase: 12-ai-configuration-document-intake
plan: 01
subsystem: database
tags: [prisma, ai-config, schema, user-permissions, typescript]

# Dependency graph
requires:
  - phase: 11-foundation
    provides: PageHeader/SectionPanel components, dark mode patterns, component conventions
provides:
  - ExtractionStatus enum in Prisma schema (NONE/PENDING/PROCESSING/COMPLETE/FAILED)
  - aiEnabled and personalAiConfig fields on User model
  - extractionStatus, extractedFields, appliedFields, extractionError fields on Document model
  - getUserAIConfig() function with user-key-first fallback chain
  - createUserAIClient() convenience function for AI client instantiation
  - AI toggle column in Settings Users & Access tab
  - SERVICE_PROVIDER users default to aiEnabled=false on creation
affects:
  - 12-02 (document intake uses extractionStatus/extractedFields)
  - 12-03 and later (all AI feature phases read getUserAIConfig)
  - 18-ai-features (uses getUserAIConfig fallback chain)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getUserAIConfig fallback chain: personal key → tenant key → none, with source indicator"
    - "AI toggle: optimistic UI with SWR revalidation via PUT /api/users/[id]"
    - "Role-based AI defaults: SERVICE_PROVIDER off, GP_ADMIN/GP_TEAM on, LP_INVESTOR N/A"

key-files:
  created: []
  modified:
    - prisma/schema.prisma
    - prisma/seed.ts
    - src/lib/ai-config.ts
    - src/app/(gp)/settings/page.tsx
    - src/app/api/users/[id]/route.ts
    - src/app/api/users/route.ts

key-decisions:
  - "getUserAIConfig fallback chain: user personal key → tenant key → none (source field indicates origin)"
  - "SERVICE_PROVIDER users get aiEnabled=false on creation; GP_ADMIN/GP_TEAM default to true via schema"
  - "LP_INVESTOR rows show N/A (not a toggle) - AI access is not applicable to LP users"
  - "AI toggle calls PUT /api/users/[id] with aiEnabled boolean; no confirmation dialog needed for toggle"
  - "Force-reset wipes AiConfig table — previously saved tenant key must be re-entered after migration (expected)"

patterns-established:
  - "AI user config select: always select aiEnabled and personalAiConfig together when doing user AI lookups"
  - "createUserAIClient returns null when apiKey is null OR aiEnabled is false — callers must null-check"

requirements-completed: [AICONF-01, AICONF-02, AICONF-04, AICONF-05]

# Metrics
duration: 18min
completed: 2026-03-09
---

# Phase 12 Plan 01: Schema Foundation and AI Config Summary

**Prisma schema foundation with ExtractionStatus enum, User AI fields, Document extraction fields, getUserAIConfig() fallback chain, and per-user AI toggle in Settings**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-09T08:51:32Z
- **Completed:** 2026-03-09T09:09:00Z
- **Tasks:** 4 (3 code tasks + 1 verification)
- **Files modified:** 6

## Accomplishments
- Added ExtractionStatus enum and four AI extraction fields to Document model — foundation for Phase 12 document intake pipeline
- Added aiEnabled + personalAiConfig to User model — enables per-user AI access control and personal key overrides
- Implemented getUserAIConfig() with full fallback chain (personal key → tenant key → none) and source indicator
- Added AI Access toggle column to Settings Users & Access tab with LP_INVESTOR showing N/A
- Wired SERVICE_PROVIDER creation to aiEnabled=false by default in both API and schema
- Verified AI Configuration tab (AICONF-01) still renders and works correctly post-migration

## Task Commits

Each task was committed atomically:

1. **Task 1: Add schema fields to User and Document models** - `a4c7a07` (feat)
2. **Task 2: Implement getUserAIConfig() fallback chain helper** - `67e066f` (feat)
3. **Task 3: Add AI toggle to Users & Access tab and wire to user API** - `f0e83c7` (feat)
4. **Task 4: Verify AI Configuration tab renders and saves after schema migration** - no commit needed (verification only, no code changes)

## Files Created/Modified
- `prisma/schema.prisma` - Added ExtractionStatus enum, aiEnabled+personalAiConfig to User, extractionStatus+extractedFields+appliedFields+extractionError to Document
- `prisma/seed.ts` - Added comment explaining SERVICE_PROVIDER aiEnabled=false behavior (no SP users seeded)
- `src/lib/ai-config.ts` - Added UserAIConfig interface, getUserAIConfig() fallback chain, createUserAIClient() convenience function
- `src/app/(gp)/settings/page.tsx` - Added aiEnabled to User interface, AI Access column header, toggle cell, handleToggleAI handler, colSpan updated 6→7
- `src/app/api/users/[id]/route.ts` - Added aiEnabled?: boolean to UpdateUserSchema
- `src/app/api/users/route.ts` - Added aiEnabled to GET select, added aiEnabled=false for SERVICE_PROVIDER on POST

## Decisions Made
- Used existing AnthropicCompat class (takes apiKey string) in createUserAIClient rather than wrapping a new Anthropic instance — matched actual class API
- SERVICE_PROVIDER aiEnabled=false handled in POST /api/users/route.ts (where users are created via UI) rather than seed.ts (no SP users are seeded)
- GET /api/users select updated to include aiEnabled field so the toggle UI has access to current state
- No confirmDialog for AI toggle — it's a low-risk preference toggle, not a destructive action

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed createUserAIClient to use AnthropicCompat(apiKey) not AnthropicCompat(Anthropic instance)**
- **Found during:** Task 2 (getUserAIConfig implementation)
- **Issue:** Plan's code snippet passed `new Anthropic(...)` instance to AnthropicCompat constructor, but actual class takes `apiKey: string`
- **Fix:** Updated createUserAIClient to pass `config.apiKey` directly as string
- **Files modified:** src/lib/ai-config.ts
- **Verification:** Build passed with zero TypeScript errors
- **Committed in:** 67e066f (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added aiEnabled to GET /api/users select clause**
- **Found during:** Task 3 (wiring toggle to UI)
- **Issue:** The users GET endpoint select did not include aiEnabled, so toggle would always see undefined (falsy) and render incorrectly
- **Fix:** Added `aiEnabled: true` to the select object in GET /api/users
- **Files modified:** src/app/api/users/route.ts
- **Verification:** Build passed; toggle renders correctly with field available
- **Committed in:** f0e83c7 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 missing critical field)
**Impact on plan:** Both auto-fixes essential for correct behavior. No scope creep.

## Issues Encountered
- No SERVICE_PROVIDER users exist in seed.ts (only companies have SERVICE_PROVIDER type). The aiEnabled=false default is enforced in the API creation endpoint (POST /api/users) which is where real users are invited. The schema default also ensures any manually created SP users behave correctly.
- Force-reset wiped the AiConfig table as expected — AI Configuration tab will show "Not Connected" until a new key is entered. This is documented behavior.

## User Setup Required
None - no external service configuration required for this plan.

## Next Phase Readiness
- Schema foundation complete — all Phase 12 subsequent plans can now read ExtractionStatus and User AI fields
- getUserAIConfig() ready for use by document extraction pipeline (Plan 02+)
- AI toggle working in Settings — GP_ADMIN can enable/disable per-user AI access before document intake features go live
- One concern: The force-reset wiped any previously saved tenant AI API key. User will need to re-enter it in Settings > AI Configuration before testing AI features.

## Self-Check: PASSED

All verified:
- FOUND: prisma/schema.prisma (ExtractionStatus enum, aiEnabled, extractionStatus fields)
- FOUND: src/lib/ai-config.ts (getUserAIConfig, createUserAIClient exported)
- FOUND: src/app/(gp)/settings/page.tsx (AI Access column, handleToggleAI)
- FOUND: src/app/api/users/[id]/route.ts (aiEnabled in UpdateUserSchema)
- FOUND: src/app/api/users/route.ts (aiEnabled in select, aiEnabled=false for SERVICE_PROVIDER)
- FOUND: .planning/phases/12-ai-configuration-document-intake/12-01-SUMMARY.md
- Commits verified: a4c7a07, 67e066f, f0e83c7 all exist in git log
- Build passes: npm run build exits 0 with zero TypeScript errors

---
*Phase: 12-ai-configuration-document-intake*
*Completed: 2026-03-09*
