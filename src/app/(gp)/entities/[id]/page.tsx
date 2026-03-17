"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { InlineTaskAdd } from "@/components/features/tasks/inline-task-add";
import { useToast } from "@/components/ui/toast";
import { StatusTransitionDialog } from "@/components/features/entities/status-transition-dialog";
import { SectionErrorBoundary } from "@/components/ui/error-boundary";
import { EntityOverviewTab } from "@/components/features/entities/tabs/entity-overview-tab";
import { EntityCapitalTab } from "@/components/features/entities/tabs/entity-capital-tab";
import { EntityCapTableTab } from "@/components/features/entities/tabs/entity-cap-table-tab";
import { EntityWaterfallTab } from "@/components/features/entities/tabs/entity-waterfall-tab";
import { EntityFundraisingTab } from "@/components/features/entities/tabs/entity-fundraising-tab";
import { EntityComplianceTab } from "@/components/features/entities/tabs/entity-compliance-tab";
import { EntityOperationsTab } from "@/components/features/entities/tabs/entity-operations-tab";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

const baseTabs = [
  { key: "overview", label: "Overview" },
  { key: "capital", label: "Transactions" },
  { key: "cap-table", label: "Cap Table" },
  { key: "waterfall", label: "Waterfall" },
  { key: "fundraising", label: "Fundraising" },
  { key: "compliance", label: "Legal & Compliance" },
  { key: "operations", label: "Operations" },
];

