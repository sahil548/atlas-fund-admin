import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    const firmId =
      req.nextUrl.searchParams.get("firmId") || authUser?.firmId;
    const companyId = req.nextUrl.searchParams.get("companyId");
    const type = req.nextUrl.searchParams.get("type");

    // Self-healing: backfill Contact records for Users that don't have one
    if (firmId) {
      const usersWithoutContact = await prisma.user.findMany({
        where: { firmId, contactId: null, isActive: true },
        select: { id: true, name: true, email: true, firmId: true },
      });
      for (const u of usersWithoutContact) {
        const parts = u.name.split(" ");
        const firstName = parts[0] || u.name;
        const lastName = parts.slice(1).join(" ") || "";
        const contact = await prisma.contact.create({
          data: { firmId: u.firmId, firstName, lastName, email: u.email, type: "INTERNAL" },
        });
        await prisma.user.update({ where: { id: u.id }, data: { contactId: contact.id } });
      }
    }

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
    logger.error("[contacts] GET Error:", { error: err instanceof Error ? err.message : String(err) });
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
    logger.error("[contacts] POST Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 },
    );
  }
}
