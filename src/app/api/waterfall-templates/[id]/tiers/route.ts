import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateWaterfallTierSchema, UpdateWaterfallTierSchema } from "@/lib/schemas";

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
