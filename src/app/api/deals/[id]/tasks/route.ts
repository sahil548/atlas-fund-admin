import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateDDTaskSchema, UpdateDDTaskSchema } from "@/lib/schemas";
import { recalcWorkstreamProgress } from "@/lib/deal-stage-engine";

/**
 * POST /api/deals/[id]/tasks — Create a new DD task
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, CreateDDTaskSchema);
  if (error) return error;

  // Verify the workstream belongs to this deal
  const ws = await prisma.dDWorkstream.findFirst({
    where: { id: data!.workstreamId, dealId: id },
  });
  if (!ws) {
    return NextResponse.json(
      { error: "Workstream not found for this deal" },
      { status: 404 },
    );
  }

  const task = await prisma.dDTask.create({
    data: {
      workstreamId: data!.workstreamId,
      title: data!.title,
      assignee: data!.assignee,
      dueDate: data!.dueDate ? new Date(data!.dueDate) : undefined,
      notes: data!.notes,
      description: data!.description,
      priority: data!.priority,
      source: data!.source,
    },
  });

  await recalcWorkstreamProgress(data!.workstreamId);

  return NextResponse.json(task, { status: 201 });
}

/**
 * PATCH /api/deals/[id]/tasks — Update a DD task
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  void (await params); // validate route param exists
  const { data, error } = await parseBody(req, UpdateDDTaskSchema);
  if (error) return error;

  const existing = await prisma.dDTask.findUnique({
    where: { id: data!.id },
    include: { workstream: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (data!.title !== undefined) updateData.title = data!.title;
  if (data!.status !== undefined) {
    updateData.status = data!.status;
    // When task is marked as DONE, set resolvedAt timestamp
    if (data!.status === "DONE" && existing.status !== "DONE") {
      updateData.resolvedAt = new Date();
    }
    // If reopened from DONE, clear resolvedAt
    if (data!.status !== "DONE" && existing.status === "DONE") {
      updateData.resolvedAt = null;
    }
  }
  if (data!.assignee !== undefined) updateData.assignee = data!.assignee;
  if (data!.dueDate !== undefined)
    updateData.dueDate = data!.dueDate ? new Date(data!.dueDate) : null;
  if (data!.notes !== undefined) updateData.notes = data!.notes;
  if (data!.description !== undefined) updateData.description = data!.description;
  if (data!.resolution !== undefined) updateData.resolution = data!.resolution;
  if (data!.priority !== undefined) updateData.priority = data!.priority;

  const task = await prisma.dDTask.update({
    where: { id: data!.id },
    data: updateData,
  });

  await recalcWorkstreamProgress(existing.workstreamId);

  return NextResponse.json(task);
}

/**
 * DELETE /api/deals/[id]/tasks — Delete a DD task (pass { id } in body)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  void (await params);
  const body = await req.json();
  const taskId = body?.id;
  if (!taskId) {
    return NextResponse.json({ error: "Task id required" }, { status: 400 });
  }

  const existing = await prisma.dDTask.findUnique({
    where: { id: taskId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await prisma.dDTask.delete({ where: { id: taskId } });
  await recalcWorkstreamProgress(existing.workstreamId);

  return NextResponse.json({ success: true });
}
