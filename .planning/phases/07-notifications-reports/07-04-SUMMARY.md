---
phase: 07-notifications-reports
plan: "04"
subsystem: K-1 distribution and report notifications
tags: [k1, tax-documents, notifications, reports, file-upload]
dependency_graph:
  requires: ["07-01", "07-03"]
  provides: ["k1-upload-api", "k1-distribution-ui", "report-lp-notifications"]
  affects: ["src/app/(gp)/reports/page.tsx", "src/app/api/k1/", "src/app/api/reports/generate/route.ts"]
tech_stack:
  added: []
  patterns:
    - "Multipart FormData upload to Vercel Blob with filename-based investor matching"
    - "Fire-and-forget notification dispatch (never blocks primary operation)"
    - "Fuzzy name normalization (underscore/hyphen to space, case-insensitive substring match)"
key_files:
  created:
    - src/app/api/k1/upload/route.ts
    - src/app/api/k1/route.ts
  modified:
    - src/app/(gp)/reports/page.tsx
    - src/app/api/reports/generate/route.ts
    - src/app/(gp)/entities/[id]/page.tsx
decisions:
  - "Unmatched K-1s still uploaded with null investorId — GP can manually assign later; no data loss"
  - "taxYear stored as string in FormData, parsed to int only for notification call — keeps API flexible"
  - "reportTypeLabel helper added inline to generate/route.ts — avoids cross-module dependency for a simple lookup"
  - "Entity detail page uses Link (not button) for Generate Report — pure navigation, no API call needed"
metrics:
  duration: "15min"
  completed_date: "2026-03-08"
  tasks_completed: 2
  files_changed: 5
---

# Phase 7 Plan 04: K-1 Distribution + Report Notifications Summary

K-1 bulk upload with filename-based investor matching, LP email notifications on K-1 upload and report generation, K-1 distribution UI on /reports page.

## What Was Built

### Task 1: K-1 Bulk Upload API (commit cfe4b85)

**POST /api/k1/upload** — Accepts multipart FormData with multiple PDF files, `entityId`, and `taxYear`.

Filename matching algorithm:
1. Extract investor portion from pattern `K1_<name>_<year>.pdf` (e.g. "K1_John_Smith_2025.pdf" → "John Smith")
2. Normalize: underscores/hyphens → spaces, trim, lowercase
3. Fuzzy match: exact match OR substring containment in either direction

For each file:
- Uploads to Vercel Blob at `k1/{entityId}/{taxYear}/{filename}`
- Creates `Document` record with `category: "TAX"`, `entityId`, and `investorId` (null if unmatched)
- If matched: fire-and-forget `notifyInvestorsOnK1Available` (email + SMS + in-app via delivery engine)
- Returns `{ uploaded, matched, unmatched: string[] }` — unmatched filenames listed for GP review

**GET /api/k1** — Lists TAX-category documents scoped to firm via `entity.firmId`. Optional filters: `entityId`, `taxYear`. Includes `entity.name` and `investor.name` in response. Orders by `createdAt desc`.

### Task 2: K-1 UI on Reports Page + Report Generation Notifications (commit 136cc7b)

**Reports page (/reports)** — Added third section "K-1 Distribution" below existing report generation and report list panels:
- Entity dropdown + tax year text input
- Click-to-open file input (multiple PDFs, accepts `application/pdf`)
- Naming pattern help text: `K1_InvestorName_Year.pdf`
- Selected files list with individual Remove buttons
- "Upload & Distribute" button with spinner
- Success toast shows matched count + unmatched filenames
- Previously uploaded K-1s list with entity filter, Matched/Unmatched badges, Download links

**Entity pre-selection**: Reports page reads `?entityId=` URL query param via `useSearchParams` and pre-selects entity on load.

**Report generation notifications**: After PDF is created and Document record is saved, `notifyInvestorsOnReportAvailable` is called fire-and-forget with all investor IDs from entity commitments.

**Entity detail page**: "Generate Report" quick link added to header right side — routes to `/reports?entityId={id}`.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- src/app/api/k1/upload/route.ts: FOUND
- src/app/api/k1/route.ts: FOUND
- commit cfe4b85 (Task 1): FOUND
- commit 136cc7b (Task 2): FOUND
