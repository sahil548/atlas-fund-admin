import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api-helpers";
import { getAuthUser } from "@/lib/auth";

const CreateCommentSchema = z.object({
  content: z.string().min(1, "Comment content is required"),
  parentId: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const { id, taskId } = await params;

  // Verify task exists and belongs to a workstream in this deal (2-step lookup)
  const task = await prisma.dDTask.findUnique({
    where: { id: taskId },
    select: { id: true, workstreamId: true },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  const ws = await prisma.dDWorkstream.findFirst({
    where: { id: task.workstreamId, dealId: id },
  });
  if (!ws) {
    return NextResponse.json({ error: "Task not in this deal" }, { status: 404 });
  }

  const comments = await prisma.dDTaskComment.findMany({
    where: { taskId, parentId: null },
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
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const { id, taskId } = await params;
  const { data, error } = await parseBody(req, CreateCommentSchema);
  if (error) return error;

  // Verify task exists and belongs to a workstream in this deal (2-step lookup)
  const task = await prisma.dDTask.findUnique({
    where: { id: taskId },
    select: { id: true, workstreamId: true },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  const ws = await prisma.dDWorkstream.findFirst({
    where: { id: task.workstreamId, dealId: id },
  });
  if (!ws) {
    return NextResponse.json({ error: "Task not in this deal" }, { status: 404 });
  }

  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // If parentId is provided, verify parent comment exists and belongs to this task
  if (data!.parentId) {
    const parentComment = await prisma.dDTaskComment.findFirst({
      where: { id: data!.parentId, taskId },
    });
    if (!parentComment) {
      return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
    }
  }

  const comment = await prisma.dDTaskComment.create({
    data: {
      taskId,
      authorId: authUser.id,
      content: data!.content,
      parentId: data!.parentId || null,
    },
    include: {
      author: { select: { id: true, name: true, initials: true } },
      replies: {
        include: {
          author: { select: { id: true, name: true, initials: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
