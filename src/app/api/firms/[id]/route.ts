import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateFirmSchema } from "@/lib/schemas";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const firm = await prisma.firm.findUnique({ where: { id } });
  if (!firm) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(firm);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, UpdateFirmSchema);
  if (error) return error;
  const firm = await prisma.firm.update({ where: { id }, data: data! });
  return NextResponse.json(firm);
}
