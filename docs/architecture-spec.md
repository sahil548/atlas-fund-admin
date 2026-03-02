# Atlas — Final Pre-Build Specification
## v4 — Ready to Build

---

## 1. Who We're Building For

**The User:** A family office GP running ~9 funds (plus sidecars/SPVs) with a small team (you, a CFO, a CIO). External service providers (CPA, tax preparer) need scoped access. ~10 LPs today, scaling toward $1B AUM over time.

**The Portfolio:** Real estate, private credit, and operating businesses — each of which can be held directly, through a fund, through an SPV, or as an LP in another GP's vehicle. Plus LP stakes in funds across exotic asset classes (sports, life insurance, etc.). Contract-level detail matters.

**The Reality:** Deals come from relationships and emails. Valuations are mostly internal and informal. The IC is 1-3 people, not a boardroom. There are ~9 different fund entities, each with its own QBO company (maybe one in Xero). Waterfalls are experimental — different structures across funds, sidecars with side letters everywhere.

**The Ambition:** Replace the patchwork of portals, spreadsheets, and emails with a single operating system that can grow from where you are today to $1B AUM without breaking.

---

## 2. Decisions Made

Based on your answers, here's what's locked in:

| Decision | Answer |
|---|---|
| Data migration | Manual entry, start from a point in time, allow historical additions |
| Accounting integration | Multi-entity: each fund entity has its own QBO (or Xero) connection |
| Team size | 3 GP users + external service provider access (CPA, tax) |
| LP count | ~10, no SSO, simple auth |
| LP visibility | Uniform for now — same view for all LPs per fund |
| Asset types | RE, credit, operating businesses, fund LP positions — all via direct/fund/SPV/counterparty |
| Contract-level detail | Yes, especially for RE |
| Valuations | Mostly internal, informal, 1-3 person process |
| Deal flow | Relationship/email sourced, capacity for ~100 in pipeline |
| AI screening | Recommendation engine, human always decides |
| AI provider | User-supplied API key (Claude, OpenAI, etc.) |
| IC process | Small group (1-3), Slack-integrated voting |
| Fund count | ~9 + sidecars, new fund launching soon |
| Waterfall | Fully configurable, experimental structures, no-fee options |
| Side letters | Extensive, per-LP, per-fund |
| Task management | Asana + Notion bidirectional sync |
| Reporting | Lower priority; uploaded K-1s, eventually generated reports |
| LP notifications | Email + text (per LP communication preference) |
| Branding | Not important now |
| Mobile | Wish list for LP portal |
| Exports | Always available |
| Compliance | Basic fund-level regulatory, not institutional SOC 2 yet |
| Hosting | We'll recommend (see Section 8) |

---

## 3. Revised Entity & Accounting Architecture

### The Multi-Entity Problem

This is the most architecturally significant thing that changed. You don't have one QBO with classes — you have **9+ separate QBO companies** (and possibly a Xero entity). Each fund/SPV/sidecar is its own legal entity with its own books.

```
ATLAS
├── Firm: [Your Family Office GP]
│
├── Entity: Fund I, LLC
│   ├── Accounting: QBO Company "Fund I"
│   ├── Type: Main fund
│   └── Assets: [RE properties, credit notes, equity stakes]
│
├── Entity: Fund II, LP
│   ├── Accounting: QBO Company "Fund II"
│   ├── Type: Main fund
│   └── Assets: [different mix]
│
├── Entity: Fund III, LLC
│   ├── Accounting: Xero Company "Fund III"  ← different system!
│   ├── Type: Main fund
│   └── Assets: [...]
│
├── Entity: Fund I Sidecar A, LLC
│   ├── Accounting: QBO Company "Sidecar A"
│   ├── Type: Sidecar
│   ├── Parent: Fund I
│   └── Assets: [single deal co-invest]
│
├── Entity: [SPV for Deal X]
│   ├── Accounting: QBO Company "SPV-X"
│   ├── Type: SPV
│   └── Assets: [single asset]
│
└── ... (9+ entities)
```

### Accounting Connector Architecture

