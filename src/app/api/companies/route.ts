import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const firmId = req.nextUrl.searchParams.get("firmId");
  const type = req.nextUrl.searchParams.get("type");
  const where: Record<string, unknown> = {};
  if (firmId) where.firmId = firmId;
  if (type) where.type = type;

  const companies = await prisma.company.findMany({
    where,
    include: {
      contacts: { select: { id: true, firstName: true, lastName: true, title: true, email: true } },
      _count: { select: { contacts: true } },
      investorProfile: { select: { id: true, name: true, investorType: true, kycStatus: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(companies);
}

export async function POST(req: Request) {
  const body = await req.json();
  const company = await prisma.company.create({
    data: {
      firmId: body.firmId || "firm-1",
      name: body.name,
      legalName: body.legalName,
      type: body.type || "OTHER",
      website: body.website,
      industry: body.industry,
      address: body.address,
      notes: body.notes,
    },
  });
  return NextResponse.json(company, { status: 201 });
}
