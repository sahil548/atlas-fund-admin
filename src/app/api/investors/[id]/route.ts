import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateInvestorSchema } from "@/lib/schemas";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const investor = await prisma.investor.findUnique({
    where: { id },
    include: {
      commitments: { include: { entity: true } },
      sideLetters: { include: { entity: true } },
      capitalAccounts: { orderBy: { periodDate: "desc" } },
      notificationPreference: true,
      capitalCallLineItems: {
        include: {
          capitalCall: {
            include: {
              entity: { select: { id: true, name: true } },
            },
          },
        },
      },
      distributionLineItems: {
        include: {
          distribution: {
            include: {
              entity: { select: { id: true, name: true } },
            },
          },
        },
      },
      documents: {
        select: {
          id: true,
          name: true,
          category: true,
          uploadDate: true,
        },
      },
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      company: { select: { id: true, name: true, type: true } },
    },
  });
  if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(investor);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await parseBody(req, UpdateInvestorSchema);
  if (error) return error;
  const investor = await prisma.investor.update({ where: { id }, data: data! });
  return NextResponse.json(investor);
}
