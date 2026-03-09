---
phase: 13-deal-desk-crm
plan: 05
subsystem: crm
tags: [prisma, crm, deals, contacts, co-investors, swr, nextjs, api]

# Dependency graph
requires:
  - phase: 13-04
    provides: Contact model with interactions, tags relations, contact detail page

provides:
  - DealCoInvestor junction model with dealId, contactId/companyId, role, allocation, status
  - Deal.sourcedByContactId field linking deals to source contacts
  - Contact.sourcedDeals back-relation for deals this contact sourced
  - Contact.coinvestments back-relation for DealCoInvestor records
  - Company.coinvestments back-relation for DealCoInvestor records
  - /api/deals/[id]/co-investors GET+POST CRUD endpoints
  - /api/deals/[id]/co-investors/[coInvestorId] PUT+DELETE endpoints
  - DealCoInvestorsSection component with full CRUD, add/edit/delete modals, search
  - Co-Investors tab on deal detail page (all deal stages)
  - "Sourced by: {name}" link in deal header
  - Source Contact dropdown in EditDealForm
  - ContactDealsTab populated with real Deals Sourced + Co-Investments sections

affects:
  - 14-xx (asset pages may surface co-investor contacts)
  - 13-CONTEXT (CRM relationship intelligence now complete)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - DealCoInvestor seed data added after contacts are seeded (deal FK to contact requires contacts first — use deal.update after contacts created)
    - sourcedByContactId updated via prisma.deal.update after contacts seeded (not inline in deal.create) to avoid FK constraint violations
    - Co-investor search uses two separate API endpoints (contacts vs companies) based on mode toggle
    - Co-investor form uses live search-as-you-type with result dropdown; no separate search component needed

key-files:
  created:
    - src/app/api/deals/[id]/co-investors/route.ts (GET + POST collection)
    - src/app/api/deals/[id]/co-investors/[coInvestorId]/route.ts (PUT + DELETE individual)
    - src/components/features/deals/deal-co-investors-section.tsx (full CRUD UI with add/edit/delete modals)
  modified:
    - prisma/schema.prisma (DealCoInvestor model + back-relations on Deal/Contact/Company — already in HEAD from 15-01)
    - prisma/seed.ts (dealCoInvestor deleteMany + 6 sample records + sourcing attribution updates)
    - src/lib/schemas.ts (CreateCoInvestorSchema, UpdateCoInvestorSchema + sourcedByContactId on Deal schemas)
    - src/app/api/deals/[id]/route.ts (coInvestors + sourcedByContact includes, sourcedByContactId in PUT)
    - src/app/api/contacts/[id]/route.ts (sourcedDeals + coinvestments includes)
    - src/app/(gp)/deals/[id]/page.tsx (Co-Investors tab in stageTabs + getDeadTabs, sourced-by link, import)
    - src/components/features/deals/edit-deal-form.tsx (Source Contact dropdown + sourcedByContactId in form state)
    - src/components/features/contacts/contact-deals-tab.tsx (Deals Sourced + Co-Investments from real API data)

key-decisions:
  - "Seed FK ordering: Deal.sourcedByContactId requires contacts to exist first — used prisma.deal.update after contacts seeded rather than inline on deal creation"
  - "Co-Investors as separate tab (not overview section): deal overview already has lots of content; dedicated tab gives co-investors full table real estate"
  - "Contact/company toggle in add modal: single search UI that switches between contact and company search endpoints — cleaner than combined endpoint"

patterns-established:
  - "Co-investor CRUD: add modal with mode toggle (contact/company) + live search dropdown; edit modal for role/status/allocation/notes; delete via ConfirmDialog"
  - "Sourcing attribution: optional sourcedByContactId on Deal, displayed as inline link in deal header and in ContactDealsTab.sourcedDeals"

requirements-completed: [CRM-05, CRM-06]

# Metrics
duration: 14min
completed: 2026-03-09
---

# Phase 13 Plan 05: Deal Sourcing Attribution + Co-Investor Network Summary

**DealCoInvestor junction model with CRUD API + co-investor management tab on deals + source contact attribution on deal form and contact deal history**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-03-09T20:46:01Z
- **Completed:** 2026-03-09T20:59:58Z
- **Tasks:** 2
- **Files modified:** 8 (+ 3 created)

## Accomplishments

