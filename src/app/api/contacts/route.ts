import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const firmId = req.nextUrl.searchParams.get("firmId");
  const companyId = req.nextUrl.searchParams.get("companyId");
  const type = req.nextUrl.searchParams.get("type");
  const where: Record<string, unknown> = {};
  if (firmId) where.firmId = firmId;
  if (companyId) where.companyId = companyId;
  if (type) where.type = type;

  const contacts = await prisma.contact.findMany({
    where,
    include: {
      company: { select: { id: true, name: true, type: true } },
      investorProfile: { select: { id: true, name: true, investorType: true, kycStatus: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return NextResponse.json(contacts);
}

export async function POST(req: Request) {
  const body = await req.json();
  const contact = await prisma.contact.create({
    data: {
      firmId: body.firmId || "firm-1",
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      title: body.title,
      type: body.type || "EXTERNAL",
      companyId: body.companyId,
      notes: body.notes,
    },
  });
  return NextResponse.json(contact, { status: 201 });
}
