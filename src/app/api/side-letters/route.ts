import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateSideLetterSchema, CreateSideLetterRuleSchema } from "@/lib/schemas";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";

const CreateSideLetterWithRulesSchema = CreateSideLetterSchema.extend({
  rules: z.array(CreateSideLetterRuleSchema.omit({ sideLetterId: true })).optional(),
});

export async function GET() {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const sideLetters = await prisma.sideLetter.findMany({
      where: firmId ? { entity: { firmId } } : {},
      include: {
        investor: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
        rules: true,
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
    const { data, error } = await parseBody(req, CreateSideLetterWithRulesSchema);
    if (error) return error;

    const { rules, ...sideLetterData } = data!;

    const sideLetter = await prisma.$transaction(async (tx) => {
      const created = await tx.sideLetter.create({
        data: {
          investorId: sideLetterData.investorId,
          entityId: sideLetterData.entityId,
          terms: sideLetterData.terms,
        },
      });

      if (rules && rules.length > 0) {
        await tx.sideLetterRule.createMany({
          data: rules.map((r) => ({
            sideLetterId: created.id,
            ruleType: r.ruleType,
            value: r.value,
            description: r.description,
          })),
        });
      }

      return tx.sideLetter.findUnique({
        where: { id: created.id },
        include: {
          investor: { select: { id: true, name: true } },
          entity: { select: { id: true, name: true } },
          rules: true,
        },
      });
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
