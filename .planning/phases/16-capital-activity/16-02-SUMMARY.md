---
phase: 16-capital-activity
plan: "02"
subsystem: capital-calls
tags: [capital-calls, detail-page, status-workflow, line-items, documents, swr]
dependency_graph:
  requires: [16-01]
  provides: [capital-call-detail-page, status-buttons, line-items-table, document-panel]
  affects: [/transactions/capital-calls/[id], /api/capital-calls/[id], /api/documents]
tech_stack:
  added: []
  patterns:
    - SWR mutation with parent call key after line item updates
    - FileUpload FormData without Content-Type header
    - Documents PATCH for linking (documentId + capitalCallId)
    - ConfirmDialog with investor count before status transition
key_files:
  created:
    - src/app/(gp)/transactions/capital-calls/[id]/page.tsx
    - src/components/features/capital/capital-call-status-buttons.tsx
    - src/components/features/capital/capital-call-line-items-table.tsx
    - src/components/features/capital/capital-call-document-panel.tsx
  modified:
    - src/app/api/capital-calls/[id]/route.ts
    - src/app/api/documents/route.ts
decisions:
  - "Mutate parent call SWR key after line item funded — engine auto-advances call status"
  - "entityId query param added to GET /api/documents for entity doc lookup in panel"
  - "FileUpload onFileSelect drives upload button visibility — no auto-upload on select"
metrics:
  duration: "~18 minutes"
  completed_date: "2026-03-10"
  tasks_completed: 2
  files_created: 4
  files_modified: 2
---

# Phase 16 Plan 02: Capital Call Detail Page — Summary

Capital call detail page with DRAFT→ISSUED lifecycle buttons, per-investor funded/pending line items table, and document attachment panel supporting drag-and-drop upload and linking existing entity documents.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Capital call detail page with status buttons and line items | 9ef6238 | page.tsx, status-buttons.tsx, line-items-table.tsx, route.ts |
| 2 | Document attachment panel for capital calls | 54cca24 | document-panel.tsx, page.tsx, documents/route.ts |

## What Was Built

### Capital Call Detail Page (`/transactions/capital-calls/[id]`)
- Full detail page with back link, PageHeader, status badge (CC_STATUS_COLORS + overdue detection)
- SectionPanels: Call Details, Status, Investor Payments, Documents
- SWR fetch of `/api/capital-calls/[id]` with loading/error guards
- Dark mode throughout

### CapitalCallStatusButtons
- DRAFT status: "Mark as Issued" button → ConfirmDialog with investor count message
- ISSUED/PARTIALLY_FUNDED: informational "Waiting for investor payments" text
- FUNDED: green CheckCircle badge "All investors funded"
- Overdue badge shown inline when dueDate < now and status not FUNDED

### CapitalCallLineItemsTable
- Investor, Amount, Status (Badge: green Funded / gray Pending), Paid Date, Action columns
- Per-row "Mark Funded" button → PATCH line item → mutate parent call SWR key
- Engine auto-advances parent call to FUNDED when last investor funded
- Summary row: "X of Y funded — $Z of $W total"
- Funded rows show CheckCircle icon; disabled when call is FUNDED

### CapitalCallDocumentPanel
- Attached Documents: list with name, size, date, category badge; clickable download links
- Upload New: FileUpload drag-and-drop → POST FormData with capitalCallId
- Link Existing: fetches entity docs via `?entityId=`, filters already-attached, dropdown + Link button
- All mutations call onUploadComplete + mutate parent call key

### API Changes
- GET `/api/capital-calls/[id]`: added `documents` include with 7 fields
- GET `/api/documents`: added `entityId` query param filter for entity doc scoping

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added entityId filter to GET /api/documents**
- **Found during:** Task 2
- **Issue:** GET /api/documents had no entityId query param — the Link Existing section of CapitalCallDocumentPanel needed to fetch entity-scoped documents but the API would return all firm documents (or error with unfiltered request)
- **Fix:** Added `entityId` query param extraction and Prisma where clause `{ entityId }` that short-circuits the firmId OR filter when entityId is provided
- **Files modified:** src/app/api/documents/route.ts
- **Commit:** 54cca24

## Self-Check: PASSED

- FOUND: src/app/(gp)/transactions/capital-calls/[id]/page.tsx (231 lines, > 100 min)
- FOUND: src/components/features/capital/capital-call-status-buttons.tsx (106 lines)
- FOUND: src/components/features/capital/capital-call-line-items-table.tsx (165 lines)
- FOUND: src/components/features/capital/capital-call-document-panel.tsx (250 lines)
- FOUND: 9ef6238 (Task 1 commit)
- FOUND: 54cca24 (Task 2 commit)
- Build passes with zero type errors
