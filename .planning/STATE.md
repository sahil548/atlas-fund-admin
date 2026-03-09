---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Intelligence Platform
status: executing
stopped_at: Completed 13-02-PLAN.md
last_updated: "2026-03-09T20:19:52.703Z"
last_activity: "2026-03-09 — Phase 13 Plan 01 complete (pipeline intelligence: daysInStage badges on kanban cards, column value headers, View Asset link on closed deals)"
progress:
  total_phases: 9
  completed_phases: 2
  total_plans: 30
  completed_plans: 12
  percent: 71
---

# Atlas — GSD State

## Project Reference
- **PROJECT.md:** `.planning/PROJECT.md` (updated 2026-03-08)
- **Core value:** GP team manages full deal-to-asset lifecycle and fund/LP metrics in one place
- **Current focus:** v2.0 Intelligence Platform — Phase 13 (Deal Desk & CRM) Plan 2 COMPLETE, Plan 3 is next

## Current Position
- **Milestone:** v2.0 (Intelligence Platform)
- **Phase:** 13 of 19 — Deal Desk & CRM (In Progress)
- **Plan:** 2 of 5 complete
- **Status:** Executing
- **Last activity:** 2026-03-09 — Phase 13 Plan 02 complete (IC memo PDF export with @react-pdf/renderer + dead deal kill reason analytics chart and mini-summary)

Progress: [███████░░░] 71% (47/66 plans)

## Performance Metrics
- Plans completed (v1.0): 36 plans across 10 phases
- v2.0 plans completed: 10

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| v1.0 (1-10) | 36 | ~180min | ~5min |
| 11-foundation | 5 | 41min | 8min |
| Phase 12-ai-configuration-document-intake P01 | 18 | 4 tasks | 6 files |
| Phase 12 P02 | 7 | 2 tasks | 4 files |
| Phase 12 P03 | 7 | 2 tasks | 4 files |
| Phase 12-ai-configuration-document-intake P04 | 18 | 3 tasks | 6 files |
| Phase 12-ai-configuration-document-intake P05 | 5 | 2 tasks | 0 files |
| Phase 13-deal-desk-crm P01 | 3 | 2 tasks | 4 files |
| Phase 13-deal-desk-crm P02 | 7min | 2 tasks | 6 files |

## Accumulated Context

### Key Architectural Decisions for v2.0
- **Fireflies:** Per-user OAuth — each GP member connects their own account (not firm-wide)
- **LLM keys:** Tenant default + user override; GP_ADMIN controls who gets AI access
- **AI access:** Service providers disabled by default; users can override tenant key in profile
- **Integration scoping:** Accounting per-entity, Fireflies per-user, most others tenant-wide
- **No code to GitHub:** Planning docs only for this milestone (no pushes)
- **Schema discipline:** Treat schema changes as high-risk; prefer query/UI fixes over new Prisma fields

### Phase 12 AI Config + Document Intake Decisions (COMPLETE)
- **getUserAIConfig fallback chain:** personal key → tenant key → none; source field indicates origin ("user" | "tenant" | "none")
- **SERVICE_PROVIDER AI default:** aiEnabled=false on creation (POST /api/users); GP_ADMIN/GP_TEAM default to true via schema
- **LP_INVESTOR AI:** Shown as N/A in toggle column — AI access not applicable to LP users
- **createUserAIClient returns null:** when apiKey is null OR aiEnabled is false — callers must null-check result
- **Force-reset note:** Schema migration wipes AiConfig table — tenant AI key must be re-entered in Settings after any force-reset
- **AI extraction trigger pattern:** Fire-and-forget via .catch() — never await in upload handlers; use retry endpoint for guaranteed completion
- **extractDocumentFields no-key behavior:** Sets extractionStatus=NONE (not FAILED) when no AI key configured — FAILED reserved for actual extraction errors
- **Global /documents POST:** Now calls extractTextFromBuffer() before document creation (was missing before Plan 03)
- **Retry endpoint:** POST /api/documents/[id]/extract?firmId=xxx — awaits synchronously, returns updated extractionStatus/extractedFields
- **DocumentExtractionPanel:** Right-side drawer (not modal) — panel closes on apply, onUpdate() triggers SWR revalidation
- **apply-fields dual write:** Stores audit trail on Document.appliedFields AND writes to parent deal/asset/entity in same request (DOC-02)
- **Fields without parent columns:** Go to Deal.dealMetadata or Asset.projectedMetrics JSON — no schema changes needed
- **ConfirmDialog variant:** Use "primary" (not "default") — actual interface is "primary" | "danger"
- **Phase 12 verification:** All 8 requirements (AICONF-01 through DOC-03) passed human browser testing — phase declared complete 2026-03-09

