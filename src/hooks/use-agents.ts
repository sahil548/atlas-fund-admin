"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import type { AgentCapability, AgentResponse } from "@/lib/command-bar-types";

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "list" }),
  });
  const data = await res.json();
  return data.capabilities || [];
};

/**
 * Hook for interacting with the Atlas agent system.
 */
export function useAgents() {
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: capabilities } = useSWR<AgentCapability[]>(
    "/api/ai/agents",
    fetcher,
    { revalidateOnFocus: false },
  );

  const processQuery = useCallback(
    async (query: string, firmId: string): Promise<AgentResponse | null> => {
      setIsProcessing(true);
      try {
        const res = await fetch("/api/ai/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "query", query, firmId }),
        });
        const data = await res.json();
        if (!data.success) return null;
        return data as AgentResponse;
      } catch {
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  return {
    processQuery,
    capabilities: capabilities || [],
    isProcessing,
  };
}
