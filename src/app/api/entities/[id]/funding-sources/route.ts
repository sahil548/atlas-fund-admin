/**
 * GET  /api/entities/[id]/funding-sources
 *   Lists the disbursement bank accounts linked to an entity (Citi/Chase/TruStone/etc.).
 *
 * POST /api/entities/[id]/funding-sources
 *   Links a new funding source. Body: { linkMethod: "PLAID", publicToken, accountId,
 *   dwollaCustomerId, accountNickname? } — the caller must supply the Dwolla
 *   Verified Business Customer id that represents this entity. In Phase A
 *   Kathryn will create that customer in the Dwolla dashboard and paste the
 *   id here; Phase B can automate via Dwolla's Verified Customer API.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { parseBody } from "@/lib/api-helpers";
import { z } from "zod";
import {
  exchangeInvestorPublicToken,
  listAuthAccounts,
  createProcessorTokenForDwolla,
  isPlaidConfigured,
} from "@/lib/integrations/plaid";
import {
  createFundingSourceFromPlaidToken,
  getFundingSource,
  isDwollaConfigured,
  mapFundingSourceStatus,
} from "@/lib/integrations/dwolla";
import { logger } from "@/lib/logger";

const CreateSchema = z.object({
  dwollaCustomerId: z.string().min(1), // Verified Business Customer for this entity
  publicToken: z.string().min(1),
  accountId: z.string().min(1),
  accountNickname: z.string().max(120).optional(),
  setAsDefault: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();
    const { id: entityId } = await params;

    // Firm-scope check
    const entity = await prisma.entity.findFirst({
      where: { id: entityId, firmId: authUser.firmId },
      select: { id: true },
    });
    if (!entity) return NextResponse.json({ error: "Entity not found" }, { status: 404 });

    const sources = await prisma.entityFundingSource.findMany({
      where: { entityId, status: { not: "REMOVED" } },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        dwollaFundingSourceId: true,
        dwollaCustomerId: true,
        bankName: true,
        accountNickname: true,
        accountType: true,
        last4: true,
        status: true,
        isDefault: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ fundingSources: sources });
  } catch (err) {
    logger.error("[entity funding-sources GET]", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to load funding sources" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();
    // Only GP team can link entity disbursement accounts
    if (authUser.role === "LP_INVESTOR" || authUser.role === "SERVICE_PROVIDER") {
      return forbidden();
    }

    const { id: entityId } = await params;
    if (!isPlaidConfigured() || !isDwollaConfigured()) {
      return NextResponse.json(
        { error: "Plaid or Dwolla credentials not configured." },
        { status: 503 },
      );
    }

    const { data, error } = await parseBody(req, CreateSchema);
    if (error) return error;

    const entity = await prisma.entity.findFirst({
      where: { id: entityId, firmId: authUser.firmId },
      select: { id: true, name: true },
    });
    if (!entity) return NextResponse.json({ error: "Entity not found" }, { status: 404 });

    // Plaid exchange + processor token
    const { accessToken } = await exchangeInvestorPublicToken(data!.publicToken);
    const accounts = await listAuthAccounts(accessToken);
    const acct = accounts.find((a) => a.accountId === data!.accountId);
    if (!acct) {
      return NextResponse.json(
        { error: "Selected account not found on Plaid item" },
        { status: 400 },
      );
    }
    const processorToken = await createProcessorTokenForDwolla({
      accessToken,
      accountId: data!.accountId,
    });

    const nickname = data!.accountNickname ?? acct.officialName ?? acct.name;
    const fs = await createFundingSourceFromPlaidToken({
      customerId: data!.dwollaCustomerId,
      plaidProcessorToken: processorToken,
      accountNickname: nickname,
    });

    let fsStatus = "UNVERIFIED" as ReturnType<typeof mapFundingSourceStatus>;
    try {
      const fsRecord = await getFundingSource(fs.fundingSourceId);
      fsStatus = mapFundingSourceStatus(fsRecord?.status);
    } catch (e) {
      logger.warn("[entity funding-sources POST] could not fetch status", {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    const existingCount = await prisma.entityFundingSource.count({
      where: { entityId, status: { not: "REMOVED" } },
    });
    const makeDefault = data!.setAsDefault ?? existingCount === 0;

    const created = await prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.entityFundingSource.updateMany({
          where: { entityId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.entityFundingSource.create({
        data: {
          entityId,
          dwollaFundingSourceId: fs.fundingSourceId,
          dwollaCustomerId: data!.dwollaCustomerId,
          bankName: acct.officialName ?? acct.name,
          accountNickname: data!.accountNickname ?? null,
          accountType: acct.subtype ?? acct.type,
          last4: acct.mask ?? null,
          status: fsStatus,
          isDefault: makeDefault,
        },
      });
    });

    return NextResponse.json({
      id: created.id,
      bankName: created.bankName,
      last4: created.last4,
      status: created.status,
      isDefault: created.isDefault,
    });
  } catch (err) {
    logger.error("[entity funding-sources POST]", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to link funding source" },
      { status: 500 },
    );
  }
}
