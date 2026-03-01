import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ investorId: string }> }
) {
  const { investorId } = await params;
  const [callLineItems, distLineItems] = await Promise.all([
    prisma.capitalCallLineItem.findMany({
      where: { investorId },
      include: { capitalCall: { include: { entity: true } } },
      orderBy: { capitalCall: { callDate: "desc" } },
    }),
    prisma.distributionLineItem.findMany({
      where: { investorId },
      include: { distribution: { include: { entity: true } } },
      orderBy: { distribution: { distributionDate: "desc" } },
    }),
  ]);
  return NextResponse.json({ capitalCalls: callLineItems, distributions: distLineItems });
}
