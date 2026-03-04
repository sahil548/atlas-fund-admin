import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { z } from "zod";

const UpdateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  legalName: z.string().optional(),
  type: z.enum(["GP", "LP", "COUNTERPARTY", "SERVICE_PROVIDER", "OPERATING_COMPANY", "OTHER"]).optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      contacts: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          title: true,
          type: true,
        },
        orderBy: { lastName: "asc" },
      },
      investorProfile: {
        select: {
          id: true,
          name: true,
          investorType: true,
          totalCommitted: true,
          kycStatus: true,
        },
      },
    },
  });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(company);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, UpdateCompanySchema);
  if (error) return error;

  const company = await prisma.company.update({ where: { id }, data: data! });
  return NextResponse.json(company);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Guard: can't delete if has contacts or investor profile
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      contacts: { select: { id: true } },
      investorProfile: { select: { id: true } },
    },
  });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (company.contacts.length > 0) {
    return NextResponse.json({ error: `Cannot delete: company has ${company.contacts.length} contact(s). Remove or reassign them first.` }, { status: 400 });
  }
  if (company.investorProfile) {
    return NextResponse.json({ error: "Cannot delete: company has a linked investor profile. Remove the investor link first." }, { status: 400 });
  }

  await prisma.company.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
