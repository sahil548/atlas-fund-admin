"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useFirm } from "@/components/providers/firm-provider";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const REPORT_TYPES = [
  {
    value: "QUARTERLY",
    label: "Quarterly Report",
    description: "4-page report: financial summary, capital accounts, portfolio, transactions",
  },
  {
    value: "CAPITAL_ACCOUNT_STATEMENT",
    label: "Capital Account Statement",
    description: "Period summary + running ledger of contributions and distributions",
  },
  {
    value: "FUND_SUMMARY",
    label: "Fund Summary One-Pager",
    description: "One-page overview: fund size, NAV, IRR/TVPI/DPI, top holdings",
  },
];

const CATEGORY_COLOR: Record<string, string> = {
  REPORT: "blue",
  STATEMENT: "indigo",
};

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function reportTypeLabel(type: string): string {
  const found = REPORT_TYPES.find((rt) => rt.value === type);
  return found?.label ?? type;
}

export default function ReportsPage() {
  const { firmId } = useFirm();
  const toast = useToast();

  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [selectedReportType, setSelectedReportType] = useState("QUARTERLY");
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `Q${q} ${now.getFullYear()}`;
  });
  const [generating, setGenerating] = useState(false);

  // Load entities for selector
  const { data: entitiesData, isLoading: entitiesLoading } = useSWR(
    firmId ? `/api/entities?firmId=${firmId}` : null,
    fetcher
  );

  // Load generated reports list
  const reportsKey = firmId ? `/api/reports?firmId=${firmId}` : null;
  const { data: reportsData, isLoading: reportsLoading } = useSWR(reportsKey, fetcher);

  const entities: any[] = entitiesData?.data ?? entitiesData ?? [];
  const reports: any[] = Array.isArray(reportsData) ? reportsData : [];

  const handleGenerate = async () => {
    if (!selectedEntityId) {
      toast.error("Please select an entity first");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: selectedEntityId,
          reportType: selectedReportType,
          period: period || undefined,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        const msg =
          typeof body.error === "string" ? body.error : "Failed to generate report";
        toast.error(msg);
        return;
      }

      toast.success(`Report generated: ${body.fileName}`);
      mutate(reportsKey);

      // Open in new tab if URL available
      if (body.fileUrl) {
        window.open(body.fileUrl, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">Reports</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Generate and download professional PDF reports for fund entities
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generate Report Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Generate Report
            </h3>

            {/* Entity selector */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Entity
              </label>
              {entitiesLoading ? (
                <div className="text-xs text-gray-400">Loading entities...</div>
              ) : (
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select entity...</option>
                  {entities.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Report type selector */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <div className="space-y-2">
                {REPORT_TYPES.map((rt) => (
                  <label
                    key={rt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedReportType === rt.value
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportType"
                      value={rt.value}
                      checked={selectedReportType === rt.value}
                      onChange={(e) => setSelectedReportType(e.target.value)}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <div>
                      <div className="text-xs font-medium text-gray-900">
                        {rt.label}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {rt.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Period input */}
            {selectedReportType !== "FUND_SUMMARY" && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Period
                </label>
                <input
                  type="text"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="e.g. Q4 2025 or 2025"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  e.g. "Q4 2025" for quarterly, "2025" for annual
                </p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating || !selectedEntityId}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Generating PDF...
                </>
              ) : (
                <>
                  <span>&#9660;</span>
                  Generate Report
                </>
              )}
            </button>

            <p className="text-[10px] text-gray-400 mt-2 text-center">
              PDF opens automatically after generation.
              Report is saved to Documents.
            </p>
          </div>
        </div>

        {/* Generated Reports List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Generated Reports
            </h3>

            {reportsLoading ? (
              <div className="text-sm text-gray-400">Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-4xl mb-3">&#9632;</div>
                <div className="text-sm text-gray-500 font-medium">
                  No reports generated yet
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Use the panel on the left to generate your first PDF report.
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {reports.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between py-3 gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500 font-medium flex-shrink-0">
                        PDF
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {doc.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {doc.entity?.name || "Unknown entity"}
                          {" · "}
                          {new Date(doc.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {doc.fileSize ? ` · ${formatBytes(doc.fileSize)}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge color={CATEGORY_COLOR[doc.category] || "gray"}>
                        {doc.category?.toLowerCase() || "report"}
                      </Badge>

                      {doc.fileUrl && (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LP visibility note */}
          <div className="mt-3 px-1">
            <p className="text-[10px] text-gray-400">
              All generated reports are automatically added to the Document Center
              and are visible to LPs in their portal under the entity&apos;s documents.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
