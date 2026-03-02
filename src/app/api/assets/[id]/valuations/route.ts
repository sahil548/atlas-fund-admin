import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateValuationSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateValuationSchema);
  if (error) return error;
  const valuation = await prisma.valuation.create({
    data: {
      ...data!,
      valuationDate: new Date(data!.valuationDate),
    },
  });
  return NextResponse.json(valuation, { status: 201 });
}
