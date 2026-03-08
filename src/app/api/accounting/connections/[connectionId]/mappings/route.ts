import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { parseBody } from "@/lib/api-helpers";
import { z } from "zod";
import { AtlasAccountBucketEnum, CreateAccountMappingSchema } from "@/lib/schemas";

// Schema for bulk mapping creation
const BulkAccountMappingSchema = z.object({
  mappings: z.array(
    CreateAccountMappingSchema.omit({ connectionId: true })
  ),
});

// Schema for single mapping PATCH
const PatchMappingSchema = z.object({
  mappingId: z.string().min(1),
  atlasAccountType: AtlasAccountBucketEnum,
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();

    const { connectionId } = await params;

    // Verify firm ownership
    const connection = await prisma.accountingConnection.findUnique({
      where: { id: connectionId },
      include: { entity: { select: { firmId: true } } },
    });

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    if (connection.entity.firmId !== authUser.firmId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const mappings = await prisma.accountMapping.findMany({
      where: { connectionId },
      orderBy: { atlasAccountType: "asc" },
    });

    return NextResponse.json({ mappings });
  } catch (err: unknown) {
    console.error("[mappings] GET Error:", err);
    return NextResponse.json({ error: "Failed to load mappings" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();

    const { connectionId } = await params;

    // Verify firm ownership
    const connection = await prisma.accountingConnection.findUnique({
      where: { id: connectionId },
      include: { entity: { select: { firmId: true } } },
    });

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    if (connection.entity.firmId !== authUser.firmId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await parseBody(req, BulkAccountMappingSchema);
    if (error) return error;

    const { mappings } = data!;

    // Delete existing mappings for these provider accounts (upsert pattern without unique constraint)
    const providerAccountIds = mappings
      .filter((m) => m.providerAccountId)
      .map((m) => m.providerAccountId as string);

    await prisma.accountMapping.deleteMany({
      where: {
        connectionId,
        providerAccountId: { in: providerAccountIds },
      },
    });

    // Create all new mappings
    const created = await prisma.accountMapping.createMany({
      data: mappings.map((m) => ({
        connectionId,
        atlasAccountType: m.atlasAccountType,
        providerAccountId: m.providerAccountId,
        providerAccountName: m.providerAccountName,
        isAutoDetected: m.isAutoDetected ?? false,
      })),
    });

    // Mark chartOfAccountsMapped = true once any mappings exist
    const totalMappings = await prisma.accountMapping.count({
      where: { connectionId },
    });

    if (totalMappings > 0) {
      await prisma.accountingConnection.update({
        where: { id: connectionId },
        data: { chartOfAccountsMapped: true },
      });
    }

    return NextResponse.json({ created: created.count }, { status: 201 });
  } catch (err: unknown) {
    console.error("[mappings] POST Error:", err);
    const message = err instanceof Error ? err.message : "Failed to save mappings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();

    const { connectionId } = await params;

    // Verify firm ownership
    const connection = await prisma.accountingConnection.findUnique({
      where: { id: connectionId },
      include: { entity: { select: { firmId: true } } },
    });

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    if (connection.entity.firmId !== authUser.firmId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await parseBody(req, PatchMappingSchema);
    if (error) return error;

    // Verify the mapping belongs to this connection
    const mapping = await prisma.accountMapping.findUnique({
      where: { id: data!.mappingId },
    });

    if (!mapping || mapping.connectionId !== connectionId) {
      return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
    }

    const updated = await prisma.accountMapping.update({
      where: { id: data!.mappingId },
      data: { atlasAccountType: data!.atlasAccountType, isAutoDetected: false },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("[mappings] PATCH Error:", err);
    const message = err instanceof Error ? err.message : "Failed to update mapping";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
