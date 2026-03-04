import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { z } from "zod";

const UpdateContactSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  type: z.enum(["INTERNAL", "EXTERNAL"]).optional(),
  companyId: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true, type: true } },
      investorProfile: { select: { id: true, name: true, investorType: true } },
      userAccount: { select: { id: true, name: true, email: true, role: true } },
    },
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(contact);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, UpdateContactSchema);
  if (error) return error;

  const contact = await prisma.contact.update({ where: { id }, data: data! });
  return NextResponse.json(contact);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Guard: can't delete if linked to an investor or user
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      investorProfile: { select: { id: true } },
      userAccount: { select: { id: true } },
    },
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (contact.investorProfile) {
    return NextResponse.json({ error: "Cannot delete: contact is linked to an investor profile. Remove the investor link first." }, { status: 400 });
  }
  if (contact.userAccount) {
    return NextResponse.json({ error: "Cannot delete: contact has a linked user account. Remove the user link first." }, { status: 400 });
  }

  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
