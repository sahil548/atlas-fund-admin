"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";

interface Props { open: boolean; onClose: () => void; assetId: string }

export function CreateTaskForm({ open, onClose, assetId }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation(`/api/assets/${assetId}/tasks`, { revalidateKeys: [`/api/assets/${assetId}`] });
  const [form, setForm] = useState({ title: "", assigneeName: "", dueDate: "", status: "TODO" });
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    if (!form.title.trim()) { setError("Title is required"); return; }
    try {
      await trigger({ ...form, assetId });
      toast.success("Task created");
      setForm({ title: "", assigneeName: "", dueDate: "", status: "TODO" });
      setError("");
      onClose();
    } catch { toast.error("Failed to create task"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Task" size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Create Task</Button></>}>
      <div className="space-y-3">
        <FormField label="Title" required error={error}><Input value={form.title} onChange={(e) => { set("title", e.target.value); setError(""); }} error={!!error} placeholder="e.g. Review Q4 financials" /></FormField>
        <FormField label="Assignee"><Input value={form.assigneeName} onChange={(e) => set("assigneeName", e.target.value)} placeholder="e.g. James Kim" /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Due Date"><Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></FormField>
          <FormField label="Status"><Select value={form.status} onChange={(e) => set("status", e.target.value)} options={[{ value: "TODO", label: "To Do" }, { value: "IN_PROGRESS", label: "In Progress" }, { value: "DONE", label: "Done" }]} /></FormField>
        </div>
      </div>
    </Modal>
  );
}
