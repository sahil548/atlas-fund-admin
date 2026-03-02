import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateMeetingSchema } from "@/lib/schemas";

export async function GET() {
  const meetings = await prisma.meeting.findMany({
    include: {
      asset: { select: { id: true, name: true } },
      deal: { select: { id: true, name: true } },
    },
    orderBy: { meetingDate: "desc" },
  });
  return NextResponse.json(meetings);
}

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateMeetingSchema);
  if (error) return error;
  const meeting = await prisma.meeting.create({
    data: {
      ...data!,
      meetingDate: new Date(data!.meetingDate),
    },
  });
  return NextResponse.json(meeting, { status: 201 });
}
