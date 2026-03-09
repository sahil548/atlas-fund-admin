import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const firmId = searchParams.get("firmId");

  if (!firmId) {
    return NextResponse.json({ error: "firmId is required" }, { status: 400 });
  }

  const now = new Date();
  const day90 = addDays(now, 90);
  const day180 = addDays(now, 180);

  try {
    const [covenantBreaches, leaseExpirations, loanMaturities, overdueReviews] =
      await Promise.all([
        // Covenant breaches
        prisma.covenant.findMany({
          where: {
            currentStatus: "BREACH",
            agreement: {
              asset: {
                entityAllocations: {
                  some: {
                    entity: { firmId },
                  },
                },
              },
            },
          },
          include: {
            agreement: {
              include: {
                asset: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        }),

        // Leases expiring within 180 days (active assets only)
        prisma.lease.findMany({
          where: {
            leaseEndDate: {
              gte: now,
              lte: day180,
            },
            asset: {
              status: "ACTIVE",
              entityAllocations: {
                some: {
                  entity: { firmId },
                },
              },
            },
          },
          include: {
            asset: {
              select: { id: true, name: true },
            },
          },
        }),

        // Credit agreements maturing within 180 days
        prisma.creditAgreement.findMany({
          where: {
            maturityDate: {
              gte: now,
              lte: day180,
            },
            asset: {
              status: "ACTIVE",
              entityAllocations: {
                some: {
                  entity: { firmId },
                },
              },
            },
          },
          include: {
            asset: {
              select: { id: true, name: true },
            },
          },
        }),

        // Overdue reviews (nextReview in the past, active assets)
        prisma.asset.findMany({
          where: {
            nextReview: { lt: now },
            status: "ACTIVE",
            entityAllocations: {
              some: {
                entity: { firmId },
              },
            },
          },
          select: { id: true, name: true, nextReview: true },
        }),
      ]);

    const totalAlerts =
      covenantBreaches.length +
      leaseExpirations.length +
      loanMaturities.length +
      overdueReviews.length;

    return NextResponse.json({
      covenantBreaches,
      leaseExpirations,
      loanMaturities,
      overdueReviews,
      totalAlerts,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
