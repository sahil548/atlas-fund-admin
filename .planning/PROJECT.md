# Atlas — Project Context

## What This Is

Atlas is an AI-powered family office operating system that replaces the patchwork of spreadsheets, portals, and emails used to manage fund operations. It covers deal pipeline, asset management, LP relations, accounting, capital activity, entity management, CRM, meeting intelligence, and AI-assisted workflows — all in one place.

## Who It's For

A family office GP running ~9 fund entities (plus sidecars and SPVs) with a small team: the GP, a CFO, and a CIO. External service providers (CPA, tax preparer) need scoped access. ~10 LPs today, scaling toward $1B AUM.

The portfolio spans real estate, private credit, and operating businesses — each held directly, through a fund, through an SPV, or as an LP in another GP's vehicle. Plus LP stakes across exotic asset classes (sports, life insurance, etc.). Contract-level detail matters (leases, credit agreements, covenants).

## Core Value

The GP team can manage the full deal-to-asset lifecycle and see accurate fund/LP metrics in one place, replacing spreadsheets and emails with a single AI-powered operating system that scales from where they are today to $1B AUM.

---

## Current Milestone: v3.0 Consolidation & Scale Readiness

**Goal:** Close accumulated v2.0/v2.1 gaps (fit & finish), then harden for a 2–3x growth scenario (30 LPs, 30 assets): RBAC enforcement, pagination, error boundaries, and E2E test coverage on the CRUD work shipped in v2.1.

**Target themes:**
- **Fit & finish:** close v2.0 VERIFICATION.md gaps, retrofit stale REQUIREMENTS checkboxes, complete Plan 20-10 human verification, build missing `/meetings/[id]` page, refactor calculate route to use `pref-accrual.ts`, write waterfall conventions doc, validate waterfall against a second fund
- **RBAC enforcement:** middleware that enforces GP_ADMIN / GP_TEAM / SERVICE_PROVIDER / LP_INVESTOR roles on all API routes (currently any authenticated user can hit anything)
- **Pagination:** cursor-based pagination on list endpoints so the app stays responsive at 30+ LPs / assets
- **Error boundaries:** page-level boundaries so one bad API response doesn't crash the app
- **E2E tests for CRUD:** Playwright tests for Kathryn's v2.1 work (capital call lifecycle, distribution lifecycle, commitment edits) — locks in behavior that currently has zero regression coverage

**Explicitly deferred to v3.1+:** rate limiting on AI endpoints, code splitting / lazy loading, background jobs (BullMQ/Trigger.dev), full perf monitoring stack (Sentry/Datadog)

---

## Current State (v2.1 shipped 2026-04-16)

Atlas is **deployed on Vercel with real Clerk authentication and real data**. v2.0 added AI intelligence, CRM, meeting capture, and production polish. v2.1 added CRUD completion across all entity domains and rewrote waterfall/pref-return math for real-world fund accounting.

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
- ✓ CRUD-01 through CRUD-17 (edit/delete/revert across 9+ entity domains) — v2.1
- ✓ WF-01 through WF-26 (waterfall + pref-return correctness, PIC-weighted, 30/360, ROC handling, remainder-to-GP) — v2.1
- ✓ UX-01 through UX-10 (cap table + investor activity polish) — v2.1
- ✓ BUILD-01 through BUILD-05 (TypeScript + Prisma relation fixes) — v2.1

### Active (v3.0)

**Fit & Finish:**
- [ ] **FIN-01**: Build `/meetings/[id]` detail page (activity feed currently 404s)
- [ ] **FIN-02**: Refactor `/api/waterfall-templates/[id]/calculate` to import from `pref-accrual.ts` (remove duplicated logic)
- [ ] **FIN-03**: Write `docs/waterfall-conventions.md` explaining 30/360 inclusive and ROC effective-date convention
- [ ] **FIN-04**: Ground-truth waterfall against a second fund (beyond CG Private Credit Fund II) to surface PCF-II-specific assumptions
- [ ] **FIN-05**: Retrofit VERIFICATION.md for v2.0 phases 12, 13, 14, 15, 18, 20
- [ ] **FIN-06**: Sync stale REQUIREMENTS.md checkboxes (TASK-01..05, FIN-07, FIN-10, Phase 20 INTEG/SCHEMA/UIPOL)
- [ ] **FIN-07**: Execute Plan 20-10 (final human verification checkpoint for v2.0)
- [ ] **FIN-08**: Re-verify the three March-5 bugs (DD tab 0%, pass rate 300%, IC memo spinner) on current main

**Hardening:**
- [ ] **RBAC-01**: Role-enforcement middleware on all API routes (reject LP_INVESTOR on GP routes, SERVICE_PROVIDER scoped by entity)
- [ ] **RBAC-02**: Entity-scoped access for SERVICE_PROVIDER role (CPAs only see entities they're assigned to)
- [ ] **RBAC-03**: Admin audit log of role enforcement rejections (who tried what)
- [ ] **PAGE-01**: Cursor-based pagination helper reusable across list endpoints
- [ ] **PAGE-02**: Apply pagination to deals, assets, transactions, investors, tasks, documents, contacts list endpoints
- [ ] **PAGE-03**: UI: "Load more" pattern on list pages (SWR infinite mode)
- [ ] **ERR-01**: Page-level error boundaries catch malformed API responses without white-screening
- [ ] **ERR-02**: Graceful "Something went wrong" fallback with retry button on every main page
- [ ] **E2E-01**: Playwright setup + Clerk auth helper for E2E tests
- [ ] **E2E-02**: Capital call lifecycle E2E (create → edit line items → issue → fund → revert → delete)
- [ ] **E2E-03**: Distribution lifecycle E2E (create with waterfall → edit overrides → approve → pay → revert → delete)
- [ ] **E2E-04**: Commitment lifecycle E2E (create → assign unit class → edit amount → delete)
- [ ] **E2E-05**: Waterfall template E2E (create → add tiers → edit tiers → assign to vehicle → delete)

**Manual Walkthrough & Feedback (bookend the milestone):**
- [ ] **MAN-01**: GP-side BASELINE walkthrough at start of v3.0 (before any changes — Phase 21)
- [ ] **MAN-02**: LP-side BASELINE walkthrough at start of v3.0 (before any changes — Phase 21)
- [ ] **MAN-03**: Final walkthrough & sign-off at end of v3.0 (full stack feel-check — Phase 28)
- [ ] **MAN-04**: Follow-up fixes from walkthroughs before v3.0 sign-off (Phase 28)

### Out of Scope (v3.0)

**Deferred from v3.0 → v3.1+:**
- Rate limiting on AI endpoints (deferred — low-risk at 30 LP scale, revisit if AI costs spike)
- Code splitting / lazy loading (deferred — bundle size acceptable at current scale)
- Background job runner (deferred — no immediate need; notifications fire inline)
- Full perf monitoring stack (Sentry/Datadog — deferred, may revisit with a lightweight error tracker)

**Permanently out of scope:**

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
- **v2.1 shipped 2026-04-16:** 71 commits, +4,949 / −521 lines (tagged, pushed to origin)
- **Total:** ~566 commits, 94 GSD plans + 71 ad-hoc commits

v1.0 requirements archived: [milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)
v2.0 requirements archived: [milestones/v2.0-REQUIREMENTS.md](milestones/v2.0-REQUIREMENTS.md)
v2.1 requirements archived: [milestones/v2.1-REQUIREMENTS.md](milestones/v2.1-REQUIREMENTS.md)

---

*Last updated: 2026-04-16 after v2.1 milestone tagged + v3.0 scope defined*
