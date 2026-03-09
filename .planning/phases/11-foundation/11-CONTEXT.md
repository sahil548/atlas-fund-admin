# Phase 11: Foundation - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Standardize shared components across all ~30 GP pages — every page uses consistent empty states, loading skeletons, confirm dialogs, page headers, section wrappers, and date/currency formatting. No blank loading states, no browser confirm() dialogs, no inconsistent formatting. Dark mode parity on all new/modified components.

</domain>

<decisions>
## Implementation Decisions

### Empty State Design
- Friendly & guiding tone — illustration/icon + warm copy like "No deals yet — create your first deal to get started"
- CTA buttons only when actionable — show "+ Create Deal" on list pages, but filtered-empty states just show message
- Distinct messaging for true-empty vs filtered-empty — true-empty: friendly guide + CTA; filtered-empty: "No results match your filters" + "Clear filters" link
- Same EmptyState component handles both variants through props, but with different copy

### Loading Skeleton Style
- Fixed 5 skeleton rows for data tables during load — predictable, prevents layout shift
- Pulse animation (`animate-pulse`) — already used on dashboard, stays consistent with existing Tailwind patterns
- Claude's Discretion: skeleton row design (whether to mimic exact table columns), detail page loading approach (full page skeleton vs centered spinner based on page complexity), and shimmer vs pulse for non-table contexts

### Page Header & Section Structure
- Breadcrumbs on detail pages only — list pages show title only, detail pages show "Deals > Acme Corp" trail
- Built-in actions slot — PageHeader component includes right-side slot for action buttons (+ Create Deal) and search bars, guaranteeing consistent alignment
- Claude's Discretion: subtitle pattern per page (count, description, or none), section card variant strategy (single SectionPanel vs variants for stats/alerts)

### Confirm Dialog Migration
- ConfirmDialog component already exists (`src/components/ui/confirm-dialog.tsx`) with danger variant
- Migrate all browser `confirm()` calls to ConfirmDialog — found in ~10 files (entities, settings, deals, accounting)
- Every destructive action must use ConfirmDialog with confirmation text
- Claude's Discretion: exact confirmation copy per action, whether to require typing to confirm for high-risk actions

### Date Format Standard
- Standard format: "Mar 8, 2026" (short month name) — matches existing PDF formatters, compact and unambiguous
- Context-dependent relative time: activity feeds and notifications use relative ("3h ago", "yesterday"); tables and detail pages always use absolute dates
- Claude's Discretion: time display pattern (date-only by default with time on hover, or show time for same-day items), library choice (date-fns vs native Intl.DateTimeFormat based on formatting complexity)

### Currency/Number Format Consolidation
- `fmt()` and `pct()` in `src/lib/utils.ts` are the canonical formatters — already used across 80+ files
- Remove duplicate `formatCurrency()` definitions (found in trial-balance-view.tsx and pdf/shared-styles.ts)
- Consolidate into single source of truth in utils.ts
- Claude's Discretion: whether to add additional formatter variants (e.g., full precision for detail views vs abbreviated for tables)

### Claude's Discretion
- Icon choice for empty states (Lucide icons vs custom SVG — lean toward Lucide for consistency with existing icon set)
- Detail page loading approach per page type
- SectionPanel variant strategy
- Exact skeleton row column structure per table
- Whether to adopt date-fns or use native Intl.DateTimeFormat
- Dark mode adjustments for new components (follow existing `dark:` pattern)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **ConfirmDialog** (`src/components/ui/confirm-dialog.tsx`): Wraps Modal, supports `variant: "danger"`, has loading state — ready to replace all browser `confirm()` calls
- **StatCard** (`src/components/ui/stat-card.tsx`): Pre-styled stats container with label, value, sub, trend props
- **fmt() / pct()** (`src/lib/utils.ts`): Currency and percentage formatters used across 80+ files — canonical source
- **ThemeProvider** (`src/components/providers/theme-provider.tsx`): System/light/dark theme with localStorage persistence
- **Badge** (`src/components/ui/badge.tsx`): 9 color variants with full dark mode support
- **Modal** (`src/components/ui/modal.tsx`): Base modal with dark mode styles
- **LoadMoreButton** (`src/components/ui/load-more-button.tsx`): Existing loading button pattern with spinner

### Established Patterns
- **White card pattern**: `bg-white rounded-xl border border-gray-200` used consistently as section wrapper
- **Dark mode**: `dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100` pattern across all UI components
- **Tailwind class-based dark mode**: ThemeProvider adds `dark` class to `<html>`, all components use `dark:` prefix
- **Spacing**: `space-y-4` / `space-y-5` / `space-y-6` for page-level vertical rhythm (inconsistent — needs standardization)
- **Typography**: Mix of `text-sm font-semibold` and `text-base font-semibold` for headings (needs standardization)

### Integration Points
- **~10 files with browser confirm()**: entities/[id]/page, settings/page, deals pages, accounting pages — all need migration
- **All list pages**: deals, assets, entities, transactions, contacts, tasks — need EmptyState component
- **All data tables**: need Skeleton loading rows replacing "Loading..." text
- **All page headers**: need PageHeader component replacing ad-hoc title/subtitle patterns
- **PDF formatters** (`src/lib/pdf/shared-styles.ts`): formatDate already outputs "Mar 8, 2026" — can serve as reference for UI formatter

</code_context>

<specifics>
## Specific Ideas

No specific references — open to standard approaches. Key principle: the app should feel like Linear (clean, professional) with friendly empty states that guide users to their first action.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-foundation*
*Context gathered: 2026-03-09*
