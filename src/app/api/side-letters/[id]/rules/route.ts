import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateSideLetterRuleSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sideLetter = await prisma.sideLetter.findUnique({ where: { id } });
  if (!sideLetter) return NextResponse.json({ error: "Side letter not found" }, { status: 404 });

  const rules = await prisma.sideLetterRule.findMany({
    where: { sideLetterId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(rules);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sideLetter = await prisma.sideLetter.findUnique({ where: { id } });
  if (!sideLetter) return NextResponse.json({ error: "Side letter not found" }, { status: 404 });

  const { data, error } = await parseBody(
    req,
    CreateSideLetterRuleSchema.omit({ sideLetterId: true })
  );
  if (error) return error;

  try {
    const rule = await prisma.sideLetterRule.create({
      data: {
        sideLetterId: id,
        ruleType: data!.ruleType,
        value: data!.value,
        description: data!.description,
      },
    });
    return NextResponse.json(rule, { status: 201 });
  } catch (err) {
    logger.error("[side-letters/[id]/rules] POST Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const ruleId = searchParams.get("ruleId");

  if (!ruleId) {
    return NextResponse.json({ error: "ruleId query param required" }, { status: 400 });
  }

  const rule = await prisma.sideLetterRule.findFirst({
    where: { id: ruleId, sideLetterId: id },
  });
  if (!rule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

  await prisma.sideLetterRule.delete({ where: { id: ruleId } });
  return NextResponse.json({ success: true });
}
