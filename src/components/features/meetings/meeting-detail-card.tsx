"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { ChevronDown, ChevronUp, Link2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MeetingDecisions {
  actionItemsText?: string | null;
  actionItemsList?: string[];
  keywords?: string[];
}

export interface MeetingForCard {
  id: string;
  title: string;
  meetingDate: string;
  meetingType?: string | null;
  source: string;
  hasTranscript: boolean;
  actionItems: number;
  decisions?: MeetingDecisions | string[] | null;
  summary?: string | null;
  asset?: { id: string; name: string } | null;
  deal?: { id: string; name: string } | null;
  entity?: { id: string; name: string } | null;
  dealId?: string | null;
  entityId?: string | null;
  assetId?: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  "IC Meeting": "red",
  "DD Session": "orange",
  "GP Review": "purple",
  "Portfolio Review": "blue",
  "Board Meeting": "indigo",
};

const SOURCE_COLORS: Record<string, string> = {
  FIREFLIES: "purple",
  MANUAL: "gray",
  ZOOM: "blue",
  TEAMS: "indigo",
};

const SOURCE_LABELS: Record<string, string> = {
  FIREFLIES: "Fireflies",
  MANUAL: "Manual",
  ZOOM: "Zoom",
  TEAMS: "Teams",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getActionItemsList(decisions: MeetingForCard["decisions"]): string[] {
  if (!decisions) return [];
  // New structure from Plan 04 sync
  if (typeof decisions === "object" && !Array.isArray(decisions)) {
    const d = decisions as MeetingDecisions;
    if (Array.isArray(d.actionItemsList) && d.actionItemsList.length > 0) {
      return d.actionItemsList;
    }
  }
  return [];
}

function getKeywords(decisions: MeetingForCard["decisions"]): string[] {
  if (!decisions) return [];
  if (typeof decisions === "object" && !Array.isArray(decisions)) {
    const d = decisions as MeetingDecisions;
    if (Array.isArray(d.keywords) && d.keywords.length > 0) {
      return d.keywords;
    }
  }
  return [];
}

function getLegacyDecisions(decisions: MeetingForCard["decisions"]): string[] {
  if (!decisions) return [];
  // Legacy: plain string array
  if (Array.isArray(decisions)) return decisions;
  return [];
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  meeting: MeetingForCard;
  onUpdated?: () => void;
}

export function MeetingDetailCard({ meeting, onUpdated }: Props) {
  const toast = useToast();
  const [actionItemsOpen, setActionItemsOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [creatingTask, setCreatingTask] = useState<number | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linking, setLinking] = useState(false);

  const actionItemsList = getActionItemsList(meeting.decisions);
  const keywords = getKeywords(meeting.decisions);
  const legacyDecisions = getLegacyDecisions(meeting.decisions);

  // ── Action item task creation ──────────────────────────────────────────────

  async function handleActionItemCheck(index: number, itemText: string) {
    if (checkedItems.has(index)) return; // Already converted
    setCreatingTask(index);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: itemText,
          status: "TODO",
          contextType: "MEETING",
          contextId: meeting.id,
          entityId: meeting.entityId ?? null,
          dealId: meeting.dealId ?? null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        const msg = typeof data.error === "string" ? data.error : "Failed to create task";
        toast.error(msg);
        return;
      }
      setCheckedItems((prev) => new Set([...prev, index]));
      toast.success("Task created");
    } catch {
      toast.error("Failed to create task");
    } finally {
      setCreatingTask(null);
    }
  }

  // ── Context linking ────────────────────────────────────────────────────────

  async function handleLink(field: "dealId" | "entityId" | "assetId", value: string) {
    setLinking(true);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const data = await res.json();
        const msg = typeof data.error === "string" ? data.error : "Failed to link meeting";
        toast.error(msg);
        return;
      }
      toast.success("Meeting linked");
      setLinkOpen(false);
      onUpdated?.();
    } catch {
      toast.error("Failed to link meeting");
    } finally {
      setLinking(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-sm transition-shadow">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {meeting.title}
            </h3>
            {meeting.meetingType && (
              <Badge color={TYPE_COLORS[meeting.meetingType] || "gray"}>
                {meeting.meetingType}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
            <span>{formatDate(meeting.meetingDate)}</span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Badge color={SOURCE_COLORS[meeting.source] || "gray"}>
              {SOURCE_LABELS[meeting.source] || meeting.source}
            </Badge>
            {meeting.hasTranscript && (
              <>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span className="text-purple-600 dark:text-purple-400">Transcript</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary section */}
      <div className="mt-3">
        {meeting.summary ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5">
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              {meeting.summary}
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">No summary available</p>
        )}
      </div>

      {/* Action items section */}
      {(actionItemsList.length > 0 || meeting.actionItems > 0) && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setActionItemsOpen((o) => !o)}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            {actionItemsOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            Action Items ({actionItemsList.length > 0 ? actionItemsList.length : meeting.actionItems})
          </button>

          {actionItemsOpen && (
            <div className="mt-2 space-y-1.5">
              {actionItemsList.length > 0 ? (
                actionItemsList.map((item, i) => {
                  const isChecked = checkedItems.has(i);
                  const isCreating = creatingTask === i;
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isChecked || isCreating}
                        onChange={() => handleActionItemCheck(i, item)}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 cursor-pointer disabled:cursor-not-allowed"
                        title={isChecked ? "Task already created" : "Click to create task"}
                      />
                      <span
                        className={`text-xs leading-relaxed ${
                          isChecked
                            ? "line-through text-gray-400 dark:text-gray-500"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {item}
                        {isCreating && (
                          <span className="ml-1 text-gray-400 text-[10px]">Creating...</span>
                        )}
                        {isChecked && (
                          <span className="ml-1 text-emerald-600 text-[10px]">Task created</span>
                        )}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 pl-5">
                  {meeting.actionItems} action item{meeting.actionItems !== 1 ? "s" : ""} recorded
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Keywords / Decisions section */}
      {(keywords.length > 0 || legacyDecisions.length > 0) && (
        <div className="mt-3">
          {keywords.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">
                Keywords:
              </span>
              {keywords.map((kw, i) => (
                <span
                  key={i}
                  className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
          {legacyDecisions.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mt-1">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                Decisions:
              </span>
              {legacyDecisions.map((d, i) => (
                <span
                  key={i}
                  className="text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800"
                >
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Context links section */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {meeting.asset && (
          <Link
            href={`/assets/${meeting.asset.id}`}
            className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded"
          >
            Asset: {meeting.asset.name}
          </Link>
        )}
        {meeting.deal && (
          <Link
            href={`/deals/${meeting.deal.id}`}
            className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded"
          >
            Deal: {meeting.deal.name}
          </Link>
        )}
        {meeting.entity && (
          <Link
            href={`/entities/${meeting.entity.id}`}
            className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded"
          >
            Vehicle: {meeting.entity.name}
          </Link>
        )}

        {/* Link to... button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setLinkOpen((o) => !o)}
            className="inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded transition-colors"
          >
            <Link2 className="h-3 w-3" />
            Link to...
          </button>

          {linkOpen && (
            <LinkContextDropdown
              meetingId={meeting.id}
              onLink={handleLink}
              onClose={() => setLinkOpen(false)}
              linking={linking}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Link Context Dropdown ─────────────────────────────────────────────────────

interface LinkContextDropdownProps {
  meetingId: string;
  onLink: (field: "dealId" | "entityId" | "assetId", value: string) => void;
  onClose: () => void;
  linking: boolean;
}

function LinkContextDropdown({ onLink, onClose, linking }: LinkContextDropdownProps) {
  const [mode, setMode] = useState<"deal" | "entity" | "asset">("deal");
  const [inputValue, setInputValue] = useState("");

  function handleSubmit() {
    if (!inputValue.trim()) return;
    const fieldMap = { deal: "dealId", entity: "entityId", asset: "assetId" } as const;
    onLink(fieldMap[mode], inputValue.trim());
  }

  return (
    <div className="absolute top-6 left-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 w-64">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Link meeting to</span>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
        >
          x
        </button>
      </div>

      {/* Mode selector */}
      <div className="flex gap-1 mb-2">
        {(["deal", "entity", "asset"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setInputValue(""); }}
            className={`flex-1 text-[10px] py-1 rounded border transition-colors capitalize ${
              mode === m
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
            }`}
          >
            {m === "entity" ? "Vehicle" : m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* ID input */}
      <input
        type="text"
        placeholder={`Enter ${mode === "entity" ? "vehicle" : mode} ID`}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 mb-2"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={linking || !inputValue.trim()}
        className="w-full text-xs bg-indigo-600 text-white rounded px-2 py-1.5 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {linking ? "Linking..." : "Link"}
      </button>
    </div>
  );
}
