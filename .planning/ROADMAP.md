# Atlas — GSD Roadmap

## Milestones

- ✅ **v1.0 GP Production Ready** — Phases 1-10 (shipped 2026-03-08) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Intelligence Platform** — Phases 11-20 (shipped 2026-03-18) — [archive](milestones/v2.0-ROADMAP.md)
- 🔶 **v2.1 CRUD Completion & Waterfall Correctness** — retroactive, 71 commits 2026-03-24 → 2026-04-09 (Kathryn, off-GSD) — [archive](milestones/v2.1-ROADMAP.md)
- 🟢 **v3.0 Consolidation & Scale Readiness** — Phases 21-27 (kicked off 2026-04-16, in progress)

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

## v3.0 Consolidation & Scale Readiness (Phases 21-27)

**Goal:** Close accumulated v2.0/v2.1 gaps (fit & finish), then harden for 2–3x growth scale (30 LPs, 30 assets) with RBAC enforcement, pagination, error boundaries, and E2E coverage on v2.1 CRUD work.

**Requirements:** 30 total across 6 categories (FIN × 8, MAN × 4, RBAC × 5, PAGE × 4, ERR × 3, E2E × 6).

**Size:** 7 phases, mostly small-to-medium (consolidation work — no new feature surface).

### Phases

- [ ] **Phase 21: Fit & Finish** — Close all 8 accumulated v2.0/v2.1 gaps (meeting detail page, waterfall refactor, docs, verification retrofit, bug re-verification)
- [ ] **Phase 22: Post-Fit-&-Finish Manual Walkthrough** — User-driven GP + LP tours to capture feedback on the consolidated app before hardening begins
- [ ] **Phase 23: RBAC Enforcement** — API middleware + UI hiding so role boundaries are actually enforced, not just modeled
- [ ] **Phase 24: Pagination** — Cursor-based pagination helper + apply to list endpoints + "Load more" UI for 30+ record scale
- [ ] **Phase 25: Error Boundaries** — Page-level boundaries so one malformed API response never white-screens the app
- [ ] **Phase 26: E2E Test Coverage** — Playwright lifecycle tests that lock in v2.1 CRUD behavior (currently zero regression coverage)
- [ ] **Phase 27: Post-Hardening Walkthrough & Follow-up Fixes** — User verifies RBAC/pagination/error-boundaries feel right; urgent triaged items fixed before v3.0 sign-off

---

## Phase Details

### Phase 21: Fit & Finish

**Goal:** Close every accumulated v2.0/v2.1 fit-and-finish gap so the app is internally consistent before hardening work starts.
**Size:** Medium (8 discrete retrofits — mostly documentation and small refactors, plus one new page)
**Depends on:** Nothing (v2.1 is shipped)
**Requirements:** FIN-01, FIN-02, FIN-03, FIN-04, FIN-05, FIN-06, FIN-07, FIN-08
**Success Criteria** (what must be TRUE):
  1. Clicking a meeting in the activity feed loads a working meeting detail page (no 404)
  2. The waterfall calculate route imports its day-count and segment-walk logic from `pref-accrual.ts` (no inlined duplicate), and all 87 pref/waterfall tests still pass
  3. A human reading `docs/waterfall-conventions.md` can explain the 30/360 inclusive day count, ROC effective-date rule, and PIC-weighted pref methodology without consulting code
  4. A second fund (non-PCF-II) produces the expected waterfall output against a ground-truth Excel reference, surfacing any PCF-II-specific assumptions
  5. VERIFICATION.md exists for v2.0 Phases 12, 13, 14, 15, 18, 20, and REQUIREMENTS.md traceability shows consistent checkbox state across v2.0 + v2.1 + v3.0 entries
  6. The three March-5 bugs (DD tab 0%, pass rate 300%, IC memo spinner) are each formally marked resolved with evidence OR reopened with a reproduction note
**Plans:** TBD (plan-phase will decompose — likely 3-4 plans: meeting page, waterfall refactor + second-fund validation, verification/traceability retrofit, bug re-verification + Plan 20-10 closeout)

