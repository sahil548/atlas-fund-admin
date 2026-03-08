# Architecture Research

**Domain:** Family office operating system — module-by-module polish pass
**Researched:** 2026-03-08
**Confidence:** HIGH (based on direct codebase analysis, not training data)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Next.js 16 App Router                        │
├──────────────────────────────┬──────────────────────────────────────┤
│     GP Portal /(gp)/         │        LP Portal /(lp)/              │
│  25 pages, full CRUD         │   5 pages, read-only with investorId │
├──────────────────────────────┴──────────────────────────────────────┤
│                    Shared UI Layer                                   │
│  components/ui/      components/layout/    components/features/     │
│  (19 primitives)     (AppShell, Sidebar,   (67 feature components,  │
│                       TopBar)              organized by domain)      │
├─────────────────────────────────────────────────────────────────────┤
│                    Data / State Layer                                │
│  SWR 2 (client cache)    useFirm() / useInvestor() (context)        │
│  Cursor-based pagination  useMutation hook                          │
├─────────────────────────────────────────────────────────────────────┤
│                    API Layer (73 REST routes)                        │
│  parseBody(req, ZodSchema)   firmId scoping   fire-and-forget       │
│  Prisma error codes          HTTP status codes                      │
├─────────────────────────────────────────────────────────────────────┤
│                    Persistence Layer                                 │
│  PostgreSQL + Prisma 7 (57 models)  Vercel Blob (files)             │
│  Clerk 7 (auth)  Vercel (deployment)                                │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component Layer | Responsibility | Files |
|-----------------|---------------|-------|
| `app/(gp)/**/page.tsx` | GP page shell: SWR fetch, tab state, modal state, filter state | 25 pages |
| `app/(lp)/**/page.tsx` | LP page shell: investor-scoped SWR fetch, read-only display | 5 pages |
| `components/features/*/*.tsx` | Domain-specific forms, panels, tabs — receive props, fire mutations | 67 components |
| `components/ui/*.tsx` | Stateless or minimally-stateful primitives used everywhere | 19 components |
| `components/layout/*.tsx` | AppShell, Sidebar, TopBar — routing-aware chrome | 3 files |
| `app/api/**/*.ts` | Route handlers: parse, validate (Zod), query Prisma, return JSON | 73 routes |
| `lib/utils.ts` | fmt(), pct(), cn() — pure formatting/utility functions | 1 file |
| `lib/constants.ts` | Label/color lookup tables for enums | 1 file |
| `lib/routes.ts` | Single source of truth for all routes (sidebar, command bar, AI) | 1 file |
| `lib/computations/` | Financial calculation engines (IRR, waterfall, capital accounts) | ~4 files |

---

## Existing Project Structure

```
src/
├── app/
│   ├── (gp)/                   # GP portal — 25 pages
│   │   ├── dashboard/page.tsx
│   │   ├── deals/page.tsx
│   │   ├── deals/[id]/page.tsx
│   │   ├── assets/page.tsx
│   │   ├── assets/[id]/page.tsx
│   │   ├── entities/page.tsx
│   │   ├── entities/[id]/page.tsx
│   │   ├── transactions/page.tsx  # capital calls, distributions, waterfall
│   │   ├── accounting/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── documents/page.tsx
│   │   ├── directory/page.tsx
│   │   ├── tasks/page.tsx
│   │   ├── meetings/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── investors/[id]/page.tsx
│   ├── (lp)/                   # LP portal — 5 pages
│   │   ├── lp-dashboard/page.tsx
│   │   ├── lp-portfolio/page.tsx
│   │   ├── lp-documents/page.tsx
│   │   ├── lp-activity/page.tsx
│   │   └── lp-account/page.tsx
│   └── api/                    # 73 REST route handlers
├── components/
│   ├── ui/                     # 19 primitives
│   │   ├── button.tsx, badge.tsx, input.tsx, select.tsx, textarea.tsx
│   │   ├── modal.tsx, confirm-dialog.tsx
│   │   ├── stat-card.tsx, progress-bar.tsx, tabs.tsx
│   │   ├── toast.tsx, error-boundary.tsx, form-field.tsx
│   │   ├── file-upload.tsx, document-preview-modal.tsx
│   │   ├── search-filter-bar.tsx, export-button.tsx
│   │   ├── load-more-button.tsx, notification-bell.tsx
│   ├── features/               # 67 domain components
│   │   ├── deals/              # 10 components
│   │   ├── assets/             # ~8 components
│   │   ├── dashboard/          # 6 components
│   │   ├── capital/            # 2 components
│   │   ├── waterfall/          # 3 components
│   │   ├── accounting/         # 3 components
│   │   ├── settings/           # 5 components
│   │   ├── entities/           # 2 components
│   │   ├── investors/          # 2 components
│   │   ├── lp/                 # 1 component
│   │   ├── side-letters/       # 2 components
│   │   ├── contacts/           # 2 components
│   │   ├── directory/          # 3 components
│   │   ├── companies/          # 1 component
│   │   ├── meetings/           # 1 component
│   │   ├── documents/          # 1 component
│   │   ├── onboarding/         # 1 component
│   │   └── command-bar/        # 2 components
│   ├── layout/                 # app-shell.tsx, sidebar.tsx, top-bar.tsx
│   └── providers/              # firm-provider.tsx, user-provider.tsx, investor-provider.tsx
└── lib/
    ├── routes.ts               # SINGLE SOURCE OF TRUTH for all routes
    ├── prisma.ts               # singleton
    ├── schemas.ts              # Zod schemas + taxonomy constants
    ├── constants.ts            # label/color maps for enums
    ├── utils.ts                # fmt(), pct(), cn()
    ├── api-helpers.ts          # parseBody()
    ├── computations/           # IRR, waterfall, capital-accounts
    └── deal-stage-engine.ts    # deal pipeline state machine
```

