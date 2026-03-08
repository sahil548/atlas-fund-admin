# Project Research Summary

**Project:** Atlas — Family Office Operating System
**Domain:** Fund administration platform — GP operating system covering deal pipeline, asset management, LP relations, accounting, capital activity, and entity management
**Researched:** 2026-03-08
**Confidence:** HIGH (architecture, features, pitfalls derived from direct codebase audit; stack additions at MEDIUM due to version verification against training data)

## Executive Summary

Atlas v1.1 is a polish-and-feature-gap milestone, not a rewrite. The platform has ~80-90% of its core infrastructure built across 9 modules — 57 Prisma models, 73 API routes, 33 pages, and a well-established set of architectural patterns. The research consensus is clear: the primary work is closing workflow gaps that would frustrate real users on day one (missing status advancement buttons, no asset exit flow, no loading skeletons, absent empty states) and enforcing consistency across patterns the codebase already has but doesn't apply uniformly (ConfirmDialog instead of browser `confirm()`, SectionErrorBoundary coverage, FormField usage, dark mode parity).

The recommended approach is a tiered execution order that mirrors architectural dependencies: shared component standardization first, then core GP workflows (Deals, Assets, Entities), then capital and financial modules (Transactions, LP Portal), then supporting modules (Accounting, Reports, Settings). This order matters because shared primitive changes ripple across all 30 pages — doing foundation work first means every subsequent module benefits from it immediately. The stack additions are narrow and purposeful: Radix UI headless primitives for accessibility gaps, TanStack Table for sortable/filterable data tables, react-hook-form for complex multi-field forms, date-fns for consistent date formatting, and optionally `motion` for coordinated enter/exit animations.

The top risks are not architectural — they are operational. The most dangerous pitfalls are: (1) SWR cache key mismatches causing silent stale-data bugs after any new mutation, (2) missing `"use client"` directives causing silent hook failures on new component files, (3) toast crashes from unguarded Zod validation objects, (4) shared component changes that visually break all other modules without test coverage to catch it, and (5) schema changes accidentally applied to the production database. Every phase must include explicit mitigation steps for these patterns. The platform has no automated tests, which makes visual verification discipline and the post-change checklist in CLAUDE.md the sole regression-prevention mechanism.

## Key Findings

### Recommended Stack

The existing stack is locked (Next.js 16, React 19, Tailwind CSS 4, Prisma 7, PostgreSQL, Clerk 7, SWR 2, Zod 4, Recharts 3). No replacements or swaps. Additions are justified only where raw Tailwind or existing libraries have genuine gaps. The installation surface should stay minimal — install only the libraries actively used in the current phase.

