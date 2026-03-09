"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export const validTransitions: Record<string, string[]> = {
  ACTIVE: ["WINDING_DOWN"],
  WINDING_DOWN: ["DISSOLVED", "ACTIVE"],
  DISSOLVED: [],
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  WINDING_DOWN: "Winding Down",
  DISSOLVED: "Dissolved",
};

const TRANSITION_LABELS: Record<string, string> = {
  WINDING_DOWN: "Wind Down",
  DISSOLVED: "Dissolve",
  ACTIVE: "Reactivate",
};

const TRANSITION_VARIANTS: Record<string, "primary" | "danger" | "secondary"> = {
  WINDING_DOWN: "primary",
  DISSOLVED: "danger",
  ACTIVE: "primary",
};

interface StatusTransitionDialogProps {
  entityId: string;
  currentStatus: string;
  onSuccess: () => void;
  open: boolean;
  onClose: () => void;
  targetStatus: string;
}

export function StatusTransitionDialog({
  entityId,
  currentStatus,
  onSuccess,
  open,
  onClose,
  targetStatus,
}: StatusTransitionDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<{ outstandingCalls: number; activeAssets: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const toast = useToast();

  async function handleConfirm() {
    if (targetStatus === "DISSOLVED" && !confirmed && !warnings) {
      // First click: fetch warnings, show them
      setLoading(true);
      try {
        const res = await fetch(`/api/entities/${entityId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "TRANSITION_STATUS", newStatus: targetStatus, reason: reason || undefined }),
        });
        const data = await res.json();
        if (!res.ok) {
          const msg = typeof data.error === "string" ? data.error : "Transition failed";
          toast.error(msg);
          return;
        }
        // Show warnings if there are any
        if (data.warnings && (data.warnings.outstandingCalls > 0 || data.warnings.activeAssets > 0)) {
          setWarnings(data.warnings);
          setConfirmed(true);
          // Status already updated — this is informational
          toast.success(`Status changed to ${STATUS_LABELS[targetStatus]}`);
          onSuccess();
          onClose();
          return;
        }
        toast.success(`Status changed to ${STATUS_LABELS[targetStatus]}`);
        onSuccess();
        onClose();
      } catch {
        toast.error("Failed to transition status");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/entities/${entityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TRANSITION_STATUS", newStatus: targetStatus, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "Transition failed";
        toast.error(msg);
        return;
      }
      if (data.warnings) {
        setWarnings(data.warnings);
      }
      toast.success(`Status changed to ${STATUS_LABELS[targetStatus]}`);
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to transition status");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setReason("");
    setWarnings(null);
    setConfirmed(false);
    onClose();
  }

  const transitionLabel = TRANSITION_LABELS[targetStatus] ?? targetStatus;
  const variant = TRANSITION_VARIANTS[targetStatus] ?? "primary";

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`${transitionLabel} Vehicle`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={variant} loading={loading} onClick={handleConfirm}>
            {transitionLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Change status from{" "}
          <span className="font-medium">{STATUS_LABELS[currentStatus] ?? currentStatus}</span> to{" "}
          <span className="font-medium">{STATUS_LABELS[targetStatus] ?? targetStatus}</span>.
        </p>

        {targetStatus === "DISSOLVED" && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            <p className="font-semibold mb-1">Warning</p>
            <p>Dissolving a vehicle is a terminal action. The vehicle cannot be reactivated. Outstanding capital calls and active assets will remain in the system for record-keeping.</p>
          </div>
        )}

        {warnings && (warnings.outstandingCalls > 0 || warnings.activeAssets > 0) && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700 space-y-1">
            <p className="font-semibold">Outstanding obligations:</p>
            {warnings.outstandingCalls > 0 && (
              <p>• {warnings.outstandingCalls} unfunded capital call{warnings.outstandingCalls !== 1 ? "s" : ""}</p>
            )}
            {warnings.activeAssets > 0 && (
              <p>• {warnings.activeAssets} active asset allocation{warnings.activeAssets !== 1 ? "s" : ""}</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Reason <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Briefly explain the reason for this status change..."
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}
