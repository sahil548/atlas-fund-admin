"use client";

import { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { mutate } from "swr";
import { cn } from "@/lib/utils";
import { ChevronDown, Search } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface InlineSelectFieldProps {
  label: string;
  value: string | null;
  field: string;
  dealId: string;
  options: SelectOption[];
  placeholder?: string;
  /** Allow typing a custom value not in the list */
  allowCustom?: boolean;
  loading?: boolean;
}

export function InlineSelectField({
  label,
  value,
  field,
  dealId,
  options,
  placeholder,
  allowCustom = false,
  loading = false,
}: InlineSelectFieldProps) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const savingRef = useRef(false);

  // Filter options by search
  const filtered = search
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(search.toLowerCase()) ||
          (o.sublabel && o.sublabel.toLowerCase().includes(search.toLowerCase()))
      )
    : options;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  // Close on outside click
  useEffect(() => {
    if (!editing) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setEditing(false);
        setSearch("");
        setFocusedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editing]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex < 0) return;
    const item = listRef.current?.children[focusedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  function startEdit() {
    setSearch("");
    setFocusedIndex(-1);
    setEditing(true);
  }

  async function handleSelect(newValue: string | null) {
    if (savingRef.current) return;
    if (newValue === (value ?? "")) {
      setEditing(false);
      setSearch("");
      return;
    }

    savingRef.current = true;
    setSaving(true);

    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newValue || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Failed to save";
        toast.error(msg);
        return;
      }
      mutate(`/api/deals/${dealId}`);
      setEditing(false);
      setSearch("");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setEditing(false);
      setSearch("");
      setFocusedIndex(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIndex >= 0 && filtered[focusedIndex]) {
        handleSelect(filtered[focusedIndex].value);
      } else if (allowCustom && search.trim()) {
        handleSelect(search.trim());
      }
    }
  }

  // Display label for current value
  const displayLabel = value
    ? options.find((o) => o.value === value)?.label || value
    : null;

  if (editing) {
    return (
      <div ref={containerRef} className="relative">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          {label}
        </label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setFocusedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Search ${label.toLowerCase()}...`}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
          {saving && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <svg className="animate-spin h-3 w-3 text-gray-400" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
        </div>
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 max-h-48 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1"
        >
          {/* Clear option */}
          <li
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelect(null);
            }}
            className="px-3 py-1.5 text-sm text-gray-400 italic cursor-pointer hover:bg-gray-50"
          >
            — Clear —
          </li>
          {loading ? (
            <li className="px-3 py-2 text-sm text-gray-400">Loading...</li>
          ) : filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400">
              {allowCustom && search.trim()
                ? `Press Enter to use "${search.trim()}"`
                : "No matches found"}
            </li>
          ) : (
            filtered.map((option, index) => {
              const isSelected = option.value === value;
              const isFocused = index === focusedIndex;
              return (
                <li
                  key={option.value}
                  onMouseEnter={() => setFocusedIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(option.value);
                  }}
                  className={cn(
                    "px-3 py-1.5 cursor-pointer transition-colors",
                    isSelected
                      ? "text-indigo-600 font-medium"
                      : "text-gray-700",
                    isFocused && "bg-gray-50",
                  )}
                >
                  <div className="text-sm">{option.label}</div>
                  {option.sublabel && (
                    <div className="text-[11px] text-gray-400">{option.sublabel}</div>
                  )}
                </li>
              );
            })
          )}
        </ul>
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
        className="group flex items-center gap-1.5 w-full text-left"
      >
        <span
          className={`text-sm ${
            displayLabel ? "text-gray-900" : "text-gray-400 italic"
          }`}
        >
          {displayLabel || placeholder || "Click to select..."}
        </span>
        <ChevronDown className="w-3 h-3 text-gray-300 group-hover:text-indigo-500 flex-shrink-0 transition-colors" />
      </button>
    </div>
  );
}
