import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateCoInvestorSchema } from "@/lib/schemas";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: dealId } = await params;
  const firmId = req.nextUrl.searchParams.get("firmId");

  // Verify the deal belongs to the firmId
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { id: true, firmId: true },
  });
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  if (firmId && deal.firmId !== firmId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const coInvestors = await prisma.dealCoInvestor.findMany({
    where: { dealId },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      company: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(coInvestors);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: dealId } = await params;
  const firmId = req.nextUrl.searchParams.get("firmId");

  // Verify the deal belongs to the firmId
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { id: true, firmId: true },
  });
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  if (firmId && deal.firmId !== firmId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await parseBody(req, CreateCoInvestorSchema);
  if (error) return error;

  const coInvestor = await prisma.dealCoInvestor.create({
    data: {
      dealId,
      contactId: data!.contactId,
      companyId: data!.companyId,
      role: data!.role,
      allocation: data!.allocation,
      status: data!.status,
      notes: data!.notes,
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      company: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(coInvestor, { status: 201 });
}
