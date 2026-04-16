# Requirements: Atlas v3.0 — Consolidation & Scale Readiness

**Defined:** 2026-04-16
**Core Value:** GP team can manage the full deal-to-asset lifecycle and see accurate fund/LP metrics in one place, replacing spreadsheets and emails with a single AI-powered operating system that scales from where they are today to $1B AUM.

**Milestone goal:** Close accumulated v2.0/v2.1 gaps (fit & finish), then harden for 2–3x growth (30 LPs, 30 assets): RBAC enforcement, pagination, error boundaries, and E2E test coverage on v2.1 CRUD work.

---

## v3.0 Requirements

### Fit & Finish (close v2.0/v2.1 gaps)

- [ ] **FIN-01**: User clicking a meeting in the activity feed lands on a meeting detail page (not 404)
- [ ] **FIN-02**: The waterfall calculate route imports day-count and segment-walk helpers from `pref-accrual.ts` (no inlined duplicate)
- [ ] **FIN-03**: `docs/waterfall-conventions.md` exists and documents the 30/360 inclusive convention, ROC effective-date rule, and PIC-weighted inception-to-date pref methodology
- [ ] **FIN-04**: Waterfall produces correct results for at least one fund other than CG Private Credit Fund II, verified by a second ground-truth Excel reference
- [ ] **FIN-05**: VERIFICATION.md files exist for v2.0 phases 12, 13, 14, 15, 18, and 20
- [ ] **FIN-06**: REQUIREMENTS.md traceability is consistent: all TASK-01..05 checkboxes marked complete, Phase 20 INTEG/SCHEMA/UIPOL requirements present, FIN-07/FIN-10 v2.0 notes corrected
- [ ] **FIN-07**: Plan 20-10 (final human verification checkpoint) has a SUMMARY.md documenting user-facing acceptance of v2.0 polish work
- [ ] **FIN-08**: The three March-5 bugs (DD tab 0%, pass rate 300%, IC memo spinner) are verified resolved on current main or formally filed if any remain

### RBAC Enforcement

- [ ] **RBAC-01**: API middleware rejects LP_INVESTOR users from any route under `/api/` that is not explicitly LP-accessible (e.g., `/api/lp/*`)
- [ ] **RBAC-02**: SERVICE_PROVIDER role sees only entities they are explicitly assigned to via `User.entityAccess`; cannot access other firms' data
- [ ] **RBAC-03**: GP_TEAM users cannot access admin-only mutation routes (user management, firm settings, AI config) — those require GP_ADMIN
- [ ] **RBAC-04**: Role-check failures are logged to an audit trail so the admin can see unauthorized access attempts
- [ ] **RBAC-05**: UI hides (does not just disable) navigation items and actions the user cannot access based on their role

### Pagination

- [ ] **PAGE-01**: A reusable cursor-based pagination helper is available in `src/lib/pagination.ts` with consistent query-string conventions (`?cursor=X&limit=N`)
- [ ] **PAGE-02**: List endpoints for deals, assets, transactions (capital calls + distributions), investors, tasks, documents, and contacts return paginated results by default
- [ ] **PAGE-03**: List page UIs show 25–50 rows by default with a "Load more" button that appends the next page without full re-fetch
- [ ] **PAGE-04**: Page load time for a 100-row list endpoint returns in under 500ms at 30-LP scale (measured with seeded dataset)

### Error Boundaries

- [ ] **ERR-01**: A page-level `<ErrorBoundary>` wraps every main route under `(gp)/` and `(lp)/` so a single malformed API response does not white-screen the app
- [ ] **ERR-02**: The error boundary shows a user-friendly "Something went wrong" message with a Retry button that re-fetches the failed data
- [ ] **ERR-03**: Errors caught by a boundary are logged to the structured logger with route, user, and error context for later debugging

### E2E Tests for CRUD (locks in v2.1 work)

- [ ] **E2E-01**: Playwright is configured with a Clerk auth helper that signs in as `user-jk` (James Kim, GP_ADMIN) and runs against a seeded dev database
- [ ] **E2E-02**: E2E test covers capital call lifecycle: create draft → add line items → edit amounts → issue → mark funded → revert to draft → delete
- [ ] **E2E-03**: E2E test covers distribution lifecycle: create with waterfall template → preview allocations → override per-investor amount → approve → mark paid → revert to draft → delete
- [ ] **E2E-04**: E2E test covers commitment lifecycle: create commitment → assign unit class → edit amount → delete
- [ ] **E2E-05**: E2E test covers waterfall template lifecycle: create template → add pref + catch-up + carry tiers → edit tier splits → assign to vehicle → delete template
- [ ] **E2E-06**: E2E test verifies cap table totals remain consistent after creating, editing, and deleting commitments (no phantom balances)

