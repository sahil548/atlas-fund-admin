"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ExtractedField {
  aiValue: string | null;
  label: string;
  confidence?: string;
}

interface DocumentExtractionPanelProps {
  document: {
    id: string;
    name: string;
    category: string;
    extractionStatus: string;
    extractedFields: Record<string, ExtractedField> | null;
    appliedFields: Record<string, any> | null;
    extractionError: string | null;
    dealId?: string | null;
    assetId?: string | null;
    entityId?: string | null;
  };
  firmId: string;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void; // triggers SWR revalidation
}

function ConfidenceDot({ confidence }: { confidence?: string }) {
  if (!confidence) return null;
  const lower = confidence.toLowerCase();
  const color =
    lower === "high"
      ? "bg-emerald-400"
      : lower === "medium"
      ? "bg-amber-400"
      : "bg-red-400";
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${color} flex-shrink-0`}
      title={`Confidence: ${confidence}`}
    />
  );
}

function parentType(doc: DocumentExtractionPanelProps["document"]): string {
  if (doc.dealId) return "deal";
  if (doc.assetId) return "asset";
  if (doc.entityId) return "entity";
  return "record";
}

export function DocumentExtractionPanel({
  document,
  firmId,
  open,
  onClose,
  onUpdate,
}: DocumentExtractionPanelProps) {
  const toast = useToast();

  // Track which fields are checked
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  // Track edited values
  const [values, setValues] = useState<Record<string, string>>({});
  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Applying state
  const [applying, setApplying] = useState(false);
  // Retrying state
  const [retrying, setRetrying] = useState(false);

  // Initialize from document.extractedFields when the panel opens
  useEffect(() => {
    if (!open) return;
    const fields = document.extractedFields;
    if (!fields) return;

    const initialChecked: Record<string, boolean> = {};
    const initialValues: Record<string, string> = {};

    for (const [key, field] of Object.entries(fields)) {
      // Default checked if there's a non-null AI value
      initialChecked[key] = field.aiValue != null && field.aiValue !== "";
      initialValues[key] = field.aiValue ?? "";
    }

    setChecked(initialChecked);
    setValues(initialValues);
  }, [open, document.id, document.extractedFields]);

  const selectedCount = Object.values(checked).filter(Boolean).length;

  async function handleApplyFields() {
    const fields = document.extractedFields;
    if (!fields) return;

    const selectedFields = Object.entries(fields)
      .filter(([key]) => checked[key])
      .map(([key, field]) => ({
        key,
        value: values[key] ?? field.aiValue ?? "",
        aiValue: field.aiValue ?? "",
      }));

    if (selectedFields.length === 0) {
      toast.error("No fields selected to apply");
      setConfirmOpen(false);
      return;
    }

    setApplying(true);
    try {
      const res = await fetch(`/api/documents/${document.id}/apply-fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: selectedFields }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          typeof data.error === "string" ? data.error : "Failed to apply fields";
        toast.error(msg);
        return;
      }

      toast.success(
        `Applied ${selectedFields.length} field(s) to the linked ${parentType(document)}`
      );
      setConfirmOpen(false);
      onUpdate();
    } catch {
      toast.error("Failed to apply fields");
    } finally {
      setApplying(false);
    }
  }

  async function handleRetry() {
    setRetrying(true);
    try {
      const res = await fetch(
        `/api/documents/${document.id}/extract?firmId=${firmId}`,
        { method: "POST" }
      );
      if (res.ok) {
        toast.success("Re-extraction started");
        onUpdate();
      } else {
        const data = await res.json().catch(() => ({}));
        const msg =
          typeof data.error === "string" ? data.error : "Retry failed";
        toast.error(msg);
      }
    } catch {
      toast.error("Retry failed");
    } finally {
      setRetrying(false);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Side Panel */}
      <div
        className={`fixed right-0 top-0 h-full max-w-md w-full bg-white shadow-xl z-50 flex flex-col
          transform transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
              {document.name}
            </h3>
            <span className="text-xs text-gray-500">
              {document.category?.replace(/_/g, " ")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close panel"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* PROCESSING / PENDING state */}
          {(document.extractionStatus === "PROCESSING" ||
            document.extractionStatus === "PENDING") && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">
                AI extraction in progress...
              </p>
              <p className="text-xs text-gray-400">
                Refresh the page in a moment to see extracted fields.
              </p>
            </div>
          )}

          {/* FAILED state */}
          {document.extractionStatus === "FAILED" && (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-red-600 font-medium">
                Extraction failed
              </p>
              {document.extractionError && (
                <p className="text-xs text-gray-500 break-words">
                  {document.extractionError}
                </p>
              )}
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
              >
                {retrying ? "Retrying..." : "Retry extraction"}
              </button>
            </div>
          )}

          {/* COMPLETE state */}
          {document.extractionStatus === "COMPLETE" &&
            document.extractedFields && (
              <>
                <p className="text-xs text-gray-500 mb-3">
                  Review and edit the AI-extracted values below, then select the
                  fields you want to apply to the linked{" "}
                  {parentType(document)}.
                </p>

                {/* Field list */}
                <div className="space-y-2">
                  {Object.entries(document.extractedFields).map(
                    ([key, field]) => (
                      <div
                        key={key}
                        className="flex items-start gap-2 p-2 rounded-lg border border-gray-100 bg-gray-50"
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={!!checked[key]}
                          onChange={(e) =>
                            setChecked((prev) => ({
                              ...prev,
                              [key]: e.target.checked,
                            }))
                          }
                          className="mt-1 flex-shrink-0"
                        />

                        {/* Field content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-xs font-medium text-gray-700 truncate">
                              {field.label}
                            </span>
                            <ConfidenceDot confidence={field.confidence} />
                          </div>
                          <input
                            type="text"
                            value={values[key] ?? ""}
                            onChange={(e) =>
                              setValues((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                            placeholder="No value extracted"
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </>
            )}

          {/* COMPLETE but no fields */}
          {document.extractionStatus === "COMPLETE" &&
            !document.extractedFields && (
              <div className="py-8 text-center text-sm text-gray-400">
                No fields were extracted from this document.
              </div>
            )}

          {/* NONE state */}
          {document.extractionStatus === "NONE" && (
            <div className="py-8 text-center text-sm text-gray-400">
              AI extraction is not configured for this document type.
            </div>
          )}
        </div>

        {/* Footer */}
        {document.extractionStatus === "COMPLETE" &&
          document.extractedFields && (
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {selectedCount} field{selectedCount !== 1 ? "s" : ""} selected
                </span>
                <button
                  onClick={() => setConfirmOpen(true)}
                  disabled={selectedCount === 0}
                  className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Apply Selected
                </button>
              </div>
            </div>
          )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleApplyFields}
        title="Apply Extracted Fields"
        message={`Apply ${selectedCount} field(s) to the linked ${parentType(document)}? This will update the record with the reviewed values.`}
        confirmLabel="Apply Fields"
        variant="primary"
        loading={applying}
      />
    </>
  );
}
