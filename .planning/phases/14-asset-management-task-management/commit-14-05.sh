#!/bin/bash
set -e
cd "/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas"

# Task 1 commit
git add package-lock.json
git add "src/app/api/tasks/route.ts"
git add "src/app/(gp)/tasks/page.tsx"
git commit --amend --no-edit -m "feat(14-05): install @dnd-kit, fix PATCH order field, context filter + view toggle

- Install @dnd-kit/core v6.3.1, @dnd-kit/sortable v10.0.0, @dnd-kit/utilities v3.2.2
- PATCH /api/tasks now accepts order field for DnD persistence
- GET /api/tasks: add assetId filter + contextType=none for unlinked tasks
- Tasks page: list/kanban view toggle with LayoutList/LayoutGrid icons
- Tasks page: context filter dropdown (All Tasks, Deal/Asset/Entity/Unlinked)
- Extract handleStatusChange + handleReorder as shared handlers for view components

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

# Task 2 commit
git add "src/components/features/tasks/tasks-list-view.tsx"
git add "src/components/features/tasks/tasks-kanban-view.tsx"
git commit -m "feat(14-05): kanban board view + sortable list view with @dnd-kit

- TasksListView: DnD sortable table with GripVertical drag handle per row
- SortableTaskRow: useSortable with drag handle listeners only (not whole row)
- handleDragEnd: arrayMove + PATCH order for each moved task
- TasksKanbanView: 3-column board (To Do, In Progress, Done) with DragOverlay
- KanbanColumn: useDroppable with drop highlight (bg-indigo-50 when over)
- KanbanCard: useSortable with cross-column status change detection
- handleDragEnd: taskColumnMap detects column change vs same-column reorder
- Both views: overdue styling (red), empty states, skeleton loading

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

# Docs commit
git add ".planning/phases/14-asset-management-task-management/14-05-SUMMARY.md"
git add ".planning/STATE.md"
git add ".planning/ROADMAP.md"
git commit -m "docs(14-05): complete tasks DnD kanban + list view plan

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

echo "All commits done"
