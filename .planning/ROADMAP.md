# Atlas — GSD Roadmap

## Milestone 1: GP Production Ready

**Goal:** The GP team (GP, CFO, CIO) can manage real deals, real assets, and real capital activity reliably in Atlas — replacing spreadsheets and emails for day-to-day fund operations.

**Starting point:** Atlas is deployed on Vercel with real Clerk auth and real data. ~70% of features are built. Financial computation code exists but is unverified. Several features have never been tested end-to-end.

**Total phases:** 7
**Current phase:** Phase 8 (gap closure)
**Total phases:** 9

---

## Phase 1: Verify & Stabilize

**Goal:** Test everything that's built. Establish ground truth about what works vs what's broken. Fix bugs found during verification.

**Requirements:** VERIFY-01, VERIFY-02, VERIFY-03, VERIFY-04, VERIFY-05, BUG-01, BUG-02, BUG-03

**Success Criteria:**
- [ ] Financial computation engines (IRR, waterfall, capital accounts) tested against known-good inputs — verified correct or bugs identified and fixed
- [ ] Slack IC voting tested with real Slack workspace — verified working or issues documented
- [ ] Full deal pipeline tested end-to-end (screen -> DD -> IC -> close -> asset creation) — all stages work
- [ ] Capital call and distribution workflows tested — create, save, verify data flows correctly
- [ ] 3 known bugs re-checked: DD tab %, pass rate 300%, IC Memo spinner — fixed if still present
- [ ] Ground truth document created: what works, what's broken, what's missing

**Plans:** 3/3 plans complete

Plans:
- [x] 01-01-PLAN.md — Verify computation engines (IRR, waterfall, capital accounts) with test suites
- [x] 01-02-PLAN.md — Diagnose/fix 3 known bugs + verify deal pipeline end-to-end
- [x] 01-03-PLAN.md — Verify capital workflows + Slack integration + create ground truth document

**Progress:** 3/3 plans complete — PHASE COMPLETE

---

## Phase 2: Deal Desk End-to-End

**Goal:** Perfect the full deal lifecycle from screening through closing and deal-to-asset transition. This is the GP team's primary daily workflow. Includes: deal creation with validation, AI-powered overview dashboard, interactive DD workstreams, decision-making structures (IC), closing checklist with attachments, multi-entity deal participation, entity formation at any stage, deal-to-asset transition with data carry-over, pipeline analytics, kill/revive deal flow.

**Requirements:** DEAL-01, DEAL-02, DEAL-03, DEAL-04, DEAL-05, DEAL-06, DEAL-07, DEAL-08, DEAL-09, DEAL-10, ASSET-01

**Success Criteria:**
- [ ] Deal creation wizard shows validation errors when required fields are missing
- [ ] Deal overview tab displays as a 4-section dashboard with AI-extracted metadata
- [ ] DD workstreams function as PM-style tasks with assignees, comments, attachments
- [ ] IC Review has in-app voting with configurable decision structures
- [ ] Closing checklist works end-to-end with custom items, file attachments, warn-on-incomplete
- [ ] Entity formation can be triggered from deal at any stage (multi-entity via junction table)
- [ ] Deal close creates asset with full metadata carryover and auto-redirect
- [ ] Inline edit fields save reliably on blur/Enter
- [ ] Kill/revive deal flow with required reasons
- [ ] Asset detail pages polished with source deal attribution and AI intelligence
- [ ] Pipeline analytics page with value-by-stage, time-in-stage, velocity metrics

**Plans:** 7 plans

Plans:
- [x] 02-01-PLAN.md — Wave 1: Schema consolidation (all data model changes for Phase 2)
- [x] 02-02-PLAN.md — Wave 2: Deal wizard validation + inline edit + kill/revive
- [x] 02-03-PLAN.md — Wave 3: Closing workflow + deal-to-asset + multi-entity (depends on 02-02)
- [x] 02-04-PLAN.md — Wave 2: Deal overview dashboard + AI metadata extraction
- [x] 02-05-PLAN.md — Wave 3: DD workstreams interactive PM-style redesign
- [x] 02-06-PLAN.md — Wave 3: IC Review decision structures + in-app voting (depends on 02-02)
- [x] 02-07-PLAN.md — Wave 4: Asset detail polish + pipeline analytics (depends on 02-02, 02-03, 02-04)

