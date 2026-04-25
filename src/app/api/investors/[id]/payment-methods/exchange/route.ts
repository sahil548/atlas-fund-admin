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
  // Accept either a single accountId (legacy / single-select Plaid Link)
  // or an array of accountIds (multi-select). Plaid issues ONE public_token
  // per Link session covering all selected accounts; we can exchange it
  // once and then mint a processor token per account.
  accountId: z.string().min(1).optional(),
  accountIds: z.array(z.string().min(1)).optional(),
  nickname: z.string().optional(),
}).refine(
  (d) => Boolean(d.accountId || (d.accountIds && d.accountIds.length > 0)),
  { message: "accountId or accountIds is required" },
);

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

    // 1. Exchange Plaid public_token → access_token (one-time per Link session)
    const { accessToken } = await exchangeInvestorPublicToken(data!.publicToken);

    // 2. Fetch account metadata for ALL accounts on the Plaid item so we can
    // resolve every selected accountId to bank name / last4 / type.
    const allAccounts = await listAuthAccounts(accessToken);

    // Resolve the list of accountIds the user wants to register. Backwards
    // compat: a single accountId or an array of accountIds.
    const requestedAccountIds = data!.accountIds && data!.accountIds.length > 0
      ? data!.accountIds
      : data!.accountId ? [data!.accountId] : [];

    // Validate every requested id appears in the Plaid item
    const resolvedAccounts = requestedAccountIds.map((id) => {
      const a = allAccounts.find((x) => x.accountId === id);
      return { id, account: a };
    });
    const missing = resolvedAccounts.filter((r) => !r.account).map((r) => r.id);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Selected accounts not found on Plaid item: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    // 3. Ensure Dwolla customer exists for this investor (once, before the
    // per-account loop below — the customer record is shared across all
    // funding sources for this investor).
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

    // 4. For each selected account: mint a Plaid processor token, create a
    // Dwolla funding source, persist the InvestorPaymentMethod row.
    // Continue on per-account failures so a bad apple doesn't block the rest.
    const linked: Array<{
      id: string;
      bankName: string;
      last4: string | null;
      status: ReturnType<typeof mapFundingSourceStatus>;
      isDefault: boolean;
    }> = [];
    const failed: Array<{ accountId: string; bankName: string | null; reason: string }> = [];

    // Track existing methods so default-flag logic stays sane across the loop.
    let existingCount = await prisma.investorPaymentMethod.count({
      where: { investorId: investor.id, status: { not: "REMOVED" } },
    });

    for (const { id: accountId, account: maybeAcct } of resolvedAccounts) {
      const acct = maybeAcct!;
      try {
        // 4a. Plaid processor token for this account
        let processorToken: string;
        try {
          processorToken = await createProcessorTokenForDwolla({
            accessToken,
            accountId,
          });
        } catch (plaidErr) {
          const err = plaidErr as { response?: { data?: { error_code?: string; error_message?: string; display_message?: string } }; message?: string };
          const detail =
            err.response?.data?.display_message ??
            err.response?.data?.error_message ??
            err.response?.data?.error_code ??
            err.message ??
            "Unknown Plaid error";
          throw new Error(`Plaid processor token failed: ${detail}`);
        }

        // 4b. Dwolla funding source from the processor token
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
          throw new Error(`Dwolla rejected the funding source: ${detail}`);
        }

        // 4c. Status lookup (best-effort)
        let fsStatus = "UNVERIFIED" as ReturnType<typeof mapFundingSourceStatus>;
        try {
          const fsRecord = await getFundingSource(fs.fundingSourceId);
          fsStatus = mapFundingSourceStatus(fsRecord?.status);
        } catch (e) {
          logger.warn("[payment-methods/exchange] could not fetch funding source status", {
            error: e instanceof Error ? e.message : String(e),
          });
        }

        // 4d. Persist InvestorPaymentMethod row. First-ever account marked default.
        const isDefault = existingCount === 0;
        const pm = await prisma.investorPaymentMethod.create({
          data: {
            investorId: investor.id,
            dwollaFundingSourceId: fs.fundingSourceId,
            bankName: acct.officialName ?? acct.name,
            accountNickname: data!.nickname ?? null,
            accountType: acct.subtype ?? acct.type,
            last4: acct.mask ?? null,
            status: fsStatus,
            isDefault,
            plaidAccountId: acct.accountId,
          },
        });
        existingCount += 1;
        linked.push({
          id: pm.id,
          bankName: pm.bankName,
          last4: pm.last4,
          status: pm.status as ReturnType<typeof mapFundingSourceStatus>,
          isDefault: pm.isDefault,
        });
      } catch (perAccountErr) {
        const reason = perAccountErr instanceof Error ? perAccountErr.message : "Unknown";
        logger.error("[payment-methods/exchange] account link failed", {
          accountId,
          accountName: acct.name,
          reason,
        });
        failed.push({
          accountId,
          bankName: acct.officialName ?? acct.name,
          reason,
        });
      }
    }

    return NextResponse.json({
      linked,
      failed,
      // Backwards-compat: surface a single first-account summary so older
      // callers that expected { id, bankName, ... } still work.
      ...(linked[0] ?? {}),
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
