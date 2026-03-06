---
phase: 02-deal-desk-end-to-end
plan: 05
subsystem: ui, api
tags: [react, prisma, swr, nextjs, vercel-blob, threaded-comments, file-upload, pm-style]

# Dependency graph
requires:
  - phase: 02-01
    provides: DDWorkstream PM fields (assigneeId, priority, dueDate), DDWorkstreamComment, DDWorkstreamAttachment models
provides:
  - PM-style workstream list UI with inline editing
  - Workstream detail panel with threaded comments and file attachments
  - PATCH /api/deals/[id]/workstreams/[workstreamId] for status, assignee, priority, due date
  - Comments CRUD API with threading support
  - Attachments CRUD API with Vercel Blob upload
  - Re-analyze per-workstream with IC Memo auto-versioning
affects: [02-06, 02-07, deal-desk-workflows]

# Tech tracking
tech-stack:
  added: []
  patterns: [split-view detail panel, workstream sub-resource APIs, inline status/priority editing]

key-files:
  created:
    - src/app/api/deals/[id]/workstreams/[workstreamId]/route.ts
    - src/app/api/deals/[id]/workstreams/[workstreamId]/comments/route.ts
    - src/app/api/deals/[id]/workstreams/[workstreamId]/attachments/route.ts
    - src/components/features/deals/workstream-detail-panel.tsx
  modified:
    - src/components/features/deals/deal-dd-tab.tsx
    - src/app/api/deals/[id]/route.ts

key-decisions:
  - "Split-view layout: clicking workstream row opens detail panel on right (50/50 split) rather than slide-over modal"
  - "Workstream PATCH uses dedicated [workstreamId] route instead of the existing bulk PATCH on /workstreams"
  - "Re-analyze triggers IC Memo auto-versioning with version number toast feedback"
  - "Attachments stored in Vercel Blob (production) or base64 data URLs (local dev) following existing document upload pattern"

patterns-established:
  - "Workstream sub-resource API pattern: /api/deals/[id]/workstreams/[workstreamId]/{comments,attachments}"
  - "Deal GET includes workstream _count for comments/attachments to avoid N+1 in list view"
  - "Inline dropdown editing on list rows with stopPropagation to prevent row click conflict"

requirements-completed: [DEAL-07]

# Metrics
duration: 6min
completed: 2026-03-06
---

# Phase 02 Plan 05: DD Workstreams PM-Style Redesign Summary

**PM-style workstream list with split-view detail panel, threaded comments, file attachments, inline status/priority editing, and per-workstream re-analysis with IC Memo auto-versioning**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-06T06:33:11Z
- **Completed:** 2026-03-06T06:40:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Redesigned DD tab from expandable card layout to PM-style list view with assignee, priority, due date, comment/attachment counts, and inline status dropdown
- Built split-view detail panel with threaded comments (root + replies), file attachment upload/download/delete, and editable workstream metadata
- Created three new sub-resource API routes for workstream PATCH, comments CRUD, and attachments CRUD
- Re-analyze button triggers per-workstream AI analysis and automatically regenerates IC Memo with version increment

## Task Commits

Each task was committed atomically:

1. **Task 1: Workstream API enhancements** - `72773c4` (feat)
2. **Task 2: Redesign DD tab as PM-style task list** - `b89ca9d` (feat)

## Files Created/Modified
- `src/app/api/deals/[id]/workstreams/[workstreamId]/route.ts` - GET/PATCH for individual workstream with full includes
- `src/app/api/deals/[id]/workstreams/[workstreamId]/comments/route.ts` - GET/POST threaded comments with author info
- `src/app/api/deals/[id]/workstreams/[workstreamId]/attachments/route.ts` - GET/POST/DELETE file attachments with Vercel Blob
- `src/components/features/deals/workstream-detail-panel.tsx` - New split-view detail panel with comments, attachments, editable fields
- `src/components/features/deals/deal-dd-tab.tsx` - Complete redesign from card layout to PM-style list view
- `src/app/api/deals/[id]/route.ts` - Updated workstreams include to fetch assignee and comment/attachment counts

## Decisions Made
- Used split-view layout (50/50 split when detail panel is open) rather than a slide-over modal, keeping the workstream list visible for context
- Workstream PATCH uses a new dedicated `/workstreams/[workstreamId]` route to keep individual vs bulk updates separate and clean
- Re-analyze triggers IC Memo regeneration automatically with toast showing new version number
- Attachments use existing Vercel Blob pattern (private access) in production, with base64 data URL fallback for local development
- Deal GET endpoint includes `_count` for comments and attachments to show counts in the list without fetching full data

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added _count includes to deal GET**
- **Found during:** Task 1 (API enhancements)
- **Issue:** The deal GET endpoint needed to include comment and attachment counts for the list view, but the plan only specified the sub-resource APIs
- **Fix:** Added `_count: { select: { comments: true, attachments: true } }` and `assignee` include to the workstreams query in the deal GET route
- **Files modified:** src/app/api/deals/[id]/route.ts
- **Verification:** Build passes, counts available in workstream data
- **Committed in:** 72773c4 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for list view to display comment/attachment counts. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DD workstreams now have full PM-style task management with comments and attachments
- Ready for Plan 02-06 (IC Review) and Plan 02-07 (Closing workflow) to build on this foundation
- Team member list for assignee dropdown currently pulls from deal lead and existing workstream assignees -- a dedicated team API would improve this in a future plan

## Self-Check: PASSED

All 7 created/modified files verified present on disk. Both task commit hashes (72773c4, b89ca9d) verified in git log.

---
*Phase: 02-deal-desk-end-to-end*
*Completed: 2026-03-06*
