import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// Field-to-parent-record mapping for each document category
// FINANCIAL (CIM/credit): writes to Deal
// LEGAL (lease): writes to Asset
// TAX (K-1): writes to Entity
const DEAL_FIELD_MAP: Record<string, string> = {
  dealSize: "targetSize",
  targetReturn: "targetReturn",
  investmentStructure: "targetCheckSize", // closest existing field
  projectedIRR: "targetReturn", // stored as string on deal
  holdPeriod: "targetCheckSize",
  // Fields without direct parent columns go to dealMetadata JSON
};

const ASSET_FIELD_MAP: Record<string, string> = {
  projectedIRR: "projectedIRR", // Float on Asset
  projectedMultiple: "projectedMultiple", // Float on Asset
  // Lease fields for LEGAL docs
  tenantName: "projectedMetrics", // stored in JSON
  baseRentMonthly: "projectedMetrics",
  leaseStartDate: "projectedMetrics",
  leaseEndDate: "projectedMetrics",
  squareFeet: "projectedMetrics",
};

const ENTITY_FIELD_MAP: Record<string, string> = {
  targetSize: "targetSize",
  totalCommitments: "totalCommitments",
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await getAuthUser();

  const body = await req.json();
  // body.fields: Array<{ key: string, value: string, aiValue: string }>

  if (!body.fields || !Array.isArray(body.fields) || body.fields.length === 0) {
    return NextResponse.json({ error: "No fields to apply" }, { status: 400 });
  }

  const doc = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      category: true,
      dealId: true,
      assetId: true,
      entityId: true,
      investorId: true,
      extractedFields: true,
      appliedFields: true,
    },
  });

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  // Build audit record -- preserve original AI value alongside applied value
  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingApplied = (doc.appliedFields as Record<string, any>) || {};
  const newApplied = { ...existingApplied };

  for (const field of body.fields) {
    newApplied[field.key] = {
      aiValue: field.aiValue,
      appliedValue: field.value,
      appliedAt: now,
    };
  }

  // Update the document with applied fields audit record
  await prisma.document.update({
    where: { id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { appliedFields: newApplied as any },
  });

  // ---- WRITE EXTRACTED VALUES TO PARENT RECORDS (DOC-02) ----
  // Map extracted field keys to actual parent record columns and update them.

  if (doc.dealId) {
    const dealDirectFields: Record<string, string> = {};
    const dealMetadataFields: Record<string, string> = {};

    for (const field of body.fields) {
      const parentCol = DEAL_FIELD_MAP[field.key];
      if (parentCol && parentCol !== "dealMetadata") {
        // Only write if the value is non-empty
        if (field.value) dealDirectFields[parentCol] = field.value;
      } else if (field.value) {
        // Fields without a direct column go to dealMetadata JSON
        dealMetadataFields[field.key] = field.value;
      }
    }

    if (
      Object.keys(dealDirectFields).length > 0 ||
      Object.keys(dealMetadataFields).length > 0
    ) {
      const deal = await prisma.deal.findUnique({
        where: { id: doc.dealId },
        select: { dealMetadata: true },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingMeta = (deal?.dealMetadata as Record<string, any>) || {};
      const mergedMeta = { ...existingMeta, ...dealMetadataFields };

      await prisma.deal.update({
        where: { id: doc.dealId },
        data: {
          ...dealDirectFields,
          ...(Object.keys(dealMetadataFields).length > 0
            ? { dealMetadata: mergedMeta }
            : {}),
        },
      });
    }
  }

  if (doc.assetId) {
    const assetDirectFields: Record<string, number> = {};
    const assetMetricsFields: Record<string, string> = {};

    for (const field of body.fields) {
      const parentCol = ASSET_FIELD_MAP[field.key];
      if (parentCol === "projectedIRR" || parentCol === "projectedMultiple") {
        // These are Float fields -- parse the value
        const num = parseFloat(field.value);
        if (!isNaN(num)) assetDirectFields[parentCol] = num;
      } else if (parentCol === "projectedMetrics") {
        // Store in the JSON metrics field
        if (field.value) assetMetricsFields[field.key] = field.value;
      }
    }

    if (
      Object.keys(assetDirectFields).length > 0 ||
      Object.keys(assetMetricsFields).length > 0
    ) {
      const asset = await prisma.asset.findUnique({
        where: { id: doc.assetId },
        select: { projectedMetrics: true },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingMetrics = (asset?.projectedMetrics as Record<string, any>) || {};
      const mergedMetrics = { ...existingMetrics, ...assetMetricsFields };

      await prisma.asset.update({
        where: { id: doc.assetId },
        data: {
          ...assetDirectFields,
          ...(Object.keys(assetMetricsFields).length > 0
            ? { projectedMetrics: mergedMetrics }
            : {}),
        },
      });
    }
  }

  if (doc.entityId) {
    const entityFields: Record<string, number> = {};

    for (const field of body.fields) {
      const parentCol = ENTITY_FIELD_MAP[field.key];
      if (parentCol === "targetSize" || parentCol === "totalCommitments") {
        const num = parseFloat(field.value);
        if (!isNaN(num)) entityFields[parentCol] = num;
      }
    }

    if (Object.keys(entityFields).length > 0) {
      await prisma.entity.update({
        where: { id: doc.entityId },
        data: entityFields,
      });
    }
  }

  return NextResponse.json({
    success: true,
    appliedCount: body.fields.length,
    appliedFields: newApplied,
    parentUpdated: !!(doc.dealId || doc.assetId || doc.entityId),
  });
}
