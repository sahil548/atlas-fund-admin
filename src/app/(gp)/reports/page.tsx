"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import useSWR, { mutate } from "swr";
import { useFirm } from "@/components/providers/firm-provider";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

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
  TAX: "green",
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
  const searchParams = useSearchParams();

  // ── Report generation state ──────────────────────────────
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [selectedReportType, setSelectedReportType] = useState("QUARTERLY");
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `Q${q} ${now.getFullYear()}`;
  });
  const [generating, setGenerating] = useState(false);

  // ── K-1 Distribution state ───────────────────────────────
  const [k1EntityId, setK1EntityId] = useState("");
  const [k1TaxYear, setK1TaxYear] = useState(new Date().getFullYear().toString());
  const [k1Files, setK1Files] = useState<File[]>([]);
  const [k1Uploading, setK1Uploading] = useState(false);
  const [k1FilterEntityId, setK1FilterEntityId] = useState("");
  const k1InputRef = useRef<HTMLInputElement>(null);

  // Pre-select entity from URL query param (e.g. /reports?entityId=xxx)
  useEffect(() => {
    const entityIdParam = searchParams.get("entityId");
    if (entityIdParam) {
      setSelectedEntityId(entityIdParam);
    }
  }, [searchParams]);

  // Load entities for selectors
  const { data: entitiesData, isLoading: entitiesLoading } = useSWR(
    firmId ? `/api/entities?firmId=${firmId}` : null,
    fetcher
  );

  // Load generated reports list
  const reportsKey = firmId ? `/api/reports?firmId=${firmId}` : null;
  const { data: reportsData, isLoading: reportsLoading } = useSWR(reportsKey, fetcher);

  // Load K-1 documents
  const k1Key = firmId
    ? `/api/k1?${k1FilterEntityId ? `entityId=${k1FilterEntityId}&` : ""}firmId=${firmId}`
    : null;
  const { data: k1Data, isLoading: k1Loading } = useSWR(k1Key, fetcher);

  const entities: any[] = entitiesData?.data ?? entitiesData ?? [];
  const reports: any[] = Array.isArray(reportsData) ? reportsData : [];
  const k1Docs: any[] = Array.isArray(k1Data) ? k1Data : [];

  // ── Report generation handler ────────────────────────────
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

  // ── K-1 upload handler ───────────────────────────────────
  const handleK1Upload = async () => {
    if (!k1EntityId) {
      toast.error("Please select an entity for K-1 distribution");
      return;
    }
    if (!k1TaxYear) {
      toast.error("Please enter a tax year");
      return;
    }
    if (k1Files.length === 0) {
      toast.error("Please select at least one K-1 PDF file");
      return;
    }

    setK1Uploading(true);
    try {
      const formData = new FormData();
      formData.append("entityId", k1EntityId);
      formData.append("taxYear", k1TaxYear);
      for (const file of k1Files) {
        formData.append("files", file);
      }

      const res = await fetch("/api/k1/upload", {
        method: "POST",
        body: formData,
        // Do NOT set Content-Type — browser sets multipart boundary automatically
      });

      const body = await res.json();

      if (!res.ok) {
        const msg = typeof body.error === "string" ? body.error : "Upload failed";
        toast.error(msg);
        return;
      }

      const { uploaded, matched, unmatched } = body;

      if (unmatched && unmatched.length > 0) {
        toast.success(
          `Uploaded ${uploaded} files, matched ${matched} investors. Unmatched: ${unmatched.join(", ")}`
        );
      } else {
        toast.success(`Uploaded ${uploaded} files, matched ${matched} investors`);
      }

      // Reset file selection
      setK1Files([]);
      if (k1InputRef.current) k1InputRef.current.value = "";

      // Refresh K-1 list
      mutate(k1Key);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload K-1 files");
    } finally {
      setK1Uploading(false);
    }
  };

  const handleK1FileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setK1Files(Array.from(files));
    }
  };

  const removeK1File = (index: number) => {
    setK1Files((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">Reports</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Generate PDF reports and distribute K-1 tax documents to investors
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
                  e.g. &quot;Q4 2025&quot; for quarterly, &quot;2025&quot; for annual
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
                          {formatDate(doc.createdAt)}
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

      {/* K-1 Distribution Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-gray-900">K-1 Distribution</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Bulk upload K-1 tax documents. System auto-matches to investors by filename pattern.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Form */}
          <div className="lg:col-span-1 space-y-4">
            {/* Entity selector */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Entity
              </label>
              {entitiesLoading ? (
                <div className="text-xs text-gray-400">Loading entities...</div>
              ) : (
                <select
                  value={k1EntityId}
                  onChange={(e) => setK1EntityId(e.target.value)}
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

            {/* Tax year input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tax Year
              </label>
              <input
                type="text"
                value={k1TaxYear}
                onChange={(e) => setK1TaxYear(e.target.value)}
                placeholder="e.g. 2025"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* File input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                K-1 PDF Files
              </label>
              <div
                className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                onClick={() => k1InputRef.current?.click()}
              >
                <div className="text-2xl mb-1">&#128196;</div>
                <div className="text-xs font-medium text-gray-700">
                  Click to select files
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                  Multiple PDFs supported
                </div>
                <input
                  ref={k1InputRef}
                  type="file"
                  multiple
                  accept=".pdf,application/pdf"
                  onChange={handleK1FileChange}
                  className="hidden"
                />
              </div>

              {/* Naming hint */}
              <p className="text-[10px] text-gray-400 mt-1.5">
                Name files as <code className="bg-gray-100 px-1 rounded">K1_InvestorName_Year.pdf</code> for automatic matching
              </p>

              {/* Selected files list */}
              {k1Files.length > 0 && (
                <div className="mt-2 space-y-1">
                  {k1Files.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded-lg"
                    >
                      <span className="text-xs text-gray-700 truncate flex-1 mr-2">
                        {file.name}
                      </span>
                      <button
                        onClick={() => removeK1File(i)}
                        className="text-[10px] text-red-400 hover:text-red-600 flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleK1Upload}
              disabled={k1Uploading || !k1EntityId || k1Files.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {k1Uploading ? (
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
                  Uploading...
                </>
              ) : (
                "Upload & Distribute"
              )}
            </button>
          </div>

          {/* K-1 Documents List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-gray-700">
                Previously Uploaded K-1s
              </h4>
              <select
                value={k1FilterEntityId}
                onChange={(e) => setK1FilterEntityId(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All entities</option>
                {entities.map((e: any) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            {k1Loading ? (
              <div className="text-sm text-gray-400">Loading K-1 documents...</div>
            ) : k1Docs.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-gray-200 rounded-lg">
                <div className="text-sm text-gray-500 font-medium">
                  No K-1s uploaded yet
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Upload K-1 PDFs to distribute them to investors automatically.
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
                {k1Docs.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between px-4 py-3 gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-[10px] text-green-700 font-medium flex-shrink-0">
                        K-1
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {doc.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {doc.entity?.name || "Unknown entity"}
                          {doc.investor?.name ? ` · ${doc.investor.name}` : " · Unmatched"}
                          {" · "}
                          {formatDate(doc.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {doc.investor ? (
                        <Badge color="green">Matched</Badge>
                      ) : (
                        <Badge color="yellow">Unmatched</Badge>
                      )}

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
        </div>
      </div>
    </div>
  );
}
