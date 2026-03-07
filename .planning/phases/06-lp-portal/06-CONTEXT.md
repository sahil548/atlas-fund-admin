# Phase 6: LP Portal - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

LP portal shows computed data (not seeded) and is ready for real investor access. Includes: wiring LP dashboard to Phase 3 computation engines, time-series performance charts, capital account statement with real computations, and LP communication preferences stored for the notification engine (Phase 7). The 5 LP pages already exist — this phase ensures they display real computed data and are polished for investor use.

</domain>

<decisions>
## Implementation Decisions

### Time-Series Charts
- Metrics charted: IRR, TVPI, DPI, RVPI, and NAV over time (core four + NAV)
- Default granularity: quarterly, with toggle to switch to monthly view
- Data source: snapshot-on-compute — every time metrics are computed (page load, transaction event), save a timestamped snapshot. Charts built from stored snapshots
- No backfill from historical transactions — data accumulates going forward
- Chart layout: Claude's discretion (single multi-line vs grouped charts, whatever works best with existing dashboard stat cards)

### Capital Account Statement
- Format: running ledger (Phase 3 decision) PLUS quarterly/annual period summaries at the top
- Detail per transaction line: standard — date, type, description, amount, running balance (no decomposition per line)
- Scope: consolidated view showing totals across all entities, with per-entity breakdown below
- No export this phase — PDF/Excel export deferred to Phase 7 (REPORT-02)

### Communication Preferences
- Channels: all three — email, SMS, in-app. This phase stores preferences; delivery engine is Phase 7
- Notification types LPs can opt into/out of:
  - Capital activity: capital calls issued, distributions paid
  - Reports: quarterly reports available, K-1 ready
  - Portfolio: NAV updates, valuation changes, new deal closes in their entities
- Digest preference: LP-controlled — LP chooses immediate vs daily vs weekly digest
- GP can override for urgent items (capital calls always immediate regardless of digest preference)
- UI location: dedicated LP settings page within the LP portal

### LP Portal Polish
- Empty states: informative with context — explain what will appear (e.g., "Your capital account will populate once your first capital call is funded")
- Multi-investor switching: top-level selector in LP header, persistent dropdown showing current investor profile. Extends existing InvestorProvider
- Mobile responsiveness: basic responsive — tables stack, charts resize, navigation works on mobile. Not pixel-perfect but functional
- Visual style: match existing Atlas style — same dark mode, Tailwind styling, color palette as GP side. Consistent brand across LP and GP

### Claude's Discretion
- Time-series chart layout (grouping, chart types, colors)
- Period summary format on capital account (quarterly vs annual rollups)
- Exact notification type categories and granularity
- LP settings page layout and navigation
- Loading states and error handling across LP pages
- How the investor selector dropdown presents entity/commitment info

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **InvestorProvider** (`src/components/providers/investor-provider.tsx`): Multi-investor context with `useInvestor()` hook. Extend for persistent selection and settings
- **LP Dashboard endpoint** (`/api/lp/[investorId]/dashboard/route.ts`): Already computes IRR, TVPI, DPI, RVPI from real data via `computeMetrics()` and `xirr()`
- **LP Activity page** (`/lp-activity`): Shows capital call and distribution line items. Already has running ledger from Phase 3
- **Capital account compute endpoint** (`/api/investors/[id]/capital-account/compute`): Recomputes capital account for a period
- **InvestorNotificationPreference model**: Exists in Prisma with `preferredChannel`, `emailAddress`, `phoneNumber`, `notificationTypes` (JSON), `digestPreference` — needs UI
- **Recharts**: Available in project (used on analytics page). PieChart, LineChart, AreaChart components ready
- **StatCard component**: Used on LP dashboard for metric display. Extend with sparklines or trend indicators
- **NAV snapshots**: Auto-saved on every GET `/api/nav/[entityId]` (Phase 3). Pattern to replicate for metric snapshots
- **Asset allocation chart** (`src/components/features/dashboard/asset-allocation-chart.tsx`): Recharts PieChart with dual rings. Pattern to follow for LP charts
- **Number formatting utilities**: `fmt()`, `pct()`, `fmtSigned()` — ready for LP data display

### Established Patterns
- **SWR data fetching**: All LP pages use `useSWR` with `investorId` scoping. Conditional fetching: `useSWR(investorId ? url : null, fetcher)`
- **Loading guard**: `if (!investorId || isLoading || !data) return <Loading/>`
- **Multi-tenancy**: `useFirm()` for firmId scoping on all queries
- **LP route group**: `(lp)/` route group with shared layout and InvestorProvider
- **Zod validation**: All API routes use `parseBody(req, ZodSchema)`
- **Toast notifications**: `useToast()` (never destructure)

### Integration Points
- **Metric snapshot storage**: New model or extend existing — save timestamped IRR/TVPI/DPI/RVPI/NAV per investor per entity
- **LP settings page**: New route in `(lp)/` group — `/lp-settings` or similar
- **Communication preference API**: Extend existing `/api/investors/[id]/` routes for notification preferences CRUD
- **Dashboard → charts**: Add Recharts charts below existing stat cards on `/lp-dashboard`
- **Capital account → period summaries**: Aggregate existing ledger data into quarterly/annual rollups

</code_context>

<specifics>
## Specific Ideas

- Phase 4 established "helpful empty states" as a pattern — LP portal should follow the same approach with informative context about what will populate
- NAV snapshot auto-save pattern from Phase 3 can be replicated for metric snapshots — fire-and-forget on every dashboard GET
- Capital account consolidated view mirrors the Phase 4 decision for cross-entity NAV dashboard — high-level summary, detail on demand
- LP visibility is uniform per fund (PROJECT.md) — same view for all LPs in a given entity, no per-LP customization

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-lp-portal*
*Context gathered: 2026-03-07*
