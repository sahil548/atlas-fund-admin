# Phase 11: Foundation - Research

**Researched:** 2026-03-09
**Domain:** React/Next.js shared UI components — empty states, skeleton loaders, confirm dialogs, page headers, section panels, date/currency formatting
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Empty State Design:** Friendly & guiding tone — illustration/icon + warm copy like "No deals yet — create your first deal to get started"
- **CTA buttons only when actionable** — show "+ Create Deal" on list pages, but filtered-empty states just show message
- **Distinct messaging for true-empty vs filtered-empty** — true-empty: friendly guide + CTA; filtered-empty: "No results match your filters" + "Clear filters" link
- **Same EmptyState component handles both variants** through props, but with different copy
- **Fixed 5 skeleton rows for data tables** during load — predictable, prevents layout shift
- **Pulse animation (`animate-pulse`)** — already used on dashboard, stays consistent with existing Tailwind patterns
- **Breadcrumbs on detail pages only** — list pages show title only, detail pages show "Deals > Acme Corp" trail
- **Built-in actions slot** — PageHeader component includes right-side slot for action buttons (+ Create Deal) and search bars
- **ConfirmDialog already exists** (`src/components/ui/confirm-dialog.tsx`) with danger variant — migrate all browser `confirm()` calls to it
- **Migrate all browser `confirm()` calls** — found in ~7 specific locations (settings/page, entities/[id]/page, entity-accounting-tab, dd-category-editor, deal-pipeline-editor)
- **Every destructive action must use ConfirmDialog with confirmation text**
- **Standard date format: "Mar 8, 2026"** (short month name) — matches existing PDF formatters
- **Context-dependent relative time:** activity feeds/notifications use relative ("3h ago"); tables and detail pages always use absolute dates
- **`fmt()` and `pct()` in `src/lib/utils.ts` are canonical formatters** — already used across 80+ files
- **Remove duplicate `formatCurrency()` definitions** (found in trial-balance-view.tsx and pdf/shared-styles.ts)
- **Consolidate into single source of truth in utils.ts**

### Claude's Discretion
- Icon choice for empty states (lean toward Lucide for consistency with existing icon set)
- Detail page loading approach per page type (full page skeleton vs centered spinner based on page complexity)
- Shimmer vs pulse for non-table contexts
- Subtitle pattern per page (count, description, or none)
- Section card variant strategy (single SectionPanel vs variants for stats/alerts)
- Exact confirmation copy per action, whether to require typing to confirm for high-risk actions
- Time display pattern (date-only by default with time on hover, or show time for same-day items)
- Library choice for date formatting (date-fns vs native Intl.DateTimeFormat based on formatting complexity)
- Dark mode adjustments for new components (follow existing `dark:` pattern)
- Whether to add additional formatter variants (e.g., full precision for detail views vs abbreviated for tables)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | All list pages show actionable empty states with CTAs (not blank white space) | EmptyState component pattern documented; 6 list pages identified; true-empty vs filtered-empty props design covered |
| FOUND-02 | All data tables show skeleton loading states instead of "Loading..." text | TableSkeleton component pattern with 5 fixed rows and animate-pulse documented; 11 pages with tables identified |
| FOUND-03 | All destructive actions use ConfirmDialog component (no browser confirm() dialogs) | 7 exact confirm() call locations identified; ConfirmDialog already exists and is ready to use |
| FOUND-04 | Shared PageHeader component standardizes title + subtitle pattern across all pages | Heading inconsistency documented (text-lg/text-xl/text-2xl/text-sm mix across pages); PageHeader pattern designed with actions slot |
| FOUND-05 | Shared SectionPanel component standardizes card wrapper pattern across all pages | "bg-white rounded-xl border border-gray-200" white card pattern identified as standard to wrap into SectionPanel |
| FOUND-06 | Consistent date formatting (date-fns) across all pages | 25+ toLocaleDateString() calls found across pages; canonical formatDate() exists in pdf/shared-styles.ts; decision: promote to utils.ts or use Intl.DateTimeFormat |
| FOUND-07 | Consistent number/currency formatting across all pages | 4 duplicate formatCurrency() definitions found; fmt() in utils.ts is canonical; consolidation plan documented |
| FOUND-08 | Dark mode parity — all new and modified components have dark: variants | Dark mode pattern `dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100` documented; stat-card missing dark mode identified as gap |
</phase_requirements>

