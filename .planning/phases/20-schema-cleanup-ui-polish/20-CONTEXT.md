# Phase 20: Schema Cleanup & UI Polish - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Exhaustive three-track hardening pass that closes v2.0. Track 1 (Integration Audit): Reconcile all changes from Phases 11-19 — fix conflicts, regressions, dead code, inconsistencies, and broken cross-module interactions. Track 2 (Schema): Audit every Prisma model, relation, and JSON field — fix broken nested lists, ensure all dynamic content is properly wired, verify relational integrity. Track 3 (UI): Systematically review every page and component — selectively upgrade weak components with shadcn/ui-inspired alternatives, polish all pages equally, full dark mode verification.

This is the FINAL phase of v2.0. No more phases after this. Ship with zero known bugs, zero dead code, airtight data integrity, and a UI that matches premium SaaS standards.

</domain>

<decisions>
## Implementation Decisions

### UI Visual Target
- Selective component upgrades — replace the weakest UI primitives (modals, selects, dropdowns, date pickers) with shadcn/ui-inspired alternatives, but don't do a full library migration
- All pages treated equally — systematic pass across every GP and LP page, no page left behind
- Visual reference: shadcn/ui + 21st.dev aesthetic — clean, modern, minimal (think Linear, Vercel Dashboard, Stripe)
- Full dark mode audit — every page verified in dark mode, fix all contrast/readability issues, ensure charts/badges/forms look correct in both themes
- Existing shared components (PageHeader, SectionPanel, EmptyState, TableSkeleton, ConfirmDialog) stay — they were established in Phase 11 and work

### Schema Hardening
- Formalize ALL JSON blob fields with Zod schemas — every JSON column gets a defined shape validated on read/write (waterfall configs, AI extraction results, deal metadata, side letter adjustments, etc.)
- Add database-level constraints AND indexes — unique constraints, check constraints, and performance indexes on frequently-queried columns (firmId, status, dealId, entityId, date ranges)
- Zod validation on EVERY API route — all 73+ routes get Zod input validation on request body and query params, no `as any` bypasses, uniform error responses
- Orphaned fields/models: Claude's discretion — remove clearly dead fields via migration, document ambiguous ones for future cleanup

### Integration Audit
- Fix ALL 3 known bugs with regression tests:
  - BUG-01: DD progress shows 0% for post-DD deals (fallback to workstream-status)
  - BUG-02: Pipeline conversion rate >100% anomaly (verify guard holds)
  - BUG-03: IC memo spinner hangs on 90s timeout (proper error handling + UI recovery)
- Structured logging — replace 373 console.log/warn/error calls with a logger utility supporting error/warn/info/debug levels; debug only in dev, errors in prod
- Full cross-module verification — trace key workflows end-to-end: deal → asset transition, capital call lifecycle → LP metrics, AI command bar → all data, dashboard aggregation accuracy
- Dead code: full cleanup — remove all unused imports, dead functions, commented-out code, unreferenced files across entire codebase

### Type Safety & Code Quality
- Eliminate `any` types pragmatically — define explicit TypeScript interfaces for all API response shapes and data models; allow runtime Zod validation for genuinely dynamic content (AI responses, third-party payloads)
- Error boundaries on every page route — wrap each route with ErrorBoundary so JS errors show friendly recovery UI instead of blank page
- Untyped imports fixed — install proper type definitions or create stubs (pdf-parse, etc.)

### Claude's Discretion
- Whether to refactor oversized components (DD tab 1,563 lines, entity page 1,212 lines) — decide based on fragility risk and whether it improves the hardening pass
- Which orphaned schema fields to remove vs document
- Exact structured logging implementation (Winston, Pino, or custom)
- Specific shadcn/ui-inspired component designs (as long as they match the reference aesthetic)

</decisions>

<specifics>
## Specific Ideas

- "This should be the most extensive audit we've done" — final phase of v2.0, nothing ships with loose ends
- UI should feel like a $50K SaaS product — Linear/Vercel/Stripe quality bar
- Zero known bugs policy — all 3 documented bugs fixed with regression tests before v2.0 ships

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/` — 24 primitives (button, badge, modal, select, input, tabs, toast, etc.) — candidates for selective upgrade
- `src/components/ui/page-header.tsx` + `section-panel.tsx` — shared layout components from Phase 11
- `src/components/ui/empty-state.tsx` + `table-skeleton.tsx` — loading/empty patterns from Phase 11
- `src/components/ui/confirm-dialog.tsx` — already migrated from browser confirm()
- `src/components/ui/error-boundary.tsx` — exists but may need to be wired to all routes

### Established Patterns
- Tailwind CSS 4 with `dark:` variants — all components expected to support dark mode
- SWR for client-side data fetching — hooks pattern throughout
- Zod for validation (partial coverage — this phase makes it universal)
- `@/lib/formatters.ts` — date-fns and currency formatting from Phase 11
- API pattern: Next.js Route Handlers with parseBody/getAuthUser helpers
- Fire-and-forget: audit logging, notifications, NAV snapshots never block primary ops

### Integration Points
- Prisma schema (1,991 lines, 57 models) — central to Track 2
- 73+ API routes under `src/app/api/` — central to validation audit
- 25+ GP pages under `src/app/(gp)/` — central to Track 3
- 6 LP pages under `src/app/(lp)/` — included in UI pass
- `.planning/codebase/CONCERNS.md` — documents all known issues to verify/fix

</code_context>

<deferred>
## Deferred Ideas

- Role-based access control enforcement at API level (requireGPRole/requireLPRole middleware) — documented in CONCERNS.md, deferred to security-focused phase
- Full test suite (unit + integration + e2e) — build validation via `npm run build` sufficient for current scale
- Redis caching layer for dashboard aggregations — not needed at current user count
- Prisma 7 → 8 upgrade — evaluate in v3.0
- Connection pooling (PgBouncer) — not needed for current ~10 concurrent users

</deferred>

---

*Phase: 20-schema-cleanup-ui-polish*
*Context gathered: 2026-03-10*
