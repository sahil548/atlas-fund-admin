import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getAuthUser } from "@/lib/auth";

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; workstreamId: string }> },
) {
  const { id, workstreamId } = await params;

  // Verify workstream belongs to deal
  const workstream = await prisma.dDWorkstream.findFirst({
    where: { id: workstreamId, dealId: id },
    select: { id: true },
  });
  if (!workstream) {
    return NextResponse.json({ error: "Workstream not found" }, { status: 404 });
  }

  const attachments = await prisma.dDWorkstreamAttachment.findMany({
    where: { workstreamId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(attachments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; workstreamId: string }> },
) {
  const { id, workstreamId } = await params;

  // Verify workstream belongs to deal
  const workstream = await prisma.dDWorkstream.findFirst({
    where: { id: workstreamId, dealId: id },
    select: { id: true },
  });
  if (!workstream) {
    return NextResponse.json({ error: "Workstream not found" }, { status: 404 });
  }

  // Get current user from auth context
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = file.name;
    const storageName = `${Date.now()}-${fileName.replace(/\s+/g, "_")}`;
    const fileSize = buffer.length;

    let fileUrl: string;

    if (USE_BLOB) {
      // Vercel Blob (production)
      const blob = await put(`workstream-attachments/${storageName}`, buffer, {
        access: "private",
        contentType: file.type || "application/octet-stream",
      });
      fileUrl = blob.url;
    } else {
      // Local storage (development) — store as data URL for simplicity
      const base64 = buffer.toString("base64");
      const mimeType = file.type || "application/octet-stream";
      fileUrl = `data:${mimeType};base64,${base64}`;
    }

    const attachment = await prisma.dDWorkstreamAttachment.create({
      data: {
        workstreamId,
        fileName,
        fileUrl,
        fileSize,
        uploadedById: authUser.id,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; workstreamId: string }> },
) {
  const { id, workstreamId } = await params;
  const { searchParams } = new URL(req.url);
  const attachmentId = searchParams.get("attachmentId");

  if (!attachmentId) {
    return NextResponse.json({ error: "Missing attachmentId" }, { status: 400 });
  }

  // Verify attachment belongs to this workstream and deal
  const workstream = await prisma.dDWorkstream.findFirst({
    where: { id: workstreamId, dealId: id },
    select: { id: true },
  });
  if (!workstream) {
    return NextResponse.json({ error: "Workstream not found" }, { status: 404 });
  }

  const attachment = await prisma.dDWorkstreamAttachment.findFirst({
    where: { id: attachmentId, workstreamId },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  await prisma.dDWorkstreamAttachment.delete({
    where: { id: attachmentId },
  });

  return NextResponse.json({ ok: true });
}
