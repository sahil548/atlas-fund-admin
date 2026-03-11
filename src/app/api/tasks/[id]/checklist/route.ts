import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import {
  CreateChecklistItemSchema,
  UpdateChecklistItemSchema,
  DeleteChecklistItemSchema,
} from "@/lib/schemas";
import { logger } from "@/lib/logger";

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
    const { data, error } = await parseBody(req, CreateChecklistItemSchema);
    if (error) return error;

    const maxPos = await prisma.taskChecklistItem.aggregate({
      where: { taskId: id },
      _max: { position: true },
    });
    const position = (maxPos._max.position ?? -1) + 1;

    const item = await prisma.taskChecklistItem.create({
      data: {
        taskId: id,
        title: data!.title,
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
    const { data, error } = await parseBody(req, UpdateChecklistItemSchema);
    if (error) return error;

    const { itemId, ...updateData } = data!;
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
    const { data, error } = await parseBody(req, DeleteChecklistItemSchema);
    if (error) return error;

    await prisma.taskChecklistItem.delete({
      where: { id: data!.itemId },
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
