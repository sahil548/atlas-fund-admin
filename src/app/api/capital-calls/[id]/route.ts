import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateCapitalCallSchema } from "@/lib/schemas";
import { getAuthUser, forbidden } from "@/lib/auth";
import { getEffectivePermissions, checkPermission } from "@/lib/permissions";
import { notifyInvestorsOnCapitalCall } from "@/lib/notification-delivery";
import { logger } from "@/lib/logger";

// Valid status transitions (includes revert to DRAFT)
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["ISSUED", "OVERDUE"],
  ISSUED: ["OVERDUE", "DRAFT"],
  PARTIALLY_FUNDED: ["OVERDUE", "DRAFT"],
  FUNDED: ["DRAFT"],
  OVERDUE: ["DRAFT"],
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

    const call = await prisma.capitalCall.findFirst({
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

    if (!call) {
      return NextResponse.json({ error: "Capital call not found" }, { status: 404 });
    }

    // SERVICE_PROVIDER entity-scope: check entity membership
    if (authUser && authUser.role === "SERVICE_PROVIDER") {
      if (!authUser.entityAccess.includes(call.entityId)) return forbidden();
    }

    // Compute summary stats
    const totalLineItems = call.lineItems.length;
    const fundedLineItems = call.lineItems.filter(
      (li) => li.status === "Funded",
    ).length;
    const totalFunded = call.lineItems
      .filter((li) => li.status === "Funded")
      .reduce((sum, li) => sum + li.amount, 0);
    const totalPending = call.lineItems
      .filter((li) => li.status === "Pending")
      .reduce((sum, li) => sum + li.amount, 0);

    return NextResponse.json({
      ...call,
      _summary: {
        totalLineItems,
        fundedLineItems,
        pendingLineItems: totalLineItems - fundedLineItems,
        totalFunded,
        totalPending,
      },
    });
  } catch (err) {
    logger.error("[capital-calls/[id]] GET error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to load capital call" },
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
    const { data, error } = await parseBody(req, UpdateCapitalCallSchema);
    if (error) return error;

    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    // GP_TEAM permission check
    if (authUser && authUser.role === "GP_TEAM") {
      const perms = await getEffectivePermissions(authUser.id);
      if (!checkPermission(perms, "capital_activity", "full")) return forbidden();
    }

    const existing = await prisma.capitalCall.findFirst({
      where: firmId ? { id, entity: { firmId } } : { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Capital call not found" }, { status: 404 });
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

    // Fields that require DRAFT status to edit
    const draftOnlyFields = ["amount", "callNumber", "callDate"] as const;
    const hasDraftOnlyUpdates = draftOnlyFields.some((f) => data![f] !== undefined);
    if (hasDraftOnlyUpdates && existing.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Amount, call number, and call date can only be edited when status is DRAFT" },
        { status: 400 },
      );
    }

    const updated = await prisma.capitalCall.update({
      where: { id },
      data: {
        ...(data!.status && { status: data!.status }),
        ...(data!.purpose !== undefined && { purpose: data!.purpose }),
        ...(data!.dueDate && { dueDate: new Date(data!.dueDate) }),
        ...(data!.amount !== undefined && { amount: data!.amount }),
        ...(data!.callNumber !== undefined && { callNumber: data!.callNumber }),
        ...(data!.callDate && { callDate: new Date(data!.callDate) }),
      },
      include: {
        entity: { select: { id: true, name: true } },
        lineItems: { include: { investor: { select: { id: true, name: true } } } },
      },
    });

    // Fire-and-forget: notify investors when status transitions to ISSUED
    if (data!.status === "ISSUED" && existing.status !== "ISSUED") {
      notifyInvestorsOnCapitalCall(id).catch((e: unknown) => logger.error("Operation failed", { error: e instanceof Error ? e.message : String(e) }));
    }

    return NextResponse.json(updated);
  } catch (err) {
    logger.error("[capital-calls/[id]] PATCH error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to update capital call" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    if (authUser && authUser.role === "GP_TEAM") {
      const perms = await getEffectivePermissions(authUser.id);
      if (!checkPermission(perms, "capital_activity", "full")) return forbidden();
    }

    const call = await prisma.capitalCall.findFirst({
      where: firmId ? { id, entity: { firmId } } : { id },
      include: {
        lineItems: { select: { id: true, status: true } },
      },
    });

    if (!call) {
      return NextResponse.json({ error: "Capital call not found" }, { status: 404 });
    }

    if (call.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Cannot delete: capital call is not in DRAFT status. Only draft capital calls can be deleted." },
        { status: 400 },
      );
    }

    const fundedItems = call.lineItems.filter((li) => li.status === "Funded");
    if (fundedItems.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${fundedItems.length} line item(s) already funded. Remove funded items first.` },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.document.updateMany({ where: { capitalCallId: id }, data: { capitalCallId: null } }),
      prisma.capitalCallLineItem.deleteMany({ where: { capitalCallId: id } }),
      prisma.capitalCall.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("[capital-calls/[id]] DELETE error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to delete capital call" }, { status: 500 });
  }
}
