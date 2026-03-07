import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateSideLetterSchema } from "@/lib/schemas";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const sideLetters = await prisma.sideLetter.findMany({
      where: firmId ? { entity: { firmId } } : {},
      include: {
        investor: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(sideLetters);
  } catch (err) {
    console.error("[side-letters] GET Error:", err);
    return NextResponse.json(
      { error: "Failed to load side letters" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
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
  } catch (err) {
    console.error("[side-letters] POST Error:", err);
    return NextResponse.json(
      { error: "Failed to create side letter" },
      { status: 500 },
    );
  }
}
