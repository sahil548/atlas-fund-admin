import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { z } from "zod";

const GrantAccessSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["primary", "viewer", "admin"]).default("viewer"),
});

const RevokeAccessSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await prisma.investorUserAccess.findMany({
    where: { investorId: id },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, isActive: true, initials: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(access);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, GrantAccessSchema);
  if (error) return error;

  // Check investor exists
  const investor = await prisma.investor.findUnique({ where: { id } });
  if (!investor) return NextResponse.json({ error: "Investor not found" }, { status: 404 });

  // Check user exists
  const user = await prisma.user.findUnique({ where: { id: data!.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Check for existing access
  const existing = await prisma.investorUserAccess.findUnique({
    where: { investorId_userId: { investorId: id, userId: data!.userId } },
  });
  if (existing) {
    return NextResponse.json({ error: "User already has access to this investor" }, { status: 400 });
  }

  const access = await prisma.investorUserAccess.create({
    data: {
      investorId: id,
      userId: data!.userId,
      role: data!.role,
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
    },
  });
  return NextResponse.json(access, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, RevokeAccessSchema);
  if (error) return error;

  const existing = await prisma.investorUserAccess.findUnique({
    where: { investorId_userId: { investorId: id, userId: data!.userId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Access record not found" }, { status: 404 });
  }

  await prisma.investorUserAccess.delete({
    where: { investorId_userId: { investorId: id, userId: data!.userId } },
  });
  return NextResponse.json({ success: true });
}
