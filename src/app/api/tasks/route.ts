import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { parsePaginationParams, buildPaginatedResult } from "@/lib/pagination";
import { parseBody } from "@/lib/api-helpers";
import { CreateTaskFullSchema, PatchTaskSchema } from "@/lib/schemas";
import { sendEmail } from "@/lib/email";
import { taskAssignedEmailHtml } from "@/lib/email-templates";
import { logger } from "@/lib/logger";

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
    const assetId = sp.get("assetId");

    const params = parsePaginationParams(sp, [
      "firmId", "cursor", "limit", "search", "contextType", "contextId",
      "assigneeId", "status", "priority", "dealId", "entityId", "assetId",
    ]);

    const baseWhere: Record<string, unknown> = {};
    // contextType=none means unlinked tasks (no context assigned)
    if (contextType === "none") {
      baseWhere.contextType = null;
    } else if (contextType) {
      baseWhere.contextType = contextType;
    }
    if (contextId) baseWhere.contextId = contextId;
    if (assigneeId) baseWhere.assigneeId = assigneeId;
    if (params.filters?.status) baseWhere.status = params.filters.status;
    if (params.filters?.priority) baseWhere.priority = params.filters.priority;
    if (dealId) baseWhere.dealId = dealId;
    if (entityId) baseWhere.entityId = entityId;
    if (assetId) baseWhere.assetId = assetId;

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
          asset: { select: { id: true, name: true } },
          entity: { select: { id: true, name: true } },
          checklistItems: { select: { isChecked: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    // Compute checklist progress and strip the raw checklistItems array
    const tasksWithProgress = rawTasks.map((task) => {
      const { checklistItems, ...rest } = task;
      const checklistTotal = checklistItems.length;
      const checklistCompleted = checklistItems.filter((i) => i.isChecked).length;
      return {
        ...rest,
        checklistProgress: { total: checklistTotal, completed: checklistCompleted },
      };
    });

    const paginated = buildPaginatedResult(tasksWithProgress, params.limit, total);

    return NextResponse.json({
      data: paginated.data,
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
      total: paginated.total,
    });
  } catch (err) {
    logger.error("[tasks] GET Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { data, error } = await parseBody(req, CreateTaskFullSchema);
    if (error) return error;
    const body = data!;
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
        asset: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    logger.error("[tasks] POST Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { data, error } = await parseBody(req, PatchTaskSchema);
    if (error) return error;
    const body = data!;

    // Fetch existing task before update to detect assignee change
    const existingTask = await prisma.task.findUnique({
      where: { id: body.id },
      select: {
        assigneeId: true,
        title: true,
        dueDate: true,
        contextType: true,
        contextId: true,
        deal: { select: { name: true } },
        asset: { select: { name: true } },
        entity: { select: { name: true } },
      },
    });

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId || null;
    if (body.assigneeName !== undefined) updateData.assigneeName = body.assigneeName;
    if (body.dueDate !== undefined)
      updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.order !== undefined) updateData.order = body.order;

    const task = await prisma.task.update({
      where: { id: body.id },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, initials: true } },
        deal: { select: { id: true, name: true } },
        asset: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
      },
    });

    // Send assignment email when assignee changes to a new person
    if (
      body.assigneeId &&
      body.assigneeId !== existingTask?.assigneeId
    ) {
      const assignee = await prisma.user.findUnique({
        where: { id: body.assigneeId },
        select: { email: true, name: true },
      });
      if (assignee?.email) {
        const contextLabel = existingTask?.deal?.name
          ? `Deal: ${existingTask.deal.name}`
          : existingTask?.asset?.name
          ? `Asset: ${existingTask.asset.name}`
          : existingTask?.entity?.name
          ? `Entity: ${existingTask.entity.name}`
          : undefined;

        try {
          await sendEmail({
            to: assignee.email,
            subject: `Task assigned: ${existingTask?.title || body.title || "New task"}`,
            html: taskAssignedEmailHtml({
              assigneeName: assignee.name || "Team member",
              taskTitle: existingTask?.title || body.title || "Task",
              dueDate: existingTask?.dueDate
                ? new Date(existingTask.dueDate).toLocaleDateString()
                : undefined,
              contextLabel,
              priority: body.priority,
              portalUrl:
                process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            }),
          });
        } catch (emailErr) {
          // Log but don't fail the PATCH — email is best-effort
          logger.error("[tasks] Failed to send task assignment email:", { error: emailErr instanceof Error ? emailErr.message : String(emailErr) });
        }
      }
    }

    return NextResponse.json(task);
  } catch (err) {
    logger.error("[tasks] PATCH Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
