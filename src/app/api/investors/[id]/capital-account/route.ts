import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const accounts = await prisma.capitalAccount.findMany({
    where: { investorId: id },
    include: {
      entity: { select: { id: true, name: true } },
    },
    orderBy: { periodDate: "desc" },
  });
  return NextResponse.json(accounts);
}