---

## Summary

Phase 11 is a pure UI standardization pass — no new API routes, no schema changes. The work is creating 4 new shared components (EmptyState, TableSkeleton, PageHeader, SectionPanel), moving formatter functions to a canonical location, and doing a targeted migration of 7 browser `confirm()` calls and 25+ date formatting inconsistencies across ~30 GP pages.

The project is already Next.js 16 / React 19 / Tailwind CSS 4 / TypeScript. Lucide React is installed. Vitest is set up and running. The `fmt()` and `pct()` functions in `src/lib/utils.ts` are canonical and used in 80+ files — the plan is to expand utils.ts, not replace it. The ConfirmDialog component already exists and works; the only work is wiring it in 7 locations to replace direct `window.confirm()` calls. Dark mode uses a class-based approach: ThemeProvider adds `dark` to `<html>`, and components use Tailwind `dark:` prefix — this is fully established.

**Primary recommendation:** Build the 4 shared components first (EmptyState, TableSkeleton, PageHeader, SectionPanel), then do the migration sweeps in order: formatters (non-breaking), confirm() replacements (targeted), skeleton loaders (table-by-table), then empty states (page-by-page). Each migration wave is independently testable and reversible.

---

## Standard Stack

### Core (already installed — no new dependencies needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | ^4 | Utility classes including `animate-pulse` for skeletons | Already project-wide; `dark:` prefix pattern established |
| Lucide React | ^0.575.0 | Icons for empty states | Only icon library in project; already used in command-bar |
| React | 19.2.3 | Component model | Project foundation |
| TypeScript | ^5 | Type safety for component props | Project-wide requirement |

### Date Formatting — No New Library Needed
The project does NOT use date-fns. The CONTEXT.md gives Claude discretion on this. Based on code audit:

- `Intl.DateTimeFormat` / `toLocaleDateString("en-US", {...})` already produces "Mar 8, 2026" format
- The canonical `formatDate()` in `src/lib/pdf/shared-styles.ts` already outputs the correct format using native Intl
- Adding date-fns solely for `format(date, "MMM d, yyyy")` adds ~50KB bundle weight for no functional gain
- **Recommendation: use native `Intl.DateTimeFormat` — promote the existing `formatDate()` from `pdf/shared-styles.ts` to `utils.ts`**

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native Intl.DateTimeFormat | date-fns | date-fns adds bundle weight; native Intl already produces correct output; no benefit for this scope |
| Inline skeleton divs | react-loading-skeleton library | Library adds dependency; Tailwind animate-pulse is simpler and already established in dashboard |
| Custom dialog system | Radix UI Dialog | Radix adds dependency; ConfirmDialog already exists and works; migration is just wiring |

---

## Architecture Patterns

### Recommended Component Structure

```
src/components/ui/
├── empty-state.tsx        # NEW — EmptyState component
├── table-skeleton.tsx     # NEW — TableSkeleton with 5 rows
├── page-header.tsx        # NEW — PageHeader with title/subtitle/actions slot
├── section-panel.tsx      # NEW — SectionPanel wrapping white card pattern
├── confirm-dialog.tsx     # EXISTING — no changes needed
└── ...existing components
```

```
src/lib/
└── utils.ts               # EXPAND — add formatDate, formatDateShort, formatRelativeTime
                           # Keep fmt() and pct() exactly as-is (80+ callers)
                           # Remove duplicate formatCurrency() definitions elsewhere
```

### Pattern 1: EmptyState Component

**What:** A single component handling both true-empty (no records) and filtered-empty (no matches) states with optional CTA button and optional "Clear filters" link.

**When to use:** Whenever `items.length === 0 && !isLoading` in a list page or table section.

