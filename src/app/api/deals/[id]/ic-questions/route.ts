import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateICQuestionSchema, UpdateICQuestionSchema } from "@/lib/schemas";

/**
 * GET /api/deals/[id]/ic-questions — List IC questions with replies
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const questions = await prisma.iCQuestion.findMany({
    where: { dealId: id },
    include: {
      author: { select: { id: true, name: true, initials: true } },
      replies: {
        include: {
          author: { select: { id: true, name: true, initials: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(questions);
}

/**
 * POST /api/deals/[id]/ic-questions — Create a new IC question
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, CreateICQuestionSchema);
  if (error) return error;

  const question = await prisma.iCQuestion.create({
    data: {
      dealId: id,
      authorId: data!.authorId,
      content: data!.content,
    },
    include: {
      author: { select: { id: true, name: true, initials: true } },
      replies: true,
    },
  });

  return NextResponse.json(question, { status: 201 });
}

/**
 * PATCH /api/deals/[id]/ic-questions — Update IC question status
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  void (await params);
  const { data, error } = await parseBody(req, UpdateICQuestionSchema);
  if (error) return error;

  const question = await prisma.iCQuestion.update({
    where: { id: data!.id },
    data: { status: data!.status },
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

  return NextResponse.json(question);
}
