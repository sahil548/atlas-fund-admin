"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
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
  const [expandedAnalysis, setExpandedAnalysis] = useState<Set<string>>(
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
  const [showAddWorkstream, setShowAddWorkstream] = useState(false);
  const [analyzingWs, setAnalyzingWs] = useState<string | null>(null);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [promptModalWs, setPromptModalWs] = useState<any>(null);
  const [promptText, setPromptText] = useState("");
  const [promptEditing, setPromptEditing] = useState(false);
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  const allWorkstreams = (deal.workstreams || []) as any[];
  // IC_MEMO is not a workstream — it's an aggregated product stored in AIScreeningResult
  const workstreams = allWorkstreams.filter((w: any) => w.analysisType !== "IC_MEMO");
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

  // ── Analysis triggers ──

  // Map workstream name → dd-analyze type
  const NAME_TO_TYPE: Record<string, string> = {
    "Financial DD": "DD_FINANCIAL",
    "Legal DD": "DD_LEGAL",
    "Market DD": "DD_MARKET",
    "Tax DD": "DD_TAX",
    "Operational DD": "DD_OPERATIONAL",
    "ESG DD": "DD_ESG",
    "Collateral DD": "DD_COLLATERAL",
    "Tenant & Lease DD": "DD_TENANT_LEASE",
    "Customer DD": "DD_CUSTOMER",
    "Technology DD": "DD_TECHNOLOGY",
    "Regulatory & Permitting DD": "DD_REGULATORY",
    "Engineering DD": "DD_ENGINEERING",
    "Credit DD": "DD_CREDIT",
    "Commercial DD": "DD_COMMERCIAL",
    "Management DD": "DD_MANAGEMENT",
  };

  async function runWorkstreamAnalysis(ws: any) {
    const type = ws.analysisType || NAME_TO_TYPE[ws.name] || "DD_CUSTOM";
    setAnalyzingWs(ws.id);
    try {
      const res = await fetch(`/api/deals/${deal.id}/dd-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          categoryName: ws.name,
          rerun: !!ws.analysisResult,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed");
      }
      toast.success(`${ws.name} analysis complete`);
      mutate(`/api/deals/${deal.id}`);
    } catch (err: any) {
      toast.error(err.message || "Analysis failed");
    } finally {
      setAnalyzingWs(null);
    }
  }

  async function runAllAnalysis() {
    setAnalyzingAll(true);
    // Phase 1: Run all workstream analyses in parallel
    const results = await Promise.allSettled(
      sortedWorkstreams.map(async (ws) => {
        const type = ws.analysisType || NAME_TO_TYPE[ws.name] || "DD_CUSTOM";
        const res = await fetch(`/api/deals/${deal.id}/dd-analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            categoryName: ws.name,
            rerun: !!ws.analysisResult,
          }),
        });
        if (!res.ok) throw new Error(`${ws.name} failed`);
      })
    );
    const completed = results.filter((r) => r.status === "fulfilled").length;

    // Phase 2: Auto-generate IC Memo from workstream results
    try {
      await fetch(`/api/deals/${deal.id}/dd-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "IC_MEMO", rerun: true }),
      });
      toast.success(`Analysis complete (${completed}/${sortedWorkstreams.length}) — IC Memo generated`);
    } catch {
      toast.success(`Analysis complete (${completed}/${sortedWorkstreams.length}) — IC Memo generation failed`);
    }
    mutate(`/api/deals/${deal.id}`);
    setAnalyzingAll(false);
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

  async function openPromptModal(ws: any) {
    setPromptModalWs(ws);
    setPromptEditing(false);
    if (ws.customInstructions) {
      setPromptText(ws.customInstructions);
    } else {
      // Fetch from DD category template
      setLoadingTemplate(true);
      try {
        const res = await fetch(`/api/dd-categories?name=${encodeURIComponent(ws.name)}`);
        const templates = await res.json();
        const tmpl = Array.isArray(templates) ? templates.find((t: any) => t.name === ws.name) : null;
        setPromptText(tmpl?.defaultInstructions || "");
      } catch {
        setPromptText("");
      } finally {
        setLoadingTemplate(false);
      }
    }
  }

  async function savePromptInstructions() {
    if (!promptModalWs) return;
    setSavingInstructions(true);
    try {
      const text = promptText.trim() || null;
      await fetch(`/api/deals/${deal.id}/workstreams`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promptModalWs.id, customInstructions: text }),
      });
      toast.success("Analysis prompt saved");
      mutate(`/api/deals/${deal.id}`);
      setPromptModalWs(null);
    } catch {
      toast.error("Failed to save prompt");
    } finally {
      setSavingInstructions(false);
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
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-500">
              {completedTasks} of {totalTasks} tasks complete
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={runAllAnalysis}
              disabled={analyzingAll || analyzingWs !== null}
            >
              {analyzingAll ? "Analyzing..." : "Run All Analysis"}
            </Button>
          </div>
        </div>
      )}

      {/* SCREENING stage empty state */}
      {deal.stage === "SCREENING" && workstreams.length === 0 && (
        <div className="py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="text-sm font-semibold text-gray-700">Due Diligence Workstreams</div>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            Workstreams will be created when you start Due Diligence from the Overview tab. You can also manually add workstreams below.
          </p>
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={() => setShowAddWorkstream(true)}>
              + Add Workstream Manually
            </Button>
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
                <div
                  role="button"
                  tabIndex={0}
                  className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => toggleWorkstream(ws.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleWorkstream(ws.id); }}
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
                    {ws.analysisResult && <Badge color="indigo">Analyzed</Badge>}
                    <button
                      onClick={(e) => { e.stopPropagation(); runWorkstreamAnalysis(ws); }}
                      disabled={analyzingWs === ws.id || analyzingAll}
                      className="text-[10px] font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {analyzingWs === ws.id ? "Analyzing..." : ws.analysisResult ? "Re-analyze" : "Run Analysis"}
                    </button>
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
                </div>

                {/* Expanded section */}
                {isExpanded && (
                  <div className="p-3 space-y-2 border-t border-gray-200">
                    {ws.description && (
                      <p className="text-xs text-gray-500 mb-2">
                        {ws.description}
                      </p>
                    )}
                    {/* Analysis Prompt badge — always shows, opens modal */}
                    <div className="mb-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); openPromptModal(ws); }}
                        className="text-xs font-medium px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-colors inline-flex items-center gap-1"
                      >
                        {ws.customInstructions ? "Analysis Prompt" : "Analysis Prompt (default)"}
                      </button>
                    </div>

                    {/* Analysis Report */}
                    {ws.analysisResult && (
                      <div className={`mb-3 rounded-lg border p-3 ${ws.analysisResult.aiPowered ? "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100 dark:from-indigo-950 dark:to-purple-950 dark:border-indigo-800" : "bg-gradient-to-r from-gray-50 to-amber-50 border-amber-100 dark:from-gray-900 dark:to-amber-950 dark:border-amber-800"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`text-xs font-semibold ${ws.analysisResult.aiPowered ? "text-indigo-900" : "text-gray-700"}`}>Analysis Report</div>
                            {!ws.analysisResult.aiPowered && (
                              <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Sample — configure AI for full analysis</span>
                            )}
                          </div>
                          {ws.analysisResult.recommendation && (
                            <Badge
                              color={
                                ws.analysisResult.recommendation === "GO" || ws.analysisResult.recommendation === "APPROVE"
                                  ? "green"
                                  : ws.analysisResult.recommendation === "NO_GO" || ws.analysisResult.recommendation === "DECLINE"
                                  ? "red"
                                  : "yellow"
                              }
                            >
                              {ws.analysisResult.recommendation.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-700 mb-2">{ws.analysisResult.summary}</p>

                        {/* Report sections — shown by default */}
                        {Array.isArray(ws.analysisResult.sections) && ws.analysisResult.sections.length > 0 && (
                          <div className="mt-2 space-y-2">
                            <button
                              onClick={() =>
                                setExpandedAnalysis((prev) => {
                                  const next = new Set(prev);
                                  next.has(ws.id) ? next.delete(ws.id) : next.add(ws.id);
                                  return next;
                                })
                              }
                              className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              {expandedAnalysis.has(ws.id) ? "Hide Report Details ▴" : `Show Report Details (${ws.analysisResult.sections.length} sections) ▾`}
                            </button>
                            {expandedAnalysis.has(ws.id) && (
                              <div className="space-y-2">
                                {ws.analysisResult.sections.map((section: any, i: number) => (
                                  <div key={i} className="bg-white rounded border border-gray-100 p-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-gray-800">{section.name}</span>
                                      {section.riskLevel && (
                                        <Badge
                                          color={
                                            section.riskLevel === "HIGH" ? "red" : section.riskLevel === "MEDIUM" ? "yellow" : "green"
                                          }
                                        >
                                          {section.riskLevel}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-gray-600 mt-1 whitespace-pre-wrap">{section.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Open questions count */}
                        {ws.tasks && ws.tasks.length > 0 && (
                          <div className="mt-2 text-[10px] text-indigo-600">
                            Generated {ws.tasks.filter((t: any) => t.source?.startsWith("AI_")).length} open questions
                          </div>
                        )}
                      </div>
                    )}

                    {/* Open Questions & Tasks */}
                    {ws.tasks && ws.tasks.length > 0 && (
                      <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mt-1 mb-0.5">
                        Open Questions &amp; Tasks ({ws.tasks.length})
                      </div>
                    )}
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
                                        : task.source?.startsWith("AI_")
                                        ? "indigo"
                                        : "gray"
                                    }
                                  >
                                    {task.source === "AI_SCREENING"
                                      ? "Screening"
                                      : task.source?.startsWith("AI_DD_")
                                      ? "AI DD"
                                      : task.source?.startsWith("AI_IC_")
                                      ? "AI Memo"
                                      : task.source?.startsWith("AI_COMP")
                                      ? "AI Comp"
                                      : task.source === "MANUAL"
                                      ? "Manual"
                                      : task.source}
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

      {/* Analysis Prompt Modal */}
      <Modal
        open={!!promptModalWs}
        onClose={() => { setPromptModalWs(null); setPromptEditing(false); }}
        title={`Analysis Prompt — ${promptModalWs?.name || ""}`}
        size="lg"
        footer={
          promptEditing ? (
            <>
              <Button variant="secondary" onClick={() => setPromptEditing(false)}>Cancel</Button>
              <Button loading={savingInstructions} onClick={savePromptInstructions}>Save Changes</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => { setPromptModalWs(null); setPromptEditing(false); }}>Close</Button>
              <Button onClick={() => setPromptEditing(true)}>Edit Prompt</Button>
            </>
          )
        }
      >
        {loadingTemplate ? (
          <div className="py-8 text-center text-sm text-gray-400">Loading prompt template...</div>
        ) : promptEditing ? (
          <div className="space-y-3">
            <div className="text-xs text-gray-500">
              Edit the analysis instructions the AI uses for this workstream. Changes only affect this deal — the template in Settings stays the same.
            </div>
            <Textarea
              value={promptText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPromptText(e.target.value)}
              rows={10}
              placeholder="Analysis instructions..."
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                {promptModalWs?.customInstructions ? "Custom Prompt (deal-specific)" : "Default Prompt (from Settings → Deal Desk)"}
              </span>
            </div>
            {promptText ? (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{promptText}</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
                <p className="text-sm text-gray-400">No prompt configured for this workstream.</p>
                <p className="text-xs text-gray-400 mt-1">Click &ldquo;Edit Prompt&rdquo; to add one, or configure it in Settings → Deal Desk.</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
