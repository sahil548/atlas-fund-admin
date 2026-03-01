import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const deals = await prisma.deal.findMany({
    include: {
      workstreams: { include: { tasks: true } },
      screeningResult: true,
      icProcess: { include: { votes: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(deals);
}
