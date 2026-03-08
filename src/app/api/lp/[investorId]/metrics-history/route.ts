import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ investorId: string }> }
) {
  const { investorId } = await params;
  const { searchParams } = new URL(req.url);
  const granularity = searchParams.get("granularity") === "monthly" ? "monthly" : "quarterly";

  // Fetch all aggregate snapshots for this investor ordered by date ASC
  const snapshots = await prisma.metricSnapshot.findMany({
    where: {
      investorId,
      entityId: "__AGGREGATE__",
    },
    orderBy: { periodDate: "asc" },
    select: {
      periodDate: true,
      irr: true,
      tvpi: true,
      dpi: true,
      rvpi: true,
      nav: true,
    },
  });

  if (snapshots.length === 0) {
    return NextResponse.json([]);
  }

  // Group by quarter or month — take the last snapshot in each period
  const grouped = new Map<string, typeof snapshots[0]>();

  for (const snap of snapshots) {
    const d = new Date(snap.periodDate);
    let key: string;

    if (granularity === "quarterly") {
      const quarter = Math.floor(d.getUTCMonth() / 3) + 1;
      key = `Q${quarter} ${d.getUTCFullYear()}`;
    } else {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      key = `${monthNames[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    }

    // Always overwrite — last snapshot in the period wins
    grouped.set(key, snap);
  }

  const result = Array.from(grouped.entries()).map(([period, snap]) => ({
    period,
    irr: snap.irr,
    tvpi: snap.tvpi,
    dpi: snap.dpi,
    rvpi: snap.rvpi,
    nav: snap.nav,
  }));

  return NextResponse.json(result);
}
