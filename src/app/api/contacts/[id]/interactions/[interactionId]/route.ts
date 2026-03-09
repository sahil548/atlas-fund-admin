import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateInteractionSchema } from "@/lib/schemas";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; interactionId: string }> }
) {
  const { id: contactId, interactionId } = await params;
  const url = new URL(req.url);
  const firmId = url.searchParams.get("firmId");

  const { data, error } = await parseBody(req, UpdateInteractionSchema);
  if (error) return error;

  // Verify interaction belongs to contactId + firmId
  const existing = await prisma.contactInteraction.findFirst({
    where: {
      id: interactionId,
      contactId,
      ...(firmId ? { firmId } : {}),
    },
  });
  if (!existing) return NextResponse.json({ error: "Interaction not found" }, { status: 404 });

  const updated = await prisma.contactInteraction.update({
    where: { id: interactionId },
    data: {
      ...(data!.type ? { type: data!.type } : {}),
      ...(data!.notes ? { notes: data!.notes } : {}),
      ...(data!.date ? { date: new Date(data!.date) } : {}),
      dealId: data!.dealId !== undefined ? data!.dealId : existing.dealId,
      entityId: data!.entityId !== undefined ? data!.entityId : existing.entityId,
    },
    include: {
      author: { select: { id: true, name: true, initials: true } },
      deal: { select: { id: true, name: true } },
      entity: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; interactionId: string }> }
) {
  const { id: contactId, interactionId } = await params;

  // Verify interaction belongs to contactId
  const existing = await prisma.contactInteraction.findFirst({
    where: { id: interactionId, contactId },
  });
  if (!existing) return NextResponse.json({ error: "Interaction not found" }, { status: 404 });

  await prisma.contactInteraction.delete({ where: { id: interactionId } });

  return NextResponse.json({ success: true });
}
