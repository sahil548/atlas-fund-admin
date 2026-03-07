import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, forbidden } from "@/lib/auth";

/**
 * GET /api/audit-log
 * List audit logs with filtering.
 * GP_ADMIN only.
 *
 * Query params: firmId, targetType?, userId?, startDate?, endDate?, limit=50, cursor?
 */
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authUser.role !== "GP_ADMIN") return forbidden();

  const searchParams = req.nextUrl.searchParams;
  const targetType = searchParams.get("targetType") ?? undefined;
  const userId = searchParams.get("userId") ?? undefined;
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;
  const limit = Math.min(200, parseInt(searchParams.get("limit") ?? "50", 10));
  const cursor = searchParams.get("cursor") ?? undefined;

  const where: Record<string, unknown> = { firmId: authUser.firmId };
  if (targetType) where.targetType = targetType;
  if (userId) where.userId = userId;
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {}),
    };
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      user: { select: { id: true, name: true, initials: true, email: true } },
    },
  });

  const hasMore = logs.length > limit;
  const items = hasMore ? logs.slice(0, limit) : logs;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ items, nextCursor, hasMore });
}
