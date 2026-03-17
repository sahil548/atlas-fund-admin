"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { FileUpload } from "@/components/ui/file-upload";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  entity: any;
  entityId: string;
}

const EXPECTED_DOCS = [
  { category: "LEGAL", label: "Operating Agreement" },
  { category: "LEGAL", label: "Subscription Agreement" },
  { category: "LEGAL", label: "Private Placement Memorandum (PPM)" },
  { category: "GOVERNANCE", label: "Side Letters" },
];

const DOCUMENT_CATEGORIES = [
  { value: "LEGAL", label: "Legal" },
  { value: "FINANCIAL", label: "Financial" },
  { value: "TAX", label: "Tax" },
  { value: "GOVERNANCE", label: "Governance" },
  { value: "COMPLIANCE", label: "Compliance" },
  { value: "INVESTOR", label: "Investor" },
  { value: "OTHER", label: "Other" },
];

export function EntityDocumentsSection({ entity, entityId }: Props) {
  const toast = useToast();
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("LEGAL");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const documents: any[] = entity.documents || [];

  function hasDocWithCategory(category: string) {
    return documents.some((d: any) => d.category === category);
  }

  async function handleUpload() {
    if (!uploadFile) {
      toast.error("Please select a file");
      return;
    }
    if (!uploadName.trim()) {
      toast.error("Please enter a document name");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("name", uploadName);
      formData.append("category", uploadCategory);

      const res = await fetch(`/api/entities/${entityId}/documents`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        const msg = typeof data.error === "string" ? data.error : "Failed to upload";
        toast.error(msg);
        return;
      }
      toast.success("Document uploaded");
      setUploadName("");
      setUploadFile(null);
      mutate(`/api/entities/${entityId}`);
    } catch {
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Expected Documents Checklist */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold mb-3">Expected Documents</h3>
        <div className="space-y-2">
          {EXPECTED_DOCS.map((doc) => {
            const exists = hasDocWithCategory(doc.category);
            return (
              <div key={doc.label} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${exists ? "bg-emerald-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
                    {exists ? "\u2713" : ""}
                  </span>
                  <span className="text-sm">{doc.label}</span>
                </div>
                <Badge color={exists ? "green" : "gray"}>
                  {exists ? "Uploaded" : "Missing"}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold">Documents ({documents.length})</h3>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-700">
          {documents.map((d: any) => (
            <div key={d.id} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800">
              <div className="flex items-center gap-2">
                <Badge color="indigo">PDF</Badge>
                <span className="text-sm font-medium">{d.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge color="gray">{d.category}</Badge>
                <span className="text-xs text-gray-400">{formatDate(d.uploadDate)}</span>
              </div>
            </div>
          ))}
          {documents.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-400">No documents.</div>
          )}
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold mb-3">Upload Document</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Document Name</label>
            <input
              className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
              value={uploadName}
              onChange={(ev) => setUploadName(ev.target.value)}
              placeholder="e.g. Operating Agreement"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Category</label>
            <select
              className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
              value={uploadCategory}
              onChange={(ev) => setUploadCategory(ev.target.value)}
            >
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <FileUpload onFileSelect={setUploadFile} selectedFile={uploadFile} />
          <Button size="sm" loading={uploading} onClick={handleUpload} disabled={!uploadFile || !uploadName.trim()}>
            Upload
          </Button>
        </div>
      </div>
    </div>
  );
}
