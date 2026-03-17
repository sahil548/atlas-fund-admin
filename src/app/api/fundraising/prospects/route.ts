import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateFundraisingProspectSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateFundraisingProspectSchema);
  if (error) return error;

  const prospect = await prisma.fundraisingProspect.create({
    data: {
      roundId: data!.roundId,
      investorName: data!.investorName,
      investorType: data!.investorType,
      contactName: data!.contactName,
      contactEmail: data!.contactEmail,
      targetAmount: data!.targetAmount,
      notes: data!.notes,
    },
  });

  return NextResponse.json(prospect, { status: 201 });
}
