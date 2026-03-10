"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { useInvestor } from "@/components/providers/investor-provider";
import { useToast } from "@/components/ui/toast";
import { ExportButton } from "@/components/ui/export-button";
import { cn } from "@/lib/utils";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const categoryColor: Record<string, string> = {
  FINANCIAL: "indigo",
  LEGAL: "orange",
  TAX: "green",
  REPORT: "blue",
  CORRESPONDENCE: "purple",
  BOARD: "purple",
  GOVERNANCE: "blue",
  VALUATION: "green",
  STATEMENT: "indigo",
  OTHER: "gray",
};

// Maps each tab to the DocumentCategory values it covers
const CATEGORY_MAP: Record<string, string[]> = {
  k1: ["TAX"],
  financial: ["FINANCIAL", "STATEMENT", "VALUATION"],
  legal: ["LEGAL", "GOVERNANCE"],
  reports: ["REPORT"],
  other: ["OTHER", "BOARD", "CORRESPONDENCE", "NOTICE"],
};

type TabKey = "all" | "k1" | "financial" | "legal" | "reports" | "other";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "k1", label: "K-1s" },
  { key: "financial", label: "Financial" },
  { key: "legal", label: "Legal" },
  { key: "reports", label: "Reports" },
  { key: "other", label: "Other" },
];

interface DocItem {
  id: string;
  name: string;
  category: string;
  uploadDate: string;
  fileSize: number | null;
  fileUrl: string;
  acknowledgedAt: string | null;
  acknowledgedByInvestorId: string | null;
  entity: { name: string } | null;
}

