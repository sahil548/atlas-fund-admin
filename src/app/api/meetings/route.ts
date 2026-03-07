import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateMeetingSchema } from "@/lib/schemas";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const where = firmId
      ? {
          OR: [
            { deal: { firmId } },
            { entity: { firmId } },
            { dealId: null, entityId: null },
          ],
        }
      : {};

    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        asset: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
      },
      orderBy: { meetingDate: "desc" },
    });
    return NextResponse.json(meetings);
  } catch (err) {
    console.error("[meetings] GET Error:", err);
    return NextResponse.json(
      { error: "Failed to load meetings" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { data, error } = await parseBody(req, CreateMeetingSchema);
    if (error) return error;
    const meeting = await prisma.meeting.create({
      data: {
        ...data!,
        meetingDate: new Date(data!.meetingDate),
      },
    });
    return NextResponse.json(meeting, { status: 201 });
  } catch (err) {
    console.error("[meetings] POST Error:", err);
    return NextResponse.json(
      { error: "Failed to create meeting" },
      { status: 500 },
    );
  }
}
