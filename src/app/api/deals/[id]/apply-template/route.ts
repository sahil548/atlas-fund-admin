import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { ApplyDDTemplateSchema } from "@/lib/schemas";
import { DD_TEMPLATES } from "@/lib/dd-templates";

/**
 * POST /api/deals/[id]/apply-template
 * Apply a DD template: create workstreams + tasks from the template definition.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, ApplyDDTemplateSchema);
  if (error) return error;

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: { workstreams: true },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Find the template
  const template = DD_TEMPLATES.find((t) => t.id === data!.templateId);
  if (!template) {
    return NextResponse.json(
      { error: `Template "${data!.templateId}" not found` },
      { status: 400 },
    );
  }

  // Create workstreams and tasks
  for (const ws of template.workstreams) {
    const workstream = await prisma.dDWorkstream.create({
      data: {
        dealId: id,
        name: ws.name,
        status: "NOT_STARTED",
        totalTasks: ws.tasks.length,
        completedTasks: 0,
      },
    });

    if (ws.tasks.length > 0) {
      await prisma.dDTask.createMany({
        data: ws.tasks.map((task) => ({
          workstreamId: workstream.id,
          title: task.title,
          status: "TODO" as const,
        })),
      });
    }
  }

  // Return the updated deal with workstreams + tasks
  const updatedDeal = await prisma.deal.findUnique({
    where: { id },
    include: {
      workstreams: { include: { tasks: true }, orderBy: { name: "asc" } },
    },
  });

  return NextResponse.json(updatedDeal);
}
