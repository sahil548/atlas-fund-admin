import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateEntitySchema } from "@/lib/schemas";
import { getAuthUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  return NextResponse.json(entity);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authUser = await getAuthUser();
  const { data, error } = await parseBody(req, UpdateEntitySchema);
  if (error) return error;
  const { investmentPeriodEnd, ...rest } = data!;
  const entity = await prisma.entity.update({
    where: { id },
    data: {
      ...rest,
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
  const body = await req.json();

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