### Phase 13 Deal Desk & CRM Decisions (In Progress)
- **daysInStage computation:** Use DealActivity STAGE events to find when deal entered current stage; fallback to deal.createdAt if no matching activity
- **Compute-and-strip pattern:** Include activities for computation then strip before returning: `const { activities, ...rest } = deal; return { ...rest, daysInStage }`
- **Days-in-stage color thresholds:** gray <14d, amber 14-30d, red >30d — matches intuitive SLA for deal velocity monitoring
- **Column header value:** Pulled from existing pipelineAnalytics.valueByStage already in SWR response — zero additional DB queries
- **View Asset link:** Guarded by sourceAssets?.length > 0 — safe for legacy closed deals that predate the sourceAssets relation
- **PDF dynamic import:** @react-pdf/renderer cannot run during SSR — use `await import("@react-pdf/renderer")` inside click handler for client-side only generation
- **killReason in two APIs:** /deals page uses pipelineAnalytics from /api/deals (already fetched for kanban); /analytics page uses /api/analytics/pipeline — both compute independently

### Phase 11 Foundation Decisions
- **Date formatting:** Native Intl.DateTimeFormat (not date-fns) -- zero bundle cost for identical output
- **Component test strategy:** Dynamic import to verify exports (node vitest env, no jsdom)
- **formatRelativeTime cutoff:** 7+ days falls back to absolute date format
- **Dark mode pattern:** Every light color class paired with dark: class (gray-900/100, gray-200/700, gray-100/800)
- **Unified ConfirmAction pattern:** Settings page uses single state + single dialog for 3 destructive actions
- **FOUND-03 regression test:** Grep-as-test with per-line analysis prevents future confirm() additions
- **Skeleton loading pattern:** Table pages use TableSkeleton in tbody; kanban/card pages use inline skeleton divs
- **EmptyState on all list pages:** Every list page distinguishes true-empty (with CTA) from filtered-empty (with Clear filters)
- **PageHeader adoption:** List pages get title only (no breadcrumbs); detail pages get breadcrumb trails in future phases
- **SectionPanel scope:** Skipped on dashboard/analytics/settings (complex layouts); applied only where white-card pattern exists

### Phase Ordering Rationale
- Phase 11 (Foundation) first — shared component changes break all 30 pages if done mid-stream
- Phase 12 (AI Config + Doc Intake) second — infrastructure before any AI feature phases
- Phases 13-15 (Deals+CRM, Assets+Tasks, Entities+MTG) — core GP workflows in parallel-friendly order
- Phase 16 (Capital Activity) before Phase 17 (LP Portal) — capital changes break LP portal
- Phase 18 (AI Features) after Phase 12 (AICONF must exist first)
- Phase 19 (Dashboard + Supporting) last — aggregates data from all prior modules

### Blockers/Concerns
- LP portal metrics accuracy unverified (seeded vs computed) — must verify in Phase 17
- Financial calculation correctness (IRR, waterfall) not formally verified — spot-check in Phase 16
- Schema changes carry production risk — verify DATABASE_URL points to dev before any prisma push

## Session Continuity
- **Initialized:** 2026-03-08
- **Last session:** 2026-03-09T20:19:52.700Z
- **Stopped at:** Completed 13-02-PLAN.md
- **Resume file:** .planning/phases/13-deal-desk-crm/13-02-SUMMARY.md
