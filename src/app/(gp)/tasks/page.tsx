"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useUser } from "@/components/providers/user-provider";
import { useFirm } from "@/components/providers/firm-provider";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_COLORS: Record<string, string> = {
  TODO: "gray",
  IN_PROGRESS: "yellow",
  DONE: "green",
};
const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: "gray",
  MEDIUM: "blue",
  HIGH: "orange",
  URGENT: "red",
};
const STATUS_CYCLE = ["TODO", "IN_PROGRESS", "DONE"];

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function TasksPage() {
  const toast = useToast();
  const { firmId } = useFirm();
  const { data: tasks = [], isLoading } = useSWR("/api/tasks", fetcher);
  const { data: users = [] } = useSWR(firmId ? `/api/users?firmId=${firmId}` : null, fetcher);
  const [viewTab, setViewTab] = useState<"my" | "all" | "overdue">("all");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    assigneeId: "",
    dueDate: "",
  });

  const { userId: currentUserId } = useUser();
  const now = new Date();

  const filtered = tasks.filter((t: any) => {
    if (viewTab === "my" && t.assigneeId !== currentUserId) return false;
    if (
      viewTab === "overdue" &&
      (t.status === "DONE" || !t.dueDate || new Date(t.dueDate) >= now)
    )
      return false;
    if (statusFilter && t.status !== statusFilter) return false;
    return true;
  });

  async function toggleStatus(task: any) {
    const idx = STATUS_CYCLE.indexOf(task.status);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: next }),
      });
      mutate("/api/tasks");
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleCreate() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setCreating(true);
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          priority: form.priority,
          assigneeId: form.assigneeId || undefined,
          dueDate: form.dueDate || undefined,
        }),
      });
      toast.success("Task created");
      mutate("/api/tasks");
      setShowCreate(false);
      setForm({
        title: "",
        description: "",
        priority: "MEDIUM",
        assigneeId: "",
        dueDate: "",
      });
    } catch {
      toast.error("Failed to create task");
    } finally {
      setCreating(false);
    }
  }

  const myCount = tasks.filter(
    (t: any) => t.assigneeId === currentUserId && t.status !== "DONE"
  ).length;
  const overdueCount = tasks.filter(
    (t: any) =>
      t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < now
  ).length;

  const viewTabs = [
    { key: "my", label: `My Tasks (${myCount})` },
    { key: "all", label: `All Tasks (${tasks.length})` },
    { key: "overdue", label: `Overdue (${overdueCount})` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Tasks</h2>
        <Button onClick={() => setShowCreate(true)}>+ New Task</Button>
      </div>

      <div className="flex gap-1 border-b border-gray-200 pb-0">
        {viewTabs.map((vt) => (
          <button
            key={vt.key}
            onClick={() => setViewTab(vt.key as "my" | "all" | "overdue")}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border border-b-0 ${
              viewTab === vt.key
                ? "bg-white text-indigo-700 border-gray-200"
                : "bg-gray-50 text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            {vt.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
        >
          <option value="">All Statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No tasks found.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-left">
                <th className="px-4 py-2.5 font-medium">Title</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Priority</th>
                <th className="px-4 py-2.5 font-medium">Context</th>
                <th className="px-4 py-2.5 font-medium">Assignee</th>
                <th className="px-4 py-2.5 font-medium">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((task: any) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-900">
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="text-gray-400 mt-0.5 truncate max-w-[300px]">
                        {task.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => toggleStatus(task)}
                      title="Click to cycle status"
                    >
                      <Badge color={STATUS_COLORS[task.status] || "gray"}>
                        {STATUS_LABELS[task.status] || task.status}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge color={PRIORITY_COLORS[task.priority] || "gray"}>
                      {task.priority || "MEDIUM"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {task.deal ? (
                      <Link
                        href={`/deals/${task.deal.id}`}
                        className="text-indigo-600 hover:underline"
                      >
                        {task.deal.name}
                      </Link>
                    ) : task.entity ? (
                      <Link
                        href={`/entities/${task.entity.id}`}
                        className="text-indigo-600 hover:underline"
                      >
                        {task.entity.name}
                      </Link>
                    ) : task.contextType ? (
                      <span>{task.contextType}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {task.assignee?.name || task.assigneeName || (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {task.dueDate ? (
                      <span
                        className={
                          new Date(task.dueDate) < now &&
                          task.status !== "DONE"
                            ? "text-red-600 font-medium"
                            : ""
                        }
                      >
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Task"
        size="md"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Task title"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              rows={2}
              placeholder="Optional description"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Assignee
              </label>
              <select
                value={form.assigneeId}
                onChange={(e) =>
                  setForm({ ...form, assigneeId: e.target.value })
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setShowCreate(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} loading={creating}>
            Create Task
          </Button>
        </div>
      </Modal>
    </div>
  );
}
