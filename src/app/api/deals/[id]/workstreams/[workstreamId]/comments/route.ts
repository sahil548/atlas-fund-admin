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
  { params }: { params: Promise<{ id: string; workstreamId: string }> },
) {
  const { id, workstreamId } = await params;

  // Verify workstream belongs to deal
  const workstream = await prisma.dDWorkstream.findFirst({
    where: { id: workstreamId, dealId: id },
    select: { id: true },
  });
  if (!workstream) {
    return NextResponse.json({ error: "Workstream not found" }, { status: 404 });
  }

  const comments = await prisma.dDWorkstreamComment.findMany({
    where: { workstreamId, parentId: null },
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
  { params }: { params: Promise<{ id: string; workstreamId: string }> },
) {
  const { id, workstreamId } = await params;
  const { data, error } = await parseBody(req, CreateCommentSchema);
  if (error) return error;

  // Verify workstream belongs to deal
  const workstream = await prisma.dDWorkstream.findFirst({
    where: { id: workstreamId, dealId: id },
    select: { id: true },
  });
  if (!workstream) {
    return NextResponse.json({ error: "Workstream not found" }, { status: 404 });
  }

  // Get current user from auth context
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // If parentId is provided, verify parent comment exists and belongs to this workstream
  if (data!.parentId) {
    const parentComment = await prisma.dDWorkstreamComment.findFirst({
      where: { id: data!.parentId, workstreamId },
    });
    if (!parentComment) {
      return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
    }
  }

  const comment = await prisma.dDWorkstreamComment.create({
    data: {
      workstreamId,
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
