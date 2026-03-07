import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateDistributionSchema } from "@/lib/schemas";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const distributions = await prisma.distributionEvent.findMany({
      where: firmId ? { entity: { firmId } } : {},
      include: {
        entity: { select: { id: true, name: true } },
        lineItems: { include: { investor: true } },
      },
      orderBy: { distributionDate: "desc" },
    });
    return NextResponse.json(distributions);
  } catch (err) {
    console.error("[distributions] GET Error:", err);
    return NextResponse.json(
      { error: "Failed to load distributions" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { data, error } = await parseBody(req, CreateDistributionSchema);
    if (error) return error;
    const dist = await prisma.distributionEvent.create({
      data: {
        ...data!,
        distributionDate: new Date(data!.distributionDate),
      },
    });
    return NextResponse.json(dist, { status: 201 });
  } catch (err) {
    console.error("[distributions] POST Error:", err);
    return NextResponse.json(
      { error: "Failed to create distribution" },
      { status: 500 },
    );
  }
}
