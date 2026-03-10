# Phase 19: Dashboard & Supporting Modules - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

The dashboard becomes the GP's definitive morning briefing — surfacing pipeline status, alerts, key metrics, and quick actions from all modules. Supporting modules (reports, settings/integrations, notification preferences) are polished and complete. This phase aggregates data from all prior modules (13-18) into a unified command center.

</domain>

<decisions>
## Implementation Decisions

### Dashboard layout & hierarchy
- Compact summary bar at the very top: Total NAV, portfolio IRR, TVPI, active deals count, dry powder
- "Needs attention" alerts section below the summary bar
- Deal pipeline summary (horizontal stage funnel) below alerts
- Entity cards grid (compact two-row design) in main content area
- Top/Bottom Performers section retained (user loves this)
- Capital Deployment section retained
- LP Comparison **removed from dashboard** — will live on a future enhanced Investors page
- Activity feed at the bottom of the page, full-width, scrollable
- Portfolio charts (asset allocation, etc.) need to be redesigned — current asset allocation chart is broken (tried to show 3 dimensions, looks bad)

### Entity cards — compact redesign
- Two-row compact format: Row 1 = Name + entity type + NAV; Row 2 = IRR | TVPI | DPI | asset count
- Should fit 4-6 cards per row instead of current 3
- Remove per-asset breakdown and top assets from the card (those are detail page content)
- Quick action icons in a row on each card with tooltips

### Deal pipeline summary
- Horizontal stage funnel showing deal count + aggregate value per stage (Screening → DD → IC Review → Closing)
- Each stage segment clickable — navigates to /deals filtered by that stage

### Needs attention alerts
- Claude's discretion on exact display format (grouped list vs unified priority list)
- Must include: overdue capital calls, covenant breaches, lease expirations within 90 days
- Items clickable to relevant entity/asset detail pages

### Activity feed
- All activity types included: deals, capital calls, distributions, meetings, tasks, document uploads, entity changes
- Chip/pill toggle bar for filtering by activity type + entity dropdown selector
- Lives at the bottom of the dashboard, full-width
- Scrollable with load-more or pagination (Claude's discretion on exact count)

### Entity card quick actions
- Three icon buttons with tooltips: View Entity, Create Capital Call, Generate Report
- Default behavior: navigate to relevant page with entity pre-selected (/entities/{id}, /capital?entityId={id}, /reports?entityId={id})
- Alternative: if AI command bar exists (from Phase 18), quick actions can trigger it pre-filled with entity context (progressive enhancement)
- Quick-create modals are the aspirational UX — but only if command bar integration makes it natural

### Dashboard charts & visualizations
- Current asset allocation chart is broken and ugly (attempted 3 dimensions at once) — needs complete redesign
- Research what visualizations a family office dashboard should have — this is a Claude research task
- Capital deployment tracker is good, keep but may need seed data improvement
- Top/bottom performers section is great, keep as-is

### Report preview (SUPP-01)
- Modal PDF viewer — click a report in the list to preview in a full modal before downloading
- Download button inside the modal

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
- Simple on/off model: master email toggle + master SMS toggle
- Digest frequency setting: real-time, daily, or weekly
- Practical for a 3-person GP team — no per-category granularity needed

### ConfirmDialog migration (SUPP-06)
- Migrate any remaining browser confirm() dialogs to ConfirmDialog component
- Pattern established in Phase 11 — apply consistently

### Claude's Discretion
- Alerts display format (grouped list vs unified priority list vs other)
- Dashboard chart redesign — research family office dashboards and recommend appropriate visualizations
- Activity feed default item count and pagination approach
- Chip/pill toggle styling for activity feed filters
- Report modal viewer implementation (browser native vs react-pdf)
- Empty state for alerts section
- Dashboard responsive breakpoints and section spacing
- Seed data improvements for capital deployment visualization

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EntityCard` (src/components/features/dashboard/entity-card.tsx): Needs redesign from full-metrics card to compact two-row format + icon buttons
- `RecentActivityFeed` (src/components/features/dashboard/recent-activity-feed.tsx): Expand from 3 types to all types + add filtering
- `PortfolioAggregates` (src/components/features/dashboard/portfolio-aggregates.tsx): Keep, houses charts that need redesign
- `TopBottomPerformers` (src/components/features/dashboard/top-bottom-performers.tsx): Keep as-is (user loves it)
- `CapitalDeploymentTracker` (src/components/features/dashboard/capital-deployment-tracker.tsx): Keep, potentially improve
- `AssetAllocationChart` (src/components/features/dashboard/asset-allocation-chart.tsx): Needs complete redesign (broken 3D attempt)
- `IntegrationsTab` (src/components/features/settings/integrations-tab.tsx): Enhance with status indicators + test buttons
- `AIGlobalConfig` (src/components/features/settings/ai-global-config.tsx): Add test connection button
- `ConfirmDialog` (src/components/ui/confirm-dialog.tsx): Shared component from Phase 11
- `PageHeader`, `Badge`: Shared UI components

### Established Patterns
- SWR for all data fetching with firmId-keyed endpoints
- Dark mode: every light class paired with dark: variant
- Entity cards grid: responsive columns (will change from 3-max to 4-6-max with compact cards)
- Reports page: generate panel (left 1/3) + report list (right 2/3)
- Settings page: tab-based layout with 7 existing tabs

### Integration Points
- Dashboard page: src/app/(gp)/dashboard/page.tsx — major restructure (summary bar + alerts + funnel + compact cards + activity feed)
- Settings page: src/app/(gp)/settings/page.tsx — enhance Integrations tab + add notification preferences
- Reports page: src/app/(gp)/reports/page.tsx — add preview modal + history grouping
- Entity detail pages: add Reports tab
- New API endpoints needed: /api/dashboard/pipeline-summary, /api/dashboard/alerts, /api/activity (expanded with all types + filtering)
- Existing APIs to leverage: /api/dashboard/entity-cards, /api/reports, /api/notifications

</code_context>

<specifics>
## Specific Ideas

- Dashboard is the "morning briefing" — GP opens it first and gets full situational awareness from the first screen
- Dry powder is a key metric the GP cares about — it answers "how much can I deploy next?"
- Top/bottom performers section is a highlight — don't change it
- Capital deployment visualization is good conceptually, seed data just doesn't show it well
- Quick actions should eventually feel AI-native — icon triggers the command bar pre-filled with entity context (Phase 18 dependency)
- The user thinks about Investors/LPs as special directory entries (like Vehicles/Entities) — wants a dedicated enhanced Investors page in the future
- Chart research needed: "there are more visualizations that might be helpful that I haven't thought of yet" — user wants Claude to research family office dashboard best practices and propose chart types

</specifics>

<deferred>
## Deferred Ideas

- **Enhanced Investors page** — LP Comparison moves from dashboard to a dedicated investors page where LPs are treated as special directory entries (similar to how Vehicles are entities). New capability, separate phase.
- **AI-native quick actions** — Full NL/conversational quick actions from dashboard (depends on Phase 18 command bar maturity)

</deferred>

---

*Phase: 19-dashboard-supporting-modules*
*Context gathered: 2026-03-09*
