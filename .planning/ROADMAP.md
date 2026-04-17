# Atlas — GSD Roadmap

## Milestones

- ✅ **v1.0 GP Production Ready** — Phases 1-10 (shipped 2026-03-08) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Intelligence Platform** — Phases 11-20 (shipped 2026-03-18) — [archive](milestones/v2.0-ROADMAP.md)
- 🔶 **v2.1 CRUD Completion & Waterfall Correctness** — retroactive, 71 commits 2026-03-24 → 2026-04-09 (Kathryn, off-GSD) — [archive](milestones/v2.1-ROADMAP.md)
- 🟢 **v3.0 Consolidation & Scale Readiness** — Phases 21-28 (kicked off 2026-04-16, in progress)

---

<details>
<summary>✅ v1.0 GP Production Ready (Phases 1-10) — SHIPPED 2026-03-08</summary>

See [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) for full phase details.

Phases 1-10 shipped 2026-03-08. 231 commits, 497 files changed, ~92K LOC TypeScript.

</details>

<details>
<summary>🔶 v2.1 CRUD Completion & Waterfall Correctness — IN REVIEW 2026-04-16 (retroactive)</summary>

See [milestones/v2.1-ROADMAP.md](milestones/v2.1-ROADMAP.md) and [milestones/v2.1-REQUIREMENTS.md](milestones/v2.1-REQUIREMENTS.md).

71 commits between 2026-03-24 and 2026-04-09 by Kathryn. 65 on `origin/main`, 6 on unmerged branch `feat/edit-delete-across-entities`. Shipped outside the GSD workflow; documented retroactively 2026-04-16.

**Themes:**
- CRUD completion across 9+ entity domains (11 new API routes)
- Waterfall + pref-return correctness (PIC-weighted, 30/360, ROC handling, final-tier-remainder)
- GP detection hardening
- Cap table + investor activity polish

**Regression tests added retroactively:** 45 (87 total in waterfall/pref domain, all passing).

**Pending:** merge of 6-commit branch after UI smoke-test on PCF II distribution.

</details>

<details>
<summary>✅ v2.0 Intelligence Platform (Phases 11-20) — SHIPPED 2026-03-18</summary>

See [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md) for full phase details.

Phases 11-20 shipped 2026-03-18. 264 commits, 545 files changed, ~91K LOC TypeScript. 99 requirements across 14 categories.

- [x] Phase 11: Foundation (5/5 plans)
- [x] Phase 12: AI Configuration & Document Intake (5/5 plans)
- [x] Phase 13: Deal Desk & CRM (5/5 plans)
- [x] Phase 14: Asset Management & Task Management (7/7 plans)
- [x] Phase 15: Entity Management & Meeting Intelligence (8/8 plans)
- [x] Phase 16: Capital Activity (6/6 plans)
- [x] Phase 17: LP Portal (3/3 plans)
- [x] Phase 18: AI Features (4/4 plans)
- [x] Phase 19: Dashboard & Supporting Modules (5/5 plans)
- [x] Phase 20: Schema Cleanup & UI Polish (10/10 plans)

</details>

---

## v3.0 Consolidation & Scale Readiness (Phases 21-28)

**Goal:** Close accumulated v2.0/v2.1 gaps (fit & finish), then harden for 2–3x growth scale (30 LPs, 30 assets) with RBAC enforcement, pagination, error boundaries, and E2E coverage on v2.1 CRUD work. Bookended by two manual walkthroughs: baseline at Phase 21, final sign-off at Phase 28.

**Requirements:** 34 total across 6 categories (FIN × 12, MAN × 4, RBAC × 5, PAGE × 4, ERR × 3, E2E × 6). FIN-09..12 added from Phase 21 walkthrough triage 2026-04-16.

**Size:** 8 phases, mostly small-to-medium (consolidation work — no new feature surface).

### Phases

