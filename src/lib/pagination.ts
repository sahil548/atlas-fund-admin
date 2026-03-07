// ── Pagination helpers for cursor-based API routes ──────────────────────────

export interface PaginationParams {
  cursor?: string;
  limit: number;
  search?: string;
  filters?: Record<string, string>;
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

/**
 * Parse pagination params from URLSearchParams.
 * Extracts cursor, limit (default 50), search, and any additional filter keys.
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  knownParams: string[] = ["firmId", "cursor", "limit", "search"],
): PaginationParams {
  const cursor = searchParams.get("cursor") ?? undefined;
  const limitRaw = parseInt(searchParams.get("limit") ?? "50", 10);
  const limit = isNaN(limitRaw) || limitRaw < 1 ? 50 : Math.min(limitRaw, 100);
  const search = searchParams.get("search") ?? undefined;

  // Collect any remaining params as filters
  const filters: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (!knownParams.includes(key) && value) {
      filters[key] = value;
    }
  });

  return { cursor, limit, search, filters };
}

/**
 * Build Prisma findMany args from pagination params.
 *
 * @param params  - Parsed pagination params
 * @param searchFields - Model string fields to search across (e.g. ["name", "description"])
 * @param baseWhere - Existing where clause to merge with
 * @param orderByField - Field to order by (default: "createdAt")
 */
export function buildPrismaArgs(
  params: PaginationParams,
  searchFields: string[] = [],
  baseWhere: Record<string, unknown> = {},
  orderByField = "createdAt",
): {
  where: Record<string, unknown>;
  take: number;
  skip: number;
  cursor: { id: string } | undefined;
  orderBy: Record<string, string>;
} {
  const where: Record<string, unknown> = { ...baseWhere };

  // Search: OR across provided text fields
  if (params.search && searchFields.length > 0) {
    where.OR = searchFields.map((field) => ({
      [field]: { contains: params.search, mode: "insensitive" },
    }));
  }

  // Filters: add each key-value pair directly to where
  if (params.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      if (value) where[key] = value;
    }
  }

  // Cursor pagination: take limit+1 to detect if there's a next page
  const take = params.limit + 1;
  const skip = params.cursor ? 1 : 0;
  const cursor = params.cursor ? { id: params.cursor } : undefined;

  return {
    where,
    take,
    skip,
    cursor,
    orderBy: { [orderByField]: "desc" },
  };
}

/**
 * Slice results and compute cursor/hasMore from an over-fetched array.
 * Pass the raw results from Prisma (limit+1 items).
 */
export function buildPaginatedResult<T extends { id: string }>(
  rawData: T[],
  limit: number,
  total: number,
): PaginatedResult<T> {
  const hasMore = rawData.length > limit;
  const data = hasMore ? rawData.slice(0, limit) : rawData;
  const nextCursor = hasMore ? data[data.length - 1].id : null;
  return { data, nextCursor, hasMore, total };
}
