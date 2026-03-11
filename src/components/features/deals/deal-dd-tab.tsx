"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { mutate } from "swr";
import { AddWorkstreamForm } from "./add-workstream-form";
import { WorkstreamDetailPanel } from "./workstream-detail-panel";
import { formatDate, formatDateShort } from "@/lib/utils";

// Workstream and task shapes come from API JSON responses with complex nested
// structures — remaining any usages below are for those API response fields only.
/* eslint-disable @typescript-eslint/no-explicit-any */

interface DealForDDTab {
  id: string;
  stage: string;
  workstreams?: Array<{
    id: string;
    name: string;
    analysisType?: string | null;
    status: string;
    priority?: string | null;
    dueDate?: string | null;
    sortOrder?: number | null;
    totalTasks?: number;
    completedTasks?: number;
    hasAI?: boolean;
    customInstructions?: string | null;
    analysisResult?: { aiPowered?: boolean } | null;
    assignee?: { id: string; name: string; initials: string } | null;
    _count?: { comments: number; attachments: number };
    tasks?: Array<{ id: string; status: string; title?: string }>;
  }>;
  dealLead?: { id: string; name: string; initials: string } | null;
  screeningResult?: { memo?: Record<string, unknown> | null; version?: number } | null;
}

interface DealDDTabProps {
  deal: DealForDDTab;
}

