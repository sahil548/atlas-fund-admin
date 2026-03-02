import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateDealSchema, KillDealSchema } from "@/lib/schemas";
import { killDeal } from "@/lib/deal-stage-engine";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      workstreams: {
        include: { tasks: { orderBy: { createdAt: "asc" } } },
        orderBy: { name: "asc" },
      },
      screeningResult: true,
      icProcess: {
        include: {
          votes: { include: { user: true } },
          decidedBy: { select: { id: true, name: true, initials: true } },
        },
      },
      icQuestions: {
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
      },
      closingChecklist: true,
      documents: true,
      meetings: { orderBy: { meetingDate: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" } },
      targetEntity: { select: { id: true, name: true } },
    },
  });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(deal);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, UpdateDealSchema);
  if (error) return error;

  const updateData: Record<string, unknown> = {};
  if (data!.name !== undefined) updateData.name = data!.name;
  if (data!.dealCategory !== undefined) updateData.dealCategory = data!.dealCategory;
  if (data!.sector !== undefined) updateData.sector = data!.sector;
  if (data!.targetSize !== undefined) updateData.targetSize = data!.targetSize;
  if (data!.targetCheckSize !== undefined) updateData.targetCheckSize = data!.targetCheckSize;
  if (data!.targetReturn !== undefined) updateData.targetReturn = data!.targetReturn;
  if (data!.leadPartner !== undefined) updateData.leadPartner = data!.leadPartner;
  if (data!.gpName !== undefined) updateData.gpName = data!.gpName;
  if (data!.source !== undefined) updateData.source = data!.source;
  if (data!.counterparty !== undefined) updateData.counterparty = data!.counterparty;
  if (data!.entityId !== undefined) updateData.entityId = data!.entityId;
  if (data!.description !== undefined) updateData.description = data!.description;
  if (data!.thesisNotes !== undefined) updateData.thesisNotes = data!.thesisNotes;
  if (data!.investmentRationale !== undefined) updateData.investmentRationale = data!.investmentRationale;
  if (data!.additionalContext !== undefined) updateData.additionalContext = data!.additionalContext;

  const deal = await prisma.deal.update({ where: { id }, data: updateData });
  return NextResponse.json(deal);
}

/**
 * PATCH /api/deals/[id] — Kill deal (only action supported via PATCH now)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, KillDealSchema);
  if (error) return error;

  if (data!.action === "KILL") {
    try {
      const deal = await killDeal(id);
      return NextResponse.json(deal);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
