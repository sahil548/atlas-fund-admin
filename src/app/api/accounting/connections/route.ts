import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateAccountingConnectionSchema } from "@/lib/schemas";

export async function GET() {
  const entities = await prisma.entity.findMany({
    include: {
      accountingConnection: true,
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(entities);
}

export async function PATCH(req: Request) {
  const { data, error } = await parseBody(req, UpdateAccountingConnectionSchema);
  if (error) return error;
  const conn = await prisma.accountingConnection.updateMany({
    where: { entityId: data!.entityId },
    data: {
      syncStatus: data!.syncStatus,
      ...(data!.lastSyncAt ? { lastSyncAt: new Date(data!.lastSyncAt) } : {}),
    },
  });
  return NextResponse.json(conn);
}
