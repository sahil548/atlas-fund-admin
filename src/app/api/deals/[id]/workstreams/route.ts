import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateDDWorkstreamSchema } from "@/lib/schemas";
import { z } from "zod";

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateDDWorkstreamSchema);
  if (error) return error;
  const workstream = await prisma.dDWorkstream.create({ data: data! });
  return NextResponse.json(workstream, { status: 201 });
}

const UpdateWorkstreamSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  // status is computed from tasks — not manually editable
  description: z.string().nullable().optional(),
  customInstructions: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: Request) {
  const { data, error } = await parseBody(req, UpdateWorkstreamSchema);
  if (error) return error;

  const { id, ...updates } = data!;
  const workstream = await prisma.dDWorkstream.update({
    where: { id },
    data: updates,
    include: { tasks: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json(workstream);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing workstream id" }, { status: 400 });
  }

  // Delete child tasks first, then the workstream
  await prisma.dDTask.deleteMany({ where: { workstreamId: id } });
  await prisma.dDWorkstream.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
