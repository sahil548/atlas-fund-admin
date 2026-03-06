# Phase 4: Asset & Entity Polish - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden asset management, entity management, and core infrastructure for reliable daily GP use. Includes: side letter rule engine modifying fees per LP per entity, fund-level and LP-level performance aggregation, deal-level performance attribution with projected vs actual comparison, cross-entity NAV dashboard, redesigned GP dashboard, role-based access enforcement (GP_ADMIN/GP_TEAM/SERVICE_PROVIDER/LP_INVESTOR), pagination on all data lists with search and filtering, error boundaries, AI rate limiting, and UX polish (loading states, empty states, retry behavior).

</domain>

<decisions>
## Implementation Decisions

### Side Letter Rules & Fee Modifications
- Structured rule types for computable provisions (fee discount %, carry override %, MFN flag, co-invest rights flag) PLUS free-text field for non-computable provisions (reporting requirements, transfer restrictions, excuse rights, key person provisions)
- Full range of provisions — varies widely across LPs, system must be flexible
- Fee engine computes at standard rate, then shows side letter adjustments as a separate line (e.g., "Mgmt fee: $50k, Side letter discount: -$10k, Net: $40k") — GP confirms before applying
- MFN (Most Favored Nation): Atlas auto-detects best terms across all side letters for an entity, flags any MFN-holding LP whose current terms are worse — GP reviews and manually updates if needed (no auto-apply)
- SideLetter model needs expansion: currently just `terms` text field → needs structured `SideLetterRule` records per provision type

### Performance Dashboards & Aggregation
- Redesign existing /dashboard as hybrid layout:
  - **Top section:** Entity cards — each fund/SPV showing NAV, IRR, TVPI, capital deployed vs committed, asset count
  - **Bottom section:** Portfolio-level aggregates with 4 components:
    1. Asset allocation breakdown (pie/donut by asset class) — partially exists via /api/dashboard/asset-allocation
    2. Top/bottom performers — ranked assets by IRR or MOIC (top 5 / bottom 5)
    3. Capital deployment tracker — committed vs called vs deployed, per entity and aggregate (dry powder visibility)
    4. Recent activity feed — latest capital calls, distributions, valuations, deal closes across the firm
- Entity card display/filtering: Claude's discretion (balance between showing all ~9+ entities vs keeping it scannable)
- Point-in-time metrics only for now — no time-series charts or historical trends (can add after QBO integration)

### Deal-Level Performance Attribution (FIN-10)
- Full attribution engine: for each deal/asset, show its contribution to the fund's overall IRR, TVPI, and returns
- **Projected vs Actual comparison on each asset:**
  - Projections sourced from AI-extracted deal metadata during screening (Phase 2) + GP manual override/refinement
  - Both persist as the "deal-time projection" baseline
  - Actual: unrealized and realized return metrics from real transactions (capital calls, distributions, valuations, income events)
  - Asset detail shows side-by-side: projected IRR vs actual IRR, projected cash-on-cash vs actual, projected vs actual cap rate (RE), etc.

### LP-Level Performance (FIN-09)
- LP dashboard endpoint already computes TVPI, DPI, RVPI, IRR per investor — wired and working
- Claude's discretion: build GP-side LP comparison view (all LPs side-by-side across entities) and per-entity LP breakdown tab
- GP hasn't explored LP views yet — build sensible defaults, iterate based on feedback

### Cross-Entity NAV Dashboard (ASSET-02)
- Cards for quick scan (NAV, unrealized gain/loss, accrued carry, capital deployed % per entity)
- Click to expand into detailed breakdown: NAV layers (cost basis vs fair value), per-asset contributions, unrealized gains by asset
- Progressive disclosure: high-level cards first, detail on demand
- Lives within the redesigned /dashboard (entity cards section), not a separate page

