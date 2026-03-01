import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const calls = await prisma.capitalCall.findMany({
    include: {
      entity: { select: { id: true, name: true } },
      lineItems: { include: { investor: true } },
    },
    orderBy: { callDate: "desc" },
  });
  return NextResponse.json(calls);
}