### Phase 22: Post-Fit-&-Finish Manual Walkthrough

**Goal:** Capture the GP's and an LP's first-person feedback on the fully-consolidated app before hardening work starts, so hardening priorities are shaped by real user reactions.
**Size:** Small (Claude sets up the walkthrough scaffolding; the user does the clicking)
**Depends on:** Phase 21 (walkthroughs must run against a fit-and-finished build)
**Requirements:** MAN-01, MAN-02
**Success Criteria** (what must be TRUE):
  1. `.planning/walkthroughs/v3.0-gp-post-fix.md` exists with the user's comments from a GP-side tour (dashboard, deal desk, vehicles, assets, capital activity, waterfall, transactions, cap table)
  2. `.planning/walkthroughs/v3.0-lp-post-fix.md` exists with the user's comments from an LP-side tour (portal accuracy, clarity, missing items) while signed in as an LP user
  3. Every walkthrough comment is triaged as "urgent — fix now" or "non-urgent — defer" with explicit reasoning
  4. Urgent items become tracked todos (either added to a later v3.0 phase or MAN-04 backlog); non-urgent items are logged with deferral rationale
**Plans:** TBD (likely 1 plan: Claude writes scripts + checklists + seed-data notes, user executes walkthroughs, Claude captures feedback in the two walkthrough files)

### Phase 23: RBAC Enforcement

**Goal:** Actually enforce the four role levels (GP_ADMIN, GP_TEAM, SERVICE_PROVIDER, LP_INVESTOR) across every API route and the UI, so the roles-on-paper from v1.0 become roles-in-practice.
**Size:** Medium (middleware + per-route scoping + UI hiding + audit logging)
**Depends on:** Phase 21 (clean baseline) — runs before E2E so E2E can test role enforcement
**Requirements:** RBAC-01, RBAC-02, RBAC-03, RBAC-04, RBAC-05
**Success Criteria** (what must be TRUE):
  1. An LP_INVESTOR user hitting any non-LP API route gets a 403, not data
  2. A SERVICE_PROVIDER user can only see entities they're explicitly assigned to in `User.entityAccess`; hitting any other firm's entity returns 403
  3. A GP_TEAM user attempting admin-only mutation routes (user management, firm settings, AI config) gets 403 — those endpoints only accept GP_ADMIN
  4. The sidebar, top bar, and in-page action buttons do not render items the current user cannot access (items are hidden, not just disabled)
  5. Every role-check rejection produces a structured audit-log entry (who, what route, what role) an admin can query
**Plans:** TBD (likely 3 plans: middleware + route tagging, UI hiding + navigation filtering, audit log + admin view)

### Phase 24: Pagination

**Goal:** Keep the app responsive at 30+ LPs / 30+ assets by cursor-paginating list endpoints and giving list UIs a "Load more" affordance.
**Size:** Medium (one reusable helper + apply across ~7 list endpoints + UI pattern)
**Depends on:** Phase 21. Independent of Phase 23 (can run in parallel if needed, but sequencing it after RBAC keeps the changes layered).
**Requirements:** PAGE-01, PAGE-02, PAGE-03, PAGE-04
**Success Criteria** (what must be TRUE):
  1. A developer can call a reusable `pagination.ts` helper to add `?cursor=X&limit=N` paging to any new list endpoint without rewriting the convention
  2. The deals, assets, transactions (capital calls + distributions), investors, tasks, documents, and contacts list endpoints all return paginated results by default
  3. List pages display 25–50 rows by default with a "Load more" button that appends the next page (no full re-fetch, no scroll reset)
  4. A 100-row list endpoint returns in under 500ms at 30-LP seeded-dataset scale (measured, recorded in verification)
**Plans:** TBD (likely 3 plans: helper + convention, apply to 7 endpoints, UI Load-more pattern + perf measurement)

### Phase 25: Error Boundaries

