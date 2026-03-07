import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    const firmId =
      req.nextUrl.searchParams.get("firmId") || authUser?.firmId;
    const companyId = req.nextUrl.searchParams.get("companyId");
    const type = req.nextUrl.searchParams.get("type");

    const where: Record<string, unknown> = {};
    if (firmId) where.firmId = firmId;
    if (companyId) where.companyId = companyId;
    if (type) where.type = type;

    // Filter to contacts without a user account (for user creation dropdown)
    const unlinked = req.nextUrl.searchParams.get("unlinked");
    if (unlinked === "true") {
      where.userAccount = { is: null };
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, type: true } },
        investorProfile: {
          select: {
            id: true,
            name: true,
            investorType: true,
            kycStatus: true,
          },
        },
        userAccount: { select: { id: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    return NextResponse.json(contacts);
  } catch (err) {
    console.error("[contacts] GET Error:", err);
    return NextResponse.json(
      { error: "Failed to load contacts" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { parseBody } = await import("@/lib/api-helpers");
    const { CreateContactSchema } = await import("@/lib/schemas");
    const { data, error } = await parseBody(req, CreateContactSchema);
    if (error) return error;
    const contact = await prisma.contact.create({
      data: {
        firmId: data!.firmId,
        firstName: data!.firstName,
        lastName: data!.lastName,
        email: data!.email,
        phone: data!.phone,
        title: data!.title,
        type: data!.type || "EXTERNAL",
        companyId: data!.companyId,
        notes: data!.notes,
      },
    });
    return NextResponse.json(contact, { status: 201 });
  } catch (err) {
    console.error("[contacts] POST Error:", err);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 },
    );
  }
}
