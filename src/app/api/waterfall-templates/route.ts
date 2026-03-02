import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateWaterfallTemplateSchema } from "@/lib/schemas";

export async function GET() {
  const templates = await prisma.waterfallTemplate.findMany({
    include: {
      tiers: { orderBy: { tierOrder: "asc" } },
      entities: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateWaterfallTemplateSchema);
  if (error) return error;
  const template = await prisma.waterfallTemplate.create({ data: data! });
  return NextResponse.json(template, { status: 201 });
}
