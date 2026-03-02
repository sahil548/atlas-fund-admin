import { mutate } from "swr";

interface MutationOptions {
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  revalidateKeys?: string[];
}

export async function apiMutate<T = unknown>(
  url: string,
  data: unknown,
  options: MutationOptions = {}
): Promise<T> {
  const { method = "POST", revalidateKeys = [] } = options;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw json;
  for (const key of revalidateKeys) {
    mutate(key);
  }
  return json as T;
}
