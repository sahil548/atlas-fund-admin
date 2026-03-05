import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const authUser = await getAuthUser();

  // Only return the user's own firm (no cross-tenant leakage)
  const where = authUser?.firmId ? { id: authUser.firmId } : {};

  const firms = await prisma.firm.findMany({
    where,
    orderBy: { name: "asc" },
    select: { id: true, name: true, legalName: true, createdAt: true },
  });
  return NextResponse.json(firms);
}
