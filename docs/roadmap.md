# Atlas Roadmap — Living Status Tracker

Last updated: 2026-03-03 (v9.0)

When suggesting next steps, consult this file to recommend the highest-impact unbuilt feature.

---

## Status Key

- **Done** — Built and working
- **Partial** — UI exists but missing real logic, or only some sub-features built
- **Stub** — Model/route exists but no real functionality
- **Not Started** — Not built at all

---

## Phase 1: Foundation + Asset Management

| Feature | Status | Notes |
|---------|--------|-------|
| Project setup (Next.js, DB, deployment) | Done | Next.js 16, Prisma 7, Tailwind 4, PostgreSQL |
| Core data models (Firm, Entity, Asset, Investor, Commitment) | Done | 56 Prisma models total |
| Role-based auth (GP_ADMIN, GP_TEAM, SERVICE_PROVIDER, LP_INVESTOR) | Partial | Models + roles exist. Using demo UserProvider — no real auth (Clerk/Auth0 not integrated) |
| Navigation shell (sidebar, routing, command bar) | Done | AppShell, Sidebar, TopBar, CommandBar with AI search |
| Database seeded with demo data | Done | 5 deals, 12 assets, 9 entities, 10 investors, full cross-references |
| Asset list view with type filters | Done | Filter by asset class, table with FV/MOIC/IRR |
| Asset detail — universal backbone | Done | Header, metrics, type-specific tabs |
| Asset detail — RE tab (property dashboard, tenant roll, NOI) | Done | Property details, tenant roll with lease data, occupancy, cap rate |
| Asset detail — Credit tab (loan dashboard, covenants, payments) | Done | Principal, rate, maturity, covenant monitor, payment schedule |
| Asset detail — Equity tab (company dashboard) | Done | Revenue, EBITDA, growth, employees, ownership |
| Asset detail — Fund LP tab (GP dashboard, statement tracking) | Done | Commitment, called, distributions, GP NAV, strategy |
| Asset ownership model (entity allocations, holding types) | Done | AssetEntityAllocation junction table, allocation percentages |
| Document upload + attachment to assets | Done | FileUpload component, FormData pattern, category badges |
| Task creation on assets | Done | Linked to global task system |
| Activity timeline on assets | Done | ActivityEvent model |
| QBO OAuth connection flow (per entity) | Stub | Connection status UI exists, sync status display — but no real OAuth, no real QBO API calls |
| Xero OAuth connection flow | Stub | Model supports it, no implementation |
| Account mapping UI | Stub | AccountMapping model exists, no UI for mapping |
| Trial balance pull + display | Not Started | |
| Two-layer NAV computation (cost basis from GL + fair value overlay) | Partial | NAV page exists, shows seeded data — no real computation from GL |
| Valuation entry + approval workflow | Done | Log valuation form, DRAFT → APPROVED, history table |
| Valuation history per asset | Done | Valuation tab on asset detail |
| NAV dashboard showing all entities | Partial | Entity detail shows NAV, but no cross-entity NAV dashboard |

---

## Phase 2: Deal Desk

| Feature | Status | Notes |
|---------|--------|-------|
| Deal pipeline kanban view | Done | 4 columns (Screening, DD, IC Review, Closing) + collapsed Closed/Dead |
| Deal entry form (wizard) | Done | Multi-step wizard with all fields, doc upload, Create vs Create & Screen |
| Document upload to deals | Done | FormData upload, category selection |
| DD workstream management | Done | Asset-class-based templates (UNIVERSAL + class-specific + DEBT), CRUD |
| DD task creation and tracking | Done | Per-workstream tasks, linked to global task system |
| DD progress tracking | Done | Per-workstream status, completion counts, progress bars |
| Deal → Asset transition on close | Partial | Close deal action exists, but auto-creation of Asset from Deal not verified |
| AI document analysis | Done | Per-workstream AI analysis with OpenAI, user-supplied API key |
| Auto-extraction (financials, terms, risks) | Done | AI extracts findings + creates DD tasks |
| AI screening memo (IC Memo) generation | Done | Aggregates all workstream analyses into unified IC memo |
| Configurable screening criteria | Done | DD category templates, prompt templates, AI config (provider/model/key) |
| IC workflow (memo → review → vote) | Partial | IC Review tab with memo display, voting UI, decision recording. No real Slack integration |
| Slack integration for IC voting | Not Started | Model has slackChannel/slackMessageId fields, no webhook or API |
| Closing checklist templates | Done | Closing tab with checklist items, status tracking |
| Meeting notes integration (Fireflies webhook) | Not Started | Meeting model has source field for FIREFLIES, no webhook receiver |
| Deal email forwarding for intake | Not Started | Spec mentions email-sourced deals, not built |

---

## Phase 3: Financial Engine

