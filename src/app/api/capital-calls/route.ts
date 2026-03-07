import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateCapitalCallSchema } from "@/lib/schemas";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const calls = await prisma.capitalCall.findMany({
      where: firmId ? { entity: { firmId } } : {},
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
  const { data, error } = await parseBody(req, CreateCapitalCallSchema);
  if (error) return error;
  try {
    const call = await prisma.capitalCall.create({
      data: {
        ...data!,
        callDate: new Date(data!.callDate),
        dueDate: new Date(data!.dueDate),
      },
    });
    return NextResponse.json(call, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
