"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useFirm } from "@/components/providers/firm-provider";
import { DocumentPreviewModal } from "@/components/ui/document-preview-modal";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

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

interface EntityOption {
  id: string;
  name: string;
}

interface AssetOption {
  id: string;
  name: string;
}

const categoryColors: Record<string, string> = {
  FINANCIAL: "indigo", LEGAL: "orange", TAX: "green", REPORT: "blue",
  BOARD: "blue", GOVERNANCE: "purple", VALUATION: "green", STATEMENT: "indigo",
  NOTICE: "yellow", OTHER: "gray",
};

const CATEGORIES = ["BOARD", "FINANCIAL", "LEGAL", "GOVERNANCE", "VALUATION", "STATEMENT", "TAX", "REPORT", "NOTICE", "OTHER"] as const;

export default function DocumentsPage() {
  const { firmId } = useFirm();
  const { data: docs, isLoading } = useSWR<Doc[]>(`/api/documents?firmId=${firmId}`, fetcher);
  const { data: entities } = useSWR<EntityOption[]>(`/api/entities?firmId=${firmId}`, fetcher);
  const { data: assets } = useSWR<AssetOption[]>(`/api/assets?firmId=${firmId}`, fetcher);

  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: "", category: "FINANCIAL", associateWith: "" });
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);

  if (isLoading || !docs) return <div className="text-sm text-gray-400">Loading...</div>;

  const categories = ["ALL", ...Array.from(new Set(docs.map((d) => d.category)))];

  const filtered = docs.filter((d) => {
    if (filter !== "ALL" && d.category !== filter) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFrom) {
      const docDate = new Date(d.uploadDate).toISOString().slice(0, 10);
      if (docDate < dateFrom) return false;
    }
    if (dateTo) {
      const docDate = new Date(d.uploadDate).toISOString().slice(0, 10);
      if (docDate > dateTo) return false;
    }
    return true;
  });

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
        mutate(`/api/documents?firmId=${firmId}`);
        setShowUpload(false);
        setUploadForm({ name: "", category: "FINANCIAL", associateWith: "" });
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with search + date filters + upload button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36"
          />
        </div>
        <Button onClick={() => setShowUpload(true)}>+ Upload Document</Button>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium border ${filter === c ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
          >
            {c === "ALL" ? "All" : c.charAt(0) + c.slice(1).toLowerCase()} {c === "ALL" ? `(${docs.length})` : `(${docs.filter((d) => d.category === c).length})`}
          </button>
        ))}
      </div>

      {/* Document list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold">All Documents ({filtered.length})</h3>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {["Document", "Category", "Associated With", "Upload Date", "Size"].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => {
              const assoc = association(d);
              return (
                <tr key={d.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-medium">
                    {d.fileUrl ? (
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(d)}
                        className="text-indigo-600 hover:underline cursor-pointer text-left"
                      >
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
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-400">No documents found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

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
                  {entities.map((e) => (
                    <option key={e.id} value={`entity:${e.id}`}>{e.name}</option>
                  ))}
                </optgroup>
              )}
              {assets && assets.length > 0 && (
                <optgroup label="Assets">
                  {assets.map((a) => (
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
