# Atlas — Project Context

## What This Is

Atlas is an AI-powered family office operating system that replaces the patchwork of spreadsheets, portals, and emails used to manage fund operations. It covers deal pipeline, asset management, LP relations, accounting, capital activity, entity management, CRM, meeting intelligence, and AI-assisted workflows — all in one place.

## Who It's For

A family office GP running ~9 fund entities (plus sidecars and SPVs) with a small team: the GP, a CFO, and a CIO. External service providers (CPA, tax preparer) need scoped access. ~10 LPs today, scaling toward $1B AUM.

The portfolio spans real estate, private credit, and operating businesses — each held directly, through a fund, through an SPV, or as an LP in another GP's vehicle. Plus LP stakes across exotic asset classes (sports, life insurance, etc.). Contract-level detail matters (leases, credit agreements, covenants).

## Core Value

The GP team can manage the full deal-to-asset lifecycle and see accurate fund/LP metrics in one place, replacing spreadsheets and emails with a single AI-powered operating system that scales from where they are today to $1B AUM.

---

## Current State (v2.0 shipped 2026-03-18)

Atlas is **deployed on Vercel with real Clerk authentication and real data**. v2.0 adds AI intelligence, CRM, meeting capture, and production-quality polish to the v1.0 foundation.

- **Auth:** Clerk 7 active in production. Mock UserProvider available for local dev.
- **Data:** Production uses real data. Dev uses seeded demo data (8 users: 3 GP + 5 LP).
- **Codebase:** ~91K LOC TypeScript, 60+ Prisma models, 90+ REST API routes, ~30 GP pages, 5 LP pages.

### What's Shipped

**v1.0 (2026-03-08):**
- Full deal lifecycle (pipeline kanban, 7-tab detail, IC voting, deal-to-asset)
- Asset management with type-specific detail pages
- Entity management (6 types, formation workflow)
- Capital activity (calls, distributions, waterfall, fees, capital accounts)
- Financial metrics (XIRR, TVPI/DPI/RVPI/MOIC from real data)
- QBO accounting integration per entity
- LP portal with computed metrics
- Notifications (email + SMS), reports (PDF + Excel), K-1 distribution
- RBAC with 4 role levels

**v2.0 (2026-03-18):**
- AI command bar with natural language queries and action execution
- Document intake engine with AI extraction (CIMs, leases, credit docs)
- CRM/directory with interaction history, relationship tags, co-investor network
- Deal desk enhancements (days-in-stage, IC memo PDF, bulk actions, dead deal analytics)
- Asset management completion (exit workflow, holding-type adaptive UI, monitoring panel)
- Task management with context linking, drag-and-drop, auto-creation on deal stage transitions
- Entity hierarchy views (flat, org chart, cards), formation checklist, regulatory filings
- Meeting intelligence via Fireflies (per-user OAuth, AI summaries, action items)
- Capital activity workflows (status advancement buttons, waterfall scenario preview, transaction ledgers)
- LP portal accuracy verification, date range picker, K-1 acknowledgment, per-entity metrics
- GP dashboard as morning briefing (7 sections: summary, alerts, pipeline, entity cards, charts, performers, activity feed)
- Schema hardening (structured logging, Zod on all routes, DB indexes, dead code cleanup)
- UI polish (custom Select/Modal/Tabs, full dark mode, SectionErrorBoundary)

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
| DnD | @dnd-kit |
| Deployment | Vercel |

---

## Requirements

### Validated

