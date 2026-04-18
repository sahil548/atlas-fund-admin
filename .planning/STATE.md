---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Consolidation & Scale Readiness
status: in_progress
stopped_at: "Phase 22 partial + 22-10/11/12/13 post-deploy gap closures shipped — FIN-04 Excel pending (carry-forward to Phase 23, Kathryn), ready for Phase 23"
last_updated: "2026-04-17T23:00:00.000Z"
last_activity: "2026-04-17 — Plan 22-13 shipped: valuation audit trail (approvedBy + approvedAt stamped on DRAFT→APPROVED, cleared on revert; approver name/initials resolved in GET response; audit columns added to History table; Edit modal shows 'Approved by X on DATE' banner). Build clean; API round-trip scripted but preview server died during test; user opted to verify in production Chrome after Vercel deploy."
progress:
  total_phases: 8
  completed_phases: 2
  total_plans: 21
  completed_plans: 20
---

# Atlas — GSD State

## Project Reference
- **PROJECT.md:** `.planning/PROJECT.md` (updated 2026-04-16)
- **Core value:** GP team manages full deal-to-asset lifecycle and fund/LP metrics in one place
- **Current focus:** v3.0 Consolidation & Scale Readiness — Phase 21 complete, ready to plan Phase 22

## Current Position

- **Milestone:** v3.0 (Consolidation & Scale Readiness) — IN PROGRESS
- **Previous:** Phase 22 (Fit & Finish — Code) — PARTIAL COMPLETE 2026-04-17 (7/9 plans; FIN-04 deferred to Kathryn)
- **Phase:** Phase 23 (Fit & Finish — Docs & Verification Retrofit) — NEXT UP
- **Plan:** Phase 23 not yet planned. Ready to kick off.
- **Status:** Phase 22 partial — FIN-04 Excel carry-forward to Phase 23 (Kathryn). All other Phase 22 requirements closed: FIN-01, FIN-02, FIN-08, FIN-09, FIN-10, FIN-11, FIN-12. All 21 walkthrough obs addressed. 3 hard blockers closed. Asset correctness cluster closed. LP reconciliation closed.
- **Last activity:** 2026-04-17 — Phase 22 closed with 7/9 plans + 22-10 gap-closure (post-deploy). 22-10 closed: Edit Asset fallback for legacy assets (detectAssetKind falls back to assetClass/instrument/participation); PUT `/api/assets/[id]` upserts detail records instead of 400 on type mismatch; Add Asset form parity with Edit (Entry Date / Projected IRR/Multiple / type-conditional fieldset). FIN-04 still deferred to Kathryn / Phase 23.

## v3.0 Phase Overview

| Phase | Name | Requirements | Size | Status |
|-------|------|--------------|------|--------|
| 21 | Initial Manual Walkthrough (Baseline) | MAN-01, MAN-02 (2) | Small | COMPLETE |
| 22 | Fit & Finish — Code | FIN-01, FIN-02, FIN-04, FIN-08..12 (8) | Medium-to-large | Not started |
| 23 | Fit & Finish — Docs & Verification Retrofit | FIN-03, FIN-05, FIN-06, FIN-07 (4) | Small-to-medium | Not started |
| 24 | RBAC Enforcement | RBAC-01..05 (5) | Medium | Not started |
| 25 | Pagination | PAGE-01..04 (4) | Medium | Not started |
| 26 | Error Boundaries | ERR-01..03 (3) | Small | Not started |
| 27 | E2E Test Coverage | E2E-01..06 (6) | Medium | Not started |
| 28 | Final Walkthrough & Sign-off | MAN-03, MAN-04 (2) | Small-to-medium | Not started |

**Coverage:** 34/34 requirements mapped, no orphans. (FIN-09..12 added 2026-04-16 from walkthrough triage.)

**Dependency ordering rationale:** Walkthrough FIRST (P21) captures a fresh baseline BEFORE any changes — its feedback shapes subsequent phases. Fit & finish split into P22 (code-level: meeting page, route refactor, second-fund validation, bug re-verify) and P23 (docs/verification retrofit) so the code changes are isolated from the documentation sync. RBAC (P24) before E2E (P27) so tests exercise real role enforcement. Error boundaries (P26) before E2E so tests aren't flapping on white-screens. Final walkthrough (P28) LAST — user feel-checks the full v3.0 stack and signs off; urgent items from P21 that weren't absorbed into P22-27 are closed here.