### Structure Notes

- **Feature folder naming follows domain, not page.** `features/deals/` serves both `/deals` list and `/deals/[id]` detail.
- **No barrel exports (`index.ts`).** Every import uses the full relative or alias path. This is consistent and should stay that way.
- **`lib/constants.ts` vs `lib/schemas.ts`.** Constants holds display labels/colors. Schemas holds Zod validation + enum values. They serve different consumers.

---

## Architectural Patterns (What Is Actually Used)

### Pattern 1: Page-Owns-State, Feature-Component-Owns-Mutation

**What:** List pages (`/deals`, `/assets`, `/entities`) own all local state (filters, cursors, modals) and pass minimal props to feature components. Feature components (`CreateDealWizard`, `EditAssetForm`) handle their own mutation logic internally and call `mutate()` to revalidate.

**When to use:** Every list page, every detail page. This is the established pattern — follow it consistently.

**Trade-offs:** Pages can grow large (settings/page.tsx is 940 lines). Accept this for consistency; extract only when a tab grows beyond ~200 lines into its own `features/` component.

**Example (the established loading guard + cursor pattern):**
```typescript
const { isLoading } = useSWR(buildUrl(null), fetcher, {
  onSuccess: (result) => {
    setAllItems(result.data ?? []);
    setCursor(result.nextCursor ?? null);
  },
  revalidateOnFocus: false,
});
if (isLoading && allItems.length === 0) return <LoadingSpinner />;
```

### Pattern 2: Tab-Based Detail Pages

**What:** Detail pages (`/deals/[id]`, `/assets/[id]`, `/entities/[id]`) use a local `tab` state string and render each tab as a conditional block or extracted feature component.

**Established tab rendering in `/deals/[id]`:** tabs array drives both the pill bar and the conditional rendering. Each tab content is either inline JSX (for small content) or a `features/` component (for complex content like `deal-dd-tab.tsx`).

**When to extract to a feature component:** When a tab contains its own SWR fetch, its own modals, or more than ~100 lines of JSX. Examples: `deal-dd-tab.tsx`, `deal-ic-review-tab.tsx`, `asset-performance-tab.tsx`.

**When to keep inline:** Simple read-only displays, small forms with 2-3 fields. Example: deal notes tab (simple textarea).

**Example (tab bar pattern — use this exact className structure):**
```typescript
<div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
  {tabs.map((t) => (
    <button
      key={t}
      onClick={() => setTab(t)}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {t}
    </button>
  ))}
</div>
```

### Pattern 3: SWR + Fire-and-Forget Mutations

**What:** All data mutations follow: `fetch()` → check `res.ok` → `toast.success/error` → `mutate(cacheKey)`. Audit logging, notifications, and NAV snapshots are triggered inside API routes without blocking the response (fire-and-forget).

**Critical:** Toast must never be destructured. Always `const toast = useToast()` then `toast.success()`. Error messages must always be type-checked: `typeof data.error === "string" ? data.error : "Operation failed"`.

