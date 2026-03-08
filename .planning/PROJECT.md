# Atlas — Project Context

## What This Is

Atlas is a family office operating system that replaces the patchwork of spreadsheets, portals, and emails used to manage fund operations. It covers deal pipeline, asset management, LP relations, accounting, capital activity, and entity management — all in one place.

## Who It's For

A family office GP running ~9 fund entities (plus sidecars and SPVs) with a small team: the GP, a CFO, and a CIO. External service providers (CPA, tax preparer) need scoped access. ~10 LPs today, scaling toward $1B AUM.

The portfolio spans real estate, private credit, and operating businesses — each held directly, through a fund, through an SPV, or as an LP in another GP's vehicle. Plus LP stakes across exotic asset classes (sports, life insurance, etc.). Contract-level detail matters (leases, credit agreements, covenants).

## Core Value

The GP team can manage the full deal-to-asset lifecycle and see accurate fund/LP metrics in one place, replacing spreadsheets and emails with a single operating system that scales from where they are today to $1B AUM.

---

## Current State (v1.0 shipped 2026-03-08)

Atlas is **deployed on Vercel with real Clerk authentication and real data**. v1.0 is production-ready for GP daily operations.

- **Auth:** Clerk 7 active in production. Mock UserProvider available for local dev.
- **Data:** Production uses real data. Dev uses seeded demo data (8 users: 3 GP + 5 LP).
- **Codebase:** ~85K LOC TypeScript, 57 Prisma models, 73+ REST API routes, ~25 GP pages, 5 LP pages.

### What's Shipped

- **Deal Desk:** Full pipeline kanban, 7-tab deal detail (Overview, DD, Documents, Notes, Activity, IC Review, Closing), AI-powered DD analysis, IC voting with configurable decision structures, deal-to-asset transition
- **Asset Management:** Type-specific detail pages (RE/Credit/Equity/Fund LP), valuations, income events, source deal attribution
- **Entity Management:** 6 entity types, formation workflow, multi-entity deal participation, investor management
- **Capital Activity:** Capital calls/distributions with line items, waterfall distribution engine, fee calculation, capital account ledger
- **Financial Metrics:** XIRR, TVPI/DPI/RVPI/MOIC computed from real data, fund-level and LP-level aggregation, performance attribution
- **GP Dashboard:** Entity cards with NAV, portfolio aggregates, LP comparison, top/bottom performers
- **Accounting:** QBO OAuth per entity, account mapping, trial balance sync, two-layer NAV
- **LP Portal:** Computed metrics dashboard, time-series charts, capital account statement, document center with downloads
- **Notifications:** Email (Resend) + SMS (Twilio), LP preference toggles, digest support
- **Reports:** Quarterly report PDF, capital account statement PDF, fund summary PDF, Excel export on all tables, K-1 upload/distribution
- **Integrations:** DocuSign, Asana, Notion, Plaid, Google Calendar, Slack IC voting
- **RBAC:** GP_ADMIN/GP_TEAM/SERVICE_PROVIDER/LP_INVESTOR with fine-grained per-area permissions
- **Infrastructure:** Pagination, error boundaries, rate limiting, audit logging

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
| PDF | @react-pdf/renderer |
| Excel | xlsx |
| Email | Resend SDK |
| SMS | Twilio (raw fetch) |
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
| SDK usage | Raw fetch for QBO/DocuSign/Twilio | Consistent pattern, better TS support |
| Fee adjustments | Side letter adjustments informational-only | Base fees unchanged, details in JSON |
| Pagination | Cursor-based with SWR accumulation | Complex pages need direct control |
| Fire-and-forget | Audit logging, notifications, NAV snapshots | Never block primary operations |

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

## Current Milestone: v1.1 Module Deep Pass

**Goal:** Module-by-module deep pass across all areas of Atlas — filling feature gaps and polishing UI/UX to production quality, with equal weight on functionality and user experience.

**Target features:**
- Deep pass on every module: Deals, Assets, Entities, Capital Activity, LP Portal, Dashboard, Accounting, Settings, Integrations
- Fill missing CRUD operations, incomplete workflows, orphaned UI
- Polish layouts, spacing, consistency, responsiveness, empty states
- Fix any issues surfaced by codebase scan

---

## Requirements

Full requirement registry: see `.planning/REQUIREMENTS.md` (created per milestone)

v1.0 requirements archived: [milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)

---

*Last updated: 2026-03-08 after v1.1 milestone started*
