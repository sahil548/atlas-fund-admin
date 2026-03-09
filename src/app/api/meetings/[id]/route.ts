/**
 * GET /api/meetings/[id]
 *
 * Fetch a single meeting with linked deal, entity (vehicle), and asset data.
 */

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const { id } = await params;

  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        deal: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
        asset: { select: { id: true, name: true } },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    return NextResponse.json(meeting);
  } catch (err) {
    console.error("[meetings/[id]] GET Error:", err);
    return NextResponse.json({ error: "Failed to load meeting" }, { status: 500 });
  }
}
