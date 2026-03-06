# Atlas — Project Context

## What This Is

Atlas is a family office operating system that replaces the patchwork of spreadsheets, portals, and emails used to manage fund operations. It covers deal pipeline, asset management, LP relations, accounting, capital activity, and entity management — all in one place.

## Who It's For

A family office GP running ~9 fund entities (plus sidecars and SPVs) with a small team: the GP, a CFO, and a CIO. External service providers (CPA, tax preparer) need scoped access. ~10 LPs today, scaling toward $1B AUM.

The portfolio spans real estate, private credit, and operating businesses — each held directly, through a fund, through an SPV, or as an LP in another GP's vehicle. Plus LP stakes across exotic asset classes (sports, life insurance, etc.). Contract-level detail matters (leases, credit agreements, covenants).

## Core Value

The GP team can manage the full deal-to-asset lifecycle and see accurate fund/LP metrics in one place, replacing spreadsheets and emails with a single operating system that scales from where they are today to $1B AUM.

---

## Production Status

Atlas is **deployed on Vercel with real Clerk authentication and real data**. This is not a demo — it's a production application.

- **Auth:** Clerk 7 active in production. Mock UserProvider available for local dev (toggle via env vars).
- **Data:** Production uses real data. Dev environment uses seeded demo data.
- **8 dev users** for local testing: 3 GP (James Kim GP_ADMIN, Sarah Mitchell GP_TEAM, Alex Lee GP_TEAM) + 5 LP investor users.

---

## Tech Stack (Locked In)

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4 |
| Database | PostgreSQL + Prisma 7 ORM |
| Data Fetching | SWR 2 (client-side caching) |
| Validation | Zod 4 |
| Auth | Clerk 7 (production) / Mock UserProvider (dev) |
| AI | OpenAI + Anthropic SDK (user-supplied API key) |
| File Storage | Vercel Blob |
| Charts | Recharts 3 |
| Deployment | Vercel |

---

## Key Decisions Made

| Decision | Answer | Rationale |
|----------|--------|-----------|
| Data migration | Manual entry, start from a point in time | Avoid messy imports |
| Accounting integration | Multi-entity: each fund has its own QBO (or Xero) | 9 separate QBO companies |
| Team size | 3 GP users + external service providers | Small team, big scope |
| LP count | ~10, no SSO, simple auth | Scale later |
| LP visibility | Uniform per fund (same view for all LPs) | No per-LP customization yet |
| Asset types | RE, credit, operating businesses, fund LP positions | Direct/fund/SPV/counterparty |
| Contract-level detail | Yes, especially RE leases and credit agreements | Core differentiator |
| Valuations | Mostly internal, informal, 1-3 person process | Not institutional-grade |
| Deal flow | Relationship/email sourced, ~100 pipeline capacity | No CRM inbound funnel |
| AI provider | User-supplied API key (Claude or OpenAI) | Flexible, no vendor lock-in |
| IC process | 1-3 people, Slack-integrated voting | Informal, not a boardroom |
| Waterfall | Fully configurable, experimental structures | Different per fund |
| Side letters | Extensive, per-LP, per-fund | Common in family office |
| API style | REST (not tRPC) | Simpler, more flexible |
| State management | SWR (not Redux/Zustand) | Pragmatic for current scale |

---

## Constraints

- **Non-developer owner.** All documentation must be plain English. Focus on what the user sees, not implementation details.
- **Vercel deployment.** Serverless function limits (10s default timeout, 50MB bundle). File uploads go to Vercel Blob.
- **No background jobs.** No Redis, no BullMQ, no Inngest. Long-running AI analysis runs inline. May need to add later.
- **No tests.** Build validation via `npm run build` (strict TypeScript checking). Manual testing via localhost.
- **Single database.** PostgreSQL, no read replicas, no sharding. Fine for current scale.

---

## Out of Scope (Not Building)

- Native mobile app (PWA later, native much later)
- SOC 2 compliance (build toward it, not yet)
- Multi-currency support (USD only)
- Secondary market transaction support
- Automated wire initiation
- Full CRM (we have internal Company/Contact models)
- Investor onboarding / subscription doc workflow
- Advanced analytics / benchmarking
- White-labeling / custom branding
- Automated K-1 generation (upload only)
- Public market portfolio tracking

---

## Requirements

Full requirement registry with REQ-IDs: see `.planning/REQUIREMENTS.md`

All requirements mapped to phases in ROADMAP.md.

---

## What's Built (Validated)

### Infrastructure
- [x] Next.js 16 project with TypeScript, Tailwind 4, Prisma 7
- [x] 57 Prisma models covering all domains
- [x] 73 REST API routes with Zod validation
- [x] Navigation shell: AppShell, Sidebar, TopBar, CommandBar (Cmd+K with AI search)
- [x] Multi-tenancy via FirmProvider (firmId scoping on all queries)
- [x] Clerk auth in production, mock UserProvider for dev (8 pre-seeded dev users)
- [x] Database seeded with demo data for dev: deals, assets, entities, investors
- [x] Route registry (`routes.ts`) — single source of truth for sidebar, command bar, AI routing
- [x] Dark mode (ThemeProvider)
- [x] Document upload + Vercel Blob storage
- [x] Global task management system
- [x] Notification system (in-app, bell icon with 30s polling)

