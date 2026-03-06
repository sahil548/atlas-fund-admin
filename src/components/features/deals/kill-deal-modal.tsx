"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";

const KILL_REASONS = [
  { value: "Pricing", label: "Pricing" },
  { value: "Risk", label: "Risk" },
  { value: "Timing", label: "Timing" },
  { value: "Sponsor", label: "Sponsor" },
  { value: "Other", label: "Other" },
];

interface KillDealModalProps {
  open: boolean;
  onClose: () => void;
  dealName: string;
  onConfirm: (reason: string, reasonText: string) => void;
  loading?: boolean;
}

export function KillDealModal({
  open,
  onClose,
  dealName,
  onConfirm,
  loading,
}: KillDealModalProps) {
  const [reason, setReason] = useState("");
  const [reasonText, setReasonText] = useState("");

  function handleClose() {
    setReason("");
    setReasonText("");
    onClose();
  }

  function handleConfirm() {
    onConfirm(reason, reasonText);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Kill Deal"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            loading={loading}
            disabled={!reason}
          >
            Kill Deal
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Are you sure you want to kill <span className="font-semibold">&quot;{dealName}&quot;</span>?
          This will move it to the Dead stage. You can revive it later.
        </p>

        <FormField label="Reason" required>
          <Select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            options={[
              { value: "", label: "\u2014 Select a reason \u2014" },
              ...KILL_REASONS,
            ]}
          />
        </FormField>

        <FormField label="Additional Details">
          <Textarea
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            placeholder="Optional explanation..."
            rows={3}
          />
        </FormField>
      </div>
    </Modal>
  );
}
