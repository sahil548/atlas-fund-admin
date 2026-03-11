"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { useToast } from "@/components/ui/toast";
import { useFirm } from "@/components/providers/firm-provider";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface UserOption {
  id: string;
  name: string;
}

interface InlineTaskAddProps {
  contextType: "deal" | "asset" | "entity";
  contextId: string;
  contextLabel: string;
  dealId?: string;
  assetId?: string;
  entityId?: string;
  onTaskCreated?: () => void;
}

export function InlineTaskAdd({
  contextType,
  contextId,
  contextLabel,
  dealId,
  assetId,
  entityId,
  onTaskCreated,
}: InlineTaskAddProps) {
  const toast = useToast();
  const { firmId } = useFirm();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const { data: users = [] } = useSWR<UserOption[]>(
    firmId && showForm ? `/api/users?firmId=${firmId}` : null,
    fetcher,
  );

  // Auto-focus title input when form opens
  useEffect(() => {
    if (showForm && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [showForm]);

  function handleCancel() {
    setShowForm(false);
    setTitle("");
    setAssigneeId("");
    setDueDate("");
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Task title is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          status: "TODO",
          priority: "MEDIUM",
          assigneeId: assigneeId || null,
          dueDate: dueDate || null,
          contextType,
          contextId,
          dealId: dealId || null,
          assetId: assetId || null,
          entityId: entityId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          typeof data.error === "string" ? data.error : "Failed to create task";
        toast.error(msg);
        return;
      }
      toast.success("Task created");
      handleCancel();
      onTaskCreated?.();
    } catch {
      toast.error("Failed to create task");
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="text-xs text-indigo-600 hover:underline mt-2 inline-block"
      >
        + Add Task
      </button>
    );
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="text-[10px] text-gray-500 mb-2 uppercase font-medium">
        New task for {contextLabel}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={titleInputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Task title..."
          className="flex-1 min-w-[180px] border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim()}
          className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Adding..." : "Add"}
        </button>
        <button
          onClick={handleCancel}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 bg-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
