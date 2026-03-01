import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const sideLetters = await prisma.sideLetter.findMany({
    include: {
      investor: { select: { id: true, name: true } },
      entity: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(sideLetters);
}
