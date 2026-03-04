import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { z } from "zod";

const CreateUserSchema = z.object({
  contactId: z.string().min(1, "Contact is required"),
  role: z.enum(["GP_ADMIN", "GP_TEAM", "SERVICE_PROVIDER", "LP_INVESTOR"]),
  firmId: z.string().min(1, "Firm ID is required"),
});

export async function GET(req: NextRequest) {
  const firmId = req.nextUrl.searchParams.get("firmId");
  const where: Record<string, unknown> = {};
  if (firmId) where.firmId = firmId;

  const users = await prisma.user.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      initials: true,
      createdAt: true,
      firmId: true,
      contactId: true,
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const { data, error } = await parseBody(req, CreateUserSchema);
  if (error) return error;

  // Look up the contact to derive name and email
  const contact = await prisma.contact.findUnique({
    where: { id: data!.contactId },
    select: { firstName: true, lastName: true, email: true },
  });
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const name = `${contact.firstName} ${contact.lastName}`.trim();
  const email = contact.email || `${contact.firstName.toLowerCase()}.${contact.lastName.toLowerCase()}@placeholder.com`;

  // Generate initials from name
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role: data!.role,
      firmId: data!.firmId,
      contactId: data!.contactId,
      initials,
    },
  });
  return NextResponse.json(user, { status: 201 });
}
