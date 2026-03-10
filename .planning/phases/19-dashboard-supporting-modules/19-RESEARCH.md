# Phase 19: Dashboard & Supporting Modules - Research

**Researched:** 2026-03-09
**Domain:** React dashboard aggregation, PDF preview, activity feed filtering, notification preferences, integration status UI
**Confidence:** HIGH (based on direct codebase inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Compact summary bar at the very top: Total NAV, portfolio IRR, TVPI, active deals count, dry powder
- "Needs attention" alerts section below the summary bar
- Deal pipeline summary (horizontal stage funnel) below alerts
- Entity cards grid (compact two-row design) in main content area — fit 4-6 cards per row
- Top/Bottom Performers section retained (user loves this)
- Capital Deployment section retained
- LP Comparison REMOVED from dashboard — will live on a future enhanced Investors page
- Activity feed at the bottom of the page, full-width, scrollable
- Portfolio charts need to be redesigned — current asset allocation chart is broken
- Entity card format: Row 1 = Name + entity type + NAV; Row 2 = IRR | TVPI | DPI | asset count
- Quick action icons in a row on each card with tooltips: View Entity, Create Capital Call, Generate Report
- Quick action default: navigate to /entities/{id}, /capital?entityId={id}, /reports?entityId={id}
- Deal pipeline funnel: horizontal stage funnel with count + aggregate value per stage (Screening → DD → IC Review → Closing)
- Each funnel stage clickable — navigates to /deals filtered by that stage
- Needs attention must include: overdue capital calls, covenant breaches, lease expirations within 90 days
- Items clickable to relevant entity/asset detail pages
- Activity feed: all types included (deals, capital calls, distributions, meetings, tasks, document uploads, entity changes)
- Chip/pill toggle bar for filtering by activity type + entity dropdown selector
- Activity feed lives at bottom of dashboard, full-width, with load-more or pagination
- Report preview: modal PDF viewer — click report in list to preview before downloading
- Download button inside the modal
- Report history: group existing report list by entity, then by period; show version count
- Entity detail pages: add a Reports tab showing all reports for that entity
- Integrations status: Enhanced Settings > Integrations tab (not separate page)
- Add connection status indicators (green/red) per integration + last sync timestamp
- AI config test connection: existing test connection button already present (verify it works end-to-end)
- Notification preferences: master email toggle + master SMS toggle + digest frequency (real-time, daily, weekly)
- ConfirmDialog migration: migrate any remaining browser confirm() dialogs to ConfirmDialog component

### Claude's Discretion
- Alerts display format (grouped list vs unified priority list vs other)
- Dashboard chart redesign — research family office dashboards and recommend appropriate visualizations
- Activity feed default item count and pagination approach
- Chip/pill toggle styling for activity feed filters
- Report modal viewer implementation (browser native via iframe vs react-pdf — iframe preferred given existing DocumentPreviewModal)
- Empty state for alerts section
- Dashboard responsive breakpoints and section spacing
- Seed data improvements for capital deployment visualization

### Deferred Ideas (OUT OF SCOPE)
- Enhanced Investors page — LP Comparison moves from dashboard to a dedicated investors page
- AI-native quick actions — Full NL/conversational quick actions from dashboard (depends on Phase 18 command bar maturity)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Dashboard shows deal pipeline summary (deals by stage, aggregate value) | New API: /api/dashboard/pipeline-summary. Use groupBy DealStage. Link each stage to /deals?stage=X |
| DASH-02 | Dashboard shows "needs attention" alerts (overdue calls, covenant breaches, lease expirations) | New API: /api/dashboard/alerts. Query capitalCalls (ISSUED past dueDate), covenants (BREACH status), leases (leaseEndDate within 90 days) |
| DASH-03 | Activity feed can be filtered by entity and type | Expand /api/dashboard/portfolio-aggregates or new /api/activity. Add entityId + type query params |
| DASH-04 | Entity cards have quick-action buttons (view entity, create capital call, etc.) | Redesign EntityCard component. Add icon buttons using lucide-react. No new API needed |
| SUPP-01 | Report preview available before download | Reuse existing DocumentPreviewModal (iframe pattern). Add preview click handler to report list rows |
| SUPP-02 | Unified integrations status page shows all integrations with connection status | Enhance existing IntegrationsTab. Add green/red dot status per integration + last sync timestamp |
| SUPP-03 | GP notification preferences configurable | New: add NotificationPreferences component in Settings notifications tab stub (already exists). No schema change needed — store in User.permissions JSON or add new fields |
| SUPP-04 | Report history tracked per entity per period | Restructure reports list by entity grouping + period grouping. Same API data, different UI rendering |
| SUPP-05 | AI config has test connection button | ALREADY EXISTS in AIGlobalConfig component. Verify backend /api/settings/ai-config/test endpoint works correctly |
| SUPP-06 | Settings confirm dialogs migrated from browser confirm() to ConfirmDialog | Grep scan confirms zero remaining window.confirm() calls. Verify IntegrationsTab disconnect uses Modal (it does). Mark as already complete |
</phase_requirements>

---

## Summary

Phase 19 is the final aggregation phase — it takes data from all prior modules and surfaces it on the GP's command-center dashboard. The work divides into two tracks: (1) dashboard restructure with new API endpoints, and (2) polishing of supporting modules that are already partially built.

The dashboard currently exists at `src/app/(gp)/dashboard/page.tsx` but is missing the summary bar, alerts section, funnel view, and activity filtering. Three new API endpoints need to be built: `/api/dashboard/pipeline-summary` (deals by stage with aggregate value), `/api/dashboard/alerts` (cross-module alert aggregation), and an expanded activity feed endpoint with filtering. The entity cards need a visual redesign from the current expand/collapse pattern to a compact two-row format with quick action icons.

For supporting modules, the good news is that much infrastructure already exists: `DocumentPreviewModal` with iframe PDF viewer is complete, `AIGlobalConfig` already has a test connection button and backend route, `IntegrationsTab` already shows connected/not-connected states via Badge, the notifications stub exists in settings, and zero `window.confirm()` calls remain in the codebase. The work is refinement and wiring, not net-new construction.

**Primary recommendation:** Build the three new dashboard API endpoints first (pipeline-summary, alerts, activity-with-filters), then restructure the dashboard page layout, then handle the supporting module polish items.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App framework + API routes | Already in use |
| React | 19.2.3 | UI component library | Already in use |
| SWR | 2.4.1 | Data fetching + caching | Established pattern across all pages |
| Prisma | 7.4.2 | Database ORM | Singleton import from @/lib/prisma |
| Tailwind CSS | 4 | Styling | Already in use with dark: variant pattern |
| Recharts | 3.7.0 | Charts for redesigned visualizations | Already in use for analytics pages |
| lucide-react | 0.575.0 | Icons for quick action buttons | Already in use throughout the codebase |
| Zod | 4.3.6 | Schema validation for API inputs | Standard for all API routes |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-pdf/renderer | 4.3.2 | PDF generation (reports) | Already used for IC memo export — do NOT use for preview |
| date-fns | via Intl.DateTimeFormat | Date formatting | Use native Intl per Phase 11 decision |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native iframe for PDF preview | react-pdf viewer component | iframe is simpler, works with existing fileUrl pattern, ALREADY has `DocumentPreviewModal` component |
| User.permissions JSON for notification prefs | New NotificationPreference model | JSON avoids schema migration risk (see STATE.md: schema changes are high-risk) |

**Installation:** No new packages needed — all required libraries are already installed.

---

## Architecture Patterns

### Dashboard Page Restructure

The current dashboard (`src/app/(gp)/dashboard/page.tsx`) has two sections: Your Entities + Portfolio Overview. Phase 19 restructures it into five sections:

```
DashboardPage
├── SummaryBar          — Total NAV, IRR, TVPI, active deals, dry powder (new API or from stats)
├── NeedsAttentionPanel — Overdue calls, covenant breaches, lease expirations (new API)
├── DealPipelineFunnel  — Horizontal stage funnel (new API)
├── EntityCardsGrid     — Compact two-row format with quick action icons (redesigned EntityCard)
└── ActivityFeedSection — Full-width, filterable by type and entity (expanded API)
```

PortfolioAggregates section moves to a "Portfolio Analytics" sub-section below entity cards. TopBottomPerformers and CapitalDeploymentTracker are retained.

### New API Endpoints Required

**1. GET /api/dashboard/pipeline-summary**
```typescript
// Returns deals grouped by stage with count + aggregate deal value
// Source: prisma.deal.groupBy({ by: ["stage"], _count: true, _sum: { dealValue: true }, where: { firmId, status: { not: "DEAD" } } })
// Response shape:
{
  stages: [
    { stage: "SCREENING", count: 3, totalValue: 15_000_000 },
    { stage: "DUE_DILIGENCE", count: 2, totalValue: 40_000_000 },
    { stage: "IC_REVIEW", count: 1, totalValue: 25_000_000 },
    { stage: "CLOSING", count: 1, totalValue: 20_000_000 },
  ]
}
```

**2. GET /api/dashboard/alerts**
```typescript
// Aggregates three alert types:
// (a) Overdue capital calls: capitalCalls with status=ISSUED and dueDate < today
// (b) Covenant breaches: covenants with currentStatus=BREACH
// (c) Lease expirations: leases with leaseEndDate within 90 days AND currentStatus=ACTIVE
// Response shape:
{
  alerts: [
    { type: "OVERDUE_CAPITAL_CALL", severity: "high", title: "...", entityId: "...", linkPath: "/entities/..." },
    { type: "COVENANT_BREACH", severity: "high", title: "...", assetId: "...", linkPath: "/assets/..." },
    { type: "LEASE_EXPIRY", severity: "medium", title: "...", assetId: "...", linkPath: "/assets/..." },
  ],
  counts: { overdueCapitalCalls: 2, covenantBreaches: 1, leaseExpiries: 3 }
}
```

**3. GET /api/activity?firmId=&entityId=&type=&limit=&offset=**
```typescript
// Expanded activity feed with filtering
// Aggregates from: DealActivity, CapitalCall, DistributionEvent, Meeting, Task, Document, AuditLog
// Query params: entityId (optional filter), type (optional filter), limit (default 20), offset (pagination)
// Response shape:
{
  items: [
    { id: "...", type: "DEAL_ACTIVITY" | "CAPITAL_CALL" | "DISTRIBUTION" | "MEETING" | "TASK" | "DOCUMENT" | "ENTITY_CHANGE",
      description: "...", entityId: "...", entityName: "...", linkPath: "/...", date: "..." }
  ],
  total: 120,
  hasMore: true
}
```

### Entity Card Redesign Pattern

Current EntityCard has expand/collapse with per-asset breakdown table (verbose).
New compact format removes expand/collapse and per-asset breakdown:

```typescript
// Two-row compact format:
// Row 1: [entity name link] [entity type badge] [NAV value right-aligned]
// Row 2: [IRR] [TVPI] [DPI] [asset count] [quick action icons]
// Quick action icons: Eye (View Entity), DollarSign (Create Capital Call), FileText (Generate Report)
// Icons use lucide-react with title/tooltip on hover
// Grid: grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3
```

### Activity Feed Filter Pattern

Chip/pill toggle bar uses inline button groups, matching the existing Kanban/filter patterns:

```typescript
// Filter state: activeTypes: Set<string>, entityId: string
// Type chips: All | Deals | Capital | Distributions | Meetings | Tasks | Documents | Changes
// Entity dropdown: standard <select> element (matches settings page pattern)
// Pagination: "Load 20 more" button (load-more), not numbered pages
```

### Report History Grouping Pattern

Restructure the reports list from a flat sorted list to a grouped-by-entity-then-period view:

```typescript
// Group reports: Map<entityId, Map<period, Report[]>>
// For each entity, show entity name as section header
// Within entity, group by period (Q4 2025, Q3 2025, etc.)
// Within period, show report(s) — if > 1, show "(v2)" version indicator
// "Preview" and "Download" as separate buttons per report row
```

### Anti-Patterns to Avoid

- **Do NOT use `window.confirm()` anywhere** — ConfirmDialog is the established pattern
- **Do NOT create a separate /integrations page** — enhance the existing Settings > Integrations tab
- **Do NOT re-fetch entity-cards data for the compact new cards** — existing `/api/dashboard/entity-cards` route returns all needed data (name, irr, tvpi, dpi, assetCount, nav) — just remap props
- **Do NOT add `@react-pdf/renderer` for report preview** — use the existing `DocumentPreviewModal` with iframe pattern
- **Do NOT add schema changes for GP notification preferences** — store in a new `NotificationPreference`-like approach using only the existing User model's JSON capabilities or a lightweight settings store

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF preview modal | Custom PDF renderer component | `DocumentPreviewModal` (already exists at `src/components/ui/document-preview-modal.tsx`) | Iframe pattern already works for any `fileUrl` |
| Icon buttons for quick actions | SVG icons inline | `lucide-react` (Eye, DollarSign, FileText icons) | Already imported in codebase; tree-shakeable |
| Connection status indicators | Custom color logic | Existing `Badge` component with color="green"/"red" | Already used in IntegrationsTab for Connected/Not connected |
| Toast notifications | Custom notification system | Existing `useToast()` hook | Established pattern; destructuring crashes, must use `const toast = useToast()` |
| Confirm dialogs | browser confirm() | `ConfirmDialog` component from Phase 11 | FOUND-03 requirement; grep test prevents regressions |
| Chart colors + responsive container | Raw SVG | `Recharts` with `ResponsiveContainer` | Already installed and used in analytics + existing dashboard |
| Date formatting | Custom date library | Native `Intl.DateTimeFormat` | Phase 11 decision — zero bundle cost |

**Key insight:** This phase has unusually high reuse opportunity. The DocumentPreviewModal, ConfirmDialog, Badge, IntegrationsTab, and AIGlobalConfig components all already handle significant parts of the work. The primary NET-NEW work is the three API endpoints and dashboard page restructure.

---

## Common Pitfalls

### Pitfall 1: Summary Bar Data Duplication
**What goes wrong:** Building a new `/api/dashboard/summary-bar` endpoint when `/api/dashboard/stats` already computes totalNAV, performanceMetrics (IRR, TVPI), and pipelineCount.
**Why it happens:** Stats endpoint is large and not obviously reusable.
**How to avoid:** Reuse the stats endpoint or extract only the needed fields from it. For dry powder, sum `entity.dryPowder` from the entity-cards endpoint (already computed).
**Warning signs:** If you see yourself re-implementing the same Prisma queries for metrics that already exist.

### Pitfall 2: Alerts Query Performance
**What goes wrong:** The alerts endpoint fetches all capital calls, all covenants, all leases for a firm — potentially expensive joins.
**Why it happens:** These are cross-model queries with date comparisons.
**How to avoid:** Use targeted Prisma queries with `where` clauses that filter by date range at the DB level. For leases: `where: { leaseEndDate: { gte: today, lte: ninetyDaysFromNow }, currentStatus: "ACTIVE" }`. For capital calls: `where: { status: "ISSUED", dueDate: { lt: today } }`. Add `take: 50` limits.
**Warning signs:** Response times over 500ms for the alerts endpoint.

### Pitfall 3: Activity Feed Multi-Source Aggregation
**What goes wrong:** Building a complex activity feed by pulling from 6+ different tables and trying to merge/sort in JS.
**Why it happens:** There's no unified ActivityFeed table — events are scattered across DealActivity, CapitalCall, Meeting, Task, Document, AuditLog.
**How to avoid:** Build the aggregation in the API route using `Promise.all` for parallel fetches, then merge and sort by `createdAt` desc in JS. Cap each source at 20 items before merge, then take the top 20 after merge. For filtered queries, filter before merge.
**Warning signs:** The endpoint takes >1s to respond; always add limits per source table.

### Pitfall 4: EntityCard Grid Not Actually Fitting 4-6 Per Row
**What goes wrong:** Using `xl:grid-cols-4` when the sidebar eats horizontal space, causing cards to overflow.
**Why it happens:** Dashboard is inside the AppShell sidebar layout which has fixed sidebar width.
**How to avoid:** Use `grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6` — test at actual viewport width with sidebar open.
**Warning signs:** Cards appear truncated or wrapping below 4 per row at 1440px viewport.

### Pitfall 5: ConfirmDialog in IntegrationsTab — Already Uses Modal
**What goes wrong:** Trying to add ConfirmDialog to IntegrationsTab disconnect flow when it ALREADY uses `Modal` for disconnect confirmation.
**Why it happens:** SUPP-06 requires ConfirmDialog migration, but IntegrationsTab uses a `Modal` (not `window.confirm()`).
**How to avoid:** grep scan already confirmed zero `window.confirm()` calls exist. The SUPP-06 work is to verify the scan result and mark as complete, OR migrate the Modal-based disconnect in IntegrationsTab to `ConfirmDialog` for consistency.
**Warning signs:** Spending time looking for confirm() dialogs that don't exist.

### Pitfall 6: Notification Preferences — Schema Risk
**What goes wrong:** Adding a `NotificationPreference` model to Prisma schema, triggering a force-reset that wipes the demo database.
**Why it happens:** STATE.md explicitly flags schema changes as high-risk.
**How to avoid:** Use one of: (a) store GP notification prefs in User.permissions JSON field (already a Json? field), or (b) create a lightweight server-side settings store in a new `FirmSettings` table only if absolutely necessary. The simple on/off model (email toggle, SMS toggle, digest frequency) maps cleanly to 3 fields in User.permissions.
**Warning signs:** Any PR that includes `prisma db push` for this phase.

### Pitfall 7: AssetAllocationChart Dark Mode
**What goes wrong:** Redesigned chart has hardcoded hex colors that don't adapt to dark mode.
**Why it happens:** Recharts uses fill="" attributes, not Tailwind classes.
**How to avoid:** Define a separate dark color palette constant and use CSS variable approach, OR just test the chart looks acceptable in both modes with the chosen hex colors.

---

## Code Examples

### Pipeline Summary API Pattern
```typescript
// Source: Pattern from /api/deals/route.ts (existing groupBy usage for analytics)
// Location: src/app/api/dashboard/pipeline-summary/route.ts
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  const firmId = authUser?.firmId ?? req.nextUrl.searchParams.get("firmId");

  const grouped = await prisma.deal.groupBy({
    by: ["stage"],
    where: { firmId: firmId!, status: { not: "DEAD" } },
    _count: { stage: true },
    _sum: { dealValue: true },
  });

  const STAGE_ORDER = ["SCREENING", "DUE_DILIGENCE", "IC_REVIEW", "CLOSING"];
  const stages = STAGE_ORDER.map((stage) => {
    const found = grouped.find((g) => g.stage === stage);
    return {
      stage,
      count: found?._count.stage ?? 0,
      totalValue: found?._sum.dealValue ?? 0,
    };
  });

  return NextResponse.json({ stages });
}
```

### Alerts API Pattern
```typescript
// Source: Inspired by asset monitoring panel from Phase 14 (covenant + lease patterns already established)
// Location: src/app/api/dashboard/alerts/route.ts
const today = new Date();
const ninetyDaysFromNow = new Date(today);
ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

const [overdueCapitalCalls, covenantBreaches, expiringLeases] = await Promise.all([
  prisma.capitalCall.findMany({
    where: { entity: { firmId }, status: "ISSUED", dueDate: { lt: today } },
    include: { entity: { select: { id: true, name: true } } },
    take: 20,
  }),
  prisma.covenant.findMany({
    where: { creditAgreement: { asset: { entityAllocations: { some: { entity: { firmId } } } } }, currentStatus: "BREACH" },
    include: { creditAgreement: { include: { asset: { select: { id: true, name: true } } } } },
    take: 20,
  }),
  prisma.lease.findMany({
    where: {
      asset: { entityAllocations: { some: { entity: { firmId } } } },
      currentStatus: "ACTIVE",
      leaseEndDate: { gte: today, lte: ninetyDaysFromNow },
    },
    include: { asset: { select: { id: true, name: true } } },
    take: 20,
  }),
]);
```

### Compact EntityCard Quick Action Icons
```typescript
// Source: lucide-react pattern used in other components
import { Eye, DollarSign, FileText } from "lucide-react";

// Inside compact EntityCard component:
<div className="flex items-center gap-1 mt-2">
  <Link href={`/entities/${entityId}`} title="View Entity"
    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-indigo-600 transition-colors">
    <Eye className="w-3.5 h-3.5" />
  </Link>
  <Link href={`/capital?entityId=${entityId}`} title="Create Capital Call"
    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-indigo-600 transition-colors">
    <DollarSign className="w-3.5 h-3.5" />
  </Link>
  <Link href={`/reports?entityId=${entityId}`} title="Generate Report"
    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-indigo-600 transition-colors">
    <FileText className="w-3.5 h-3.5" />
  </Link>
</div>
```

### Report Preview Modal Usage
```typescript
// Source: DocumentPreviewModal already exists at src/components/ui/document-preview-modal.tsx
// Just wire it up in the reports page:
import { DocumentPreviewModal } from "@/components/ui/document-preview-modal";

const [previewDoc, setPreviewDoc] = useState<{name: string; fileUrl: string} | null>(null);

// In the report row:
<button onClick={() => setPreviewDoc({ name: doc.name, fileUrl: doc.fileUrl })}>
  Preview
</button>
<DocumentPreviewModal open={!!previewDoc} onClose={() => setPreviewDoc(null)} document={previewDoc} />
```

### Report History Grouping
```typescript
// Group reports by entity then by period (pure client-side transformation)
const grouped = reports.reduce((acc: Record<string, Record<string, Report[]>>, report) => {
  const entityKey = report.entity?.id ?? "unknown";
  const periodKey = report.period ?? "No Period";
  if (!acc[entityKey]) acc[entityKey] = {};
  if (!acc[entityKey][periodKey]) acc[entityKey][periodKey] = [];
  acc[entityKey][periodKey].push(report);
  return acc;
}, {});
```

### Activity Feed Filter Pattern
```typescript
// State and filter pattern (follows tasks page filter pattern)
const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
const [filterEntityId, setFilterEntityId] = useState("");

// Build URL with filters:
const activityKey = firmId
  ? `/api/activity?firmId=${firmId}${filterEntityId ? `&entityId=${filterEntityId}` : ""}${activeTypes.size ? `&types=${[...activeTypes].join(",")}` : ""}&limit=20`
  : null;

// Type chip toggle:
const toggleType = (type: string) => {
  setActiveTypes(prev => {
    const next = new Set(prev);
    if (next.has(type)) next.delete(type); else next.add(type);
    return next;
  });
};
```

---

## State of the Art

### Existing Infrastructure Assessment

| Component | Current State | Phase 19 Action |
|-----------|--------------|-----------------|
| `EntityCard` | Verbose expand/collapse with per-asset breakdown | Redesign to compact two-row + quick action icons |
| `RecentActivityFeed` | 3 hardcoded types, no filtering, flat list | Expand types + add chip filters + entity dropdown |
| `AssetAllocationChart` | Broken 3D nested pie chart | Redesign (see chart recommendation below) |
| `TopBottomPerformers` | Complete and working | Keep as-is |
| `CapitalDeploymentTracker` | Working but seed data weak | Keep, improve seed data |
| `DocumentPreviewModal` | Complete iframe PDF preview | Reuse for SUPP-01 |
| `AIGlobalConfig` test connection | COMPLETE — button + API route exist | Verify end-to-end, mark SUPP-05 done |
| `IntegrationsTab` | Shows Connected/Not connected badges | Add status dots + last sync text display |
| Notifications stub | Empty "coming soon" panel | Build simple on/off form with 3 settings |
| `window.confirm()` calls | ZERO found in codebase | Mark SUPP-06 as complete after verification |

### Dashboard Chart Redesign Recommendation

The current `AssetAllocationChart` tries to show 3 dimensions (asset class, participation structure, capital instrument) with nested pie rings and opacity encoding — this is why it looks bad.

**Recommended replacement visualizations for a family office dashboard:**

1. **Simple Asset Class Donut Chart** — single-ring donut with asset class breakdown by fair value. Clean, immediately readable. Replace the broken nested pie with this.

2. **Geographic/Strategy Concentration Bar Chart** — horizontal bar chart showing portfolio concentration by either geography or sector. Easy to build with Recharts `BarChart`. Useful for concentration risk.

3. **Vintage Year Deployment Chart** — bar chart showing capital deployed per year. Shows investment pace over time. Data is available from `capitalCalls` + `createdAt` on assets.

The existing `TopBottomPerformers` and `CapitalDeploymentTracker` already cover performance and deployment well — the chart redesign should cover a gap they don't fill (composition/allocation view).

**Decision for implementation:** Replace `AssetAllocationChart` with a clean single-ring donut chart showing asset class breakdown by fair value. Move participation structure breakdown to a secondary text legend rather than trying to encode it visually.

---

## Open Questions

1. **Notification preferences storage location**
   - What we know: `InvestorNotificationPreference` exists for LP investors, but no GP-equivalent model exists. User model has a `permissions` JSON field.
   - What's unclear: Whether to use `permissions` JSON (no schema change) or add explicit `notifEmailEnabled`, `notifSmsEnabled`, `notifDigest` fields to User (schema change required).
   - Recommendation: Use `User.permissions` JSON to store `{ notifEmail: boolean, notifSms: boolean, digestFrequency: "IMMEDIATE"|"DAILY"|"WEEKLY" }`. Zero schema risk. The API endpoint reads/writes these specific keys within the permissions object.

2. **Pipeline summary — does `dealValue` field exist on Deal model?**
   - What we know: `Deal` model has a `dealValue` field used in the analytics pipeline.
   - What's unclear: Whether it's consistently populated in seed data.
   - Recommendation: Use `_sum: { dealValue: true }` with `?? 0` null fallback. The funnel shows counts even if values are 0.

3. **Activity feed — which tables to include for "entity changes"**
   - What we know: `AuditLog` table exists with `action: AuditAction` enum. Entity status transitions use `STATUS_TRANSITION` action.
   - What's unclear: Whether AuditLog is well-populated with seed data.
   - Recommendation: Include AuditLog as an optional source with `try/catch` — if it returns nothing, the feed still works from other sources.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (node environment) |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npm test` |
| Full suite command | `npm test && npm run build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Pipeline summary groups deals by stage with counts and values | unit | `npm test -- --reporter=verbose` | Wave 0 |
| DASH-02 | Alerts endpoint returns overdue calls, covenant breaches, lease expiries within 90 days | unit | `npm test -- --reporter=verbose` | Wave 0 |
| DASH-03 | Activity feed filters correctly by entity and type | unit | `npm test -- --reporter=verbose` | Wave 0 |
| DASH-04 | Entity card renders quick action icons | smoke (build) | `npm run build` | n/a (UI only) |
| SUPP-01 | Report preview modal opens for report with fileUrl | smoke (build) | `npm run build` | n/a (UI only) |
| SUPP-02 | Integration status shows green/red per connection state | smoke (build) | `npm run build` | n/a (UI only) |
| SUPP-03 | Notification preferences save and load correctly | unit | `npm test -- --reporter=verbose` | Wave 0 |
| SUPP-04 | Reports grouped by entity then period | unit | `npm test -- --reporter=verbose` | Wave 0 |
| SUPP-05 | AI test connection returns success/error with model name | smoke (manual) | Manual: Settings > AI Config > Test Connection | n/a (existing) |
| SUPP-06 | Zero window.confirm() calls in codebase | unit (grep) | `npm test -- --reporter=verbose` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run build` — zero type errors required
- **Per wave merge:** `npm test` — all existing tests green
- **Phase gate:** `npm test && npm run build` full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/app/api/dashboard/__tests__/phase19-dashboard.test.ts` — covers DASH-01, DASH-02, DASH-03
- [ ] `src/app/api/activity/__tests__/activity-filter.test.ts` — covers DASH-03 filtering logic
- [ ] `src/lib/__tests__/phase19-report-grouping.test.ts` — covers SUPP-04 grouping logic
- [ ] `src/lib/__tests__/phase19-notification-prefs.test.ts` — covers SUPP-03 save/load
- [ ] `src/lib/__tests__/phase19-confirm-scan.test.ts` — covers SUPP-06 (extend existing foundation.test.ts grep-as-test pattern)

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all referenced files — all findings are from actual source code
- `src/components/features/dashboard/` — all 7 existing dashboard components read
- `src/app/(gp)/dashboard/page.tsx` — current dashboard page structure confirmed
- `src/app/(gp)/reports/page.tsx` — current reports page structure confirmed
- `src/components/features/settings/integrations-tab.tsx` — IntegrationsTab full source read
- `src/components/features/settings/ai-global-config.tsx` — AIGlobalConfig with test connection confirmed present
- `src/components/ui/document-preview-modal.tsx` — DocumentPreviewModal iframe pattern confirmed
- `prisma/schema.prisma` — all referenced models verified (Lease, Covenant, CapitalCall, DealStage enum, etc.)
- `.planning/STATE.md` — accumulated architectural decisions read
- `package.json` — all library versions verified

### Secondary (MEDIUM confidence)
- Family office dashboard best practices (chart recommendation) — based on UX knowledge of what family offices actually need: allocation view, deployment pace, performance ranking
- Notification preferences storage in `User.permissions` JSON — inferred from STATE.md "schema changes are high-risk" combined with existing `permissions` Json? field on User model

### Tertiary (LOW confidence)
- None — all findings are from direct codebase inspection

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in package.json
- Architecture: HIGH — based on direct reading of all relevant source files
- Pitfalls: HIGH — identified from reading actual code and STATE.md decisions
- New API designs: HIGH — consistent with existing API patterns in codebase

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable codebase, no fast-moving external dependencies)