**Progress:** 7/7 plans complete — PHASE COMPLETE

---

## Phase 3: Capital Activity

**Goal:** Capital calls, distributions, capital accounts, and waterfall calculations all work correctly with real data. The GP team can manage capital activity reliably.

**Requirements:** FIN-01, FIN-02, FIN-03, FIN-04, FIN-05, FIN-06

**Success Criteria:**
- [ ] Capital accounts compute correctly from actual capital call/distribution data
- [ ] Waterfall calculation engine applies tier logic with correct LP/GP splits and hurdle rates
- [ ] IRR is computed correctly from real cash flow data
- [ ] TVPI, DPI, RVPI are computed from actual commitments, distributions, and NAV
- [ ] MOIC consistently computed from cost basis and fair value
- [ ] Management fees and carried interest calculated per entity rules

**Plans:** 3/3 plans complete

Plans:
- [x] 03-01-PLAN.md — Wave 1: Schema consolidation + capital call/distribution line item APIs + status workflows + transaction chains
- [x] 03-02-PLAN.md — Wave 2: Waterfall enhancement (configurable carry, pref return, clawback, GP co-invest) + fee calculation engine (depends on 03-01)
- [x] 03-03-PLAN.md — Wave 2: Metrics wiring to entity detail + GP dashboard + capital account ledger + NAV refinement (depends on 03-01)

**Progress:** 3/3 plans complete — PHASE COMPLETE

---

## Phase 4: Asset & Entity Polish

**Goal:** Asset management, entity management, and core infrastructure hardened for daily GP use. Dashboard redesigned as a "morning briefing" with entity cards, portfolio aggregates, and LP comparison. Side letter rules applied to fees. Role-based access enforced. All lists paginated with search and filters.

**Requirements:** FIN-07, FIN-08, FIN-09, FIN-10, ASSET-02, CORE-02, CORE-03, CORE-04, CORE-05, CORE-06

**Success Criteria:**
- [x] Side letter rules modify fee calculations per LP per entity (FIN-07, 04-01)
- [x] Fund-level and LP-level performance aggregated from underlying computations (FIN-08, 04-04)
- [x] Cross-entity NAV dashboard shows all entities with expandable detail (ASSET-02, 04-04)
- [x] LP comparison view shows all LPs with TVPI/DPI/RVPI/IRR per entity (FIN-09, 04-04)
- [x] Each asset's contribution to fund returns computed and rankable with projected vs actual (FIN-10, 04-05)
- [x] Role-based access enforced (GP_ADMIN full, GP_TEAM configurable, SERVICE_PROVIDER scoped)
- [x] All data lists support pagination
- [x] Error boundaries prevent full-page crashes
- [x] AI endpoints have rate limiting

**Plans:** 5/5 plans executed

Plans:
- [x] 04-01-PLAN.md — Wave 1: Side letter structured rules + fee adjustment engine + MFN detection (FIN-07)
- [x] 04-02-PLAN.md — Wave 1: Role-based access enforcement + service provider scoping + audit logging (CORE-02, CORE-03)
- [x] 04-03-PLAN.md — Wave 1: Pagination + search/filters + error boundaries + rate limiting (CORE-04, CORE-05, CORE-06)
- [x] 04-04-PLAN.md — Wave 2: Dashboard redesign + cross-entity NAV + performance aggregation + LP comparison (FIN-08, FIN-09, ASSET-02)
- [x] 04-05-PLAN.md — Wave 2: Deal-level performance attribution with projected vs actual (FIN-10)