### Manual Walkthrough & Feedback

These are user-driven checkpoint phases. Claude sets up the walkthrough (script, seed data, checklist) but the user clicks through the app, captures comments, and files them as follow-up fixes. Each walkthrough's output is a written feedback doc + any urgent bugs triaged into the plan.

- [ ] **MAN-01**: GP-side manual walkthrough after Fit & Finish — user tours dashboard, deal desk, vehicles, assets, capital activity, waterfall, transactions, cap table with note-taking checklist; output = `.planning/walkthroughs/v3.0-gp-post-fix.md` + triaged follow-up items
- [ ] **MAN-02**: LP-side manual walkthrough after Fit & Finish — user signs in as an LP, tours portal, captures feedback on accuracy, clarity, what's missing; output = `.planning/walkthroughs/v3.0-lp-post-fix.md` + triaged follow-ups
- [ ] **MAN-03**: Post-hardening manual walkthrough — user verifies RBAC feels right (correct items hidden per role), pagination feels right (no "where did the old ones go?"), error boundaries behave gracefully when a route is broken; output = `.planning/walkthroughs/v3.0-post-hardening.md` + triaged follow-ups
- [ ] **MAN-04**: Follow-up fixes from walkthroughs — any items triaged as "urgent" from MAN-01/02/03 are fixed before v3.0 is considered done. Non-urgent items deferred to v3.1 with explicit reasoning.

---

## Deferred to v3.1+ (tracked, not in this roadmap)

### Observability

- **OBS-01**: Rate limiting middleware on AI endpoints to cap spend per user per hour
- **OBS-02**: Lightweight error tracker (Sentry or similar) for prod error visibility
- **OBS-03**: Structured performance metrics (request latency p50/p95/p99) exposed to dashboard

### Performance

- **PERF-01**: Route-level code splitting / lazy loading for less-used routes (analytics, reports, settings)
- **PERF-02**: Bundle size budget enforced in CI

### Background Jobs

- **BG-01**: Queue runner (BullMQ or Trigger.dev or Vercel Cron) for deferred work
- **BG-02**: Move notification dispatch (email + SMS) off the request path
- **BG-03**: Move AI analysis (IC memo generation, document extraction) off the request path
- **BG-04**: Nightly accounting sync (QBO) as a scheduled job

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native mobile app | PWA later, native much later |
| SOC 2 compliance audit | Build toward it, not yet (v3.0 hardening is a foundation, not certification) |
| Multi-currency support | USD only for foreseeable future |
| Secondary market transaction support | Out of scope for family office OS |
| Automated wire initiation | Too much regulatory surface area |
| Investor onboarding / subscription docs | Manual for now |
| Advanced analytics / benchmarking | Revisit post-v3.x |
| White-labeling / custom branding | Single-tenant deployment |
| Real-time chat/messaging | Overkill for 3-person GP team |
| Third fund waterfall validation | v3.0 asks for one additional fund (FIN-04); more than two is post-v3.0 |

---

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIN-01 | Phase 21 | Pending |
| FIN-02 | Phase 21 | Pending |
| FIN-03 | Phase 21 | Pending |
| FIN-04 | Phase 21 | Pending |
| FIN-05 | Phase 21 | Pending |
| FIN-06 | Phase 21 | Pending |
| FIN-07 | Phase 21 | Pending |
| FIN-08 | Phase 21 | Pending |
| MAN-01 | Phase 22 | Pending |
| MAN-02 | Phase 22 | Pending |
| RBAC-01 | Phase 23 | Pending |
| RBAC-02 | Phase 23 | Pending |
| RBAC-03 | Phase 23 | Pending |
| RBAC-04 | Phase 23 | Pending |
| RBAC-05 | Phase 23 | Pending |
| PAGE-01 | Phase 24 | Pending |
| PAGE-02 | Phase 24 | Pending |
| PAGE-03 | Phase 24 | Pending |
| PAGE-04 | Phase 24 | Pending |
| ERR-01 | Phase 25 | Pending |
| ERR-02 | Phase 25 | Pending |
| ERR-03 | Phase 25 | Pending |
| E2E-01 | Phase 26 | Pending |
| E2E-02 | Phase 26 | Pending |
| E2E-03 | Phase 26 | Pending |
| E2E-04 | Phase 26 | Pending |
| E2E-05 | Phase 26 | Pending |
| E2E-06 | Phase 26 | Pending |
| MAN-03 | Phase 27 | Pending |
| MAN-04 | Phase 27 | Pending |

**Coverage:**
- v3.0 requirements: 30 total
- Mapped to phases: 30 ✓
- Unmapped: 0

---

*Requirements defined: 2026-04-16*
*Last updated: 2026-04-16 after v3.0 roadmap created (phases 21-27)*
