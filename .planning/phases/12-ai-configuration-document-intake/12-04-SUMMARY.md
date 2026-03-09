---
phase: 12-ai-configuration-document-intake
plan: 04
subsystem: ui
tags: [react, nextjs, tailwind, prisma, ai-extraction, document-intake, typescript]

# Dependency graph
requires:
  - phase: 12-ai-configuration-document-intake
    provides: ExtractionStatus enum, extractionStatus/extractedFields/appliedFields/extractionError on Document, extractDocumentFields(), shouldExtractAI(), POST /api/documents/[id]/extract retry endpoint

provides:
  - DocumentStatusBadge component (Processing/Extracted/Failed with retry button)
  - DocumentExtractionPanel side panel (right-drawer with field review, edit, and apply workflow)
  - GET /api/documents/[id] endpoint returning full document with extraction fields
  - POST /api/documents/[id]/apply-fields endpoint that stores audit trail AND writes to parent deal/asset/entity records
  - AI Status column in deal detail documents tab
  - Extraction panel integration in deal documents tab

affects:
  - 18-ai-features (extraction review UI and field-apply pattern available for other document contexts)
  - 13-deals-crm (deal documents tab now has extraction UI integrated)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Right-side drawer panel: fixed right-0 h-full z-50 with backdrop overlay and translate-x transition"
    - "ConfirmDialog before apply: setConfirmOpen(true) -> ConfirmDialog -> handleApplyFields() -- never browser confirm()"
    - "Extraction panel initialized from extractedFields on open: useEffect keyed on [open, document.id, document.extractedFields]"
    - "DealDocumentsTab firmId prop: deal detail page passes firmId to tab component for retry calls"
    - "apply-fields field mapping: DEAL_FIELD_MAP/ASSET_FIELD_MAP/ENTITY_FIELD_MAP translate AI field keys to parent record columns"

key-files:
  created:
    - src/components/features/documents/document-status-badge.tsx
    - src/components/features/documents/document-extraction-panel.tsx
    - src/app/api/documents/[id]/route.ts
    - src/app/api/documents/[id]/apply-fields/route.ts
  modified:
    - src/components/features/deals/deal-documents-tab.tsx
    - src/app/(gp)/deals/[id]/page.tsx

key-decisions:
  - "DocumentExtractionPanel as right-side drawer (not modal) — per plan locked decision"
  - "DealDocumentsTab receives firmId prop from parent page — avoids useFirm() in a component that already gets firmId passed down"
  - "apply-fields writes to BOTH Document.appliedFields (audit) AND parent record (DOC-02) in one endpoint call"
  - "Fields without direct parent columns go to dealMetadata/projectedMetrics JSON fields — no schema changes needed"
  - "ConfirmDialog variant='primary' (not 'default') — matches actual ConfirmDialog interface"

patterns-established:
  - "Extraction panel open trigger: row onClick only for COMPLETE status docs — PENDING/FAILED/NONE rows are not clickable"
  - "Retry button: stopPropagation so row click doesn't also try to open panel"
  - "Document name preview button: stopPropagation so row click doesn't interfere with file preview"

requirements-completed: [DOC-02, DOC-03]

# Metrics
duration: 18min
completed: 2026-03-09
---

# Phase 12 Plan 04: Document Extraction UI Summary

**Right-side DocumentExtractionPanel with editable field review, ConfirmDialog-gated apply, and apply-fields API that writes extracted values to parent deal/asset/entity records**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-09T10:00:00Z
- **Completed:** 2026-03-09T10:18:35Z
- **Tasks:** 3
- **Files modified:** 6 (4 created + 2 modified)

## Accomplishments
- Built DocumentStatusBadge with color-coded status (Processing amber, Extracted green, Failed red with inline retry button)
- Built DocumentExtractionPanel as a right-side drawer with editable fields, confidence indicators, checkboxes, and ConfirmDialog-gated apply
- Created apply-fields API that stores full audit trail (aiValue + appliedValue + appliedAt) AND writes extracted values to parent deal/asset/entity records using typed field mapping
- Integrated AI Status column and extraction panel into the deal detail Documents tab with minimal changes
- Created GET /api/documents/[id] for single document fetch including extraction fields