### Deal Desk (~19 GP pages)
- [x] Deal pipeline kanban (4 columns + collapsed Closed/Dead)
- [x] Deal creation wizard (2-step: identity + materials)
- [x] Deal detail with 7 tabs: Overview, DD, Documents, Notes, Activity, IC Review, Closing
- [x] DD workstream templates per asset class (auto-created on screening)
- [x] AI document analysis per workstream
- [x] IC memo generation (aggregates all workstream analyses)
- [x] IC Review: vote tracking, threaded Q&A, approve/reject/send-back
- [x] Closing checklist with status tracking
- [x] Deal stage progression with color-coded progress bar
- [x] Pipeline analytics (deal flow bars, value-by-stage)

### Asset Management
- [x] Asset list with type filters (by asset class)
- [x] Asset detail with type-specific tabs: RE, Credit, Equity, Fund LP
- [x] RE tab: property details, tenant roll, lease data, occupancy, cap rate
- [x] Credit tab: principal, rate, maturity, covenant monitor, payments
- [x] Equity tab: revenue, EBITDA, growth, employees, ownership
- [x] Fund LP tab: commitment, called, distributions, GP NAV, strategy
- [x] Asset ownership model (AssetEntityAllocation junction table)
- [x] Valuation entry with method and history
- [x] Income event logging (interest, dividends, rental, etc.)
- [x] Document upload + tasks on assets

### Entity Management
- [x] Entity list with creation form
- [x] Entity detail with 5 tabs (Overview, Investors, Assets, Documents, Formation)
- [x] Formation workflow (NOT_STARTED → FORMING → FORMED → REGISTERED)
- [x] Entity types: Main Fund, Sidecar, SPV, Co-Invest Vehicle, GP Entity, Holding Company

### Capital Activity
- [x] Capital call creation with LP line items
- [x] Distribution creation with income/ROC/gain/carry decomposition
- [x] Transaction ledger on entity detail
- [x] Waterfall template builder UI (create templates, add/edit tiers)
- [x] Income event logging on assets
- [x] Transactions page (`/transactions`) — capital calls, distributions, waterfall templates

### Financial Computation Code (Needs Verification)
- [x] XIRR/IRR calculation (`src/lib/computations/irr.ts`) — Newton-Raphson method
- [x] Waterfall distribution (`src/lib/computations/waterfall.ts`) — multi-tier with LP/GP splits
- [x] Capital account computation (`src/lib/computations/capital-accounts.ts`) — roll-forward logic
- [x] API endpoints wired: `/waterfall-templates/[id]/calculate`, `/investors/[id]/capital-account/compute`, `/nav/[entityId]`
- [ ] **Not verified** — computation code exists but correctness has not been validated

### Integrations (Working)
- [x] AI: OpenAI + Anthropic SDK — deal screening, DD analysis, IC memo generation, command bar search
- [x] Vercel Blob: document upload and storage
- [x] Clerk: authentication in production

### Integrations (Code Exists, Untested)
- [x] Slack: IC voting via Block Kit buttons (`src/lib/slack.ts`, 245 lines), signature verification, callback sync — **untested with real Slack workspace**

### LP Portal (5 pages)
- [x] LP dashboard with stat cards and performance metrics
- [x] Capital account statement with color-coded line items
- [x] Portfolio look-through (pro-rata asset exposure)
- [x] Activity feed (capital calls + distributions)
- [x] Document center

### Directory, Settings & Other GP Pages
- [x] Contacts, Companies, Investors management (CRUD + search)
- [x] AI configuration: provider, model, API key (encrypted storage)
- [x] DD category template editor
- [x] AI prompt template editor
- [x] E-signature package model
- [x] Fundraising round tracking model
- [x] User directory page (`/directory`)
- [x] Document library page (`/documents`)
- [x] Task management page (`/tasks`)
- [x] Meeting notes page (`/meetings`)
- [x] Accounting page (`/accounting`) — connection status UI
- [x] Dashboard page (`/dashboard`)
- [x] Settings page (`/settings`)

### Redirect Routes
- [x] `/capital` → redirects to `/transactions`
- [x] `/waterfall` → redirects to `/transactions`
- [x] `/funds` → redirects to `/entities`

---

## What Needs Verification or Completion

See `.planning/REQUIREMENTS.md` for the full registry with REQ-IDs.

### Known Bugs (Need Re-verification)
- DD tab shows 0% / NOT_STARTED for deals past DD stage — **may or may not still exist**
- Pipeline pass rate shows 300% (calculation error) — **may or may not still exist**
- IC Memo shows "Generating..." spinner indefinitely on some deals — **may or may not still exist**

### Computation Code (Exists, Needs Verification)
- Financial computation code exists in `src/lib/computations/` but has **not been verified** to produce correct results
- Dashboard and LP portal display seeded values — unclear if they call the computation endpoints or show hardcoded data
- Fee calculation engine: model exists, seeded data — no computation logic found
- Side letter rules: model exists — no rule application logic found

### Not Connected
- QBO/Xero: connection status UI exists, **no real OAuth or API calls**
- Email/SMS notifications: models exist, **no delivery engine**
- DocuSign: model and stub endpoint exist, **no real API**
- Fireflies: model supports it, no webhook receiver
- Asana/Notion: not started

### Role Enforcement
- UserRole enum exists, Clerk auth works — but **no middleware enforcing role-based route access**
- Any authenticated user can access any route

### Missing Infrastructure
- No pagination on any data list
- No error boundaries
- No request rate limiting
- No PDF/Excel report generation
- No K-1 upload/distribution