**Progress:** 5/5 plans complete — PHASE COMPLETE

---

## Phase 5: QBO/Xero Integration

**Goal:** Connect real QBO accounting per entity via OAuth so Atlas can pull real GL data for trial balance and NAV computation. Provider-agnostic abstraction built so Xero slots in later without rework.

**Requirements:** ACCT-01, ACCT-02, ACCT-03, ACCT-04, ACCT-05, ASSET-03

**Success Criteria:**
- [ ] Each entity can connect to its own QBO company via real OAuth (ACCT-01)
- [ ] Provider abstraction layer exists for future Xero support (ACCT-02)
- [ ] Account mapping UI with auto-detect lets users map QBO accounts to 5 Atlas buckets (ACCT-03, ASSET-03)
- [ ] Trial balance data flows from QBO into Atlas with historical snapshots (ACCT-04)
- [ ] Two-layer NAV: cost basis from GL when connected, proxy fallback otherwise + fair value overlay from Atlas valuations (ACCT-05)

**Plans:** 3/3 plans complete

Plans:
- [ ] 05-01-PLAN.md — Wave 1: Schema + provider abstraction + QBO OAuth connect/callback/disconnect (ACCT-01, ACCT-02)
- [ ] 05-02-PLAN.md — Wave 2: Account mapping API + trial balance sync + mapping/TB UI + accounting page drill-in (ACCT-03, ACCT-04, ASSET-03)
- [ ] 05-03-PLAN.md — Wave 3: NAV GL integration + entity Accounting tab + human verification checkpoint (ACCT-05)

**Progress:** 0/3 plans complete

---

## Phase 6: LP Portal

**Goal:** LP portal shows computed data (not seeded) and is ready for real investor access.

**Requirements:** LP-01, LP-02, LP-03

**Success Criteria:**
- [x] LP dashboard shows computed metrics (IRR, TVPI, DPI, RVPI from Phase 3 engines) (completed 2026-03-07)
- [ ] Capital account statement reflects real computations
- [ ] Performance metrics display as time-series charts (not just current numbers)
- [ ] LP communication preferences stored and ready for notification engine

**Plans:** 2/2 plans complete

Plans:
- [ ] 06-01-PLAN.md — Wave 1: MetricSnapshot schema + snapshot-on-compute + time-series charts + capital account period summaries (LP-01, LP-02)
- [ ] 06-02-PLAN.md — Wave 1: Notification preferences API + LP settings page (LP-03)

**Progress:** 0/2 plans complete

---

## Phase 7: Notifications & Reports

**Goal:** Complete notification delivery (email + SMS), PDF/Excel report generation, and third-party integrations to finish Milestone 1. LP notification preferences from Phase 6 are respected. Reports are white-label and saved to LP document center.

**Requirements:** NOTIF-01, NOTIF-02, NOTIF-03, INTEG-01, INTEG-02, REPORT-01, REPORT-02, REPORT-03, REPORT-04, REPORT-05, INTEG-03, INTEG-04, INTEG-05, INTEG-06

**Success Criteria:**
- [x] Capital call notices delivered via email (Resend) and SMS (Twilio) (completed 2026-03-08)
- [x] SMS notifications sent via Twilio for configured LPs (completed 2026-03-08)
- [x] LP notification preferences respected (channel + type toggles) (completed 2026-03-08)
- [x] Slack IC voting verified and polished (from Phase 1 verification) (completed 2026-03-06)
- [x] DocuSign packages can be sent for closing documents with webhook status tracking (completed 2026-03-08)
- [x] Quarterly report PDF generates for any entity (white-label, 4-6 pages) (completed 2026-03-08)
- [x] Capital account statement exports to PDF (completed 2026-03-08)
- [x] Fund summary one-pager PDF generates for any entity (completed 2026-03-08)
- [x] Any data table can export to Excel (XLSX) (completed 2026-03-08)
- [x] K-1 documents can be uploaded in bulk and auto-distributed to LPs (completed 2026-03-08)
- [x] Search bars removed from list pages (AI command bar is universal search) (completed 2026-03-08)
- [x] Asana, Notion, Plaid, Google Calendar integrations connected via Settings (completed 2026-03-08)

