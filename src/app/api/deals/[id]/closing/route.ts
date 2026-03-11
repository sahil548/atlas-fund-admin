import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateClosingChecklistItemSchema } from "@/lib/schemas";
import { CLOSING_CHECKLIST_TEMPLATES } from "@/lib/closing-templates";
import { put } from "@vercel/blob";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Schema for the action-based POST body
const ClosingPostSchema = z.union([
  z.object({ action: z.literal("INITIALIZE") }),
  z.object({
    action: z.literal("ADD_CUSTOM"),
    title: z.string().min(1, "Title is required"),
  }),
  z.object({
    action: z.undefined().optional(),
    title: z.string().optional(),
    assigneeId: z.string().nullable().optional(),
    order: z.number().optional(),
    notes: z.string().optional(),
    dueDate: z.string().optional(),
  }),
]);

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const items = await prisma.closingChecklist.findMany({
    where: { dealId: id },
    include: {
      assignedTo: { select: { id: true, name: true, initials: true } },
    },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, ClosingPostSchema);
  if (error) return error;
  const body = data!;

  // Initialize from templates
  if (body.action === "INITIALIZE") {
    const existing = await prisma.closingChecklist.count({ where: { dealId: id } });
    if (existing > 0) {
      return NextResponse.json({ error: "Checklist already initialized" }, { status: 400 });
    }

    const items = await prisma.$transaction(
      CLOSING_CHECKLIST_TEMPLATES.map((t) =>
        prisma.closingChecklist.create({
          data: {
            dealId: id,
            title: t.title,
            order: t.order,
            status: "NOT_STARTED",
          },
        }),
      ),
    );

    return NextResponse.json(items, { status: 201 });
  }

  // Add custom checklist item
  if (body.action === "ADD_CUSTOM") {
    // Get max existing order
    const maxOrderItem = await prisma.closingChecklist.findFirst({
      where: { dealId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const nextOrder = (maxOrderItem?.order ?? 0) + 1;

    const item = await prisma.closingChecklist.create({
      data: {
        dealId: id,
        title: (body as { action: "ADD_CUSTOM"; title: string }).title.trim(),
        status: "NOT_STARTED",
        order: nextOrder,
        isCustom: true,
      },
      include: {
        assignedTo: { select: { id: true, name: true, initials: true } },
      },
    });

    return NextResponse.json(item, { status: 201 });
  }

  // Single item creation (legacy)
  const legacyBody = body as { title?: string; assigneeId?: string | null; order?: number; notes?: string; dueDate?: string };
  if (!legacyBody.title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  const item = await prisma.closingChecklist.create({
    data: {
      dealId: id,
      title: legacyBody.title,
      assigneeId: legacyBody.assigneeId || null,
      order: legacyBody.order || 0,
      notes: legacyBody.notes || null,
      ...(legacyBody.dueDate ? { dueDate: new Date(legacyBody.dueDate) } : {}),
    },
  });
  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Check content type to determine if this is a file upload (FormData) or JSON update
  const contentType = req.headers.get("content-type") || "";

  // Handle file attachment via FormData
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await req.formData();
      const action = formData.get("action") as string;
      const itemId = formData.get("id") as string;

      if (!itemId) {
        return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
      }

      // Verify item belongs to this deal
      const existingItem = await prisma.closingChecklist.findFirst({
        where: { id: itemId, dealId: id },
      });
      if (!existingItem) {
        return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
      }

      if (action === "ATTACH_FILE") {
        const file = formData.get("file") as File | null;
        if (!file || file.size === 0) {
          return NextResponse.json({ error: "File is required" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const safeFileName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
        const mimeType = file.type || "application/octet-stream";

        let fileUrl: string;
        if (USE_BLOB) {
          const blob = await put(`closing-attachments/${safeFileName}`, buffer, {
            access: "private",
            contentType: mimeType,
          });
          fileUrl = `/api/documents/serve?url=${encodeURIComponent(blob.url)}`;
        } else {
          // Local dev: store in data/uploads and serve via download route
          const fs = await import("fs/promises");
          const path = await import("path");
          const uploadDir = path.join(process.cwd(), "data", "uploads");
          await fs.mkdir(uploadDir, { recursive: true });
          const filePath = path.join(uploadDir, safeFileName);
          await fs.writeFile(filePath, buffer);
          fileUrl = `/api/documents/download/${safeFileName}`;
        }

        const updated = await prisma.closingChecklist.update({
          where: { id: itemId },
          data: { fileUrl, fileName: file.name },
          include: {
            assignedTo: { select: { id: true, name: true, initials: true } },
          },
        });

        return NextResponse.json(updated);
      }

      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "File upload failed";
      logger.error("[closing PATCH] File upload error:", { error: message });
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Handle JSON body (standard updates + REMOVE_FILE)
  const { data, error } = await parseBody(req, UpdateClosingChecklistItemSchema);
  if (error) return error;

  // Handle REMOVE_FILE action
  if (data!.action === "REMOVE_FILE") {
    const item = await prisma.closingChecklist.update({
      where: { id: data!.id },
      data: { fileUrl: null, fileName: null },
      include: {
        assignedTo: { select: { id: true, name: true, initials: true } },
      },
    });
    return NextResponse.json(item);
  }

  const updateData: Record<string, unknown> = {};
  if (data!.status !== undefined) updateData.status = data!.status;
  if (data!.assigneeId !== undefined) updateData.assigneeId = data!.assigneeId;
  if (data!.dueDate !== undefined) {
    updateData.dueDate = data!.dueDate ? new Date(data!.dueDate) : null;
  }
  if (data!.notes !== undefined) updateData.notes = data!.notes;

  const item = await prisma.closingChecklist.update({
    where: { id: data!.id },
    data: updateData,
    include: {
      assignedTo: { select: { id: true, name: true, initials: true } },
    },
  });
  return NextResponse.json(item);
}
