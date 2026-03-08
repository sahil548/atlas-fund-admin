"use client";

import { useCallback, useState } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useFirm } from "@/components/providers/firm-provider";
import { DocumentPreviewModal } from "@/components/ui/document-preview-modal";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { ExportButton } from "@/components/ui/export-button";
import { DocuSignSend } from "@/components/features/documents/docusign-send";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface Doc {
  id: string;
  name: string;
  category: string;
  uploadDate: string;
  fileSize: number | null;
  fileUrl: string | null;
  mimeType: string | null;
  asset?: { id: string; name: string } | null;
  entity?: { id: string; name: string } | null;
  deal?: { id: string; name: string } | null;
}

interface EntityOption { id: string; name: string }
interface AssetOption { id: string; name: string }

const categoryColors: Record<string, string> = {
  FINANCIAL: "indigo", LEGAL: "orange", TAX: "green", REPORT: "blue",
  BOARD: "blue", GOVERNANCE: "purple", VALUATION: "green", STATEMENT: "indigo",
  NOTICE: "yellow", OTHER: "gray",
};

const CATEGORIES = ["BOARD", "FINANCIAL", "LEGAL", "GOVERNANCE", "VALUATION", "STATEMENT", "TAX", "REPORT", "NOTICE", "OTHER"] as const;

