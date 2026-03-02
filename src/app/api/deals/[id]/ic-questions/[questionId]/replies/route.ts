import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateICReplySchema } from "@/lib/schemas";

/**
 * POST /api/deals/[id]/ic-questions/[questionId]/replies
 * Add a reply to an IC question thread.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> },
) {
  const { questionId } = await params;
  const { data, error } = await parseBody(req, CreateICReplySchema);
  if (error) return error;

  // Verify the question exists
  const question = await prisma.iCQuestion.findUnique({
    where: { id: questionId },
  });

  if (!question) {
    return NextResponse.json(
      { error: "Question not found" },
      { status: 404 },
    );
  }

  const reply = await prisma.iCQuestionReply.create({
    data: {
      questionId,
      authorId: data!.authorId,
      content: data!.content,
    },
    include: {
      author: { select: { id: true, name: true, initials: true } },
    },
  });

  return NextResponse.json(reply, { status: 201 });
}
