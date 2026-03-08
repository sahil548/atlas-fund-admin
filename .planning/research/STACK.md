# Stack Research

**Domain:** Family office operating system — UI/UX polish, module-level feature completion
**Researched:** 2026-03-08
**Confidence:** MEDIUM (web tools unavailable; based on training data through August 2025 + installed package.json verification)

---

## Context: What This Milestone Is NOT

This is a polish and feature-gap milestone, not a rewrite. The existing stack is locked:

- Next.js 16, React 19, Tailwind CSS 4, Prisma 7, PostgreSQL
- Clerk 7, SWR 2, Zod 4, Recharts 3
- lucide-react 0.575.0 (confirmed installed)
- tailwindcss 4.2.1 (confirmed installed)

No replacements. No component library swaps. Additions only, and only where raw Tailwind has genuine gaps.

---

## Recommended Stack Additions

### Animation

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `motion` (formerly framer-motion) | ^11.x | Micro-interactions, skeleton shimmer, modal/drawer transitions, list item enter/exit | Framer-motion v11 ships as the `motion` package. It is the React animation standard with explicit React 19 support added in 2024. Pure CSS transitions cover 80% of needs; `motion` covers the remaining 20% where coordinated animate-in sequences and exit animations are required (kanban drag, modal stack, empty state illustrations). |

**Caveat — version pinning required:** Framer-motion/motion has a history of breaking changes between minor versions. Pin to `^11.x` and verify peer dependency on `react: ^19` before installing. Check `peerDependencies` in the published package.json on npm before adding.

**What Tailwind CSS 4 alone handles (no motion library needed):**
- Hover/focus state transitions (`transition-colors duration-150`)
- Loading spinner (`animate-spin`)
- Opacity fade (`transition-opacity`)
- Simple slide-in (`transition-transform translate-x-0`)

**What needs `motion`:**
- Staggered list item entrance (deal pipeline rows, asset table rows loading in sequence)
- Coordinated modal enter + backdrop fade (not achievable with pure CSS exit animations in React without unmount detection)
- Skeleton pulse shimmer (`animate-pulse` in Tailwind is sufficient; skip motion for this case)
- Kanban card drag-to-reorder visual feedback

### Accessible Primitives

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@radix-ui/react-select` | ^2.x | Accessible dropdown select replacing raw `<select>` | The existing `<Select>` component is a raw HTML `<select>`. In a financial app used by GPs reading dense data, a styled, keyboard-navigable, ARIA-correct select is the single highest-impact accessibility fix. Radix provides the behavior; you style it entirely with Tailwind. Zero conflict with existing stack. |
| `@radix-ui/react-tooltip` | ^1.x | Hover tooltips for icon-only buttons, truncated values, metric explanations | Financial dashboards have many numbers that need context. Radix Tooltip is WAI-ARIA Tooltip role compliant, handles positioning automatically, and requires no CSS setup beyond Tailwind. The existing codebase has no tooltip primitive — this fills that gap. |
| `@radix-ui/react-dropdown-menu` | ^2.x | Action menus (table row "..." menus, bulk actions) | The table row action pattern (Edit / Delete / Archive) currently likely uses inline buttons or no menu at all. Radix DropdownMenu provides keyboard navigation, proper ARIA, and focus trap — all with Tailwind styling. |
| `@radix-ui/react-popover` | ^1.x | Inline filter panels, date range pickers, bulk-action menus triggered by buttons | Popovers are needed in data tables (column filters) and forms (date pickers). Radix handles portal rendering, positioning, and focus management correctly. |

**Why Radix specifically and not Headless UI:**
Headless UI (by Tailwind Labs) only supports React 18+; as of my training cutoff it had not confirmed React 19 support, whereas Radix v2 explicitly supports React 18 and 19. Both are headless. Radix has a larger primitive library and more active maintenance.

**Why NOT Radix Themes or shadcn/ui:**
Radix Themes and shadcn/ui ship with their own design tokens that conflict with the existing custom Tailwind design. Install individual `@radix-ui/react-*` primitives only. These slot into the existing UI component pattern (custom-styled, Tailwind-only).

### Form Handling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `react-hook-form` | ^7.x | Multi-field modal forms, complex validation chains, field arrays (distribution line items, waterfall tiers) | The existing form pattern is `useState` + manual validation. This works for 2-3 field modals but breaks down at complex forms (capital call with LP line items, waterfall tier builder with N tiers). React Hook Form 7 is fully compatible with React 19 and Zod 4 via `@hookform/resolvers`. It eliminates controlled re-renders on every keystroke, which matters on modals with 10+ fields. |
| `@hookform/resolvers` | ^3.x | Zod 4 resolver for react-hook-form | Bridges existing Zod 4 schemas to react-hook-form's validation. Zero schema duplication — the same Zod schema used for API validation drives form validation. |

**When NOT to use react-hook-form:** Simple 2-3 field modals that already work fine with `useState`. Only adopt for forms with 5+ fields, field arrays, or multi-step wizards. Do not refactor existing working forms unless they have UX problems.

### Data Tables

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@tanstack/react-table` | ^8.x | Sortable, filterable, column-hiding tables for assets, deals pipeline list view, transactions, LP capital accounts | TanStack Table v8 is headless — it provides sorting/filtering/pagination logic; you render the HTML with Tailwind. It integrates cleanly with SWR (feed `data` directly as `tableData`). The existing tables are likely custom HTML tables with no sort or filter. For the assets table, transactions table, and LP capital account statement this is a significant UX improvement. |