- [x] **Phase 21: Initial Manual Walkthrough (Baseline)** — User-driven GP + LP tours of the current app to capture a fresh baseline of feedback BEFORE any v3.0 changes are made. Output shapes subsequent phase priorities. COMPLETE 2026-04-16 — 52 observations triaged, 19 urgent items folded into Phase 22, 1 item to Phase 28 backlog.
- [~] **Phase 22: Fit & Finish — Code** — Meeting detail page, waterfall route refactor, second-fund validation, March-5 bug re-verification — **PARTIAL 2026-04-17: 11/12 plans complete (22-01 through 22-07 + 22-09 + 22-10 + 22-11 + 22-12 post-deploy gap-closures); Plan 22-08 FIN-04 deferred to Phase 23, assigned to Kathryn**
- [ ] **Phase 23: Fit & Finish — Docs & Verification Retrofit** — Waterfall conventions doc, VERIFICATION.md retrofit for v2.0 phases 12/13/14/15/18/20, traceability sync, Plan 20-10 closeout
- [ ] **Phase 24: RBAC Enforcement** — API middleware + UI hiding so role boundaries are actually enforced, not just modeled
- [ ] **Phase 25: Pagination** — Cursor-based pagination helper + apply to list endpoints + "Load more" UI for 30+ record scale
- [ ] **Phase 26: Error Boundaries** — Page-level boundaries so one malformed API response never white-screens the app
- [ ] **Phase 27: E2E Test Coverage** — Playwright lifecycle tests that lock in v2.1 CRUD behavior (currently zero regression coverage)
- [ ] **Phase 28: Final Walkthrough & Sign-off** — User verifies the full v3.0 stack feels right end-to-end; urgent triaged items from Phase 21 + Phase 28 are fixed before v3.0 ships

---

## Phase Details

### Phase 21: Initial Manual Walkthrough (Baseline)

**Goal:** Capture the GP's and an LP's first-person feedback on the current app — as it stands today, BEFORE any v3.0 work begins — so subsequent phase priorities are informed by real-world friction, not just planning assumptions.
**Size:** Small (Claude sets up the walkthrough scaffolding; the user does the clicking)
**Depends on:** Nothing (v2.1 is shipped; this is the starting point of v3.0)
**Requirements:** MAN-01, MAN-02
**Success Criteria** (what must be TRUE):
  1. `.planning/walkthroughs/v3.0-gp-baseline.md` exists with the user's comments from a GP-side tour (dashboard, deal desk, vehicles, assets, capital activity, waterfall, transactions, cap table)
  2. `.planning/walkthroughs/v3.0-lp-baseline.md` exists with the user's comments from an LP-side tour (portal accuracy, clarity, missing items) while signed in as an LP user
  3. Every walkthrough comment is triaged as "urgent — fix in v3.0" or "non-urgent — defer to v3.1+" with explicit reasoning
  4. Urgent items either fold into an existing v3.0 phase (22-27) or land in the Phase 28 follow-up backlog
  5. Phases 22-27 plans are updated in-place when they pick up urgent walkthrough items
**Plans:** 1/1 plans complete
- [x] 21-01-PLAN.md — Walkthrough scaffolding (session notes + GP + LP baseline files) → user-executed GP + LP walkthroughs → Claude triages per the locked rubric → urgent items folded into downstream P22-27 sections in-place OR into Phase 28 backlog. COMPLETE 2026-04-16.

### Phase 22: Fit & Finish — Code

**Goal:** Close the code-level v2.0/v2.1 gaps so the app is internally consistent before hardening work starts.
**Size:** Medium-to-large (original 4 items + significant additions from Phase 21 walkthrough)
**Depends on:** Phase 21 (walkthrough feedback may add items here)
**Requirements:** FIN-01, FIN-02, FIN-04, FIN-08, FIN-09, FIN-10, FIN-11, FIN-12
**Success Criteria** (what must be TRUE):
  1. Clicking a meeting in the activity feed loads a working meeting detail page (no 404); meeting list cards have click handlers routing to that detail page — FIN-01
  2. The waterfall calculate route imports its day-count and segment-walk logic from `pref-accrual.ts` (no inlined duplicate), and all 87 pref/waterfall tests still pass — FIN-02
  3. A second fund (non-PCF-II) produces the expected waterfall output against a ground-truth Excel reference, surfacing any PCF-II-specific assumptions — FIN-04
  4. The three March-5 bugs (DD tab 0%, pass rate 300%, IC memo spinner) are each formally marked resolved with evidence OR reopened with a reproduction note — FIN-08
  5. Error copy cleanup: "not authorized" is not used for non-auth failure modes across deal delete, document AI summary, and any other catch-all usages — FIN-09
  6. List sort/filter: asset class filter, entity column sort, and meetings sort/filter all work — FIN-10
  7. Integrated records: per-asset and per-entity task widgets link to `/tasks/[id]`; cap-table investors link to CRM contact records — FIN-11
  8. LP display quality: capital account statement reconciles; LP portfolio shows invested capital vs. fair value — FIN-12
