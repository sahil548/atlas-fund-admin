import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api-helpers";
import { CastICVoteSchema } from "@/lib/schemas";
import { sendBackToDueDiligence } from "@/lib/deal-stage-engine";

/**
 * POST /api/deals/[id]/ic/vote
 * Cast an individual IC vote (in-app). Separate from the final IC decision.
 * Votes can include conditions (text note).
 * SEND_BACK triggers deal stage change to DUE_DILIGENCE.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: dealId } = await params;
  const { data, error } = await parseBody(req, CastICVoteSchema);
  if (error) return error;

  // Fetch the deal with IC process
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      icProcess: { include: { votes: true } },
      targetEntity: {
        select: {
          decisionStructure: {
            include: { members: true },
          },
        },
      },
    },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  if (!deal.icProcess) {
    return NextResponse.json(
      { error: "No IC process found for this deal. Send to IC Review first." },
      { status: 404 },
    );
  }

  // Check for duplicate vote
  const existingVote = deal.icProcess.votes.find(
    (v) => v.userId === data!.userId,
  );
  if (existingVote) {
    return NextResponse.json(
      { error: "You have already voted on this deal" },
      { status: 409 },
    );
  }

  // Create the vote record
  const voteRecord = await prisma.iCVoteRecord.create({
    data: {
      icProcessId: deal.icProcess.id,
      userId: data!.userId,
      vote: data!.vote,
      notes: data!.conditions || null,
      conditions: data!.conditions || null,
    },
    include: {
      user: { select: { id: true, name: true, initials: true } },
    },
  });

  // If SEND_BACK, trigger stage change
  if (data!.vote === "SEND_BACK") {
    try {
      await sendBackToDueDiligence(
        dealId,
        data!.conditions || "Sent back by IC voter",
      );
    } catch (err) {
      // Log but don't fail the vote if send back fails
      console.error("[IC Vote] Send back failed:", err);
    }
  }

  // Check vote counts against decision structure threshold
  const allVotes = [...deal.icProcess.votes, voteRecord];
  const approveCount = allVotes.filter((v) => v.vote === "APPROVE").length;
  const totalVotes = allVotes.length;

  // Get decision structure info if available
  const structure = deal.targetEntity?.decisionStructure;
  let quorumMet = false;
  let thresholdMet = false;

  if (structure) {
    const voterCount = structure.members.filter(
      (m) => m.role === "VOTER" || !m.role,
    ).length;
    quorumMet = totalVotes >= structure.quorumRequired;
    thresholdMet = approveCount >= structure.approvalThreshold;

    // Update IC process status based on vote counts (do not auto-advance)
    await prisma.iCProcess.update({
      where: { id: deal.icProcess.id },
      data: {
        status: thresholdMet && quorumMet
          ? "threshold_met"
          : `${totalVotes}_of_${voterCount}_voted`,
      },
    });
  }

  return NextResponse.json(
    {
      vote: voteRecord,
      summary: {
        totalVotes,
        approveCount,
        rejectCount: allVotes.filter((v) => v.vote === "REJECT").length,
        sendBackCount: allVotes.filter((v) => v.vote === "SEND_BACK").length,
        quorumMet,
        thresholdMet,
      },
    },
    { status: 201 },
  );
}
