import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultDDCategoriesForFirm } from "@/lib/default-dd-categories";
import { parseBody } from "@/lib/api-helpers";
import { CreateDDCategorySchema, UpdateDDCategorySchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

/**
 * Ensures default DD category templates exist for a firm.
 * If none exist, auto-provisions them (handles firms created before
 * this feature was added, or after a DB reset).
 */
async function ensureDefaultTemplates(firmId: string) {
  const count = await prisma.dDCategoryTemplate.count({ where: { firmId } });
  if (count === 0) {
    const defaults = getDefaultDDCategoriesForFirm(firmId);
    await prisma.dDCategoryTemplate.createMany({ data: defaults });
    logger.info(`[dd-categories] Auto-provisioned ${defaults.length} default templates for firm ${firmId}`);
  }
}

/**
 * GET /api/dd-categories
 * Return all DDCategoryTemplate records, optionally filtered by firmId.
 */
export async function GET(req: NextRequest) {
  const firmId = req.nextUrl.searchParams.get("firmId");

  // Auto-provision defaults for the firm if none exist
  if (firmId) {
    await ensureDefaultTemplates(firmId);
  }

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
  const { data, error } = await parseBody(req, CreateDDCategorySchema);
  if (error) return error;
  const body = data!;

  const template = await prisma.dDCategoryTemplate.create({
    data: {
      firmId: body.firmId || null,
      name: body.name.trim(),
      description: body.description || null,
      defaultInstructions: body.defaultInstructions || null,
      isDefault: body.isDefault ?? false,
      scope: body.scope || "UNIVERSAL",
      sortOrder: body.sortOrder ?? 99,
    },
  });

  return NextResponse.json(template, { status: 201 });
}

/**
 * PUT /api/dd-categories
 * Update an existing DDCategoryTemplate.
 */
export async function PUT(req: NextRequest) {
  const { data, error } = await parseBody(req, UpdateDDCategorySchema);
  if (error) return error;
  const { id, ...fields } = data!;

  const updated = await prisma.dDCategoryTemplate.update({
    where: { id },
    data: {
      ...(fields.name !== undefined && { name: fields.name }),
      ...(fields.description !== undefined && { description: fields.description }),
      ...(fields.defaultInstructions !== undefined && { defaultInstructions: fields.defaultInstructions }),
      ...(fields.isDefault !== undefined && { isDefault: fields.isDefault }),
      ...(fields.scope !== undefined && { scope: fields.scope }),
      ...(fields.sortOrder !== undefined && { sortOrder: fields.sortOrder }),
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
