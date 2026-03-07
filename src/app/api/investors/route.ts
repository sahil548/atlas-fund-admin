import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateInvestorSchema } from "@/lib/schemas";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    const firmId =
      req.nextUrl.searchParams.get("firmId") || authUser?.firmId;

    const where: Record<string, unknown> = {};
    if (firmId) {
      where.commitments = { some: { entity: { firmId } } };
    }

    const investors = await prisma.investor.findMany({
      where,
      include: {
        commitments: {
          include: { entity: { select: { id: true, name: true } } },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: { select: { id: true, name: true, type: true } },
        userAccess: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: { totalCommitted: "desc" },
    });
    return NextResponse.json(investors);
  } catch (err) {
    console.error("[investors] GET Error:", err);
    return NextResponse.json(
      { error: "Failed to load investors" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { data, error } = await parseBody(req, CreateInvestorSchema);
    if (error) return error;
    const investor = await prisma.investor.create({ data: data! });
    return NextResponse.json(investor, { status: 201 });
  } catch (err) {
    console.error("[investors] POST Error:", err);
    return NextResponse.json(
      { error: "Failed to create investor" },
      { status: 500 },
    );
  }
}
