import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { parsePaginationParams, buildPaginatedResult } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const sp = req.nextUrl.searchParams;
    const contextType = sp.get("contextType");
    const contextId = sp.get("contextId");
    const assigneeId = sp.get("assigneeId");
    const dealId = sp.get("dealId");
    const entityId = sp.get("entityId");

    const params = parsePaginationParams(sp, [
      "firmId", "cursor", "limit", "search", "contextType", "contextId",
      "assigneeId", "status", "priority", "dealId", "entityId",
    ]);

    const baseWhere: Record<string, unknown> = {};
    if (contextType) baseWhere.contextType = contextType;
    if (contextId) baseWhere.contextId = contextId;
    if (assigneeId) baseWhere.assigneeId = assigneeId;
    if (params.filters?.status) baseWhere.status = params.filters.status;
    if (params.filters?.priority) baseWhere.priority = params.filters.priority;
    if (dealId) baseWhere.dealId = dealId;
    if (entityId) baseWhere.entityId = entityId;

    if (firmId && !dealId && !entityId) {
      baseWhere.OR = [
        { deal: { firmId } },
        { entity: { firmId } },
        { dealId: null, entityId: null, assignee: { firmId } },
      ];
    }

    // Search across title
    const searchWhere = params.search
      ? { title: { contains: params.search, mode: "insensitive" as const } }
      : {};

    const where = { ...baseWhere, ...searchWhere };

    const [rawTasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        take: params.limit + 1,
        skip: params.cursor ? 1 : 0,
        cursor: params.cursor ? { id: params.cursor } : undefined,
        orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        include: {
          assignee: { select: { id: true, name: true, initials: true } },
          deal: { select: { id: true, name: true } },
          entity: { select: { id: true, name: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    const paginated = buildPaginatedResult(rawTasks, params.limit, total);

    return NextResponse.json({
      data: paginated.data,
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
      total: paginated.total,
    });
  } catch (err) {
    console.error("[tasks] GET Error:", err);
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description || null,
        status: body.status || "TODO",
        priority: body.priority || "MEDIUM",
        assigneeId: body.assigneeId || null,
        assigneeName: body.assigneeName || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes || null,
        order: body.order ?? null,
        contextType: body.contextType || null,
        contextId: body.contextId || null,
        assetId: body.assetId || null,
        dealId: body.dealId || null,
        entityId: body.entityId || null,
      },
      include: {
        assignee: { select: { id: true, name: true, initials: true } },
        deal: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("[tasks] POST Error:", err);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id)
      return NextResponse.json({ error: "id required" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.status !== undefined) data.status = body.status;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId || null;
    if (body.assigneeName !== undefined) data.assigneeName = body.assigneeName;
    if (body.dueDate !== undefined)
      data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.notes !== undefined) data.notes = body.notes;

    const task = await prisma.task.update({
      where: { id: body.id },
      data,
      include: {
        assignee: { select: { id: true, name: true, initials: true } },
        deal: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(task);
  } catch (err) {
    console.error("[tasks] PATCH Error:", err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