```
ACCOUNTING_CONNECTION
├── connection_id (PK)
├── entity_id (FK → Entity)
├── provider                       // qbo, xero (future: sage, netsuite)
├── provider_company_id            // QBO realm ID or Xero tenant ID
├── provider_company_name
├── oauth_credentials              // encrypted
├── sync_status                    // connected, disconnected, error
├── last_sync_at
├── sync_frequency                 // 15min, hourly, daily, manual
├── chart_of_accounts_mapped       // boolean
└── created_at

ACCOUNT_MAPPING
├── mapping_id (PK)
├── connection_id (FK)
├── atlas_account_type             // cash, investments_at_cost, accrued_interest,
│                                  // accounts_payable, accrued_fees, etc.
├── provider_account_id            // QBO/Xero account ID
├── provider_account_name
└── created_at

─── This means: ───
• Each entity connects independently to its own QBO or Xero
• Account mappings are per-entity (Fund I's "cash" account may have
  a different QBO account ID than Fund II's "cash" account)
• The sync service handles QBO and Xero APIs through a unified interface
• Adding a new accounting provider later = new adapter, same interface
```

### Entity Schema

```
ENTITY
├── entity_id (PK)
├── firm_id (FK → Firm)
├── name                           // "Atlas Fund I, LLC"
├── legal_name
├── entity_type                    // main_fund, sidecar, spv, co_invest_vehicle,
│                                  // gp_entity, holding_company
├── parent_entity_id (FK, nullable) // sidecar → parent fund
├── vehicle_structure              // llc, lp, corp, trust
├── ein
├── state_of_formation
├── formation_date
├── status                         // active, winding_down, dissolved
│
│── FUND TERMS (if entity_type is a fund/sidecar)
├── vintage_year
├── target_size
├── total_commitments              // computed
├── investment_period_end
├── fund_term_years
├── extension_options
├── waterfall_template_id (FK)     // configurable waterfall
├── fiscal_year_end
│
│── ACCOUNTING
├── accounting_connection_id (FK)  // link to QBO/Xero connection
│
│── REGULATORY
├── regulatory_filings             // JSON: {form_d: true, blue_sky: [...states]}
├── legal_counsel
├── tax_preparer
│
└── created_at
```

---

## 4. Revised Asset Ownership Model

An asset can be held in complex ways. The same building could be owned by an SPV, which is owned by a fund, which has LP investors. Or you might own shares in a company directly through a fund. Or you might be an LP in someone else's fund that owns the asset.

```
ASSET OWNERSHIP CHAIN:

Simple: Fund I → owns → 123 Main St (direct RE)
Complex: Fund II → owns 80% of → SPV-X → owns → 456 Oak Ave
Indirect: Fund III → LP stake in → Blackstone RE IX → owns → [properties]
Multi-fund: Fund I (60%) + Sidecar A (40%) → own → NovaTech AI

ASSET_ENTITY_ALLOCATION
├── allocation_id (PK)
├── asset_id (FK → Asset)
├── entity_id (FK → Entity)        // which fund/SPV/sidecar holds this
├── allocation_percent             // 60%, 40%, 100%, etc.
├── cost_basis                     // this entity's cost basis in the asset
├── status                         // active, exited, transferred
└── created_at

This replaces the simple "funds" array on the asset. Now:
- Asset "NovaTech AI" has two allocations:
  - Fund I: 60%, cost basis $27M
  - Sidecar A: 40%, cost basis $18M
- Asset "Sequoia Fund XVI" has one allocation:
  - Fund III: 100%, cost basis $10M
- Valuations are at the asset level
- Entity-level fair value = asset fair value × allocation %
```

---

## 5. Holding Structure — Direct vs. Through Counterparty

Your answer about "direct or through a fund or SPV either direct or through a counterparty or other GP" is critical. We need to model the **how** of ownership, not just the **what**.

```
ASSET HOLDING STRUCTURE:

HOLDING_TYPE on each asset:
├── direct
│   └── You (via your entity) own the asset directly
│   └── You have the books, you control the asset
│   └── Example: You own 123 Main St through Fund I, LLC
│
├── through_own_vehicle
│   └── You own it via an SPV or sub-entity you control
│   └── You have the books for the SPV
│   └── Example: Fund II owns SPV-X which owns 456 Oak Ave
│
├── lp_in_external_fund
│   └── You're an LP in another GP's fund
│   └── You do NOT have the books — you get statements
│   └── Example: You're an LP in Sequoia Fund XVI
│   └── Valuation = GP-reported NAV (you can't independently verify)
│
├── co_invest_with_lead_gp
│   └── You co-invested alongside another GP who leads
│   └── You may or may not have independent information rights
│   └── Example: Co-invest in CloudBase alongside Lead GP
│
└── through_counterparty
    └── You have exposure through a counterparty arrangement
    └── Example: Participation in a credit facility led by another bank
    └── Valuation depends on counterparty reporting

THIS MATTERS BECAUSE:
- For "direct" and "through_own_vehicle": you control valuation,
  you have the accounting, you can compute everything
- For "lp_in_external_fund": you depend on the other GP for NAV,
  capital calls come TO you, distributions come FROM them
- For "co_invest_with_lead_gp": hybrid — some control, some dependency
- For "through_counterparty": most dependent, least control

The asset detail page ADAPTS based on holding type:
- Direct assets: full control panel (mark valuations, log income, etc.)
- LP positions: "waiting for GP" indicators, statement upload, review scheduling
- Co-invests: lead GP communication tracking, independent analysis option
```