**Plans:** 6/6 plans complete

Plans:
- [x] 07-01-PLAN.md — Wave 1: Notification delivery engine (email via Resend + SMS via Twilio) + notification bell polish (NOTIF-01, NOTIF-02, NOTIF-03, INTEG-01)
- [x] 07-02-PLAN.md — Wave 1: Excel export across all data tables + search bar removal (REPORT-03)
- [x] 07-03-PLAN.md — Wave 1: PDF report engine + quarterly report + capital account statement + fund summary + /reports page (REPORT-01, REPORT-02, REPORT-05)
- [x] 07-04-PLAN.md — Wave 2: K-1 bulk upload/distribution + report notification wiring (REPORT-04) (depends on 07-01, 07-03)
- [x] 07-05-PLAN.md — Wave 1: DocuSign real OAuth + envelope management + webhook + signing UI (INTEG-02)
- [x] 07-06-PLAN.md — Wave 1: Third-party integrations hub — Asana, Notion, Plaid, Google Calendar (INTEG-03, INTEG-04, INTEG-05, INTEG-06)

**Progress:** 6/6 plans complete — PHASE COMPLETE

---

---

## Phase 8: Auth & Permissions Hardening

**Goal:** Close RBAC enforcement gaps found in v1.0 audit. Wire `getEffectivePermissions()` into GP API routes for GP_TEAM fine-grained access. Add entity-scope checks for SERVICE_PROVIDER. Fix security issues in notification and K-1 endpoints.

**Gap Closure:** Closes gaps from v1.0-MILESTONE-AUDIT.md
**Requirements:** CORE-02, CORE-03

**Success Criteria:**
- [ ] `getEffectivePermissions()` called in GP API route handlers for deals, entities, capital_activity, investors, documents, settings, reports
- [ ] SERVICE_PROVIDER entity-scope checked per-route (not just middleware write-block)
- [ ] `/api/notifications` GET uses session userId instead of query param (IDOR fix)
- [ ] `/api/k1` GET has auth guard returning 401 when unauthenticated
- [ ] Dev mock mode still functional (RBAC bypassed gracefully, not broken)

Plans:
- [ ] 08-01-PLAN.md — GP_TEAM permission enforcement + SERVICE_PROVIDER entity-scope + security fixes

**Progress:** 0/1 plans complete

---

## Phase 9: Financial Wiring & Polish

**Goal:** Close remaining financial computation wiring gaps and cosmetic tech debt. Wire side letter engine into fee calculation. Enforce LP digest preferences in notification delivery. Clean up minor code quality issues across phases.

**Gap Closure:** Closes gaps from v1.0-MILESTONE-AUDIT.md
**Requirements:** FIN-07, NOTIF-03

**Success Criteria:**
- [ ] `integrateSideLetterWithFeeCalc()` called in `/api/fees/calculate` — LP-specific side letter discounts applied to fee output
- [ ] `deliverNotification()` reads `digestPreference` and queues DAILY_DIGEST/WEEKLY_DIGEST notifications instead of immediate dispatch
- [ ] Plaid entity detail balance card shows live bank data when Plaid connected
- [ ] waterfall.test.ts TypeScript error fixed
- [ ] eslint-disable any-type workarounds cleaned up where possible (deal tabs, Recharts)

Plans:
- [ ] 09-01-PLAN.md — Side letter fee wiring + digest preference enforcement + Plaid card + code cleanup

**Progress:** 0/1 plans complete

---

**Requirement coverage:** All active REQ-IDs in REQUIREMENTS.md mapped to a phase. CORE-01 (Clerk auth) is DONE -- not in any phase. Gap closure phases 8-9 address partial requirements from audit. Zero orphans.
