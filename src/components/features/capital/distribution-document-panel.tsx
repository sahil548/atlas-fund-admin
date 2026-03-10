"use client";

import { useState } from "react";
import useSWR from "swr";
import { FileUpload } from "@/components/ui/file-upload";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { FileText, Upload, Link } from "lucide-react";
import { formatDate } from "@/lib/utils";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

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
  fileUrl: string | null;
  fileSize: number | null;
  uploadDate: string;
  category: string;
}

interface Props {
  distributionId: string;
  entityId: string;
  documents: Document[];
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DistributionDocumentPanel({ distributionId, entityId, documents }: Props) {
  const toast = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [linking, setLinking] = useState(false);

  // Fetch entity documents for the "Link Existing" dropdown
  const { data: entityDocsResponse } = useSWR<{ data: EntityDocument[] }>(
    entityId ? `/api/documents?entityId=${entityId}` : null,
    fetcher
  );

  // SWR mutate key for revalidating the distribution (to refresh documents list)
  const { mutate: mutateDistribution } = useSWR(`/api/distributions/${distributionId}`, fetcher);

  const entityDocs = entityDocsResponse?.data ?? [];
  const attachedIds = new Set(documents.map((d) => d.id));
  const availableToLink = entityDocs.filter((d) => !attachedIds.has(d.id));

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", selectedFile.name);
      formData.append("category", "OTHER");
      formData.append("distributionEventId", distributionId);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "Failed to upload document";
        toast.error(msg);
        return;
      }
      toast.success("Document uploaded");
      setSelectedFile(null);
      mutateDistribution();
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
        body: JSON.stringify({ documentId: selectedDocId, distributionEventId: distributionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "Failed to link document";
        toast.error(msg);
        return;
      }
      toast.success("Document linked");
      setSelectedDocId("");
      mutateDistribution();
    } catch {
      toast.error("Failed to link document");
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink(docId: string) {
    try {
      const res = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId, distributionEventId: null }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "Failed to unlink document";
        toast.error(msg);
        return;
      }
      toast.success("Document unlinked");
      mutateDistribution();
    } catch {
      toast.error("Failed to unlink document");
    }
  }

  if (documents.length === 0 && !selectedFile) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="No documents attached"
          description="Upload a new document or link an existing entity document"
        />

        {/* Upload section */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            Upload New Document
          </div>
          <FileUpload onFileSelect={setSelectedFile} selectedFile={selectedFile} />
          {selectedFile && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {uploading ? "Uploading…" : "Upload Document"}
            </button>
          )}
        </div>

        {/* Link existing section */}
        {availableToLink.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
              <Link className="h-3.5 w-3.5" />
              Link Existing Document
            </div>
            <div className="flex gap-2">
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select a document…</option>
                {availableToLink.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <button
                onClick={handleLink}
                disabled={!selectedDocId || linking}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {linking ? "Linking…" : "Link"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Attached Documents */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  {doc.fileUrl ? (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline truncate block"
                    >
                      {doc.name}
                    </a>
                  ) : (
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{doc.name}</div>
                  )}
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {formatFileSize(doc.fileSize)}
                    {doc.fileSize ? " · " : ""}
                    {formatDate(doc.uploadDate)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleUnlink(doc.id)}
                className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex-shrink-0 ml-3"
              >
                Unlink
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload New */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
          <Upload className="h-3.5 w-3.5" />
          Upload New Document
        </div>
        <FileUpload onFileSelect={setSelectedFile} selectedFile={selectedFile} />
        {selectedFile && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? "Uploading…" : "Upload Document"}
          </button>
        )}
      </div>

      {/* Link Existing */}
      {availableToLink.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
            <Link className="h-3.5 w-3.5" />
            Link Existing Document
          </div>
          <div className="flex gap-2">
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select a document…</option>
              {availableToLink.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button
              onClick={handleLink}
              disabled={!selectedDocId || linking}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {linking ? "Linking…" : "Link"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