## Accumulated Context

### Key Architectural Decisions (carried from v2.0 + v2.1)

From v2.0:
- REST API, not tRPC
- SWR for client data
- Zod on all routes via `parseBody`
- Custom Select/Modal/Tabs (no Radix dependency)
- Firm-wide multi-tenancy via `useFirm()` hook
- Clerk auth (prod) / mock UserProvider (dev)

From v2.1:
- 30/360 inclusive day count for pref accrual (Excel convention)
- ROC flows into PIC base effective first day of following month
- Final 100%-GP tier treated as remainder-to-GP when no subsequent profit-split tier
- GP detection is firm-wide and multi-signal (name, type, unit class, fallback)
- Multiple waterfall templates per vehicle; multiple investor profiles per contact
- Pref offset excludes ROC; only income/gains reduce accrued pref
- `precomputedPrefAmount` config on waterfall engine

### v3.0 Phase 22 Plan 06 Decisions (2026-04-17)

| Decision | Answer |
|----------|--------|
| parsePaginationParams knownParams | Must only contain true infrastructure params (firmId/cursor/limit/search). Business filter params (assetClass, status, entityId) placed in knownParams are silently consumed and never reach params.filters |
| Client-side sort | useMemo on accumulated allEntities/allMeetings arrays — not URL-param sort — compatible with Phase 25 Load More |
| Obs 7 deletion bypass | No bypass. Delete button only shown for SCREENING/DEAD. API enforces same server-side. Kill Deal → DEAD → Delete is intentional two-step |
| AI Unauthorized strings | All 13 occurrences in src/app/api/ are genuine HTTP 401 auth failures — not misused for business logic |
| Centralized error copy | src/lib/error-messages.ts exports ERR const — import and reference rather than inline copy |

### v3.0 Scope Decisions (2026-04-16)

| Decision | Answer |
|----------|--------|
| v3.0 direction | Path C (fit & finish) → Path A (hardening) |
| Scale target | 2–3x growth (30 LPs, 30 assets) |
| Path A must-haves | RBAC enforcement, E2E tests for CRUD |
| Path A deferred | Rate limiting, code splitting |
| Also in v3.0 | Pagination, error boundaries |
| Deferred to v3.1+ | Background jobs, full perf monitoring |
| Manual walkthroughs | Bookend the milestone — Phase 21 (baseline, pre-work) and Phase 28 (final sign-off) |
| Phase count | 8 (within 5-10 band; bookending walkthroughs pushed count to 8 vs original 7) |

### Phase 22 Findings Summary (2026-04-17)

| Finding | Details |
|---------|---------|
| LP-Obs 2 root cause was seed data, not asset-layer cascade | entity2 had no per-investor DLIs for 3 paid distributions; fixed by adding 15 DLIs (5 investors × 3 dists); asset-layer cascade hypothesis refuted |
| parsePaginationParams knownParams is a footgun | Business filter params (assetClass, status, entityId) placed in knownParams are silently consumed and never reach params.filters — any business filter must be omitted from knownParams |
| Waterfall refactor surfaced no convention drift | FIN-02 mechanical import of pref-accrual.ts functions; 102-line net reduction; all 148 computation tests unchanged |
| FIN-04 Excel deferred to Phase 23 / Kathryn | User explicitly deferred on 2026-04-17: "defer, I'll let Kathryn handle that." Plan 22-08 drafted and ready; executes once Excel is placed at fixtures/ |
| All asset detail fields are String?, not Float/Int | AssetRealEstateDetails/CreditDetails/EquityDetails/FundLPDetails all use String? — Zod schemas must use z.string().optional(), not z.number() |

### Blockers/Concerns

- Watch: Phase 27 (E2E) depends on Phase 24 (RBAC) shipping cleanly; if RBAC slips, E2E tests may need to accommodate a mid-migration auth state.
- **FIN-04 carry-forward** — Kathryn owns second-fund waterfall validation. Phase 23 backlog. Plan 22-08 drafted and ready once Excel is available.
- **18 pre-existing vitest failures** — unchanged from Phase 22 start; not regressions. Phase 23+ should triage these.

### Walkthrough Findings Summary (2026-04-16)

