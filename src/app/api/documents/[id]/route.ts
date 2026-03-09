import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await getAuthUser();

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      deal: { select: { id: true, name: true } },
      asset: { select: { id: true, name: true } },
      entity: { select: { id: true, name: true } },
    },
  });

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  return NextResponse.json(doc);
}
