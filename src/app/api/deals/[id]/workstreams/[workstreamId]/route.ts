import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api-helpers";

const UpdateWorkstreamSchema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETE"]).optional(),
  assigneeId: z.string().nullable().optional(),
  priority: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; workstreamId: string }> },
) {
  const { id, workstreamId } = await params;

  const workstream = await prisma.dDWorkstream.findFirst({
    where: { id: workstreamId, dealId: id },
    include: {
      comments: {
        where: { parentId: null },
        include: {
          author: { select: { id: true, name: true, initials: true } },
          replies: {
            include: {
              author: { select: { id: true, name: true, initials: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      attachments: {
        orderBy: { createdAt: "desc" },
      },
      assignee: { select: { id: true, name: true, initials: true } },
      tasks: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!workstream) {
    return NextResponse.json({ error: "Workstream not found" }, { status: 404 });
  }

  return NextResponse.json(workstream);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; workstreamId: string }> },
) {
  const { id, workstreamId } = await params;
  const { data, error } = await parseBody(req, UpdateWorkstreamSchema);
  if (error) return error;

  // Verify workstream belongs to deal
  const existing = await prisma.dDWorkstream.findFirst({
    where: { id: workstreamId, dealId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Workstream not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (data!.status !== undefined) updateData.status = data!.status;
  if (data!.assigneeId !== undefined) updateData.assigneeId = data!.assigneeId;
  if (data!.priority !== undefined) updateData.priority = data!.priority;
  if (data!.dueDate !== undefined) {
    updateData.dueDate = data!.dueDate ? new Date(data!.dueDate) : null;
  }

  const workstream = await prisma.dDWorkstream.update({
    where: { id: workstreamId },
    data: updateData,
    include: {
      assignee: { select: { id: true, name: true, initials: true } },
      tasks: { orderBy: { createdAt: "asc" } },
      comments: {
        where: { parentId: null },
        include: {
          author: { select: { id: true, name: true, initials: true } },
          replies: {
            include: {
              author: { select: { id: true, name: true, initials: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      attachments: true,
    },
  });

  return NextResponse.json(workstream);
}