---

## 6. Contract-Level Detail for RE and Credit

You said contract-level detail matters. Here's how:

```
LEASE (for real estate assets)
├── lease_id (PK)
├── asset_id (FK → Asset, where type = real_estate)
├── tenant_name
├── tenant_entity                  // legal entity name
├── unit_or_suite                  // "Suite 200" or "Unit 4B"
├── square_footage
├── lease_type                     // gross, net, nnn, modified_gross, percentage
├── base_rent_monthly
├── base_rent_annual
├── rent_escalation                // JSON: {type: "annual", rate: 0.03} or
│                                  //       {type: "fixed", schedule: [...]}
├── cam_charges                    // common area maintenance
├── tax_pass_through
├── insurance_pass_through
├── lease_start_date
├── lease_end_date
├── renewal_options                // JSON: {terms: 1, years_each: 5, notice: "6mo"}
├── termination_options            // JSON
├── security_deposit
├── free_rent_months
├── tenant_improvement_allowance
├── current_status                 // active, expired, month_to_month, terminated
├── payment_history                // → linked to income events
├── notes
└── created_at

CREDIT_AGREEMENT (for private credit assets)
├── agreement_id (PK)
├── asset_id (FK → Asset, where type = private_credit)
├── borrower_name
├── borrower_entity
├── agreement_type                 // loan_agreement, note_purchase, participation,
│                                  // credit_facility, indenture
├── original_principal
├── current_principal
├── commitment_amount              // for revolving facilities
├── drawn_amount                   // for revolving facilities
├── interest_rate_type             // fixed, floating, hybrid, pik
├── fixed_rate                     // if fixed
├── reference_rate                 // SOFR, prime
├── spread_bps
├── pik_rate                       // paid-in-kind component
├── floor_rate                     // minimum rate
├── day_count                      // 30/360, actual/360, actual/365
├── payment_frequency              // monthly, quarterly, semi_annual, annual
├── payment_day                    // e.g., 15th of month
├── amortization                   // none, straight_line, custom_schedule
├── amortization_schedule          // JSON
├── maturity_date
├── prepayment_terms               // JSON: penalties, lockout, make-whole
├── collateral                     // JSON: description, type, value
├── guarantors                     // JSON: list
├── covenants                      // → COVENANT table
├── subordination                  // senior, mezzanine, subordinated
├── intercreditor_agreement        // boolean, details
├── default_provisions             // JSON
├── current_status                 // performing, watch, default, workout
└── created_at

COVENANT
├── covenant_id (PK)
├── agreement_id (FK)
├── name                           // "Maximum Leverage Ratio"
├── type                           // financial, negative, affirmative, reporting
├── metric                         // leverage_ratio, dscr, current_ratio, etc.
├── threshold_operator             // lte, gte, eq, between
├── threshold_value                // 4.5
├── threshold_value_upper          // for "between"
├── test_frequency                 // monthly, quarterly, annual
├── cure_period_days               // e.g., 30
├── last_tested_date
├── last_tested_value
├── current_status                 // compliant, watch, cure_period, breach, waived
├── breach_history                 // JSON
└── created_at
```

---

## 7. Access Control — Roles

```
ROLE-BASED ACCESS

ROLE: GP_ADMIN (you)
├── Everything. Full control.
└── Can configure all settings, integrations, waterfalls, etc.

ROLE: GP_TEAM (CFO, CIO)
├── Full operational access
├── May restrict: integration settings, user management
└── Configurable per user

ROLE: SERVICE_PROVIDER (CPA, tax preparer)
├── Read-only access to specific entities
├── Scoped to: financial data, documents, tax-relevant info
├── Cannot: create deals, mark valuations, manage investors
├── Cannot: see other service providers' access
├── Time-bound access option (e.g., during tax season)
└── Audit trail of everything they view

ROLE: LP_INVESTOR
├── Read-only access to their own data
├── Sees: capital account, distributions, documents, portfolio
├── Cannot: see other LPs, internal notes, IC materials
└── Communication preference: email, text, or portal-only

ROLE: AUDITOR (future)
├── Read-only access to everything in a specific entity
├── Time-bound
└── Full audit trail
```

