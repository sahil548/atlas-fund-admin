import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export async function PUT(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    await getAuthUser();

    const body = await req.json();
    const parsed = UpdateTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.waterfallTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const updated = await prisma.waterfallTemplate.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(updated);
  } catch (err) {
    logger.error("[waterfall-templates/[id]] PUT error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    await getAuthUser();

    const existing = await prisma.waterfallTemplate.findUnique({
      where: { id },
      include: {
        entities: { select: { id: true } },
        tiers: { select: { id: true } },
        calculations: { select: { id: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Unlink any entities pointing to this template
    if (existing.entities.length > 0) {
      await prisma.entity.updateMany({
        where: { waterfallTemplateId: id },
        data: { waterfallTemplateId: null },
      });
    }

    // Cascade delete tiers and calculations
    await prisma.$transaction([
      prisma.waterfallTier.deleteMany({ where: { templateId: id } }),
      prisma.waterfallCalculation.deleteMany({ where: { templateId: id } }),
      prisma.waterfallTemplate.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("[waterfall-templates/[id]] DELETE error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
