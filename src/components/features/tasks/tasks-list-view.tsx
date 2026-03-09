"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface TasksListViewProps {
  tasks?: any[];
  firmId?: string;
  isLoading?: boolean;
  hasFilters?: boolean;
  viewTab?: string;
  onReorder?: (tasks: any[]) => Promise<void>;
  onStatusChange?: (taskId: string, newStatus: string) => Promise<void>;
  onStatusToggle?: (task: any) => Promise<void>;
  onClearFilters?: () => void;
  onNewTask?: () => void;
}

export function TasksListView({ tasks = [], isLoading }: TasksListViewProps) {
  if (isLoading) return <div className="py-8 text-center text-sm text-gray-400">Loading tasks...</div>;
  if (tasks.length === 0) return <div className="py-8 text-center text-sm text-gray-400">No tasks yet.</div>;
  return (
    <div className="space-y-2">
      {tasks.map((task: any) => (
        <div key={task.id} className="px-4 py-3 border border-gray-100 rounded-lg text-sm text-gray-700">{task.title}</div>
      ))}
    </div>
  );
}
