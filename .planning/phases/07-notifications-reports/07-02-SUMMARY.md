---
phase: 07-notifications-reports
plan: 02
subsystem: data-export
tags: [excel, export, xlsx, search-removal, filter-bar, gp-portal, lp-portal]
dependency_graph:
  requires: []
  provides: [REPORT-03]
  affects: [deals, assets, entities, directory, documents, tasks, meetings, transactions, lp-documents, lp-activity, lp-account]
tech_stack:
  added: []
  patterns: [xlsx-browser-download, children-slot-pattern, filter-bar-without-search]
key_files:
  created:
    - src/lib/excel-export.ts
    - src/components/ui/export-button.tsx
  modified:
    - src/components/ui/search-filter-bar.tsx
    - src/app/(gp)/deals/page.tsx
    - src/app/(gp)/assets/page.tsx
    - src/app/(gp)/entities/page.tsx
    - src/app/(gp)/directory/page.tsx
    - src/app/(gp)/documents/page.tsx
    - src/app/(gp)/tasks/page.tsx
    - src/app/(gp)/meetings/page.tsx
    - src/app/(gp)/transactions/page.tsx
    - src/app/(lp)/lp-documents/page.tsx
    - src/app/(lp)/lp-activity/page.tsx
    - src/app/(lp)/lp-account/page.tsx
decisions:
  - SearchFilterBar renamed to FilterBar internally, SearchFilterBar alias kept for zero-effort backward compat
  - onSearch prop kept optional (deprecated) so all existing call sites compile without changes
  - ExportButton uses children slot in FilterBar for GP pages that had SearchFilterBar
  - Transactions page gets separate ExportButton per tab (capital calls + distributions) directly in filter rows
  - LP pages get ExportButton in header area (no FilterBar used on those pages)
  - xlsx package uses XLSX.writeFile which handles the download internally — no manual blob/URL needed
metrics:
  duration: 6min
  completed: 2026-03-07
  tasks_completed: 2
  files_modified: 14
---

# Phase 7 Plan 02: Excel Export + Search Bar Removal Summary

Excel export (XLSX) added to all 11 data tables across GP and LP portals using the already-installed xlsx package; search bars removed from all list pages since AI command bar (Cmd+K) is universal search.

## What Was Built

### Task 1 — Core Infrastructure

**`src/lib/excel-export.ts`**
- `exportToExcel(data, sheetName, fileName)` — creates XLSX workbook from any flat data array and triggers browser download via XLSX.writeFile
- `downloadExcel(data, fileName)` — convenience wrapper using "Data" as sheet name; auto-appends .xlsx extension

**`src/components/ui/export-button.tsx`**
- "use client" component with props: `data`, `fileName`, `disabled`
- Download icon SVG + "Export" label
- Disabled with tooltip when data is empty
- Calls `toast.success("Exported!")` on success, `toast.error` on failure
- Styled to match filter dropdowns: `text-xs border border-gray-200 rounded-lg bg-white px-2.5 py-1.5`
- Uses `const toast = useToast()` (never destructured — per pattern rules)

**`src/components/ui/search-filter-bar.tsx`**
- Renamed internal component to `FilterBar`; `SearchFilterBar` exported as alias for backward compat
- Removed: search input div, search icon, debounce logic, query state, useCallback/useEffect/useRef
- Kept: filter dropdowns, "Clear filters" button
- Added: `children?: React.ReactNode` slot rendered at end of flex row
- `onSearch` and `placeholder` props kept as optional/deprecated (no breaking changes)

### Task 2 — All 11 Pages Updated

**8 GP Pages:**
| Page | Export Fields |
|------|--------------|
| Deals | id, name, assetClass, stage, targetReturn, targetSize, dealLead, status, createdAt |
| Assets | id, name, assetClass, entityName, costBasis, fairValue, irr, moic, status, createdAt |
| Entities | id, name, type, vintageYear, totalCommitted, totalCalled, nav, irr, tvpi |
| Directory (investors) | id, name, type, totalCommitted, kycStatus, email, company, advisoryBoard, contactPreference |
| Documents | id, name, category, associatedWith, associationType, uploadDate, fileSize |
| Tasks | id, title, status, priority, assignee, dueDate, dealName, entityName |
| Meetings | id, title, date, type, source, hasTranscript, actionItems, asset, deal, entity |
| Transactions | Capital Calls: id, callNumber, entity, amount, callDate, dueDate, status, fundedPercent |
| Transactions | Distributions: id, entity, distributionDate, grossAmount, source, ROC, income, LTGain, carry, netToLPs, status |

**3 LP Pages:**
| Page | Export Fields |
|------|--------------|
| LP Documents | id, name, category, entity, uploadDate, fileSize |
| LP Activity | date, type, entity, description, amount, runningBalance (capital account ledger) |
| LP Account | date, type, entity, description, amount, runningBalance (full ledger) |

## Deviations from Plan

None — plan executed exactly as written.

The following pre-existing issues were discovered out-of-scope and deferred:
- `src/app/api/notifications/route.ts`: TypeScript error (Prisma type mismatch on `NotificationType`) — introduced in Plan 07-01, not related to this plan. Logged to deferred-items.

## Build Status

- TypeScript compilation: PASSES for all 14 files modified in this plan (verified via `tsc --noEmit | grep [file-pattern]` — zero matches)
- Next.js Turbopack: "Compiled successfully in 5.2s" before the TypeScript check phase
- Pre-existing TypeScript error in `notifications/route.ts` (from Plan 07-01) causes full build to fail — unrelated to this plan

## Self-Check: PASSED

Files exist:
- src/lib/excel-export.ts: FOUND
- src/components/ui/export-button.tsx: FOUND
- src/components/ui/search-filter-bar.tsx: FOUND (modified)

Commits exist:
- ae35241: Task 1 — excel-export + ExportButton + FilterBar modification
- cd2e7eb: Task 2 — all 11 pages updated