**When NOT to use TanStack Table:** Simple read-only 3-column lists (document lists, activity feeds, notification lists). Only adopt for tables where users need to sort, filter, or manage many rows.

**What TanStack Table does NOT replace:** Recharts stays for charting. The kanban pipeline stays as a custom drag component.

### Utility Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | ^3.x | Date formatting, relative time ("3 days ago"), date arithmetic for capital calls | The existing stack has no date library. `date-fns` v3 is tree-shakeable, TypeScript-native, and has no Intl dependency issues. Use for formatting dates consistently across all modules. Do NOT use `moment.js` (deprecated, 65KB). |
| `clsx` | ^2.x | Conditional class merging | The existing `cn()` utility in `src/lib/utils.ts` likely wraps `clsx` or `tailwind-merge` already. If not, add `clsx` + `tailwind-merge` as the standard pattern. Check first — may already be present indirectly. |

---

## Supporting Libraries (Already Installed — Use More)

These are already in `package.json` and are underutilized relative to their capabilities:

| Library | Currently Used For | Also Use For |
|---------|-------------------|-------------|
| `lucide-react` 0.575.0 | Navigation icons | Empty state illustrations (large icons in `w-16 h-16 text-gray-300`), loading states, inline status indicators |
| `recharts` 3.7.0 | Dashboard charts | LP portal time-series, capital account waterfall bar chart, deal pipeline funnel |
| `zod` 4.3.6 | API validation | Form validation (via hookform/resolvers), client-side type narrowing |

---

## Installation

```bash
# Animation (install only if shipping animated transitions)
npm install motion

# Accessible primitives (install only the ones you use)
npm install @radix-ui/react-select @radix-ui/react-tooltip @radix-ui/react-dropdown-menu @radix-ui/react-popover

# Form handling (install only if refactoring multi-field forms)
npm install react-hook-form @hookform/resolvers

# Data tables (install only if adding sort/filter to tables)
npm install @tanstack/react-table

# Date formatting
npm install date-fns
```

No dev-only dependencies needed from this list. All are runtime dependencies.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `motion` (framer-motion v11) | Pure CSS Tailwind transitions | For 80% of polish needs, Tailwind is sufficient. Only reach for `motion` when you need staggered sequences or exit animations tied to React unmounting |
| `@radix-ui/react-select` | Raw `<select>` HTML | Never for a production financial app — keyboard navigation and accessibility are not optional |
| `@radix-ui/react-*` primitives | `@headlessui/react` | If React 19 support is confirmed for Headless UI, either works. Radix has more primitives and confirmed React 19 support |
| `react-hook-form` | Zustand form state | RHF is purpose-built for forms with native validation integration; Zustand is general state management — wrong tool |
| `@tanstack/react-table` | Custom table with useState sort | Custom works for small, static tables. TanStack is better once you need multi-column sort, column visibility, or server-side pagination |
| `date-fns` | `dayjs` | Both are fine. `date-fns` v3 is tree-shakeable and TypeScript-first; `dayjs` is smaller but requires plugins for TypeScript types |
| `date-fns` | `moment.js` | Never. Moment is deprecated and ships 300KB+ |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `shadcn/ui` (full install) | Generates files with Radix Themes design tokens that conflict with existing Tailwind design. Creates a parallel component system that diverges from the existing `src/components/ui/` pattern | Install individual `@radix-ui/react-*` primitives and style with existing Tailwind patterns |
| `@radix-ui/themes` | Ships its own CSS layer with design tokens that override Tailwind. The existing app has a working, consistent Tailwind design — do not introduce a second CSS system | Use unstyled Radix primitives only |
| `MUI` / `Chakra UI` / `Mantine` | All ship with their own theming systems. Would require a full design rewrite to integrate. The question explicitly says do not suggest replacing Tailwind | Continue with Tailwind + headless primitives |
| `react-beautiful-dnd` | Deprecated by the maintainer (Atlassian) as of 2023. Not maintained | `@dnd-kit/core` if drag-and-drop is needed (kanban reordering) |
| `Axios` | Redundant. Next.js 16 App Router fetch is fully capable; SWR already handles caching | Existing `fetch` + SWR pattern |
| `react-query` / `TanStack Query` | Redundant with SWR 2 already installed. Mixing two data-fetching libraries creates confusion | SWR 2 (already installed) |
| `zustand` | No need for global form state at Atlas's scale (3 GP users). SWR handles server state; local `useState` handles UI state | Existing SWR + useState pattern |
| `@testing-library/react` + Vitest | The project has no tests by design and Vitest is dev-only. Do not introduce test infrastructure during a polish milestone | `npm run build` TypeScript checking (existing pattern) |

