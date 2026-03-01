import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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
