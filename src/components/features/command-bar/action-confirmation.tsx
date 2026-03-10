"use client";

import { useState } from "react";
import { Check, X, Loader2, HelpCircle, FileText, Clock } from "lucide-react";
import type { ActionPlan } from "@/lib/command-bar-types";

// Read-only identifier fields — shown but not editable
const READ_ONLY_KEYS = new Set([
  "dealId",
  "documentId",
  "entityId",
  "assetId",
  "taskId",
  "contextId",
  "assigneeId",
]);

// Human-readable labels for common payload keys
const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  priority: "Priority",
  contextType: "Context Type",
  contextId: "Context",
  dealId: "Deal ID",
  documentId: "Document ID",
  documentName: "Document",
  entityId: "Entity ID",
  assetId: "Asset ID",
  taskId: "Task ID",
  assigneeId: "Assignee ID",
  name: "Name",
  assetClass: "Asset Class",
  description: "Description",
  sector: "Sector",
  targetSize: "Target Size",
  targetReturn: "Target Return",
  targetCheckSize: "Check Size",
  gpName: "GP Name",
  counterparty: "Counterparty",
  investmentRationale: "Investment Rationale",
  capitalInstrument: "Capital Instrument",
  participationStructure: "Participation Structure",
  dealMetadata: "Deal Metadata (JSON)",
  note: "Note",
  type: "Analysis Type",
};

// Action types that are long-running
const LONG_RUNNING_TYPES = new Set(["TRIGGER_DD_ANALYSIS", "TRIGGER_IC_MEMO"]);

interface ActionConfirmationProps {
  plan: ActionPlan;
  onConfirm: (editedPayload: Record<string, unknown>) => void;
  onCancel: () => void;
  isExecuting: boolean;
}

