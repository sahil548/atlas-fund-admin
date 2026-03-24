"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";

interface Props {
  open: boolean;
  onClose: () => void;
  sideLetter: {
    id: string;
    terms: string;
    investor: { name: string };
    entity: { name: string };
  };
}

export function EditSideLetterForm({ open, onClose, sideLetter }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation(`/api/side-letters/${sideLetter.id}`, {
    method: "PUT",
    revalidateKeys: ["/api/side-letters"],
  });

  const [terms, setTerms] = useState("");

  useEffect(() => {
    if (open) setTerms(sideLetter.terms || "");
  }, [open, sideLetter]);

  async function handleSubmit() {
    if (!terms.trim()) {
      toast.error("Terms are required");
      return;
    }
    try {
      await trigger({ terms });
      toast.success("Side letter updated");
      onClose();
    } catch {
      toast.error("Failed to update side letter");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Side Letter"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={isLoading} onClick={handleSubmit}>Save Changes</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">{sideLetter.investor.name}</span> — {sideLetter.entity.name}
        </div>
        <FormField label="Terms" required>
          <Textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={5}
            placeholder="Side letter terms..."
          />
        </FormField>
      </div>
    </Modal>
  );
}
