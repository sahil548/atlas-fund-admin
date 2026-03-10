"use client";

import { useState } from "react";
import { mutate } from "swr";
import useSWR from "swr";
import { FileUpload } from "@/components/ui/file-upload";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";

interface Document {
  id: string;
  name: string;
  fileUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
  uploadDate: string;
  category: string;
}

interface EntityDocument {
  id: string;
  name: string;
  category: string;
  uploadDate: string;
  entity?: { id: string; name: string } | null;
}

interface CapitalCallDocumentPanelProps {
  capitalCallId: string;
  entityId: string;
  documents: Document[];
  onUploadComplete: () => void;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CapitalCallDocumentPanel({
  capitalCallId,
  entityId,
  documents,
  onUploadComplete,
}: CapitalCallDocumentPanelProps) {
  const toast = useToast();
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [linking, setLinking] = useState(false);

  // Fetch entity documents for the "Link Existing" section
  const { data: entityDocsResponse } = useSWR<{
    data: EntityDocument[];
    total: number;
  }>(entityId ? `/api/documents?entityId=${entityId}` : null, fetcher);

  const entityDocs: EntityDocument[] = entityDocsResponse?.data ?? [];

  // Filter out documents already attached to this capital call
  const attachedIds = new Set(documents.map((d) => d.id));
  const linkableEntityDocs = entityDocs.filter((d) => !attachedIds.has(d.id));

  async function handleUpload() {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("name", uploadFile.name);
      formData.append("category", "OTHER");
      formData.append("capitalCallId", capitalCallId);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
        // Do NOT set Content-Type — browser sets multipart boundary automatically
      });

      const data = await res.json();
      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Failed to upload document";
        toast.error(msg);
        return;
      }

      toast.success("Document uploaded successfully");
      setUploadFile(null);
      mutate(`/api/capital-calls/${capitalCallId}`);
      onUploadComplete();
    } catch {
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  }

  async function handleLink() {
    if (!selectedDocId) return;
    setLinking(true);
    try {
      const res = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: selectedDocId, capitalCallId }),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Failed to link document";
        toast.error(msg);
        return;
      }

      toast.success("Document linked to capital call");
      setSelectedDocId("");
      mutate(`/api/capital-calls/${capitalCallId}`);
      onUploadComplete();
    } catch {
      toast.error("Failed to link document");
    } finally {
      setLinking(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Attached Documents */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Attached Documents
        </h4>
        {documents.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            No documents attached yet.
          </p>
        ) : (
          <div className="space-y-1.5">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">📄</span>
                  <div className="min-w-0">
                    {doc.fileUrl ? (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline truncate block"
                      >
                        {doc.name}
                      </a>
                    ) : (
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate block">
                        {doc.name}
                      </span>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      {doc.fileSize && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {formatFileSize(doc.fileSize)}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {formatDate(doc.uploadDate)}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge color="gray">{doc.category}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload New */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Upload New Document
        </h4>
        <FileUpload
          onFileSelect={setUploadFile}
          selectedFile={uploadFile}
        />
        {uploadFile && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        )}
      </div>

      {/* Link Existing Entity Documents */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Link Existing Entity Document
        </h4>
        {linkableEntityDocs.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            No additional entity documents to link.
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select a document…</option>
              {linkableEntityDocs.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} ({doc.category})
                </option>
              ))}
            </select>
            <button
              onClick={handleLink}
              disabled={!selectedDocId || linking}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {linking ? "Linking…" : "Link"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