**Plans:** 11/12 complete (22-01 through 22-07 + 22-09 + 22-10 + 22-11 + 22-12 executed; 22-08 deferred — see below)

- [x] 22-01-PLAN.md — Side Letter crash (Obs 35) + seed delete order (Obs 47). COMPLETE 2026-04-17.
- [x] 22-02-PLAN.md — Document Upload Wizard (Obs 40): FileUpload + FormData + DocumentFormDataSchema. COMPLETE 2026-04-17.
- [x] 22-03-PLAN.md — LP Capital Account reconciliation (LP-Obs 2): seed DLIs + distributionBreakdown API + unit tests. COMPLETE 2026-04-17.
- [x] 22-04-PLAN.md — Asset edit modal expansion (Obs 10, 12, 24, 25): type-conditional sections, sub-modals for lease/credit/valuation. COMPLETE 2026-04-17.
- [x] 22-05-PLAN.md — Meeting detail page + activity feed click-through + LP Portfolio columns (FIN-01, FIN-12 LP-Obs 3). COMPLETE 2026-04-16.
- [x] 22-06-PLAN.md — List controls + record linkage + error copy + Obs 7 investigation (FIN-09, FIN-10, FIN-11). COMPLETE 2026-04-17.
- [x] 22-07-PLAN.md — Waterfall route refactor + FIN-08 bug closeout (FIN-02, FIN-08). COMPLETE 2026-04-16.
- [ ] 22-08-PLAN.md — Second-fund Excel validation (FIN-04). **Deferred to Phase 23 — assigned to Kathryn.** Excel not delivered during Phase 22. Plan is drafted; executes once Excel is placed at fixtures/.
- [x] 22-09-PLAN.md — Phase SUMMARY, Nyquist flip, STATE/ROADMAP/REQUIREMENTS updates. COMPLETE 2026-04-17.
- [x] 22-10-PLAN.md — **Post-deploy gap-closure (added 2026-04-17).** User surfaced two gaps after the production deploy: (a) existing prod assets without child detail records silently hid the Edit Asset type-conditional fieldset, (b) Add Asset form was missing every Phase 22 addition (Entry Date, Projected IRR/Multiple, per-type scalar fieldset). Fixed `detectAssetKind` with fallback to assetClass/instrument/participation, switched PUT `/api/assets/[id]` detail writes to `upsert`, and rewrote Add Asset form to match Edit parity. COMPLETE 2026-04-17.
- [x] 22-11-PLAN.md — **Review schedule + ownership tracking (added 2026-04-17).** User asked "how do I set the asset review schedule" — turned out `reviewFrequency` / `nextReview` + `ownershipPercent` / `shareCount` / `hasBoardSeat` were all on the model but missing from the Add/Edit UI. Added new "Review & Ownership" fieldset to both forms; extended schemas + POST handler. This also makes the existing "Mark Reviewed" button on the Overview tab usable for the first time (previously `reviewFrequency` was only settable via seed). COMPLETE 2026-04-17.
- [x] 22-12-PLAN.md — **Multi-entity allocation on Create + number-field guardrails (added 2026-04-17).** Add Asset now supports repeatable entity-allocation rows (e.g., 60% Fund I / 40% Fund II) with sum-to-100 validation on both client and server; per-row cost-basis derived as `totalCostBasis × pct/100`. HTML `min`/`max` attrs added to Projected IRR, Projected Multiple, Ownership %, Share Count on both forms. Punch-list gaps #5 and structured-field half of #7 closed. COMPLETE 2026-04-17.