export function DealDDTab({ deal }: DealDDTabProps) {
  const toast = useToast();
  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showAddWorkstream, setShowAddWorkstream] = useState(false);
  const [analyzingWs, setAnalyzingWs] = useState<string | null>(null);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [allProgress, setAllProgress] = useState<{
    total: number;
    completed: number;
    running: Set<string>;
    done: Set<string>;
    phase: string;
  } | null>(null);
  const [promptModalWs, setPromptModalWs] = useState<any>(null);
  const [promptText, setPromptText] = useState("");
  const [promptEditing, setPromptEditing] = useState(false);
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [expandedWs, setExpandedWs] = useState<Record<string, boolean>>({});
  const [addingTaskWs, setAddingTaskWs] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  const allWorkstreams = (deal.workstreams || []) as any[];
  // IC_MEMO is not a workstream - it's in AIScreeningResult
  const workstreams = allWorkstreams.filter((w: any) => w.analysisType !== "IC_MEMO");
  const sortedWorkstreams = [...workstreams].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );

  // Extract team members for assignee dropdown (from the deal or from workstream assignees)
  const teamMembers: { id: string; name: string; initials: string }[] = [];
  const seenIds = new Set<string>();
  if (deal.dealLead && !seenIds.has(deal.dealLead.id)) {
    teamMembers.push(deal.dealLead);
    seenIds.add(deal.dealLead.id);
  }
  for (const ws of allWorkstreams) {
    if (ws.assignee && !seenIds.has(ws.assignee.id)) {
      teamMembers.push(ws.assignee);
      seenIds.add(ws.assignee.id);
    }
  }

  // Overall progress
  const totalTasks = workstreams.reduce(
    (sum: number, ws: any) => sum + (ws.totalTasks ?? 0),
    0,
  );
  const completedTasks = workstreams.reduce(
    (sum: number, ws: any) => sum + (ws.completedTasks ?? 0),
    0,
  );
  const completeCategories = workstreams.filter(
    (ws: any) => ws.status === "COMPLETE",
  ).length;
  // BUG-01 fix: fall back to workstream-status-based progress when no tasks.
  const overallPct =
    totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : workstreams.length > 0
        ? Math.round((completeCategories / workstreams.length) * 100)
        : 0;
  const progressBasis = totalTasks > 0 ? "tasks" : "workstreams";

  // ---- Analysis triggers ----
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
      if (res.status === 504) {
        toast.error("AI generation timed out. Try again with a smaller document.");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = typeof err.error === "string" ? err.error : "Analysis failed";
        throw new Error(msg);
      }
      // After analysis, trigger IC Memo re-generation if memo exists
      if (deal.screeningResult?.memo) {
        try {
          await fetch(`/api/deals/${deal.id}/dd-analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "IC_MEMO", rerun: true }),
          });
          const sr = deal.screeningResult;
          const newVersion = (sr.version || 1) + 1;
          toast.success(`${ws.name} re-analyzed. IC Memo updated to v${newVersion}.`);
        } catch {
          toast.success(`${ws.name} re-analyzed. IC Memo update failed.`);
        }
      } else {
        toast.success(`${ws.name} analysis complete`);
      }
      mutate(`/api/deals/${deal.id}`);
    } catch (err: any) {
      const msg = typeof err.message === "string" ? err.message : "Analysis failed";
      toast.error(msg);
    } finally {
      setAnalyzingWs(null);
    }
  }

  async function runAllAnalysis(onlyFailed = false) {
    const targetWorkstreams = onlyFailed
      ? sortedWorkstreams.filter((ws) => ws.analysisResult && !ws.analysisResult.aiPowered)
      : sortedWorkstreams;

    if (targetWorkstreams.length === 0) {
      toast.error("No workstreams to re-analyze");
      return;
    }

    setAnalyzingAll(true);
    const totalSteps = targetWorkstreams.length + 1;
    const runningSet = new Set<string>();
    const doneSet = new Set<string>();
    setAllProgress({
      total: totalSteps,
      completed: 0,
      running: new Set(runningSet),
      done: new Set(doneSet),
      phase: "Analyzing workstreams",
    });

    const mockFallbacks: string[] = [];
    let completedCount = 0;
    const CONCURRENCY = 4;
    let nextIdx = 0;

    const runOne = async () => {
      while (nextIdx < targetWorkstreams.length) {
        const ws = targetWorkstreams[nextIdx++];
        runningSet.add(ws.name);
        setAllProgress((p) =>
          p ? { ...p, running: new Set(runningSet), done: new Set(doneSet) } : null,
        );
        const type = ws.analysisType || NAME_TO_TYPE[ws.name] || "DD_CUSTOM";
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
          if (res.ok) {
            const data = await res.json().catch(() => null);
            if (data) {
              const updated = (data.workstreams || []).find(
                (x: any) => x.name === ws.name,
              );
              if (updated?.analysisResult && !updated.analysisResult.aiPowered) {
                mockFallbacks.push(ws.name);
              }
            }
          } else {
            mockFallbacks.push(ws.name);
          }
        } catch {
          mockFallbacks.push(ws.name);
        }
        completedCount++;
        doneSet.add(ws.name);
        runningSet.delete(ws.name);
        setAllProgress((p) =>
          p
            ? {
                ...p,
                completed: completedCount,
                running: new Set(runningSet),
                done: new Set(doneSet),
              }
            : null,
        );
      }
    };

    await Promise.allSettled(
      Array.from({ length: Math.min(CONCURRENCY, targetWorkstreams.length) }, () =>
        runOne(),
      ),
    );

    // Phase 2: Auto-generate IC Memo
    setAllProgress((p) =>
      p ? { ...p, phase: "Generating IC Memo", running: new Set(["IC Memo"]) } : null,
    );
    try {
      await fetch(`/api/deals/${deal.id}/dd-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "IC_MEMO", rerun: true }),
      });
    } catch {
      toast.error("IC Memo generation failed");
    }

    if (mockFallbacks.length > 0) {
      toast.error(
        `${mockFallbacks.length} workstream${mockFallbacks.length > 1 ? "s" : ""} used sample data (AI timed out) -- click Re-analyze Failed to retry`,
      );
    } else {
      toast.success(
        `All ${targetWorkstreams.length} workstreams analyzed with AI -- IC Memo generated`,
      );
    }

    setAllProgress(null);
    mutate(`/api/deals/${deal.id}`);
    setAnalyzingAll(false);
  }

  async function patchWorkstream(wsId: string, updates: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/deals/${deal.id}/workstreams/${wsId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Failed to update";
        toast.error(msg);
        return;
      }
      mutate(`/api/deals/${deal.id}`);
    } catch {
      toast.error("Failed to update workstream");
    }
  }

  async function openPromptModal(ws: any) {
    setPromptModalWs(ws);
    setPromptEditing(false);
    if (ws.customInstructions) {
      setPromptText(ws.customInstructions);
    } else {
      setLoadingTemplate(true);
      try {
        const res = await fetch(
          `/api/dd-categories?name=${encodeURIComponent(ws.name)}`,
        );
        const templates = await res.json();
        const tmpl = Array.isArray(templates)
          ? templates.find((t: any) => t.name === ws.name)
          : null;
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

  // Status colors for the dot indicator
  function statusDot(status: string) {
    if (status === "COMPLETE") return "bg-emerald-400";
    if (status === "IN_PROGRESS") return "bg-blue-400";
    return "bg-gray-300";
  }

  // Priority badge color
  function priorityColor(priority: string | null) {
    if (priority === "HIGH") return "red";
    if (priority === "LOW") return "green";
    return "yellow";
  }

  // Check if date is overdue
  function isOverdue(date: string | null) {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  function toggleExpand(wsId: string) {
    setExpandedWs((prev) => ({ ...prev, [wsId]: !prev[wsId] }));
  }

  // Cycle task status: TODO → IN_PROGRESS → DONE → TODO
  async function cycleTaskStatus(task: any) {
    const nextStatus =
      task.status === "TODO"
        ? "IN_PROGRESS"
        : task.status === "IN_PROGRESS"
          ? "DONE"
          : "TODO";
    try {
      const res = await fetch(`/api/deals/${deal.id}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      mutate(`/api/deals/${deal.id}`);
    } catch {
      toast.error("Failed to update task status");
    }
  }

  async function addTask(wsId: string) {
    if (!newTaskTitle.trim()) return;
    setSavingTask(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workstreamId: wsId,
          title: newTaskTitle.trim(),
          source: "MANUAL",
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      setNewTaskTitle("");
      setAddingTaskWs(null);
      mutate(`/api/deals/${deal.id}`);
    } catch {
      toast.error("Failed to add task");
    } finally {
      setSavingTask(false);
    }
  }

  function taskStatusBadge(status: string) {
    if (status === "DONE")
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (status === "IN_PROGRESS")
      return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-gray-100 text-gray-500 border-gray-200";
  }

  function taskStatusIcon(status: string) {
    if (status === "DONE") return "\u2713";
    if (status === "IN_PROGRESS") return "\u25CF";
    return "\u25CB";
  }

  return (
    <div className="space-y-4">
      {/* DD Progress Summary */}
      {workstreams.length > 0 && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-gray-700">DD Progress</div>
            <span className="text-xs text-gray-500">
              {completeCategories} of {workstreams.length} workstreams complete
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
              {progressBasis === "tasks"
                ? `${completedTasks} of ${totalTasks} tasks complete`
                : `${completeCategories} of ${workstreams.length} workstreams complete`}
            </span>
            <div className="flex items-center gap-2">
              {(() => {
                const failedCount = sortedWorkstreams.filter(
                  (ws) => ws.analysisResult && !ws.analysisResult.aiPowered,
                ).length;
                return failedCount > 0 ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => runAllAnalysis(true)}
                    disabled={analyzingAll || analyzingWs !== null}
                    className="text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100"
                  >
                    {analyzingAll ? "Analyzing..." : `Re-analyze ${failedCount} Failed`}
                  </Button>
                ) : null;
              })()}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => runAllAnalysis()}
                disabled={analyzingAll || analyzingWs !== null}
              >
                {analyzingAll ? "Analyzing..." : "Run All Analysis"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Parallel Analysis Progress Banner */}
      {allProgress && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 animate-in fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-indigo-800">
                {allProgress.phase === "Generating IC Memo"
                  ? "Generating IC Memo..."
                  : `Running ${allProgress.running.size} workstream${allProgress.running.size !== 1 ? "s" : ""} in parallel`}
              </span>
            </div>
            <span className="text-xs text-indigo-600 font-medium">
              {allProgress.completed}/{allProgress.total} complete
            </span>
          </div>
          <div className="bg-indigo-200 rounded-full h-1.5 mb-2">
            <div
              className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500"
              style={{
                width: `${allProgress.total > 0 ? Math.round((allProgress.completed / allProgress.total) * 100) : 0}%`,
              }}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {sortedWorkstreams.map((ws) => {
              const isDone = allProgress.done.has(ws.name);
              const isRunning = allProgress.running.has(ws.name);
              return (
                <span
                  key={ws.id}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition-colors duration-300 ${
                    isDone
                      ? "bg-emerald-100 text-emerald-700"
                      : isRunning
                        ? "bg-indigo-200 text-indigo-800 font-semibold animate-pulse"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isDone ? "\u2713 " : isRunning ? "\u25CF " : ""}
                  {ws.name}
                </span>
              );
            })}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded transition-colors duration-300 ${
                allProgress.running.has("IC Memo")
                  ? "bg-indigo-200 text-indigo-800 font-semibold animate-pulse"
                  : allProgress.done.has("IC Memo")
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {allProgress.done.has("IC Memo")
                ? "\u2713 "
                : allProgress.running.has("IC Memo")
                  ? "\u25CF "
                  : ""}
              IC Memo
            </span>
          </div>
        </div>
      )}

      {/* SCREENING stage empty state */}
      {deal.stage === "SCREENING" && workstreams.length === 0 && (
        <div className="py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <div className="text-sm font-semibold text-gray-700">
            Due Diligence Workstreams
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            Workstreams will be created when you start Due Diligence from the Overview
            tab. You can also manually add workstreams below.
          </p>
          <div className="mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddWorkstream(true)}
            >
              + Add Workstream Manually
            </Button>
          </div>
        </div>
      )}

      {/* PM-Style Workstream List + Detail Panel */}
      {sortedWorkstreams.length > 0 && (
        <div className="flex gap-0 border border-gray-200 rounded-xl overflow-hidden">
          {/* Left: Workstream List */}
          <div
            className={`${(selectedWsId || selectedTaskId) ? "w-1/2" : "w-full"} transition-all duration-200`}
          >
            {/* Table header */}
            <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              <div className="w-5" />
              <div className="flex-1">Workstream</div>
              <div className="w-20 text-center">Assignee</div>
              <div className="w-16 text-center">Priority</div>
              <div className="w-20 text-center">Due</div>
              <div className="w-8 text-center" title="Comments">
                <svg className="w-3.5 h-3.5 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="w-8 text-center" title="Attachments">
                <svg className="w-3.5 h-3.5 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </div>
              <div className="w-24 text-center">Status</div>
              <div className="w-24 text-center">Actions</div>
            </div>

            {/* Workstream rows with collapsible task groups */}
            <div className="divide-y divide-gray-100">
              {sortedWorkstreams.map((ws: any) => {
                const commentCount = ws._count?.comments ?? 0;
                const attachmentCount = ws._count?.attachments ?? 0;
                const isSelected = selectedWsId === ws.id;
                const isExpanded = !!expandedWs[ws.id];
                const wsTasks = (ws.tasks || []) as any[];
                const wsCompletedTasks = wsTasks.filter((t: any) => t.status === "DONE").length;

                return (
                  <div key={ws.id}>
                    {/* Workstream header row */}
                    <div
                      className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(ws.id)}
                    >
                      {/* Expand/collapse chevron */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(ws.id);
                        }}
                        className="w-5 flex justify-center text-gray-400 hover:text-gray-600"
                      >
                        <svg
                          className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Name + task count */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(ws.status)}`}
                          />
                          <span className="text-xs font-medium text-gray-800 truncate">
                            {ws.name}
                          </span>
                          {wsTasks.length > 0 && (
                            <span className="text-[10px] text-gray-400 flex-shrink-0">
                              {wsCompletedTasks}/{wsTasks.length}
                            </span>
                          )}
                        </div>
                        {ws.analysisResult && (
                          <span className="text-[10px] text-indigo-500 ml-4">
                            {ws.analysisResult.aiPowered ? "AI analyzed" : "Sample data"}
                          </span>
                        )}
                      </div>

                      {/* Assignee */}
                      <div
                        className="w-20 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {ws.assignee ? (
                          <div
                            className="inline-flex items-center gap-1 text-[10px] text-gray-600 cursor-default"
                            title={ws.assignee.name}
                          >
                            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[9px] font-bold">
                              {ws.assignee.initials}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWsId(ws.id);
                            }}
                            className="text-[10px] text-gray-400 hover:text-indigo-600"
                          >
                            --
                          </button>
                        )}
                      </div>

                      {/* Priority */}
                      <div
                        className="w-16 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={ws.priority || "MEDIUM"}
                          onChange={(e) => {
                            e.stopPropagation();
                            patchWorkstream(ws.id, { priority: e.target.value });
                          }}
                          className="text-[10px] border-0 bg-transparent cursor-pointer font-medium text-center p-0"
                          style={{
                            color:
                              ws.priority === "HIGH"
                                ? "#dc2626"
                                : ws.priority === "LOW"
                                  ? "#16a34a"
                                  : "#ca8a04",
                          }}
                        >
                          <option value="HIGH">High</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="LOW">Low</option>
                        </select>
                      </div>

                      {/* Due Date */}
                      <div
                        className="w-20 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {ws.dueDate ? (
                          <span
                            className={`text-[10px] ${
                              isOverdue(ws.dueDate) && ws.status !== "COMPLETE"
                                ? "text-red-600 font-semibold"
                                : "text-gray-500"
                            }`}
                          >
                            {formatDateShort(ws.dueDate)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-300">--</span>
                        )}
                      </div>

                      {/* Comment count */}
                      <div className="w-8 text-center">
                        {commentCount > 0 ? (
                          <span className="text-[10px] text-gray-500 font-medium">
                            {commentCount}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-300">--</span>
                        )}
                      </div>

                      {/* Attachment count */}
                      <div className="w-8 text-center">
                        {attachmentCount > 0 ? (
                          <span className="text-[10px] text-gray-500 font-medium">
                            {attachmentCount}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-300">--</span>
                        )}
                      </div>

                      {/* Status badge (computed from tasks) */}
                      <div className="w-24 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            ws.status === "COMPLETE"
                              ? "text-emerald-700 bg-emerald-50"
                              : ws.status === "IN_PROGRESS"
                                ? "text-blue-700 bg-blue-50"
                                : "text-gray-500 bg-gray-50"
                          }`}
                        >
                          {ws.status === "COMPLETE" ? "Complete" : ws.status === "IN_PROGRESS" ? "In Progress" : "Not Started"}
                        </span>
                      </div>

                      {/* Actions */}
                      <div
                        className="w-24 text-center flex items-center justify-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {ws.hasAI && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              runWorkstreamAnalysis(ws);
                            }}
                            disabled={analyzingWs === ws.id || analyzingAll}
                            className="text-[10px] font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {analyzingWs === ws.id
                              ? "..."
                              : ws.analysisResult
                                ? "Re-analyze"
                                : "Analyze"}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTaskId(null);
                            setSelectedWsId(selectedWsId === ws.id ? null : ws.id);
                          }}
                          className={`text-[10px] hover:text-gray-600 ${selectedWsId === ws.id ? "text-indigo-600" : "text-gray-400"}`}
                          title="Comments & Attachments"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openPromptModal(ws);
                          }}
                          className="text-[10px] text-gray-400 hover:text-gray-600"
                          title="Analysis Prompt"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Expanded task sub-rows */}
                    {isExpanded && (
                      <div className="bg-gray-50/50">
                        {wsTasks.length === 0 && !addingTaskWs ? (
                          <div className="pl-10 pr-3 py-3 text-[11px] text-gray-400 flex items-center justify-between">
                            <span>No tasks yet. Run analysis or add tasks manually.</span>
                            <button
                              onClick={() => {
                                setAddingTaskWs(ws.id);
                                setNewTaskTitle("");
                              }}
                              className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              + Add Task
                            </button>
                          </div>
                        ) : (
                          <>
                            {wsTasks.map((task: any) => (
                              <div
                                key={task.id}
                                className={`flex items-center gap-2 pl-10 pr-3 py-1.5 border-t border-gray-100 hover:bg-gray-100/50 transition-colors cursor-pointer ${
                                  selectedTaskId === task.id ? "bg-indigo-50 border-l-2 border-l-indigo-400" : ""
                                }`}
                                onClick={() => {
                                  setSelectedWsId(null);
                                  setSelectedTaskId(selectedTaskId === task.id ? null : task.id);
                                }}
                              >
                                {/* Task status toggle */}
                                <button
                                  onClick={() => cycleTaskStatus(task)}
                                  className={`w-5 h-5 rounded border flex items-center justify-center text-[10px] font-bold flex-shrink-0 cursor-pointer transition-colors ${taskStatusBadge(task.status)}`}
                                  title={`${task.status} — click to cycle`}
                                >
                                  {taskStatusIcon(task.status)}
                                </button>

                                {/* Task title */}
                                <span
                                  className={`flex-1 text-[11px] truncate ${
                                    task.status === "DONE"
                                      ? "text-gray-400 line-through"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {task.title}
                                </span>

                                {/* Task priority */}
                                {task.priority && (
                                  <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                      task.priority === "HIGH"
                                        ? "bg-red-50 text-red-600"
                                        : task.priority === "LOW"
                                          ? "bg-green-50 text-green-600"
                                          : "bg-yellow-50 text-yellow-600"
                                    }`}
                                  >
                                    {task.priority}
                                  </span>
                                )}

                                {/* Task assignee */}
                                {task.assignee && (
                                  <span className="text-[10px] text-gray-400 truncate max-w-[60px]">
                                    {task.assignee}
                                  </span>
                                )}

                                {/* Task source badge */}
                                {task.source === "AI" && (
                                  <span className="text-[9px] text-indigo-500 bg-indigo-50 px-1 rounded">
                                    AI
                                  </span>
                                )}
                              </div>
                            ))}

                            {/* Add task inline */}
                            {addingTaskWs === ws.id ? (
                              <div className="flex items-center gap-2 pl-10 pr-3 py-1.5 border-t border-gray-100">
                                <input
                                  autoFocus
                                  value={newTaskTitle}
                                  onChange={(e) => setNewTaskTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") addTask(ws.id);
                                    if (e.key === "Escape") {
                                      setAddingTaskWs(null);
                                      setNewTaskTitle("");
                                    }
                                  }}
                                  placeholder="Task title..."
                                  className="flex-1 text-[11px] border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
                                  disabled={savingTask}
                                />
                                <button
                                  onClick={() => addTask(ws.id)}
                                  disabled={savingTask || !newTaskTitle.trim()}
                                  className="text-[10px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded disabled:opacity-50"
                                >
                                  {savingTask ? "..." : "Add"}
                                </button>
                                <button
                                  onClick={() => {
                                    setAddingTaskWs(null);
                                    setNewTaskTitle("");
                                  }}
                                  className="text-[10px] text-gray-400 hover:text-gray-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="pl-10 pr-3 py-1.5 border-t border-gray-100">
                                <button
                                  onClick={() => {
                                    setAddingTaskWs(ws.id);
                                    setNewTaskTitle("");
                                  }}
                                  className="text-[10px] text-gray-400 hover:text-indigo-600 font-medium"
                                >
                                  + Add Task
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Detail Panel */}
          {selectedWsId && !selectedTaskId && (
            <div className="w-1/2">
              <WorkstreamDetailPanel
                dealId={deal.id}
                workstreamId={selectedWsId}
                onClose={() => setSelectedWsId(null)}
                onWorkstreamUpdate={() => mutate(`/api/deals/${deal.id}`)}
                teamMembers={teamMembers}
              />
            </div>
          )}
          {selectedTaskId && (() => {
            let foundTask: any = null;
            let wsName = "";
            for (const ws of sortedWorkstreams) {
              const t = (ws.tasks || []).find((t: any) => t.id === selectedTaskId);
              if (t) { foundTask = t; wsName = ws.name; break; }
            }
            if (!foundTask) return null;
            return (
              <div className="w-1/2">
                <TaskDetailPanel
                  dealId={deal.id}
                  task={foundTask}
                  workstreamName={wsName}
                  onClose={() => setSelectedTaskId(null)}
                  onTaskUpdate={() => mutate(`/api/deals/${deal.id}`)}
                />
              </div>
            );
          })()}
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
        onClose={() => {
          setPromptModalWs(null);
          setPromptEditing(false);
        }}
        title={`Analysis Prompt -- ${promptModalWs?.name || ""}`}
        size="lg"
        footer={
          promptEditing ? (
            <>
              <Button
                variant="secondary"
                onClick={() => setPromptEditing(false)}
              >
                Cancel
              </Button>
              <Button loading={savingInstructions} onClick={savePromptInstructions}>
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setPromptModalWs(null);
                  setPromptEditing(false);
                }}
              >
                Close
              </Button>
              <Button onClick={() => setPromptEditing(true)}>Edit Prompt</Button>
            </>
          )
        }
      >
        {loadingTemplate ? (
          <div className="py-8 text-center text-sm text-gray-400">
            Loading prompt template...
          </div>
        ) : promptEditing ? (
          <div className="space-y-3">
            <div className="text-xs text-gray-500">
              Edit the analysis instructions the AI uses for this workstream. Changes
              only affect this deal -- the template in Settings stays the same.
            </div>
            <Textarea
              value={promptText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setPromptText(e.target.value)
              }
              rows={10}
              placeholder="Analysis instructions..."
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                {promptModalWs?.customInstructions
                  ? "Custom Prompt (deal-specific)"
                  : "Default Prompt (from Settings)"}
              </span>
            </div>
            {promptText ? (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {promptText}
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
                <p className="text-sm text-gray-400">
                  No prompt configured for this workstream.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Click &ldquo;Edit Prompt&rdquo; to add one, or configure it in
                  Settings.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ── Task Detail Panel ── */

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TaskDetailPanel({
  dealId,
  task,
  workstreamName,
  onClose,
  onTaskUpdate,
}: {
  dealId: string;
  task: any;
  workstreamName: string;
  onClose: () => void;
  onTaskUpdate: () => void;
}) {
  const toast = useToast();
  const [localStatus, setLocalStatus] = useState(task.status);

  // Comments state
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const taskId = task.id;

  // Reset when a different task is selected
  useEffect(() => {
    setLocalStatus(task.status);
    setCommentText("");
    setReplyingTo(null);
    setReplyText("");
  }, [task.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch comments
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/deals/${dealId}/tasks/${taskId}/comments`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { if (!cancelled) setComments(data); })
      .catch(() => { if (!cancelled) setComments([]); });
    return () => { cancelled = true; };
  }, [dealId, taskId]);

  // Fetch attachments
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/deals/${dealId}/tasks/${taskId}/attachments`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { if (!cancelled) setAttachments(data); })
      .catch(() => { if (!cancelled) setAttachments([]); });
    return () => { cancelled = true; };
  }, [dealId, taskId]);

  async function updateStatus(newStatus: string) {
    setLocalStatus(newStatus);
    try {
      const res = await fetch(`/api/deals/${dealId}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      onTaskUpdate();
    } catch {
      toast.error("Failed to update status");
      setLocalStatus(task.status);
    }
  }

  async function postComment() {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (!res.ok) throw new Error("Failed to post");
      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setCommentText("");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  }

  async function postReply(parentId: string) {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText.trim(), parentId }),
      });
      if (!res.ok) throw new Error("Failed to post");
      const reply = await res.json();
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: [...(c.replies || []), reply] }
            : c
        )
      );
      setReplyingTo(null);
      setReplyText("");
    } catch {
      toast.error("Failed to post reply");
    } finally {
      setSubmittingReply(false);
    }
  }

  async function uploadAttachment(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/deals/${dealId}/tasks/${taskId}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const att = await res.json();
      setAttachments((prev) => [att, ...prev]);
      toast.success("File uploaded");
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  }

  async function deleteAttachment(attachmentId: string) {
    try {
      await fetch(
        `/api/deals/${dealId}/tasks/${taskId}/attachments?attachmentId=${attachmentId}`,
        { method: "DELETE" }
      );
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch {
      toast.error("Failed to delete attachment");
    }
  }

  return (
    <div className="border-l border-gray-200 bg-white overflow-y-auto max-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-900 flex-1 mr-2">
            {task.title}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            &times;
          </button>
        </div>
        <div className="text-[10px] text-gray-400">{workstreamName}</div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status + Priority + Assignee */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</div>
            <select
              value={localStatus}
              onChange={(e) => updateStatus(e.target.value)}
              className={`text-xs border border-gray-200 rounded px-2 py-1.5 w-full font-medium cursor-pointer ${
                localStatus === "DONE"
                  ? "text-emerald-700 bg-emerald-50"
                  : localStatus === "IN_PROGRESS"
                    ? "text-blue-700 bg-blue-50"
                    : "text-gray-600 bg-gray-50"
              }`}
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Priority</div>
            <div className={`text-xs px-2 py-1.5 rounded font-medium ${
              task.priority === "HIGH" ? "bg-red-50 text-red-600" :
              task.priority === "LOW" ? "bg-green-50 text-green-600" :
              "bg-yellow-50 text-yellow-600"
            }`}>
              {task.priority || "MEDIUM"}
            </div>
          </div>
          {task.assignee && (
            <div className="col-span-2">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Assignee</div>
              <div className="text-xs text-gray-700">{task.assignee}</div>
            </div>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</div>
            <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-100">
              {task.description}
            </p>
          </div>
        )}

        {/* Comments Section */}
        <div>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Comments ({comments.length})
          </div>

          {comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((comment: any) => (
                <div key={comment.id} className="space-y-2">
                  {/* Root comment */}
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      {comment.author?.initials || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-800">
                          {comment.author?.name || "Unknown"}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {formatDate(comment.createdAt)}{" "}
                          {new Date(comment.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                      <button
                        onClick={() => {
                          setReplyingTo(replyingTo === comment.id ? null : comment.id);
                          setReplyText("");
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium mt-1"
                      >
                        Reply
                      </button>
                    </div>
                  </div>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-8 space-y-2">
                      {comment.replies.map((reply: any) => (
                        <div key={reply.id} className="flex gap-2">
                          <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">
                            {reply.author?.initials || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium text-gray-700">
                                {reply.author?.name || "Unknown"}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {formatDate(reply.createdAt)}{" "}
                                {new Date(reply.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-600 mt-0.5 whitespace-pre-wrap">
                              {reply.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply form */}
                  {replyingTo === comment.id && (
                    <div className="ml-8 space-y-1.5">
                      <Textarea
                        value={replyText}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyText(e.target.value)}
                        placeholder="Write a reply..."
                        rows={2}
                        className="text-xs"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => postReply(comment.id)}
                          disabled={!replyText.trim()}
                          loading={submittingReply}
                        >
                          Reply
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No comments yet.</p>
          )}

          {/* New comment form */}
          <div className="mt-3 space-y-1.5">
            <Textarea
              value={commentText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              className="text-xs"
            />
            <Button
              size="sm"
              onClick={postComment}
              disabled={!commentText.trim()}
              loading={submittingComment}
            >
              Post Comment
            </Button>
          </div>
        </div>

        {/* Attachments Section */}
        <div>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Attachments ({attachments.length})
          </div>

          {attachments.length > 0 ? (
            <div className="space-y-1.5">
              {attachments.map((att: any) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between bg-gray-50 rounded border border-gray-200 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <div className="min-w-0">
                      <a
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 truncate block"
                      >
                        {att.fileName}
                      </a>
                      {att.fileSize && (
                        <span className="text-[10px] text-gray-400">
                          {formatFileSize(att.fileSize)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteAttachment(att.id)}
                    className="text-gray-400 hover:text-red-500 text-xs ml-2"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No attachments.</p>
          )}

          {/* Upload button */}
          <div className="mt-2">
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAttachment(file);
                  e.target.value = "";
                }}
              />
              <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {uploading ? "Uploading..." : "Upload File"}
              </span>
            </label>
          </div>
        </div>

        {/* Metadata */}
        <div className="border-t border-gray-100 pt-3 space-y-1">
          {task.source && (
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              <span>Source:</span>
              <span className={`px-1.5 py-0.5 rounded ${
                task.source?.startsWith("AI") ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-500"
              }`}>
                {task.source?.startsWith("AI_QUESTION_") ? "AI Question" : task.source || "Manual"}
              </span>
            </div>
          )}
          {task.createdAt && (
            <div className="text-[10px] text-gray-400">
              Created {formatDate(task.createdAt)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
