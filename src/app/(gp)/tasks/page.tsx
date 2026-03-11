"use client";

import { useCallback, useState } from "react";
import useSWR, { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useUser } from "@/components/providers/user-provider";
import { useFirm } from "@/components/providers/firm-provider";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { ExportButton } from "@/components/ui/export-button";
import { PageHeader } from "@/components/ui/page-header";
import { LayoutList, LayoutGrid } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { TasksListView } from "@/components/features/tasks/tasks-list-view";
import { TasksKanbanView } from "@/components/features/tasks/tasks-kanban-view";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const STATUS_LABELS: Record<string, string> = { TODO: "To Do", IN_PROGRESS: "In Progress", DONE: "Done" };
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
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM", assigneeId: "", dueDate: "" });

  // Context filter state
  const [contextFilter, setContextFilter] = useState<{ type: "all" | "deal" | "asset" | "entity" | "none"; id?: string; name?: string }>({ type: "all" });

  // Pagination state
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const { userId: currentUserId } = useUser();
  const now = new Date();

  // Fetch context options for dropdown
  const { data: dealsData } = useSWR(firmId ? `/api/deals?firmId=${firmId}&limit=100` : null, fetcher);
  const { data: assetsData } = useSWR(firmId ? `/api/assets?firmId=${firmId}&limit=100` : null, fetcher);
  const { data: entitiesData } = useSWR(firmId ? `/api/entities?firmId=${firmId}&limit=100` : null, fetcher);

  const deals: any[] = dealsData?.data ?? [];
  const assets: any[] = assetsData?.data ?? [];
  const entities: any[] = entitiesData?.data ?? [];

  const buildUrl = useCallback(
    (currentCursor?: string | null) => {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);
      for (const [k, v] of Object.entries(activeFilters)) {
        if (v) params.set(k, v);
      }
      // Apply context filter
      if (contextFilter.type === "deal" && contextFilter.id) {
        params.set("dealId", contextFilter.id);
      } else if (contextFilter.type === "asset" && contextFilter.id) {
        params.set("assetId", contextFilter.id);
      } else if (contextFilter.type === "entity" && contextFilter.id) {
        params.set("entityId", contextFilter.id);
      } else if (contextFilter.type === "none") {
        params.set("contextType", "none");
      }
      if (currentCursor) params.set("cursor", currentCursor);
      return `/api/tasks?${params.toString()}`;
    },
    [search, activeFilters, contextFilter],
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
      logger.error("Load more failed", { error: e instanceof Error ? e.message : String(e) });
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

  async function handleStatusChange(taskId: string, newStatus: string) {
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
      setAllTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function toggleStatus(task: any) {
    const idx = STATUS_CYCLE.indexOf(task.status);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    await handleStatusChange(task.id, next);
  }

  async function handleReorder(tasks: any[]) {
    // tasks is the reordered array — PATCH each with new index
    tasks.forEach((task, idx) => {
      if (task.order !== idx) {
        fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: task.id, order: idx }),
        }).catch(() => logger.error("Failed to persist order for task", { taskId: task.id }));
      }
    });
    setAllTasks((prev) => {
      // Merge reordered tasks back into allTasks (other view filter tasks remain)
      const reorderedIds = new Set(tasks.map((t) => t.id));
      const others = prev.filter((t) => !reorderedIds.has(t.id));
      return [...tasks, ...others];
    });
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

  const hasFilters = !!(search || Object.values(activeFilters).some(Boolean) || contextFilter.type !== "all");
  const handleClearFilters = () => {
    setSearch("");
    setActiveFilters({});
    setContextFilter({ type: "all" });
    setAllTasks([]);
    setCursor(null);
  };

  // Build context filter dropdown options
  const contextOptions = [
    { value: "all", label: "All Tasks" },
    { value: "none", label: "Unlinked only" },
    ...deals.map((d: any) => ({ value: `deal:${d.id}`, label: `Deal: ${d.name}` })),
    ...assets.map((a: any) => ({ value: `asset:${a.id}`, label: `Asset: ${a.name}` })),
    ...entities.map((e: any) => ({ value: `entity:${e.id}`, label: `Entity: ${e.name}` })),
  ];

  function handleContextChange(val: string) {
    setAllTasks([]);
    setCursor(null);
    if (val === "all") {
      setContextFilter({ type: "all" });
    } else if (val === "none") {
      setContextFilter({ type: "none" });
    } else {
      const [type, id] = val.split(":");
      const name = contextOptions.find((o) => o.value === val)?.label;
      setContextFilter({ type: type as "deal" | "asset" | "entity", id, name });
    }
  }

  const contextFilterValue =
    contextFilter.type === "all" ? "all"
    : contextFilter.type === "none" ? "none"
    : `${contextFilter.type}:${contextFilter.id}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tasks"
        subtitle={`${allTasks.length} tasks`}
        actions={
          <SearchFilterBar
            filters={TASK_FILTERS}
            onSearch={handleSearch}
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

      {/* Tabs row + view toggle + context filter */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 pb-0">
        <div className="flex gap-1">
          {viewTabs.map((vt) => (
            <button
              key={vt.key}
              onClick={() => setViewTab(vt.key as "my" | "all" | "overdue")}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border border-b-0 ${
                viewTab === vt.key ? "bg-white text-indigo-700 border-gray-200" : "bg-gray-50 dark:bg-gray-800 text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              {vt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pb-1">
          {/* Context filter dropdown */}
          <select
            value={contextFilterValue}
            onChange={(e) => handleContextChange(e.target.value)}
            className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {contextOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* List/Kanban view toggle */}
          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("list")}
              title="List view"
              className={cn(
                "px-2 py-1 rounded-md flex items-center gap-1 text-xs transition-colors",
                viewMode === "list"
                  ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <LayoutList className="h-3.5 w-3.5" />
              List
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              title="Board view"
              className={cn(
                "px-2 py-1 rounded-md flex items-center gap-1 text-xs transition-colors",
                viewMode === "kanban"
                  ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Board
            </button>
          </div>
        </div>
      </div>

      {/* Main view */}
      {viewMode === "list" ? (
        <TasksListView
          tasks={filtered}
          isLoading={isLoading && allTasks.length === 0}
          hasFilters={hasFilters}
          viewTab={viewTab}
          onReorder={handleReorder}
          onStatusChange={handleStatusChange}
          onStatusToggle={toggleStatus}
          onClearFilters={handleClearFilters}
          onNewTask={() => setShowCreate(true)}
        />
      ) : (
        <TasksKanbanView
          tasks={filtered}
          isLoading={isLoading && allTasks.length === 0}
          onStatusChange={handleStatusChange}
        />
      )}

      <LoadMoreButton hasMore={!!cursor} loading={loadingMore} onLoadMore={handleLoadMore} />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Task" size="md">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="Task title" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" rows={2} placeholder="Optional description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Assignee</label>
              <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                <option value="">Unassigned</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
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
