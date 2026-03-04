import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { z } from "zod";

const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["GP_ADMIN", "GP_TEAM", "SERVICE_PROVIDER", "LP_INVESTOR"]).optional(),
  initials: z.string().optional(),
  isActive: z.boolean().optional(),
  contactId: z.string().nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      investorAccess: {
        include: {
          investor: { select: { id: true, name: true, investorType: true } },
        },
      },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, UpdateUserSchema);
  if (error) return error;

  // Generate initials from name if name changed
  const updateData: Record<string, unknown> = { ...data };
  if (data!.name && !data!.initials) {
    updateData.initials = data!.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  const user = await prisma.user.update({ where: { id }, data: updateData });
  return NextResponse.json(user);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Soft-delete: set isActive = false
  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json(user);
}