| Feature | Status | Notes |
|---------|--------|-------|
| Capital call creation + LP allocation | Done | Form creates call with line items per investor |
| Capital call tracking (per LP: pending, received, overdue) | Partial | Status tracking exists, per-LP funded tracking is basic |
| Distribution creation with decomposition | Done | Form with ROC/income/gain/carry breakdown |
| Distribution allocation to LPs | Partial | Line items exist, allocation logic is basic |
| Income event logging | Done | Log income form on asset detail |
| Income/principal tagging on cash flows | Partial | isPrincipal field exists on IncomeEvent and Transaction |
| Transaction ledger | Done | Transaction model with types, displayed on entity detail |
| Capital account computation engine | Stub | CapitalAccount model exists with all fields, data is seeded not computed |
| Configurable waterfall engine | Partial | Template builder + tier editor work, but no actual waterfall calculation logic |
| Waterfall template builder UI | Done | Create template, add/edit/delete tiers, LP/GP splits, hurdle rates |
| Fee calculation engine | Stub | FeeCalculation model exists, data is seeded not computed |
| Side letter rules (per LP, per entity) | Stub | SideLetter model exists, no rule application logic |
| IRR computation | Stub | Field exists on Asset and LP dashboard, values are seeded not calculated |
| TVPI / DPI / RVPI computation | Stub | Fields exist on LP dashboard, values are seeded not calculated |
| MOIC computation | Partial | Displayed on assets, some seeded, some derived from costBasis/fairValue |
| Fund-level performance | Stub | Metrics display on LP dashboard but aren't computed |
| LP-level performance | Stub | Same — displayed, not computed |
| Deal-level performance attribution | Not Started | |

---

## Phase 4: LP Portal + Notifications

| Feature | Status | Notes |
|---------|--------|-------|
| LP login + dashboard | Partial | Dashboard page works, shows seeded data. No real auth — uses demo UserProvider |
| Per-fund investment summary | Done | Commitments by entity table on LP dashboard |
| Capital account statement | Done | LP Account page with period statement, color-coded line items |
| Capital call notices | Done | LP Activity page shows capital calls with status |
| Distribution history with decomposition | Done | LP Activity page shows distributions with income/ROC/gain breakdown |
| Asset-level visibility (portfolio look-through) | Done | LP Portfolio page with pro-rata exposure |
| Document center | Done | LP Documents page shows GP-shared documents |
| Performance metrics over time | Stub | Metrics displayed but static, no time-series chart |
| Email notification delivery (SendGrid/SES) | Not Started | |
| SMS notification delivery (Twilio) | Not Started | |
| LP communication preferences | Stub | InvestorNotificationPreference model exists, no delivery engine |
| Asana bidirectional sync | Not Started | |
| Notion bidirectional sync | Not Started | |
| Task auto-generation (from meetings, templates) | Not Started | |
| Recurring task engine | Not Started | |

---

## Phase 5: Polish + Scale

| Feature | Status | Notes |
|---------|--------|-------|
| Quarterly report generation (PDF) | Not Started | |
| Capital account statement PDF | Not Started | |
| Data export to Excel | Not Started | |
| K-1 upload and distribution to LPs | Not Started | |
| Fund summary reports | Not Started | |
| Custom report builder | Not Started | |
| Plaid banking integration | Not Started | |
| DocuSign integration | Stub | ESignaturePackage model exists, no real DocuSign API |
| CRM integration (Salesforce/HubSpot) | Not Started | Have Company/Contact models (internal CRM) |
| Calendar integration (Google Cal) | Not Started | |
| PWA for mobile LP portal | Not Started | |
| Performance optimization + security hardening | Not Started | |

---

## What to Build Next (Priority Ranked)

Ranked by impact — what would make the app most useful soonest:

### Tier 1: Make the numbers real
1. **Real auth (Clerk or Auth0)** — Everything else depends on knowing who's logged in. Demo UserProvider won't work for real use. Blocks: LP portal, role-based access, service provider scoping.
2. **Computation engines (IRR, TVPI, DPI, RVPI, MOIC)** — The LP dashboard and asset metrics currently show seeded numbers. Making these compute from actual capital call/distribution/valuation data makes the app trustworthy.
3. **Capital account computation** — The capital account statement is the core LP deliverable. Right now it shows seeded data. Computing it from contributions + income + distributions + fees makes it real.
4. **Waterfall calculation engine** — Template builder works, but no actual distribution waterfall calculation. Critical for knowing how much each LP gets.

### Tier 2: Connect to the real world
5. **QBO OAuth + sync** — The accounting connection UI exists but doesn't connect to anything. Real OAuth + trial balance pull would make the NAV computation work from actual books.
6. **Email/SMS notification delivery** — LP preferences model exists. Hooking up SendGrid + Twilio makes capital call notices and document sharing actually reach LPs.
7. **Slack IC voting** — The IC process UI works in-app, but the spec calls for Slack-integrated voting. Would make the IC workflow frictionless for the team.

### Tier 3: Operational efficiency
8. **PDF report generation** — Quarterly reports and capital account PDFs are core GP deliverables to LPs.
9. **Excel export** — Every table should be exportable. Quick win.
10. **Fireflies meeting webhook** — Auto-capture meeting transcripts and action items.
11. **Deal → Asset auto-creation** — When a deal closes, it should automatically create the asset with the right details.

### Tier 4: Integrations
12. **DocuSign** — Real e-signature for closing documents.
13. **Asana/Notion sync** — Bidirectional task sync with existing tools.
14. **Plaid** — Bank account visibility for cash management.
15. **Calendar** — Google Cal integration for review scheduling.