**Props design:**
```typescript
// src/components/ui/empty-state.tsx
interface EmptyStateProps {
  icon?: React.ReactNode;           // Lucide icon — defaults to InboxIcon
  title: string;                    // "No deals yet"
  description?: string;             // "Create your first deal to get started"
  action?: {
    label: string;                  // "+ Create Deal"
    onClick: () => void;
  };
  filtered?: boolean;               // true = show "Clear filters" link, hide CTA
  onClearFilters?: () => void;      // called when "Clear filters" clicked
}

export function EmptyState({ icon, title, description, action, filtered, onClearFilters }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
      <div className="text-gray-300 dark:text-gray-600">
        {icon ?? <InboxIcon className="h-10 w-10" />}
      </div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
      {description && (
        <p className="text-xs text-gray-400 dark:text-gray-500">{description}</p>
      )}
      {!filtered && action && (
        <Button onClick={action.onClick} className="mt-1">{action.label}</Button>
      )}
      {filtered && onClearFilters && (
        <button onClick={onClearFilters}
          className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 underline mt-1">
          Clear filters
        </button>
      )}
    </div>
  );
}
```

**Usage pattern — replaces the existing ad-hoc empty divs in every list page:**
```typescript
// Before (deals/page.tsx line 268):
{deals.length === 0 && !isLoading ? (
  <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
    <p className="text-sm text-gray-500">No deals found</p>
    ...
  </div>
) : ...}

// After:
{deals.length === 0 && !isLoading ? (
  <EmptyState
    title={search || hasActiveFilters ? "No results match your filters" : "No deals yet"}
    description={!search && !hasActiveFilters ? "Create your first deal to get started" : undefined}
    action={!search && !hasActiveFilters ? { label: "+ New Deal", onClick: () => setShowCreate(true) } : undefined}
    filtered={!!(search || hasActiveFilters)}
    onClearFilters={hasActiveFilters ? handleClearFilters : undefined}
  />
) : ...}
```

### Pattern 2: TableSkeleton Component

**What:** A component that renders exactly 5 skeleton rows matching the table's column count, using `animate-pulse` for the loading shimmer effect.

**When to use:** Replace all `if (isLoading && items.length === 0) return <div>Loading...</div>` patterns that precede a table.

**Design decision:** Render the table header + 5 skeleton rows inside the same `<table>` structure so the page doesn't shift when data loads. Skeleton rows use generic grey bars that approximate column content width.

```typescript
// src/components/ui/table-skeleton.tsx
interface TableSkeletonProps {
  columns: number;          // number of <td> columns to render
  rows?: number;            // defaults to 5 (locked decision)
}

export function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
          {Array.from({ length: columns }).map((_, j) => (
            <td key={j} className="px-4 py-2.5">
              <div className={`h-3.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse ${
                j === 0 ? "w-32" : j === columns - 1 ? "w-12" : "w-20"
              }`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
```

**Usage — inside existing table structure:**
```typescript
// Before:
if (isLoading && allAssets.length === 0) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <svg className="animate-spin h-4 w-4">...</svg>
      Loading assets...
    </div>
  );
}

// After — keep page structure, swap spinner for skeleton rows inside table:
<tbody>
  {isLoading && allAssets.length === 0 ? (
    <TableSkeleton columns={7} />
  ) : (
    allAssets.map(asset => <AssetRow key={asset.id} asset={asset} />)
  )}
</tbody>
```

**Important:** The kanban-style deals page is NOT a table — it uses a different loading approach. For the deals kanban, use a skeleton column grid (4 placeholder cards) rather than table rows.

### Pattern 3: PageHeader Component

**What:** Standardizes the title row at the top of every GP page. List pages get title only. Detail pages get breadcrumb + title. Both get an optional right-side actions slot.

**When to use:** Replace all ad-hoc `<h1>`/`<h2>` headings at the top of pages.

