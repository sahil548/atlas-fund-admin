"use client";

import { Badge } from "@/components/ui/badge";
import { fmt } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  prospects: any[];
}

const COLUMNS = [
  { key: "identified", label: "Identified", statuses: ["IDENTIFIED", "CONTACTED"], borderColor: "border-l-gray-400", bgColor: "bg-gray-50 dark:bg-gray-800", textColor: "text-gray-700 dark:text-gray-300" },
  { key: "meeting", label: "Meeting / DD", statuses: ["MEETING_SCHEDULED", "DD_IN_PROGRESS"], borderColor: "border-l-amber-400", bgColor: "bg-amber-50 dark:bg-gray-800", textColor: "text-amber-700 dark:text-amber-300" },
  { key: "termsheet", label: "Term Sheet", statuses: ["TERM_SHEET_SENT", "NEGOTIATION"], borderColor: "border-l-blue-400", bgColor: "bg-blue-50 dark:bg-gray-800", textColor: "text-blue-700 dark:text-blue-300" },
  { key: "soft", label: "Soft Commit", statuses: ["SOFT_COMMIT"], borderColor: "border-l-blue-500", bgColor: "bg-blue-50 dark:bg-gray-800", textColor: "text-blue-700 dark:text-blue-300" },
  { key: "hard", label: "Hard Commit", statuses: ["HARD_COMMIT"], borderColor: "border-l-green-500", bgColor: "bg-green-50 dark:bg-gray-800", textColor: "text-green-700 dark:text-green-300" },
] as const;

const EXCLUDED = new Set(["DECLINED", "WITHDRAWN"]);

export function ProspectKanbanBoard({ prospects }: Props) {
  const filtered = prospects.filter((p: any) => !EXCLUDED.has(p.status));

  function getColumnProspects(statuses: readonly string[]) {
    return filtered.filter((p: any) => statuses.includes(p.status));
  }

  return (
    <div className="grid grid-cols-5 gap-3">
      {COLUMNS.map((col) => {
        const items = getColumnProspects(col.statuses);
        return (
          <div key={col.key}>
            <div className="flex items-center justify-between mb-2">
              <div className={`text-[10px] font-semibold uppercase tracking-wider ${col.textColor}`}>
                {col.label}
              </div>
              <span className="text-[10px] text-gray-400">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.length > 0 ? (
                items.map((p: any) => (
                  <div
                    key={p.id}
                    className={`${col.bgColor} rounded-lg p-3 border border-gray-100 dark:border-gray-700 border-l-4 ${col.borderColor}`}
                  >
                    <div className="text-xs font-semibold">{p.investorName}</div>
                    {p.investorType && (
                      <div className="mt-1"><Badge color="gray">{p.investorType}</Badge></div>
                    )}
                    {p.targetAmount != null && (
                      <div className={`text-xs font-semibold mt-1 ${col.textColor}`}>
                        {fmt(p.targetAmount)}
                      </div>
                    )}
                    {p.status === "SOFT_COMMIT" && p.softCommitAmount != null && (
                      <div className="text-[10px] text-blue-600 mt-0.5">
                        Soft: {fmt(p.softCommitAmount)}
                      </div>
                    )}
                    {p.status === "HARD_COMMIT" && p.hardCommitAmount != null && (
                      <div className="text-[10px] text-green-600 mt-0.5">
                        Committed: {fmt(p.hardCommitAmount)}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-[10px] text-gray-400 text-center py-6">No prospects</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
