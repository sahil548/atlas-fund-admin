import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateIncomeEventSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateIncomeEventSchema);
  if (error) return error;
  const income = await prisma.incomeEvent.create({
    data: {
      ...data!,
      date: new Date(data!.date),
    },
  });
  return NextResponse.json(income, { status: 201 });
}
