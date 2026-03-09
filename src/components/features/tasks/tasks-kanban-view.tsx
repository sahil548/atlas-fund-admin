"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDate, cn } from "@/lib/utils";
import { ChecklistProgressBadge } from "@/components/features/tasks/task-checklist-items";

/* eslint-disable @typescript-eslint/no-explicit-any */

const COLUMNS = [
  { id: "TODO", label: "To Do" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "DONE", label: "Done" },
] as const;

type ColumnId = "TODO" | "IN_PROGRESS" | "DONE";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "gray",
  MEDIUM: "blue",
  HIGH: "orange",
  URGENT: "red",
};

// ---- KanbanCard (draggable) ----
interface KanbanCardProps {
  task: any;
  isDragOverlay?: boolean;
}

function KanbanCard({ task, isDragOverlay = false }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { status: task.status },
  });

  const now = new Date();
  const isOverdue =
    task.dueDate && new Date(task.dueDate) < now && task.status !== "DONE";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragOverlay) {
    return (
      <div className="bg-white border border-indigo-300 rounded-lg p-3 shadow-lg opacity-90 cursor-grabbing">
        <div className="text-xs font-medium text-gray-900 truncate">
          {task.title}
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <Badge color={PRIORITY_COLORS[task.priority] || "gray"}>
            {task.priority || "MEDIUM"}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-white border rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing select-none",
        isDragging
          ? "opacity-40 border-indigo-300"
          : "border-gray-200 hover:border-gray-300",
        isOverdue && "border-l-2 border-l-red-400",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="text-xs font-medium text-gray-900 line-clamp-2 flex-1">
          {task.title}
        </div>
        {task.checklistProgress && task.checklistProgress.total > 0 && (
          <ChecklistProgressBadge
            total={task.checklistProgress.total}
            completed={task.checklistProgress.completed}
          />
        )}
      </div>

      {/* Context link */}
      {(task.deal || task.entity) && (
        <div className="mt-1">
          {task.deal ? (
            <Link
              href={`/deals/${task.deal.id}`}
              className="text-[10px] text-indigo-500 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {task.deal.name}
            </Link>
          ) : (
            <Link
              href={`/entities/${task.entity.id}`}
              className="text-[10px] text-indigo-500 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {task.entity.name}
            </Link>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-2 gap-1">
        <Badge color={PRIORITY_COLORS[task.priority] || "gray"}>
          {task.priority || "MEDIUM"}
        </Badge>
        {task.dueDate && (
          <span
            className={cn(
              "text-[10px]",
              isOverdue ? "text-red-500 font-medium" : "text-gray-400",
            )}
          >
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>

      {/* Assignee */}
      {(task.assignee?.name || task.assigneeName) && (
        <div className="mt-2 flex items-center gap-1">
          <div className="h-4 w-4 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] font-medium text-indigo-700">
            {(task.assignee?.name || task.assigneeName || "?")
              .charAt(0)
              .toUpperCase()}
          </div>
          <span className="text-[10px] text-gray-400 truncate">
            {task.assignee?.name || task.assigneeName}
          </span>
        </div>
      )}
    </div>
  );
}

// ---- KanbanColumn (droppable) ----
interface KanbanColumnProps {
  columnId: string;
  label: string;
  tasks: any[];
  isOver: boolean;
}

function KanbanColumn({ columnId, label, tasks, isOver }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: columnId });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-2 rounded-xl p-3 min-h-[200px] border transition-colors",
        isOver
          ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200"
          : "bg-gray-50 border-gray-200",
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        <span className="text-xs font-medium bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2 flex-1">
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} />
          ))}
          {tasks.length === 0 && (
            <div className="text-xs text-gray-400 text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
              No tasks
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ---- TasksKanbanView ----
interface TasksKanbanViewProps {
  tasks: any[];
  isLoading: boolean;
  onStatusChange: (taskId: string, newStatus: string) => void;
}

export function TasksKanbanView({
  tasks,
  isLoading,
  onStatusChange,
}: TasksKanbanViewProps) {
  const [localTasks, setLocalTasks] = useState<any[]>(tasks);
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  // Sync when external tasks change identity or status
  const externalKey = tasks.map((t) => t.id + t.status).join(",");
  const localKey = localTasks.map((t) => t.id + t.status).join(",");
  if (externalKey !== localKey) {
    setLocalTasks(tasks);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Map: taskId -> columnId
  const taskColumnMap: Record<string, string> = {};
  localTasks.forEach((t) => {
    taskColumnMap[t.id] = t.status;
  });

  function getColumnForId(id: string): ColumnId | null {
    // Is it a column itself?
    if (COLUMNS.some((c) => c.id === id)) return id as ColumnId;
    // Is it a task? Return its column
    return (taskColumnMap[id] as ColumnId) ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    const task = localTasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over) {
      setOverColumnId(null);
      return;
    }
    const col = getColumnForId(over.id as string);
    setOverColumnId(col);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    setOverColumnId(null);

    if (!over) return;

    const sourceColumnId = taskColumnMap[active.id as string];
    const targetColumnId = getColumnForId(over.id as string);

    if (!targetColumnId) return;

    if (sourceColumnId !== targetColumnId) {
      // Status change — move task to new column
      setLocalTasks((prev) =>
        prev.map((t) =>
          t.id === active.id ? { ...t, status: targetColumnId } : t,
        ),
      );
      onStatusChange(active.id as string, targetColumnId);
    } else {
      // Same column reorder
      const colTasks = localTasks.filter((t) => t.status === sourceColumnId);
      const oldIdx = colTasks.findIndex((t) => t.id === active.id);
      const newIdx = colTasks.findIndex((t) => t.id === over.id);
      if (oldIdx !== newIdx && newIdx !== -1) {
        const reordered = arrayMove(colTasks, oldIdx, newIdx);
        setLocalTasks((prev) => {
          const otherTasks = prev.filter((t) => t.status !== sourceColumnId);
          return [...otherTasks, ...reordered];
        });
      }
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className="bg-gray-50 rounded-xl p-3 border border-gray-200 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg p-3 mb-2 border border-gray-100"
              >
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = localTasks.filter((t) => t.status === col.id);
          return (
            <KanbanColumn
              key={col.id}
              columnId={col.id}
              label={col.label}
              tasks={colTasks}
              isOver={overColumnId === col.id}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <KanbanCard task={activeTask} isDragOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
