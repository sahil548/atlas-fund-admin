import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateClosingChecklistItemSchema, UpdateClosingChecklistItemSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateClosingChecklistItemSchema);
  if (error) return error;
  const { dueDate, ...rest } = data!;
  const item = await prisma.closingChecklist.create({
    data: {
      ...rest,
      ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
    },
  });
  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(req: Request) {
  const { data, error } = await parseBody(req, UpdateClosingChecklistItemSchema);
  if (error) return error;
  const item = await prisma.closingChecklist.update({
    where: { id: data!.id },
    data: { status: data!.status },
  });
  return NextResponse.json(item);
}
