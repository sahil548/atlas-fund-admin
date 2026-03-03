import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/dd-categories
 * Return all DDCategoryTemplate records, optionally filtered by firmId.
 */
export async function GET(req: NextRequest) {
  const firmId = req.nextUrl.searchParams.get("firmId");

  const templates = await prisma.dDCategoryTemplate.findMany({
    where: firmId
      ? {
          OR: [
            { firmId },
            { firmId: null, isDefault: true },
          ],
        }
      : { isDefault: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(templates);
}

/**
 * POST /api/dd-categories
 * Create a new DDCategoryTemplate.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name as string | undefined;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const template = await prisma.dDCategoryTemplate.create({
    data: {
      firmId: (body.firmId as string) || null,
      name: name.trim(),
      description: (body.description as string) || null,
      defaultInstructions: (body.defaultInstructions as string) || null,
      isDefault: body.isDefault === true,
      scope: (body.scope as string) || "UNIVERSAL",
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 99,
    },
  });

  return NextResponse.json(template, { status: 201 });
}

/**
 * PUT /api/dd-categories
 * Update an existing DDCategoryTemplate.
 */
export async function PUT(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = body.id as string | undefined;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updated = await prisma.dDCategoryTemplate.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: String(body.name) }),
      ...(body.description !== undefined && { description: body.description as string | null }),
      ...(body.defaultInstructions !== undefined && { defaultInstructions: body.defaultInstructions as string | null }),
      ...(body.isDefault !== undefined && { isDefault: body.isDefault === true }),
      ...(body.scope !== undefined && { scope: String(body.scope) }),
      ...(typeof body.sortOrder === "number" && { sortOrder: body.sortOrder }),
    },
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/dd-categories
 * Delete a DDCategoryTemplate by id query param.
 */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query param is required" }, { status: 400 });
  }

  await prisma.dDCategoryTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
