import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

const CreateChecklistItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

const UpdateChecklistItemSchema = z.object({
  itemId: z.string().min(1),
  isChecked: z.boolean().optional(),
  title: z.string().optional(),
});

const DeleteChecklistItemSchema = z.object({
  itemId: z.string().min(1),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const items = await prisma.taskChecklistItem.findMany({
      where: { taskId: id },
      orderBy: { position: "asc" },
    });
    return NextResponse.json(items);
  } catch (err) {
    logger.error("[tasks/checklist] GET Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to load checklist items" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const parsed = CreateChecklistItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    const maxPos = await prisma.taskChecklistItem.aggregate({
      where: { taskId: id },
      _max: { position: true },
    });
    const position = (maxPos._max.position ?? -1) + 1;

    const item = await prisma.taskChecklistItem.create({
      data: {
        taskId: id,
        title: parsed.data.title,
        position,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    logger.error("[tasks/checklist] POST Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to create checklist item" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await params; // consume params (taskId unused for PATCH — itemId is used)
    const body = await req.json();

    const parsed = UpdateChecklistItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    const { itemId, ...updateData } = parsed.data;
    const item = await prisma.taskChecklistItem.update({
      where: { id: itemId },
      data: updateData,
    });
    return NextResponse.json(item);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "P2025") {
      return NextResponse.json(
        { error: "Checklist item not found" },
        { status: 404 },
      );
    }
    logger.error("[tasks/checklist] PATCH Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to update checklist item" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await params; // consume params
    const body = await req.json();

    const parsed = DeleteChecklistItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    await prisma.taskChecklistItem.delete({
      where: { id: parsed.data.itemId },
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "P2025") {
      return NextResponse.json(
        { error: "Checklist item not found" },
        { status: 404 },
      );
    }
    logger.error("[tasks/checklist] DELETE Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to delete checklist item" },
      { status: 500 },
    );
  }
}
