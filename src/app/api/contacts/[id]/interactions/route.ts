import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateInteractionSchema } from "@/lib/schemas";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const firmId = url.searchParams.get("firmId");

  const interactions = await prisma.contactInteraction.findMany({
    where: {
      contactId: id,
      ...(firmId ? { firmId } : {}),
    },
    include: {
      author: { select: { id: true, name: true, initials: true } },
      deal: { select: { id: true, name: true } },
      entity: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(interactions);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const firmId = url.searchParams.get("firmId");
  const authorId = url.searchParams.get("authorId");

  if (!firmId) return NextResponse.json({ error: "firmId required" }, { status: 400 });
  if (!authorId) return NextResponse.json({ error: "authorId required" }, { status: 400 });

  const { data, error } = await parseBody(req, CreateInteractionSchema);
  if (error) return error;

  // Verify contact exists and belongs to firm
  const contact = await prisma.contact.findFirst({
    where: { id, firmId },
    select: { id: true },
  });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const interaction = await prisma.contactInteraction.create({
    data: {
      firmId,
      contactId: id,
      authorId,
      type: data!.type,
      notes: data!.notes,
      date: data!.date ? new Date(data!.date) : new Date(),
      dealId: data!.dealId || null,
      entityId: data!.entityId || null,
    },
    include: {
      author: { select: { id: true, name: true, initials: true } },
      deal: { select: { id: true, name: true } },
      entity: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(interaction, { status: 201 });
}
