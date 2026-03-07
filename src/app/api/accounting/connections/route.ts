import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateAccountingConnectionSchema } from "@/lib/schemas";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    const firmFilter = authUser?.firmId ? { firmId: authUser.firmId } : {};

    const entities = await prisma.entity.findMany({
      where: firmFilter,
      include: {
        accountingConnection: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(entities);
  } catch (err) {
    console.error("[accounting/connections] Error:", err);
    return NextResponse.json(
      { error: "Failed to load accounting connections" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
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
  } catch (err) {
    console.error("[accounting/connections] PATCH Error:", err);
    return NextResponse.json(
      { error: "Failed to update accounting connection" },
      { status: 500 },
    );
  }
}