---

## 8. IC Process — Slack-Integrated Voting

Simple, informal, fits a 1-3 person IC:

```
IC VOTING FLOW

1. Deal reaches IC stage in Atlas
2. IC initiator clicks "Send to IC" in Atlas
3. Atlas posts to designated Slack channel:
   ┌─────────────────────────────────────────┐
   │ 🏢 IC VOTE: Apex Manufacturing          │
   │                                         │
   │ Type: Direct Equity · Industrials       │
   │ Target: $30-40M · Lead: JK              │
   │ AI Score: 82/100                        │
   │                                         │
   │ 📄 IC Memo: [link to Atlas]             │
   │ 📊 Underwriting: Base IRR 22%, MOIC 2.5x│
   │                                         │
   │ Vote by reacting:                       │
   │ ✅ Approve  ❌ Reject  ⏸ Defer          │
   │                                         │
   │ Deadline: March 10, 5:00 PM             │
   └─────────────────────────────────────────┘

4. IC members react with emoji vote
5. Atlas webhook captures reactions
6. Atlas records:
   ├── Who voted
   ├── What they voted
   ├── When they voted
   ├── Whether quorum was met (configurable: 2/3, unanimous, etc.)
   └── Final decision

7. If approved: Atlas moves deal to Closing stage
8. If conditions: Atlas creates condition-tracking tasks
9. Full vote record stored in Atlas (immutable audit trail)

OPTIONAL: IC members can also vote directly in Atlas
(Slack is the convenience layer, Atlas is the record)
```

---

## 9. LP Notification Preferences

```
LP_NOTIFICATION_PREFERENCE
├── investor_id (FK)
├── preferred_channel              // email, sms, portal_only
├── email_address
├── phone_number                   // for SMS
├── notification_types             // which events trigger notifications:
│   ├── capital_call_issued        // always on
│   ├── distribution_pending       // always on
│   ├── document_available         // configurable
│   ├── quarterly_report           // configurable
│   ├── nav_updated                // configurable
│   └── general_announcement       // configurable
├── digest_preference              // immediate, daily_digest, weekly_digest
└── created_at

DELIVERY:
├── Email: via SendGrid or AWS SES
├── SMS: via Twilio
├── Portal: always (in-app notification)
└── Future: push notifications for mobile app
```

---

## 10. Technology Stack Recommendation

You said you know nothing about hosting — here's what I recommend and why:

```
FRONTEND
├── React + TypeScript (what the mockup is built in)
├── Tailwind CSS (what the mockup uses for styling)
├── Next.js (framework — handles routing, SSR, API routes)
└── Deployed on Vercel (zero-config, auto-scaling, cheap to start)

BACKEND
├── Node.js + TypeScript (same language as frontend = one codebase)
├── tRPC or REST API (type-safe API layer)
├── Prisma (database ORM — makes database queries safe and easy)
└── Deployed on Railway or Render (simple, affordable, auto-scaling)

DATABASE
├── PostgreSQL (industry standard, handles everything we need)
├── Hosted on Supabase or Railway (managed, automatic backups)
└── Redis for caching and job queues (hosted on Upstash — serverless)

FILE STORAGE
├── AWS S3 or Cloudflare R2 (document storage)
└── R2 recommended (cheaper, no egress fees)

AUTH
├── Clerk (simple, supports email/password + magic links)
├── Handles GP team login + LP portal login
└── Role-based access built in

BACKGROUND JOBS
├── Inngest or BullMQ (for accounting sync, notifications, AI processing)
└── Handles: QBO/Xero sync, Fireflies webhook processing,
    notification delivery, AI screening jobs

AI
├── User-supplied API key (stored encrypted)
├── Support Claude (Anthropic) and OpenAI
├── Used for: document screening, meeting summarization, memo drafting
└── All AI calls go through Atlas backend (never client-side)

MOBILE (future)
├── React Native or Expo (shares code with web app)
├── LP portal first, GP features later
└── Can also do Progressive Web App (PWA) as interim

WHY THIS STACK:
- TypeScript everywhere = fewer bugs, one language to maintain
- Vercel + Railway = no DevOps headaches, scales automatically
- PostgreSQL = proven at any scale, from 10 LPs to 10,000
- Total hosting cost at your scale: ~$50-150/month to start
- Scales to $1B AUM without re-architecting
```

