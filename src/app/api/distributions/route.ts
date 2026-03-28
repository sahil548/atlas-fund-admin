import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateDistributionSchema } from "@/lib/schemas";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { getEffectivePermissions, checkPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    // GP_TEAM permission check (only when authenticated)
    if (authUser && authUser.role === "GP_TEAM") {
      const perms = await getEffectivePermissions(authUser.id);
      if (!checkPermission(perms, "capital_activity", "read_only")) return forbidden();
    }

    // Build base where clause with firm scoping and SERVICE_PROVIDER entity-scope
    let baseWhere: Record<string, unknown> = firmId ? { entity: { firmId } } : {};
    if (authUser && authUser.role === "SERVICE_PROVIDER") {
      baseWhere = { entity: { id: { in: authUser.entityAccess } } };
    }

    const distributions = await prisma.distributionEvent.findMany({
      where: baseWhere,
      include: {
        entity: { select: { id: true, name: true } },
        lineItems: { include: { investor: true } },
      },
      orderBy: { distributionDate: "desc" },
    });
    return NextResponse.json(distributions);
  } catch (err) {
    logger.error("[distributions] GET Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to load distributions" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const authUserPost = await getAuthUser();
    if (!authUserPost) return unauthorized();

    if (authUserPost.role === "GP_TEAM") {
      const perms = await getEffectivePermissions(authUserPost.id);
      if (!checkPermission(perms, "capital_activity", "full")) return forbidden();
    }

    const { data, error } = await parseBody(req, CreateDistributionSchema);
    if (error) return error;

    const {
      autoGenerateLineItems, entityId, distributionDate, grossAmount,
      waterfallTemplateId, perInvestorOverrides, ...rest
    } = data!;

    const dist = await prisma.distributionEvent.create({
      data: {
        ...rest,
        entityId,
        grossAmount,
        distributionDate: new Date(distributionDate),
      },
    });

    // Auto-generate line items from entity commitments
    if (autoGenerateLineItems) {
      const commitments = await prisma.commitment.findMany({
        where: { entityId },
        include: { investor: { select: { id: true, name: true, investorType: true } } },
      });

      const totalCommitments = commitments.reduce(
        (sum, c) => sum + c.amount,
        0,
      );

      if (commitments.length > 0 && totalCommitments > 0) {
        // If per-investor overrides provided (from waterfall UI), use those
        if (perInvestorOverrides && perInvestorOverrides.length > 0) {
          const overrideMap = new Map(
            perInvestorOverrides.map((o) => [o.investorId, o])
          );

          const lineItemsData = commitments.map((c) => {
            const override = overrideMap.get(c.investorId);
            // If overrides exist, non-overridden investors get $0 (user explicitly chose allocations)
            const investorTotal = override?.amount ?? 0;
            const gpCarry = override?.gpCarryAmount ?? 0;
            const lpPortion = investorTotal - gpCarry;

            // Decompose proportionally based on investor's share of total gross
            const shareOfGross = grossAmount > 0 ? investorTotal / grossAmount : 0;
            const returnOfCapital = (rest.returnOfCapital ?? 0) * shareOfGross;
            const income = (rest.income ?? 0) * shareOfGross;
            const longTermGain = (rest.longTermGain ?? 0) * shareOfGross;

            return {
              distributionId: dist.id,
              investorId: c.investorId,
              grossAmount: investorTotal,
              returnOfCapital,
              income,
              longTermGain,
              carriedInterest: gpCarry,
              netAmount: lpPortion,
              distributionType: rest.distributionType,
            };
          });

          await prisma.distributionLineItem.createMany({ data: lineItemsData });
        } else {
          // Simple pro-rata by commitment amount (no waterfall)
          const lineItemsData = commitments.map((c) => {
            const share = c.amount / totalCommitments;
            const investorGross = grossAmount * share;
            const returnOfCapital = (rest.returnOfCapital ?? 0) * share;
            const income = (rest.income ?? 0) * share;
            const longTermGain = (rest.longTermGain ?? 0) * share;
            const carriedInterest = (rest.carriedInterest ?? 0) * share;
            const netAmount = (rest.netToLPs ?? 0) * share;

            return {
              distributionId: dist.id,
              investorId: c.investorId,
              grossAmount: investorGross,
              returnOfCapital,
              income,
              longTermGain,
              carriedInterest,
              netAmount,
              distributionType: rest.distributionType,
            };
          });

          await prisma.distributionLineItem.createMany({ data: lineItemsData });
        }
      }
    }

    const distWithLineItems = await prisma.distributionEvent.findUnique({
      where: { id: dist.id },
      include: {
        entity: { select: { id: true, name: true } },
        lineItems: { include: { investor: { select: { id: true, name: true } } } },
      },
    });

    // Audit log — fire and forget
    const authUser = await getAuthUser();
    if (authUser) {
      logAudit(authUser.firmId, authUser.id, "CREATE_DISTRIBUTION", "DistributionEvent", dist.id, {
        grossAmount: data!.grossAmount,
        entityId: data!.entityId,
        distributionType: data!.distributionType,
      });
    }

    return NextResponse.json(distWithLineItems, { status: 201 });
  } catch (err) {
    logger.error("[distributions] POST Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to create distribution" },
      { status: 500 },
    );
  }
}
