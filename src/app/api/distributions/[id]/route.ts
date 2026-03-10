import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateDistributionSchema } from "@/lib/schemas";
import { getAuthUser, forbidden } from "@/lib/auth";
import { getEffectivePermissions, checkPermission } from "@/lib/permissions";
import { recomputeAllInvestorCapitalAccounts } from "@/lib/capital-activity-engine";
import { notifyInvestorsOnDistribution } from "@/lib/notification-delivery";

// Valid forward-only status transitions
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["APPROVED"],
  APPROVED: ["PAID"],
  PAID: [],
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    // GP_TEAM permission check (only when authenticated)
    if (authUser && authUser.role === "GP_TEAM") {
      const perms = await getEffectivePermissions(authUser.id);
      if (!checkPermission(perms, "capital_activity", "read_only")) return forbidden();
    }

    const distribution = await prisma.distributionEvent.findFirst({
      where: firmId ? { id, entity: { firmId } } : { id },
      include: {
        entity: { select: { id: true, name: true } },
        lineItems: {
          include: {
            investor: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        documents: {
          select: {
            id: true,
            name: true,
            fileUrl: true,
            fileSize: true,
            mimeType: true,
            uploadDate: true,
            category: true,
          },
        },
      },
    });

    if (!distribution) {
      return NextResponse.json({ error: "Distribution not found" }, { status: 404 });
    }

    // SERVICE_PROVIDER entity-scope: check entity membership
    if (authUser && authUser.role === "SERVICE_PROVIDER") {
      if (!authUser.entityAccess.includes(distribution.entityId)) return forbidden();
    }

    // Summary stats
    const totalGross = distribution.lineItems.reduce(
      (sum, li) => sum + li.grossAmount,
      0,
    );
    const totalNet = distribution.lineItems.reduce(
      (sum, li) => sum + li.netAmount,
      0,
    );

    return NextResponse.json({
      ...distribution,
      _summary: {
        totalLineItems: distribution.lineItems.length,
        totalGross,
        totalNet,
      },
    });
  } catch (err) {
    console.error("[distributions/[id]] GET error:", err);
    return NextResponse.json(
      { error: "Failed to load distribution" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { data, error } = await parseBody(req, UpdateDistributionSchema);
    if (error) return error;

    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    // GP_TEAM permission check
    if (authUser && authUser.role === "GP_TEAM") {
      const perms = await getEffectivePermissions(authUser.id);
      if (!checkPermission(perms, "capital_activity", "full")) return forbidden();
    }

    const existing = await prisma.distributionEvent.findFirst({
      where: firmId ? { id, entity: { firmId } } : { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Distribution not found" }, { status: 404 });
    }

    // Validate status transitions
    if (data!.status && data!.status !== existing.status) {
      const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(data!.status)) {
        return NextResponse.json(
          {
            error: `Cannot transition from ${existing.status} to ${data!.status}`,
          },
          { status: 400 },
        );
      }
    }

    // Only allow field updates when DRAFT
    const fieldsToUpdate = [
      "grossAmount",
      "returnOfCapital",
      "income",
      "longTermGain",
      "shortTermGain",
      "carriedInterest",
      "netToLPs",
      "distributionType",
      "memo",
    ] as const;

    const hasFieldUpdates = fieldsToUpdate.some(
      (f) => data![f] !== undefined,
    );

    if (hasFieldUpdates && existing.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Field updates are only allowed when status is DRAFT" },
        { status: 400 },
      );
    }

    const updated = await prisma.distributionEvent.update({
      where: { id },
      data: {
        ...(data!.status && { status: data!.status }),
        ...(data!.grossAmount !== undefined && { grossAmount: data!.grossAmount }),
        ...(data!.returnOfCapital !== undefined && { returnOfCapital: data!.returnOfCapital }),
        ...(data!.income !== undefined && { income: data!.income }),
        ...(data!.longTermGain !== undefined && { longTermGain: data!.longTermGain }),
        ...(data!.shortTermGain !== undefined && { shortTermGain: data!.shortTermGain }),
        ...(data!.carriedInterest !== undefined && { carriedInterest: data!.carriedInterest }),
        ...(data!.netToLPs !== undefined && { netToLPs: data!.netToLPs }),
        ...(data!.distributionType !== undefined && { distributionType: data!.distributionType }),
        ...(data!.memo !== undefined && { memo: data!.memo }),
      },
      include: {
        entity: { select: { id: true, name: true } },
        lineItems: { include: { investor: { select: { id: true, name: true } } } },
      },
    });

    // When marked PAID — recompute all investor capital accounts and notify investors
    if (data!.status === "PAID" && existing.status !== "PAID") {
      await recomputeAllInvestorCapitalAccounts(existing.entityId);
      // Fire-and-forget: notify investors (never blocks the status change)
      notifyInvestorsOnDistribution(id).catch(console.error);
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[distributions/[id]] PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to update distribution" },
      { status: 500 },
    );
  }
}
