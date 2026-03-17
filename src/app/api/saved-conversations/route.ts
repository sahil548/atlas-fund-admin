import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateSavedConversationSchema } from "@/lib/schemas";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dealId = searchParams.get("dealId");
  const assetId = searchParams.get("assetId");
  const entityId = searchParams.get("entityId");
  const investorId = searchParams.get("investorId");

  const where: Record<string, string> = {};
  if (dealId) where.dealId = dealId;
  if (assetId) where.assetId = assetId;
  if (entityId) where.entityId = entityId;
  if (investorId) where.investorId = investorId;

  if (Object.keys(where).length === 0) {
    return NextResponse.json(
      { error: "At least one filter (dealId, assetId, entityId, investorId) is required" },
      { status: 400 }
    );
  }

  const conversations = await prisma.savedConversation.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, initials: true } },
    },
  });
  return NextResponse.json(conversations);
}

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateSavedConversationSchema);
  if (error) return error;

  const { dealId, assetId, entityId, investorId } = data!;
  if (!dealId && !assetId && !entityId && !investorId) {
    return NextResponse.json(
      { error: "At least one of dealId, assetId, entityId, or investorId is required" },
      { status: 400 }
    );
  }

  const conversation = await prisma.savedConversation.create({
    data: { ...data! },
    include: {
      author: { select: { id: true, name: true, initials: true } },
    },
  });
  return NextResponse.json(conversation, { status: 201 });
}
