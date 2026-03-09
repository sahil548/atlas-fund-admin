---
phase: 14-asset-management-task-management
plan: "05"
subsystem: task-management
tags: [dnd-kit, kanban, drag-and-drop, tasks, context-filter]
dependency_graph:
  requires:
    - 14-01-PLAN.md (Task model with order field)
  provides:
    - tasks kanban board view
    - tasks list view with DnD reordering
    - context filter dropdown
    - PATCH /api/tasks order field support
  affects:
    - src/app/(gp)/tasks/page.tsx
    - src/app/api/tasks/route.ts
tech_stack:
  added:
    - "@dnd-kit/core ^6.3.1"
    - "@dnd-kit/sortable ^10.0.0"
    - "@dnd-kit/utilities ^3.2.2"
  patterns:
    - useSortable + arrayMove for list reordering
    - useDroppable columns + useSortable cards for kanban
    - DragOverlay for visual drag ghost
    - fire-and-forget PATCH for order persistence
key_files:
  created:
    - src/components/features/tasks/tasks-list-view.tsx
    - src/components/features/tasks/tasks-kanban-view.tsx
  modified:
    - src/app/(gp)/tasks/page.tsx
    - src/app/api/tasks/route.ts
    - package.json
decisions:
  - "@dnd-kit activation constraint of distance:5 prevents accidental drags on click"
  - "Local state sync via string key comparison (id+status join) avoids stale renders"
  - "Context filter uses native select dropdown — lightweight, no extra component needed"
  - "Kanban drag-end detects column change vs same-column reorder via taskColumnMap lookup"
  - "DnD order persistence is fire-and-forget (.catch logged) — non-blocking for UX"
metrics:
  duration_minutes: 35
  completed_date: "2026-03-09"
  tasks_completed: 2
  files_changed: 5
---

# Phase 14 Plan 05: Tasks DnD Kanban + List View + Context Filter Summary

**One-liner:** @dnd-kit installed with full kanban board (3-column drag-between-columns) and sortable list view (drag-handle reordering), plus context filter dropdown for deal/asset/entity/unlinked filtering.

## What Was Built

### Task 1: @dnd-kit + PATCH order + context filter + view toggle

**@dnd-kit packages installed:**
- `@dnd-kit/core` v6.3.1
- `@dnd-kit/sortable` v10.0.0
- `@dnd-kit/utilities` v3.2.2

**PATCH /api/tasks now accepts `order` field:**
Added `if (body.order !== undefined) data.order = body.order` to the PATCH handler. Without this fix, DnD reordering would appear to work visually but not persist on page refresh.

**GET /api/tasks enhanced:**
- Added `assetId` query param support for filtering tasks by asset
- Added `contextType=none` handling: filters tasks where `contextType IS NULL` (unlinked tasks)

**Tasks page (`src/app/(gp)/tasks/page.tsx`) updated:**
- List/Board view toggle with `LayoutList` / `LayoutGrid` icons
- Context filter dropdown with options: All Tasks, Unlinked only, Deal: {name}, Asset: {name}, Entity: {name}
- `handleStatusChange` and `handleReorder` extracted as shared handlers for both view components
- Context filter fetches deals/assets/entities via SWR with `firmId`

### Task 2: Kanban board view + sortable list view

**TasksListView (`src/components/features/tasks/tasks-list-view.tsx`):**
- `"use client"` component using `@dnd-kit/sortable`
- `SortableTaskRow` sub-component with `GripVertical` drag handle (listeners on handle only, not whole row)
- `DndContext` wrapping `SortableContext` with `verticalListSortingStrategy`
- `handleDragEnd` uses `arrayMove` + calls `onReorder(reordered)` for parent to persist
- Overdue styling: red text on due date if past due and status !== DONE
- Status badge is clickable to cycle through TODO → IN_PROGRESS → DONE
- Context links navigate to deal/entity detail pages
- Empty state and skeleton loading from shared UI components

**TasksKanbanView (`src/components/features/tasks/tasks-kanban-view.tsx`):**
- `"use client"` component using `@dnd-kit/core` + `@dnd-kit/sortable`
- Three columns: To Do (TODO), In Progress (IN_PROGRESS), Done (DONE)
- `KanbanColumn` sub-component uses `useDroppable({ id: columnId })` — accepts drops
- `KanbanCard` sub-component uses `useSortable({ id: task.id, data: { status } })` — draggable
- Drop highlight: `bg-indigo-50` border when card is being dragged over column
- `handleDragEnd` uses `taskColumnMap` to detect cross-column vs same-column moves
  - Cross-column: calls `onStatusChange(taskId, targetColumnId)` + updates local state
  - Same-column: uses `arrayMove` to reorder within column
- `DragOverlay`: semi-transparent card copy during drag
- Column layout: `grid grid-cols-1 md:grid-cols-3` (stacks on mobile, 3-col on desktop)
- Overdue: red `border-l-2` on card if past due and not done
- Skeleton loading for kanban columns

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added assetId filter to GET /api/tasks**
- **Found during:** Task 1, Part C
- **Issue:** Context filter needed to filter by asset ID but GET handler didn't support `assetId` param
- **Fix:** Added `assetId` to param list and `if (assetId) baseWhere.assetId = assetId` to filter logic
- **Files modified:** `src/app/api/tasks/route.ts`

None of the original plan items were skipped. The auto-fix was additive.

## Self-Check

### Files Exist
- `src/components/features/tasks/tasks-list-view.tsx` — FOUND
- `src/components/features/tasks/tasks-kanban-view.tsx` — FOUND
- `src/app/(gp)/tasks/page.tsx` — FOUND (modified)
- `src/app/api/tasks/route.ts` — FOUND (modified)

### Build Status
- `npm run build` — PASSED (zero TypeScript errors, zero compilation errors)
- Warning: Next.js workspace root (pre-existing, unrelated to this plan)

## Self-Check: PASSED

All files exist. Build passes zero errors. Both view components created. All plan requirements met:
- [x] List view has drag handles for reordering with order persisted to API
- [x] Kanban board has To Do, In Progress, Done columns with drag-between-columns
- [x] Status changes via kanban drag persist to API
- [x] Order changes via list drag persist to API
- [x] Context filter dropdown filters by deal, asset, entity, or unlinked
- [x] Both views handle empty states gracefully
- [x] `npm run build` zero errors