---

## 11. Build Plan & Timeline

### What to Build First (My Recommendation)

You asked "you tell me" — here's my opinionated answer:

**Phase 1 is the Asset Management module + multi-entity accounting integration.** Why? Because this is where you live every day. Every other module (Deal Desk, LP Portal, Capital Activity) depends on assets existing and being correctly valued. If the asset pages are right and the books are connected, everything else builds on a solid foundation.

### Phase 1: Foundation + Asset Management (Weeks 1-6)

```
WEEK 1-2: INFRASTRUCTURE
├── Project setup (Next.js, database, auth, deployment)
├── Core data model: Firm, Entity, Asset, Investor, Commitment
├── Role-based auth: GP Admin, GP Team, Service Provider, LP
├── Basic navigation shell (the sidebar, routing)
└── Database seeded with your real entities

WEEK 3-4: ASSET MANAGEMENT
├── Asset list view (table with type filters)
├── Asset detail page — universal backbone
├── Type-specific tabs:
│   ├── Real estate: property dashboard, tenant roll/lease detail, NOI
│   ├── Private credit: loan dashboard, payment schedule, covenants
│   ├── Direct equity: company dashboard, cap table
│   ├── Fund LP position: GP dashboard, statement tracking
│   └── Other types: flexible field sets
├── Asset ownership model (entity allocations, holding types)
├── Document upload + attachment to assets
├── Basic task creation on assets
└── Activity timeline on each asset

WEEK 5-6: ACCOUNTING INTEGRATION
├── QBO OAuth connection flow (per entity)
├── Xero OAuth connection flow (per entity)
├── Account mapping UI
├── Trial balance pull + display
├── Two-layer NAV computation (cost basis from GL + fair value from Atlas)
├── Valuation entry + approval workflow (simple: draft → approved)
├── Valuation history per asset
└── NAV dashboard showing all entities
```

### Phase 2: Deal Desk (Weeks 7-10)

```
WEEK 7-8: DEAL PIPELINE
├── Deal Desk pipeline view (kanban + list)
├── Deal entry form (manual + email forward)
├── Document upload to deals
├── DD workstream management
├── Task templates per deal type
├── DD progress tracking
└── Deal → Asset transition on close

WEEK 9-10: AI SCREENING + IC
├── AI document analysis (user-supplied API key)
├── Auto-extraction: financials, terms, risks
├── AI screening memo generation
├── Configurable screening criteria / plugins
├── IC workflow: memo → review → vote
├── Slack integration for IC voting
├── Closing checklist templates
└── Meeting notes integration (Fireflies webhook)
```

### Phase 3: Financial Engine (Weeks 11-14)

```
WEEK 11-12: CAPITAL ACTIVITY
├── Capital call creation + LP allocation
├── Capital call tracking (per LP: pending, received, overdue)
├── Distribution creation with income/principal decomposition
├── Distribution allocation to LPs
├── Income event logging (interest, dividends, rent, royalties)
├── Income/principal tagging on every cash flow
└── Transaction ledger

WEEK 13-14: COMPUTATIONS
├── Capital account computation engine
├── Configurable waterfall engine
├── Waterfall template builder UI
├── Fee calculation engine (configurable per entity)
├── Side letter rules (per LP, per entity)
├── Return calculations: IRR, TVPI, DPI, RVPI, MOIC
├── Fund-level and LP-level performance
└── Deal-level performance attribution
```

### Phase 4: LP Portal + Notifications (Weeks 15-18)

```
WEEK 15-16: LP PORTAL
├── LP login + dashboard
├── Per-fund investment summary
├── Capital account statement (with income/principal breakdown)
├── Capital call notices + payment history
├── Distribution history with decomposition
├── Asset-level visibility (GP-controlled per asset)
├── Document center (K-1 uploads, reports)
└── Performance metrics over time

WEEK 17-18: NOTIFICATIONS + TASKS
├── Notification engine (email via SendGrid, SMS via Twilio)
├── LP communication preferences
├── Capital call / distribution notice delivery
├── Document availability notifications
├── Asana bidirectional sync
├── Notion bidirectional sync
├── Task auto-generation (from meetings, templates, schedules)
└── Recurring task engine
```

### Phase 5: Polish + Scale (Weeks 19-22)

