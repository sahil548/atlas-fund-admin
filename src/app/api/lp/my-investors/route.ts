import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/lp/my-investors?userId=xxx
 *
 * Returns investors the given user has access to via InvestorUserAccess.
 * For GP_ADMIN/GP_TEAM users, returns ALL investors (for LP preview mode).
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Check if user is a GP user — they get access to all investors
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, firmId: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isGpUser = user.role === "GP_ADMIN" || user.role === "GP_TEAM";

  if (isGpUser) {
    // GP users see investors that have commitments to entities in their firm
    // This excludes orphaned investors (no commitments) and investors from other firms
    const investors = await prisma.investor.findMany({
      where: {
        commitments: { some: { entity: { firmId: user.firmId } } },
      },
      include: {
        commitments: { include: { entity: { select: { id: true, name: true } } } },
        company: { select: { id: true, name: true } },
      },
      orderBy: { totalCommitted: "desc" },
    });
    return NextResponse.json(
      investors.map((inv) => ({ ...inv, accessRole: "admin" }))
    );
  }

  // LP users see only their linked investors
  const access = await prisma.investorUserAccess.findMany({
    where: { userId },
    include: {
      investor: {
        include: {
          commitments: { include: { entity: { select: { id: true, name: true } } } },
          company: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json(
    access.map((a) => ({ ...a.investor, accessRole: a.role }))
  );
}
