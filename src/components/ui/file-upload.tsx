"use client";

import { useRef, useState } from "react";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  accept?: string;
  maxSizeMB?: number;
  selectedFile?: File | null;
}

export function FileUpload({ onFileSelect, accept = ".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.pptx", maxSizeMB = 25, selectedFile }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);
    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large. Max ${maxSizeMB}MB.`);
      return;
    }
    onFileSelect(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (selectedFile) {
    return (
      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm">📄</span>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{selectedFile.name}</div>
            <div className="text-xs text-gray-500">{formatSize(selectedFile.size)}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { onFileSelect(null); if (inputRef.current) inputRef.current.value = ""; }}
          className="text-gray-400 hover:text-red-500 text-sm ml-2"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        }`}
      >
        <div className="text-sm text-gray-500">
          Drag & drop a file here, or <span className="text-indigo-600 font-medium">browse</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">Max {maxSizeMB}MB</div>
        <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
      </div>
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
    </div>
  );
}
