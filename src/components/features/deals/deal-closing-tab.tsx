"use client";

import { Badge } from "@/components/ui/badge";

/* eslint-disable @typescript-eslint/no-explicit-any */

const entityTypeLabels: Record<string, string> = {
  MAIN_FUND: "Main Fund",
  SIDECAR: "Sidecar",
  SPV: "SPV",
  CO_INVEST_VEHICLE: "Co-Invest Vehicle",
  GP_ENTITY: "GP Entity",
  HOLDING_COMPANY: "Holding Company",
};

const vehicleStructureLabels: Record<string, string> = {
  LLC: "LLC",
  LP: "LP",
  CORP: "Corp",
  TRUST: "Trust",
};

interface DealClosingTabProps {
  deal: any;
}

export function DealClosingTab({ deal }: DealClosingTabProps) {
  return (
    <div className="space-y-4">
      {/* Entity Warning Banner or Entity Card */}
      {!deal.targetEntity ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg
              className="w-4 h-4 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-amber-900">
              No investment vehicle linked to this deal
            </div>
            <p className="text-sm text-amber-700 mt-1">
              Link or create an entity before closing. Go to the Overview tab to link an investment vehicle.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Investment Vehicle
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-900">
              {deal.targetEntity.name}
            </span>
            <Badge color="purple">
              {entityTypeLabels[deal.targetEntity.entityType] || deal.targetEntity.entityType}
            </Badge>
            {deal.targetEntity.vehicleStructure && (
              <Badge color="blue">
                {vehicleStructureLabels[deal.targetEntity.vehicleStructure] || deal.targetEntity.vehicleStructure}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Closing Placeholder */}
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