- **GP walkthrough (James Kim, 2026-04-16):** 46 observations + Obs 47 seed bug. Strategic finding: "Get assets right — everything rolls up from there."
- **LP walkthrough (Michael Chen + Tom Wellington, 2026-04-16):** 6 observations. Hard blocker: LP Capital Account distribution total doesn't reconcile ($14M total vs $8M breakdown).
- **3 hard blockers:** Obs 35 (Side Letter crash), Obs 40 (Upload Wizard stuck), LP-Obs 2 (capital account math gap)
- **Top strategic priority:** Asset-correctness cluster (Obs 10, 12, 25, LP-Obs 2)
- **FIN requirements added:** FIN-09 (error-copy), FIN-10 (list sort/filter), FIN-11 (integrated records), FIN-12 (LP calc quality)

## Performance Metrics

- Plans completed (v1.0): 36 plans across 10 phases
- Plans completed (v2.0): 58 plans across 10 phases
- v2.1 (off-GSD): 71 commits, no plan breakdown — retroactively documented
- Tests added in v2.1: 45 (87 total in waterfall domain)
- v3.0 phases planned: 8 (21-28)
- v3.0 requirements mapped: 34/34 (FIN-09..12 added from Phase 21 walkthrough)
- v3.0 Phase 21: 1/1 plan complete, 52 observations triaged, 21 urgent items folded
- v3.0 Phase 22 plan 22-01: 2 tasks, 2 files modified, 7 min, 3 commits — Obs 35 + Obs 47 closed
- v3.0 Phase 22 plan 22-02: 2 tasks, 3 files modified, ~40 min, 1 commit — Obs 40 closed (FileUpload + FormData + DocumentFormDataSchema)
- v3.0 Phase 22 plan 22-03: 3 tasks, 5 files modified, ~60 min — LP-Obs 2 closed (15 DLIs + distributionBreakdown API + display rows)
- v3.0 Phase 22 plan 22-04: 3 tasks, 12 files created/modified, ~90 min, 3 commits — Obs 10, 12, 24, 25 closed (Edit Asset modal expanded, sub-modals for lease/credit/valuation, allocation tooltip, cost-basis fix)
- v3.0 Phase 22 plan 22-06: 4 tasks, 7 files created/modified, ~90 min, 4 commits — FIN-09 closed (centralized error-messages.ts; ERR taxonomy), FIN-10 closed (asset filter fix, entity sort+search, meetings sort), FIN-11 closed (task rows linked, cap-table confirmed), Obs 7 no-bypass confirmed
- v3.0 Phase 22 plan 22-05: 3 tasks, 10 files created/modified, 7 min, 3 commits — FIN-01 closed (meeting detail page, 4+ activity feed sites), FIN-12 LP-Obs 3 closed (LP Portfolio Invested + Current Value columns)
- v3.0 Phase 22 plan 22-06: 4 tasks, 7 files created/modified, ~90 min, 4 commits — FIN-09 closed (centralized error-messages.ts; ERR taxonomy), FIN-10 closed (asset filter fix, entity sort+search, meetings sort), FIN-11 closed (task rows linked, cap-table confirmed), Obs 7 no-bypass confirmed
- v3.0 Phase 22 plan 22-07: 4 tasks, 2 files modified, ~30 min, 2 commits — FIN-02 closed (waterfall route imports pref math, 102-line reduction), FIN-08 closed (3 bugs formally verified with [CLOSED:] labels; BUG-01 seed gap fixed for deal-9)
- v3.0 Phase 22 plan 22-09: 3 tasks (docs-only), 5 files modified — Phase 22 SUMMARY, VALIDATION Nyquist flip, STATE/ROADMAP/REQUIREMENTS updated; FIN-04 marked carry-forward to Phase 23

## Session Continuity

- **Initialized:** 2026-03-08
- **v1.0 shipped:** 2026-03-08
- **v2.0 shipped:** 2026-03-18
- **v2.1 shipped + tagged:** 2026-04-16
- **v3.0 kickoff:** 2026-04-16
- **v3.0 roadmap complete:** 2026-04-16
- **Last session:** 2026-04-17T09:00:00.000Z
- **v3.0 roadmap restructured:** 2026-04-16 (walkthroughs moved to bookend the milestone)
- **Stopped at:** Phase 22 complete — 7/9 plans shipped; FIN-04 deferred to Kathryn (Phase 23)
- **Resume file:** None
