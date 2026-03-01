import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ investorId: string }> }
) {
  const { investorId } = await params;
  const investor = await prisma.investor.findUnique({
    where: { id: investorId },
    include: {
      commitments: { select: { entityId: true } },
    },
  });
  if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const entityIds = investor.commitments.map((c) => c.entityId);
  const documents = await prisma.document.findMany({
    where: {
      OR: [{ entityId: { in: entityIds } }, { investorId }],
    },
    include: { entity: { select: { name: true } } },
    orderBy: { uploadDate: "desc" },
  });
  return NextResponse.json(documents);
}
