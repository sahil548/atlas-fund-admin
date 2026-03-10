---
phase: 16-capital-activity
plan: 04
subsystem: ui
tags: [recharts, waterfall, scenario-analysis, capital-activity, react, nextjs]

# Dependency graph
requires:
  - phase: 16-01
    provides: Capital Activity page foundation, waterfall template CRUD
  - phase: 16-02
    provides: Capital call and distribution forms
  - phase: 16-03
    provides: Distribution detail page with lifecycle buttons

provides:
  - WaterfallPreviewPanel component — side-by-side scenario comparison (1-3 scenarios)
  - WaterfallScenarioChart component — Recharts BarChart for LP/GP split visualization
  - Run Scenario button on waterfall templates page — opens inline preview panel
  - Waterfall preview step in distribution creation form — tier-by-tier before committing
  - Preview mode via saveResults: false — no WaterfallCalculation records persisted

affects:
  - 16-05
  - 16-06
  - lp-portal
  - dashboard

# Tech tracking
tech-stack:
  added: []
  patterns:
    - saveResults=false preview pattern for transient waterfall calculations (no DB write)
    - inline mode vs standalone mode for embeddable components
    - auto-run on mount pattern for inline embedded panels

key-files:
  created:
    - src/components/features/waterfall/waterfall-preview-panel.tsx
    - src/components/features/waterfall/waterfall-scenario-chart.tsx
  modified:
    - src/app/(gp)/transactions/page.tsx
    - src/components/features/capital/create-distribution-form.tsx

key-decisions:
  - "WaterfallPreviewPanel supports standalone and inline modes — standalone for template page, inline for distribution creation form"
  - "saveResults: false in all preview calls — no WaterfallCalculation record created for transient analysis"
  - "Chart rendered only for 2+ completed scenarios — single scenario has no comparison value"
  - "Existing Calculate & Save flow unchanged — preview is purely additive"
  - "Inline mode auto-runs on mount when initialAmount + initialEntityId provided"

patterns-established:
  - "Preview-mode pattern: POST with saveResults: false returns identical shape as save but persists nothing"
  - "mode prop (standalone | inline) for embeddable component variants"

requirements-completed: [CAP-05]

# Metrics
duration: 4min
completed: 2026-03-09
---

# Phase 16 Plan 04: Waterfall Scenario Preview Summary

**Transient waterfall scenario analysis UI: Run Scenario button with 1-3 side-by-side comparison columns, Recharts LP/GP bar chart, and tier-by-tier preview embedded in distribution creation form**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-09T09:04:09Z
- **Completed:** 2026-03-09T09:08:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Built WaterfallPreviewPanel with standalone and inline modes — supports 1-3 concurrent scenarios with Add/Remove/Run All controls
- Built WaterfallScenarioChart with Recharts BarChart showing stacked LP (blue) and GP (orange) bars per scenario
- Wired "Run Scenario" button into waterfall templates tab on Capital Activity page — preview opens inline below tier list
- Added waterfall tier-by-tier preview into distribution creation form (appears after clicking Run Waterfall)
- All preview calls use saveResults: false — confirmed no WaterfallCalculation records persisted

## Task Commits

Each task was committed atomically:

1. **Task 1: Waterfall preview panel with scenario comparison** - `6abc192` (feat)
2. **Task 2: Wire preview panel into waterfall tab + distribution creation form** - `11673fa` (feat)

**Plan metadata:** pending final commit (docs)

## Files Created/Modified
- `src/components/features/waterfall/waterfall-preview-panel.tsx` - Scenario runner component (standalone + inline modes, 1-3 scenarios, per-investor expandable breakdown)
- `src/components/features/waterfall/waterfall-scenario-chart.tsx` - Recharts BarChart with LP/GP stacked bars per scenario
- `src/app/(gp)/transactions/page.tsx` - Added WaterfallPreviewPanel, Run Scenario button, previewTemplateId state; renamed button to "Calculate & Save"; explicit saveResults: true
- `src/components/features/capital/create-distribution-form.tsx` - Added WaterfallPreviewPanel inline after Run Waterfall; showWaterfallPreview + previewTemplateId state; reset on form close

## Decisions Made
- `WaterfallPreviewPanel` supports `mode="standalone"` (full scenario analysis with entity/amount inputs) and `mode="inline"` (auto-runs on mount with initialAmount/initialEntityId, compact for modal embedding)
- Chart only rendered when 2+ scenarios have results — single scenario comparison doesn't need a chart
- Per-investor breakdown uses expandable toggle matching existing saved-result rendering pattern
- Existing "Calculate Waterfall" button renamed to "Calculate & Save" to distinguish from preview flow; existing behavior untouched

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- CAP-05 complete: GPs can run what-if scenario analysis on waterfall templates before committing distributions
- Preview available in both locations (template page + distribution creation) per locked CONTEXT.md decision
- Ready for Phase 16 Plans 05/06

---
*Phase: 16-capital-activity*
*Completed: 2026-03-09*

## Self-Check: PASSED

Files verified:
- FOUND: src/components/features/waterfall/waterfall-preview-panel.tsx
- FOUND: src/components/features/waterfall/waterfall-scenario-chart.tsx

Commits verified:
- FOUND: 6abc192 (feat(16-04): waterfall preview panel with scenario comparison)
- FOUND: 11673fa (feat(16-04): wire waterfall preview panel into transactions page and distribution form)

Build: PASSED (0 errors, 0 type errors)
