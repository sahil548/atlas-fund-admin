import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateAIPromptTemplateSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/api-helpers";
import { DEFAULT_PROMPT_TEMPLATES } from "@/lib/default-prompt-templates";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { getEffectivePermissions, checkPermission } from "@/lib/permissions";

// GET — returns all templates (DB rows merged with defaults for uncustomized types)
export async function GET(req: Request) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (authUser.role === "GP_TEAM") {
    const perms = await getEffectivePermissions(authUser.id);
    if (!checkPermission(perms, "settings", "read_only")) return forbidden();
  }

  const firmId = authUser.firmId!;
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
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (authUser.role === "GP_TEAM") {
    const perms = await getEffectivePermissions(authUser.id);
    if (!checkPermission(perms, "settings", "full")) return forbidden();
  }

  const firmId = authUser.firmId!;

  const { data, error } = await parseBody(req, CreateAIPromptTemplateSchema);
  if (error) return error;

  try {
    const template = await prisma.aIPromptTemplate.upsert({
      where: {
        firmId_type: { firmId, type: data!.type },
      },
      create: {
        firmId,
        type: data!.type,
        module: data!.module,
        name: data!.name,
        description: data!.description || null,
        content: data!.content,
        isDefault: false,
        isActive: data!.isActive,
        sortOrder: data!.sortOrder,
      },
      update: {
        name: data!.name,
        description: data!.description || null,
        content: data!.content,
        isDefault: false,
        isActive: data!.isActive,
        sortOrder: data!.sortOrder,
      },
    });
    return NextResponse.json({ ...template, persisted: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
