import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { ContactTagSchema } from "@/lib/schemas";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contactId } = await params;
  const url = new URL(req.url);
  const firmId = url.searchParams.get("firmId");

  if (!firmId) return NextResponse.json({ error: "firmId required" }, { status: 400 });

  const { data, error } = await parseBody(req, ContactTagSchema);
  if (error) return error;

  // Verify contact exists and belongs to firm
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, firmId },
    select: { id: true },
  });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  try {
    const tag = await prisma.contactTag.create({
      data: {
        firmId,
        contactId,
        tag: data!.tag,
      },
    });
    return NextResponse.json(tag, { status: 201 });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Tag already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to add tag" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contactId } = await params;
  const url = new URL(req.url);
  const firmId = url.searchParams.get("firmId");
  const tag = url.searchParams.get("tag");

  if (!tag) {
    // Try to parse from body
    const body = await req.json().catch(() => ({}));
    const tagFromBody = body?.tag;
    if (!tagFromBody) {
      return NextResponse.json({ error: "tag required" }, { status: 400 });
    }
    await prisma.contactTag.deleteMany({
      where: { contactId, tag: tagFromBody, ...(firmId ? { firmId } : {}) },
    });
    return NextResponse.json({ success: true });
  }

  await prisma.contactTag.deleteMany({
    where: { contactId, tag, ...(firmId ? { firmId } : {}) },
  });

  return NextResponse.json({ success: true });
}