### Role-Based Access Enforcement (CORE-02)
- **GP_ADMIN:** Unrestricted — full access to everything
- **GP_TEAM:** Configurable permissions — GP_ADMIN sets what CFO and CIO can do per area (deals, entities, capital activity, settings, etc.)
- Permission management: Claude's discretion (simplest approach for 3 GP users that scales later)
- **LP_INVESTOR:** Hard enforcement at middleware + redirect — LPs hitting GP routes (`/(gp)/*`) get redirected to `/lp/dashboard`. API routes return 403 for unauthorized role. This is non-negotiable for production security (currently NO enforcement exists — any authenticated LP can access GP pages)
- Activity audit log: log meaningful actions (create, edit, delete, view sensitive data) with user, timestamp, and what changed — viewable on entity/asset activity tabs

### Service Provider Access (CORE-03)
- Read-only access, entity-scoped via `entityAccess[]` field on User model
- Service providers can VIEW data for assigned entities only — can download documents but can't edit anything
- Manual revocation only — no time-bound expiry dates. GP removes access when done
- Two management paths:
  - Settings page: central view showing all service providers across all entities
  - Entity detail page: contextual add/remove per entity
- Both paths update the same underlying data

### Pagination (CORE-04)
- Cursor-based pagination with "Load More" button — performant for large datasets, modern UX
- Default page size: 50 records
- Applied to ALL data lists: deals, assets, entities, investors, transactions, documents, tasks, meetings, contacts, companies
- Search bar + relevant filters added to all lists alongside pagination:
  - Deals: by stage, asset class, deal lead, date range
  - Assets: by asset class (existing), entity, status, performance range
  - Entities: by type, status, vintage
  - Investors: by entity, commitment range
  - Transactions: by type, date range, entity
  - Others: Claude's discretion for relevant filters

### Error Boundaries (CORE-05)
- Page-level error boundary as safety net (catches any unhandled error on the page)
- Section-level boundaries around critical components: charts, computation displays, AI-generated content, financial data tables
- Error state: "Something went wrong — Retry" with a retry button
- Spinner + text for loading states (not skeleton loaders): "Loading deals...", "Loading entity data...", etc.
- Show error immediately on API failure with retry button — no auto-retry (transparent to user)
- Helpful empty states with action prompt: "No investors yet — Add your first investor" with a button that guides to the next step

### AI Rate Limiting (CORE-06)
- Per-user soft limits (e.g., 20 AI requests/minute, 200/hour) — prevents runaway loops
- Global endpoint ceiling — protects Vercel serverless functions from being overwhelmed
- Shows "Slow down" message when per-user limit hit
- Returns proper 429 status with rate limit headers (Retry-After, X-RateLimit-Remaining)
- Applied to both AI endpoints: /api/ai/agents and /api/ai/search

### Cmd+K Command Bar Polish
- Make existing Cmd+K faster and more contextual — better search across deals, assets, entities, investors
- Improved result relevance — no new features, just performance and quality

### Claude's Discretion
- Entity card display/filtering approach for ~9+ entities on dashboard
- Exact layout and chart types for portfolio aggregate section
- LP comparison view design (GP-side)
- Permission management UI approach (settings page matrix vs per-user vs role templates)
- Filters per list type (beyond the ones explicitly specified)
- Error boundary granularity (which sections get their own boundary)
- Rate limit exact thresholds based on Vercel constraints
- Cmd+K search improvement approach
- Audit log storage approach (reuse existing DealActivity pattern vs new AuditLog model)

</decisions>

<specifics>
## Specific Ideas

