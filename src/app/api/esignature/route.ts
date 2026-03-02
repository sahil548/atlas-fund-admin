import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const entityId = req.nextUrl.searchParams.get("entityId");
  const dealId = req.nextUrl.searchParams.get("dealId");

  const where: Record<string, unknown> = {};
  if (entityId) where.entityId = entityId;
  if (dealId) where.dealId = dealId;

  const packages = await prisma.eSignaturePackage.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(packages);
}

export async function POST(req: Request) {
  const body = await req.json();
  const pkg = await prisma.eSignaturePackage.create({ data: body });
  return NextResponse.json(pkg, { status: 201 });
}
