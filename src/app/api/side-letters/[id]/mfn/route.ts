import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { detectMFNGaps } from "@/lib/computations/side-letter-engine";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sideLetter = await prisma.sideLetter.findUnique({
    where: { id },
    select: { entityId: true },
  });
  if (!sideLetter) {
    return NextResponse.json({ error: "Side letter not found" }, { status: 404 });
  }

  try {
    const gaps = await detectMFNGaps(sideLetter.entityId);
    return NextResponse.json(gaps);
  } catch (err) {
    console.error("[side-letters/[id]/mfn] GET Error:", err);
    return NextResponse.json({ error: "Failed to detect MFN gaps" }, { status: 500 });
  }
}