---

## Stack Patterns by Variant

**If the form has 5+ fields or field arrays (capital calls, waterfall tiers, deal creation wizard):**
- Use react-hook-form + @hookform/resolvers
- Reuse existing Zod schemas from `src/lib/schemas.ts` as the resolver
- Keep the existing `<FormField>`, `<Input>`, `<Select>` UI components — RHF wraps them via `register` or `Controller`

**If the form has 2-4 fields in a simple modal (add note, rename entity, set valuation):**
- Keep existing `useState` + inline validation pattern
- No need for RHF overhead

**If a table needs sort/filter (assets, transactions, LP capital account):**
- Use `@tanstack/react-table` v8 for logic
- Keep existing Tailwind table markup (`<table className="w-full text-sm">`) for the visual layer
- Feed table from existing SWR data (no SWR changes needed)

**If adding animated list entrance or exit:**
- Use `motion` from `framer-motion` package
- Wrap list container with `<AnimatePresence>` and items with `<motion.div>`
- Use `initial={{ opacity: 0, y: 4 }}` + `animate={{ opacity: 1, y: 0 }}` + `transition={{ duration: 0.15 }}`
- Keep durations under 200ms — financial dashboards should feel fast, not playful

**If adding tooltips to icon buttons or metric labels:**
- Use `@radix-ui/react-tooltip` wrapped in a thin `<Tooltip content="...">` component
- Add to `src/components/ui/tooltip.tsx`
- Style with Tailwind: `bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg`

**If building a dropdown action menu (table row "..." button):**
- Use `@radix-ui/react-dropdown-menu`
- Add to `src/components/ui/dropdown-menu.tsx`
- Style with Tailwind, matching existing `bg-white border border-gray-200 rounded-lg shadow-lg` modal chrome

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `motion` (framer-motion v11) | React 19.x | React 19 support added in framer-motion v11.0. Verify `peerDependencies` on npm before install — the package was reorganized in 2024. |
| `@radix-ui/react-*` v2.x | React 18 + React 19 | Radix v2 supports React 19. Radix v1 may have React 19 incompatibilities with concurrent features. |
| `react-hook-form` v7.x | React 19.x | RHF v7.51+ adds React 19 compatibility. Versions below 7.51 have known issues with React 19 `ref` handling. Install latest 7.x. |
| `@hookform/resolvers` v3.x | Zod 4.x | `@hookform/resolvers` v3.9+ supports Zod 4. Earlier v3 versions support Zod 3 only. Install `@hookform/resolvers@^3.9`. |
| `@tanstack/react-table` v8.x | React 19.x | Framework-agnostic core. React adapter fully supports React 19. |
| `date-fns` v3.x | TypeScript 5.x | v3 is TypeScript-first. No config needed. |
| tailwindcss 4.2.1 | `motion` CSS | Tailwind 4 and motion animations do not conflict. Both are additive. |

---

## Tailwind CSS 4 Polish Patterns (No New Libraries)

These patterns use only the already-installed Tailwind 4.2.1 and should be standardized across all modules:

### Loading Skeletons
```tsx
// Standard skeleton block — use instead of spinning loaders for table rows
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
</div>
```

### Empty States
```tsx
// Standard empty state — center-aligned, icon + message + CTA
<div className="flex flex-col items-center justify-center py-16 text-center">
  <Icon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No [items] yet</p>
  <p className="text-xs text-gray-500 mt-1">Get started by [action]</p>
  <Button variant="primary" className="mt-4">Add [Item]</Button>
</div>
```

### Focus Rings (Accessibility)
```tsx
// Add to all interactive elements — Tailwind 4 focus-visible utility
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
```

### Responsive Table (Mobile-First)
```tsx
// Wrap all data tables in a horizontal scroll container
<div className="overflow-x-auto -mx-4 sm:mx-0">
  <table className="min-w-full ...">
```

### Transition Defaults
```tsx
// Standard hover transition — add to all interactive cards, buttons, rows
className="transition-colors duration-150 ease-in-out"
```

---

## Sources

- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/package.json` — Confirmed installed packages and versions (HIGH confidence)
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/node_modules/tailwindcss/package.json` — Tailwind 4.2.1 confirmed (HIGH confidence)
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/node_modules/lucide-react/package.json` — lucide-react 0.575.0, React 19 peer dep confirmed (HIGH confidence)
- `.planning/PROJECT.md` — Stack decisions, constraints, out-of-scope items (HIGH confidence)
- `.planning/AUDIT.md` — Known gaps: no tooltips, no skeletons, no accessible selects, no empty states (HIGH confidence)
- `.planning/UI-GUIDE.md` — Existing component inventory; confirmed no Radix, no RHF, no TanStack Table (HIGH confidence)
- Training data through August 2025 — framer-motion v11 React 19 support, Radix v2 React 19 support, RHF v7.51+ React 19 fix, @hookform/resolvers Zod 4 support (MEDIUM confidence — verify versions before install)

---

*Stack research for: Atlas v1.1 — UI/UX polish and feature gap closure*
*Researched: 2026-03-08*