export default function LPDocumentsPage() {
  const { investorId } = useInvestor();
  const toast = useToast();
  const docsUrl = investorId ? `/api/lp/${investorId}/documents` : null;
  const { data, isLoading } = useSWR(docsUrl, fetcher);

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [k1Entity, setK1Entity] = useState<string>("all");
  const [k1Year, setK1Year] = useState<string>("all");
  const [selectedK1s, setSelectedK1s] = useState<Set<string>>(new Set());
  const [acknowledging, setAcknowledging] = useState(false);

  if (!investorId || isLoading || !data)
    return <div className="text-sm text-gray-400">Loading...</div>;

  const docs: DocItem[] = Array.isArray(data) ? data : [];

  // Filter docs by active tab
  const tabFilteredDocs =
    activeTab === "all"
      ? docs
      : docs.filter((doc) =>
          (CATEGORY_MAP[activeTab] ?? []).includes(doc.category)
        );

  // Apply K-1 sub-filters when k1 tab is active
  const filteredDocs =
    activeTab === "k1"
      ? tabFilteredDocs
          .filter((doc) =>
            k1Entity === "all" ? true : (doc.entity?.name ?? "General") === k1Entity
          )
          .filter((doc) => {
            if (k1Year === "all") return true;
            const year = new Date(doc.uploadDate).getFullYear().toString();
            return year === k1Year;
          })
      : tabFilteredDocs;

  // Count docs per tab for tab badges
  const tabCounts: Record<TabKey, number> = {
    all: docs.length,
    k1: docs.filter((d) => CATEGORY_MAP.k1.includes(d.category)).length,
    financial: docs.filter((d) => CATEGORY_MAP.financial.includes(d.category)).length,
    legal: docs.filter((d) => CATEGORY_MAP.legal.includes(d.category)).length,
    reports: docs.filter((d) => CATEGORY_MAP.reports.includes(d.category)).length,
    other: docs.filter((d) => CATEGORY_MAP.other.includes(d.category)).length,
  };

  // K-1 sub-filter options
  const k1Docs = docs.filter((d) => CATEGORY_MAP.k1.includes(d.category));
  const k1EntityOptions = Array.from(
    new Set(k1Docs.map((d) => d.entity?.name ?? "General"))
  ).sort();
  const k1YearOptions = Array.from(
    new Set(k1Docs.map((d) => new Date(d.uploadDate).getFullYear().toString()))
  ).sort((a, b) => parseInt(b) - parseInt(a)); // newest first

  // Unacknowledged K-1s in current filter
  const unackedK1s = filteredDocs.filter(
    (d) => activeTab === "k1" && !d.acknowledgedAt
  );

  // Toggle a single K-1 selection
  function toggleK1(id: string) {
    setSelectedK1s((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Select / deselect all unacknowledged K-1s
  function toggleSelectAll() {
    if (selectedK1s.size === unackedK1s.length && unackedK1s.length > 0) {
      setSelectedK1s(new Set());
    } else {
      setSelectedK1s(new Set(unackedK1s.map((d) => d.id)));
    }
  }

  // Submit batch acknowledgment
  async function handleAcknowledge() {
    if (selectedK1s.size === 0) return;
    setAcknowledging(true);
    try {
      const res = await fetch("/api/k1/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentIds: [...selectedK1s],
          investorId,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg =
          typeof body.error === "string" ? body.error : "Failed to acknowledge K-1s";
        toast.error(msg);
        return;
      }

      toast.success(`${selectedK1s.size} K-1(s) acknowledged`);
      setSelectedK1s(new Set());
      mutate(docsUrl);
    } catch {
      toast.error("Failed to acknowledge K-1s");
    } finally {
      setAcknowledging(false);
    }
  }

  const allUnackedSelected =
    unackedK1s.length > 0 && selectedK1s.size === unackedK1s.length;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Document Center
        </h3>
        <ExportButton
          data={filteredDocs.map((doc) => ({
            id: doc.id,
            name: doc.name,
            category: doc.category,
            entity: doc.entity?.name ?? "General",
            uploadDate: new Date(doc.uploadDate).toLocaleDateString(),
            fileSize: doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB` : "",
          }))}
          fileName="LP_Documents_Export"
        />
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Reports, statements, and correspondence for your entities
      </div>

      {/* Horizontal tab bar */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {TABS.map(({ key, label }) => {
          const count = tabCounts[key];
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key);
                setK1Entity("all");
                setK1Year("all");
                setSelectedK1s(new Set());
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                isActive
                  ? "bg-indigo-600 dark:bg-indigo-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {label}
              {count > 0 && (
                <span
                  className={cn(
                    "ml-1.5 text-xs",
                    isActive ? "text-indigo-200" : "text-gray-400 dark:text-gray-500"
                  )}
                >
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* K-1 sub-filters — only visible when K-1s tab is active */}
      {activeTab === "k1" && (
        <div className="flex flex-wrap gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
              Entity
            </label>
            <select
              value={k1Entity}
              onChange={(e) => setK1Entity(e.target.value)}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Entities</option>
              {k1EntityOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
              Tax Year
            </label>
            <select
              value={k1Year}
              onChange={(e) => setK1Year(e.target.value)}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Years</option>
              {k1YearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Batch acknowledge section — only when K-1s tab is active and unacknowledged K-1s exist */}
      {activeTab === "k1" && unackedK1s.length > 0 && (
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
          {/* Header row with select-all and count */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="select-all-k1s"
                checked={allUnackedSelected}
                onChange={toggleSelectAll}
                className="rounded border-gray-300 accent-indigo-600"
              />
              <label
                htmlFor="select-all-k1s"
                className="text-xs font-semibold text-amber-800 dark:text-amber-200 cursor-pointer"
              >
                {unackedK1s.length} K-1{unackedK1s.length !== 1 ? "s" : ""} awaiting acknowledgment
              </label>
            </div>
            <button
              onClick={handleAcknowledge}
              disabled={selectedK1s.size === 0 || acknowledging}
              className="px-3 py-1.5 text-xs font-medium bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {acknowledging
                ? "Acknowledging..."
                : `Acknowledge Selected (${selectedK1s.size})`}
            </button>
          </div>

          {/* List of unacknowledged K-1s with checkboxes */}
          <div className="space-y-2">
            {unackedK1s.map((doc) => (
              <label
                key={doc.id}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={selectedK1s.has(doc.id)}
                  onChange={() => toggleK1(doc.id)}
                  className="rounded border-gray-300 accent-indigo-600 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-400">
                    {doc.name}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">
                    {doc.entity?.name ?? "General"} &middot;{" "}
                    {new Date(doc.uploadDate).toLocaleDateString()}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredDocs.length === 0 && (
        <div className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">
          {activeTab === "all"
            ? "No documents available."
            : `No ${TABS.find((t) => t.key === activeTab)?.label ?? ""} documents available.`}
        </div>
      )}

      {/* Document list */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {filteredDocs.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                PDF
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {doc.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {doc.entity?.name || "General"} &middot;{" "}
                  {new Date(doc.uploadDate).toLocaleDateString()}
                  {doc.fileSize
                    ? ` · ${(doc.fileSize / 1024).toFixed(0)} KB`
                    : ""}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Badge color={categoryColor[doc.category] || "gray"}>
                {doc.category?.toLowerCase() || "other"}
              </Badge>
              {/* Acknowledged badge */}
              {doc.acknowledgedAt && (
                <Badge color="green">
                  Acknowledged {new Date(doc.acknowledgedAt).toLocaleDateString()}
                </Badge>
              )}
              {doc.fileUrl && (
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
                >
                  &#8595; Download
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
