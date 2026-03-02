import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const docs = await prisma.document.findMany({
    where: { investorId: id },
    orderBy: { uploadDate: "desc" },
  });
  return NextResponse.json(docs);
}
