import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateAssetTransactionSchema } from "@/lib/schemas";
import { xirr } from "@/lib/computations/irr";

async function recalculateAssetMetrics(assetId: string) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: { incomeEvents: true, expenses: true },
  });
  if (!asset) return;

  const cashFlows: { date: Date; amount: number }[] = [];

  // Initial investment (outflow)
  if (asset.entryDate) {
    cashFlows.push({ date: new Date(asset.entryDate), amount: -asset.costBasis });
  }

  // Income (inflows)
  for (const inc of asset.incomeEvents) {
    cashFlows.push({ date: new Date(inc.date), amount: inc.amount });
  }

  // Expenses (outflows)
  for (const exp of asset.expenses) {
    cashFlows.push({ date: new Date(exp.date), amount: -exp.amount });
  }

  // Current value (terminal inflow)
  cashFlows.push({ date: new Date(), amount: asset.fairValue });

  const irr = xirr(cashFlows);
  const totalIncome = asset.incomeEvents.reduce((s, e) => s + e.amount, 0);
  const totalExpenses = asset.expenses.reduce((s, e) => s + e.amount, 0);
  const adjustedValue = asset.fairValue + totalIncome - totalExpenses;
  const moic = asset.costBasis > 0 ? adjustedValue / asset.costBasis : null;

  await prisma.asset.update({
    where: { id: assetId },
    data: { irr, moic },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [incomeEvents, expenses] = await Promise.all([
    prisma.incomeEvent.findMany({
      where: { assetId: id },
      orderBy: { date: "desc" },
    }),
    prisma.assetExpense.findMany({
      where: { assetId: id },
      orderBy: { date: "desc" },
    }),
  ]);

  const totalIncome = incomeEvents.reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return NextResponse.json({
    income: incomeEvents,
    expenses,
    totals: {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, CreateAssetTransactionSchema);
  if (error) return error;

  const { type, entityId, category, amount, date, description, incomeType } = data!;

  let created: unknown;

  if (type === "income") {
    created = await prisma.incomeEvent.create({
      data: {
        assetId: id,
        entityId,
        incomeType: (incomeType || category.toUpperCase()) as
          | "INTEREST"
          | "DIVIDEND"
          | "RENTAL"
          | "ROYALTY"
          | "FEE"
          | "OTHER",
        amount,
        date: new Date(date),
        description,
      },
    });
  } else {
    created = await prisma.assetExpense.create({
      data: {
        assetId: id,
        entityId,
        category,
        amount,
        date: new Date(date),
        description,
      },
    });
  }

  // Auto-recalculate asset IRR and MOIC
  await recalculateAssetMetrics(id);

  // Fetch updated asset metrics to return with response
  const updatedAsset = await prisma.asset.findUnique({
    where: { id },
    select: { irr: true, moic: true },
  });

  return NextResponse.json({ transaction: created, metrics: updatedAsset }, { status: 201 });
}