export function ActionConfirmation({
  plan,
  onConfirm,
  onCancel,
  isExecuting,
}: ActionConfirmationProps) {
  // Local state for editable payload fields
  const [editedPayload, setEditedPayload] = useState<Record<string, unknown>>(
    { ...plan.payload },
  );
  // For AMBIGUOUS type: clarification input
  const [clarification, setClarification] = useState("");

  const isAmbiguous = plan.actionType === "AMBIGUOUS";
  const isError = plan.actionType === "ERROR";
  const isLongRunning = LONG_RUNNING_TYPES.has(plan.actionType);
  const isExtractCIM = plan.actionType === "EXTRACT_CIM_TERMS";

  const handleConfirm = () => {
    onConfirm(editedPayload);
  };

  const handleClarificationSubmit = () => {
    // Re-submit the clarification as a new action
    onConfirm({ clarificationText: clarification });
  };

  // ── AMBIGUOUS state: show clarification input ─────────────────────────────

  if (isAmbiguous) {
    return (
      <div className="px-3 py-3 border-t border-amber-100 bg-amber-50">
        <div className="flex items-start gap-2 mb-2">
          <HelpCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">{plan.description}</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={clarification}
            onChange={(e) => setClarification(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && clarification.trim()) {
                handleClarificationSubmit();
              }
            }}
            placeholder="Type your clarification..."
            className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-amber-200 bg-white outline-none focus:border-amber-400 text-gray-700"
            autoFocus
          />
          <button
            onClick={handleClarificationSubmit}
            disabled={!clarification.trim() || isExecuting}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Send"}
          </button>
          <button
            onClick={onCancel}
            className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── ERROR state: show message, no confirm ─────────────────────────────────

  if (isError) {
    return (
      <div className="px-3 py-3 border-t border-red-100 bg-red-50">
        <div className="flex items-start gap-2 mb-2">
          <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{plan.description}</p>
        </div>
        <button
          onClick={onCancel}
          className="text-xs text-red-500 hover:text-red-700 transition-colors"
        >
          Dismiss
        </button>
      </div>
    );
  }

  // ── Normal confirmation UI ────────────────────────────────────────────────

  const payloadEntries = Object.entries(editedPayload);
  const editableEntries = payloadEntries.filter(([k]) => !READ_ONLY_KEYS.has(k));
  const readOnlyEntries = payloadEntries.filter(([k]) => READ_ONLY_KEYS.has(k));

  return (
    <div className="border-t border-indigo-100 bg-indigo-50/50">
      {/* Header: description */}
      <div className="px-3 pt-2.5 pb-1.5">
        {isExtractCIM && editedPayload.documentName ? (
          <div className="flex items-center gap-1.5 mb-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="text-[11px] font-medium text-indigo-700 truncate">
              {String(editedPayload.documentName)}
            </span>
          </div>
        ) : null}
        <p className="text-[11px] text-gray-600">{plan.description}</p>

        {/* Long-running warning */}
        {isLongRunning && (
          <div className="flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="text-[10px] text-amber-600">
              This may take up to 60 seconds
            </span>
          </div>
        )}
      </div>

      {/* Editable fields */}
      {editableEntries.length > 0 && (
        <div className="px-3 pb-2 space-y-1.5">
          {editableEntries.map(([key, value]) => {
            const label = FIELD_LABELS[key] || key;
            const strValue = value === null || value === undefined ? "" : String(value);

            // Priority select
            if (key === "priority") {
              return (
                <div key={key}>
                  <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                    {label}
                  </label>
                  <select
                    value={strValue}
                    onChange={(e) =>
                      setEditedPayload((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    disabled={isExecuting}
                    className="w-full text-xs px-2 py-1 rounded border border-gray-200 bg-white focus:border-indigo-300 outline-none text-gray-700 disabled:opacity-60"
                  >
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              );
            }

            // Boolean checkbox
            if (typeof value === "boolean") {
              return (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`field-${key}`}
                    checked={!!value}
                    onChange={(e) =>
                      setEditedPayload((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                    disabled={isExecuting}
                    className="rounded"
                  />
                  <label
                    htmlFor={`field-${key}`}
                    className="text-xs text-gray-600"
                  >
                    {label}
                  </label>
                </div>
              );
            }

            // Long text fields (description, rationale, note)
            if (
              key === "description" ||
              key === "note" ||
              key === "investmentRationale" ||
              key === "thesisNotes" ||
              (strValue && strValue.length > 80)
            ) {
              return (
                <div key={key}>
                  <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                    {label}
                  </label>
                  <textarea
                    value={strValue}
                    onChange={(e) =>
                      setEditedPayload((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    disabled={isExecuting}
                    rows={3}
                    className="w-full text-xs px-2 py-1 rounded border border-gray-200 bg-white focus:border-indigo-300 outline-none text-gray-700 resize-none disabled:opacity-60"
                  />
                </div>
              );
            }

            // Default: text input
            return (
              <div key={key}>
                <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                  {label}
                </label>
                <input
                  type="text"
                  value={strValue}
                  onChange={(e) =>
                    setEditedPayload((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  disabled={isExecuting}
                  className="w-full text-xs px-2 py-1 rounded border border-gray-200 bg-white focus:border-indigo-300 outline-none text-gray-700 disabled:opacity-60"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Read-only identifier fields (shown dimmed) */}
      {readOnlyEntries.length > 0 && (
        <div className="px-3 pb-1.5 space-y-0.5">
          {readOnlyEntries.map(([key, value]) => {
            if (!value) return null;
            const label = FIELD_LABELS[key] || key;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span className="text-[9px] font-medium text-gray-400 shrink-0">
                  {label}:
                </span>
                <span className="text-[9px] text-gray-400 truncate font-mono">
                  {String(value)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-indigo-100">
        <button
          onClick={handleConfirm}
          disabled={isExecuting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Check className="w-3 h-3" />
              Confirm
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={isExecuting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          <X className="w-3 h-3" />
          Cancel
        </button>
      </div>
    </div>
  );
}
