import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const investor = await prisma.investor.findUnique({
    where: { id },
    include: {
      commitments: { include: { entity: true } },
      sideLetters: { include: { entity: true } },
      capitalAccounts: { orderBy: { periodDate: "desc" } },
      notificationPreference: true,
    },
  });
  if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(investor);
}
