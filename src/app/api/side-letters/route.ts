import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateSideLetterSchema } from "@/lib/schemas";

export async function GET() {
  const sideLetters = await prisma.sideLetter.findMany({
    include: {
      investor: { select: { id: true, name: true } },
      entity: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(sideLetters);
}

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateSideLetterSchema);
  if (error) return error;
  const sideLetter = await prisma.sideLetter.create({
    data: {
      investorId: data!.investorId,
      entityId: data!.entityId,
      terms: data!.terms,
    },
    include: {
      investor: { select: { id: true, name: true } },
      entity: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(sideLetter, { status: 201 });
}
