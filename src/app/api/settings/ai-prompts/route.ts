import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateAIPromptTemplateSchema } from "@/lib/schemas";
import { DEFAULT_PROMPT_TEMPLATES } from "@/lib/default-prompt-templates";
import { getAuthUser } from "@/lib/auth";

async function getFirmId(): Promise<string> {
  const authUser = await getAuthUser();
  if (!authUser?.firmId) throw new Error("Not authenticated");
  return authUser.firmId;
}

// GET — returns all templates (DB rows merged with defaults for uncustomized types)
export async function GET(req: Request) {
  const firmId = await getFirmId();
  const url = new URL(req.url);
  const moduleFilter = url.searchParams.get("module");

  const dbTemplates = await prisma.aIPromptTemplate.findMany({
    where: { firmId },
    orderBy: { sortOrder: "asc" },
  });

  const existingTypes = new Set(dbTemplates.map((t) => t.type));

  // Merge DB rows with defaults for any types not yet customized
  const defaults = DEFAULT_PROMPT_TEMPLATES
    .filter((d) => !existingTypes.has(d.type))
    .map((d, i) => ({
      id: null as string | null,
      firmId,
      type: d.type,
      module: d.module,
      name: d.name,
      description: d.description,
      content: d.content,
      isDefault: true,
      isActive: true,
      sortOrder: i,
      persisted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

  const dbMapped = dbTemplates.map((t) => ({
    ...t,
    persisted: true,
  }));

  let merged = [...dbMapped, ...defaults];

  if (moduleFilter) {
    merged = merged.filter((t) => t.module === moduleFilter);
  }

  return NextResponse.json(merged);
}

// PUT — upsert a template by [firmId, type]
export async function PUT(req: Request) {
  const firmId = await getFirmId();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = CreateAIPromptTemplateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }
  const data = result.data;

  try {
    const template = await prisma.aIPromptTemplate.upsert({
      where: {
        firmId_type: { firmId, type: data.type },
      },
      create: {
        firmId,
        type: data.type,
        module: data.module,
        name: data.name,
        description: data.description || null,
        content: data.content,
        isDefault: false,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
      update: {
        name: data.name,
        description: data.description || null,
        content: data.content,
        isDefault: false,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });
    return NextResponse.json({ ...template, persisted: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
