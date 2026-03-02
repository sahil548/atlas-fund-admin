import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const contextType = sp.get("contextType");
  const contextId = sp.get("contextId");
  const assigneeId = sp.get("assigneeId");
  const status = sp.get("status");
  const dealId = sp.get("dealId");
  const entityId = sp.get("entityId");

  const where: Record<string, unknown> = {};
  if (contextType) where.contextType = contextType;
  if (contextId) where.contextId = contextId;
  if (assigneeId) where.assigneeId = assigneeId;
  if (status) where.status = status;
  if (dealId) where.dealId = dealId;
  if (entityId) where.entityId = entityId;

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, initials: true } },
      deal: { select: { id: true, name: true } },
      entity: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
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
}

export async function PATCH(req: NextRequest) {
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
}
