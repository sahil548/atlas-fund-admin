"use client";

import { useCallback, useState } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useUser } from "@/components/providers/user-provider";
import { useFirm } from "@/components/providers/firm-provider";
import Link from "next/link";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { ExportButton } from "@/components/ui/export-button";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { CheckSquare } from "lucide-react";
import { formatDate } from "@/lib/utils";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const STATUS_COLORS: Record<string, string> = { TODO: "gray", IN_PROGRESS: "yellow", DONE: "green" };
const STATUS_LABELS: Record<string, string> = { TODO: "To Do", IN_PROGRESS: "In Progress", DONE: "Done" };
const PRIORITY_COLORS: Record<string, string> = { LOW: "gray", MEDIUM: "blue", HIGH: "orange", URGENT: "red" };
const STATUS_CYCLE = ["TODO", "IN_PROGRESS", "DONE"];

const TASK_FILTERS = [
  {
    key: "status",
    label: "Status",
    options: [
      { value: "TODO", label: "To Do" },
      { value: "IN_PROGRESS", label: "In Progress" },
      { value: "DONE", label: "Done" },
    ],
  },
  {
    key: "priority",
    label: "Priority",
    options: [
      { value: "LOW", label: "Low" },
      { value: "MEDIUM", label: "Medium" },
      { value: "HIGH", label: "High" },
      { value: "URGENT", label: "Urgent" },
    ],
  },
];

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function TasksPage() {
  const toast = useToast();
  const { firmId } = useFirm();
  const { data: users = [] } = useSWR(firmId ? `/api/users?firmId=${firmId}` : null, fetcher);
  const [viewTab, setViewTab] = useState<"my" | "all" | "overdue">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM", assigneeId: "", dueDate: "" });

  // Pagination state
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const { userId: currentUserId } = useUser();
  const now = new Date();

  const buildUrl = useCallback(
    (currentCursor?: string | null) => {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);
      for (const [k, v] of Object.entries(activeFilters)) {
        if (v) params.set(k, v);
      }
      if (currentCursor) params.set("cursor", currentCursor);
      return `/api/tasks?${params.toString()}`;
    },
    [search, activeFilters],
  );

  const { isLoading } = useSWR(buildUrl(null), fetcher, {
    onSuccess: (result) => {
      setAllTasks(result.data ?? []);
      setCursor(result.nextCursor ?? null);
    },
    revalidateOnFocus: false,
  });

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setAllTasks([]);
    setCursor(null);
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
    setAllTasks([]);
    setCursor(null);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl(cursor));
      const result = await res.json();
      setAllTasks((prev) => [...prev, ...(result.data ?? [])]);
      setCursor(result.nextCursor ?? null);
    } catch (e) {
      console.error("Load more failed", e);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, buildUrl]);

  // Client-side view filtering (my/overdue — no API round-trip needed)
  const filtered = allTasks.filter((t: any) => {
    if (viewTab === "my" && t.assigneeId !== currentUserId) return false;
    if (viewTab === "overdue" && (t.status === "DONE" || !t.dueDate || new Date(t.dueDate) >= now)) return false;
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
      // Update local state
      setAllTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleCreate() {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
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
      // Refresh
      setAllTasks([]);
      setCursor(null);
      mutate(buildUrl(null));
      setShowCreate(false);
      setForm({ title: "", description: "", priority: "MEDIUM", assigneeId: "", dueDate: "" });
    } catch {
      toast.error("Failed to create task");
    } finally {
      setCreating(false);
    }
  }

  const myCount = allTasks.filter((t: any) => t.assigneeId === currentUserId && t.status !== "DONE").length;
  const overdueCount = allTasks.filter((t: any) => t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < now).length;

  const viewTabs = [
    { key: "my", label: `My Tasks (${myCount})` },
    { key: "all", label: `All Tasks (${allTasks.length})` },
    { key: "overdue", label: `Overdue (${overdueCount})` },
  ];

  const hasFilters = !!(search || Object.values(activeFilters).some(Boolean));
  const handleClearFilters = () => {
    setSearch("");
    setActiveFilters({});
    setAllTasks([]);
    setCursor(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tasks"
        subtitle={`${allTasks.length} tasks`}
        actions={
          <SearchFilterBar
            filters={TASK_FILTERS}
            onFilterChange={handleFilterChange}
            activeFilters={activeFilters}
          >
            <ExportButton
              data={allTasks.map((t: any) => ({
                id: t.id,
                title: t.title,
                status: STATUS_LABELS[t.status] ?? t.status,
                priority: t.priority ?? "MEDIUM",
                assignee: t.assignee?.name ?? t.assigneeName ?? "",
                dueDate: t.dueDate ? formatDate(t.dueDate) : "",
                dealName: t.deal?.name ?? "",
                entityName: t.entity?.name ?? "",
              }))}
              fileName="Tasks_Export"
            />
            <Button onClick={() => setShowCreate(true)}>+ New Task</Button>
          </SearchFilterBar>
        }
      />

      <div className="flex gap-1 border-b border-gray-200 pb-0">
        {viewTabs.map((vt) => (
          <button
            key={vt.key}
            onClick={() => setViewTab(vt.key as "my" | "all" | "overdue")}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border border-b-0 ${
              viewTab === vt.key ? "bg-white text-indigo-700 border-gray-200" : "bg-gray-50 text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            {vt.label}
          </button>
        ))}
      </div>

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
            {isLoading && allTasks.length === 0 ? (
              <TableSkeleton columns={6} />
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6}>
                <EmptyState
                  icon={<CheckSquare className="h-10 w-10" />}
                  title={hasFilters ? "No results match your filters" : viewTab === "my" ? "No tasks assigned to you" : viewTab === "overdue" ? "No overdue tasks" : "No tasks yet"}
                  description={!hasFilters && viewTab === "all" ? "Create a task to start tracking your to-dos" : undefined}
                  action={!hasFilters && viewTab === "all" ? { label: "+ New Task", onClick: () => setShowCreate(true) } : undefined}
                  filtered={hasFilters}
                  onClearFilters={hasFilters ? handleClearFilters : undefined}
                />
              </td></tr>
            ) : (
              filtered.map((task: any) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-900">{task.title}</div>
                    {task.description && (
                      <div className="text-gray-400 mt-0.5 truncate max-w-[300px]">{task.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => toggleStatus(task)} title="Click to cycle status">
                      <Badge color={STATUS_COLORS[task.status] || "gray"}>{STATUS_LABELS[task.status] || task.status}</Badge>
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge color={PRIORITY_COLORS[task.priority] || "gray"}>{task.priority || "MEDIUM"}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {task.deal ? (
                      <Link href={`/deals/${task.deal.id}`} className="text-indigo-600 hover:underline">{task.deal.name}</Link>
                    ) : task.entity ? (
                      <Link href={`/entities/${task.entity.id}`} className="text-indigo-600 hover:underline">{task.entity.name}</Link>
                    ) : task.contextType ? (
                      <span>{task.contextType}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {task.assignee?.name || task.assigneeName || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {task.dueDate ? (
                      <span className={new Date(task.dueDate) < now && task.status !== "DONE" ? "text-red-600 font-medium" : ""}>
                        {formatDate(task.dueDate)}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <LoadMoreButton hasMore={!!cursor} loading={loadingMore} onLoadMore={handleLoadMore} />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Task" size="md">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Task title" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={2} placeholder="Optional description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Assignee</label>
              <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Unassigned</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={handleCreate} loading={creating}>Create Task</Button>
        </div>
      </Modal>
    </div>
  );
}