- Added DealCoInvestor model (already in schema via 15-01 commit), wired seed data (6 co-investor records, 3 deals with sourcedByContactId), and full Zod schemas for create/update
- Built GET/POST collection route and PUT/DELETE individual route for co-investors with firmId ownership verification
- Created DealCoInvestorsSection component: add modal with contact/company search, role/status/allocation form, edit modal, delete confirm dialog, status color-coded badges
- Added Co-Investors tab to all deal stages (screening through closed), displayed "Sourced by: {name}" link in deal header
- Added Source Contact dropdown to EditDealForm with live contacts list from API
- Populated ContactDealsTab: "Deals Sourced" table with deal name/stage/size/date; "Co-Investments" table with deal/role/allocation/status; both with proper empty states

## Task Commits

1. **Task 1: DealCoInvestor model + co-investor CRUD APIs + contact sourcing** - `290ba07` (feat)
2. **Task 2: Co-investor UI section + source contact on deal form + contact deals tab** - `5d06337` (feat)

## Files Created/Modified

- `src/app/api/deals/[id]/co-investors/route.ts` - GET list + POST create co-investors
- `src/app/api/deals/[id]/co-investors/[coInvestorId]/route.ts` - PUT update + DELETE remove
- `src/components/features/deals/deal-co-investors-section.tsx` - Full CRUD UI component
- `prisma/seed.ts` - dealCoInvestor deleteMany + 6 sample records + sourcedByContactId updates
- `src/lib/schemas.ts` - CreateCoInvestorSchema, UpdateCoInvestorSchema, sourcedByContactId on Deal schemas
- `src/app/api/deals/[id]/route.ts` - coInvestors + sourcedByContact in GET include; sourcedByContactId in PUT
- `src/app/api/contacts/[id]/route.ts` - sourcedDeals + coinvestments in GET include
- `src/app/(gp)/deals/[id]/page.tsx` - Co-Investors tab added to all stages, sourced-by link in header
- `src/components/features/deals/edit-deal-form.tsx` - Source Contact dropdown added
- `src/components/features/contacts/contact-deals-tab.tsx` - Real Deals Sourced + Co-Investments sections

## Decisions Made

- Seed FK ordering: contacts must exist before deals can reference them via sourcedByContactId. Used `prisma.deal.update` after contacts seeded rather than inline on deal creation to avoid ForeignKeyConstraintViolation.
- Co-Investors as separate tab (not section in overview): overview tab already contains substantial content (AI memo, stage info, thesis notes). Dedicated tab provides full table real estate.
- Contact/company toggle in add modal: single search UI that switches between contact and company search API endpoints based on mode, keeping UX simple without a combined endpoint.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed FK constraint violation in seed.ts**
- **Found during:** Task 1 (seed execution)
- **Issue:** Deal creation with `sourcedByContactId` failed because contacts are seeded after deals — FK constraint requires referenced contact to exist first
- **Fix:** Removed sourcedByContactId from deal.create data; added `prisma.deal.update` calls after contacts seeded to set attribution
- **Files modified:** prisma/seed.ts
- **Verification:** Seed ran successfully with all 6 co-investor records + 3 sourcing attributions
- **Committed in:** 290ba07 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — FK constraint ordering bug)
**Impact on plan:** Necessary fix for seed correctness. No scope changes to planned CRM work.

## Issues Encountered

- Schema.prisma already had DealCoInvestor model and back-relations from Phase 15 Plan 01 commit (feat(15-01): schema migration) — this plan's schema changes were already committed. No conflict; just continued from that state.
- Build lock file stale from interrupted build — removed `.next/lock` and cleaned `.next/` directory to unblock subsequent builds.

## User Setup Required

None — database was re-seeded automatically with new co-investor data. No external service configuration required.

## Next Phase Readiness

- CRM co-investor and deal sourcing attribution complete: CRM-05 and CRM-06 requirements satisfied
- Phase 13 CRM work is now complete (Plans 01-05 all done)
- Contact detail page shows full deal relationship intelligence: sourced deals, co-investments, linked deals, linked assets
- Deal detail page shows co-investor participation with full CRUD management

---
*Phase: 13-deal-desk-crm*
*Completed: 2026-03-09*

## Self-Check: PASSED

- `src/app/api/deals/[id]/co-investors/route.ts` exists: FOUND
- `src/app/api/deals/[id]/co-investors/[coInvestorId]/route.ts` exists: FOUND
- `src/components/features/deals/deal-co-investors-section.tsx` exists: FOUND
- `.planning/phases/13-deal-desk-crm/13-05-SUMMARY.md` exists: FOUND
- Commit `290ba07` (Task 1): FOUND
- Commit `5d06337` (Task 2): FOUND
- Build passes: CONFIRMED (zero TypeScript errors, all 97 pages generated)