## Task Commits

Each task was committed atomically:

1. **Task 1: DocumentStatusBadge, single document GET, and apply-fields API** - `92613fe` (feat)
2. **Task 2: DocumentExtractionPanel side panel component** - `9b32fb9` (feat)
3. **Task 3: Integrate status badge and extraction panel into deal detail documents tab** - `e22369e` (feat)

## Files Created/Modified
- `src/components/features/documents/document-status-badge.tsx` - Reusable status badge: PENDING/PROCESSING → amber, COMPLETE → green, FAILED → red with retry button
- `src/components/features/documents/document-extraction-panel.tsx` - Right-drawer side panel with field review (checkboxes, editable inputs, confidence dots), ConfirmDialog before apply, retry on fail, spinner on processing
- `src/app/api/documents/[id]/route.ts` - GET endpoint returning full document including deal/asset/entity relations and extraction fields
- `src/app/api/documents/[id]/apply-fields/route.ts` - POST endpoint: stores appliedFields audit trail on Document, writes to Deal (targetSize/targetReturn/dealMetadata), Asset (projectedIRR/projectedMultiple/projectedMetrics), Entity (targetSize/totalCommitments)
- `src/components/features/deals/deal-documents-tab.tsx` - Added AI Status column, DocumentStatusBadge per row, row click to open panel (COMPLETE only), retry handler, DocumentExtractionPanel rendered at bottom; added firmId prop
- `src/app/(gp)/deals/[id]/page.tsx` - Pass firmId to DealDocumentsTab

## Decisions Made
- `DealDocumentsTab` receives `firmId` as an explicit prop rather than calling `useFirm()` again — the prop is already available from the parent page and avoids double context access
- `ConfirmDialog` variant set to `"primary"` (not `"default"`) — confirmed from actual component interface which accepts `"primary" | "danger"`
- Fields without a direct parent column (e.g., holdPeriod, tenantName) go to the deal's `dealMetadata` JSON or asset's `projectedMetrics` JSON — no new Prisma schema fields required
- Row click for extraction panel is gated on `extractionStatus === "COMPLETE"` only — PENDING/FAILED rows are non-clickable (user uses retry button instead)

## Deviations from Plan

None - plan executed exactly as written. The important_context note about ConfirmDialog `variant` was correctly applied (used `"primary"` not the incorrect `"default"` from the plan's context interface).

## Issues Encountered
None - all three tasks built and verified without errors on first attempt.

## User Setup Required
None - no external service configuration required. Extraction UI uses the AI pipeline from Plan 03.

## Next Phase Readiness
- Document extraction UI fully operational — GPs can see AI Status badge on all documents and click COMPLETE documents to review/edit/apply extracted fields
- apply-fields endpoint writes to parent records (DOC-02 satisfied)
- Audit trail preserved on Document.appliedFields (DOC-03 pattern satisfied)
- DocumentStatusBadge and DocumentExtractionPanel are reusable — can be dropped into asset/entity document tabs in later phases
- One concern: The extraction panel receives the `document` object from the deal's document list. If a GP applies fields and then re-opens the panel without refreshing, the panel will show stale data until `onUpdate()` triggers a SWR revalidation. This is acceptable behavior (panel closes on apply).

## Self-Check: PASSED

All verified:
- FOUND: src/components/features/documents/document-status-badge.tsx
- FOUND: src/components/features/documents/document-extraction-panel.tsx
- FOUND: src/app/api/documents/[id]/route.ts
- FOUND: src/app/api/documents/[id]/apply-fields/route.ts
- FOUND: src/components/features/deals/deal-documents-tab.tsx (modified)
- FOUND: src/app/(gp)/deals/[id]/page.tsx (modified)
- Commits verified: 92613fe, 9b32fb9, e22369e all exist in git log
- Build passes: npm run build exits 0 with zero TypeScript errors

---
*Phase: 12-ai-configuration-document-intake*
*Completed: 2026-03-09*
