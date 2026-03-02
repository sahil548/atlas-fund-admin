"use client";

import { useState, useCallback } from "react";
import { apiMutate } from "@/lib/mutations";

interface UseMutationOptions {
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  revalidateKeys?: string[];
}

export function useMutation<T = unknown>(url: string, options: UseMutationOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const trigger = useCallback(
    async (data: unknown): Promise<T> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await apiMutate<T>(url, data, options);
        return result;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [url, options.method, options.revalidateKeys?.join(",")]
  );

  const reset = useCallback(() => setError(null), []);

  return { trigger, isLoading, error, reset };
}
