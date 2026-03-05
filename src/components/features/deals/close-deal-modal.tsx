"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CloseDealModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { costBasis: number; fairValue: number; entryDate: string }) => void;
  dealName: string;
  assetClass: string;
  entityName?: string;
  loading?: boolean;
  checklistTotal?: number;
  checklistComplete?: number;
}

export function CloseDealModal({
  open,
  onClose,
  onConfirm,
  dealName,
  assetClass,
  entityName,
  loading = false,
  checklistTotal = 0,
  checklistComplete = 0,
}: CloseDealModalProps) {
  const [costBasis, setCostBasis] = useState("");
  const [fairValue, setFairValue] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);

  function handleSubmit() {
    const cb = parseFloat(costBasis.replace(/[^0-9.]/g, ""));
    if (isNaN(cb) || cb <= 0) return;
    const fv = fairValue ? parseFloat(fairValue.replace(/[^0-9.]/g, "")) : cb;
    onConfirm({ costBasis: cb, fairValue: isNaN(fv) ? cb : fv, entryDate });
  }

  const isValid = costBasis && !isNaN(parseFloat(costBasis.replace(/[^0-9.]/g, ""))) && parseFloat(costBasis.replace(/[^0-9.]/g, "")) > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Close Deal & Create Asset"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} onClick={handleSubmit} disabled={!isValid}>
            Close Deal
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Deal summary */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Creating asset from deal</div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{dealName}</span>
            <Badge color="blue">{assetClass}</Badge>
          </div>
          {entityName && (
            <div className="text-xs text-gray-500 mt-1">Entity: {entityName}</div>
          )}
        </div>

        {/* Checklist status */}
        {checklistTotal > 0 && (
          <div className={`rounded-lg p-3 border ${
            checklistComplete >= checklistTotal
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50 border-amber-200"
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${
                checklistComplete >= checklistTotal ? "text-emerald-700" : "text-amber-700"
              }`}>
                Closing Checklist: {checklistComplete}/{checklistTotal} complete
              </span>
              {checklistComplete >= checklistTotal ? (
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
            </div>
            {checklistComplete < checklistTotal && (
              <p className="text-[10px] text-amber-600 mt-1">
                {checklistTotal - checklistComplete} item{checklistTotal - checklistComplete !== 1 ? "s" : ""} remain incomplete. The deal will still close.
              </p>
            )}
          </div>
        )}

        {/* Cost basis */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Cost Basis <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="text"
              value={costBasis}
              onChange={(e) => setCostBasis(e.target.value)}
              placeholder="e.g. 10,000,000"
              className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Total investment amount for this asset</p>
        </div>

        {/* Fair value */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Fair Value
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="text"
              value={fairValue}
              onChange={(e) => setFairValue(e.target.value)}
              placeholder="Defaults to cost basis"
              className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Current fair market value — leave blank to use cost basis</p>
        </div>

        {/* Entry date */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Entry Date
          </label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Info note */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <p className="text-xs text-indigo-700">
            Closing this deal will create an asset in your portfolio with a link back to all deal intelligence — DD reports, IC memo, and task history will remain accessible from the asset page.
          </p>
        </div>
      </div>
    </Modal>
  );
}
