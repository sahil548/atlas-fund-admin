"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";

interface DocumentSummary {
  documentType?: string;
  summary?: string;
  keyPoints?: string[];
  parties?: string[];
  financialFigures?: string[];
  keyDates?: string[];
  risks?: string[];
}

interface DocumentExtractionPanelProps {
  document: {
    id: string;
    name: string;
    category: string;
    extractionStatus: string;
    extractedFields: DocumentSummary | null;
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-1.5">
      {children}
    </h4>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
          <span className="text-gray-400 mt-0.5 flex-shrink-0">&bull;</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function DocumentExtractionPanel({
  document,
  firmId,
  open,
  onClose,
  onUpdate,
}: DocumentExtractionPanelProps) {
  const toast = useToast();
  const [retrying, setRetrying] = useState(false);

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

  const fields = document.extractedFields as DocumentSummary | null;

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
        className={`fixed right-0 top-0 h-full max-w-lg w-full bg-white shadow-xl z-50 flex flex-col
          transform transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-200">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
              {document.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500">
                {document.category?.replace(/_/g, " ")}
              </span>
              {fields?.documentType && fields.documentType !== document.category && (
                <>
                  <span className="text-gray-300">&middot;</span>
                  <span className="text-xs text-indigo-600 font-medium">
                    {fields.documentType}
                  </span>
                </>
              )}
            </div>
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
                AI summarization in progress...
              </p>
              <p className="text-xs text-gray-400">
                Refresh the page in a moment to see the summary.
              </p>
            </div>
          )}

          {/* FAILED state */}
          {document.extractionStatus === "FAILED" && (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-red-600 font-medium">
                Summarization failed
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
                {retrying ? "Retrying..." : "Retry summarization"}
              </button>
            </div>
          )}

          {/* COMPLETE state — show summary */}
          {document.extractionStatus === "COMPLETE" && fields && (
            <div className="space-y-1">
              {/* Summary */}
              {fields.summary && (
                <>
                  <SectionLabel>Summary</SectionLabel>
                  <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg border border-gray-100 p-3">
                    {fields.summary}
                  </div>
                </>
              )}

              {/* Key Points */}
              {fields.keyPoints && fields.keyPoints.length > 0 && (
                <>
                  <SectionLabel>Key Points</SectionLabel>
                  <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
                    <BulletList items={fields.keyPoints} />
                  </div>
                </>
              )}

              {/* Financial Figures */}
              {fields.financialFigures && fields.financialFigures.length > 0 && (
                <>
                  <SectionLabel>Financial Figures</SectionLabel>
                  <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
                    <BulletList items={fields.financialFigures} />
                  </div>
                </>
              )}

              {/* Parties */}
              {fields.parties && fields.parties.length > 0 && (
                <>
                  <SectionLabel>Parties</SectionLabel>
                  <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    {fields.parties.map((p, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center text-xs bg-white border border-gray-200 rounded-full px-2.5 py-0.5 text-gray-700"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {/* Key Dates */}
              {fields.keyDates && fields.keyDates.length > 0 && (
                <>
                  <SectionLabel>Key Dates</SectionLabel>
                  <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
                    <BulletList items={fields.keyDates} />
                  </div>
                </>
              )}

              {/* Risks */}
              {fields.risks && fields.risks.length > 0 && (
                <>
                  <SectionLabel>Risks &amp; Concerns</SectionLabel>
                  <div className="bg-amber-50 rounded-lg border border-amber-100 p-3">
                    <BulletList items={fields.risks} />
                  </div>
                </>
              )}

              {/* Empty summary fallback */}
              {!fields.summary && (!fields.keyPoints || fields.keyPoints.length === 0) && (
                <div className="py-8 text-center text-sm text-gray-400">
                  AI processing completed but no summary was generated.
                </div>
              )}
            </div>
          )}

          {/* COMPLETE but no fields at all */}
          {document.extractionStatus === "COMPLETE" &&
            !document.extractedFields && (
              <div className="py-8 text-center text-sm text-gray-400">
                No summary was generated for this document.
              </div>
            )}

          {/* NONE state */}
          {document.extractionStatus === "NONE" && (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-gray-400">
                This document has not been processed by AI yet.
              </p>
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
              >
                {retrying ? "Processing..." : "Run AI summarization"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
