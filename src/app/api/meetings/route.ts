import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateMeetingSchema } from "@/lib/schemas";
import { getAuthUser } from "@/lib/auth";
import { parsePaginationParams, buildPaginatedResult } from "@/lib/pagination";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const params = parsePaginationParams(req.nextUrl.searchParams, [
      "firmId", "cursor", "limit", "search", "source",
    ]);

    const baseWhere: Record<string, unknown> = firmId
      ? {
          OR: [
            { deal: { firmId } },
            { entity: { firmId } },
            { dealId: null, entityId: null },
          ],
        }
      : {};

    if (params.filters?.source) baseWhere.source = params.filters.source;

    const searchWhere = params.search
      ? { title: { contains: params.search, mode: "insensitive" as const } }
      : {};

    const where = { ...baseWhere, ...searchWhere };

    const [rawMeetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where,
        take: params.limit + 1,
        skip: params.cursor ? 1 : 0,
        cursor: params.cursor ? { id: params.cursor } : undefined,
        orderBy: { meetingDate: "desc" },
        include: {
          asset: { select: { id: true, name: true } },
          deal: { select: { id: true, name: true } },
          entity: { select: { id: true, name: true } },
        },
      }),
      prisma.meeting.count({ where }),
    ]);

    const paginated = buildPaginatedResult(rawMeetings, params.limit, total);

    return NextResponse.json({
      data: paginated.data,
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
      total: paginated.total,
    });
  } catch (err) {
    logger.error("[meetings] GET Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load meetings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { data, error } = await parseBody(req, CreateMeetingSchema);
    if (error) return error;
    const meeting = await prisma.meeting.create({
      data: {
        ...data!,
        meetingDate: new Date(data!.meetingDate),
      },
    });
    return NextResponse.json(meeting, { status: 201 });
  } catch (err) {
    logger.error("[meetings] POST Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
  }
}
