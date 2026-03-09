/**
 * Task / asset sort utilities (Phase 14)
 * Pure functions for client-side sorting of asset lists.
 */

export type SortDirection = "asc" | "desc";

/**
 * Sort an array of objects by a given key and direction.
 * Null / undefined values always sort to the end regardless of direction.
 *
 * @param items - Array to sort (not mutated — returns new array)
 * @param sortKey - Object key to sort by
 * @param sortDir - "asc" or "desc"
 */
export function sortAssets<T extends object>(
  items: T[],
  sortKey: keyof T,
  sortDir: SortDirection,
): T[] {
  return [...items].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];

    // Nulls always go to the end
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;

    let cmp = 0;
    if (typeof av === "number" && typeof bv === "number") {
      cmp = av - bv;
    } else {
      cmp = String(av).localeCompare(String(bv));
    }

    return sortDir === "asc" ? cmp : -cmp;
  });
}

/**
 * Toggle sort direction: "asc" → "desc", "desc" → "asc".
 */
export function toggleSortDirection(current: SortDirection): SortDirection {
  return current === "asc" ? "desc" : "asc";
}
