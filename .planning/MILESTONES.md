# Atlas — Milestones

## v2.0 Intelligence Platform (Shipped: 2026-03-18)

**Phases:** 10 | **Plans:** 58
**Timeline:** 10 days (2026-03-08 → 2026-03-18)
**Stats:** 264 commits, 545 files changed, ~91K LOC TypeScript
**Requirements:** 99/99 satisfied

### Key Accomplishments

1. **AI command bar & intelligence layer** — Natural language queries, action execution, CIM extraction, DD summaries, IC memos, LP update drafting, task suggestions — all from the command bar
2. **Document intake engine** — Upload CIMs/leases/credit docs anywhere in the app, AI auto-extracts structured data and links to deals/assets/entities
3. **Deal desk & CRM** — Full pipeline with days-in-stage, IC memo PDF export, bulk actions, contact directory with interaction history, relationship tags, co-investor network
4. **Capital activity workflows** — Status advancement buttons (Draft→Issued→Funded / Draft→Approved→Paid), waterfall scenario preview, asset-level transaction ledgers, entity financial summaries
5. **GP dashboard as morning briefing** — 7-section dashboard with pipeline funnel, needs-attention alerts, filterable activity feed, asset allocation, capital deployment tracker
6. **Schema & UI hardening** — Structured logging across 99 files, Zod validation on all API routes, custom Select/Modal/Tabs components, full dark mode audit, SectionErrorBoundary wiring

### Known Gaps (Tech Debt)

- Plan 20-10 (final human verification checkpoint) not formally executed as separate pass
- 6 phases missing formal VERIFICATION.md files (12, 13, 14, 15, 18, 20)
- Meeting detail page (/meetings/[id]) not built — activity feed links to meetings list instead

### Archive

- [v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)
- [v2.0-REQUIREMENTS.md](milestones/v2.0-REQUIREMENTS.md)
- [v2.0-MILESTONE-AUDIT.md](milestones/v2.0-MILESTONE-AUDIT.md)

---

## v1.0 GP Production Ready

**Shipped:** 2026-03-08
**Phases:** 10 | **Plans:** 36
**Timeline:** 8 days (2026-03-01 - 2026-03-08)
**Stats:** 231 commits, 497 files changed, ~92K LOC TypeScript

### Key Accomplishments

1. **Full deal lifecycle** — Deal pipeline kanban with 7-tab detail view, AI-powered DD analysis, IC voting with configurable decision structures, closing checklist, and deal-to-asset transition
2. **Real financial computations** — IRR (XIRR), waterfall distribution, capital accounts, TVPI/DPI/RVPI/MOIC all computed from actual capital call/distribution data with configurable fee calculation engine
3. **GP Dashboard as morning briefing** — Entity cards with NAV breakdown, portfolio aggregates, top/bottom performers, capital deployment visualization, and LP comparison view
4. **Complete accounting integration** — QBO OAuth per entity, account mapping with auto-detect, trial balance sync, two-layer NAV (GL cost basis + Atlas fair value)
5. **Notification & reporting engine** — Email (Resend) + SMS (Twilio) delivery, PDF reports (quarterly, capital statement, fund summary), Excel export, K-1 bulk distribution
6. **RBAC enforcement** — GP_ADMIN/GP_TEAM/SERVICE_PROVIDER/LP_INVESTOR role-based access across all 21 GP API routes with entity-scope and time-bound checks

### Known Gaps (Tech Debt)

- Slack IC voting untestable without real workspace credentials
- Full batch digest processor (cron job) not built — immediate dispatch skipped for digest LPs
- Missing VERIFICATION.md for Phases 2, 4, 5
- Recharts v3 any-type workaround in performance charts

### Archive

- [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)
- [v1.0-MILESTONE-AUDIT.md](milestones/v1.0-MILESTONE-AUDIT.md)
