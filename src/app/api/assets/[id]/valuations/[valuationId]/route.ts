import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateValuationSchema } from "@/lib/schemas";
import { getAuthUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string; valuationId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id, valuationId } = await params;
    await getAuthUser();

    const valuation = await prisma.valuation.findFirst({
      where: { id: valuationId, assetId: id },
    });

    if (!valuation) {
      return NextResponse.json({ error: "Valuation not found" }, { status: 404 });
    }

    return NextResponse.json(valuation);
  } catch (err) {
    logger.error("[valuations/[valuationId]] GET error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load valuation" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const { id, valuationId } = await params;
    const authUser = await getAuthUser();

    const { data, error } = await parseBody(req, UpdateValuationSchema);
    if (error) return error;

    const existing = await prisma.valuation.findFirst({
      where: { id: valuationId, assetId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Valuation not found" }, { status: 404 });
    }

    // Only allow field edits (not status change) when DRAFT
    const fieldKeys = ["valuationDate", "method", "fairValue", "moic", "notes"] as const;
    const hasFieldUpdates = fieldKeys.some((f) => data![f] !== undefined);
    if (hasFieldUpdates && existing.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Field updates are only allowed when valuation status is DRAFT" },
        { status: 400 },
      );
    }

    // Phase 22-13: audit-trail stamping on approval transitions.
    // Prefer the Clerk-authenticated user; fall back to the userId the form sent
    // (the mock UserProvider in dev doesn't flow through Clerk's session).
    let approvalUpdate: Record<string, unknown> = {};
    if (data!.status !== undefined && data!.status !== existing.status) {
      if (data!.status === "APPROVED") {
        approvalUpdate = {
          approvedBy: authUser?.id ?? data!.approvedBy ?? null,
          approvedAt: new Date(),
        };
      } else if (existing.status === "APPROVED") {
        // APPROVED → DRAFT (revert): clear the approval stamp so re-approval
        // captures the new approver and timestamp.
        approvalUpdate = {
          approvedBy: null,
          approvedAt: null,
        };
      }
    }

    const valuation = await prisma.valuation.update({
      where: { id: valuationId },
      data: {
        ...(data!.valuationDate && { valuationDate: new Date(data!.valuationDate) }),
        ...(data!.method !== undefined && { method: data!.method }),
        ...(data!.fairValue !== undefined && { fairValue: data!.fairValue }),
        ...(data!.moic !== undefined && { moic: data!.moic }),
        ...(data!.notes !== undefined && { notes: data!.notes }),
        ...(data!.status !== undefined && { status: data!.status }),
        ...approvalUpdate,
      },
    });

    // If approved, update asset fairValue to match
    if (data!.status === "APPROVED" && data!.fairValue !== undefined) {
      await prisma.asset.update({
        where: { id },
        data: { fairValue: data!.fairValue },
      });
    }

    return NextResponse.json(valuation);
  } catch (err) {
    logger.error("[valuations/[valuationId]] PUT error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to update valuation" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id, valuationId } = await params;
    await getAuthUser();

    const valuation = await prisma.valuation.findFirst({
      where: { id: valuationId, assetId: id },
    });

    if (!valuation) {
      return NextResponse.json({ error: "Valuation not found" }, { status: 404 });
    }

    if (valuation.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Cannot delete: only DRAFT valuations can be deleted. Approved valuations are permanent records." },
        { status: 400 },
      );
    }

    await prisma.valuation.delete({ where: { id: valuationId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("[valuations/[valuationId]] DELETE error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to delete valuation" }, { status: 500 });
  }
}
