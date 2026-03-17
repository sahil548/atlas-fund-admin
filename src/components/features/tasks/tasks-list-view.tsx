"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import Link from "next/link";
import { CheckSquare, GripVertical } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { ChecklistProgressBadge } from "@/components/features/tasks/task-checklist-items";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_COLORS: Record<string, string> = { TODO: "gray", IN_PROGRESS: "yellow", DONE: "green" };
const STATUS_LABELS: Record<string, string> = { TODO: "To Do", IN_PROGRESS: "In Progress", DONE: "Done" };
const PRIORITY_COLORS: Record<string, string> = { LOW: "gray", MEDIUM: "blue", HIGH: "orange", URGENT: "red" };

interface SortableTaskRowProps {
  task: any;
  onStatusToggle: (task: any) => void;
}

function SortableTaskRow({ task, onStatusToggle }: SortableTaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const now = new Date();
  const isOverdue = task.dueDate && new Date(task.dueDate) < now && task.status !== "DONE";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className={cn("hover:bg-gray-50", isDragging && "bg-indigo-50")}>
      <td className="px-2 py-2.5 w-8">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 p-1 rounded"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 text-xs">{task.title}</span>
          {task.checklistProgress && task.checklistProgress.total > 0 && (
            <ChecklistProgressBadge
              total={task.checklistProgress.total}
              completed={task.checklistProgress.completed}
            />
          )}
        </div>
        {task.description && (
          <div className="text-gray-400 mt-0.5 truncate max-w-[280px] text-xs">{task.description}</div>
        )}
      </td>
      <td className="px-3 py-2.5">
        <button onClick={() => onStatusToggle(task)} title="Click to cycle status">
          <Badge color={STATUS_COLORS[task.status] || "gray"}>
            {STATUS_LABELS[task.status] || task.status}
          </Badge>
        </button>
      </td>
      <td className="px-3 py-2.5">
        <Badge color={PRIORITY_COLORS[task.priority] || "gray"}>{task.priority || "MEDIUM"}</Badge>
      </td>
      <td className="px-3 py-2.5 text-gray-500 text-xs">
        {task.deal ? (
          <Link href={`/deals/${task.dealId || task.deal.id}`} className="text-indigo-600 hover:underline">
            Deal: {task.deal.name}
          </Link>
        ) : task.asset ? (
          <Link href={`/assets/${task.assetId || task.asset.id}`} className="text-indigo-600 hover:underline">
            Asset: {task.asset.name}
          </Link>
        ) : task.entity ? (
          <Link href={`/entities/${task.entityId || task.entity.id}`} className="text-indigo-600 hover:underline">
            Entity: {task.entity.name}
          </Link>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-gray-600 text-xs">
        {task.assignee?.name || task.assigneeName || <span className="text-gray-300">—</span>}
      </td>
      <td className="px-3 py-2.5 text-xs">
        {task.dueDate ? (
          <span className={isOverdue ? "text-red-600 font-medium" : "text-gray-500"}>
            {formatDate(task.dueDate)}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
    </tr>
  );
}

interface TasksListViewProps {
  tasks: any[];
  isLoading: boolean;
  hasFilters: boolean;
  viewTab: "my" | "all" | "overdue";
  onReorder: (tasks: any[]) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onStatusToggle: (task: any) => void;
  onClearFilters: () => void;
  onNewTask: () => void;
}

export function TasksListView({
  tasks,
  isLoading,
  hasFilters,
  viewTab,
  onReorder,
  onStatusToggle,
  onClearFilters,
  onNewTask,
}: TasksListViewProps) {
  const [localTasks, setLocalTasks] = useState<any[]>(tasks);

  // Sync external tasks into local state when list identity changes
  const externalIds = tasks.map((t) => t.id).join(",");
  const localIds = localTasks.map((t) => t.id).join(",");
  if (externalIds !== localIds) {
    setLocalTasks(tasks);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = localTasks.findIndex((t) => t.id === active.id);
    const newIdx = localTasks.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(localTasks, oldIdx, newIdx);

    setLocalTasks(reordered);
    onReorder(reordered);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-left">
              <th className="px-2 py-2.5 w-8"></th>
              <th className="px-3 py-2.5 font-medium">Title</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Priority</th>
              <th className="px-3 py-2.5 font-medium">Context</th>
              <th className="px-3 py-2.5 font-medium">Assignee</th>
              <th className="px-3 py-2.5 font-medium">Due Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <TableSkeleton columns={7} />
            ) : localTasks.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={<CheckSquare className="h-10 w-10" />}
                    title={
                      hasFilters
                        ? "No results match your filters"
                        : viewTab === "my"
                        ? "No tasks assigned to you"
                        : viewTab === "overdue"
                        ? "No overdue tasks"
                        : "No tasks yet"
                    }
                    description={
                      !hasFilters && viewTab === "all"
                        ? "Create a task to start tracking your to-dos"
                        : undefined
                    }
                    action={
                      !hasFilters && viewTab === "all"
                        ? { label: "+ New Task", onClick: onNewTask }
                        : undefined
                    }
                    filtered={hasFilters}
                    onClearFilters={hasFilters ? onClearFilters : undefined}
                  />
                </td>
              </tr>
            ) : (
              <SortableContext items={localTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {localTasks.map((task: any) => (
                  <SortableTaskRow
                    key={task.id}
                    task={task}
                    onStatusToggle={onStatusToggle}
                  />
                ))}
              </SortableContext>
            )}
          </tbody>
        </table>
      </div>
    </DndContext>
  );
}