```
WEEK 19-20: REPORTING + EXPORTS
├── Quarterly report generation (PDF)
├── Capital account statement PDF
├── Data export to Excel (any table)
├── K-1 upload and distribution to LPs
├── Fund summary reports
└── Custom report builder (stretch)

WEEK 21-22: INTEGRATIONS + MOBILE
├── Plaid banking integration (cash visibility)
├── DocuSign integration (closing documents)
├── CRM integration (Salesforce or HubSpot — one to start)
├── Calendar integration (Google Cal — review scheduling)
├── PWA for mobile LP portal access
└── Performance optimization + security hardening
```

### Realistic Timeline

```
TOTAL: ~22 weeks (5.5 months) for a full-featured MVP

With one senior full-stack developer: 5-6 months
With two developers: 3-4 months
With a small agency/team of 3: 2.5-3 months

Phase 1 alone (what you need to START using it): 6 weeks
Phase 1+2 (daily operating tool): 10 weeks
Phase 1-4 (LP portal live): 18 weeks

COST ESTIMATE (rough):
├── Senior freelance dev: $150-250/hr → $120-200K total
├── Small agency: $80-150K total
├── In-house hire: salary + 5-6 months
├── Hosting/infra: $50-150/month at your scale
├── API costs (AI): $50-200/month depending on usage
└── Third-party services (Clerk, SendGrid, Twilio): ~$100/month
```

---

## 12. What's NOT in V1

Explicitly out of scope for the initial build:

```
NOT BUILDING YET:
├── Native mobile app (PWA first, native later)
├── SOC 2 compliance (build toward it, not certified yet)
├── Institutional-grade audit preparation tools
├── Multi-currency support (USD only to start)
├── Secondary market transaction support
├── Automated wire initiation (Modern Treasury — Phase 5+)
├── Full CRM (integrate, don't build)
├── Investor onboarding / subscription doc workflow
├── Advanced analytics / benchmarking
├── White-labeling / custom branding
├── Automated K-1 generation (upload only in V1)
└── Public market portfolio tracking (if needed, Phase 5+)
```

---

## 13. Remaining Open Items (Small)

These can be decided during build, not before:

```
DECIDE DURING BUILD:
├── Exact QBO account mapping (depends on your chart of accounts)
├── Exact DD checklist templates per asset type (build 3-4, iterate)
├── AI screening prompts and scoring weights (iterate based on use)
├── Specific Slack workspace setup for IC voting
├── Document folder structure conventions
├── LP portal URL (subdomain? separate domain?)
├── Exact notification copy and timing
└── Data retention policy (default: keep everything, soft-delete only)
```

---

## 14. Schema Summary (All Tables)

For reference, here's every table in the system:

```
CORE:
├── Firm
├── Entity (fund, sidecar, SPV — with accounting connection)
├── AccountingConnection (QBO/Xero per entity)
├── AccountMapping (GL accounts per connection)
├── User (GP team + service providers)
├── Role + Permission

ASSETS:
├── Asset (universal backbone)
├── AssetEntityAllocation (which entity holds what %)
├── AssetEquityDetails
├── AssetCreditDetails
├── AssetRealEstateDetails
├── AssetFundLPDetails
├── Lease (contract-level for RE)
├── CreditAgreement (contract-level for credit)
├── Covenant

INVESTORS:
├── Investor
├── Commitment (per investor per entity)
├── SideLetter (per investor per entity)
├── InvestorNotificationPreference

TRANSACTIONS:
├── Transaction (the core ledger)
├── CapitalCall + CapitalCallLineItem
├── DistributionEvent + DistributionLineItem
├── IncomeEvent

VALUATIONS:
├── Valuation (per asset, with method + source)
├── NAVComputation (per entity, per period)

FUND MECHANICS:
├── WaterfallTemplate + WaterfallTier
├── WaterfallCalculation
├── FeeCalculation + FeeAllocation
├── CapitalAccount (materialized / computed)

DEAL DESK:
├── Deal
├── ICProcess
├── DDWorkstream
├── DDTask
├── AIScreeningResult
├── ClosingChecklist

TASKS:
├── Task (universal, linked to any context)
├── TaskTemplate
├── ExternalTaskSync (Asana/Notion)

MEETINGS & DOCS:
├── Meeting (with AI transcript)
├── Document
├── Notification

IC VOTING:
├── ICVote (linked to Slack message)
├── ICVoteRecord (per voter)
```

---

## 15. Next Step

**We're ready to build.** The architecture is comprehensive enough to start writing code, and flexible enough to iterate as we go.

I recommend starting with Phase 1, Week 1: project setup, core data model, and the first asset detail page. Once you can see a real asset with real data from your QBO, everything else will click into place.

Shall we start writing code?
