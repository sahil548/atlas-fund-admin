"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface DealClosingTabProps {
  deal: any;
}

export function DealClosingTab({ deal }: DealClosingTabProps) {
  return (
    <div className="space-y-4">
      <div className="py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="text-sm font-semibold text-gray-700">
          Closing workflow coming soon
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Closing workflows will be built out in a future phase.
        </p>
      </div>

      {deal.closingChecklist && deal.closingChecklist.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Closing Checklist</h3>
          <div className="divide-y divide-gray-100">
            {(deal.closingChecklist as any[]).map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 py-2.5">
                <span
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    item.status === "DONE"
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-gray-300"
                  }`}
                >
                  {item.status === "DONE" && (
                    <svg
                      className="w-2.5 h-2.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </span>
                <span
                  className={`text-sm ${
                    item.status === "DONE"
                      ? "line-through text-gray-400"
                      : "text-gray-700"
                  }`}
                >
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
