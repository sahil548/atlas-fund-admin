import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateCoInvestorSchema } from "@/lib/schemas";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; coInvestorId: string }> },
) {
  const { id: dealId, coInvestorId } = await params;
  const firmId = req.nextUrl.searchParams.get("firmId");

  // Verify the co-investor belongs to the deal and firm
  const existing = await prisma.dealCoInvestor.findUnique({
    where: { id: coInvestorId },
    include: { deal: { select: { id: true, firmId: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Co-investor not found" }, { status: 404 });
  if (existing.dealId !== dealId)
    return NextResponse.json({ error: "Co-investor does not belong to this deal" }, { status: 400 });
  if (firmId && existing.deal.firmId !== firmId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await parseBody(req, UpdateCoInvestorSchema);
  if (error) return error;

  const updateData: Record<string, unknown> = {};
  if (data!.role !== undefined) updateData.role = data!.role;
  if (data!.allocation !== undefined) updateData.allocation = data!.allocation;
  if (data!.status !== undefined) updateData.status = data!.status;
  if (data!.notes !== undefined) updateData.notes = data!.notes;

  const updated = await prisma.dealCoInvestor.update({
    where: { id: coInvestorId },
    data: updateData,
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      company: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; coInvestorId: string }> },
) {
  const { id: dealId, coInvestorId } = await params;
  const firmId = req.nextUrl.searchParams.get("firmId");

  // Verify the co-investor belongs to the deal and firm
  const existing = await prisma.dealCoInvestor.findUnique({
    where: { id: coInvestorId },
    include: { deal: { select: { id: true, firmId: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Co-investor not found" }, { status: 404 });
  if (existing.dealId !== dealId)
    return NextResponse.json({ error: "Co-investor does not belong to this deal" }, { status: 400 });
  if (firmId && existing.deal.firmId !== firmId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.dealCoInvestor.delete({ where: { id: coInvestorId } });

  return NextResponse.json({ success: true });
}
