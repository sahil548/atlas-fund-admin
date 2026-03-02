import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const firms = await prisma.firm.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, legalName: true },
  });
  return NextResponse.json(firms);
}
