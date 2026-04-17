import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateLeaseSchema } from "@/lib/schemas";
import { getAuthUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string; leaseId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id, leaseId } = await params;
    await getAuthUser();

    const lease = await prisma.lease.findFirst({
      where: { id: leaseId, assetId: id },
    });

    if (!lease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    return NextResponse.json(lease);
  } catch (err) {
    logger.error("[assets/[id]/leases/[leaseId]] GET error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load lease" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const { id, leaseId } = await params;
    await getAuthUser();

    const { data, error } = await parseBody(req, UpdateLeaseSchema);
    if (error) return error;

    const existing = await prisma.lease.findFirst({
      where: { id: leaseId, assetId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    const { leaseStartDate, leaseEndDate, ...rest } = data!;

    const lease = await prisma.lease.update({
      where: { id: leaseId },
      data: {
        ...rest,
        ...(leaseStartDate ? { leaseStartDate: new Date(leaseStartDate) } : {}),
        ...(leaseEndDate ? { leaseEndDate: new Date(leaseEndDate) } : {}),
      },
    });

    return NextResponse.json(lease);
  } catch (err) {
    logger.error("[assets/[id]/leases/[leaseId]] PUT error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to update lease" }, { status: 500 });
  }
}
