import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateEntitySchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const firmId = req.nextUrl.searchParams.get("firmId");
  const where: Record<string, unknown> = {};
  if (firmId) where.firmId = firmId;

  const entities = await prisma.entity.findMany({
    where,
    include: {
      accountingConnection: true,
      commitments: { include: { investor: true } },
      assetAllocations: { include: { asset: true } },
      navComputations: { orderBy: { periodDate: "desc" }, take: 1 },
      distributions: { select: { netToLPs: true } },
    },
    orderBy: { name: "asc" },
  });

  const enriched = entities.map((entity) => {
    const totalCalled = entity.commitments.reduce(
      (sum, c) => sum + (c.calledAmount ?? 0),
      0,
    );
    const totalDistributed = entity.distributions.reduce(
      (sum, d) => sum + (d.netToLPs ?? 0),
      0,
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { distributions, ...rest } = entity;
    return { ...rest, totalCalled, totalDistributed };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateEntitySchema);
  if (error) return error;
  const { startFormation, ...entityData } = data!;
  const entity = await prisma.entity.create({ data: { ...entityData, firmId: "firm-1" } });

  if (startFormation) {
    const { FORMATION_CHECKLIST_TEMPLATES } = await import("@/lib/formation-templates");
    await prisma.task.createMany({
      data: FORMATION_CHECKLIST_TEMPLATES.map((t) => ({
        title: t.title,
        order: t.order,
        status: "TODO",
        priority: "HIGH",
        contextType: "FORMATION",
        contextId: entity.id,
        entityId: entity.id,
      })),
    });
    // Update entity to FORMING
    await prisma.entity.update({
      where: { id: entity.id },
      data: { formationStatus: "FORMING" },
    });
  }

  return NextResponse.json(entity, { status: 201 });
}
