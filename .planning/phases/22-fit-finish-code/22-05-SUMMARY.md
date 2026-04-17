---
phase: 22-fit-finish-code
plan: "05"
subsystem: meetings-ui, activity-feed, lp-portfolio
tags: [meetings, click-through, activity-feed, lp-portfolio, invested-capital, fin-01, fin-12, obs-6, obs-19, lp-obs-3]
dependency_graph:
  requires: [22-01, 22-02, 22-03, 22-04]
  provides: [FIN-01-meeting-detail-page, FIN-01-activity-click-through, FIN-12-lp-portfolio-columns]
  affects: [dashboard-activity-feed, deal-activity-tab, asset-activity-tab, entity-meetings-section, lp-portfolio]
tech_stack:
  added: []
  patterns:
    - "SWR + useFirm() for meeting detail page (useParams for id)"
    - "prisma.capitalCallLineItem.aggregate() via capitalCall relation — no HTTP self-call"
    - "CapitalCallLineItem.entityId does not exist; filter via capitalCall: { entityId, status } relation"
    - "MeetingDetailCard gets optional href prop to avoid nested <button> inside <Link>"
key_files:
  created:
    - src/app/(gp)/meetings/[id]/page.tsx
  modified:
    - src/app/(gp)/meetings/page.tsx
    - src/components/features/meetings/meeting-detail-card.tsx
    - src/lib/routes.ts
    - src/app/api/activity/route.ts
    - src/components/features/deals/deal-activity-tab.tsx
    - src/app/(gp)/assets/[id]/page.tsx
    - src/components/features/entities/tabs/operations/entity-meetings-section.tsx
    - src/app/(lp)/lp-portfolio/page.tsx
    - src/app/api/lp/[investorId]/portfolio/route.ts
decisions:
  - "CapitalCallLineItem has no entityId field — aggregate via capitalCall relation (capitalCall: { entityId, status: 'FUNDED' })"
  - "MeetingDetailCard gets optional href prop rather than outer <Link> wrapper to avoid nested interactive element anti-pattern (card has internal expand/collapse button and Link-to dropdown)"
  - "Deal activity tab wires meeting entries via type=='meeting' check — /api/deals/[id]/activities returns unified timeline where meeting entries carry the real Meeting.id"
  - "Entity meetings section (entity-meetings-section.tsx) wired in addition to the 4 required sites — all meeting rendering surfaces now click through"
  - "Pre-existing test failures in foundation.test.ts, phase2-deal-stage-logic.test.ts, phase19-* are confirmed pre-existing (verified by stash test); 47 LP API tests all pass"
metrics:
  duration_minutes: 7
  tasks_completed: 3
  files_created: 1
  files_modified: 9
  commits: 3
  completed_date: "2026-04-16"
---

# Phase 22 Plan 05: Meeting Detail Page + Activity Feed Wiring + LP Portfolio Columns Summary

Plan 05 closes FIN-01 (meeting detail page + clickable meeting entries across 4+ surfaces) and the LP-Obs 3 half of FIN-12 (LP Portfolio Invested vs. Current Value columns derived server-side via Prisma aggregate).

## What Was Built

### Task 1: /meetings/[id] Detail Page + Route Registry + List Click-through (FIN-01)

New file `src/app/(gp)/meetings/[id]/page.tsx` renders full meeting detail: title, date, type, source, summary, action items (from decisions blob), keywords, linked deal/entity/asset navigation links, and transcript. Follows coding patterns: `"use client"`, `useFirm()`, SWR with loading guard, `useParams` for the id.

`src/lib/routes.ts` gains `/meetings/:id` entry (`hiddenFromSidebar: true`, `priority: 0`) so command bar and AI prompt know the route exists. `getPageTitle()` updated to handle `/meetings/` prefix.

`MeetingDetailCard` gains an optional `href` prop. When provided, the meeting title renders as a `<Link>` — preserving all existing internal buttons (expand/collapse, Link-to dropdown) without creating a nested `<button>`-inside-`<Link>` anti-pattern. `meetings/page.tsx` passes `href=/meetings/${m.id}` to each card.

**Commit:** `6e5141a`

### Task 2: Activity Feed Wiring (Obs 6, Obs 19)

Four wire-up sites + one bonus site:

1. **Activity API** (`src/app/api/activity/route.ts`): MEETING-type items now set `linkPath: /meetings/${m.id}` instead of `/meetings`. Dashboard feed's existing `<Link href={activity.linkPath}>` immediately picks this up — no dashboard component change needed.

2. **Deal Activity Tab** (`src/components/features/deals/deal-activity-tab.tsx`): The activities API (`/api/deals/[id]/activities`) returns a merged timeline where entries with `type: "meeting"` carry the real `Meeting.id`. Added check `activity.type === "meeting"` and render those entries as `<Link href=/meetings/${activity.id}>` (indigo color). Non-meeting entries unchanged.

