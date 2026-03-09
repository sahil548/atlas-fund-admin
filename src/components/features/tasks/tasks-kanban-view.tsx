"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface TasksKanbanViewProps {
  tasks?: any[];
  firmId?: string;
  isLoading?: boolean;
  onStatusChange?: (taskId: string, newStatus: string) => Promise<void>;
}

export function TasksKanbanView({ tasks = [], isLoading }: TasksKanbanViewProps) {
  if (isLoading) return <div className="py-8 text-center text-sm text-gray-400">Loading tasks...</div>;
  if (tasks.length === 0) return <div className="py-8 text-center text-sm text-gray-400">No tasks yet.</div>;
  return (
    <div className="grid grid-cols-3 gap-4">
      {["TODO", "IN_PROGRESS", "DONE"].map((status) => (
        <div key={status} className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs font-semibold text-gray-600 mb-2">{status.replace(/_/g, " ")}</div>
          {tasks.filter((t: any) => t.status === status).map((task: any) => (
            <div key={task.id} className="bg-white border border-gray-100 rounded p-2 text-xs text-gray-700 mb-2">{task.title}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