```typescript
// src/components/ui/page-header.tsx
interface BreadcrumbItem {
  label: string;
  href?: string;   // undefined for current page (no link)
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];   // only on detail pages
  actions?: React.ReactNode;        // right slot: buttons, search bars
}

export function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-xs text-gray-400 mb-1">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span>/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-gray-600 dark:hover:text-gray-300">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-600 dark:text-gray-300">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h1>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
```

**Standardized heading:** `text-lg font-bold text-gray-900 dark:text-gray-100` — this is what most pages already use; a few outliers use `text-xl` or `text-2xl` which will normalize.

### Pattern 4: SectionPanel Component

**What:** Wraps the existing white card pattern `bg-white rounded-xl border border-gray-200` into a reusable component with optional title and header actions.

**When to use:** Any section card/white box that groups related content.

```typescript
// src/components/ui/section-panel.tsx
interface SectionPanelProps {
  title?: string;
  headerRight?: React.ReactNode;    // optional right-side content in panel header
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;              // for tables that need edge-to-edge content
}

export function SectionPanel({ title, headerRight, children, className, noPadding }: SectionPanelProps) {
  const hasHeader = title || headerRight;
  return (
    <div className={cn(
      "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700",
      className
    )}>
      {hasHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          {title && <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>}
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "p-4"}>
        {children}
      </div>
    </div>
  );
}
```

**Note:** The `noPadding` prop is essential for table-bearing panels — tables need `overflow-hidden` and their own cell padding.

### Pattern 5: Formatter Consolidation in utils.ts

**What:** Promote `formatDate()`, `formatDateShort()`, and `formatRelativeTime()` from `pdf/shared-styles.ts` into `utils.ts`. Remove 4 duplicate local `formatCurrency()` definitions.

**Locations with duplicate formatCurrency (to remove):**
1. `src/components/features/accounting/trial-balance-view.tsx` line 66 — remove, import `fmt` from utils
2. `src/components/features/side-letters/side-letter-rules-panel.tsx` line 103 — remove, import `fmt` from utils
3. `src/components/features/deals/close-deal-modal.tsx` — has `formatCurrencyInput` (different: formats input fields) — KEEP as-is
4. `src/lib/ai-service.ts` line 106 — internal helper, convert to use `fmt` from utils
5. `src/lib/pdf/shared-styles.ts` — KEEP `formatCurrency` here (used by PDF tests), but also export the date functions from utils.ts

**Addition to utils.ts:**
```typescript
// src/lib/utils.ts — ADDITIONS (keep existing fmt/pct/cn unchanged)

// Canonical date formatter — "Mar 8, 2026"
export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

// Short date — "Mar 8" (no year, for same-year contexts)
export function formatDateShort(d: string | Date | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

// Relative time — for activity feeds only
export function formatRelativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return formatDate(isoStr);  // fall back to absolute for older items
}
```

**Migration strategy for `toLocaleDateString()` calls:** Replace ~25 raw `new Date(x).toLocaleDateString()` calls with `formatDate(x)`. These are in:
- `src/app/(gp)/settings/page.tsx` (3 calls)
- `src/app/(gp)/tasks/page.tsx` (2 calls)
- `src/app/(gp)/deals/page.tsx` (1 call)
- `src/app/(gp)/directory/page.tsx` (1 call)
- `src/app/(gp)/transactions/page.tsx` (4 calls)
- `src/app/(gp)/meetings/page.tsx` (2 calls)
- `src/app/(gp)/documents/page.tsx` (2 calls)
- `src/app/(gp)/assets/[id]/page.tsx` (2 calls)
- `src/components/features/deals/deal-overview-tab.tsx` (2 calls)
- `src/components/features/deals/deal-dd-tab.tsx` (4 calls)
- `src/components/features/deals/deal-documents-tab.tsx` (1 call)
- `src/components/features/deals/workstream-detail-panel.tsx` (2 calls)
- `src/components/features/deals/deal-closing-tab.tsx` (1 call)
- `src/components/features/deals/deal-ic-review-tab.tsx` (3 calls)
- `src/components/features/accounting/entity-accounting-tab.tsx` (1 call)

### Pattern 6: ConfirmDialog Migration

