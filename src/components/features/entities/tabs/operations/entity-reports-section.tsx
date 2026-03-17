"use client";

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { DocumentPreviewModal } from "@/components/ui/document-preview-modal";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

interface Props {
  entity: any;
  entityId: string;
}

export function EntityReportsSection({ entity, entityId }: Props) {
  const { data: entityReportsData, isLoading: entityReportsLoading } = useSWR(
    `/api/reports?entityId=${entityId}`,
    fetcher
  );
  const [previewReport, setPreviewReport] = useState<{
    name: string;
    fileUrl: string;
    mimeType?: string;
  } | null>(null);

  const entityReports: any[] = Array.isArray(entityReportsData) ? entityReportsData : [];

  // Group by period
  const periodGroups = new Map<string, any[]>();
  for (const r of entityReports) {
    const period = r.period ?? "No Period";
    if (!periodGroups.has(period)) periodGroups.set(period, []);
    periodGroups.get(period)!.push(r);
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Reports</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            All generated reports for this entity
          </p>
        </div>
        <a
          href={`/reports?entityId=${entity.id}`}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
        >
          Generate Report
        </a>
      </div>

      {entityReportsLoading ? (
        <div className="text-sm text-gray-400 dark:text-gray-500">Loading reports...</div>
      ) : entityReports.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            No reports generated for this entity yet.
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Visit the{" "}
            <a href={`/reports?entityId=${entity.id}`} className="text-indigo-600 hover:underline">
              Reports page
            </a>{" "}
            to generate one.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(periodGroups).map(([period, periodReports]) => (
            <div key={period}>
              {/* Period header */}
              <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5 px-1">
                {period}
                {periodReports.length > 1 && (
                  <span className="ml-1 text-indigo-400">
                    ({periodReports.length} versions)
                  </span>
                )}
              </div>

              <div className="divide-y divide-gray-50 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                {periodReports.map((r: any, vIdx: number) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-3 py-2.5 gap-4 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-[10px] text-gray-500 dark:text-gray-400 font-medium flex-shrink-0">
                        PDF
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex items-center gap-1.5">
                          {r.name}
                          {periodReports.length > 1 && (
                            <span className="text-[10px] text-gray-400 font-normal">
                              v{vIdx + 1}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                          <Badge color="blue">
                            {r.category?.toLowerCase() || "report"}
                          </Badge>
                          <span>{formatDate(r.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {r.fileUrl && (
                        <button
                          onClick={() =>
                            setPreviewReport({
                              name: r.name,
                              fileUrl: r.fileUrl,
                              mimeType: "application/pdf",
                            })
                          }
                          className="text-xs text-indigo-500 hover:text-indigo-700 font-medium hover:underline"
                        >
                          Preview
                        </button>
                      )}
                      {r.fileUrl && (
                        <a
                          href={r.fileUrl}
                          download
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <DocumentPreviewModal
        open={!!previewReport}
        onClose={() => setPreviewReport(null)}
        document={previewReport}
      />
    </div>
  );
}
