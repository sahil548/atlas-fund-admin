"use client";

import { useState, useRef, KeyboardEvent } from "react";
import useSWR from "swr";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ChecklistItem {
  id: string;
  taskId: string;
  title: string;
  isChecked: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

interface TaskChecklistItemsProps {
  taskId: string;
}

export function TaskChecklistItems({ taskId }: TaskChecklistItemsProps) {
  const { data: items = [], mutate } = useSWR<ChecklistItem[]>(
    `/api/tasks/${taskId}/checklist`,
    fetcher,
  );

  const [newTitle, setNewTitle] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const completed = items.filter((i) => i.isChecked).length;
  const total = items.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  async function handleToggle(item: ChecklistItem) {
    // Optimistic update
    const optimistic = items.map((i) =>
      i.id === item.id ? { ...i, isChecked: !i.isChecked } : i,
    );
    mutate(optimistic, false);

    try {
      const res = await fetch(`/api/tasks/${taskId}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, isChecked: !item.isChecked }),
      });
      if (!res.ok) throw new Error("Failed to update");
      mutate();
    } catch {
      // Revert on error
      mutate(items, false);
    }
  }

  async function handleDelete(itemId: string) {
    // Optimistic removal
    const optimistic = items.filter((i) => i.id !== itemId);
    mutate(optimistic, false);

    try {
      const res = await fetch(`/api/tasks/${taskId}/checklist`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      mutate();
    } catch {
      // Revert on error
      mutate(items, false);
    }
  }

  async function handleAddItem() {
    const title = newTitle.trim();
    if (!title) return;

    setNewTitle("");
    setAddingItem(false);

    try {
      const res = await fetch(`/api/tasks/${taskId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to create");
      mutate();
    } catch {
      // Re-open input on error
      setNewTitle(title);
      setAddingItem(true);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleAddItem();
    } else if (e.key === "Escape") {
      setNewTitle("");
      setAddingItem(false);
    }
  }

  return (
    <div className="mt-3">
      {/* Header with progress */}
      {total > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Checklist ({completed}/{total} complete)
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {percent}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Checklist items */}
      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            {/* Checkbox */}
            <button
              onClick={() => handleToggle(item)}
              className={cn(
                "flex-shrink-0 w-4 h-4 rounded border transition-colors",
                item.isChecked
                  ? "bg-green-500 border-green-500 text-white"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400",
              )}
              title={item.isChecked ? "Uncheck" : "Check"}
            >
              {item.isChecked && <Check className="h-3 w-3 mx-auto" />}
            </button>

            {/* Title */}
            <span
              className={cn(
                "flex-1 text-xs",
                item.isChecked
                  ? "line-through text-gray-400 dark:text-gray-500"
                  : "text-gray-700 dark:text-gray-300",
              )}
            >
              {item.title}
            </span>

            {/* Delete button — visible on hover */}
            <button
              onClick={() => handleDelete(item.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity p-0.5 rounded"
              title="Remove item"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Add item input */}
      {addingItem ? (
        <div className="mt-1 flex items-center gap-1">
          <div className="w-4 h-4 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleAddItem}
            autoFocus
            placeholder="Add an item..."
            className="flex-1 text-xs border border-indigo-300 dark:border-indigo-600 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
      ) : (
        <button
          onClick={() => {
            setAddingItem(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="mt-1 flex items-center gap-2 px-1 py-0.5 text-xs text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <span className="w-4 h-4 flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-600 rounded text-gray-300 text-[10px]">
            +
          </span>
          Add an item...
        </button>
      )}
    </div>
  );
}

/**
 * Compact progress badge for use in task list rows / cards.
 * Shows "3/5" when there are checklist items, null otherwise.
 */
export function ChecklistProgressBadge({
  total,
  completed,
}: {
  total: number;
  completed: number;
}) {
  if (total === 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
        completed === total
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
      )}
      title={`${completed} of ${total} checklist items complete`}
    >
      <Check className="h-2.5 w-2.5" />
      {completed}/{total}
    </span>
  );
}