- ✓ All v1.0 requirements (36 plans) — v1.0
- ✓ FOUND-01 through FOUND-08 (shared components, formatting, dark mode) — v2.0
- ✓ DEAL-11 through DEAL-16 (pipeline completeness, bulk actions, analytics) — v2.0
- ✓ ASSET-04 through ASSET-09 (exit workflow, adaptive UI, monitoring) — v2.0
- ✓ ENTITY-01 through ENTITY-05 (hierarchy, formation, regulatory, side letters) — v2.0
- ✓ CAP-01 through CAP-06 (status workflows, waterfall preview, transaction ledgers) — v2.0
- ✓ LP-04 through LP-09 (accuracy, date picker, K-1 workflow, profile) — v2.0
- ✓ AI-01 through AI-08 (command bar, extraction, analysis, monitoring) — v2.0
- ✓ AICONF-01 through AICONF-05 (key management, access control) — v2.0
- ✓ DOC-01 through DOC-03 (document intake engine) — v2.0
- ✓ CRM-01 through CRM-06 (contacts, interactions, sourcing, co-investors) — v2.0
- ✓ TASK-01 through TASK-05 (context linking, DnD, auto-creation) — v2.0
- ✓ MTG-01 through MTG-05 (Fireflies, summaries, action items) — v2.0
- ✓ DASH-01 through DASH-04 (dashboard intelligence surface) — v2.0
- ✓ SUPP-01 through SUPP-06 (reports, integrations, notifications) — v2.0
- ✓ INTEG-01 through INTEG-09 (bug fixes, dead code, workflow verification) — v2.0
- ✓ SCHEMA-01 through SCHEMA-04 (logging, Zod schemas, indexes, parseBody) — v2.0
- ✓ UIPOL-01 through UIPOL-06 (modal, select, tabs, dark mode, error boundaries) — v2.0

### Active

(None — define in next milestone via `/gsd:new-milestone`)

### Out of Scope

- Native mobile app (PWA later, native much later)
- SOC 2 compliance (build toward it, not yet)
- Multi-currency support (USD only)
- Secondary market transaction support
- Automated wire initiation
- Investor onboarding / subscription doc workflow
- Advanced analytics / benchmarking
- White-labeling / custom branding
- Automated K-1 generation (upload only)
- Public market portfolio tracking
- Real-time chat/messaging (overkill for 3-person GP team)

---

## Key Decisions Made

| Decision | Answer | Rationale | Outcome |
|----------|--------|-----------|---------|
| Data migration | Manual entry | Avoid messy imports | ✓ Good |
| Accounting | Multi-entity QBO | 9 separate companies | ✓ Good |
| AI provider | User-supplied key (Claude/OpenAI) | Flexible, no vendor lock-in | ✓ Good |
| LLM API keys | Tenant default + per-user override | Admin controls access | ✓ Good |
| Fireflies | Per-user OAuth | Each GP member connects own | ✓ Good |
| AI access | Admin toggle per user | Prevents unauthorized token burn | ✓ Good |
| API style | REST (not tRPC) | Simpler, more flexible | ✓ Good |
| State management | SWR (not Redux/Zustand) | Pragmatic for current scale | ✓ Good |
| Waterfall | Fully configurable | Different per fund | ✓ Good |
| Side letters | Extensive, per-LP, per-fund | Common in family office | ✓ Good |
| Logger | Custom zero-dep (not Winston) | No bundle cost | ✓ Good |
| Validation | parseBody + Zod on all routes | Type-safe, auto-400 errors | ✓ Good |
| Component upgrades | Custom Select/Modal vs Radix | Control without dependency | ✓ Good |

---

## Constraints

- **Non-developer owner.** All documentation must be plain English.
- **Vercel deployment.** Serverless function limits (10s default, 50MB bundle).
- **No background jobs.** No Redis, no cron. AI analysis runs inline. May need to add later.
- **No tests.** Build validation via `npm run build`. Manual testing via localhost.
- **Single database.** PostgreSQL, no read replicas.

---

## Context

- **v1.0 shipped 2026-03-08:** 231 commits, 497 files, ~92K LOC
- **v2.0 shipped 2026-03-18:** 264 commits, 545 files, ~91K LOC
- **Total:** 495 commits, 94 plans across 20 phases

v1.0 requirements archived: [milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)
v2.0 requirements archived: [milestones/v2.0-REQUIREMENTS.md](milestones/v2.0-REQUIREMENTS.md)

---

*Last updated: 2026-03-18 after v2.0 milestone shipped*
