"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { mutate } from "swr";

interface InlineEditFieldProps {
  label: string;
  value: string | null;
  field: string;
  dealId: string;
  type?: "text" | "textarea";
  placeholder?: string;
}

export function InlineEditField({
  label,
  value,
  field,
  dealId,
  type = "text",
  placeholder,
}: InlineEditFieldProps) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Prevent double-save: guard against concurrent save calls
  const savingRef = useRef(false);
  // Prevent blur-after-Enter double-save
  const justSavedRef = useRef(false);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  useEffect(() => {
    setEditValue(value ?? "");
  }, [value]);

  function startEdit() {
    setEditValue(value ?? "");
    setEditing(true);
  }

  async function handleSave() {
    // Guard: skip if already saving (prevents double-save)
    if (savingRef.current) return;

    if (editValue === (value ?? "")) {
      setEditing(false);
      return;
    }

    savingRef.current = true;
    justSavedRef.current = true;
    setSaving(true);

    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: editValue || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Failed to save";
        toast.error(msg);
        // Keep edit mode open so user doesn't lose input
        return;
      }
      mutate(`/api/deals/${dealId}`);
      setEditing(false);
    } catch {
      toast.error("Failed to save");
      // Keep edit mode open
    } finally {
      setSaving(false);
      savingRef.current = false;
      // Clear justSaved flag after a short delay so blur handler can check it
      setTimeout(() => {
        justSavedRef.current = false;
      }, 100);
    }
  }

  function handleBlur() {
    // If Enter just triggered a save, skip the blur-triggered save
    if (justSavedRef.current) {
      // Still exit edit mode if save already completed successfully
      if (!savingRef.current && !saving) {
        setEditing(false);
      }
      return;
    }
    handleSave();
  }

  function cancel() {
    setEditValue(value ?? "");
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      cancel();
    }
    // For text inputs, Enter saves
    // For textarea, Enter inserts newline (only blur saves); Ctrl+Enter saves
    if (e.key === "Enter") {
      if (type === "textarea") {
        // Ctrl+Enter saves for textarea
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleSave();
        }
        // Regular Enter: do nothing (default newline behavior)
      } else {
        e.preventDefault();
        handleSave();
      }
    }
  }

  if (editing) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          {label}
        </label>
        <div className="relative">
          {type === "textarea" ? (
            <Textarea
              ref={inputRef as React.Ref<HTMLTextAreaElement>}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={3}
              className="text-sm"
            />
          ) : (
            <Input
              ref={inputRef as React.Ref<HTMLInputElement>}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="text-sm"
            />
          )}
          {saving && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <svg
                className="animate-spin h-3 w-3 text-gray-400"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
          )}
        </div>
        {type === "textarea" && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            Press Ctrl+Enter to save, Escape to cancel
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}
      </label>
      <button
        onClick={startEdit}
        className="group flex items-start gap-1.5 w-full text-left"
      >
        <span
          className={`text-sm ${
            value ? "text-gray-900" : "text-gray-400 italic"
          }`}
        >
          {value || placeholder || "Click to add..."}
        </span>
        <svg
          className="w-3 h-3 text-gray-300 group-hover:text-indigo-500 flex-shrink-0 mt-0.5 transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
      </button>
    </div>
  );
}
