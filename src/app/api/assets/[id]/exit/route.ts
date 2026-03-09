import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { ExitAssetSchema } from "@/lib/schemas";
import { getExitAutoTasks } from "@/lib/deal-auto-tasks";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data, error } = await parseBody(req, ExitAssetSchema);
  if (error) return error;

  // Look up the asset
  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Guard: only ACTIVE assets can be exited
  if (existing.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Asset is already exited or written off" },
      { status: 400 },
    );
  }

  const { exitDate, exitProceeds, exitNotes } = data!;

  // Calculate MOIC: exitProceeds / costBasis (guard against zero costBasis)
  const moic = existing.costBasis > 0 ? exitProceeds / existing.costBasis : 0;

  // Build closing task definitions
  const exitTasks = getExitAutoTasks();

  // Atomically update the asset and create closing tasks
  const [updatedAsset] = await prisma.$transaction([
    prisma.asset.update({
      where: { id },
      data: {
        status: "EXITED",
        exitDate: new Date(exitDate),
        exitProceeds,
        exitNotes: exitNotes ?? null,
        moic,
      },
    }),
    ...exitTasks.map((task) =>
      prisma.task.create({
        data: {
          title: task.title,
          status: "TODO",
          priority: task.priority,
          assetId: id,
          contextType: "asset",
          contextId: id,
        },
      }),
    ),
  ]);

  return NextResponse.json(updatedAsset);
}
