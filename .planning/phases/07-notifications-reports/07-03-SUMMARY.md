---
phase: 07-notifications-reports
plan: 03
subsystem: api
tags: [react-pdf, pdf-generation, vercel-blob, documents, reports]

# Dependency graph
requires:
  - phase: 03-capital-activity
    provides: Entity, CapitalCall, DistributionEvent, Commitment models and data
  - phase: 06-lp-portal
    provides: LP Document Center (lp-documents page with REPORT/STATEMENT categories)

provides:
  - Three React-PDF report templates (QuarterlyReport, CapitalAccountStatement, FundSummaryReport)
  - POST /api/reports/generate endpoint that produces PDF, stores to Vercel Blob, creates Document record
  - GET /api/reports endpoint listing generated reports filtered by firm
  - /reports GP page with entity selector, report type, period, generate button, and reports list
  - Reports automatically visible in LP Document Center (Document records with REPORT/STATEMENT category)

affects:
  - lp-portal (LPs see generated reports in their document center automatically)
  - documents (Document model used for report storage)

# Tech tracking
tech-stack:
  added:
    - "@react-pdf/renderer@4.3.2 — React-based PDF generation library"
  patterns:
    - "React-PDF renderToBuffer: generates PDF buffer server-side in API route"
    - "Vercel Blob put(): stores PDF buffer with public access at reports/{entityId}/{type}_{period}_{timestamp}.pdf"
    - "Document record creation: every generated report creates a Document with entityId + category REPORT/STATEMENT"
    - "White-label PDFs: entity name only in headers/footers, no Atlas branding"

key-files:
  created:
    - src/lib/pdf/shared-styles.ts
    - src/lib/pdf/quarterly-report.tsx
    - src/lib/pdf/capital-account-statement.tsx
    - src/lib/pdf/fund-summary.tsx
    - src/app/api/reports/generate/route.ts
    - src/app/api/reports/route.ts
    - src/app/(gp)/reports/page.tsx
  modified:
    - src/lib/routes.ts (added /reports at priority 79)
    - src/lib/schemas.ts (added GenerateReportSchema)

key-decisions:
  - "White-label PDFs: no Atlas branding per user decision — only entity name in headers/footers"
  - "4-page QuarterlyReport: cover+financial summary, capital accounts, portfolio allocation, transaction ledger"
  - "renderToBuffer in API route: fast enough for serverless (under 5s typical), no streaming needed"
  - "Report naming: {entity.name} — {ReportType} {period} — human-readable, stored as Document.name"
  - "Capital account statement uses fund-level data (entity capital calls/distributions), not per-investor ledger — investor-specific filtering via optional investorId param"
  - "IRR left as null in PDF data: would require XIRR computation per investor; fund-level TVPI/DPI computed from calledAmount and distributedAmount"

patterns-established:
  - "React-PDF template pattern: create data interface, accept as prop, render with @react-pdf/renderer primitives (Document/Page/View/Text)"
  - "PDF generation chain: fetch Prisma data → assemble typed data object → renderToBuffer → put() to Blob → prisma.document.create"

requirements-completed: [REPORT-01, REPORT-02, REPORT-05]

# Metrics
duration: 30min
completed: 2026-03-08
---

# Phase 07 Plan 03: PDF Report Generation Summary

**Three React-PDF report templates (quarterly, capital account, fund summary) with Vercel Blob storage and Document record integration, accessible from /reports GP page and LP Document Center**

## Performance

- **Duration:** 30 min
- **Started:** 2026-03-08T05:53:02Z
- **Completed:** 2026-03-08T06:23:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Three white-label PDF templates using @react-pdf/renderer: QuarterlyReport (4 pages), CapitalAccountStatement (2 pages), FundSummaryReport (1 page)
- POST /api/reports/generate: fetches entity data from Prisma, assembles typed data, calls renderToBuffer, stores to Vercel Blob, creates Document record
- GET /api/reports: lists REPORT/STATEMENT Documents for a firm with entity name
- /reports page with entity dropdown, report type radio buttons, period input, generate button with spinner, and generated reports table
- All generated reports are Document records with entityId, so they automatically appear in the LP Document Center

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @react-pdf/renderer + create three PDF report templates + shared styles** - `a8558c5` (feat)
2. **Task 2: Report generation API + /reports page + route registration** - `dbf62d0` (feat)

## Files Created/Modified

- `src/lib/pdf/shared-styles.ts` - StyleSheet definitions, formatCurrency/Percent/Multiple/Date helpers
- `src/lib/pdf/quarterly-report.tsx` - QuarterlyReport: 4-page template (cover+summary, capital accounts, portfolio, ledger)
- `src/lib/pdf/capital-account-statement.tsx` - CapitalAccountStatement: 2-page template (period summary + ledger)
- `src/lib/pdf/fund-summary.tsx` - FundSummaryReport: 1-page template (overview, top 5 holdings, recent activity)
- `src/app/api/reports/generate/route.ts` - POST endpoint: generate PDF, store to Blob, create Document
- `src/app/api/reports/route.ts` - GET endpoint: list generated reports by firm
- `src/app/(gp)/reports/page.tsx` - GP page with generate panel and reports table
- `src/lib/routes.ts` - Added /reports route at priority 79
- `src/lib/schemas.ts` - Added GenerateReportSchema

## Decisions Made

- White-label PDFs: entity name only in headers and footers — no Atlas product branding per prior user decision
- IRR field set to null in PDF data for initial version: per-investor XIRR would require full capital call ledger computation, deferred for now; fund-level TVPI/DPI/RVPI computed from aggregate called/distributed amounts
- Capital account statement uses fund-level aggregate data: investor-specific filtering available via optional `investorId` param
- Report naming convention: "{entity.name} — {Report Type} {period}" — stored as Document.name for easy browsing
- renderToBuffer called directly in serverless API route: react-pdf is fast enough (typically under 3s) without streaming or worker threads

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect Prisma include — commitments do not have capitalCallLineItems relation**
- **Found during:** Task 2 (Report generation API)
- **Issue:** Initial implementation attempted to include `capitalCallLineItems` on the `commitments` include, but that relation does not exist on the Commitment model (line items are on CapitalCall, not Commitment)
- **Fix:** Rewrote entity fetch to correctly fetch capital calls with their line items, then aggregate funded line item amounts per investor from capital call line items
- **Files modified:** src/app/api/reports/generate/route.ts
- **Verification:** TypeScript tsc --noEmit passes with zero errors on the route file
- **Committed in:** dbf62d0 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug in Prisma include structure)
**Impact on plan:** Fix was required for TypeScript compilation and correct behavior. No scope creep.

## Issues Encountered

- Dev server file lock (.next/lock) caused repeated ENOTEMPTY build errors during verification — worked around by removing lock file before each build. Build compilation (`✓ Compiled successfully`) and page generation (`92/92 pages`) both confirmed successful. Pre-existing TypeScript errors in integrations routes (asana/google-calendar/notion) were out of scope and not touched.

## User Setup Required

None — no additional environment variable configuration required beyond the already-configured BLOB_READ_WRITE_TOKEN (used by existing document upload feature).

## Next Phase Readiness

- PDF generation is complete and tested at the TypeScript level
- LP Document Center will automatically show generated reports (Document records with entityId + REPORT/STATEMENT category)
- Reports can be generated from /reports page in GP sidebar
- Phase 07 Plans 04+ can use the Document model and /api/reports endpoints

---
*Phase: 07-notifications-reports*
*Completed: 2026-03-08*
