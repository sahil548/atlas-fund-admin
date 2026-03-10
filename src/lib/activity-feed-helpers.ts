/**
 * Pure helper functions for the unified activity feed.
 *
 * These functions are side-effect free and fully testable in a Node vitest env.
 * The API route (src/app/api/activity/route.ts) uses these helpers for
 * merging, filtering, and paginating activity items.
 */

export type ActivityType =
  | "DEAL_ACTIVITY"
  | "CAPITAL_CALL"
  | "DISTRIBUTION"
  | "MEETING"
  | "TASK"
  | "DOCUMENT"
  | "ENTITY_CHANGE";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  description: string;
  entityId?: string;
  entityName?: string;
  linkPath: string;
  date: string; // ISO 8601 string
}

export interface PaginatedActivities {
  items: ActivityItem[];
  total: number;
  hasMore: boolean;
}

/**
 * Merge multiple activity source arrays into a single array sorted by date
 * descending (newest first).
 */
export function mergeAndSortActivities(sources: ActivityItem[][]): ActivityItem[] {
  const merged: ActivityItem[] = [];
  for (const source of sources) {
    for (const item of source) {
      merged.push(item);
    }
  }
  merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return merged;
}

/**
 * Filter activity items by a set of allowed types.
 * If the types set is empty, all items are returned (show all).
 */
export function filterByTypes(items: ActivityItem[], types: Set<string>): ActivityItem[] {
  if (types.size === 0) return items;
  return items.filter((item) => types.has(item.type));
}

/**
 * Filter activity items to those linked to a specific entity.
 * If entityId is an empty string, all items are returned (no filter).
 */
export function filterByEntity(items: ActivityItem[], entityId: string): ActivityItem[] {
  if (!entityId) return items;
  return items.filter((item) => item.entityId === entityId);
}

/**
 * Paginate an array of activity items.
 * Returns the page slice, total count, and whether more items exist.
 */
export function paginateActivities(
  items: ActivityItem[],
  offset: number,
  limit: number,
): PaginatedActivities {
  const total = items.length;
  const sliced = items.slice(offset, offset + limit);
  const hasMore = offset + limit < total;
  return { items: sliced, total, hasMore };
}