**ConfirmDialog component is ready** — no changes needed to the component itself. The work is replacing 7 `confirm()` call sites:

**Exact file locations:**
1. `src/app/(gp)/settings/page.tsx:177` — user role/status action confirm
2. `src/app/(gp)/settings/page.tsx:251` — delete decision structure confirm
3. `src/app/(gp)/settings/page.tsx:295` — remove user from structure confirm
4. `src/app/(gp)/entities/[id]/page.tsx:859` — mark distribution as paid confirm
5. `src/components/features/accounting/entity-accounting-tab.tsx:109` — disconnect QBO connection confirm
6. `src/components/features/settings/dd-category-editor.tsx:108` — delete DD category confirm
7. `src/components/features/settings/deal-pipeline-editor.tsx:199` — delete pipeline stage confirm

**Migration pattern for each site:**
```typescript
// Before:
if (!confirm("Delete decision structure? This cannot be undone.")) return;
await performDelete();

// After — add state for the dialog:
const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

// In the button handler:
setDeleteTarget(structureName);  // open the dialog

// In JSX:
<ConfirmDialog
  open={deleteTarget !== null}
  onClose={() => setDeleteTarget(null)}
  onConfirm={async () => {
    await performDelete(deleteTarget!);
    setDeleteTarget(null);
  }}
  title="Delete Decision Structure"
  message={`Delete "${deleteTarget}"? This cannot be undone.`}
  confirmLabel="Delete"
  variant="danger"
/>
```

**For inline `confirm()` that's inside JSX** (entities/[id]/page.tsx line 859 — inline button onClick):
The button needs to be converted to use a state-driven dialog instead of inline onClick + confirm.

### Anti-Patterns to Avoid

- **Don't use `if (isLoading) return <div>Loading...</div>`** — this causes the page to unmount/remount and loses scroll position. Instead, keep the page structure and render `<TableSkeleton>` inside `<tbody>`.
- **Don't add dark mode only to new components** — when touching an existing component to add skeleton/empty state, audit the whole component for missing `dark:` classes and fix them in the same PR.
- **Don't import `formatDate` from `pdf/shared-styles.ts` in UI code** — the PDF module has React-PDF-specific imports that will break in browser context. Only import from `utils.ts`.
- **Don't use `confirm()` inside async event handlers** — browsers suppress popups in async context. The ConfirmDialog pattern solves this correctly.
- **Don't create new formatCurrency() functions** — always use `fmt()` from `src/lib/utils.ts`.
- **Don't skip the `filtered` prop** on EmptyState — the distinction between true-empty (with CTA) and filtered-empty (with "Clear filters") is a locked UX decision.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirmation dialogs | Custom overlay/modal | ConfirmDialog (already exists) | Already handles keyboard, focus trap, danger variant, loading state |
| Date formatting | New date library or custom parser | Native `Intl.DateTimeFormat` via `formatDate()` in utils.ts | Zero dependency cost, already produces correct output |
| Icon library | Custom SVGs | Lucide React (already installed) | Consistent with command-bar; tree-shakes well |
| Theme handling | CSS-in-JS, class injection | Tailwind `dark:` prefix classes | ThemeProvider already adds `dark` to `<html>` |

**Key insight:** Every piece of this phase reuses existing infrastructure. The value is in building the 4 shared wrapper components and doing a disciplined migration sweep — not in introducing new technology.

---

## Common Pitfalls

### Pitfall 1: Breaking the Table Structure with Skeleton
**What goes wrong:** Replacing the `return <spinner>` early-return with an in-table skeleton, but forgetting to include the `<thead>` in the loading state causes layout shift.
**Why it happens:** The skeleton rows need to sit inside `<tbody>` with the same `<table>` and `<thead>` visible during load.
**How to avoid:** Render the full table structure (including `<thead>`) when `isLoading` — only the `<tbody>` content swaps between skeleton and real rows.
**Warning signs:** If columns snap/shift when data arrives, the header is being toggled.

