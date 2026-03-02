import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateTaskSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateTaskSchema);
  if (error) return error;
  const task = await prisma.task.create({
    data: {
      ...data!,
      ...(data!.dueDate ? { dueDate: new Date(data!.dueDate) } : {}),
    },
  });
  return NextResponse.json(task, { status: 201 });
}
