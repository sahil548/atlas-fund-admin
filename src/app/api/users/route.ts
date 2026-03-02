import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

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
    },
  });
  return NextResponse.json(users);
}
