import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api-helpers";
import { CreateDealActivitySchema } from "@/lib/schemas";

interface TimelineEntry {
  type: "activity" | "meeting";
  id: string;
  description: string;
  date: string;
  metadata: Record<string, unknown>;
}

/**
 * GET /api/deals/[id]/activities
 * Returns a merged timeline of DealActivity records and Meetings, sorted by date descending.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Verify deal exists
  const deal = await prisma.deal.findUnique({ where: { id }, select: { id: true } });
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Fetch activities and meetings in parallel
  const [activities, meetings] = await Promise.all([
    prisma.dealActivity.findMany({
      where: { dealId: id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.meeting.findMany({
      where: { dealId: id },
      orderBy: { meetingDate: "desc" },
    }),
  ]);

  // Map to unified timeline entries
  const activityEntries: TimelineEntry[] = activities.map((a) => ({
    type: "activity" as const,
    id: a.id,
    description: a.description,
    date: a.createdAt.toISOString(),
    metadata: {
      activityType: a.activityType,
      ...(a.metadata && typeof a.metadata === "object" && !Array.isArray(a.metadata)
        ? (a.metadata as Record<string, unknown>)
        : {}),
    },
  }));

  const meetingEntries: TimelineEntry[] = meetings.map((m) => ({
    type: "meeting" as const,
    id: m.id,
    description: `${m.meetingType ? m.meetingType + ": " : ""}${m.title}`,
    date: m.meetingDate.toISOString(),
    metadata: {
      meetingType: m.meetingType,
      source: m.source,
      hasTranscript: m.hasTranscript,
      actionItems: m.actionItems,
      summary: m.summary,
    },
  }));

  // Merge and sort by date descending
  const timeline = [...activityEntries, ...meetingEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return NextResponse.json(timeline);
}

/**
 * POST /api/deals/[id]/activities
 * Create a new DealActivity entry.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, CreateDealActivitySchema);
  if (error) return error;

  // Verify deal exists
  const deal = await prisma.deal.findUnique({ where: { id }, select: { id: true } });
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const activity = await prisma.dealActivity.create({
    data: {
      dealId: id,
      activityType: data!.activityType,
      description: data!.description,
      metadata: data!.metadata ?? undefined,
    },
  });

  return NextResponse.json(activity, { status: 201 });
}
