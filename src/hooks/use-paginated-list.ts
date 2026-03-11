"use client";

import { useState, useCallback, useRef } from "react";
import useSWR from "swr";
import { logger } from "@/lib/logger";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

interface UsePaginatedListResult<T> {
  data: T[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  loadingMore: boolean;
  search: string;
  setSearch: (q: string) => void;
  filters: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  total: number;
  error: Error | undefined;
}

/**
 * Custom hook that wraps SWR for cursor-based paginated data.
 * Manages cursor progression, appends new data to existing array,
 * and resets when search/filters change.
 */
export function usePaginatedList<T>(
  baseUrl: string,
  defaultFilters: Record<string, string> = {},
): UsePaginatedListResult<T> {
  const [search, setSearchState] = useState("");
  const [filters, setFiltersState] = useState<Record<string, string>>(defaultFilters);
  const [cursor, setCursor] = useState<string | null>(null);
  const [accumulatedData, setAccumulatedData] = useState<T[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Build query string from current state
  const buildUrl = useCallback(
    (currentCursor?: string | null) => {
      const url = new URL(baseUrl, "http://localhost");
      if (search) url.searchParams.set("search", search);
      for (const [key, value] of Object.entries(filters)) {
        if (value) url.searchParams.set(key, value);
      }
      if (currentCursor) url.searchParams.set("cursor", currentCursor);
      // Return path + search only (strip the fake host)
      return url.pathname + url.search;
    },
    [baseUrl, search, filters],
  );

  const swrKey = buildUrl(null);

  const { data, isLoading, error } = useSWR<PaginatedResponse<T>>(swrKey, fetcher, {
    onSuccess: (result) => {
      // When the base query (no cursor) succeeds, reset accumulated data
      setAccumulatedData(result.data);
      setHasMore(result.hasMore);
      setTotal(result.total);
      setCursor(result.nextCursor);
    },
    revalidateOnFocus: false,
  });

  const setSearch = useCallback((q: string) => {
    setSearchState(q);
    setCursor(null);
    setAccumulatedData([]);
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
    setCursor(null);
    setAccumulatedData([]);
  }, []);

  // Track whether we're waiting for a load-more fetch
  const loadMoreInProgress = useRef(false);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loadMoreInProgress.current || !cursor) return;

    loadMoreInProgress.current = true;
    setLoadingMore(true);

    try {
      const url = buildUrl(cursor);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result: PaginatedResponse<T> = await res.json();

      setAccumulatedData((prev) => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setTotal(result.total);
      setCursor(result.nextCursor);
    } catch (err) {
      logger.error("[usePaginatedList] loadMore error:", { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoadingMore(false);
      loadMoreInProgress.current = false;
    }
  }, [hasMore, loadingMore, cursor, buildUrl]);

  return {
    data: accumulatedData.length > 0 ? accumulatedData : data?.data ?? [],
    isLoading,
    hasMore,
    loadMore,
    loadingMore,
    search,
    setSearch,
    filters,
    setFilter,
    total,
    error,
  };
}
