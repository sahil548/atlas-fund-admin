import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateEntitySchema } from "@/lib/schemas";
import { getAuthUser, forbidden } from "@/lib/auth";
import { getEffectivePermissions, checkPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { NavProxyConfigSchema } from "@/lib/json-schemas";

// Schema for the action-based PATCH body
const PatchEntityActionSchema = z.object({
  action: z.string().optional(),
  newStatus: z.enum(["ACTIVE", "WINDING_DOWN", "DISSOLVED"]).optional(),
  reason: z.string().optional(),
  formationStatus: z.string().optional(),
  name: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authUser = await getAuthUser();

  // GP_TEAM permission check (only when authenticated)
  if (authUser && authUser.role === "GP_TEAM") {
    const perms = await getEffectivePermissions(authUser.id);
    if (!checkPermission(perms, "entities", "read_only")) return forbidden();
  }

  // SERVICE_PROVIDER entity-scope: check access expiry and entity membership
  if (authUser && authUser.role === "SERVICE_PROVIDER") {
    if (authUser.accessExpiresAt && new Date(authUser.accessExpiresAt) < new Date()) {
      return forbidden();
    }
    if (!authUser.entityAccess.includes(id)) return forbidden();
  }

  const entity = await prisma.entity.findUnique({
    where: { id },
    include: {
      accountingConnection: true,
      commitments: { include: { investor: true } },
      assetAllocations: { include: { asset: true } },
      navComputations: { orderBy: { periodDate: "desc" } },
      capitalCalls: { include: { entity: { select: { id: true, name: true } }, lineItems: { include: { investor: true } } }, orderBy: { callDate: "desc" } },
      distributions: { include: { entity: { select: { id: true, name: true } }, lineItems: { include: { investor: true } } }, orderBy: { distributionDate: "desc" } },
      waterfallTemplate: { include: { tiers: { orderBy: { tierOrder: "asc" } } } },
      feeCalculations: true,
      sideLetters: { include: { investor: true, entity: true } },
      unitClasses: {
        include: {
          ownershipUnits: {
            include: { investor: { select: { id: true, name: true, investorType: true, kycStatus: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      capitalAccounts: { orderBy: { periodDate: "desc" } },
      meetings: { orderBy: { meetingDate: "desc" } },
      documents: { orderBy: { uploadDate: "desc" } },
      tasks: {
        where: { contextType: "FORMATION" },
        include: { assignee: { select: { id: true, name: true, initials: true } } },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!entity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Sanitize high-risk JSON blob field: navProxyConfig
  const safeNav = NavProxyConfigSchema.safeParse(entity.navProxyConfig);
  const sanitizedEntity = {
    ...entity,
    navProxyConfig: safeNav.success ? safeNav.data : null,
  };

  return NextResponse.json(sanitizedEntity);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authUser = await getAuthUser();

  // GP_TEAM permission check
  if (authUser && authUser.role === "GP_TEAM") {
    const perms = await getEffectivePermissions(authUser.id);
    if (!checkPermission(perms, "entities", "full")) return forbidden();
  }

  // SERVICE_PROVIDER entity-scope: check entity membership
  if (authUser && authUser.role === "SERVICE_PROVIDER") {
    if (authUser.accessExpiresAt && new Date(authUser.accessExpiresAt) < new Date()) {
      return forbidden();
    }
    if (!authUser.entityAccess.includes(id)) return forbidden();
  }

  const { data, error } = await parseBody(req, UpdateEntitySchema);
  if (error) return error;
  const { investmentPeriodEnd, ...rest } = data!;
  const entity = await prisma.entity.update({
    where: { id },
    data: {
      ...(rest as Record<string, unknown>),
      ...(investmentPeriodEnd ? { investmentPeriodEnd: new Date(investmentPeriodEnd) } : {}),
    },
  });

  if (authUser) {
    logAudit(authUser.firmId, authUser.id, "UPDATE_ENTITY", "Entity", id, {
      fields: Object.keys(rest),
    });
  }

  return NextResponse.json(entity);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authUserForPatch = await getAuthUser();

  // GP_TEAM permission check
  if (authUserForPatch && authUserForPatch.role === "GP_TEAM") {
    const perms = await getEffectivePermissions(authUserForPatch.id);
    if (!checkPermission(perms, "entities", "full")) return forbidden();
  }

  const { data: patchData, error: patchError } = await parseBody(req, PatchEntityActionSchema);
  if (patchError) return patchError;
  const body = patchData!;

  if (body.action === "TRANSITION_STATUS") {
    const { newStatus, reason } = body;
    if (!newStatus) {
      return NextResponse.json({ error: "newStatus is required" }, { status: 400 });
    }
    const validTransitions: Record<string, string[]> = {
      ACTIVE: ["WINDING_DOWN"],
      WINDING_DOWN: ["DISSOLVED", "ACTIVE"],
      DISSOLVED: [],
    };

    const entityForTransition = await prisma.entity.findUnique({
      where: { id },
      select: { status: true, firmId: true },
    });
    if (!entityForTransition) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!validTransitions[entityForTransition.status]?.includes(newStatus)) {
      return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
    }

    // Check for outstanding obligations (informational warnings, not blockers)
    const [outstandingCalls, activeAssets] = await Promise.all([
      prisma.capitalCall.count({ where: { entityId: id, status: { not: "FUNDED" } } }),
      prisma.assetEntityAllocation.count({ where: { entityId: id } }),
    ]);

    await prisma.entity.update({ where: { id }, data: { status: newStatus } });

    if (authUserForPatch) {
      logAudit(authUserForPatch.firmId, authUserForPatch.id, "STATUS_TRANSITION", "Entity", id, {
        from: entityForTransition.status,
        to: newStatus,
        reason: reason || null,
      });
    }

    return NextResponse.json({
      status: newStatus,
      warnings: {
        outstandingCalls,
        activeAssets,
      },
    });
  }

  if (body.action === "MARK_FORMED") {
    // Validate all formation tasks are DONE
    const tasks = await prisma.task.findMany({
      where: { entityId: id, contextType: "FORMATION" },
    });
    const incomplete = tasks.filter((t) => t.status !== "DONE");
    if (incomplete.length > 0) {
      return NextResponse.json(
        { error: `${incomplete.length} formation tasks are not yet complete` },
        { status: 400 }
      );
    }
    const entity = await prisma.entity.update({
      where: { id },
      data: { formationStatus: "FORMED" },
    });
    return NextResponse.json(entity);
  }

  // Generic field updates
  const data: Record<string, unknown> = {};
  if (body.formationStatus) data.formationStatus = body.formationStatus;
  if (body.name) data.name = body.name;

  const entity = await prisma.entity.update({ where: { id }, data });
  return NextResponse.json(entity);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (authUser.role === "GP_TEAM") {
    const perms = await getEffectivePermissions(authUser.id);
    if (!checkPermission(perms, "entities", "full")) return forbidden();
  }

  const entity = await prisma.entity.findUnique({
    where: { id },
    include: {
      commitments: { select: { id: true } },
      capitalCalls: { select: { id: true } },
      distributions: { select: { id: true } },
      assetAllocations: { select: { id: true } },
      childEntities: { select: { id: true } },
    },
  });

  if (!entity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Block deletion if entity has financial records
  if (entity.capitalCalls.length > 0) {
    return NextResponse.json(
      { error: `Cannot delete: vehicle has ${entity.capitalCalls.length} capital call(s). Remove them first.` },
      { status: 400 },
    );
  }
  if (entity.distributions.length > 0) {
    return NextResponse.json(
      { error: `Cannot delete: vehicle has ${entity.distributions.length} distribution(s). Remove them first.` },
      { status: 400 },
    );
  }
  if (entity.childEntities.length > 0) {
    return NextResponse.json(
      { error: `Cannot delete: vehicle has ${entity.childEntities.length} child vehicle(s). Remove them first.` },
      { status: 400 },
    );
  }

  // Cascade delete related records that are safe to remove
  // Clean up accounting connection and its nested records first
  const acctConn = await prisma.accountingConnection.findUnique({ where: { entityId: id } });
  await prisma.$transaction([
    ...(acctConn ? [
      prisma.accountMapping.deleteMany({ where: { connectionId: acctConn.id } }),
      prisma.trialBalanceSnapshot.deleteMany({ where: { connectionId: acctConn.id } }),
      prisma.accountingConnection.delete({ where: { entityId: id } }),
    ] : []),
    prisma.commitment.deleteMany({ where: { entityId: id } }),
    prisma.assetEntityAllocation.deleteMany({ where: { entityId: id } }),
    prisma.nAVComputation.deleteMany({ where: { entityId: id } }),
    prisma.feeCalculation.deleteMany({ where: { entityId: id } }),
    prisma.capitalAccount.deleteMany({ where: { entityId: id } }),
    prisma.sideLetter.deleteMany({ where: { entityId: id } }),
    prisma.incomeEvent.deleteMany({ where: { entityId: id } }),
    prisma.assetExpense.deleteMany({ where: { entityId: id } }),
    prisma.transaction.deleteMany({ where: { entityId: id } }),
    prisma.task.deleteMany({ where: { entityId: id } }),
    prisma.document.updateMany({ where: { entityId: id }, data: { entityId: null } }),
    prisma.meeting.updateMany({ where: { entityId: id }, data: { entityId: null } }),
    prisma.entity.delete({ where: { id } }),
  ]);

  logAudit(authUser.firmId, authUser.id, "DELETE_ENTITY", "Entity", id, { name: entity.name });

  return NextResponse.json({ success: true });
}
