"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";

const MEETING_TYPES = [
  { value: "IC Meeting", label: "IC Meeting" },
  { value: "DD Session", label: "DD Session" },
  { value: "GP Review", label: "GP Review" },
  { value: "Portfolio Review", label: "Portfolio Review" },
  { value: "Board Meeting", label: "Board Meeting" },
];

interface Props { open: boolean; onClose: () => void }

export function CreateMeetingForm({ open, onClose }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation("/api/meetings", { revalidateKeys: ["/api/meetings"] });
  const [form, setForm] = useState({ title: "", meetingDate: "", meetingType: "Portfolio Review", actionItems: "0" });
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    if (!form.title.trim()) { setError("Title is required"); return; }
    if (!form.meetingDate) { setError("Date is required"); return; }
    try {
      await trigger({ ...form, actionItems: Number(form.actionItems) || 0 });
      toast.success("Meeting logged");
      setForm({ title: "", meetingDate: "", meetingType: "Portfolio Review", actionItems: "0" });
      setError("");
      onClose();
    } catch { toast.error("Failed to log meeting"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Meeting" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Log Meeting</Button></>}>
      <div className="space-y-3">
        <FormField label="Title" required error={error}>
          <Input value={form.title} onChange={(e) => { set("title", e.target.value); setError(""); }} error={!!error} placeholder="e.g. Q1 Portfolio Review — NovaTech AI" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Date" required><Input type="date" value={form.meetingDate} onChange={(e) => set("meetingDate", e.target.value)} /></FormField>
          <FormField label="Type"><Select value={form.meetingType} onChange={(e) => set("meetingType", e.target.value)} options={MEETING_TYPES} /></FormField>
        </div>
        <FormField label="Action Items"><Input type="number" value={form.actionItems} onChange={(e) => set("actionItems", e.target.value)} /></FormField>
      </div>
    </Modal>
  );
}
