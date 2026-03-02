import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateDDWorkstreamSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateDDWorkstreamSchema);
  if (error) return error;
  const workstream = await prisma.dDWorkstream.create({ data: data! });
  return NextResponse.json(workstream, { status: 201 });
}