**Core technology additions:**
- `@radix-ui/react-select`, `@radix-ui/react-tooltip`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-popover`: Accessible headless primitives to replace raw HTML elements — Radix v2 explicitly supports React 19 where Headless UI does not. Install individual primitives only; never Radix Themes or shadcn/ui (they import conflicting CSS layers).
- `@tanstack/react-table` v8: Headless table logic for sortable/filterable tables (assets, transactions, capital accounts). Feeds directly from SWR data; no changes to existing fetch patterns. Only for tables needing sort/filter/pagination.
- `react-hook-form` v7 + `@hookform/resolvers` v3.9: For forms with 5+ fields or field arrays (capital calls with LP line items, waterfall tier builder). Reuses existing Zod schemas via resolver. Do not refactor working 2-3 field forms.
- `date-fns` v3: Tree-shakeable, TypeScript-native date formatting. Fills a genuine gap — the codebase has no date library today. Replaces ad-hoc `toLocaleDateString()` calls.
- `motion` (framer-motion v11): For staggered list entrance animations and coordinated modal enter/exit. Tailwind `animate-pulse` handles skeletons; `motion` is only needed for exit animations tied to React unmounting and staggered sequences.
- Already installed, use more: `lucide-react` for empty state illustrations (large icons), `recharts` for LP portal time-series and capital account waterfall charts, `zod` via hookform/resolvers for form validation.

### Expected Features

Full module-by-module analysis was conducted against the actual codebase (57 models, 73 routes, 33 pages). The findings distinguish what is verifiably built, what appears built but needs verification, and what is genuinely absent.

**Must have — P1 (fix before real-user adoption):**
- Capital call status advancement buttons (Mark as Issued / Mark as Funded) — likely missing from UI despite model support
- Distribution approval + mark-paid buttons — DRAFT → APPROVED → PAID flow may not have explicit UI controls
- Asset exit workflow — no modal or form found for recording exit date, exit proceeds, final MOIC; AssetStatus enum has EXITED but no guided flow
- Deal age / days-in-stage metric on kanban cards — computed field only, no display
- Deal → Asset navigation link on closed deal pages ("View Asset")
- Empty states with actionable CTAs on all list pages
- Loading skeletons replacing "Loading..." text on major tables
- Overdue capital call visual indicator in the capital activity view
- LP document center — category filter (K-1s, financial statements, notices)
- LP capital account — period/date range picker for statement generation

**Should have — P2 (strong polish pass):**
- Deal kanban stage totals (count + aggregate deal value per column)
- IC memo PDF export
- Dead deal reason capture and surfacing in pipeline analytics
- Asset list column sorting
- Holding type–adaptive asset detail UI (LP positions showing same controls as direct assets is incorrect)
- Covenant portfolio-level breach monitor across all assets
- Lease expiry forward visibility (90/180 days)
- Entity parent-child hierarchy on entity list
- Report preview before download
- Unified integrations status page (all 7 integrations with green/red status)
- GP notification preferences (GP team receives capital call and distribution alerts)
- Dashboard deal pipeline summary section
- Dashboard "needs attention" alerts section (overdue calls, covenant breaches)

**Defer to v2+:**
- Real QBO OAuth (high engineering investment; until live, accounting module is decorative)
- Distribution notice PDF generation
- Bulk report generation at quarter-end
- Report delivery to LP email list
- Bi-directional Asana task sync
- AI quarterly narrative draft
- Fundraising pipeline end-to-end workflow

### Architecture Approach

Atlas uses a well-established three-tier architecture that should not change during v1.1: Next.js App Router page components own all local state and SWR fetches, feature components in `components/features/` handle their own mutations and call `mutate()` to revalidate, and API route handlers use `parseBody()` + Zod + Prisma with `firmId` scoping on every query. The GP portal (`/(gp)/`, 25 pages) and LP portal (`/(lp)/`, 5 pages, strictly read-only) are cleanly separated. All fire-and-forget side effects (audit logging, LP notifications, NAV snapshots) happen inside API routes without blocking the response.

**Major components and responsibilities:**
1. `app/(gp)/**/page.tsx` — GP page shells: SWR fetch, tab state, modal state, filter state. Accept that some pages are long (settings/page.tsx is 940 lines) — extract only when a tab exceeds ~200 lines into its own feature component.
2. `components/features/*/*.tsx` — Domain-specific forms, panels, tabs. Receive props from page, fire mutations internally, call `mutate()` to revalidate. Never read `firmId` directly — receive it via props from the page.
3. `components/ui/*.tsx` — 19 stateless primitives. Treat changes here as breaking changes; spot-check all 30 pages after any modification.
4. `lib/computations/` — Pure financial calculation engines (IRR, waterfall, capital accounts). No Prisma calls inside; keep them pure.
5. `lib/routes.ts` — Single source of truth for all routes. Every new page must be registered here to appear in the sidebar, command bar, and AI routing prompt.

**New shared components needed before module polish begins:**
- `LoadingState` — replaces copy-pasted spinning SVG
- `SkeletonRow` / `SkeletonCard` — replaces blank-on-load tables and cards
- `PageHeader` — section title + subtitle pattern appearing on 8+ pages
- `SectionPanel` — white card wrapper appearing everywhere inline
- `HoldingTypeAdaptivePanel` — renders different asset controls based on `asset.holdingType`

### Critical Pitfalls

10 critical pitfalls were identified from direct codebase analysis. The top 5 with highest production impact:

1. **SWR cache key mismatch after mutations** — The most common silent bug. A new mutation revalidates the wrong SWR key (e.g., `/api/capital-calls` vs. `/api/capital-calls?firmId=${firmId}`). The action succeeds but the list never updates. Prevention: grep for the exact SWR key before writing any `mutate()` call; keys must be byte-identical including all query parameters.

2. **Missing `"use client"` directive on new component files** — Next.js 16 App Router defaults to Server Components. Hooks (`useState`, `useSWR`, `useToast`, `useFirm`) silently fail — the component renders but nothing works. TypeScript does not catch this. Prevention: first line of every new component file that uses any hook must be `"use client"`.

3. **Toast crash from unguarded Zod validation objects** — Passing `data.error` directly to `toast.error()` when the API returns a Zod validation error object causes a full-page white screen. Prevention: always `typeof data.error === "string" ? data.error : "Operation failed"` before calling toast.

4. **Shared component changes breaking other modules** — Atlas has no automated tests. Modifying any file in `src/components/ui/` can degrade all 30 pages. Prevention: treat every shared component change as a breaking change; add new variant props with safe defaults; visual spot-check `/dashboard`, `/deals`, `/assets`, `/entities`, `/transactions`, `/lp-dashboard` after any primitive modification.

5. **Schema changes in production** — Running `prisma db push --force-reset` against the production `DATABASE_URL` destroys all real data. The v1.1 polish pass should treat schema changes as out-of-scope; if unavoidable, verify `DATABASE_URL` points to dev before any push and document the migration strategy before touching Prisma schema.

**Additional critical pitfalls to watch in every phase:** dark mode regressions from missing `dark:` Tailwind variants, missing loading guards on new SWR sections (causes production crash on cold cache), Tailwind CSS class conflicts when template literals bypass `cn()`, and LP portal breakage when GP-side data shapes change.

## Implications for Roadmap

Based on combined research, the architecture's dependency structure and the feature gap analysis converge on a clear execution order. The suggested phase structure is:

### Phase 1: Foundation — Shared Components and Patterns
**Rationale:** Shared component changes ripple across all 30 pages. Doing this first means every subsequent module phase gets standardized loading states, error boundaries, confirm dialogs, and skeleton components for free. Doing it last means re-visiting every module to retrofit. The architecture research explicitly flags this as Tier 1.
**Delivers:** `LoadingState`, `SkeletonRow`, `SkeletonCard`, `PageHeader`, `SectionPanel` components; `ConfirmDialog` replacing all `confirm()` browser dialogs; `SectionErrorBoundary` applied to all independent SWR sections; `FormField` standardized across modal forms; empty state pattern enforced on all list pages; dark mode `dark:` variants on all new elements.
**Addresses:** Universal polish gaps (empty states, loading skeletons, date formatting, number formatting), cross-module pattern consistency.
**Avoids:** Shared component breaking change pitfall (Pitfall 4); incomplete `"use client"` pitfall (Pitfall 2); anti-pattern elimination (browser `confirm()`, inline SVG spinners, custom modal chrome).
**Research flag:** Standard patterns — skip research phase. All patterns are documented in CLAUDE.md and coding-patterns.md.

### Phase 2: Deal Desk — Pipeline Completeness
**Rationale:** The Deal Desk is the most complete module (~90%) and the highest daily-use workflow for GPs. Polish here closes the gap from "functional" to "production-ready." The 3 known bugs (BUG-01 DD tab 0%, BUG-02 pipeline pass rate 300%, BUG-03 IC memo spinner) must be addressed here.
**Delivers:** Days-in-stage metric on kanban cards; stage totals per column (count + aggregate deal value); dead deal reason capture and display; Deal → Asset navigation link on closed deals; bulk deal status actions; BUG-01, BUG-02, BUG-03 resolution; IC memo PDF export; documents tab replace-in-place flow.
**Avoids:** SWR cache key mismatch (Pitfall 1) — multiple SWR keys on deal detail pages; pagination breaking (Pitfall 5) — deals list is the most paginated list; LP portal breakage is low-risk here.
**Research flag:** Standard patterns — Recharts for stage totals, TanStack Table for list sorting, existing `deal-stage-engine.ts` for stage logic.

### Phase 3: Asset Management — Holding Type Completion
**Rationale:** The asset module has the most critical workflow gap (no asset exit flow) and an architectural inconsistency that actively misleads users (all holding types showing identical controls). This phase requires the new `HoldingTypeAdaptivePanel` component built in Phase 1.
**Delivers:** Asset exit workflow modal (exit date, exit proceeds, final MOIC calculation, mark as EXITED); holding type–adaptive UI (LP positions, co-investments, direct assets each show context-appropriate controls); asset list column sorting via TanStack Table; covenant portfolio-level breach monitor; lease expiry forward view (90/180 days); valuation history chart verification.
**Avoids:** SWR cache key mismatch on asset mutations; missing loading guards on new SWR sections (asset detail has multiple concurrent fetches); LP portal breakage after asset model changes (must run LP smoke test after this phase — LP portal metrics derive from asset valuations).
**Research flag:** May need light research on TanStack Table column sort patterns. Otherwise standard.

### Phase 4: Entity Management — Structure and Navigation
**Rationale:** Entities are the foundation for all capital activity. Gaps here (flat list with no hierarchy, formation workflow dead-ends, regulatory tab rendering issues) create confusion that propagates downstream into capital calls and distributions.
**Delivers:** Entity parent-child hierarchy display on entity list; formation workflow "what's next" guidance after formation completes; regulatory filings structured add/edit form; entity status transition workflows (WINDING_DOWN, DISSOLVED); entity list with NAV + IRR at a glance verification; side letter management wiring verification.
**Avoids:** Same SWR pitfalls as above; schema change pitfall (Pitfall 8) — resist adding new entity fields; check for firmId scoping on any new entity routes.
**Research flag:** Standard patterns.

### Phase 5: Capital Activity — Workflow Completion
**Rationale:** Capital activity is the most financially consequential module. The P1 gaps here (missing status advancement buttons, missing distribution approval) mean GPs cannot complete their core financial workflows. This phase has the highest production risk from schema changes and LP portal dependency.
**Delivers:** Capital call status advancement buttons (DRAFT → ISSUED → FUNDED) as explicit UI actions; distribution approval + mark-paid buttons; overdue capital call visual indicators; capital call document attachment; waterfall preview mode (calculate without saving); per-investor capital call status visibility; waterfall calculation results display verification.
**Avoids:** LP portal breakage (Pitfall 10) — capital call and distribution changes directly affect LP portal; SWR cache key mismatch is critical here (transactions page has many concurrent SWR calls and complex filter parameters); pagination breaking on the transactions list (most filtered list).
**Research flag:** Needs careful attention — complex multi-SWR page with firmId-scoped pagination. Consider a targeted research pass on the transactions page SWR architecture before execution.

### Phase 6: LP Portal — Accuracy and Access
**Rationale:** The LP portal is a real customer-facing surface. LPs log in and judge the platform on what they see. The two most user-visible gaps (no period picker on capital account, no document category filter) make core LP workflows impossible. After capital activity changes in Phase 5, LP portal verification is mandatory.
**Delivers:** Capital account statement period/date range picker; LP document center category filter; LP performance per-entity breakdown (fund-by-fund IRR, not just rolled-up); K-1 acknowledgment receipt; LP contact info self-service verification; quarterly report linkage from LP document center; LP portal metrics verified as computed not seeded; performance chart responsiveness on mobile.
**Avoids:** LP portal breakage from prior GP-side changes (validate all 5 LP pages after any GP model change); data isolation — verify no GP-private data surfaces in LP routes; read-only verification (no edit buttons in LP views).
**Research flag:** Standard patterns. LP portal uses existing SWR + Recharts patterns throughout.

### Phase 7: Dashboard — Intelligence Surface
**Rationale:** The dashboard is the first screen GPs see. The two most impactful gaps (no deal pipeline summary, no "needs attention" section) require data from modules completed in Phases 2-5. This phase is last in the core GP workflow sequence because it aggregates across all modules — building it earlier would produce incomplete or inaccurate aggregates.
**Delivers:** Deal pipeline summary section (deals by stage, aggregate deal value in pipeline); "needs attention" alerts section (overdue capital calls, covenant breaches, lease expirations in 90 days); activity feed filter by entity/type; entity card quick-action buttons; dashboard entity cards with top/bottom performers linked to asset detail pages; LP comparison view data verification.
**Avoids:** Dashboard uses the most shared components (StatCard, Badge, Tabs) — highest risk for shared component regressions; the `/api/dashboard/entity-cards` endpoint aggregates across all entities and will slow as asset count grows — denormalize `lastNAVSnapshot` if needed.
**Research flag:** "Needs attention" aggregation query may require a targeted performance research pass to avoid adding a slow cross-model join to the dashboard load.

### Phase 8: Supporting Modules — Reports, Accounting, Settings
**Rationale:** Reports, Accounting, and Settings are less frequent workflows but have user-visible gaps. Accounting's QBO OAuth gap is deferred to v2+ (high complexity); the focus here is on what can be polished within the existing patterns.
**Delivers:** Report preview modal before download; report history per entity per period; unified integrations status page (all 7 integrations with green/red status); AI config test connection button; GP notification preferences; `confirm()` dialogs in Settings replaced with ConfirmDialog; service provider access expiry date verification; settings tabs end-to-end verification.
**Avoids:** Scope creep into real QBO OAuth (explicitly deferred); schema changes for accounting config fields (prefer UI/query fixes over new Prisma fields).
**Research flag:** Standard patterns throughout. QBO OAuth explicitly out of scope for this phase.

### Phase Ordering Rationale

- **Foundation first** because shared component changes break everything if done mid-stream. One pass, consistently applied.
- **Deal Desk second** because it's the most complete module with known bugs — early wins build confidence in the process.
- **Assets third** because the asset exit workflow and holding type–adaptive UI gaps are P1 frustrations that depend on nothing else.
- **Entities fourth** because entities are the prerequisite for meaningful capital activity — formation and structure clarity must come before capital workflows.
- **Capital Activity fifth** because it depends on entity clarity and has the highest LP portal dependency risk.
- **LP Portal sixth** because it must run after capital activity changes to catch LP portal breakage (Pitfall 10).
- **Dashboard seventh** because it aggregates across all modules — building it before modules are polished produces an incomplete aggregate view.
- **Supporting modules last** because Reports, Accounting, and Settings are lower daily-use frequency and don't have downstream dependencies.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (Capital Activity):** The transactions page is the most complex SWR + pagination page. Before execution, a targeted read of `transactions/page.tsx` SWR architecture is recommended to avoid pagination breakage (Pitfall 5) and SWR key mismatches.
- **Phase 7 (Dashboard):** The "needs attention" aggregation query crosses multiple models. If the dashboard load time budget is tight, pre-research the `/api/dashboard/entity-cards` query structure to plan for `lastNAVSnapshot` denormalization.

Phases with well-documented patterns (skip research phase):
- **Phase 1 (Foundation):** All patterns documented in CLAUDE.md, coding-patterns.md, and ARCHITECTURE.md.
- **Phase 2 (Deal Desk):** Existing patterns apply; bug fixes are documented with root cause in known bug catalogue.
- **Phase 3 (Assets):** TanStack Table is well-documented; holding type–adaptive UI pattern is architecturally clear.
- **Phase 4 (Entities), Phase 6 (LP Portal), Phase 8 (Supporting):** All follow established page/component/API patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Existing locked stack: HIGH confidence (verified from package.json and node_modules). New additions (motion, Radix v2, RHF v7.51+, @hookform/resolvers v3.9+): MEDIUM — React 19 compatibility based on training data through August 2025, should verify peerDependencies on npm before install |
| Features | HIGH | Derived from direct codebase audit of all 57 Prisma models, 73 API routes, 33 pages. Industry pattern comparisons (Juniper Square, Carta, Allvue) are MEDIUM — training-data sourced |
| Architecture | HIGH | Based on direct analysis of src/ structure, CLAUDE.md, coding-patterns.md, project-structure.md. Patterns are explicitly documented and consistently applied |
| Pitfalls | HIGH | Derived from known bug catalogue (BUG-01, BUG-02, BUG-03), AUDIT.md gap register, and direct inspection of anti-patterns in settings/page.tsx, transactions/page.tsx, and deals/page.tsx |

**Overall confidence:** HIGH

### Gaps to Address

- **QBO OAuth implementation path:** The accounting module's P1 gap (real OAuth vs. UI-only) is the most expensive item on the deferred list. Phase 8 should not attempt to wire it but should leave clear architectural notes on what is needed. This gap should be explicitly flagged in the roadmap as "requires dedicated spike before scheduling."
- **Version pinning for new libraries:** Before any `npm install` of `motion`, `@radix-ui/react-*`, `react-hook-form`, or `@hookform/resolvers`, verify React 19 peer dependency compatibility against published `peerDependencies` on npm. The training data is confident about support but cannot guarantee exact version compatibility at install time.
- **LP metrics accuracy:** The AUDIT.md notes that it is "unclear if LP portal metrics are computed or seeded." Phase 6 must verify this before declaring the LP portal polished — a seeded IRR number is a trust-destroying bug if an LP notices it.
- **Financial calculation correctness:** CLAUDE.md notes that IRR, waterfall, and capital account calculation code exists but "correctness not verified." Phase 5 (Capital Activity) should include a spot-check of waterfall outputs against known inputs, not just UI verification.

## Sources

### Primary (HIGH confidence)
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/package.json` — Confirmed installed packages and exact versions
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/node_modules/tailwindcss/package.json` — Tailwind 4.2.1 confirmed
- Direct codebase audit: `src/components/ui/`, `src/components/features/`, `src/app/(gp)/`, `src/app/(lp)/`, `src/app/api/`
- `.planning/AUDIT.md` — Honest scorecard with known gaps and known bugs
- `.planning/PROJECT.md` — Stack decisions, constraints, out-of-scope items
- `.planning/UI-GUIDE.md` — Component catalog and testing workflows
- `.planning/ARCHITECTURE.md` — Entity architecture, asset ownership, roles
- `.planning/DATA-MODEL.md` — All 57 Prisma models and 73 API routes
- `CLAUDE.md` — Coding patterns, anti-patterns, dev commands (authoritative)
- `.claude/rules/coding-patterns.md` — Bug-preventing patterns (authoritative)
- `.claude/rules/project-structure.md` — File layout and checklists (authoritative)
- Known bug catalogue: BUG-01 (DD tab 0%/NOT_STARTED), BUG-02 (pipeline pass rate 300%), BUG-03 (IC Memo stuck "Generating...")

### Secondary (MEDIUM confidence)
- Training data through August 2025 — framer-motion v11 React 19 support, Radix v2 React 19 support, RHF v7.51+ React 19 fix, @hookform/resolvers Zod 4 support
- Industry baseline patterns: Juniper Square, Allvue, Carta, Cobalt LP portal and fund admin conventions

### Tertiary (LOW confidence)
- Performance scaling projections (cursor-based pagination degradation, XIRR timeout thresholds) — inference from known patterns, not measured against Atlas production load

---
*Research completed: 2026-03-08*
*Ready for roadmap: yes*
