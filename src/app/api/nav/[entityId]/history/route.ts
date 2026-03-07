import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  try {
    const { entityId } = await params;
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    // Firm guard: verify entity belongs to the authenticated firm
    if (firmId) {
      const entity = await prisma.entity.findUnique({
        where: { id: entityId },
        select: { firmId: true },
      });
      if (!entity || entity.firmId !== firmId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const history = await prisma.nAVComputation.findMany({
      where: { entityId },
      orderBy: { periodDate: "desc" },
      select: {
        id: true,
        periodDate: true,
        costBasisNAV: true,
        economicNAV: true,
        unrealizedGain: true,
        accruedCarry: true,
        createdAt: true,
      },
    });

    return NextResponse.json(history);
  } catch (err) {
    console.error("[nav/history]", err);
    return NextResponse.json({ error: "Failed to load NAV history" }, { status: 500 });
  }
}
