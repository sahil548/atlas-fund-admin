# Phase 22: Fit & Finish — Code - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Close the code-level v2.0/v2.1 gaps so the app is internally consistent before hardening work (Phases 24-27) begins. Scope = 8 FIN requirements (FIN-01, FIN-02, FIN-04, FIN-08, FIN-09, FIN-10, FIN-11, FIN-12) **plus** 21 urgent items folded in from the Phase 21 GP + LP walkthrough triage (Obs 3, 5, 6, 7, 8, 10, 12, 18, 19, 21, 22, 24, 25, 27, 35, 39, 40, 44, 47 + LP-Obs 2, 3).

Three hard blockers anchor the sequence: Obs 35 (Side Letter form crash), Obs 40 (Document upload wizard stuck on step 1), LP-Obs 2 (Tom Wellington capital-account reconciliation gap).

Top strategic priority, per Obs 20: asset correctness (Obs 10, 12, 25, LP-Obs 2) — "Get assets right — everything rolls up from there."

Explicitly NOT in scope (deferred per walkthrough triage): daily valuation granularity, custom-range cash flow chart, AI-drafted income/expenses from contracts, bulk actions on tasks/documents, directory UI refactor, settings IA redesign, compliance/fundraising/operations tab expansion.

</domain>

<decisions>
## Implementation Decisions

### Plan structure & sequencing
- **7-8 granular plans**, not one mega-plan or 3-tier mega-plans. Each plan is a coherent work unit with its own commit series and verification.
- **Execution order:** Blockers → asset-correctness cluster → rest. The three hard blockers ship first to unblock usability; asset correctness follows (per Obs 20 strategic thesis); list-control / wiring / error-copy / seed / FIN-01 / FIN-02 / FIN-08 / LP-Obs 3 fall into subsequent plans in whatever order is ergonomic.
- **One plan per blocker:** Plan 22-01 = Obs 35 Side Letter crash; Plan 22-02 = Obs 40 Upload Wizard; Plan 22-03 = LP-Obs 2 reconciliation. Each ships independently so any one can land without waiting for the others.
- **Per-plan VERIFICATION.md + end-of-phase SUMMARY.md.** Each plan ends with its own VERIFICATION (success-criteria checkboxes + evidence). Phase 22 closes with a SUMMARY.md rolling up all plans. Matches v2.0 convention; keeps each commit traceable.

### Asset edit surface scope
- **Every asset field is editable**, not just calc-critical. Rationale captured in Specific Ideas below: entry date read-only is impossible to work with when onboarding historical assets for any new user. Don't half-ship this.
- **Modal `Edit Asset` form** is the primary pattern (not inline-edit-on-Overview). Cleaner save/cancel semantics and validation; unambiguous "commit" moment for edits that affect downstream metrics.
- **One modal, fields conditional on asset type.** Common fields (name, entry date, cost basis, class, entity, status) at top. Per-type section below renders only the fields relevant to this asset's type (Real Estate → rent roll + property specifics; Private Credit → credit facility terms; Operating → ownership + EBITDA; LP Interest → commitment + vintage).
- **Dedicated sub-modals for child rows.** Leases, contracts, valuations are one-to-many with asset. They are edited via their own per-row `Edit Lease` / `Edit Contract` / `Edit Valuation` sub-modals triggered from the Overview tab. The main `Edit Asset` modal handles scalar asset fields only. This respects the relational shape and directly closes Obs 12 ("no clear edit path for lease/contract fields").

### LP-Obs 2 reconciliation approach (FIN-12, BLOCKER)
- **Diagnose-first, then fix.** Plan 22-03 opens with a short diagnostic: query Tom Wellington's distribution data, reconcile the server-side total against the itemized breakdown categories, and identify which of the four suspected root causes applies (over-counting, missing categories, v2.1 waterfall categories not rendered, or intentionally excluded flow-through). Fix lands where the diagnosis points.
- **Fix may land in LP display OR asset layer.** If the gap traces to the LP statement renderer (e.g., missing ROC/carry/tax/preferred-return columns), fix there. If it traces to asset income/expense data quality (cascade predicted by Obs 20 + Obs 10/12/25), the fix belongs in an asset-cluster plan and LP-Obs 2 closes when the upstream fix ships.
- **Verification:** (1) `/lp-account` for Tom Wellington shows distribution total = sum of itemized breakdown (no unexplained gap); (2) a unit test that asserts category-row sum equals total for every LP in the seed; (3) a written diagnostic note in VERIFICATION explaining what was wrong and what was fixed; (4) re-run sanity check for CalPERS (Michael Chen).
- **LP-Obs 3 is a sibling plan**, not bundled into LP-Obs 2. It's a display-only addition (invested-capital + current-fair-value columns on LP Portfolio) and ships as its own plan under the FIN-12 umbrella. Keeping them separate avoids entangling display polish with root-cause investigation.

