import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateClosingChecklistItemSchema } from "@/lib/schemas";
import { CLOSING_CHECKLIST_TEMPLATES } from "@/lib/closing-templates";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const items = await prisma.closingChecklist.findMany({
    where: { dealId: id },
    include: {
      assignedTo: { select: { id: true, name: true, initials: true } },
    },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  // Initialize from templates
  if (body.action === "INITIALIZE") {
    const existing = await prisma.closingChecklist.count({ where: { dealId: id } });
    if (existing > 0) {
      return NextResponse.json({ error: "Checklist already initialized" }, { status: 400 });
    }

    const items = await prisma.$transaction(
      CLOSING_CHECKLIST_TEMPLATES.map((t) =>
        prisma.closingChecklist.create({
          data: {
            dealId: id,
            title: t.title,
            order: t.order,
            status: "NOT_STARTED",
          },
        }),
      ),
    );

    return NextResponse.json(items, { status: 201 });
  }

  // Single item creation
  const item = await prisma.closingChecklist.create({
    data: {
      dealId: id,
      title: body.title,
      assigneeId: body.assigneeId || null,
      order: body.order || 0,
      notes: body.notes || null,
      ...(body.dueDate ? { dueDate: new Date(body.dueDate) } : {}),
    },
  });
  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(req: Request) {
  const { data, error } = await parseBody(req, UpdateClosingChecklistItemSchema);
  if (error) return error;

  const updateData: Record<string, unknown> = {};
  if (data!.status !== undefined) updateData.status = data!.status;
  if (data!.assigneeId !== undefined) updateData.assigneeId = data!.assigneeId;
  if (data!.dueDate !== undefined) {
    updateData.dueDate = data!.dueDate ? new Date(data!.dueDate) : null;
  }
  if (data!.notes !== undefined) updateData.notes = data!.notes;

  const item = await prisma.closingChecklist.update({
    where: { id: data!.id },
    data: updateData,
    include: {
      assignedTo: { select: { id: true, name: true, initials: true } },
    },
  });
  return NextResponse.json(item);
}
