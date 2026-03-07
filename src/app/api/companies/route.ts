import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    const firmId =
      req.nextUrl.searchParams.get("firmId") || authUser?.firmId;
    const type = req.nextUrl.searchParams.get("type");

    const where: Record<string, unknown> = {};
    if (firmId) where.firmId = firmId;
    if (type) where.type = type;

    const companies = await prisma.company.findMany({
      where,
      include: {
        contacts: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true,
          },
        },
        _count: { select: { contacts: true } },
        investorProfile: {
          select: {
            id: true,
            name: true,
            investorType: true,
            kycStatus: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(companies);
  } catch (err) {
    console.error("[companies] GET Error:", err);
    return NextResponse.json(
      { error: "Failed to load companies" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { parseBody } = await import("@/lib/api-helpers");
    const { CreateCompanySchema } = await import("@/lib/schemas");
    const { data, error } = await parseBody(req, CreateCompanySchema);
    if (error) return error;
    const company = await prisma.company.create({
      data: {
        firmId: data!.firmId,
        name: data!.name,
        type: data!.type || "OTHER",
        website: data!.website,
        industry: data!.industry,
        notes: data!.notes,
      },
    });
    return NextResponse.json(company, { status: 201 });
  } catch (err) {
    console.error("[companies] POST Error:", err);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 },
    );
  }
}