### Second-fund validation (FIN-04)
- **User provides a real-fund Excel** (non-PCF II). Not a synthetic construction and not another PCF-family fund. A real fund with a meaningfully different waterfall shape (e.g., equity fund, different catch-up style, different pref mechanism) is what surfaces genuine PCF-II-specific assumptions.
- **Multi-distribution lifecycle depth.** At least three distributions from the second fund: an early return-of-capital event, a mid-fund income distribution, and a late-fund carry event. Each distribution has an Excel row; each matches engine output to the cent. Single-distribution validation is not sufficient.
- **Plan is Excel-gated.** Plan 22-04 (Second Fund Validation) lists "Second-fund Excel received from user" as a prerequisite before plan execution starts. The plan can be drafted in parallel with other Phase 22 work, but execution waits on the Excel. Keeps the rest of Phase 22 unblocked.
- **Discrepancy triage rule:** Excel wins for convention differences (e.g., 30/360 vs actual/360, inclusive vs exclusive day count, ROC-effective-date convention) — the convention goes into `docs/waterfall-conventions.md` (Phase 23 FIN-03). Engine wins for bugs (wrong segment walk, wrong base calculation). Each discrepancy is written into VERIFICATION with its triage call.

### Claude's Discretion
- Exact plan names and numbers within the 7-8 plan structure (the planner decides thematic groupings for Obs 3, 5, 6, 7, 8, 19, 21, 22, 24, 27, 39, 44, 47 + FIN-01, FIN-02, FIN-08 + LP-Obs 3).
- Diagnostic queries for the LP-Obs 2 investigation (Prisma queries, manual ledger reconciliation).
- `Edit Asset` modal layout, validation rules, save behavior, dirty-field indicators.
- Activity-feed wiring approach for Obs 6 and Obs 19 — whether it's a single shared-component fix or two targeted fixes (expectation: shared, per scout of `activity-feed-helpers.ts`).
- Error-copy taxonomy for FIN-09 / Obs 3 / Obs 39 "Unauthorized" cleanup — centralized error-code map vs. per-site rewrites is a Claude call.
- List sort/filter implementation (FIN-10, Obs 8/21/44) — must respect Phase 25 pagination conventions so the same list controls survive the pagination retrofit. Query-param shape is Claude's call.
- Task and contact link pattern for FIN-11 (Obs 18, 22, 27) — expected to be a uniform `Link` wrap around existing rows; Claude confirms during planning.
- Seed fix for Obs 47 — the minimal fix is adding `deleteMany` for `AssetExpense`, `AssetIncome`, `AssetValuation` before `asset.deleteMany()`. Claude can audit for other missing cascades while in the file.

</decisions>

<specifics>
## Specific Ideas

