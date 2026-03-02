import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateCapitalCallSchema } from "@/lib/schemas";

export async function GET() {
  const calls = await prisma.capitalCall.findMany({
    include: {
      entity: { select: { id: true, name: true } },
      lineItems: { include: { investor: true } },
    },
    orderBy: { callDate: "desc" },
  });
  return NextResponse.json(calls);
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
