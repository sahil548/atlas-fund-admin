---
phase: 13-deal-desk-crm
plan: 02
subsystem: deals
tags: [pdf-export, analytics, ic-memo, kill-reason, recharts, react-pdf]
dependency_graph:
  requires: []
  provides: [ic-memo-pdf, kill-reason-analytics]
  affects: [deal-detail, analytics-page, deals-pipeline-page]
tech_stack:
  added: []
  patterns: [react-pdf-client-side-dynamic-import, recharts-horizontal-bar-layout-vertical]
key_files:
  created:
    - src/lib/pdf/ic-memo.tsx
  modified:
    - src/components/features/deals/deal-overview-tab.tsx
    - src/app/api/analytics/pipeline/route.ts
    - src/app/(gp)/analytics/page.tsx
    - src/app/(gp)/deals/page.tsx
    - src/app/api/deals/route.ts
decisions:
  - "PDF generation uses dynamic import to avoid SSR issues with @react-pdf/renderer"
  - "killReason breakdown computed in both /api/deals and /api/analytics/pipeline to support both pages"
  - "Label formatter cast to (v: any) to satisfy Recharts LabelFormatter type"
metrics:
  duration: 7min
  completed: "2026-03-09"
  tasks: 2
  files: 6
---

# Phase 13 Plan 02: IC Memo PDF Export and Dead Deal Analytics Summary

IC memo PDF export using @react-pdf/renderer with client-side dynamic import, plus kill reason breakdown horizontal bar chart on /analytics and top-3 pill badges on /deals pipeline page.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create IC memo PDF template and add Export PDF button | 60652b7 | src/lib/pdf/ic-memo.tsx, deal-overview-tab.tsx |
| 2 | Add dead deal analytics — kill reason chart and mini-summary | 259ceaf | pipeline/route.ts, analytics/page.tsx, deals/page.tsx, deals/route.ts |

## What Was Built

### Task 1: IC Memo PDF Template

Created `src/lib/pdf/ic-memo.tsx` — a full @react-pdf/renderer document with:
- **Cover page:** Dark blue cover box with deal name, IC Memo title, generation date, recommendation badge (color-coded: green=APPROVE, red=DECLINE/NO_GO, yellow=DEFER/NEEDS_MORE_INFO), deal metadata cards (asset class, target size, deal lead, stage), executive summary box, section index preview
- **Sections page:** Each IC memo section in a bordered card with section title, risk level badge (HIGH RISK in red, LOW in green, medium in yellow), section content; legal disclaimer footer
- **Page footer:** Deal name, page number, generation date — fixed on all pages
- **ICMemoData interface:** `dealName`, `recommendation`, `executiveSummary`, `sections[]`, `generatedAt`, plus optional `dealLead`, `targetSize`, `assetClass`, `stage`

**Export PDF button** added to `deal-overview-tab.tsx`:
- Added `FileDown` Lucide icon import
- `exportMemoPDF()` function: dynamically imports `pdf` from `@react-pdf/renderer` and `ICMemoPDF` from `@/lib/pdf/ic-memo` (avoids SSR issues)
- Constructs `ICMemoData` from `deal.screeningResult.memo`, triggers blob download
- Button with `loading` state while generating, only shown when `hasMemo === true`
- Downloads as `IC_Memo_{DealName}.pdf` (special chars replaced with `_`)

### Task 2: Kill Reason Analytics

**API: `/api/analytics/pipeline/route.ts`**
- Groups dead deals by `killReason`, treats null/undefined as "Unknown"
- Returns `killReasonBreakdown: Array<{ reason: string; count: number }>` sorted by count desc
- Also adds `totalDeadDeals` to `summary` object

**API: `/api/deals/route.ts`**
- Added `killReason` to the analytics `select` query
- Computes same `killReasonBreakdown` in the `pipelineAnalytics` response

**Analytics page (`/analytics`):**
- New "Dead Deal Analysis" section at bottom of page
- Horizontal bar chart (`layout="vertical"`) using Recharts `BarChart`
- Red bars (#ef4444), `ResponsiveContainer` height = `Math.max(200, items.length * 44)`
- Empty state: "No dead deals to analyze — keep building!" when no dead deals
- Total dead deal count displayed as header stat alongside section title

**Deals page (`/deals`):**
- "Top Kill Reasons" mini-summary in existing Pipeline Analytics card
- Shows top 3 reasons as pill badges with count: `Reason (N)` styled in red
- Only rendered when `killReasonBreakdown.length > 0`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Recharts LabelFormatter type incompatibility**
- **Found during:** Task 2 build
- **Issue:** `formatter: (v: number) => v` in Bar `label` prop fails TypeScript strict check — `LabelFormatter` expects `v: RenderableText` not `number`
- **Fix:** Cast to `(v: any) => v` to pass TypeScript while keeping runtime behavior
- **Files modified:** `src/app/(gp)/analytics/page.tsx`
- **Commit:** 259ceaf

## Key Decisions

1. **PDF dynamic import pattern:** `@react-pdf/renderer` cannot run during SSR. Using `await import("@react-pdf/renderer")` inside the click handler (client-side only) avoids build errors. The `typeof window !== 'undefined'` guard is a backup.

2. **killReason in two APIs:** The /deals page uses `pipelineAnalytics` from `/api/deals` (already fetched for the kanban), so we added `killReasonBreakdown` there. The /analytics page uses `/api/analytics/pipeline`. Both compute independently to avoid coupling.

3. **Top-3 limit on /deals:** The /deals page shows only `slice(0, 3)` kill reasons to keep the mini-summary compact. The full breakdown is on /analytics.

## Self-Check: PASSED

- [x] `src/lib/pdf/ic-memo.tsx` — FOUND (401 lines, >60 line minimum met)
- [x] `deal-overview-tab.tsx` — contains "Export PDF" and "FileDown" (3 references)
- [x] `pipeline/route.ts` — contains "killReason" (5 references)
- [x] `analytics/page.tsx` — contains "killReason" and "Kill Reason" (4 references)
- [x] `deals/page.tsx` — contains "killReason" (9 references)
- [x] Commit 60652b7 — FOUND
- [x] Commit 259ceaf — FOUND
- [x] `npm run build` — PASSED (zero errors)
