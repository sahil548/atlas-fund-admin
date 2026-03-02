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
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
