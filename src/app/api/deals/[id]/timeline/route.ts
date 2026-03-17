import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface TimelineItem {
  id: string;
  type: "note" | "meeting" | "interaction" | "conversation";
  title: string;
  content: string;
  date: string;
  author?: { name: string; initials: string | null };
  metadata: Record<string, unknown>;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await params;

  // Fetch all 4 sources in parallel
  const [notes, meetings, interactions, conversations] = await Promise.all([
    prisma.note.findMany({
      where: { dealId },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true, initials: true } } },
    }),
    prisma.meeting.findMany({
      where: { dealId },
      orderBy: { meetingDate: "desc" },
      select: {
        id: true,
        title: true,
        meetingDate: true,
        source: true,
        summary: true,
        decisions: true,
        actionItems: true,
        hasTranscript: true,
      },
    }),
    prisma.contactInteraction.findMany({
      where: { dealId },
      orderBy: { date: "desc" },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        author: { select: { name: true, initials: true } },
      },
    }),
    prisma.savedConversation.findMany({
      where: { dealId },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true, initials: true } } },
    }),
  ]);

  // Normalize to timeline items
  const timeline: TimelineItem[] = [];

  for (const n of notes) {
    timeline.push({
      id: n.id,
      type: "note",
      title: "Note",
      content: n.content,
      date: n.createdAt.toISOString(),
      author: n.author || undefined,
      metadata: {},
    });
  }

  for (const m of meetings) {
    timeline.push({
      id: m.id,
      type: "meeting",
      title: m.title,
      content: m.summary || "",
      date: m.meetingDate.toISOString(),
      metadata: {
        source: m.source,
        actionItems: m.actionItems,
        hasTranscript: m.hasTranscript,
        decisions: m.decisions,
      },
    });
  }

  for (const i of interactions) {
    const contactName = i.contact
      ? `${i.contact.firstName} ${i.contact.lastName}`
      : "Unknown";
    timeline.push({
      id: i.id,
      type: "interaction",
      title: `${i.type} with ${contactName}`,
      content: i.notes,
      date: i.date.toISOString(),
      author: i.author || undefined,
      metadata: {
        interactionType: i.type,
        contactId: i.contact?.id,
        contactName,
      },
    });
  }

  for (const c of conversations) {
    timeline.push({
      id: c.id,
      type: "conversation",
      title: c.title,
      content: c.summary || "",
      date: c.createdAt.toISOString(),
      author: c.author || undefined,
      metadata: {
        messages: c.messages,
        messageCount: Array.isArray(c.messages)
          ? (c.messages as unknown[]).length
          : 0,
      },
    });
  }

  // Sort by date descending
  timeline.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return NextResponse.json(timeline);
}
