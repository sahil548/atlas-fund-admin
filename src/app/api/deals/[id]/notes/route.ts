import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateNoteSchema } from "@/lib/schemas";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const notes = await prisma.note.findMany({
    where: { dealId: id },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true, initials: true } } },
  });
  return NextResponse.json(notes);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await parseBody(req, CreateNoteSchema);
  if (error) return error;
  const note = await prisma.note.create({
    data: { ...data!, dealId: id },
  });
  return NextResponse.json(note, { status: 201 });
}