const DOC_FILTERS = [
  {
    key: "category",
    label: "Category",
    options: CATEGORIES.map((c) => ({ value: c, label: c.charAt(0) + c.slice(1).toLowerCase() })),
  },
];

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function DocumentsPage() {
  const { firmId } = useFirm();
  const { data: entities } = useSWR<EntityOption[]>(`/api/entities?firmId=${firmId}`, (url: string) =>
    fetch(url).then((r) => r.json()).then((r) => r.data ?? r),
  );
  const { data: assets } = useSWR<AssetOption[]>(`/api/assets?firmId=${firmId}`, (url: string) =>
    fetch(url).then((r) => r.json()).then((r) => r.data ?? r),
  );

  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [allDocs, setAllDocs] = useState<Doc[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: "", category: "FINANCIAL", associateWith: "" });
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);

  const buildUrl = useCallback(
    (currentCursor?: string | null) => {
      const params = new URLSearchParams({ firmId, limit: "50" });
      if (search) params.set("search", search);
      for (const [k, v] of Object.entries(activeFilters)) {
        if (v) params.set(k, v);
      }
      if (currentCursor) params.set("cursor", currentCursor);
      return `/api/documents?${params.toString()}`;
    },
    [firmId, search, activeFilters],
  );

  const { isLoading } = useSWR(buildUrl(null), fetcher, {
    onSuccess: (result) => {
      setAllDocs(result.data ?? []);
      setCursor(result.nextCursor ?? null);
    },
    revalidateOnFocus: false,
  });

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setAllDocs([]);
    setCursor(null);
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
    setAllDocs([]);
    setCursor(null);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl(cursor));
      const result = await res.json();
      setAllDocs((prev) => [...prev, ...(result.data ?? [])]);
      setCursor(result.nextCursor ?? null);
    } catch (e) {
      console.error("Load more failed", e);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, buildUrl]);

  if (isLoading && allDocs.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading documents...
      </div>
    );
  }

  function association(d: Doc) {
    if (d.asset) return { label: d.asset.name, type: "Asset", href: `/assets/${d.asset.id}` };
    if (d.entity) return { label: d.entity.name, type: "Entity", href: `/entities/${d.entity.id}` };
    if (d.deal) return { label: d.deal.name, type: "Deal", href: `/deals/${d.deal.id}` };
    return { label: "General", type: "", href: "" };
  }

  async function handleUpload() {
    setUploading(true);
    try {
      const body: Record<string, string> = {
        name: uploadForm.name,
        category: uploadForm.category,
      };

      if (uploadForm.associateWith) {
        const [type, id] = uploadForm.associateWith.split(":");
        if (type === "entity") body.entityId = id;
        else if (type === "asset") body.assetId = id;
        else if (type === "deal") body.dealId = id;
      }

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        // Refresh the paginated list
        setAllDocs([]);
        setCursor(null);
        mutate(buildUrl(null));
        setShowUpload(false);
        setUploadForm({ name: "", category: "FINANCIAL", associateWith: "" });
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with filters + export + upload button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchFilterBar
          filters={DOC_FILTERS}
          onFilterChange={handleFilterChange}
          activeFilters={activeFilters}
        >
          <ExportButton
            data={allDocs.map((d) => {
              const assoc = association(d);
              return {
                id: d.id,
                name: d.name,
                category: d.category,
                associatedWith: assoc.label,
                associationType: assoc.type,
                uploadDate: new Date(d.uploadDate).toLocaleDateString(),
                fileSize: d.fileSize ? `${Math.round(d.fileSize / 1024)} KB` : "",
              };
            })}
            fileName="Documents_Export"
          />
        </SearchFilterBar>
        <Button onClick={() => setShowUpload(true)}>+ Upload Document</Button>
      </div>

      {/* Document list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold">All Documents ({allDocs.length})</h3>
        </div>
        {allDocs.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
            <p className="text-sm text-gray-500">No documents found</p>
            <p className="text-xs text-gray-400">
              {search || Object.values(activeFilters).some(Boolean)
                ? "Try different search terms or clear filters"
                : "Upload your first document to get started"}
            </p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {["Document", "Category", "Associated With", "Upload Date", "Size", "Actions"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allDocs.map((d) => {
                const assoc = association(d);
                return (
                  <tr key={d.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-medium">
                      {d.fileUrl ? (
                        <button type="button" onClick={() => setPreviewDoc(d)} className="text-indigo-600 hover:underline cursor-pointer text-left">
                          {d.name}
                        </button>
                      ) : (
                        d.name
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge color={categoryColors[d.category] || "gray"}>{d.category}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      {assoc.href ? (
                        <Link href={assoc.href} className="text-indigo-700 hover:underline">{assoc.label}</Link>
                      ) : (
                        <span className="text-indigo-700">{assoc.label}</span>
                      )}
                      {assoc.type && <span className="text-gray-400 ml-1">({assoc.type})</span>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">{new Date(d.uploadDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2.5 text-gray-500">{d.fileSize ? `${Math.round(d.fileSize / 1024)} KB` : "\u2014"}</td>
                    <td className="px-3 py-2.5">
                      {d.fileUrl && (
                        <DocuSignSend
                          documentId={d.id}
                          documentName={d.name}
                          dealId={d.deal?.id}
                          entityId={d.entity?.id}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <LoadMoreButton hasMore={!!cursor} loading={loadingMore} onLoadMore={handleLoadMore} />

      {/* Upload Modal */}
      <Modal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        title="Upload Document"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button onClick={handleUpload} loading={uploading} disabled={!uploadForm.name}>Upload</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Document Name" required>
            <Input
              placeholder="e.g. Q4 Financial Report"
              value={uploadForm.name}
              onChange={(e) => setUploadForm((f) => ({ ...f, name: e.target.value }))}
            />
          </FormField>
          <FormField label="Category" required>
            <select
              value={uploadForm.category}
              onChange={(e) => setUploadForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Associate With">
            <select
              value={uploadForm.associateWith}
              onChange={(e) => setUploadForm((f) => ({ ...f, associateWith: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            >
              <option value="">General</option>
              {entities && entities.length > 0 && (
                <optgroup label="Entities">
                  {entities.map((e: any) => (
                    <option key={e.id} value={`entity:${e.id}`}>{e.name}</option>
                  ))}
                </optgroup>
              )}
              {assets && assets.length > 0 && (
                <optgroup label="Assets">
                  {assets.map((a: any) => (
                    <option key={a.id} value={`asset:${a.id}`}>{a.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </FormField>
        </div>
      </Modal>

      <DocumentPreviewModal
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />
    </div>
  );
}