### Pitfall 2: Dark Mode Missing on New Components
**What goes wrong:** New EmptyState, PageHeader, SectionPanel components look correct in light mode but have white-on-white or black-on-black issues in dark mode.
**Why it happens:** Developers forget `dark:` prefixes when writing new Tailwind classes.
**How to avoid:** Every light mode color class needs a paired `dark:` class. Test in dark mode immediately. The pattern: `text-gray-900 dark:text-gray-100`, `bg-white dark:bg-gray-900`, `border-gray-200 dark:border-gray-700`, `bg-gray-50 dark:bg-gray-800`.
**Warning signs:** Components that look fine in the default theme but break when toggling Settings → Dark mode.

### Pitfall 3: stat-card Missing Dark Mode
**What goes wrong:** StatCard component (`src/components/ui/stat-card.tsx`) has `bg-white` and `text-gray-900` but NO `dark:` classes. When new skeleton/empty states are added around stat cards, the inconsistency becomes glaring.
**Why it happens:** StatCard was built before full dark mode discipline.
**How to avoid:** Fix StatCard dark mode as part of this phase — it's a small change that should happen during the SectionPanel/PageHeader work.

### Pitfall 4: ConfirmDialog State in the Wrong Scope
**What goes wrong:** In settings/page.tsx with 3 separate `confirm()` calls, adding 3 separate dialog states causes a cluttered component.
**Why it happens:** Each confirm() was in its own handler, so developers add one state per handler.
**How to avoid:** Use a single generic `{ action, label }` state object that stores which action is pending, then a single ConfirmDialog that reads from it. Or use the pattern of `confirmTarget: { type: string, id: string, label: string } | null`.

### Pitfall 5: Date Timezone Off-by-One
**What goes wrong:** `new Date("2026-03-08")` (ISO date string without time) parses as UTC midnight, so in US timezones it displays as "Mar 7, 2026".
**Why it happens:** ISO date strings without a time component are parsed as UTC, not local time.
**How to avoid:** The existing `formatDate()` in `pdf/shared-styles.ts` handles Date objects correctly. When moving it to utils.ts, preserve the same approach. The existing tests in `pdf-format-helpers.test.ts` already document this — they pass `new Date(year, month, day)` (local time constructor) not ISO strings.
**Warning signs:** Dates consistently appearing one day earlier than expected.

### Pitfall 6: Inline confirm() Inside JSX onClick
**What goes wrong:** The entity page has `onClick={() => { if (confirm("...")) handleX(); }}` — this is inside JSX and harder to migrate than the standalone handler pattern.
**Why it happens:** It was a quick implementation shortcut.
**How to avoid:** Extract the inline onClick to a named handler function, then add the state-driven ConfirmDialog. Can't just wrap with ConfirmDialog without refactoring the onClick.

---

## Code Examples

### EmptyState in Practice — Assets Page

```typescript
// src/app/(gp)/assets/page.tsx (after migration)
const hasActiveFilters = Object.values(activeFilters).some(Boolean);
const isFiltered = !!(search || hasActiveFilters);

{allAssets.length === 0 && !isLoading ? (
  <EmptyState
    icon={<PackageIcon className="h-10 w-10" />}
    title={isFiltered ? "No results match your filters" : "No assets yet"}
    description={!isFiltered ? "Add your first asset to start tracking portfolio performance" : undefined}
    action={!isFiltered ? { label: "+ Add Asset", onClick: () => setShowCreate(true) } : undefined}
    filtered={isFiltered}
    onClearFilters={isFiltered ? () => { setSearch(""); setActiveFilters({}); } : undefined}
  />
) : (
  <table>...</table>
)}
```

### TableSkeleton in Practice — Entities Page