- Dashboard should feel like a "morning briefing" — GP opens Atlas and immediately sees the health of every entity and the portfolio
- Projected vs actual on assets is a key differentiator: "we thought this deal would return 15% IRR — it's actually at 12%. Here's why." The AI-extracted projections from deal screening become the benchmark
- Side letter fee adjustments shown as explicit line items — GP should see the math, not just the adjusted number
- Service provider access is read-only by design — they observe and advise, they don't modify
- Activity audit is for accountability, not compliance (no SOC 2 yet) — keep it practical
- "Helpful empty states" — Atlas should feel like it's guiding you, not showing you blank pages

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- **SideLetter model + CRUD** (`prisma/schema.prisma` + `src/app/api/side-letters/`): Basic model with `terms` text field. CRUD endpoints work. Needs expansion to structured SideLetterRule records.
- **create-side-letter-form.tsx**: Form with investor/entity selectors + terms textarea. Base for expanded rule UI.
- **Dashboard stats endpoint** (`/api/dashboard/stats/route.ts`): Computes total AUM, active assets, weighted IRR, TVPI at firm level. Extend for entity-level aggregation.
- **Asset allocation endpoint** (`/api/dashboard/asset-allocation/route.ts`): Already provides allocation breakdown data.
- **NAV endpoint** (`/api/nav/[entityId]/route.ts`): Single-entity NAV with cost basis + fair value layers. Reuse for cross-entity aggregation.
- **LP dashboard endpoint** (`/api/lp/[investorId]/dashboard/route.ts`): Fully wired with `computeMetrics()` — calculates TVPI, DPI, RVPI, IRR.
- **Computation engines** (`src/lib/computations/`): IRR (xirr.ts), waterfall (waterfall.ts), capital accounts (capital-accounts.ts), metrics (metrics.ts) — all verified correct in Phase 1.
- **UserRole enum**: GP_ADMIN, GP_TEAM, SERVICE_PROVIDER, LP_INVESTOR — defined in Prisma schema.
- **entityAccess[] field**: String array on User model — exists but never populated or checked.
- **Clerk middleware** (`src/middleware.ts`): Only checks authentication, no role-based routing.
- **getAuthUser()** (`src/lib/auth.ts`): Retrieves Clerk user + DB user with role. Foundation for role checks.
- **DealActivity model**: Existing activity logging on deals. Pattern can be extended for audit log.
- **SWR data fetching**: All list pages use `useSWR` with firmId scoping. Add pagination params to existing hooks.
- **Cmd+K command bar**: `/api/commands/search/route.ts` + `/api/ai/search/route.ts` — search across entities with AI.

### Established Patterns
- **SWR data fetching**: `useSWR(/api/endpoint?firmId=${firmId})` — add `cursor` and `limit` params
- **Zod validation**: All API routes use `parseBody(req, ZodSchema)` — add pagination schema
- **Toast notifications**: `useToast()` (never destructure)
- **Multi-tenancy**: `useFirm()` for firmId — all queries scoped by firm
- **File upload**: FormData → Vercel Blob → document record
- **Activity logging**: DealActivity records create/stage changes — extend pattern to all entities/assets

### Integration Points
- **Fee engine (Phase 3)**: Side letter rules must hook into the fee calculation engine from Phase 3 — compute standard rate, then apply side letter adjustments
- **Deal metadata (Phase 2)**: AI-extracted projections from deal screening carry over to assets — used as projection baseline for Phase 4's projected vs actual comparison
- **Capital activity (Phase 3)**: Performance metrics (IRR, TVPI) depend on Phase 3 wiring computation engines to real data
- **Clerk auth**: Role enforcement middleware wraps existing Clerk `auth()` — adds role checks on top
- **Route registry** (`routes.ts`): Must be updated with role requirements per route for middleware enforcement

</code_context>

<deferred>
## Deferred Ideas

- **Structured insurance policy model** — Policy number, carrier, expiry date, renewal alerts per asset. New capability, not in current roadmap. Suggested by user for operational asset management.
- **Manager/vendor contact relationships on assets** — Link property managers, fund administrators, and other service relationships directly to assets. New data model needed.
- **Maintenance workflow lifecycle** — Structured task-based maintenance tracking with its own lifecycle (reported → in progress → resolved), beyond the existing generic task system. New capability.
- **Deal search & filtering on pipeline** — Advanced search by name, asset class, date range, stage on the deals board. Noted from Phase 2 context deferred ideas.
- **Time-series performance charts** — Historical NAV, IRR, TVPI trends over monthly periods. Deferred until after QBO/Xero integration brings real GL data (Phase 5).
- **Benchmark comparisons** — Fund performance vs benchmark indices. Future analytics enhancement.

</deferred>

---

*Phase: 04-asset-entity-polish*
*Context gathered: 2026-03-06*
