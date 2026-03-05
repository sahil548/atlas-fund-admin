# Atlas Roadmap

Last updated: 2026-03-04

When suggesting next steps, consult this file to recommend the highest-impact unbuilt feature.

---

## Phase 1: Foundation + Asset Management

| Feature | Notes |
|---------|-------|
| Project setup (Next.js, DB, deployment) | Next.js 16, Prisma 7, Tailwind 4, PostgreSQL |
| Core data models (Firm, Entity, Asset, Investor, Commitment) | 56 Prisma models total |
| Role-based auth (GP_ADMIN, GP_TEAM, SERVICE_PROVIDER, LP_INVESTOR) | Models + roles exist. Using demo UserProvider — no real auth (Clerk/Auth0 not integrated) |
| Navigation shell (sidebar, routing, command bar) | AppShell, Sidebar, TopBar, CommandBar with AI search |
| Database seeded with demo data | 5 deals, 12 assets, 9 entities, 10 investors, full cross-references |
| Asset list view with type filters | Filter by asset class, table with FV/MOIC/IRR |
| Asset detail — universal backbone | Header, metrics, type-specific tabs |
| Asset detail — RE tab (property dashboard, tenant roll, NOI) | Property details, tenant roll with lease data, occupancy, cap rate |
| Asset detail — Credit tab (loan dashboard, covenants, payments) | Principal, rate, maturity, covenant monitor, payment schedule |
| Asset detail — Equity tab (company dashboard) | Revenue, EBITDA, growth, employees, ownership |
| Asset detail — Fund LP tab (GP dashboard, statement tracking) | Commitment, called, distributions, GP NAV, strategy |
| Asset ownership model (entity allocations, holding types) | AssetEntityAllocation junction table, allocation percentages |
| Document upload + attachment to assets | FileUpload component, FormData pattern, category badges |
| Task creation on assets | Linked to global task system |
| Activity timeline on assets | ActivityEvent model |
| QBO OAuth connection flow (per entity) | Connection status UI exists, sync status display — no real OAuth, no real QBO API calls |
| Xero OAuth connection flow | Model supports it, no implementation |
| Account mapping UI | AccountMapping model exists, no UI for mapping |
| Trial balance pull + display | |
| Two-layer NAV computation (cost basis from GL + fair value overlay) | NAV page exists, shows seeded data — no real computation from GL |
| Valuation entry + approval workflow | Log valuation form, DRAFT → APPROVED, history table |
| Valuation history per asset | Valuation tab on asset detail |
| NAV dashboard showing all entities | Entity detail shows NAV, but no cross-entity NAV dashboard |

---

## Phase 2: Deal Desk

| Feature | Notes |
|---------|-------|
| Deal pipeline kanban view | Works. 4 columns (Screening, DD, IC Review, Closing) + collapsed Closed/Dead. Deal cards show asset class tags, counterparty, deal lead initials. |
| Pipeline analytics | Works but has bugs: Pass Rate shows 300% (calculation error). Deal Flow bars and value-by-stage cards render correctly. |
| Deal entry form (wizard) | Works. 2-step wizard: Step 1 = Deal Identity (name, asset class, instrument, lead, counterparty, source, entity link), Step 2 = Materials & Context (doc upload, additional context, AI screening CTA). Create vs Create & Screen paths. No validation error messages shown to user when required fields are missing. |
| Deal detail — Overview tab | Works. Inline-editable fields for deal size, target return, parties, investment rationale, thesis notes, description. Investment Vehicle section with Link Existing / Create New. Stage card and document/notes counts in sidebar. |
| Deal detail — Due Diligence tab | Works for fresh deals. Shows workstreams with expand arrows, Run Analysis buttons, progress %, task counts. **Bug:** DD tab shows 0% / NOT STARTED for deals already past DD stage (Apex Manufacturing in IC Review shows all DD workstreams as NOT STARTED despite IC Memo showing 7/7 complete). |
| Deal detail — Documents tab | Works. Upload button, empty state. |
| Deal detail — Notes tab | Present, not tested deeply. |
| Deal detail — Activity tab | Present, not tested deeply. |
| Deal detail — IC Review tab | Works well. Approve/Reject/Send Back to DD buttons. Vote Records table with member, vote, date, notes. Questions section with threaded replies and OPEN/RESOLVED/DEFERRED status toggles. |
| Stage progress bar | Works. Visual progression from Screening → DD → IC Review → Closing. Color-coded (green/blue/green/gray). Next-step banners appear at each stage. |
| IC Memo generation progress | Shows workstream completion chips (checkmarks) and IC Memo status. Currently shows "Generating..." spinner on Apex deal — unclear if this is a stuck state or expected. |
| DD workstream management | Asset-class-based templates. Fresh deal (Infrastructure) got 8 workstreams; Diversified deal got 6. |
| AI document analysis | Per-workstream "Run Analysis" buttons present. "Run All Analysis" button at top of DD tab. Not tested with real API key. |
| AI screening memo (IC Memo) generation | Aggregates workstream analyses into unified IC memo. Shows score (82) and rating (Strong). |
| Configurable screening criteria | DD category templates, prompt templates, AI config (provider/model/key) in Settings. |
| Deal → Asset transition on close | Close deal action exists, auto-creation of Asset from Deal not verified. |
| Closing checklist templates | Closing tab with checklist items, status tracking. Not tested — no deals in Closing stage in demo data. |
| Slack integration for IC voting | Model has slackChannel/slackMessageId fields, no webhook or API. |
| Meeting notes integration (Fireflies webhook) | Meeting model has source field for FIREFLIES, no webhook receiver. |
| Deal email forwarding for intake | Not built. |