**Example:**
```typescript
const toast = useToast();
const res = await fetch(`/api/assets/${id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
if (!res.ok) {
  const data = await res.json();
  const msg = typeof data.error === "string" ? data.error : "Failed to update asset";
  toast.error(msg);
  return;
}
toast.success("Asset updated");
mutate(`/api/assets/${id}`);
```

### Pattern 4: FilterBar + Cursor Pagination

**What:** All list pages use `FilterBar` (dropdown-based), a `buildUrl(cursor?)` helper, and a manual `allItems` accumulation pattern. LoadMoreButton handles the "load next page" interaction.

**Note:** The `onSearch` prop on `SearchFilterBar` is deprecated. Search input was removed — the AI command bar (Cmd+K) is the universal search. Do not add search inputs to filter bars.

**When to add a filter:** When a list has more than 1 dimension of classification (e.g., by entity + by status). A single-dimension list doesn't need filters.

### Pattern 5: Empty States

**What:** Every list page has an empty state when `data.length === 0 && !isLoading`. The pattern is: message + sub-message + optional CTA button. The CTA button reuses the same action as the page header "Create" button.

**Established structure:**
```typescript
{items.length === 0 && !isLoading ? (
  <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
    <p className="text-sm text-gray-500">No [items] found</p>
    <p className="text-xs text-gray-400">
      {hasActiveFilters
        ? "Try different filters or clear them"
        : "Create your first [item] to get started"}
    </p>
    {!hasActiveFilters && (
      <Button onClick={() => setShowCreate(true)} className="mt-2">+ [Create CTA]</Button>
    )}
  </div>
) : (
  // table or kanban
)}
```

### Pattern 6: SectionErrorBoundary Usage

**What:** `<SectionErrorBoundary>` wraps any component that does its own SWR fetch or renders computed data. `<PageErrorBoundary>` is for the entire page content. Error boundaries already exist — they need to be used consistently.

**Current gap:** Not every page wraps its content in a PageErrorBoundary. The dashboard correctly wraps each section in SectionErrorBoundary. Other pages should follow suit for sections with independent data fetches.

---

## Data Flow

### Request Flow (Standard)

```
User Action (click, form submit)
    ↓
React event handler in page or feature component
    ↓
fetch() with JSON body or FormData
    ↓
Next.js API route handler
    ↓
parseBody(req, ZodSchema) → validates, returns typed data
    ↓
prisma.[model].[operation]({ where: { firmId }, data })
    ↓
NextResponse.json(result, { status: 200/201 })
    ↓ (fire-and-forget, not awaited)
auditLog() / notifyLPs() / snapNAV()
    ↓ (back in client)
mutate(swrCacheKey) → SWR refetches → UI updates
```

### LP Portal Data Flow (Separate)

```
LP user logs in via Clerk → investorId resolved via InvestorProvider
    ↓
useInvestor() hook provides investorId to all LP pages
    ↓
SWR fetch /api/lp/[investorId]/[endpoint]
    ↓
API routes scope to investorId (not firmId)
    ↓
Read-only data returned — no mutations in LP portal
```

### Multi-Tenancy Flow

```
Every page: const { firmId } = useFirm()
Every API call: ?firmId=${firmId} in query params
Every API route: where: { firmId } in Prisma queries
```

---

## Integration Points for v1.1 Polish Pass

### What Needs New Shared Components

| Gap | Current State | New Component Needed |
|-----|--------------|---------------------|
| Loading skeletons | Spinning SVG or plain "Loading..." text | `SkeletonRow`, `SkeletonCard` components in `components/ui/` |
| Inline loading states | No standardized pattern | `<LoadingState label="Loading deals..." />` primitive |
| Page-level error boundaries | Used inconsistently | Apply `PageErrorBoundary` at each `page.tsx` root |
| Section-level error boundaries | Used on dashboard, not elsewhere | Apply `SectionErrorBoundary` on every independent SWR fetch |
| Delete confirmation | `confirm()` browser dialog in some pages (e.g. settings/page.tsx line 177) | Replace with `ConfirmDialog` everywhere |
| Holding-type-aware asset panels | All asset types show same controls | Conditional panel renderer based on `asset.holdingType` |
| Empty state CTA alignment | Pattern exists but not always followed | Standardize using established pattern |

### What Should Be Modified (Not New)

| Component | Current Issue | Modification |
|-----------|--------------|--------------|
| `stat-card.tsx` | No dark mode support, no loading state | Add `loading?: boolean` prop that renders a skeleton |
| `search-filter-bar.tsx` | Deprecated `onSearch` prop still accepted | Remove deprecated props in a cleanup pass |
| `error-boundary.tsx` | Both classes work, but no `fallback` prop override | Add optional `fallback?: ReactNode` prop for custom error UI |
| `form-field.tsx` | Exists but not consistently used — many pages use raw `<label>` + `<Input>` | Standardize to `FormField` across all modal forms |
| `tabs.tsx` | Exists but pages implement their own tab pill bar inline | Audit whether the `<Tabs>` component matches the inline pattern; if not, update it |

### Internal Module Boundaries

| Boundary | Communication | Polish Notes |
|----------|--------------|--------------|
| Page ↔ Feature Component | Props + callbacks | Feature components should not read firmId directly — it should come from the page via props |
| Feature Component ↔ API | direct fetch() | Consistent: always check `res.ok`, always type-check error |
| API Route ↔ Prisma | Direct query in route handler | No service layer — keep it flat |
| computations/ ↔ API | Import functions from computations/ | Computation functions should be pure — no Prisma calls inside them |

---

## Module Execution Order for Polish Pass

Based on dependency analysis and user-facing impact:

### Tier 1 — Foundation (do first, everything depends on this)

1. **Shared component standardization** — Skeleton loading, ConfirmDialog replacement, FormField adoption, SectionErrorBoundary coverage. Doing this first means every subsequent module gets consistent patterns.
2. **Dashboard** — First thing GPs see. Sets the tone. Uses SectionErrorBoundary correctly (good model). Needs skeleton cards, empty state polish.

### Tier 2 — Core Workflow Modules (highest daily use)

3. **Deals** (list + detail) — Most complete module. Polish: DD tab workstream status sync (BUG-01), pipeline pass rate calc (BUG-02), IC memo spinner timeout (BUG-03), Closing tab completion flow.
4. **Assets** (list + detail) — High daily use. Polish: holding-type-adaptive UI (currently all assets show same controls regardless of `holdingType`), performance tab, valuation history, income events.
5. **Entities** (list + detail) — Foundation for all capital activity. Polish: formation workflow completion, NAV display, investor management tab.

### Tier 3 — Capital & Finance (core but less frequent)

6. **Transactions** (capital calls, distributions, waterfall) — Works but uses `confirm()` dialogs, has no empty states on tabs, waterfall calc modal is custom-built (not using `Modal` primitive).
7. **LP Portal** (all 5 pages) — Separate portal. Polish: verify metrics are computed not seeded, empty states, performance chart responsiveness.

### Tier 4 — Supporting Modules

8. **Accounting** — UI-only today. Polish: wire real QBO OAuth, trial balance display, account mapping UI.
9. **Reports** — PDF/Excel generation. Polish: ensure all export buttons work, verify PDF output.
10. **Settings** — Many tabs. `confirm()` dialogs need replacing. Notifications tab is a stub.
11. **Documents, Tasks, Meetings, Directory** — Supporting modules. Polish: empty states, missing CRUD operations.

---

## Anti-Patterns to Avoid During Polish Pass

### Anti-Pattern 1: Browser `confirm()` for Destructive Actions

**What people do:** `if (!confirm("Delete this?")) return;` — used in settings/page.tsx for user deactivation and structure deletion.
**Why it's wrong:** Blocks UI thread, unstyled, inconsistent with the rest of the app.
**Do this instead:** Always use `<ConfirmDialog>` with `variant="danger"`. It already exists in `components/ui/confirm-dialog.tsx`.

### Anti-Pattern 2: Custom Modal for One-Off Dialogs

**What people do:** Building a new `<div className="fixed inset-0 z-50...">` inline in a page (transactions/page.tsx line 556 — the waterfall calculate modal).
**Why it's wrong:** Duplicates modal chrome logic, doesn't get Escape key handling, doesn't use portal correctly, style inconsistency.
**Do this instead:** Use `<Modal>` from `components/ui/modal.tsx` for every dialog. It handles portal, escape key, scroll lock, and sizing.

### Anti-Pattern 3: Inline Loading Spinner SVG

**What people do:** Copy-pasting the spinning SVG markup for every loading state (seen in deals/page.tsx and assets/page.tsx).
**Why it's wrong:** Inconsistent animation timing, copy-paste drift, not accessible.
**Do this instead:** Extract to a `<LoadingState label="Loading..." />` component in `components/ui/`. One definition, used everywhere.

### Anti-Pattern 4: Duplicated Table Header Arrays

**What people do:** `["Asset", "Asset Class", "Instrument", ...].map((h) => <th key={h}>...)` — repeated in assets, entities, transactions pages.
**Why it's wrong:** Can't easily update a column, type-unsafe column keys, no reuse.
**Do this instead:** Keep table headers as typed arrays defined at the top of each page component. Don't extract to a generic table component — tables in this app are too domain-specific. Just keep the pattern consistent: `const HEADERS = [...]` at the top of the file.

### Anti-Pattern 5: `data?.` Optional Chaining Without Guards

**What people do:** `<div>{data?.items?.map(...)}</div>` — omitting the explicit `isLoading || !data` guard.
**Why it's wrong:** Renders blank rather than loading state; SectionErrorBoundary can't help if data is simply absent.
**Do this instead:** Always explicit guard: `if (isLoading || !data) return <LoadingState />;`

### Anti-Pattern 6: Hardcoding Status Values in JSX

**What people do:** `badge color={e.formationStatus === "FORMING" ? "yellow" : "green"}` scattered across multiple pages.
**Why it's wrong:** Same status → different color in different places; hard to update.
**Do this instead:** Add status → color maps to `lib/constants.ts` next to the existing `ASSET_CLASS_COLORS` pattern. One change updates every usage.

---

## Scaling Considerations

| Scale | Current Approach | When to Revisit |
|-------|-----------------|----------------|
| Data volume (current: ~12 assets, 10 LPs) | All data loads with cursor-based pagination (limit 50) | If a single entity exceeds 1,000 records, reduce limit to 20 |
| Financial calculations | Synchronous, in-process | If XIRR over 100+ cash flows starts hitting 10s Vercel timeout, move to async with status polling |
| AI analysis | Inline, blocks request | Already constrained by user-supplied key rate limits; add request timeout (30s) with error state |
| File storage | Vercel Blob, no CDN | Fine for current scale; add CDN in front if LP document downloads become slow |
| Multi-tenancy | firmId scoping on every query | Postgres row-level security could replace this at scale, but current pattern is adequate for the team size |

### First Bottleneck

The most likely first performance problem is the `/api/dashboard/entity-cards` endpoint — it aggregates NAV, IRR, TVPI across all entities with all their assets. As asset count grows (from ~12 to 50+), this will slow. Solution: add a `lastNAVSnapshot` denormalized field and serve from snapshot instead of recomputing on every load.

---

## Shared Component Extraction Candidates

These patterns appear across 3+ pages and should become shared components during the polish pass:

### New Components to Create in `components/ui/`

| Component | What It Is | Where Used Today |
|-----------|-----------|-----------------|
| `LoadingState` | Centered spinner + label, replaces raw SVG | deals/page.tsx, assets/page.tsx, entities/page.tsx, every page with SWR |
| `SkeletonRow` | Animated gray bar, replaces blank table row during load | All table list pages |
| `SkeletonCard` | Animated gray box, replaces blank card during load | Dashboard already uses `animate-pulse` div — extract it |
| `PageHeader` | Section title + subtitle pattern (`<h2>` + `<p className="text-xs text-gray-500">`) | dashboard/page.tsx uses this; 8+ pages repeat it |
| `SectionPanel` | White card with border: `bg-white rounded-xl border border-gray-200` wrapper | Used everywhere inline — extract to eliminate 3-line boilerplate |

### New Components to Create in `components/features/`

| Component | What It Is | Where Used Today |
|-----------|-----------|-----------------|
| `HoldingTypeAdaptivePanel` | Renders different controls based on `asset.holdingType` | assets/[id]/page.tsx — currently all types show same controls |
| `StatusTimeline` | Vertical timeline of status transitions with dates | Could be used by deals activity tab, entity formation tab |
| `InlineFormRow` | Label + input pair inside a settings section | settings/page.tsx uses this pattern ~20 times inline |

### Do NOT Extract (Would Hurt More Than Help)

- Table components: Atlas tables are too domain-specific (different columns, different row actions, different data shapes). Generic `<DataTable>` would add complexity with no reuse benefit.
- Form components: Each form has unique fields and validation. Keep them as individual `features/[domain]/[action]-form.tsx` files.
- The `fetcher` function: Each page defines its own inline `const fetcher = ...`. This is intentional — they all look identical but keeping them local avoids coupling pages together.

---

## Sources

- Direct codebase analysis: `src/components/ui/`, `src/components/features/`, `src/app/(gp)/`, `src/app/(lp)/`
- `.planning/AUDIT.md` — honest scorecard with known gaps
- `.planning/ARCHITECTURE.md` — domain architecture reference
- `.planning/UI-GUIDE.md` — component catalog and testing workflows
- `CLAUDE.md` — coding patterns and anti-patterns (authoritative)
- `.claude/rules/coding-patterns.md` — bug-preventing patterns (authoritative)

---
*Architecture research for: Atlas v1.1 module-by-module polish pass*
*Researched: 2026-03-08*
