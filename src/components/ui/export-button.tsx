"use client";

import { downloadExcel } from "@/lib/excel-export";
import { useToast } from "@/components/ui/toast";

interface ExportButtonProps {
  data: Record<string, unknown>[];
  fileName: string;
  disabled?: boolean;
}

export function ExportButton({ data, fileName, disabled }: ExportButtonProps) {
  const toast = useToast();
  const isEmpty = !data || data.length === 0;
  const isDisabled = disabled || isEmpty;

  function handleExport() {
    if (isDisabled) return;
    try {
      downloadExcel(data, fileName);
      toast.success("Exported!");
    } catch {
      toast.error("Export failed");
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isDisabled}
      title={isEmpty ? "No data to export" : `Export ${fileName} to Excel`}
      className="flex items-center gap-1 text-xs border border-gray-200 rounded-lg bg-white px-2.5 py-1.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {/* Download icon */}
      <svg
        className="h-3.5 w-3.5"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Export
    </button>
  );
}
