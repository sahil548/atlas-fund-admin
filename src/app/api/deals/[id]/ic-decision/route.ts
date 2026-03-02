import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { ICDecisionSchema } from "@/lib/schemas";
import { checkAndAdvanceDeal } from "@/lib/deal-stage-engine";

/**
 * POST /api/deals/[id]/ic-decision
 * Record IC decision (APPROVED, REJECTED, SEND_BACK) and auto-advance deal.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, ICDecisionSchema);
  if (error) return error;

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: { icProcess: true },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  if (deal.stage !== "IC_REVIEW") {
    return NextResponse.json(
      { error: "Deal must be in IC_REVIEW stage" },
      { status: 400 },
    );
  }

  if (!deal.icProcess) {
    return NextResponse.json(
      { error: "No IC process found for this deal" },
      { status: 400 },
    );
  }

  if (deal.icProcess.finalDecision) {
    return NextResponse.json(
      { error: "IC decision already recorded" },
      { status: 400 },
    );
  }

  // Record the decision
  await prisma.iCProcess.update({
    where: { id: deal.icProcess.id },
    data: {
      finalDecision: data!.decision,
      decidedById: data!.userId,
      decidedAt: new Date(),
      decisionNotes: data!.notes || null,
      status: data!.decision === "APPROVED" ? "approved" : data!.decision === "REJECTED" ? "rejected" : "sent_back",
    },
  });

  // Auto-advance based on decision
  const updatedDeal = await checkAndAdvanceDeal(id);

  return NextResponse.json(updatedDeal);
}
