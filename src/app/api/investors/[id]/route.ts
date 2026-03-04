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
      userAccess: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const investor = await prisma.investor.findUnique({
    where: { id },
    include: {
      commitments: { select: { id: true } },
      capitalCallLineItems: { select: { id: true } },
      distributionLineItems: { select: { id: true } },
      capitalAccounts: { select: { id: true } },
    },
  });
  if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const blockers = [];
  if (investor.commitments.length > 0) blockers.push(`${investor.commitments.length} commitment(s)`);
  if (investor.capitalCallLineItems.length > 0) blockers.push("capital call records");
  if (investor.distributionLineItems.length > 0) blockers.push("distribution records");
  if (investor.capitalAccounts.length > 0) blockers.push("capital accounts");

  if (blockers.length > 0) {
    return NextResponse.json(
      { error: `Cannot delete: investor has ${blockers.join(", ")}. Remove them first.` },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.sideLetter.deleteMany({ where: { investorId: id } }),
    prisma.investorUserAccess.deleteMany({ where: { investorId: id } }),
    prisma.investorNotificationPreference.deleteMany({ where: { investorId: id } }),
    prisma.note.deleteMany({ where: { investorId: id } }),
    prisma.investor.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