- **On asset edit scope:** "for example entry date is not editable which is impossible to work with when inputting already existing assets for any new user." This is not a polish fix — it's an onboarding capability gap. Any user bringing historical assets in cannot backdate them without edit access to entry date. This is why the decision is *every field editable*, not just calc-critical.
- **On prioritization:** Obs 20 strategic thesis anchors the phase — "Get assets right — everything rolls up from there." Asset-correctness cluster (Obs 10, 12, 25, LP-Obs 2) is the strategic priority after the three hard blockers. LP-Obs 2 validates the thesis: a $6M unexplained gap at the LP statement level may trace back to asset income/expense data quality.
- **On verification shape:** Reuse the Plan 20-10 "human verification checkpoint" pattern (structured checklist, blocking gate, user approval or gap list) as the reference for per-plan VERIFICATION.md. That pattern worked in v2.0 and is familiar shape for downstream consumers.
- **On the three hard blockers:** Obs 35 Side Letter crash (TypeError on `entities.map` due to v2.1 response shape change) is a crash fix / response-shape normalization. Obs 40 Upload Wizard stuck is core functionality broken. LP-Obs 2 is LP-facing calc correctness. All three must ship before Phase 22 is considered to have closed "fit & finish."
- **On the 'Unauthorized' error copy cluster (FIN-09):** Covers at minimum Obs 3 (deal stage-gate rejection) and Obs 39 (document AI summary access). Every error message should explain the condition and the action to resolve it — e.g., "Can't delete a deal past Screening — move it to Dead first"; "Enable AI access in Settings > AI Config." Not a catch-all "Unauthorized."

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/computations/pref-accrual.ts` — FIN-02 target for *importing from* (must not be duplicated in the waterfall-templates calculate route). Already houses the 30/360 day-count and segment-walk logic.
- `src/app/api/waterfall-templates/[id]/calculate/route.ts` — FIN-02 refactor target. Currently has inlined logic that duplicates `pref-accrual.ts`.
- `src/app/(gp)/meetings/page.tsx` — FIN-01 list page exists. Needs a sibling `src/app/(gp)/meetings/[id]/page.tsx` (does not currently exist per scout).
- `src/components/features/side-letters/create-side-letter-form.tsx` — Obs 35 crash site. TypeError on `entities.map` from v2.1 response-shape change.
- `src/components/features/dashboard/activity-feed-section.tsx` + `src/lib/activity-feed-helpers.ts` — Obs 6 (deal activity tab) and Obs 19 (asset activity tab) probably share this component. Expect a one-place fix that covers both.
- `src/components/ui/modal.tsx` — primitive for the `Edit Asset` modal (and the lease/contract/valuation sub-modals).
- `src/components/features/deals/inline-edit-field.tsx` — existing inline-edit primitive; explicitly *not* reused for asset edit (user chose modal pattern), but exists and can be referenced if any inline fit & finish items benefit from it.
- `src/lib/pagination.ts` — existing pagination convention. FIN-10 list controls (sort/filter) must respect this so Phase 25 pagination retrofit is clean.
- `src/lib/computations/` — domain computation modules (`capital-accounts.ts`, `irr.ts`, `fee-engine.ts`, `pref-accrual.ts`, `performance-attribution.ts`). Relevant for LP-Obs 2 diagnostic and second-fund validation.
- `prisma/seed.ts` — Obs 47 fix target. Missing `deleteMany` calls for `AssetExpense`, `AssetIncome`, `AssetValuation`.
- `.planning/phases/20-schema-cleanup-ui-polish/20-10-PLAN.md` — reference pattern for "human verification checkpoint" plan shape.
- `.planning/UI-GUIDE.md` — step-by-step workflows; reused as the walkthrough tour in Phase 21 and available as the verification/testing reference for each Phase 22 plan.

### Established Patterns
- Phase-per-directory structure under `.planning/phases/XX-slug/`. Each plan gets its own `XX-NN-PLAN.md` and `XX-NN-VERIFICATION.md`. End-of-phase rollup is `XX-SUMMARY.md`.
- REST API routes use `parseBody(req, ZodSchema)` from `@/lib/api-helpers` — all new edit endpoints follow this.
- Client components: `"use client"` directive + `useFirm()` / `useUser()` hooks. Never hardcode firm IDs.
- Mutations: either `fetch` + `mutate(cacheKey)` to refresh SWR, or the `useMutation` hook from `@/hooks/use-mutation.ts`. Both patterns valid.
- Toast errors must be strings, never objects — `typeof data.error === "string" ? data.error : "Failed to do X"` pattern.

### Integration Points
- New edit-asset modal wires into the existing asset detail page at `src/app/(gp)/assets/[id]/page.tsx`. Triggered from Overview tab.
- `/meetings/[id]` new detail page wires back to the existing `/meetings` list, to dashboard activity feed entries, and to any AI-command-bar deep links.
- LP-Obs 2 fix wires into `src/app/(lp)/lp-account/page.tsx` (display) and potentially into `src/lib/computations/capital-accounts.ts` (rollup logic) depending on diagnosis.
- LP-Obs 3 invested-vs-value columns wire into `src/app/(lp)/lp-portfolio/page.tsx`, consuming valuation records (and asset cost-basis records once Obs 25 fix lands).
- Error-copy cleanup (FIN-09) touches deal-delete route, document-AI-summary route, and potentially others found during audit. No new file — edit existing error-return sites.
- Seed fix (Obs 47) is a single file edit: `prisma/seed.ts`.

</code_context>

<deferred>
## Deferred Ideas

These came up in the Phase 21 walkthrough but are explicitly out of scope for Phase 22. Captured here so they're not lost. All mapped to v3.1+ per walkthrough triage rubric.

- Daily valuation granularity on asset Performance tab (Obs 13) — architectural time-series data model change
- Custom date range picker on dashboard Cash Flow chart (Obs 1b) — new UI feature
- Cash Flow chart granularity (Obs 1) — architectural data model change
- AI-drafted income from contracts (Obs 15) — new AI feature surface
- AI-drafted expenses from contracts (Obs 16) — new AI feature surface
- Document category organization on asset Documents tab (Obs 17) — organizational preference, not blocking
- Unit-class term editing on entity Cap Table (Obs 26) — new data model + UI surface
- Fundraising kanban expansion (Obs 29) — richer fundraising feature surface
- Legal & Compliance tab upgrade with filing calendar / audit log (Obs 30) — new feature surface
- Entity Operations tab doc-role binding (Obs 31) — new UI surface + data model
- Directory table UI refactor (Obs 36) — UX refactor too large for Phase 22
- Task list bulk actions + context views (Obs 38) — new feature surface
- Document list per-doc metadata + context display (Obs 41) — significant metadata-display expansion
- Documents list bulk actions (Obs 42) — same family as Obs 38
- Settings IA redesign (Obs 46) — functionally OK; information architecture review is large scope
- SERVICE_PROVIDER role walkthrough — deferred to Phase 28 (final walkthrough), prerequisite is Phase 24 RBAC shipping
- LP walkthrough against real customer data (LP-Obs 1 methodology finding) — carry-forward to Phase 28 final walkthrough

</deferred>

---

*Phase: 22-fit-finish-code*
*Context gathered: 2026-04-17*