3. **Asset Activity Tab** (`src/app/(gp)/assets/[id]/page.tsx`): Meeting rows now have `role="button"`, `tabIndex={0}`, `onClick={() => router.push('/meetings/${m.id}')}`, and `onKeyDown` for accessibility. `router` was already imported.

4. **Entity Meetings Section** (`src/components/features/entities/tabs/operations/entity-meetings-section.tsx`): Meeting rows wrapped in `<Link href=/meetings/${m.id}>` — bonus site not explicitly in plan but logically identical fix.

**Walkthrough evidence for Obs 6 (deal activity tab) and Obs 19 (asset activity tab):** Both were rendering meeting entries as non-clickable `div` elements. Now they route to `/meetings/[id]`.

**Commit:** `3c42442`

### Task 3: LP Portfolio Invested Capital + Current Value Columns (LP-Obs 3)

**API change** (`src/app/api/lp/[investorId]/portfolio/route.ts`): Derives `investedCapital` per asset via direct Prisma aggregate — no HTTP calls from inside the server route.

Key schema discovery: `CapitalCallLineItem` does NOT have `entityId` directly (only `capitalCallId`, `investorId`, `amount`, `status`). The entity relationship traverses: `CapitalCallLineItem -> CapitalCall (entityId)`. Aggregate filter is therefore:

```typescript
prisma.capitalCallLineItem.aggregate({
  _sum: { amount: true },
  where: {
    investorId,
    capitalCall: { entityId, status: "FUNDED" },
  },
})
```

Optimized: deduplicate entity IDs first, batch aggregate queries via `Promise.all`, then map back to assets. No N+1.

**Display change** (`src/app/(lp)/lp-portfolio/page.tsx`): Portfolio Look-Through section now shows side-by-side "Invested" and "Current Value" columns per asset. Null/zero handled gracefully with `fmt(investedCapital ?? 0)`.

**Walkthrough evidence for LP-Obs 3:** LP Portfolio previously showed only `proRata` (current fair value) with no invested capital column. Tom Wellington (or any LP investor) now sees both "Invested" (capital actually called into FUNDED calls) and "Current Value" (fair value × ownership %) per holding.

**Verification:** `grep -n "capitalCallLineItem.aggregate"` confirms server-side Prisma aggregate (line 74 of portfolio route). No HTTP fetch. All 47 LP API tests pass.

**Commit:** `b81ed43`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Entity meetings section wired (bonus site)**
- **Found during:** Task 2 code scan
- **Issue:** `entity-meetings-section.tsx` also renders meeting rows as non-clickable `div` elements — same pattern as asset activity tab
- **Fix:** Wrapped meeting rows in `<Link href=/meetings/${m.id}>` — same pattern as other sites
- **Files modified:** `src/components/features/entities/tabs/operations/entity-meetings-section.tsx`
- **Commit:** `3c42442`

**2. [Rule 1 - Schema divergence] CapitalCallLineItem has no entityId**
- **Found during:** Task 3 schema review
- **Issue:** Plan's proposed aggregate filter used `entityId` directly on `CapitalCallLineItem`. Schema confirms this field doesn't exist — entity relationship traverses via `capitalCall` relation.
- **Fix:** Filter via `capitalCall: { entityId, status: "FUNDED" }` — same semantic, correct Prisma relation path
- **Files modified:** `src/app/api/lp/[investorId]/portfolio/route.ts`
- **Commit:** `b81ed43`

## Walkthrough Items Evidence

| Item | Description | Evidence |
|------|-------------|----------|
| **Obs 6** | Deal Activity tab meeting entries not clickable | `deal-activity-tab.tsx` now detects `type="meeting"` entries and renders `<Link href=/meetings/${id}>`. Meetings in the timeline are visually distinct (indigo link vs plain text). |
| **Obs 19** | Asset Activity tab meeting entries not clickable | `assets/[id]/page.tsx` meeting rows now have `role="button"` + `onClick(() => router.push('/meetings/${m.id}'))` + keyboard support. |
| **LP-Obs 3** | LP Portfolio page lacked Invested vs. Current Value columns | `lp-portfolio/page.tsx` Portfolio Look-Through section now shows "Invested" and "Current Value" side-by-side per asset. Invested capital derived via `prisma.capitalCallLineItem.aggregate()` on FUNDED calls — no HTTP self-call. |

## Requirements Closed

| Requirement | Status | Evidence |
|-------------|--------|----------|
| FIN-01 | CLOSED | `/meetings/[id]` page exists; 4+ click-through sites wired; route registered |
| FIN-12 (LP-Obs 3 half) | CLOSED | LP Portfolio shows Invested + Current Value per holding via Prisma aggregate |

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `src/app/(gp)/meetings/[id]/page.tsx` exists | FOUND |
| `/meetings/:id` in routes.ts | FOUND |
| `investedCapital` in lp-portfolio/page.tsx | FOUND |
| `capitalCallLineItem.aggregate` in portfolio route | FOUND |
| 3 plan commits in git log | FOUND (6e5141a, 3c42442, b81ed43) |
| `npm run build` clean | PASSED |
| 47 LP API tests pass | PASSED |
