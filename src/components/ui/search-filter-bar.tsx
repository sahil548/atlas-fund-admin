"use client";

import React from "react";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

interface FilterBarProps {
  /** @deprecated Search input has been removed. AI command bar (Cmd+K) is the universal search. */
  onSearch?: (query: string) => void;
  filters?: FilterConfig[];
  onFilterChange?: (key: string, value: string) => void;
  activeFilters?: Record<string, string>;
  /** @deprecated No longer used — search input is removed. */
  placeholder?: string;
  /** Optional slot for extra controls (e.g. ExportButton) rendered at the end of the row */
  children?: React.ReactNode;
}

/**
 * FilterBar — renders filter dropdowns and an optional children slot.
 * The search input has been removed; AI command bar (Cmd+K) handles universal search.
 */
export function FilterBar({
  filters = [],
  onFilterChange,
  activeFilters = {},
  children,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Filter dropdowns */}
      {filters.map((filter) => (
        <select
          key={filter.key}
          value={activeFilters[filter.key] ?? ""}
          onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
          className="text-xs border border-gray-200 rounded-lg bg-white text-gray-700 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}

      {/* Clear filters */}
      {Object.values(activeFilters).some(Boolean) && (
        <button
          onClick={() => {
            filters.forEach((f) => onFilterChange?.(f.key, ""));
          }}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Clear filters
        </button>
      )}

      {/* Optional slot (e.g. ExportButton) */}
      {children}
    </div>
  );
}

// Backward-compat alias — existing code importing SearchFilterBar keeps working
export { FilterBar as SearchFilterBar };