---

## Phase 3: Financial Engine

| Feature | Notes |
|---------|-------|
| Capital call creation + LP allocation | Form creates call with line items per investor |
| Capital call tracking (per LP: pending, received, overdue) | Status tracking exists, per-LP funded tracking is basic |
| Distribution creation with decomposition | Form with ROC/income/gain/carry breakdown |
| Distribution allocation to LPs | Line items exist, allocation logic is basic |
| Income event logging | Log income form on asset detail |
| Income/principal tagging on cash flows | isPrincipal field exists on IncomeEvent and Transaction |
| Transaction ledger | Transaction model with types, displayed on entity detail |
| Capital account computation engine | CapitalAccount model exists with all fields, data is seeded not computed |
| Configurable waterfall engine | Template builder + tier editor work, but no actual waterfall calculation logic |
| Waterfall template builder UI | Create template, add/edit/delete tiers, LP/GP splits, hurdle rates |
| Fee calculation engine | FeeCalculation model exists, data is seeded not computed |
| Side letter rules (per LP, per entity) | SideLetter model exists, no rule application logic |
| IRR computation | Field exists on Asset and LP dashboard, values are seeded not calculated |
| TVPI / DPI / RVPI computation | Fields exist on LP dashboard, values are seeded not calculated |
| MOIC computation | Displayed on assets, some seeded, some derived from costBasis/fairValue |
| Fund-level performance | Metrics display on LP dashboard but aren't computed |
| LP-level performance | Displayed, not computed |
| Deal-level performance attribution | |

---

## Phase 4: LP Portal + Notifications

| Feature | Notes |
|---------|-------|
| LP login + dashboard | Dashboard page works, shows seeded data. No real auth — uses demo UserProvider |
| Per-fund investment summary | Commitments by entity table on LP dashboard |
| Capital account statement | LP Account page with period statement, color-coded line items |
| Capital call notices | LP Activity page shows capital calls with status |
| Distribution history with decomposition | LP Activity page shows distributions with income/ROC/gain breakdown |
| Asset-level visibility (portfolio look-through) | LP Portfolio page with pro-rata exposure |
| Document center | LP Documents page shows GP-shared documents |
| Performance metrics over time | Metrics displayed but static, no time-series chart |
| Email notification delivery (SendGrid/SES) | |
| SMS notification delivery (Twilio) | |
| LP communication preferences | InvestorNotificationPreference model exists, no delivery engine |
| Asana bidirectional sync | |
| Notion bidirectional sync | |
| Task auto-generation (from meetings, templates) | |
| Recurring task engine | |

---

## Phase 5: Polish + Scale

| Feature | Notes |
|---------|-------|
| Quarterly report generation (PDF) | |
| Capital account statement PDF | |
| Data export to Excel | |
| K-1 upload and distribution to LPs | |
| Fund summary reports | |
| Custom report builder | |
| Plaid banking integration | |
| DocuSign integration | ESignaturePackage model exists, no real DocuSign API |
| CRM integration (Salesforce/HubSpot) | Have Company/Contact models (internal CRM) |
| Calendar integration (Google Cal) | |
| PWA for mobile LP portal | |
| Performance optimization + security hardening | |

---

## What to Build Next (Priority Ranked)

The priority is making Atlas useful for the GP team right now. We're working through the deal lifecycle — perfecting each stage before moving to the next module.

### Now: Perfect the Deal Desk (lifecycle order)

1. **Screening stage** — Polish how screening works and looks. This is the entry point for every deal.
2. **Due diligence + IC memo generation** — Fix issues with DD workstream flow and how the AI-generated IC memo comes together.
3. **IC review stage** — Wire IC review to work with real users making real decisions. Slack integration layered on later.
4. **Closing checklist** — Make the closing workflow reliable and complete.
5. **Entity/fund formation** — Every deal needs an entity before closing. Build the formation flow.
6. **Deal → Asset transition** — When a deal closes, auto-create the asset with the right details.

### Next: Asset Management
7. **Asset management polish** — Once deals flow into assets, make asset tracking and management solid.

### Later: Everything else
8. **Real auth (Clerk)** — Lock down access for real-world usage.
9. **Capital activity & transactions** — Capital calls, distributions, ledger work.
10. **Computation engines** — IRR, TVPI, NAV, waterfall calculations — when the data warrants it.
11. **QBO/Xero sync** — Real accounting integration.
12. **LP portal** — Real auth and experience for investors.
13. **Notifications** — Email/SMS delivery.
14. **Integrations** — DocuSign, Slack, Fireflies, Asana, Plaid, Calendar.
15. **Reports & exports** — PDF reports, Excel export, K-1 distribution.