**Additions from Phase 21 walkthrough:**
- [x] GP Obs 3: Fix "not authorized" error copy on deal stage-gate rejection — explain the rule, not auth failure (FIN-09) CONFIRMED 2026-04-17 (22-06): deal delete handler already reads json.error and API returns descriptive 400 stage-gate message; ERR.DEAL_STAGE_GATE added to centralized taxonomy
- GP Obs 5: Investigate post-DD deal showing zero workstreams (BUG-01 variant or seed gap) — diagnose and fix (FIN-08)
- GP Obs 6: Wire activity feed entries on deal detail to be clickable/navigable — unified activity-feed component fix (FIN-01 adjacent)
- [x] GP Obs 7: Investigate and close deletion bypass that allows admin delete of IC-Review/Closing deals against stage-gate intent CLOSED 2026-04-17 (22-06): no bypass exists; Delete button conditionally rendered only for SCREENING/DEAD; API enforces same server-side; two-step Kill→DEAD→Delete is intentional
- [x] GP Obs 8: Fix asset list class filter buttons — they render but do not filter (FIN-10) CLOSED 2026-04-17 (22-06): parsePaginationParams knownParams narrowed to [firmId,cursor,limit,search]; assetClass/status/entityId now flow to params.filters
- [x] GP Obs 10: Unblock asset edit surface — entry date and other fields must be editable; HIGH priority per asset-calc thesis (Obs 20) CLOSED 2026-04-17 (22-04)
- [x] GP Obs 12: Add clear edit path for lease/contract fields on asset Overview — HIGH priority per asset-calc thesis (Obs 20) CLOSED 2026-04-17 (22-04)
- [x] GP Obs 18: Wire per-asset task tab rows to `/tasks/[id]` detail (linkage fix only — detail view exists) (FIN-11) CLOSED 2026-04-17 (22-06): AssetTasksTab task row changed from div to Link
- GP Obs 19: Wire per-asset activity feed entries to be navigable — shared fix with Obs 6 (FIN-01 adjacent)
- [x] GP Obs 21: Add column sort to entities list — no sorting currently (FIN-10) CLOSED 2026-04-17 (22-06): sortedEntities useMemo + SearchFilterBar + clickable column headers added to entities/page.tsx
- [x] GP Obs 22: Wire per-entity task widgets to `/tasks/[id]` (same fix as Obs 18, FIN-11) CLOSED 2026-04-17 (22-06): TasksInline in entity-operations-tab.tsx task row changed from div to Link
- [x] GP Obs 24: Fix "Asset Allocations" percentage label ambiguity — add tooltip clarifying semantic direction (entity's ownership stake IN asset) CLOSED 2026-04-17 (22-04)
- [x] GP Obs 25: Fix cost basis seed linkage so entity overview shows non-zero cost bases; verify UI data-entry path — HIGH priority per asset-calc thesis CLOSED 2026-04-17 (22-04)
- [x] GP Obs 27: Wire cap-table investor rows to link to Directory/CRM contact record (FIN-11) CONFIRMED 2026-04-17 (22-06): all four link sites already wired in entity-cap-table-tab.tsx (lines 444, 486, 565, 676)
- GP Obs 35: Fix Add Side Letter form crash — TypeError on `entities.map` due to v2.1 response shape change; normalize endpoint or safe-unwrap — BLOCKER
- [x] GP Obs 39: Fix "unauthorized" error copy on document AI summary — explain condition and next action (FIN-09) CLOSED 2026-04-17 (22-06): document-extraction-panel NONE state now shows ERR.DOC_EXTRACT_NO_AI when AI key absent
- GP Obs 40: Fix document upload wizard — stuck on step 1, cannot advance — BLOCKER
- [x] GP Obs 44: Fix meetings list sort/filter (FIN-10) CLOSED 2026-04-17 (22-06): sortedMeetings useMemo + sort buttons UI added to meetings/page.tsx
- GP Obs 47: Fix seed delete order — add `deleteMany` for `AssetExpense`, `AssetIncome`, `AssetValuation` before `asset.deleteMany()` in seed.ts
- LP-Obs 2: Fix LP Capital Account distribution total reconciliation — $14M total vs $8M accounted for gap is unacceptable for real LP use — BLOCKER (FIN-12)
- LP-Obs 3: Add invested capital + current fair value columns to LP Portfolio view per holding (FIN-12)

### Phase 23: Fit & Finish — Docs & Verification Retrofit

**Goal:** Bring the planning system back into sync with reality — write the conventions doc that the v2.1 waterfall work was missing, and retrofit VERIFICATION.md + traceability for the v2.0 phases that never got them.
**Size:** Small-to-medium (mostly writing and checkbox synchronization, no code changes)
**Depends on:** Phase 22 (code-level changes feed into what the docs describe)
**Requirements:** FIN-03, FIN-05, FIN-06, FIN-07
**Success Criteria** (what must be TRUE):
  1. A human reading `docs/waterfall-conventions.md` can explain the 30/360 inclusive day count, ROC effective-date rule, and PIC-weighted pref methodology without consulting code — FIN-03
  2. VERIFICATION.md exists for v2.0 Phases 12, 13, 14, 15, 18, and 20 — FIN-05
  3. REQUIREMENTS.md traceability is consistent: TASK-01..05 checked, Phase 20 INTEG/SCHEMA/UIPOL present, FIN-07/FIN-10 notes corrected (referring to v2.0's naming, not v3.0's) — FIN-06
  4. Plan 20-10 (final human verification checkpoint for v2.0) has a SUMMARY.md documenting user-facing acceptance of v2.0 polish work — FIN-07
**Plans:** TBD (likely 2 plans: conventions doc + traceability sync, VERIFICATION.md retrofit + Plan 20-10 closeout)

**Additions from Phase 21 walkthrough:**
- GP Obs 11: Add tooltip to asset Overview "Next Review" date explaining how the date is determined (auto-computed, manually set, or rolled from last review). Pure documentation/UI copy — no code logic change.

### Phase 24: RBAC Enforcement

**Goal:** Actually enforce the four role levels (GP_ADMIN, GP_TEAM, SERVICE_PROVIDER, LP_INVESTOR) across every API route and the UI, so the roles-on-paper from v1.0 become roles-in-practice.
**Size:** Medium (middleware + per-route scoping + UI hiding + audit logging)
**Depends on:** Phases 22 + 23 (clean baseline) — runs before E2E so E2E can test role enforcement
**Requirements:** RBAC-01, RBAC-02, RBAC-03, RBAC-04, RBAC-05
**Success Criteria** (what must be TRUE):
  1. An LP_INVESTOR user hitting any non-LP API route gets a 403, not data
  2. A SERVICE_PROVIDER user can only see entities they're explicitly assigned to in `User.entityAccess`; hitting any other firm's entity returns 403
  3. A GP_TEAM user attempting admin-only mutation routes (user management, firm settings, AI config) gets 403 — those endpoints only accept GP_ADMIN
  4. The sidebar, top bar, and in-page action buttons do not render items the current user cannot access (items are hidden, not just disabled)
  5. Every role-check rejection produces a structured audit-log entry (who, what route, what role) an admin can query
**Plans:** TBD (likely 3 plans: middleware + route tagging, UI hiding + navigation filtering, audit log + admin view)

### Phase 25: Pagination

**Goal:** Keep the app responsive at 30+ LPs / 30+ assets by cursor-paginating list endpoints and giving list UIs a "Load more" affordance.
**Size:** Medium (one reusable helper + apply across ~7 list endpoints + UI pattern)
**Depends on:** Phase 24. Independent of later phases.
**Requirements:** PAGE-01, PAGE-02, PAGE-03, PAGE-04
**Success Criteria** (what must be TRUE):
  1. A developer can call a reusable `pagination.ts` helper to add `?cursor=X&limit=N` paging to any new list endpoint without rewriting the convention
  2. The deals, assets, transactions (capital calls + distributions), investors, tasks, documents, and contacts list endpoints all return paginated results by default
  3. List pages display 25–50 rows by default with a "Load more" button that appends the next page (no full re-fetch, no scroll reset)
  4. A 100-row list endpoint returns in under 500ms at 30-LP seeded-dataset scale (measured, recorded in verification)
**Plans:** TBD (likely 3 plans: helper + convention, apply to 7 endpoints, UI Load-more pattern + perf measurement)

### Phase 26: Error Boundaries

**Goal:** Make a single malformed API response unable to white-screen the whole app — every main route degrades gracefully with a visible retry path.
**Size:** Small (a boundary component + wiring on every main route)
**Depends on:** Phase 22. Independent of RBAC and Pagination.
**Requirements:** ERR-01, ERR-02, ERR-03
**Success Criteria** (what must be TRUE):
  1. Every main route under `(gp)/` and `(lp)/` is wrapped in a page-level `<ErrorBoundary>` — a thrown render error on one tab does not take down the rest of the app
  2. When a boundary catches an error, the user sees a friendly "Something went wrong" panel with a Retry button that re-fetches the failing data (not a blank page, not a raw stack trace)
  3. Every caught error emits a structured log entry with route, user, and error context so the admin can debug from logs alone
**Plans:** TBD (likely 1-2 plans: boundary component + wiring + log contract + manual failure simulation)

### Phase 27: E2E Test Coverage

**Goal:** Lock in Kathryn's v2.1 CRUD + waterfall work with Playwright lifecycle tests so future regressions are caught automatically, not discovered in prod.
**Size:** Medium (Playwright setup + Clerk helper + 5 lifecycle suites)
**Depends on:** Phase 24 (so E2E exercises the role-enforced routes as a realistic GP_ADMIN user); Phases 25-26 nice-to-have before so tests don't flap on pagination or boundary quirks
**Requirements:** E2E-01, E2E-02, E2E-03, E2E-04, E2E-05, E2E-06
**Success Criteria** (what must be TRUE):
  1. `npm run test:e2e` signs in as `user-jk` via a Clerk auth helper and runs the full suite against a seeded dev database without manual intervention
  2. The capital-call lifecycle test drives create → edit line items → issue → fund → revert → delete and asserts each state change persists correctly
  3. The distribution lifecycle test drives create-with-waterfall → preview → per-investor override → approve → paid → revert → delete
  4. The commitment and waterfall-template lifecycle tests each cover create → edit → assign → delete end to end
  5. A cap-table consistency test verifies that creating, editing, and deleting commitments leaves no phantom balances on the cap table
**Plans:** TBD (likely 3 plans: Playwright + Clerk setup, capital-call + distribution suites, commitment + waterfall + cap-table suites)

### Phase 28: Final Walkthrough & Sign-off

**Goal:** Before v3.0 ships, the user personally verifies the entire v3.0 stack (fit & finish + RBAC + pagination + error boundaries + E2E) feels right end-to-end. Any urgent follow-ups from Phase 21 that weren't absorbed into Phases 22-27, plus any new urgent items from this final walkthrough, are fixed before sign-off.
**Size:** Small-to-medium (walkthrough scaffolding + a variable-sized fix batch, capped at "urgent-only")
**Depends on:** Phases 22-27 (the full stack must be in place to feel-check it). Also consumes any still-open urgent items from Phase 21.
**Requirements:** MAN-03, MAN-04
**Success Criteria** (what must be TRUE):
  1. `.planning/walkthroughs/v3.0-final-signoff.md` exists and captures the user's verdict on the full v3.0 stack — fit & finish, RBAC (correct items hidden per role), pagination ("no where-did-the-old-ones-go?" moments), error-boundary behavior when a route is intentionally broken, E2E coverage
  2. Every walkthrough comment from MAN-01, MAN-02, and MAN-03 that was triaged "urgent" either has a closing commit or a written reason it was re-classified as deferred
  3. A final v3.0 sign-off note confirms no urgent walkthrough items remain open and lists the non-urgent items moving to v3.1+
**Plans:** TBD (likely 2 plans: walkthrough scaffolding + execution, triaged follow-up fix batch)

---

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1-10. v1.0 Phases | v1.0 | 36/36 | Complete | 2026-03-08 |
| 11. Foundation | v2.0 | 5/5 | Complete | 2026-03-09 |
| 12. AI Configuration & Document Intake | v2.0 | 5/5 | Complete | 2026-03-09 |
| 13. Deal Desk & CRM | v2.0 | 5/5 | Complete | 2026-03-09 |
| 14. Asset Management & Task Management | v2.0 | 7/7 | Complete | 2026-03-10 |
| 15. Entity Management & Meeting Intelligence | v2.0 | 8/8 | Complete | 2026-03-10 |
| 16. Capital Activity | v2.0 | 6/6 | Complete | 2026-03-10 |
| 17. LP Portal | v2.0 | 3/3 | Complete | 2026-03-10 |
| 18. AI Features | v2.0 | 4/4 | Complete | 2026-03-10 |
| 19. Dashboard & Supporting Modules | v2.0 | 5/5 | Complete | 2026-03-10 |
| 20. Schema Cleanup & UI Polish | v2.0 | 10/10 | Complete | 2026-03-11 |
| v2.1 (retroactive, off-GSD) | v2.1 | N/A (71 commits) | In Review | 2026-04-09 (last commit) |
| 21. Initial Manual Walkthrough (Baseline) | v3.0 | 1/1 | Complete | 2026-04-16 |
| 22. Fit & Finish — Code | v3.0 | 11/12 complete + 1 carry-forward | Partial — FIN-04 Excel carry-forward to Phase 23 (Kathryn); 22-10 + 22-11 + 22-12 post-deploy gap-closures shipped | 2026-04-17 |
| 23. Fit & Finish — Docs & Verification Retrofit | v3.0 | 0/TBD | Not started | — |
| 24. RBAC Enforcement | v3.0 | 0/TBD | Not started | — |
| 25. Pagination | v3.0 | 0/TBD | Not started | — |
| 26. Error Boundaries | v3.0 | 0/TBD | Not started | — |
| 27. E2E Test Coverage | v3.0 | 0/TBD | Not started | — |
| 28. Final Walkthrough & Sign-off | v3.0 | 0/TBD | Not started | — |
