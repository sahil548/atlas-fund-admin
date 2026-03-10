# Phase 19: Dashboard & Supporting Modules - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

The dashboard becomes the GP's definitive morning briefing — surfacing pipeline status, alerts, and quick actions from all modules. Supporting modules (reports, settings/integrations, notification preferences) are polished and complete. This phase aggregates data from all prior modules (13-18) into a unified command center.

</domain>

<decisions>
## Implementation Decisions

### Dashboard layout & morning briefing
- Two-column top row: deal pipeline summary (left) + "needs attention" alerts (right) side by side
- Activity feed in a persistent right sidebar column alongside entity cards (not below them)
- Entity cards + portfolio overview in the main content area below the top row
- Existing PortfolioAggregates, LPComparisonView, TopBottomPerformers components remain below entity cards

### Deal pipeline summary
- Horizontal stage funnel showing deal count + aggregate value per stage (Screening → DD → IC Review → Closing)
- Each stage segment clickable — navigates to /deals filtered by that stage
- Compact visualization, not a mini-kanban

### Needs attention alerts
- Grouped list with count badges — three groups: Overdue Capital Calls, Covenant Breaches, Lease Expirations (within 90 days)
- Each item is a clickable link navigating to the relevant entity or asset detail page
- Badge counts shown per group header

### Activity feed
- Expanded to include ALL activity types: deals, capital calls, distributions, meetings, tasks, document uploads, entity changes
- Filtering via chip/pill toggle bar for activity types + entity dropdown selector
- Feed lives in a right sidebar column — persistent as user scrolls through entity cards

### Entity card quick actions
- Three text buttons in a footer bar: "View" | "Capital Call" | "Report"
- "View" navigates to /entities/{id}
- "Capital Call" navigates to /capital?entityId={id} with entity pre-selected
- "Report" navigates to /reports?entityId={id} with entity pre-selected
- All three are navigation shortcuts, not inline actions

### Report preview (SUPP-01)
- Modal PDF viewer — click a report in the list to preview in a full modal before downloading
- Close modal to dismiss, download button inside the modal

### Report history tracking (SUPP-04)
- Reports page: group existing report list by entity, then by period; show version count for re-generated reports
- Entity detail pages: add a Reports tab showing all reports generated for that entity
- Same underlying data, two access paths

### Integrations status page (SUPP-02)
- Enhanced Settings > Integrations tab (not a separate page)
- Add connection status indicators (green/red) per integration
- Add last sync timestamp display
- Add test connection buttons where applicable

### AI config test connection (SUPP-05)
- Test connection button on AI config page that validates the API key works
- Returns success/failure with model name or error message

### Notification preferences (SUPP-03)
- Per-category toggle switches: deal updates, capital calls, covenant alerts, report generation, etc.
- Each category has independent email toggle + SMS toggle
- Lives in Settings or Profile page

### ConfirmDialog migration (SUPP-06)
- Migrate any remaining browser confirm() dialogs to ConfirmDialog component
- Pattern established in Phase 11 — apply consistently

### Claude's Discretion
- Empty alerts state behavior (success message vs collapse panel)
- Activity feed default item count and pagination approach
- Exact chip/pill toggle styling for activity feed filters
- Report modal viewer implementation (browser native vs react-pdf)
- Notification category granularity (exact list of categories)
- Dashboard section spacing and responsive breakpoints

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EntityCard` (src/components/features/dashboard/entity-card.tsx): Full entity metrics card — needs footer bar addition for quick actions
- `RecentActivityFeed` (src/components/features/dashboard/recent-activity-feed.tsx): Existing feed with 3 types — needs expansion to all types + filtering
- `PortfolioAggregates`, `LPComparisonView`, `TopBottomPerformers`: Existing dashboard sections — keep as-is below new top row
- `IntegrationsTab` (src/components/features/settings/integrations-tab.tsx): Card-based integration display — enhance with status indicators
- `ConfirmDialog` (src/components/ui/confirm-dialog.tsx): Shared component from Phase 11
- `PageHeader`, `SectionPanel`, `Badge`: Shared UI components
- `AssetAllocationChart`, `CapitalDeploymentTracker`: Existing dashboard chart components

### Established Patterns
- SWR for all data fetching with firmId-keyed endpoints
- Fire-and-forget pattern for non-blocking operations
- Dark mode: every light class paired with dark: variant
- Entity cards grid: 1 col mobile, 2 col lg, 3 col xl
- Reports page: generate panel (left 1/3) + report list (right 2/3)

### Integration Points
- Dashboard page: src/app/(gp)/dashboard/page.tsx — restructure layout
- Settings page: src/app/(gp)/settings/page.tsx — enhance Integrations tab
- Reports page: src/app/(gp)/reports/page.tsx — add preview modal + history grouping
- Entity detail pages: add Reports tab
- API endpoints needed: /api/dashboard/pipeline-summary, /api/dashboard/alerts, /api/activity (expanded)
- Existing APIs: /api/dashboard/entity-cards, /api/reports, /api/notifications

</code_context>

<specifics>
## Specific Ideas

- Dashboard is the "morning briefing" — GP opens it first thing and gets full situational awareness from the first screen
- Pipeline funnel is clickable to drill into specific stages
- Activity feed as a persistent sidebar gives the dashboard a "command center" feel
- Quick actions on entity cards enable one-click access to common GP workflows
- Report preview prevents unnecessary downloads — GP can verify content before saving

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-dashboard-supporting-modules*
*Context gathered: 2026-03-09*
