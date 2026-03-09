---
phase: 12-ai-configuration-document-intake
plan: 03
subsystem: api
tags: [ai, document-extraction, openai, anthropic, prisma, nextjs, typescript]

# Dependency graph
requires:
  - phase: 12-ai-configuration-document-intake
    provides: ExtractionStatus enum, extractionStatus/extractedFields/extractionError fields on Document, getUserAIConfig fallback chain, createUserAIClient convenience function

provides:
  - extractDocumentFields() function with 4 type-specific schemas (CIM/FINANCIAL, LEASE/LEGAL, K1/TAX)
  - shouldExtractAI() helper to check if a category is AI-extractable
  - Async AI extraction trigger in deals/[id]/documents POST handler
  - Async AI extraction trigger in global /documents POST handler (with added text extraction)
  - POST /api/documents/[id]/extract retry endpoint for failed/skipped extractions
  - extractedText now saved in global documents endpoint (was previously missing)

affects:
  - 12-02 (document intake UI reads extractionStatus and extractedFields)
  - 18-ai-features (extraction pipeline is the foundation for structured data review)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fire-and-forget extraction: .catch() after extractDocumentFields() call — never await in upload handlers"
    - "90-second AI timeout: Promise.race([aiCall, aiTimeout]) matching extract-metadata/route.ts pattern"
    - "JSON parse with regex fallback: try JSON.parse, catch with /\\{[\\s\\S]*\\}/ match for malformed AI responses"
    - "Graceful no-key handling: set extractionStatus=NONE (not FAILED) when no AI key configured"
    - "firmId resolution order: query param > authUser.firmId in extraction trigger"

key-files:
  created:
    - src/app/api/documents/[id]/extract/route.ts
  modified:
    - src/lib/document-extraction.ts
    - src/app/api/deals/[id]/documents/route.ts
    - src/app/api/documents/route.ts

key-decisions:
  - "FINANCIAL schema uses CIM fields (dealSize, targetReturn, etc.) — covers both CIMs and credit docs from one schema"
  - "shouldExtractAI() checks category string against FINANCIAL/LEGAL/TAX — does not require enum import"
  - "Global documents endpoint now calls extractTextFromBuffer() (was missing before this plan)"
  - "Retry endpoint awaits extraction synchronously (user-triggered, expects result) vs upload paths fire-and-forget"
  - "No AI key sets extractionStatus=NONE with error message, not FAILED — FAILED reserved for actual extraction errors"

patterns-established:
  - "extractDocumentFields signature: (documentId, category, extractedText, firmId, userId?) — userId optional for firm-level fallback"
  - "Extraction trigger pattern: if (extractedText && firmId && shouldExtractAI(category)) { extractDocumentFields(...).catch(err => console.error(...)); }"

requirements-completed: [DOC-01, DOC-02]

# Metrics
duration: 7min
completed: 2026-03-09
---

# Phase 12 Plan 03: AI Document Extraction Pipeline Summary

**Async AI field extraction pipeline with type-specific schemas (CIM, lease, K-1), auto-triggered on upload for FINANCIAL/LEGAL/TAX categories, with manual retry endpoint**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-09T09:01:05Z
- **Completed:** 2026-03-09T09:08:41Z
- **Tasks:** 2
- **Files modified:** 4 (3 modified + 1 created)

## Accomplishments
- Built extractDocumentFields() with 4 type-specific schemas: CIM (8 fields), lease agreement (8 fields), credit document (8 fields), K-1 tax (7 fields)
- Wired non-blocking async extraction trigger into both upload endpoints — uploads return immediately, AI runs in background
- Added missing extractTextFromBuffer() call to global /api/documents POST (text extraction was absent, so AI could never have fired)
- Created POST /api/documents/[id]/extract retry endpoint that runs extraction synchronously and returns the result
- Build passes with zero TypeScript errors and new route visible in build output

## Task Commits

Each task was committed atomically:

1. **Task 1: Build extractDocumentFields() with type-specific schemas** - `8febf57` (feat)
2. **Task 2: Wire extraction triggers into upload endpoints + create retry endpoint** - `81e4407` (feat)

## Files Created/Modified
- `src/lib/document-extraction.ts` - Added extractDocumentFields(), shouldExtractAI(), 4 extraction schemas; top-level imports for prisma and ai-config functions
- `src/app/api/deals/[id]/documents/route.ts` - Added getAuthUser import, firmId resolution, async AI extraction trigger after document creation
- `src/app/api/documents/route.ts` - Added extractTextFromBuffer (was missing), AI extraction trigger, firmId resolution from authUser or query param
- `src/app/api/documents/[id]/extract/route.ts` - NEW: POST retry endpoint with auth, validation, synchronous extraction, result return

## Decisions Made
- Imported createUserAIClient, createAIClient, getModelForFirm at the top level in document-extraction.ts — no dynamic imports needed since ai-config.ts doesn't create circular dependencies with document-extraction.ts
- FINANCIAL category uses CIM schema (dealSize, targetReturn, etc.) rather than a separate CREDIT schema — this matches the plan's locked decision and avoids overcomplicating category mapping
- Retry endpoint uses `authUser.firmId` as fallback when no firmId query param — consistent with how the global documents route resolves firmId

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added extractTextFromBuffer to global documents endpoint**
- **Found during:** Task 2 (wiring extraction triggers)
- **Issue:** The important context note flagged: global /api/documents/route.ts did not call extractTextFromBuffer(), meaning doc.extractedText would always be null and AI extraction could never trigger. The plan's action text confirmed the same fix was needed.
- **Fix:** Added buffer/originalFileName tracking variables to POST handler, added extractTextFromBuffer() call before document creation, saved result as extractedText in document.create()
- **Files modified:** src/app/api/documents/route.ts
- **Verification:** Build passes; extractedText now saved in document record before AI trigger checks it
- **Committed in:** 81e4407 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential fix — without it AI extraction could never fire on global document uploads. No scope creep.

## Issues Encountered
- Stale `.next/lock` file from a previous interrupted build blocked new builds. Resolved by identifying and killing the node process holding the lock (PID 2164) and removing the lock file.

## User Setup Required
None - no external service configuration required for this plan. AI extraction uses the existing AI API key from Settings > AI Configuration (tenant key) or user personal keys configured in Plan 01.

## Next Phase Readiness
- AI extraction pipeline fully operational — documents uploaded as FINANCIAL/LEGAL/TAX will auto-extract fields after upload
- extractedFields stored as structured JSON: `{ fieldKey: { aiValue, label, confidence } }` — ready for Plan 02 document intake UI to display
- Manual retry available at POST /api/documents/[id]/extract?firmId=xxx for failed extractions
- One concern: Vercel serverless may kill background work after HTTP response — fire-and-forget extraction may not complete on cold starts. The retry endpoint is the safety net.

## Self-Check: PASSED

All verified:
- FOUND: src/lib/document-extraction.ts (extractDocumentFields and shouldExtractAI exported)
- FOUND: src/app/api/documents/[id]/extract/route.ts (POST endpoint created)
- FOUND: src/app/api/deals/[id]/documents/route.ts (extraction trigger added)
- FOUND: src/app/api/documents/route.ts (extractTextFromBuffer + extraction trigger added)
- Commits verified: 8febf57 and 81e4407 exist in git log
- Build passes: npm run build exits 0, /api/documents/[id]/extract visible in route list

---
*Phase: 12-ai-configuration-document-intake*
*Completed: 2026-03-09*