```typescript
// src/app/(gp)/entities/page.tsx (after migration)
// REMOVE the early return:
// if (isLoading && allEntities.length === 0) { return <div>Loading entities...</div>; }

// KEEP the full page rendering, skeleton inside table:
<table className="w-full text-xs">
  <thead>
    <tr className="bg-gray-50 dark:bg-gray-800 text-left text-gray-500">
      <th className="px-4 py-2.5">Name</th>
      <th className="px-4 py-2.5">Type</th>
      <th className="px-4 py-2.5">Vintage</th>
      <th className="px-4 py-2.5">Committed</th>
      <th className="px-4 py-2.5">Called</th>
      <th className="px-4 py-2.5">NAV</th>
      <th className="px-4 py-2.5">Status</th>
    </tr>
  </thead>
  <tbody>
    {isLoading && allEntities.length === 0 ? (
      <TableSkeleton columns={7} />
    ) : (
      allEntities.map(entity => <EntityRow key={entity.id} entity={entity} />)
    )}
  </tbody>
</table>
```

### ConfirmDialog Pattern — Settings Page

```typescript
// src/app/(gp)/settings/page.tsx (after migration)
// Replace 3 separate confirm() calls with one unified dialog state

type ConfirmAction = {
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
} | null;

const [pendingAction, setPendingAction] = useState<ConfirmAction>(null);
const [confirming, setConfirming] = useState(false);

// Replace: if (!confirm(`Delete "${name}"?`)) return;
// With:
setPendingAction({
  title: "Delete Decision Structure",
  message: `Delete "${name}"? This cannot be undone.`,
  onConfirm: async () => { await performDelete(name); },
});

// In JSX:
<ConfirmDialog
  open={pendingAction !== null}
  onClose={() => setPendingAction(null)}
  onConfirm={async () => {
    setConfirming(true);
    await pendingAction!.onConfirm();
    setConfirming(false);
    setPendingAction(null);
  }}
  title={pendingAction?.title ?? ""}
  message={pendingAction?.message ?? ""}
  confirmLabel="Confirm"
  variant="danger"
  loading={confirming}
/>
```

### Formatter Migration Pattern

