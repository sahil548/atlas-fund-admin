import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateWaterfallTierSchema, UpdateWaterfallTierSchema } from "@/lib/schemas";
import { z } from "zod";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateWaterfallTierSchema);
  if (error) return error;
  const tier = await prisma.waterfallTier.create({ data: data! });
  return NextResponse.json(tier, { status: 201 });
}

export async function PUT(req: Request) {
  try {
    const { data, error } = await parseBody(req, UpdateWaterfallTierSchema);
    if (error) return error;
    const { id, ...updates } = data!;

    // Convert null values to Prisma-compatible form
    const prismaData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) prismaData[key] = value;
    }

    const tier = await prisma.waterfallTier.update({ where: { id }, data: prismaData });
    return NextResponse.json(tier);
  } catch (err) {
    logger.error("[waterfall-templates/tiers] PUT", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to update tier" }, { status: 500 });
  }
}

const DeleteTierSchema = z.object({
  tierId: z.string().min(1, "Tier ID is required"),
});

export async function DELETE(req: Request) {
  try {
    const { data, error } = await parseBody(req, DeleteTierSchema);
    if (error) return error;
    const { tierId } = data!;
    const tier = await prisma.waterfallTier.findUnique({ where: { id: tierId } });
    if (!tier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }
    await prisma.waterfallTier.delete({ where: { id: tierId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("[waterfall-templates/tiers] DELETE", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to delete tier" }, { status: 500 });
  }
}
