"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { mutate } from "swr";
import { AddWorkstreamForm } from "./add-workstream-form";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface DealDDTabProps {
  deal: any;
}

export function DealDDTab({ deal }: DealDDTabProps) {
  const toast = useToast();
  const [expandedWorkstreams, setExpandedWorkstreams] = useState<Set<string>>(
    new Set()
  );
  const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>(
    {}
  );
  const [newTaskDescs, setNewTaskDescs] = useState<Record<string, string>>({});
  const [newTaskPriorities, setNewTaskPriorities] = useState<
    Record<string, string>
  >({});
  const [showAddTaskForm, setShowAddTaskForm] = useState<
    Record<string, boolean>
  >({});
  const [resolutionTexts, setResolutionTexts] = useState<
    Record<string, string>
  >({});
  const [showResolution, setShowResolution] = useState<
    Record<string, boolean>
  >({});
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [showAddWorkstream, setShowAddWorkstream] = useState(false);

  const workstreams = (deal.workstreams || []) as any[];
  const sortedWorkstreams = [...workstreams].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  // Overall progress
  const totalTasks = workstreams.reduce(
    (sum: number, ws: any) => sum + (ws.totalTasks ?? 0),
    0
  );
  const completedTasks = workstreams.reduce(
    (sum: number, ws: any) => sum + (ws.completedTasks ?? 0),
    0
  );
  const overallPct =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const completeCategories = workstreams.filter(
    (ws: any) => ws.status === "COMPLETE"
  ).length;

  function toggleWorkstream(wsId: string) {
    setExpandedWorkstreams((prev) => {
      const next = new Set(prev);
      if (next.has(wsId)) next.delete(wsId);
      else next.add(wsId);
      return next;
    });
  }

  async function toggleTask(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === "DONE" ? "TODO" : "DONE";
    if (newStatus === "DONE") {
      setShowResolution((p) => ({ ...p, [taskId]: true }));
      return;
    }
    try {
      await fetch(`/api/deals/${deal.id}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
      mutate(`/api/deals/${deal.id}`);
    } catch {
      /* silent */
    }
  }

  async function markTaskDone(taskId: string) {
    const resolution = resolutionTexts[taskId] || "";
    try {
      await fetch(`/api/deals/${deal.id}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: taskId,
          status: "DONE",
          resolution: resolution || undefined,
        }),
      });
      setShowResolution((p) => ({ ...p, [taskId]: false }));
      setResolutionTexts((p) => ({ ...p, [taskId]: "" }));
      mutate(`/api/deals/${deal.id}`);
    } catch {
      /* silent */
    }
  }

  async function addTask(workstreamId: string) {
    const title = newTaskTitles[workstreamId]?.trim();
    if (!title) return;
    try {
      await fetch(`/api/deals/${deal.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workstreamId,
          title,
          description: newTaskDescs[workstreamId] || undefined,
          priority: newTaskPriorities[workstreamId] || "MEDIUM",
          source: "MANUAL",
        }),
      });
      setNewTaskTitles((p) => ({ ...p, [workstreamId]: "" }));
      setNewTaskDescs((p) => ({ ...p, [workstreamId]: "" }));
      setNewTaskPriorities((p) => ({ ...p, [workstreamId]: "MEDIUM" }));
      setShowAddTaskForm((p) => ({ ...p, [workstreamId]: false }));
      mutate(`/api/deals/${deal.id}`);
    } catch {
      /* silent */
    }
  }

  async function deleteTask(taskId: string) {
    try {
      await fetch(`/api/deals/${deal.id}/tasks`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId }),
      });
      mutate(`/api/deals/${deal.id}`);
    } catch {
      /* silent */
    }
  }

  async function applyTemplate(templateId: string) {
    setApplyingTemplate(true);
    try {
      await fetch(`/api/deals/${deal.id}/apply-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      toast.success("DD template applied");
      mutate(`/api/deals/${deal.id}`);
    } catch {
      toast.error("Failed to apply template");
    } finally {
      setApplyingTemplate(false);
    }
  }

  async function markCategoryComplete(workstreamId: string) {
    try {
      await fetch(`/api/deals/${deal.id}/workstreams`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: workstreamId, status: "COMPLETE" }),
      });
      toast.success("Category marked complete");
      mutate(`/api/deals/${deal.id}`);
    } catch {
      toast.error("Failed to update category");
    }
  }

  return (
    <div className="space-y-4">
      {/* DD Progress Summary */}
      {workstreams.length > 0 && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-gray-700">
              DD Progress
            </div>
            <span className="text-xs text-gray-500">
              {completeCategories} of {workstreams.length} categories complete
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  overallPct === 100 ? "bg-emerald-500" : "bg-indigo-500"
                }`}
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600 w-10 text-right">
              {overallPct}%
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {completedTasks} of {totalTasks} tasks complete
          </div>
        </div>
      )}

      {/* Template Picker */}
      {workstreams.length === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            No workstreams yet. Apply a template to get started:
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                id: "standard-equity",
                name: "Standard Equity DD",
                desc: "PE / direct equity investments",
                color: "bg-indigo-50 border-indigo-200",
              },
              {
                id: "credit-dd",
                name: "Credit DD",
                desc: "Private credit & lending",
                color: "bg-orange-50 border-orange-200",
              },
              {
                id: "real-estate-dd",
                name: "Real Estate DD",
                desc: "Direct real estate",
                color: "bg-green-50 border-green-200",
              },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t.id)}
                disabled={applyingTemplate}
                className={`p-4 rounded-xl border text-left hover:shadow-md transition-shadow ${t.color}`}
              >
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-gray-500 mt-1">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Cards */}
      {sortedWorkstreams.length > 0 && (
        <div className="space-y-2">
          {sortedWorkstreams.map((ws: any) => {
            const pct =
              ws.totalTasks > 0
                ? Math.round((ws.completedTasks / ws.totalTasks) * 100)
                : 0;
            const isExpanded = expandedWorkstreams.has(ws.id);
            const allDone =
              ws.totalTasks > 0 && ws.completedTasks === ws.totalTasks;

            return (
              <div
                key={ws.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Header row */}
                <button
                  className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={() => toggleWorkstream(ws.id)}
                >
                  <span
                    className={`text-xs transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  >
                    &#9654;
                  </span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      ws.status === "COMPLETE"
                        ? "bg-emerald-400"
                        : ws.status === "IN_PROGRESS"
                        ? "bg-amber-400"
                        : "bg-gray-300"
                    }`}
                  />
                  <span className="text-xs font-medium flex-1 text-left">
                    {ws.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {ws.aiGenerated && (
                      <Badge color="purple">AI</Badge>
                    )}
                    <Badge
                      color={
                        ws.status === "COMPLETE"
                          ? "green"
                          : ws.status === "IN_PROGRESS"
                          ? "yellow"
                          : "gray"
                      }
                    >
                      {ws.status?.replace(/_/g, " ")}
                    </Badge>
                    <ProgressBar
                      percent={pct}
                      colorClass={
                        ws.status === "COMPLETE"
                          ? "bg-emerald-400"
                          : "bg-amber-400"
                      }
                    />
                    <span className="text-[10px] text-gray-500 w-12 text-right">
                      {ws.completedTasks}/{ws.totalTasks}
                    </span>
                  </div>
                </button>

                {/* Expanded section */}
                {isExpanded && (
                  <div className="p-3 space-y-2 border-t border-gray-200">
                    {ws.description && (
                      <p className="text-xs text-gray-500 mb-2">
                        {ws.description}
                      </p>
                    )}
                    {ws.customInstructions && (
                      <div className="mb-2">
                        <Badge color="indigo">Custom Instructions</Badge>
                      </div>
                    )}

                    {/* Tasks list */}
                    {ws.tasks && ws.tasks.length > 0 ? (
                      ws.tasks.map((task: any) => (
                        <div key={task.id} className="group">
                          <div className="flex items-start gap-2">
                            <button
                              onClick={() =>
                                task.status === "DONE"
                                  ? toggleTask(task.id, task.status)
                                  : toggleTask(task.id, task.status)
                              }
                              className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors mt-0.5 ${
                                task.status === "DONE"
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "border-gray-300 hover:border-indigo-400"
                              }`}
                            >
                              {task.status === "DONE" && (
                                <svg
                                  className="w-2.5 h-2.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs flex-1 ${
                                    task.status === "DONE"
                                      ? "line-through text-gray-400"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {task.title}
                                </span>
                                {task.priority && (
                                  <Badge
                                    color={
                                      task.priority === "HIGH"
                                        ? "red"
                                        : task.priority === "MEDIUM"
                                        ? "yellow"
                                        : "gray"
                                    }
                                  >
                                    {task.priority}
                                  </Badge>
                                )}
                                {task.source && (
                                  <Badge
                                    color={
                                      task.source === "AI_SCREENING"
                                        ? "purple"
                                        : "gray"
                                    }
                                  >
                                    {task.source === "AI_SCREENING"
                                      ? "AI"
                                      : "Manual"}
                                  </Badge>
                                )}
                                {task.assignee && (
                                  <span className="text-[10px] text-gray-400">
                                    {task.assignee}
                                  </span>
                                )}
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs"
                                >
                                  &times;
                                </button>
                              </div>
                              {task.description && (
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  {task.description}
                                </p>
                              )}
                              {/* Resolution for DONE tasks */}
                              {task.status === "DONE" && task.resolution && (
                                <div className="mt-1 bg-emerald-50 border border-emerald-100 rounded p-2">
                                  <div className="text-[10px] font-medium text-emerald-700">
                                    Resolution
                                  </div>
                                  <p className="text-[11px] text-emerald-600">
                                    {task.resolution}
                                  </p>
                                  {task.resolvedAt && (
                                    <div className="text-[10px] text-emerald-400 mt-0.5">
                                      {new Date(
                                        task.resolvedAt
                                      ).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Inline resolution textarea when marking as DONE */}
                          {showResolution[task.id] && (
                            <div className="ml-6 mt-2 space-y-2">
                              <Textarea
                                value={resolutionTexts[task.id] || ""}
                                onChange={(e) =>
                                  setResolutionTexts((p) => ({
                                    ...p,
                                    [task.id]: e.target.value,
                                  }))
                                }
                                placeholder="Resolution notes (optional)..."
                                rows={2}
                                className="text-xs"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => markTaskDone(task.id)}
                                >
                                  Mark Done
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() =>
                                    setShowResolution((p) => ({
                                      ...p,
                                      [task.id]: false,
                                    }))
                                  }
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-400 text-center py-2">
                        No tasks yet.
                      </div>
                    )}

                    {/* Add Finding inline form */}
                    {showAddTaskForm[ws.id] ? (
                      <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
                        <Input
                          value={newTaskTitles[ws.id] || ""}
                          onChange={(e) =>
                            setNewTaskTitles((p) => ({
                              ...p,
                              [ws.id]: e.target.value,
                            }))
                          }
                          placeholder="Finding title..."
                          className="text-xs"
                        />
                        <Textarea
                          value={newTaskDescs[ws.id] || ""}
                          onChange={(e) =>
                            setNewTaskDescs((p) => ({
                              ...p,
                              [ws.id]: e.target.value,
                            }))
                          }
                          placeholder="Description (optional)..."
                          rows={2}
                          className="text-xs"
                        />
                        <Select
                          value={newTaskPriorities[ws.id] || "MEDIUM"}
                          onChange={(e) =>
                            setNewTaskPriorities((p) => ({
                              ...p,
                              [ws.id]: e.target.value,
                            }))
                          }
                          options={[
                            { value: "HIGH", label: "High" },
                            { value: "MEDIUM", label: "Medium" },
                            { value: "LOW", label: "Low" },
                          ]}
                          className="text-xs w-32"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => addTask(ws.id)}
                            disabled={!newTaskTitles[ws.id]?.trim()}
                          >
                            Add
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setShowAddTaskForm((p) => ({
                                ...p,
                                [ws.id]: false,
                              }))
                            }
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() =>
                            setShowAddTaskForm((p) => ({
                              ...p,
                              [ws.id]: true,
                            }))
                          }
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          + Add Finding
                        </button>
                        {allDone && ws.status !== "COMPLETE" && (
                          <Button
                            size="sm"
                            onClick={() => markCategoryComplete(ws.id)}
                          >
                            Mark Category Complete
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Category button */}
      <div className="flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowAddWorkstream(true)}
        >
          + Add Category
        </Button>
      </div>

      <AddWorkstreamForm
        open={showAddWorkstream}
        onClose={() => setShowAddWorkstream(false)}
        dealId={deal.id}
      />
    </div>
  );
}