```typescript
// Before (in any page):
{new Date(task.dueDate).toLocaleDateString()}

// After:
import { formatDate } from "@/lib/utils";
{formatDate(task.dueDate)}

// Before (removing local duplicate):
function formatCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// After (delete the local function, import from utils):
import { fmt } from "@/lib/utils";
// Replace: formatCurrency(value) → fmt(value)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Spinner div full-page replacement | Skeleton rows inside table | Phase 11 | Page structure stays stable; no layout shift; looks professional |
| Browser `confirm()` | ConfirmDialog component | Phase 11 | Consistent styling, supports loading state, works in async handlers |
| Ad-hoc empty div with inline copy | EmptyState component | Phase 11 | Consistent UX; true-empty vs filtered-empty distinction enforced |
| Mixed date formatting (25+ patterns) | `formatDate()` from utils.ts | Phase 11 | Single source; "Mar 8, 2026" everywhere |
| Multiple local `formatCurrency()` copies | `fmt()` from utils.ts | Phase 11 | Already canonical; just remove the duplicates |

**Deprecated/outdated (after this phase):**
- `window.confirm()` / `confirm()` calls: replaced by ConfirmDialog
- `new Date(x).toLocaleDateString()` without options: replaced by `formatDate(x)`
- Inline spinner SVG as full-page loading state: replaced by TableSkeleton inside table
- "Loading assets..." / "Loading entities..." text: replaced by skeleton rows

---

## Open Questions

1. **Deals page skeleton — kanban vs table**
   - What we know: deals page uses a kanban board (4 columns), not a table. The current loading state is a spinner.
   - What's unclear: should the skeleton mimic 4 kanban columns with placeholder cards, or is a centered spinner acceptable here since there's no table structure to preserve?
   - Recommendation: Use a skeleton kanban grid (4 columns × 3 placeholder cards each, animate-pulse) — stays consistent with the "no spinner text" principle.

2. **PageHeader adoption depth**
   - What we know: ~30 GP pages need to be audited. Not all use the same heading pattern.
   - What's unclear: detail pages (deals/[id], entities/[id], assets/[id]) have complex headers with status badges, action menus — PageHeader may not be appropriate for all of them without significant refactor.
   - Recommendation: Apply PageHeader to list pages first (clean, straightforward). For detail pages, apply only where the breadcrumb + title portion is cleanly separable. Skip detail pages where the header is deeply integrated with status/actions.

3. **stat-card dark mode fix**
   - What we know: StatCard has no `dark:` classes; it's used across many pages.
   - What's unclear: is fixing stat-card in scope for Phase 11 (FOUND-08 says "all new and modified components have dark: variants")?
   - Recommendation: Yes — fix it. StatCard is used on the same pages we're modifying. It's a 4-line change.

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/lib/__tests__/foundation.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | EmptyState renders with CTA for true-empty, "Clear filters" for filtered | unit | `npx vitest run src/lib/__tests__/foundation.test.ts` | ❌ Wave 0 |
| FOUND-02 | TableSkeleton renders exactly 5 rows × N columns | unit | `npx vitest run src/lib/__tests__/foundation.test.ts` | ❌ Wave 0 |
| FOUND-03 | No `confirm(` calls in src/ (grep assertion) | unit | `npx vitest run src/lib/__tests__/foundation.test.ts` | ❌ Wave 0 |
| FOUND-04 | PageHeader renders breadcrumbs on detail pages, title-only on list pages | unit | `npx vitest run src/lib/__tests__/foundation.test.ts` | ❌ Wave 0 |
| FOUND-05 | SectionPanel renders with/without header | unit | `npx vitest run src/lib/__tests__/foundation.test.ts` | ❌ Wave 0 |
| FOUND-06 | `formatDate()` from utils.ts outputs "Mar 8, 2026" format | unit | `npx vitest run src/lib/__tests__/foundation.test.ts` | ❌ Wave 0 |
| FOUND-07 | `fmt()` handles null/undefined gracefully; no duplicate formatCurrency in non-pdf files | unit | `npx vitest run src/lib/__tests__/foundation.test.ts` | ❌ Wave 0 |
| FOUND-08 | (manual) dark mode visual check — not automatable | manual-only | Toggle Settings → Dark Mode, audit all 4 new components | N/A |

**Note on FOUND-03:** A vitest unit test can use `fs.readFileSync` + regex to assert no `confirm(` calls exist outside of test files — this is a fast grep-as-test pattern that catches regressions.

**Note on FOUND-08:** Dark mode parity is a visual concern and cannot be meaningfully automated in the node test environment. Manual verification is the gate.

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/__tests__/foundation.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/foundation.test.ts` — covers FOUND-01 through FOUND-07 (unit tests for new components and formatters)
- [ ] Framework already installed — no install step needed

*(Existing `pdf-format-helpers.test.ts` covers the existing `formatDate` in pdf/shared-styles.ts — these tests do NOT need to change. The new tests in `foundation.test.ts` cover the new `formatDate` export from utils.ts.)*

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all findings verified by reading actual source files
- `src/components/ui/confirm-dialog.tsx` — confirmed component exists with danger variant and loading prop
- `src/lib/utils.ts` — confirmed fmt/pct/cn are the canonical formatters
- `src/lib/pdf/shared-styles.ts` — confirmed formatDate/formatCurrency implementations
- `src/app/globals.css` — confirmed Tailwind 4 + class-based dark mode setup
- `package.json` — confirmed lucide-react@^0.575.0 installed, no date-fns/dayjs/moment
- `vitest.config.ts` — confirmed vitest 4 with node environment and @/ alias

### Secondary (MEDIUM confidence)
- Tailwind CSS 4 `animate-pulse` — standard utility, confirmed in dashboard skeleton usage
- Lucide React — confirmed in command-bar imports; same version installed for icon use in empty states

### Tertiary (LOW confidence)
- None — all claims are verified from source code

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all verified from package.json and source imports
- Architecture: HIGH — all component designs based on existing patterns in the codebase
- Pitfalls: HIGH — all identified from reading actual code; timezone pitfall documented in existing test comments
- Migration scope: HIGH — exact file:line locations verified by grep

**Research date:** 2026-03-09
**Valid until:** This research is code-specific, not library-version-specific. Remains valid until codebase changes significantly.
