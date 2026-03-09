"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { FileUpload } from "@/components/ui/file-upload";
import { DocumentPreviewModal } from "@/components/ui/document-preview-modal";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { DocumentStatusBadge } from "@/components/features/documents/document-status-badge";
import { DocumentExtractionPanel } from "@/components/features/documents/document-extraction-panel";

/* eslint-disable @typescript-eslint/no-explicit-any */

const DOC_CATEGORIES = [
  "FINANCIAL",
  "LEGAL",
  "BOARD",
  "GOVERNANCE",
  "VALUATION",
  "STATEMENT",
  "TAX",
  "REPORT",
  "NOTICE",
  "OTHER",
];

interface DealDocumentsTabProps {
  deal: any;
  firmId: string;
}

export function DealDocumentsTab({ deal, firmId }: DealDocumentsTabProps) {
  const documents = deal.documents || [];
  const toast = useToast();
  const [showUpload, setShowUpload] = useState(false);
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState("OTHER");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  function formatSize(bytes: number | null | undefined) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleRetryExtraction(docId: string) {
    const res = await fetch(`/api/documents/${docId}/extract?firmId=${firmId}`, {
      method: "POST",
    });
    if (res.ok) {
      toast.success("Re-extraction started");
      mutate(`/api/deals/${deal.id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      const msg = typeof data.error === "string" ? data.error : "Retry failed";
      toast.error(msg);
    }
  }

  async function handleUpload() {
    if (!docName.trim()) {
      setUploadError("Document name is required.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("name", docName.trim());
      formData.append("category", docCategory);
      if (selectedFile) {
        formData.append("file", selectedFile);
      }
      const res = await fetch(`/api/deals/${deal.id}/documents`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      // Reset form
      setDocName("");
      setDocCategory("OTHER");
      setSelectedFile(null);
      setShowUpload(false);
      // Refresh deal data
      mutate(`/api/deals/${deal.id}`);
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">
          Documents ({documents.length})
        </h3>
        <Button
          variant={showUpload ? "secondary" : "primary"}
          size="sm"
          onClick={() => setShowUpload(!showUpload)}
        >
          {showUpload ? "Cancel" : "Upload Document"}
        </Button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Document Name" required>
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Term Sheet v2"
              />
            </FormField>
            <FormField label="Category">
              <Select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
                options={DOC_CATEGORIES.map((c) => ({
                  value: c,
                  label: c.replace(/_/g, " "),
                }))}
              />
            </FormField>
          </div>
          <FormField label="File">
            <FileUpload
              onFileSelect={setSelectedFile}
              selectedFile={selectedFile}
            />
          </FormField>
          {uploadError && (
            <div className="text-xs text-red-500">{uploadError}</div>
          )}
          <div className="flex justify-end">
            <Button onClick={handleUpload} loading={uploading}>
              Upload
            </Button>
          </div>
        </div>
      )}

      <DocumentPreviewModal
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />

      {documents.length > 0 ? (
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {["Document", "Category", "AI Status", "Size", "Upload Date"].map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2 font-semibold text-gray-600"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(documents as any[]).map((d: any) => (
              <tr
                key={d.id}
                className={`border-t border-gray-50 hover:bg-gray-50 ${
                  d.extractionStatus === "COMPLETE" ? "cursor-pointer" : ""
                }`}
                onClick={() =>
                  d.extractionStatus === "COMPLETE" && setSelectedDoc(d)
                }
              >
                <td className="px-3 py-2.5 font-medium">
                  {d.fileUrl ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewDoc(d);
                      }}
                      className="text-indigo-600 hover:underline cursor-pointer text-left"
                    >
                      {d.name}
                    </button>
                  ) : (
                    d.name
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <Badge color="indigo">
                    {d.category?.replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <DocumentStatusBadge
                    status={d.extractionStatus || "NONE"}
                    error={d.extractionError}
                    onRetry={() => handleRetryExtraction(d.id)}
                  />
                </td>
                <td className="px-3 py-2.5 text-gray-500">
                  {formatSize(d.fileSize)}
                </td>
                <td className="px-3 py-2.5 text-gray-500">
                  {formatDate(d.uploadDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="py-8 text-center text-sm text-gray-400">
          No documents yet.
        </div>
      )}

      {/* Extraction Panel */}
      {selectedDoc && (
        <DocumentExtractionPanel
          document={selectedDoc}
          firmId={firmId}
          open={!!selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onUpdate={() => {
            mutate(`/api/deals/${deal.id}`);
            setSelectedDoc(null);
          }}
        />
      )}
    </div>
  );
}
