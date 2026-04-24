/**
 * POST /api/investors/[id]/payment-methods/exchange
 *
 * Receives a Plaid public_token + selected account_id from the LP portal
 * (after the user completed Plaid Link). Performs the full bank-link flow:
 *
 *   1. Plaid: exchange public_token → access_token
 *   2. Plaid: auth/get to fetch account metadata (name, mask, type)
 *   3. Plaid: processor/token/create for Dwolla
 *   4. Dwolla: ensure an InvestorDwollaCustomer exists (create if not)
 *   5. Dwolla: create funding source using the Plaid processor token
 *   6. DB: upsert InvestorPaymentMethod row
 *
 * Body: { publicToken: string; accountId: string; nickname?: string }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { parseBody } from "@/lib/api-helpers";
import { z } from "zod";
import {
  exchangeInvestorPublicToken,
  listAuthAccounts,
  createProcessorTokenForDwolla,
  isPlaidConfigured,
} from "@/lib/integrations/plaid";
import {
  createReceiveOnlyCustomer,
  createFundingSourceFromPlaidToken,
  isDwollaConfigured,
  mapFundingSourceStatus,
  getFundingSource,
} from "@/lib/integrations/dwolla";
import { logger } from "@/lib/logger";

const BodySchema = z.object({
  publicToken: z.string().min(1),
  accountId: z.string().min(1),
  nickname: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();
    const { id: investorId } = await params;

    if (!isPlaidConfigured()) {
      return NextResponse.json(
        { error: "Plaid credentials not configured." },
        { status: 503 },
      );
    }
    if (!isDwollaConfigured()) {
      return NextResponse.json(
        { error: "Dwolla credentials not configured. Set DWOLLA_KEY and DWOLLA_SECRET." },
        { status: 503 },
      );
    }

    const { data, error } = await parseBody(req, BodySchema);
    if (error) return error;

    // Load investor with contact/company for Dwolla customer creation
    const investor = await prisma.investor.findUnique({
      where: { id: investorId },
      include: {
        contact: { select: { firstName: true, lastName: true, email: true } },
        company: { select: { name: true } },
        dwollaCustomer: true,
      },
    });
    if (!investor) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    }

    // 1. Exchange Plaid public_token → access_token
    const { accessToken } = await exchangeInvestorPublicToken(data!.publicToken);

    // 2. Fetch account metadata so we can store bank name/last4
    const accounts = await listAuthAccounts(accessToken);
    const acct = accounts.find((a) => a.accountId === data!.accountId);
    if (!acct) {
      return NextResponse.json(
        { error: "Selected account not found on Plaid item" },
        { status: 400 },
      );
    }

    // 3. Plaid processor_token for Dwolla
    const processorToken = await createProcessorTokenForDwolla({
      accessToken,
      accountId: data!.accountId,
    });

    // 4. Ensure Dwolla customer exists for this investor
    let dwollaCustomerId = investor.dwollaCustomer?.dwollaCustomerId;
    if (!dwollaCustomerId) {
      // Best-effort name/email extraction
      const email = investor.contact?.email
        ?? authUser.email // fallback to the logged-in user
        ?? `investor+${investor.id}@atlas.local`;
      const firstName = investor.contact?.firstName ?? investor.name.split(" ")[0] ?? "Investor";
      const lastName = investor.contact?.lastName ?? investor.name.split(" ").slice(1).join(" ") ?? "Account";
      const businessName = investor.company?.name ?? undefined;

      const created = await createReceiveOnlyCustomer({
        firstName,
        lastName,
        email,
        businessName,
      });
      dwollaCustomerId = created.customerId;
      await prisma.investorDwollaCustomer.create({
        data: {
          investorId: investor.id,
          dwollaCustomerId: created.customerId,
          customerType: businessName ? "receive-only-business" : "receive-only",
          email,
          firstName,
          lastName,
          businessName,
        },
      });
    }

    // 5. Dwolla funding source via processor token
    const nickname = data!.nickname ?? acct.officialName ?? acct.name;
    const fs = await createFundingSourceFromPlaidToken({
      customerId: dwollaCustomerId,
      plaidProcessorToken: processorToken,
      accountNickname: nickname,
    });

    // Pull status so we can record VERIFIED / PENDING correctly
    let fsStatus = "UNVERIFIED" as ReturnType<typeof mapFundingSourceStatus>;
    try {
      const fsRecord = await getFundingSource(fs.fundingSourceId);
      fsStatus = mapFundingSourceStatus(fsRecord?.status);
    } catch (e) {
      logger.warn("[payment-methods/exchange] could not fetch funding source status", {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    // 6. Upsert InvestorPaymentMethod row
    // If this is the investor's first method, mark isDefault = true.
    const existingCount = await prisma.investorPaymentMethod.count({
      where: { investorId: investor.id, status: { not: "REMOVED" } },
    });
    const pm = await prisma.investorPaymentMethod.create({
      data: {
        investorId: investor.id,
        dwollaFundingSourceId: fs.fundingSourceId,
        bankName: acct.officialName ?? acct.name,
        accountNickname: data!.nickname ?? null,
        accountType: acct.subtype ?? acct.type,
        last4: acct.mask ?? null,
        status: fsStatus,
        isDefault: existingCount === 0,
        plaidAccountId: acct.accountId,
      },
    });

    return NextResponse.json({
      id: pm.id,
      bankName: pm.bankName,
      last4: pm.last4,
      status: pm.status,
      isDefault: pm.isDefault,
    });
  } catch (err) {
    logger.error("[payment-methods/exchange]", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to link account" },
      { status: 500 },
    );
  }
}
