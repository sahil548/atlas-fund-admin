import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateWaterfallTemplateSchema } from "@/lib/schemas";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const templates = await prisma.waterfallTemplate.findMany({
      where: firmId ? { entities: { some: { firmId } } } : {},
      include: {
        tiers: { orderBy: { tierOrder: "asc" } },
        entities: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(templates);
  } catch (err) {
    console.error("[waterfall-templates] GET Error:", err);
    return NextResponse.json(
      { error: "Failed to load waterfall templates" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { data, error } = await parseBody(req, CreateWaterfallTemplateSchema);
    if (error) return error;
    const template = await prisma.waterfallTemplate.create({ data: data! });
    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    console.error("[waterfall-templates] POST Error:", err);
    return NextResponse.json(
      { error: "Failed to create waterfall template" },
      { status: 500 },
    );
  }
}
