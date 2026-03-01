import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const entities = await prisma.entity.findMany({
    include: {
      accountingConnection: true,
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(entities);
}
