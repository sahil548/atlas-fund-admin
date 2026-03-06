"use client";

import { useState, useRef } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useFirm } from "@/components/providers/firm-provider";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const entityTypeLabels: Record<string, string> = {
  MAIN_FUND: "Main Fund",
  SIDECAR: "Sidecar",
  SPV: "SPV",
  CO_INVEST_VEHICLE: "Co-Invest Vehicle",
  GP_ENTITY: "GP Entity",
  HOLDING_COMPANY: "Holding Company",
};

const vehicleStructureLabels: Record<string, string> = {
  LLC: "LLC",
  LP: "LP",
  CORP: "Corp",
  TRUST: "Trust",
};

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "gray",
  IN_PROGRESS: "yellow",
  COMPLETE: "green",
};

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete",
};

interface DealClosingTabProps {
  deal: any;
  onCloseDeal: () => void;
}

export function DealClosingTab({ deal, onCloseDeal }: DealClosingTabProps) {
  const toast = useToast();
  const { firmId } = useFirm();
  const { data: checklistItems, isLoading } = useSWR(
    `/api/deals/${deal.id}/closing`,
    fetcher,
  );
  const { data: users } = useSWR(`/api/users?firmId=${firmId}`, fetcher);
  const [initializing, setInitializing] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Custom item state
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  // File upload refs
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const items: any[] = checklistItems || [];
  const completedCount = items.filter((i: any) => i.status === "COMPLETE").length;
  const totalCount = items.length;
  const allComplete = totalCount > 0 && completedCount === totalCount;

  async function handleInitialize() {
    setInitializing(true);
    try {
      await fetch(`/api/deals/${deal.id}/closing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "INITIALIZE" }),
      });
      toast.success("Closing checklist initialized");
      mutate(`/api/deals/${deal.id}/closing`);
    } catch {
      toast.error("Failed to initialize checklist");
    } finally {
      setInitializing(false);
    }
  }

  async function handleUpdateItem(itemId: string, updates: Record<string, any>) {
    try {
      await fetch(`/api/deals/${deal.id}/closing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, ...updates }),
      });
      mutate(`/api/deals/${deal.id}/closing`);
    } catch {
      toast.error("Failed to update item");
    }
  }

  async function handleAddCustomItem() {
    if (!newItemTitle.trim()) return;
    setAddingItem(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}/closing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_CUSTOM", title: newItemTitle.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Failed to add item";
        toast.error(msg);
        return;
      }
      toast.success("Custom item added");
      setNewItemTitle("");
      setShowAddItem(false);
      mutate(`/api/deals/${deal.id}/closing`);
    } catch {
      toast.error("Failed to add custom item");
    } finally {
      setAddingItem(false);
    }
  }

  async function handleFileUpload(itemId: string, file: File) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("id", itemId);
      formData.append("action", "ATTACH_FILE");

      const res = await fetch(`/api/deals/${deal.id}/closing`, {
        method: "PATCH",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Failed to attach file";
        toast.error(msg);
        return;
      }
      toast.success("File attached");
      mutate(`/api/deals/${deal.id}/closing`);
    } catch {
      toast.error("Failed to upload file");
    }
  }

  async function handleRemoveFile(itemId: string) {
    try {
      await fetch(`/api/deals/${deal.id}/closing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, action: "REMOVE_FILE" }),
      });
      toast.success("File removed");
      mutate(`/api/deals/${deal.id}/closing`);
    } catch {
      toast.error("Failed to remove file");
    }
  }

  return (
    <div className="space-y-4">
      {/* Entity Info or Informational Note */}
      {!deal.targetEntity ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-blue-900">No investment vehicle pre-linked</div>
            <p className="text-sm text-blue-700 mt-1">
              You&apos;ll assign entities and allocation percentages when you close the deal.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Investment Vehicle</div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-900">{deal.targetEntity.name}</span>
            <Badge color="purple">{entityTypeLabels[deal.targetEntity.entityType] || deal.targetEntity.entityType}</Badge>
            {deal.targetEntity.vehicleStructure && (
              <Badge color="blue">{vehicleStructureLabels[deal.targetEntity.vehicleStructure] || deal.targetEntity.vehicleStructure}</Badge>
            )}
          </div>
        </div>
      )}

      {/* Initialize or Checklist */}
      {isLoading ? (
        <div className="text-xs text-gray-400 py-4 text-center">Loading checklist...</div>
      ) : totalCount === 0 ? (
        <div className="py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-sm font-semibold text-gray-700 mb-1">No closing checklist yet</div>
          <p className="text-xs text-gray-500 mb-4">Initialize the closing checklist to track deal execution steps.</p>
          <Button loading={initializing} onClick={handleInitialize}>
            Initialize Closing Checklist
          </Button>
        </div>
      ) : (
        <>
          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-700">Closing Progress</span>
              <span className="text-xs text-gray-500">{completedCount} / {totalCount} complete</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${allComplete ? "bg-emerald-500" : "bg-indigo-500"}`}
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-1">
            {items.map((item: any) => (
              <div key={item.id} className="border border-gray-100 rounded-lg">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                >
                  {/* Status dot */}
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    item.status === "COMPLETE" ? "bg-emerald-500" :
                    item.status === "IN_PROGRESS" ? "bg-amber-400" : "bg-gray-300"
                  }`} />

                  {/* Title */}
                  <span className={`flex-1 text-sm ${item.status === "COMPLETE" ? "line-through text-gray-400" : "text-gray-700"}`}>
                    {item.title}
                    {item.isCustom && (
                      <span className="ml-1.5 text-[9px] bg-purple-50 text-purple-600 px-1 py-0.5 rounded font-medium">Custom</span>
                    )}
                  </span>

                  {/* File attachment indicator */}
                  {item.fileUrl && (
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      File
                    </span>
                  )}

                  {/* Assignee badge */}
                  {item.assignedTo && (
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                      {item.assignedTo.initials || item.assignedTo.name}
                    </span>
                  )}

                  {/* Due date */}
                  {item.dueDate && (
                    <span className="text-[10px] text-gray-500">
                      {new Date(item.dueDate).toLocaleDateString()}
                    </span>
                  )}

                  {/* Status badge */}
                  <Badge color={STATUS_COLORS[item.status] || "gray"}>
                    {STATUS_LABELS[item.status] || item.status}
                  </Badge>

                  <span className="text-gray-400 text-xs">{expandedItem === item.id ? "\u25B2" : "\u25BC"}</span>
                </div>

                {/* Expanded Section */}
                {expandedItem === item.id && (
                  <div className="px-4 pb-3 border-t border-gray-50 pt-3 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Status</label>
                        <select
                          value={item.status}
                          onChange={(e) => handleUpdateItem(item.id, { status: e.target.value })}
                          className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="NOT_STARTED">Not Started</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETE">Complete</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Assignee</label>
                        <select
                          value={item.assigneeId || ""}
                          onChange={(e) => handleUpdateItem(item.id, { assigneeId: e.target.value || null })}
                          className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">Unassigned</option>
                          {(users || []).map((u: any) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Due Date</label>
                        <input
                          type="date"
                          value={item.dueDate ? new Date(item.dueDate).toISOString().split("T")[0] : ""}
                          onChange={(e) => handleUpdateItem(item.id, { dueDate: e.target.value || null })}
                          className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Notes</label>
                      <textarea
                        value={item.notes || ""}
                        onChange={(e) => handleUpdateItem(item.id, { notes: e.target.value })}
                        placeholder="Add notes..."
                        rows={2}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                      />
                    </div>

                    {/* File Attachment Section */}
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Attachment</label>
                      {item.fileUrl ? (
                        <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <a
                            href={item.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-700 hover:underline font-medium flex-1 truncate"
                          >
                            {item.fileName || "Attached file"}
                          </a>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveFile(item.id); }}
                            className="text-xs text-red-500 hover:text-red-700 font-medium flex-shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            ref={(el) => { fileInputRefs.current[item.id] = el; }}
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(item.id, file);
                                e.target.value = "";
                              }
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRefs.current[item.id]?.click();
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Attach file
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Custom Item */}
          <div className="pt-1">
            {showAddItem ? (
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                <input
                  type="text"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="Custom checklist item title..."
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newItemTitle.trim()) handleAddCustomItem();
                    if (e.key === "Escape") { setShowAddItem(false); setNewItemTitle(""); }
                  }}
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleAddCustomItem}
                  disabled={!newItemTitle.trim() || addingItem}
                  loading={addingItem}
                >
                  Add
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setShowAddItem(false); setNewItemTitle(""); }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddItem(true)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </button>
            )}
          </div>

          {/* Close Deal Button */}
          {deal.stage === "CLOSING" && (
            <div className="pt-2 flex items-center justify-end gap-3">
              {!allComplete && (
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  {totalCount - completedCount} item{totalCount - completedCount !== 1 ? "s" : ""} incomplete
                </span>
              )}
              <Button
                onClick={onCloseDeal}
                className={!allComplete ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
              >
                {allComplete ? "Close Deal" : "Close Deal Anyway"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
