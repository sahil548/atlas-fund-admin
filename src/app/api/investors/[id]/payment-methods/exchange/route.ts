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
    // Common failure here: Dwolla isn't enabled as a processor partner in
    // the Plaid dashboard yet (Team Settings → Integrations → Processors).
    let processorToken: string;
    try {
      processorToken = await createProcessorTokenForDwolla({
        accessToken,
        accountId: data!.accountId,
      });
    } catch (plaidErr) {
      // Plaid SDK errors include response.data on AxiosError-shaped objects.
      const err = plaidErr as { response?: { data?: { error_code?: string; error_message?: string; display_message?: string } }; message?: string };
      const detail =
        err.response?.data?.display_message ??
        err.response?.data?.error_message ??
        err.response?.data?.error_code ??
        err.message ??
        "Unknown Plaid error";
      logger.error("[payment-methods/exchange] Plaid processor token failed", {
        detail,
        errorCode: err.response?.data?.error_code,
      });
      // Most common case: PROCESSOR_NOT_ENABLED — surface a friendly hint.
      const hint = /PROCESSOR/i.test(detail)
        ? " (Dwolla may not be enabled as a Plaid processor — Plaid dashboard → Team Settings → Integrations → Processors.)"
        : "";
      return NextResponse.json(
        { error: `Plaid processor token failed: ${detail}${hint}` },
        { status: 400 },
      );
    }

    // 4. Ensure Dwolla customer exists for this investor
    let dwollaCustomerId = investor.dwollaCustomer?.dwollaCustomerId;
    if (!dwollaCustomerId) {
      // Dwolla rejects names with commas, parens, and many other punctuation.
      // Strip everything except letters/digits/space/period/apostrophe/hyphen
      // and trim. Limit length to 50 chars to be safe.
      const cleanName = (s: string) =>
        s.replace(/[^A-Za-z0-9 .'-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 50);

      // Determine if this investor looks like a business entity. We treat any
      // investor with a linked company OR whose name contains LLC/LP/Inc/Trust/etc.
      // as a business and route the legal name to Dwolla's businessName field.
      const isBusiness =
        Boolean(investor.company?.name) ||
        /\b(LLC|LP|Inc|Corp|Trust|JTWROS|Foundation|Partners|Holdings|Co\.?)\b/i.test(
          investor.name,
        );

      const businessName = isBusiness
        ? cleanName(investor.company?.name ?? investor.name)
        : undefined;

      // Build firstName/lastName. Prefer Contact data (the controller / individual).
      // Otherwise parse from investor.name, falling back to safe placeholders for
      // business entities (Dwolla still requires a controller name on the customer
      // record even for receive-only).
      let firstName = cleanName(investor.contact?.firstName ?? "");
      let lastName = cleanName(investor.contact?.lastName ?? "");
      if (!firstName || !lastName) {
        const parts = cleanName(investor.name).split(" ");
        if (!firstName) firstName = parts[0] || (isBusiness ? "Account" : "Investor");
        if (!lastName) lastName = parts.slice(1).join(" ") || (isBusiness ? "Holder" : "Profile");
      }

      // Email must be unique per Dwolla customer. Always derive a unique
      // address from the investor id so two investors can't collide on Kathryn's
      // login email or any shared contact email. Investor's own contact email
      // is preferred when present (probably already unique).
      const email = investor.contact?.email
        ?? `investor-${investor.id}@calafiagroup.com`;

      try {
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
      } catch (dwollaErr) {
        // Surface Dwolla's actual error body — without this we get an opaque
        // "Request failed with status code 400" from the SDK and have no idea
        // what was rejected.
        const err = dwollaErr as { body?: { message?: string; _embedded?: { errors?: Array<{ message?: string; path?: string }> } }; status?: number };
        const detail =
          err.body?._embedded?.errors
            ?.map((e) => `${e.path ?? "?"}: ${e.message ?? "?"}`)
            .join("; ") ??
          err.body?.message ??
          (dwollaErr instanceof Error ? dwollaErr.message : "Unknown Dwolla error");
        logger.error("[payment-methods/exchange] Dwolla customer create failed", {
          status: err.status,
          detail,
          attemptedEmail: email,
          attemptedFirstName: firstName,
          attemptedLastName: lastName,
          attemptedBusinessName: businessName,
        });
        return NextResponse.json(
          { error: `Dwolla rejected the customer: ${detail}` },
          { status: 400 },
        );
      }
    }

    // 5. Dwolla funding source via processor token
    const nickname = data!.nickname ?? acct.officialName ?? acct.name;
    let fs: { fundingSourceUrl: string; fundingSourceId: string };
    try {
      fs = await createFundingSourceFromPlaidToken({
        customerId: dwollaCustomerId,
        plaidProcessorToken: processorToken,
        accountNickname: nickname,
      });
    } catch (dwollaErr) {
      const err = dwollaErr as { body?: { message?: string; _embedded?: { errors?: Array<{ message?: string; path?: string }> } }; status?: number };
      const detail =
        err.body?._embedded?.errors
          ?.map((e) => `${e.path ?? "?"}: ${e.message ?? "?"}`)
          .join("; ") ??
        err.body?.message ??
        (dwollaErr instanceof Error ? dwollaErr.message : "Unknown Dwolla error");
      logger.error("[payment-methods/exchange] Dwolla funding source create failed", {
        status: err.status,
        detail,
        customerId: dwollaCustomerId,
      });
      return NextResponse.json(
        { error: `Dwolla rejected the funding source: ${detail}` },
        { status: 400 },
      );
    }

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
