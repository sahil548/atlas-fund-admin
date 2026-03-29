"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useFirm } from "@/components/providers/firm-provider";
import { INTERACTION_TYPE_LABELS, INTERACTION_TYPE_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

interface ContactActivityTabProps {
  contactId: string;
  userId: string;
}

const ALL_FILTERS = ["All", "CALL", "EMAIL", "MEETING", "NOTE"] as const;
type FilterType = typeof ALL_FILTERS[number];

export function ContactActivityTab({ contactId, userId }: ContactActivityTabProps) {
  const toast = useToast();
  const { firmId } = useFirm();

  // Log form state
  const [logType, setLogType] = useState<"CALL" | "EMAIL" | "MEETING" | "NOTE">("NOTE");
  const [logNotes, setLogNotes] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [logDealId, setLogDealId] = useState("");
  const [logEntityId, setLogEntityId] = useState("");
  const [saving, setSaving] = useState(false);

  // Filter
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editType, setEditType] = useState<"CALL" | "EMAIL" | "MEETING" | "NOTE">("NOTE");
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const interactionsUrl = `/api/contacts/${contactId}/interactions?firmId=${firmId}`;
  const { data: interactions, isLoading } = useSWR(interactionsUrl, fetcher);

  // Fetch deals and entities for dropdowns
  const { data: deals } = useSWR(`/api/deals?firmId=${firmId}`, fetcher);
  const { data: entities } = useSWR(`/api/entities?firmId=${firmId}`, fetcher);

  const allInteractions = Array.isArray(interactions) ? interactions : [];

  const filtered = activeFilter === "All"
    ? allInteractions
    : allInteractions.filter((i: any) => i.type === activeFilter);

  // Group by day
  const grouped: Record<string, any[]> = {};
  for (const item of filtered) {
    const dateKey = new Date(item.date).toLocaleDateString("en-US", {
      timeZone: "UTC",
      weekday: undefined,
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(item);
  }
  const groupKeys = Object.keys(grouped);

  async function logInteraction() {
    if (!logNotes.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/contacts/${contactId}/interactions?firmId=${firmId}&authorId=${userId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: logType,
            notes: logNotes.trim(),
            date: logDate,
            dealId: logDealId || undefined,
            entityId: logEntityId || undefined,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Failed to log interaction";
        toast.error(msg);
      } else {
        toast.success("Interaction logged");
        mutate(interactionsUrl);
        mutate(`/api/contacts/${contactId}?firmId=${firmId}`);
        setLogNotes("");
        setLogDate(new Date().toISOString().split("T")[0]);
        setLogDealId("");
        setLogEntityId("");
      }
    } catch {
      toast.error("Failed to log interaction");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(id: string) {
    if (!editNotes.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(
        `/api/contacts/${contactId}/interactions/${id}?firmId=${firmId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: editType, notes: editNotes.trim() }),
        }
      );
      if (!res.ok) {
        toast.error("Failed to update interaction");
      } else {
        toast.success("Interaction updated");
        mutate(interactionsUrl);
        setEditingId(null);
      }
    } catch {
      toast.error("Failed to update interaction");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await fetch(`/api/contacts/${contactId}/interactions/${deleteTarget.id}`, {
        method: "DELETE",
      });
      toast.success("Interaction deleted");
      mutate(interactionsUrl);
      mutate(`/api/contacts/${contactId}?firmId=${firmId}`);
    } catch {
      toast.error("Failed to delete interaction");
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Log interaction form */}
      <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Log Interaction</div>

        {/* Type selector */}
        <div className="flex gap-1">
          {(["CALL", "EMAIL", "MEETING", "NOTE"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setLogType(t)}
              className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors ${
                logType === t
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {INTERACTION_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Notes textarea */}
        <textarea
          value={logNotes}
          onChange={(e) => setLogNotes(e.target.value)}
          placeholder="Add notes about this interaction..."
          rows={3}
          className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-indigo-400 resize-none"
        />

        {/* Date + optional links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Date</label>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Link to Deal (optional)</label>
            <select
              value={logDealId}
              onChange={(e) => setLogDealId(e.target.value)}
              className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-400"
            >
              <option value="">None</option>
              {(Array.isArray(deals) ? deals : deals?.data || []).map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Link to Entity (optional)</label>
            <select
              value={logEntityId}
              onChange={(e) => setLogEntityId(e.target.value)}
              className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-400"
            >
              <option value="">None</option>
              {(Array.isArray(entities) ? entities : entities?.data || []).map((e: any) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        </div>

        <Button size="sm" onClick={logInteraction} loading={saving} disabled={!logNotes.trim()}>
          Log {INTERACTION_TYPE_LABELS[logType]}
        </Button>
      </div>

      {/* Type filter */}
      <div className="flex gap-1 flex-wrap">
        {ALL_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors ${
              activeFilter === f
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {f === "All" ? "All" : INTERACTION_TYPE_LABELS[f]}
            {f === "All" ? ` (${allInteractions.length})` : ` (${allInteractions.filter((i: any) => i.type === f).length})`}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-400">Loading interactions...</div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          {activeFilter === "All"
            ? "No interactions yet. Log your first interaction above."
            : `No ${INTERACTION_TYPE_LABELS[activeFilter as keyof typeof INTERACTION_TYPE_LABELS]} interactions yet.`}
        </div>
      ) : (
        <div className="space-y-6">
          {groupKeys.map((dateKey) => (
            <div key={dateKey}>
              <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">
                {dateKey}
              </div>
              <div className="space-y-0">
                {grouped[dateKey].map((item: any, idx: number) => (
                  <div key={item.id} className="flex gap-3 py-3">
                    {/* Timeline dot + line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          item.type === "CALL" ? "bg-amber-400" :
                          item.type === "EMAIL" ? "bg-blue-400" :
                          item.type === "MEETING" ? "bg-green-400" :
                          "bg-gray-400"
                        }`}
                      />
                      {idx < grouped[dateKey].length - 1 && (
                        <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-2">
                      {editingId === item.id ? (
                        <div className="space-y-2">
                          <div className="flex gap-1 mb-1">
                            {(["CALL", "EMAIL", "MEETING", "NOTE"] as const).map((t) => (
                              <button
                                key={t}
                                onClick={() => setEditType(t)}
                                className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                                  editType === t ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                }`}
                              >
                                {INTERACTION_TYPE_LABELS[t]}
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            rows={2}
                            className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-400 resize-none"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" loading={editSaving} onClick={() => saveEdit(item.id)} disabled={!editNotes.trim()}>Save</Button>
                            <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <div className="flex items-center gap-2">
                              <Badge color={INTERACTION_TYPE_COLORS[item.type] || "gray"}>
                                {INTERACTION_TYPE_LABELS[item.type] || item.type}
                              </Badge>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                {item.author?.name || "Unknown"} · {formatDate(item.date)}
                              </span>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setEditingId(item.id); setEditNotes(item.notes); setEditType(item.type); }}
                                className="text-[10px] text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeleteTarget({ id: item.id })}
                                className="text-[10px] text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{item.notes}</p>
                          <div className="flex gap-2 mt-1">
                            {item.deal && (
                              <a href={`/deals/${item.deal.id}`} className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline">
                                Deal: {item.deal.name}
                              </a>
                            )}
                            {item.entity && (
                              <a href={`/entities/${item.entity.id}`} className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline">
                                Entity: {item.entity.name}
                              </a>
                            )}
                          </div>
                          {/* Edit/Delete buttons — always visible small */}
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => { setEditingId(item.id); setEditNotes(item.notes); setEditType(item.type); }}
                              className="text-[10px] text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ id: item.id })}
                              className="text-[10px] text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Interaction"
        message="Are you sure you want to delete this interaction? This cannot be undone."
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
