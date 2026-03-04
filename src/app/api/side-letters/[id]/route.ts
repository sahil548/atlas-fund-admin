import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateSideLetterSchema } from "@/lib/schemas";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sideLetter = await prisma.sideLetter.findUnique({
    where: { id },
    include: {
      investor: { select: { id: true, name: true } },
      entity: { select: { id: true, name: true } },
    },
  });
  if (!sideLetter) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sideLetter);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, UpdateSideLetterSchema);
  if (error) return error;
  const sideLetter = await prisma.sideLetter.update({ where: { id }, data: data! });
  return NextResponse.json(sideLetter);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sideLetter = await prisma.sideLetter.findUnique({ where: { id } });
  if (!sideLetter) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.sideLetter.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
