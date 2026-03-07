import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getAuthUser } from "@/lib/auth";

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const { id, taskId } = await params;

  // Verify task exists and belongs to a workstream in this deal (2-step lookup)
  const task = await prisma.dDTask.findUnique({
    where: { id: taskId },
    select: { id: true, workstreamId: true },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  const ws = await prisma.dDWorkstream.findFirst({
    where: { id: task.workstreamId, dealId: id },
  });
  if (!ws) {
    return NextResponse.json({ error: "Task not in this deal" }, { status: 404 });
  }

  const attachments = await prisma.dDTaskAttachment.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(attachments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const { id, taskId } = await params;

  // Verify task exists and belongs to a workstream in this deal (2-step lookup)
  const task = await prisma.dDTask.findUnique({
    where: { id: taskId },
    select: { id: true, workstreamId: true },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  const wsCheck = await prisma.dDWorkstream.findFirst({
    where: { id: task.workstreamId, dealId: id },
  });
  if (!wsCheck) {
    return NextResponse.json({ error: "Task not in this deal" }, { status: 404 });
  }

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
      const blob = await put(`task-attachments/${storageName}`, buffer, {
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

    const attachment = await prisma.dDTaskAttachment.create({
      data: {
        taskId,
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
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const { id, taskId } = await params;
  const { searchParams } = new URL(req.url);
  const attachmentId = searchParams.get("attachmentId");

  if (!attachmentId) {
    return NextResponse.json({ error: "Missing attachmentId" }, { status: 400 });
  }

  // Verify task exists and belongs to this deal (2-step lookup)
  const task = await prisma.dDTask.findUnique({
    where: { id: taskId },
    select: { id: true, workstreamId: true },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  const wsDel = await prisma.dDWorkstream.findFirst({
    where: { id: task.workstreamId, dealId: id },
  });
  if (!wsDel) {
    return NextResponse.json({ error: "Task not in this deal" }, { status: 404 });
  }

  const attachment = await prisma.dDTaskAttachment.findFirst({
    where: { id: attachmentId, taskId },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  await prisma.dDTaskAttachment.delete({
    where: { id: attachmentId },
  });

  return NextResponse.json({ ok: true });
}
