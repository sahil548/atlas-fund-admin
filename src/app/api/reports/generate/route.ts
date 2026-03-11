/**
 * POST /api/reports/generate
 * Generate a PDF report, store to Vercel Blob, create Document record.
 */

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api-helpers";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { getEffectivePermissions, checkPermission } from "@/lib/permissions";
import { GenerateReportSchema } from "@/lib/schemas";
import { notifyInvestorsOnReportAvailable } from "@/lib/notification-delivery";
import { QuarterlyReport, type QuarterlyReportData } from "@/lib/pdf/quarterly-report";
import {
  CapitalAccountStatement,
  type CapitalAccountStatementData,
} from "@/lib/pdf/capital-account-statement";
import { FundSummaryReport, type FundSummaryData } from "@/lib/pdf/fund-summary";
import { logger } from "@/lib/logger";

/* eslint-disable @typescript-eslint/no-explicit-any */

function reportTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    QUARTERLY: "Quarterly Report",
    CAPITAL_ACCOUNT_STATEMENT: "Capital Account Statement",
    FUND_SUMMARY: "Fund Summary",
  };
  return labels[type] ?? type;
}

export async function POST(req: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();

    if (authUser.role === "GP_TEAM") {
      const perms = await getEffectivePermissions(authUser.id);
      if (!checkPermission(perms, "reports", "full")) return forbidden();
    }

    const { data, error } = await parseBody(req, GenerateReportSchema);
    if (error) return error;

    const { entityId, reportType, period, investorId } = data!;

    // ── Fetch entity with all needed relations ──────────────────
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      include: {
        commitments: {
          include: {
            investor: true,
          },
        },
        capitalCalls: {
          include: {
            lineItems: {
              include: { investor: true },
            },
          },
          orderBy: { callDate: "desc" },
        },
        distributions: {
          include: {
            lineItems: {
              include: { investor: true },
            },
          },
          orderBy: { distributionDate: "desc" },
        },
        assetAllocations: {
          include: {
            asset: true,
          },
        },
        navComputations: {
          orderBy: { periodDate: "desc" },
          take: 1,
        },
      },
    });

    if (!entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    // Firm-level tenant check
    if (entity.firmId !== authUser.firmId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const generatedAt = new Date().toISOString();
    const periodLabel = period || new Date().getFullYear().toString();

    // ── Compute shared metrics ──────────────────────────────────

    // Total committed from commitments table
    const totalCommitted = entity.commitments.reduce(
      (sum: number, c: any) => sum + c.amount,
      0
    );

    // Total called: sum of all funded line item amounts across all capital calls
    const totalCalled = entity.capitalCalls.reduce((sum: number, cc: any) => {
      const funded = cc.lineItems
        .filter((li: any) => li.status === "Funded")
        .reduce((s: number, li: any) => s + (li.amount || 0), 0);
      return sum + funded;
    }, 0);

    // Total distributed: sum of netAmount from all distribution line items
    const totalDistributed = entity.distributions.reduce((sum: number, d: any) => {
      return (
        sum +
        d.lineItems.reduce(
          (s: number, li: any) => s + (li.netAmount || li.grossAmount || 0),
          0
        )
      );
    }, 0);

    const nav = entity.navComputations?.[0]?.economicNAV ?? 0;

    // Portfolio allocation data
    const portfolioAllocation = entity.assetAllocations.map((alloc: any) => {
      const asset = alloc.asset;
      const costBasis =
        alloc.costBasis ?? asset.costBasis * (alloc.allocationPercent / 100);
      const fairValue = asset.fairValue * (alloc.allocationPercent / 100);
      return {
        assetName: asset.name,
        costBasis,
        fairValue,
        weight: 0, // computed below
      };
    });

    const totalFV = portfolioAllocation.reduce(
      (sum: number, a: { fairValue: number }) => sum + a.fairValue,
      0
    );
    const portfolioWithWeights = portfolioAllocation.map(
      (a: { assetName: string; costBasis: number; fairValue: number; weight: number }) => ({
        ...a,
        weight: totalFV > 0 ? a.fairValue / totalFV : 0,
      })
    );

    // Capital accounts per investor (using commitments + line item aggregation)
    const capitalAccountStatement = entity.commitments.map((c: any) => {
      // Sum funded line items for this investor across all capital calls
      const called = entity.capitalCalls.reduce((sum: number, cc: any) => {
        const inv = cc.lineItems.find(
          (li: any) => li.investorId === c.investorId && li.status === "Funded"
        );
        return sum + (inv?.amount || 0);
      }, 0);

      // Sum paid distribution line items for this investor
      const distributed = entity.distributions.reduce((sum: number, d: any) => {
        const inv = d.lineItems.find(
          (li: any) => li.investorId === c.investorId
        );
        return sum + (inv?.netAmount || 0);
      }, 0);

      const investorNav = totalCommitted > 0 ? (c.amount / totalCommitted) * nav : 0;
      return {
        investorName: c.investor?.name || "Unknown Investor",
        commitment: c.amount,
        called,
        distributed,
        nav: investorNav,
        irr: null as null,
      };
    });

    // Transaction ledger (capital calls + distributions, most recent first)
    const transactionLedger: Array<{
      date: string;
      type: string;
      description: string;
      amount: number;
    }> = [];

    for (const cc of entity.capitalCalls) {
      transactionLedger.push({
        date: cc.callDate?.toISOString() ?? generatedAt,
        type: "CAPITAL_CALL",
        description: cc.purpose || "Capital Call",
        amount: -(cc.amount || 0),
      });
    }

    for (const dist of entity.distributions) {
      transactionLedger.push({
        date: dist.distributionDate?.toISOString() ?? generatedAt,
        type: "DISTRIBUTION",
        description: dist.memo || "Distribution",
        amount: dist.netToLPs || dist.grossAmount || 0,
      });
    }

    // Sort by date descending
    transactionLedger.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // ── Generate PDF based on report type ──────────────────────

    let pdfBuffer: Buffer;
    let reportName: string;
    let documentCategory: "REPORT" | "STATEMENT";

    if (reportType === "QUARTERLY") {
      const reportData: QuarterlyReportData = {
        entityName: entity.name,
        period: periodLabel,
        generatedAt,
        financialSummary: {
          nav,
          irr: null,
          tvpi:
            totalCalled > 0 ? (nav + totalDistributed) / totalCalled : null,
          dpi: totalCalled > 0 ? totalDistributed / totalCalled : null,
          rvpi: totalCalled > 0 ? nav / totalCalled : null,
          totalCommitted,
          totalCalled,
          totalDistributed,
        },
        capitalAccountStatement,
        portfolioAllocation: portfolioWithWeights,
        transactionLedger,
      };

      pdfBuffer = Buffer.from(
        await renderToBuffer(QuarterlyReport({ data: reportData }))
      );
      reportName = `${entity.name} — Quarterly Report ${periodLabel}`;
      documentCategory = "REPORT";
    } else if (reportType === "CAPITAL_ACCOUNT_STATEMENT") {
      // Build ledger entries from capital calls and distributions (chronological)
      let runningBalance = 0;
      const ledgerEntries: CapitalAccountStatementData["ledgerEntries"] = [];

      const allEntries = [...transactionLedger].reverse(); // chronological
      for (const entry of allEntries) {
        runningBalance += Math.abs(entry.amount);
        ledgerEntries.push({
          date: entry.date,
          type:
            entry.type === "CAPITAL_CALL"
              ? "CONTRIBUTION"
              : entry.type === "DISTRIBUTION"
              ? "DISTRIBUTION"
              : entry.type,
          description: entry.description,
          amount: Math.abs(entry.amount),
          balance: runningBalance,
        });
      }

      const contributions = entity.capitalCalls.reduce(
        (sum: number, cc: any) => sum + (cc.amount || 0),
        0
      );
      const distributions = entity.distributions.reduce(
        (sum: number, d: any) => sum + (d.netToLPs || d.grossAmount || 0),
        0
      );

      // Investor name for investor-specific statement
      const investorName = investorId
        ? entity.commitments.find((c: any) => c.investorId === investorId)?.investor
            ?.name
        : undefined;

      const statementData: CapitalAccountStatementData = {
        entityName: entity.name,
        investorName,
        period: periodLabel,
        generatedAt,
        periodSummary: {
          openingBalance: 0,
          contributions,
          distributions,
          fees: 0,
          closingBalance: nav,
        },
        ledgerEntries,
        perEntityBreakdown: [],
      };

      pdfBuffer = Buffer.from(
        await renderToBuffer(CapitalAccountStatement({ data: statementData }))
      );
      reportName = `${entity.name} — Capital Account Statement ${periodLabel}`;
      documentCategory = "STATEMENT";
    } else {
      // FUND_SUMMARY
      const topHoldings = portfolioWithWeights
        .map((a: {
          assetName: string;
          costBasis: number;
          fairValue: number;
          weight: number;
        }) => ({
          assetName: a.assetName,
          costBasis: a.costBasis,
          fairValue: a.fairValue,
          irr: null as null,
        }))
        .sort(
          (a: { fairValue: number }, b: { fairValue: number }) =>
            b.fairValue - a.fairValue
        )
        .slice(0, 5);

      const summaryData: FundSummaryData = {
        entityName: entity.name,
        generatedAt,
        overview: {
          fundSize: totalCommitted,
          deploymentPercent:
            totalCommitted > 0
              ? Math.min(1, totalCalled / totalCommitted)
              : 0,
          nav,
          irr: null,
          tvpi:
            totalCalled > 0 ? (nav + totalDistributed) / totalCalled : null,
          dpi: totalCalled > 0 ? totalDistributed / totalCalled : null,
        },
        topHoldings,
        recentActivity: transactionLedger.slice(0, 5),
      };

      pdfBuffer = Buffer.from(
        await renderToBuffer(FundSummaryReport({ data: summaryData }))
      );
      reportName = `${entity.name} — Fund Summary`;
      documentCategory = "REPORT";
    }

    // ── Store to Vercel Blob (or local fallback) ───────────────
    const safePeriod = periodLabel.replace(/[^a-zA-Z0-9-_]/g, "_");
    const filename = `reports/${entityId}/${reportType}_${safePeriod}_${Date.now()}.pdf`;

    let fileUrl: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(filename, pdfBuffer, {
        access: "public",
        contentType: "application/pdf",
      });
      fileUrl = blob.url;
    } else {
      // Local dev fallback: write to /tmp and serve as data URL
      const fs = await import("fs/promises");
      const path = await import("path");
      const dir = path.join("/tmp", "atlas-reports", entityId);
      await fs.mkdir(dir, { recursive: true });
      const filePath = path.join(dir, `${reportType}_${safePeriod}_${Date.now()}.pdf`);
      await fs.writeFile(filePath, pdfBuffer);
      fileUrl = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
    }

    // ── Create Document record ──────────────────────────────────
    const doc = await prisma.document.create({
      data: {
        name: reportName,
        category: documentCategory,
        fileUrl,
        fileSize: pdfBuffer.length,
        mimeType: "application/pdf",
        entityId,
      },
    });

    // ── Notify all entity investors (fire-and-forget) ───────────
    const investorIds = entity.commitments.map((c: any) => c.investorId);
    if (investorIds.length > 0) {
      notifyInvestorsOnReportAvailable({
        investorIds,
        entityName: entity.name,
        reportType: reportTypeLabel(reportType),
        period: periodLabel,
      }).catch((err: any) => {
        logger.error("[reports/generate] Failed to send investor notifications:", { error: err instanceof Error ? err.message : String(err) });
      });
    }

    return NextResponse.json(
      {
        documentId: doc.id,
        fileUrl,
        fileName: reportName,
        reportType,
        entityName: entity.name,
        period: periodLabel,
      },
      { status: 201 }
    );
  } catch (err: any) {
    logger.error("[reports/generate]", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: err.message || "Failed to generate report" },
      { status: 500 }
    );
  }
}
