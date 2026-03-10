"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { fmt } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  asset: {
    id: string;
    name: string;
    costBasis: number;
    entryDate: string | null;
    status: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExitAssetModal({ asset, isOpen, onClose, onSuccess }: Props) {
  const toast = useToast();
  const [exitDate, setExitDate] = useState("");
  const [exitProceeds, setExitProceeds] = useState("");
  const [exitNotes, setExitNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live preview — computed on every render (NO useEffect)
  const previewMoic = exitProceeds ? parseFloat(exitProceeds) / asset.costBasis : null;
  const previewGainLoss = exitProceeds ? parseFloat(exitProceeds) - asset.costBasis : null;
  const holdPeriodDays =
    exitDate && asset.entryDate
      ? Math.floor(
          (new Date(exitDate).getTime() - new Date(asset.entryDate).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

  const holdPeriodYears = holdPeriodDays != null ? (holdPeriodDays / 365).toFixed(1) : null;

  async function handleSubmit() {
    if (!exitDate || !exitProceeds) {
      toast.error("Exit date and proceeds are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}/exit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exitDate,
          exitProceeds: parseFloat(exitProceeds),
          exitNotes: exitNotes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          typeof data.error === "string" ? data.error : "Failed to record exit";
        toast.error(msg);
        return;
      }

      toast.success("Asset marked as exited");
      mutate(`/api/assets/${asset.id}`);
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to record exit");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (asset.status !== "ACTIVE") {
    return (
      <Modal open={isOpen} onClose={onClose} title="Record Exit">
        <div className="text-center py-6 space-y-2">
          <div className="text-sm text-gray-500">
            This asset is already marked as <strong>{asset.status.toLowerCase()}</strong>.
          </div>
          <div className="text-xs text-gray-400">
            Only active assets can be exited.
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Record Exit — ${asset.name}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={isSubmitting}
            onClick={handleSubmit}
          >
            Record Exit
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Exit Date" required>
            <Input
              type="date"
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
            />
          </FormField>
          <FormField label="Exit Proceeds" required>
            <CurrencyInput
              value={exitProceeds}
              onChange={(v) => setExitProceeds(v)}
              placeholder="e.g. 15,000,000"
            />
          </FormField>
        </div>

        <FormField label="Exit Notes (optional)">
          <Textarea
            value={exitNotes}
            onChange={(e) => setExitNotes(e.target.value)}
            placeholder="Reason for exit, buyer name, deal highlights..."
            rows={3}
          />
        </FormField>

        {/* Live Preview */}
        {(exitProceeds || exitDate) && (
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Exit Preview
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-[10px] text-gray-400 uppercase mb-1">Final MOIC</div>
                <div
                  className={`text-xl font-bold ${
                    previewMoic != null && previewMoic >= 1
                      ? "text-emerald-700"
                      : "text-red-600"
                  }`}
                >
                  {previewMoic != null ? `${previewMoic.toFixed(2)}x` : "—"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-400 uppercase mb-1">Gain / Loss</div>
                <div
                  className={`text-sm font-bold ${
                    previewGainLoss != null && previewGainLoss >= 0
                      ? "text-emerald-700"
                      : "text-red-600"
                  }`}
                >
                  {previewGainLoss != null
                    ? `${previewGainLoss >= 0 ? "+" : ""}${fmt(previewGainLoss)}`
                    : "—"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-400 uppercase mb-1">Hold Period</div>
                <div className="text-sm font-bold text-gray-700">
                  {holdPeriodDays != null
                    ? `${holdPeriodDays} days / ${holdPeriodYears} yrs`
                    : "—"}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Cost Basis</span>
                <span className="font-medium">{fmt(asset.costBasis)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Exit Proceeds</span>
                <span className="font-medium">
                  {exitProceeds ? fmt(parseFloat(exitProceeds)) : "—"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
