"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

interface SearchFilterBarProps {
  onSearch: (query: string) => void;
  filters?: FilterConfig[];
  onFilterChange?: (key: string, value: string) => void;
  activeFilters?: Record<string, string>;
  placeholder?: string;
}

export function SearchFilterBar({
  onSearch,
  filters = [],
  onFilterChange,
  activeFilters = {},
  placeholder = "Search...",
}: SearchFilterBarProps) {
  const [query, setQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevQueryRef = useRef(query);

  // Debounce search: fire onSearch 300ms after user stops typing
  const debouncedSearch = useCallback(
    (value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onSearch(value), 300);
    },
    [onSearch],
  );

  useEffect(() => {
    // Only fire when query actually changes — skip mount and strict mode double-fire
    if (prevQueryRef.current === query) return;
    prevQueryRef.current = query;
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search input */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              onSearch("");
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

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
    </div>
  );
}