export default function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: entity, isLoading } = useSWR(id ? `/api/entities/${id}` : null, fetcher);
  const [tab, setTab] = useState("overview");
  const [statusTransitionTarget, setStatusTransitionTarget] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [markingFormed, setMarkingFormed] = useState(false);
  const toast = useToast();

  if (isLoading || !entity) return <div className="text-sm text-gray-400">Loading...</div>;

  const e = entity;

  // Formation tab logic
  const showFormation = e.formationStatus === "FORMING" || e.formationStatus === "NOT_STARTED";
  const tabs = showFormation
    ? [{ key: "formation", label: "Formation" }, ...baseTabs]
    : baseTabs;

  const formationTasks: any[] = e.tasks || [];
  const formationCompleted = formationTasks.filter((t: any) => t.status === "DONE").length;
  const formationTotal = formationTasks.length;
  const completedPct = formationTotal > 0 ? Math.round((formationCompleted / formationTotal) * 100) : 0;
  const allFormationDone = formationTotal > 0 && formationCompleted === formationTotal;

  async function updateFormationTask(taskId: string, updates: Record<string, unknown>) {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, ...updates }),
    });
    mutate(`/api/entities/${id}`);
  }

  async function handleMarkFormed() {
    setMarkingFormed(true);
    try {
      const res = await fetch(`/api/entities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MARK_FORMED" }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Cannot mark as formed");
        return;
      }
      toast.success("Entity marked as formed");
      mutate(`/api/entities/${id}`);
    } catch {
      toast.error("Failed to mark as formed");
    } finally {
      setMarkingFormed(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/entities" className="text-xs text-indigo-600 hover:underline mb-1 inline-block">&larr; All Vehicles</Link>
          <h2 className="text-lg font-bold">{e.name}</h2>
          <div className="flex gap-2 mt-1">
            <Badge color={e.entityType === "MAIN_FUND" ? "indigo" : e.entityType === "SIDECAR" ? "purple" : "blue"}>{e.entityType?.replace(/_/g, " ")}</Badge>
            <Badge color={e.status === "ACTIVE" ? "green" : e.status === "WINDING_DOWN" ? "amber" : "gray"}>{e.status}</Badge>
            {e.vehicleStructure && <Badge color="gray">{e.vehicleStructure}</Badge>}
            {e.vintageYear && <Badge color="gray">{e.vintageYear}</Badge>}
            {e.formationStatus === "FORMING" && <Badge color="yellow">Forming</Badge>}
            {e.formationStatus === "FORMED" && <Badge color="green">Formed</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {e.status === "ACTIVE" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStatusTransitionTarget("WINDING_DOWN")}
              className="text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100"
            >
              Wind Down
            </Button>
          )}
          {e.status === "WINDING_DOWN" && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setStatusTransitionTarget("ACTIVE")}
                className="text-green-700 border-green-300 bg-green-50 hover:bg-green-100"
              >
                Reactivate
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setStatusTransitionTarget("DISSOLVED")}
                className="text-red-700 border-red-300 bg-red-50 hover:bg-red-100"
              >
                Dissolve
              </Button>
            </>
          )}
          <Link
            href={`/reports?entityId=${e.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <span>&#9660;</span>
            Generate Report
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 pb-0">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border border-b-0 ${tab === t.key ? "bg-white text-indigo-700 border-gray-200" : "bg-gray-50 dark:bg-gray-800 text-gray-500 border-transparent hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <SectionErrorBoundary>

      {/* Formation Tab */}
      {tab === "formation" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${completedPct}%` }} />
            </div>
            <span className="text-xs text-gray-500">{formationCompleted} / {formationTotal} complete</span>
          </div>

          {e.formationStatus === "FORMING" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              Entity is currently in formation. Complete all tasks below to finalize.
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
            {formationTasks.map((task: any) => (
              <div key={task.id}>
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                >
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    task.status === "DONE" ? "bg-emerald-400" :
                    task.status === "IN_PROGRESS" ? "bg-amber-400" :
                    "bg-gray-300"
                  }`} />
                  <span className="text-[10px] text-gray-400 font-mono w-4">{task.order}</span>
                  <span className={`flex-1 text-sm ${task.status === "DONE" ? "line-through text-gray-400" : "text-gray-900 dark:text-gray-100"}`}>
                    {task.title}
                  </span>
                  {task.assignee && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                      {task.assignee.initials || task.assignee.name?.split(" ").map((n: string) => n[0]).join("")}
                    </span>
                  )}
                  {task.dueDate && (
                    <span className="text-[10px] text-gray-400">
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                  <Badge color={
                    task.status === "DONE" ? "green" :
                    task.status === "IN_PROGRESS" ? "yellow" :
                    "gray"
                  }>
                    {task.status === "DONE" ? "Done" : task.status === "IN_PROGRESS" ? "In Progress" : "To Do"}
                  </Badge>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedTask === task.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {expandedTask === task.id && (
                  <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100 dark:border-gray-700">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] text-gray-500 mb-1 block">Status</label>
                        <select
                          value={task.status}
                          onChange={(ev) => updateFormationTask(task.id, { status: ev.target.value })}
                          className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="DONE">Done</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 mb-1 block">Assignee</label>
                        <TeamUserSelect
                          value={task.assigneeId || ""}
                          onChange={(val) => updateFormationTask(task.id, { assigneeId: val || null })}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 mb-1 block">Due Date</label>
                        <input
                          type="date"
                          value={task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""}
                          onChange={(ev) => updateFormationTask(task.id, { dueDate: ev.target.value || null })}
                          className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="text-[10px] text-gray-500 mb-1 block">Notes</label>
                      <textarea
                        defaultValue={task.notes || ""}
                        onBlur={(ev) => updateFormationTask(task.id, { notes: ev.target.value })}
                        rows={2}
                        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        placeholder="Add notes..."
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
            {formationTasks.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No formation tasks.</div>
            )}
          </div>

          <InlineTaskAdd
            contextType="entity"
            contextId={id}
            entityId={id}
            contextLabel={e.name}
            onTaskCreated={() => mutate(`/api/entities/${id}`)}
          />

          {allFormationDone && e.formationStatus === "FORMING" && (
            <div className="flex justify-end">
              <Button onClick={handleMarkFormed} disabled={markingFormed}>
                {markingFormed ? "Marking..." : "Mark as Formed"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Tab components — each makes its own SWR fetches (lazy) */}
      {tab === "overview" && <EntityOverviewTab entity={e} entityId={id} onTabChange={setTab} />}
      {tab === "capital" && <EntityCapitalTab entity={e} entityId={id} />}
      {tab === "cap-table" && <EntityCapTableTab entity={e} entityId={id} />}
      {tab === "waterfall" && <EntityWaterfallTab entity={e} entityId={id} />}
      {tab === "fundraising" && <EntityFundraisingTab entityId={id} />}
      {tab === "compliance" && <EntityComplianceTab entity={e} entityId={id} />}
      {tab === "operations" && <EntityOperationsTab entity={e} entityId={id} />}

      {/* Status Transition Dialog */}
      {statusTransitionTarget && (
        <StatusTransitionDialog
          entityId={id}
          currentStatus={e.status}
          targetStatus={statusTransitionTarget}
          open={!!statusTransitionTarget}
          onClose={() => setStatusTransitionTarget(null)}
          onSuccess={() => mutate(`/api/entities/${id}`)}
        />
      )}

      </SectionErrorBoundary>
    </div>
  );
}

// Helper component for team user select in formation tasks
function TeamUserSelect({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const { data: users } = useSWR("/api/users", fetcher);
  return (
    <select
      value={value}
      onChange={(ev) => onChange(ev.target.value)}
      className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <option value="">Unassigned</option>
      {(users || []).map((u: any) => (
        <option key={u.id} value={u.id}>{u.name}</option>
      ))}
    </select>
  );
}
