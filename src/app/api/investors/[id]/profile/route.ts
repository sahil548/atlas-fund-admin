/**
 * GET /api/investors/[id]/profile — LP investor profile data
 * PUT /api/investors/[id]/profile — update mailingAddress, taxId, phone
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api-helpers";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ProfileUpdateSchema = z.object({
  mailingAddress: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

function buildProfileResponse(investor: any) {
  return {
    investorId: investor.id,
    legalName: investor.name,
    email:
      investor.notificationPreference?.emailAddress ||
      investor.contact?.email ||
      null,
    phone:
      investor.phone ||
      investor.notificationPreference?.phoneNumber ||
      investor.contact?.phone ||
      null,
    mailingAddress: investor.mailingAddress ?? null,
    taxId: investor.taxId ?? null,
    entityAffiliations: (investor.commitments ?? []).map((c: any) => ({
      entityId: c.entity.id,
      entityName: c.entity.name,
      commitment: c.amount,
    })),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const investor = await prisma.investor.findUnique({
    where: { id },
    include: {
      commitments: {
        include: { entity: { select: { id: true, name: true } } },
      },
      notificationPreference: { select: { emailAddress: true, phoneNumber: true } },
      contact: { select: { firstName: true, lastName: true, email: true, phone: true } },
    },
  });

  if (!investor) {
    return NextResponse.json({ error: "Investor not found" }, { status: 404 });
  }

  return NextResponse.json(buildProfileResponse(investor));
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await parseBody(req, ProfileUpdateSchema);
  if (error) return error;

  try {
    const updated = await prisma.investor.update({
      where: { id },
      data: {
        mailingAddress: data!.mailingAddress,
        taxId: data!.taxId,
        phone: data!.phone,
      },
      include: {
        commitments: {
          include: { entity: { select: { id: true, name: true } } },
        },
        notificationPreference: { select: { emailAddress: true, phoneNumber: true } },
        contact: { select: { firstName: true, lastName: true, email: true, phone: true } },
      },
    });

    return NextResponse.json(buildProfileResponse(updated));
  } catch (err: any) {
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}
