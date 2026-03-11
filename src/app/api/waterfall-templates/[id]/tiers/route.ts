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
  const { data, error } = await parseBody(req, UpdateWaterfallTierSchema);
  if (error) return error;
  const { id, ...updates } = data!;
  const tier = await prisma.waterfallTier.update({ where: { id }, data: updates });
  return NextResponse.json(tier);
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