**Goal:** Make a single malformed API response unable to white-screen the whole app — every main route degrades gracefully with a visible retry path.
**Size:** Small (a boundary component + wiring on every main route)
**Depends on:** Phase 21. Independent of Phases 23 and 24.
**Requirements:** ERR-01, ERR-02, ERR-03
**Success Criteria** (what must be TRUE):
  1. Every main route under `(gp)/` and `(lp)/` is wrapped in a page-level `<ErrorBoundary>` — a thrown render error on one tab does not take down the rest of the app
  2. When a boundary catches an error, the user sees a friendly "Something went wrong" panel with a Retry button that re-fetches the failing data (not a blank page, not a raw stack trace)
  3. Every caught error emits a structured log entry with route, user, and error context so the admin can debug from logs alone
**Plans:** TBD (likely 1-2 plans: boundary component + wiring + log contract + manual failure simulation)

### Phase 26: E2E Test Coverage

**Goal:** Lock in Kathryn's v2.1 CRUD + waterfall work with Playwright lifecycle tests so future regressions are caught automatically, not discovered in prod.
**Size:** Medium (Playwright setup + Clerk helper + 5 lifecycle suites)
**Depends on:** Phase 23 (so E2E exercises the role-enforced routes as a realistic GP_ADMIN user); Phases 24-25 nice-to-have before so tests don't flap on pagination or boundary quirks
**Requirements:** E2E-01, E2E-02, E2E-03, E2E-04, E2E-05, E2E-06
**Success Criteria** (what must be TRUE):
  1. `npm run test:e2e` signs in as `user-jk` via a Clerk auth helper and runs the full suite against a seeded dev database without manual intervention
  2. The capital-call lifecycle test drives create → edit line items → issue → fund → revert → delete and asserts each state change persists correctly
  3. The distribution lifecycle test drives create-with-waterfall → preview → per-investor override → approve → paid → revert → delete
  4. The commitment and waterfall-template lifecycle tests each cover create → edit → assign → delete end to end
  5. A cap-table consistency test verifies that creating, editing, and deleting commitments leaves no phantom balances on the cap table
**Plans:** TBD (likely 3 plans: Playwright + Clerk setup, capital-call + distribution suites, commitment + waterfall + cap-table suites)

### Phase 27: Post-Hardening Walkthrough & Follow-up Fixes

**Goal:** Before v3.0 ships, the user personally verifies the hardening work feels right end-to-end and any urgent follow-ups from all three walkthroughs are fixed.
**Size:** Small-to-medium (walkthrough scaffolding + a variable-sized fix batch, capped at "urgent-only")
**Depends on:** Phases 23, 24, 25, 26 (hardening must be in place to feel-check it). Also consumes any urgent items still open from Phase 22.
**Requirements:** MAN-03, MAN-04
**Success Criteria** (what must be TRUE):
  1. `.planning/walkthroughs/v3.0-post-hardening.md` exists and captures the user's verdict on: RBAC (correct items hidden per role), pagination ("no where-did-the-old-ones-go?" moments), and error-boundary behavior when a route is intentionally broken
  2. Every walkthrough comment from MAN-01, MAN-02, and MAN-03 is triaged "urgent" or "deferred to v3.1+" with explicit reasoning written down
  3. Every item triaged "urgent" has a closing commit or a written reason it was re-classified as deferred
  4. A final v3.0 sign-off note confirms no urgent walkthrough items remain open and lists the non-urgent items moving to v3.1+
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
| 21. Fit & Finish | v3.0 | 0/TBD | Not started | — |
| 22. Post-Fit-&-Finish Manual Walkthrough | v3.0 | 0/TBD | Not started | — |
| 23. RBAC Enforcement | v3.0 | 0/TBD | Not started | — |
| 24. Pagination | v3.0 | 0/TBD | Not started | — |
| 25. Error Boundaries | v3.0 | 0/TBD | Not started | — |
| 26. E2E Test Coverage | v3.0 | 0/TBD | Not started | — |
| 27. Post-Hardening Walkthrough & Follow-up Fixes | v3.0 | 0/TBD | Not started | — |
