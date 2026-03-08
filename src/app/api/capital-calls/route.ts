import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateCapitalCallSchema } from "@/lib/schemas";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { getEffectivePermissions, checkPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    // GP_TEAM permission check (only when authenticated)
    if (authUser && authUser.role === "GP_TEAM") {
      const perms = await getEffectivePermissions(authUser.id);
      if (!checkPermission(perms, "capital_activity", "read_only")) return forbidden();
    }

    // Build base where clause with firm scoping and SERVICE_PROVIDER entity-scope
    let baseWhere: Record<string, unknown> = firmId ? { entity: { firmId } } : {};
    if (authUser && authUser.role === "SERVICE_PROVIDER") {
      baseWhere = { entity: { id: { in: authUser.entityAccess } } };
    }

    const calls = await prisma.capitalCall.findMany({
      where: baseWhere,
      include: {
        entity: { select: { id: true, name: true } },
        lineItems: { include: { investor: true } },
      },
      orderBy: { callDate: "desc" },
    });
    return NextResponse.json(calls);
  } catch (err) {
    console.error("[capital-calls] GET Error:", err);
    return NextResponse.json(
      { error: "Failed to load capital calls" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const authUserPost = await getAuthUser();
    if (!authUserPost) return unauthorized();

    if (authUserPost.role === "GP_TEAM") {
      const perms = await getEffectivePermissions(authUserPost.id);
      if (!checkPermission(perms, "capital_activity", "full")) return forbidden();
    }

    const { data, error } = await parseBody(req, CreateCapitalCallSchema);
    if (error) return error;

    const { autoGenerateLineItems, entityId, callDate, dueDate, amount, ...rest } = data!;

    const call = await prisma.capitalCall.create({
      data: {
        ...rest,
        entityId,
        amount,
        callDate: new Date(callDate),
        dueDate: new Date(dueDate),
      },
    });

    // Auto-generate pro-rata line items from entity commitments
    if (autoGenerateLineItems) {
      const commitments = await prisma.commitment.findMany({
        where: { entityId },
        select: { investorId: true, amount: true },
      });

      const totalCommitments = commitments.reduce(
        (sum, c) => sum + c.amount,
        0,
      );

      if (commitments.length > 0 && totalCommitments > 0) {
        await prisma.capitalCallLineItem.createMany({
          data: commitments.map((c) => ({
            capitalCallId: call.id,
            investorId: c.investorId,
            amount: (c.amount / totalCommitments) * amount,
            status: "Pending",
          })),
        });
      }
    }

    const callWithLineItems = await prisma.capitalCall.findUnique({
      where: { id: call.id },
      include: {
        entity: { select: { id: true, name: true } },
        lineItems: { include: { investor: { select: { id: true, name: true } } } },
      },
    });

    // Audit log — fire and forget
    const authUser = await getAuthUser();
    if (authUser) {
      logAudit(authUser.firmId, authUser.id, "CREATE_CAPITAL_CALL", "CapitalCall", call.id, {
        callNumber: data!.callNumber,
        amount: data!.amount,
        entityId: data!.entityId,
      });
    }

    return NextResponse.json(callWithLineItems, { status: 201 });
  } catch (e: unknown) {
    console.error("[capital-calls] POST Error:", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
