import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SearchResult } from "@/lib/command-bar-types";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const firmId = req.nextUrl.searchParams.get("firmId") || "";

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results: SearchResult[] = [];

    // Search 9 Prisma models in parallel
    const [deals, entities, assets, investors, contacts, companies, documents, tasks, meetings] =
      await Promise.all([
        prisma.deal.findMany({
          where: {
            AND: [
              firmId ? { firmId } : {},
              {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { sector: { contains: q, mode: "insensitive" } },
                ],
              },
            ],
          },
          select: { id: true, name: true, stage: true, assetClass: true },
          take: 3,
        }),

        prisma.entity.findMany({
          where: {
            AND: [
              firmId ? { firmId } : {},
              { name: { contains: q, mode: "insensitive" } },
            ],
          },
          select: { id: true, name: true, entityType: true },
          take: 3,
        }),

        prisma.asset.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sector: { contains: q, mode: "insensitive" } },
            ],
          },
          select: { id: true, name: true, assetClass: true, status: true },
          take: 3,
        }),

        prisma.investor.findMany({
          where: { name: { contains: q, mode: "insensitive" } },
          select: { id: true, name: true, investorType: true },
          take: 3,
        }),

        prisma.contact.findMany({
          where: {
            AND: [
              firmId ? { firmId } : {},
              {
                OR: [
                  { firstName: { contains: q, mode: "insensitive" } },
                  { lastName: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                ],
              },
            ],
          },
          select: { id: true, firstName: true, lastName: true, email: true, title: true },
          take: 2,
        }),

        prisma.company.findMany({
          where: {
            AND: [
              firmId ? { firmId } : {},
              { name: { contains: q, mode: "insensitive" } },
            ],
          },
          select: { id: true, name: true, type: true },
          take: 2,
        }),

        prisma.document.findMany({
          where: { name: { contains: q, mode: "insensitive" } },
          select: { id: true, name: true, category: true },
          take: 2,
        }),

        prisma.task.findMany({
          where: { title: { contains: q, mode: "insensitive" } },
          select: { id: true, title: true, status: true },
          take: 2,
        }),

        prisma.meeting.findMany({
          where: { title: { contains: q, mode: "insensitive" } },
          select: { id: true, title: true, meetingDate: true },
          take: 2,
        }),
      ]);

    // Map to SearchResult
    for (const d of deals) {
      results.push({
        id: d.id,
        type: "deal",
        title: d.name,
        subtitle: `${d.stage} · ${d.assetClass}`,
        url: `/deals/${d.id}`,
      });
    }

    for (const e of entities) {
      results.push({
        id: e.id,
        type: "entity",
        title: e.name,
        subtitle: e.entityType.replace(/_/g, " "),
        url: `/entities/${e.id}`,
      });
    }

    for (const a of assets) {
      results.push({
        id: a.id,
        type: "asset",
        title: a.name,
        subtitle: `${a.assetClass.replace(/_/g, " ")} · ${a.status}`,
        url: `/assets/${a.id}`,
      });
    }

    for (const i of investors) {
      results.push({
        id: i.id,
        type: "investor",
        title: i.name,
        subtitle: i.investorType,
        url: `/directory?tab=investors&id=${i.id}`,
      });
    }

    for (const c of contacts) {
      results.push({
        id: c.id,
        type: "contact",
        title: `${c.firstName} ${c.lastName}`,
        subtitle: c.title || c.email || "Contact",
        url: `/directory?tab=contacts&id=${c.id}`,
      });
    }

    for (const c of companies) {
      results.push({
        id: c.id,
        type: "company",
        title: c.name,
        subtitle: c.type.replace(/_/g, " "),
        url: `/directory?tab=companies&id=${c.id}`,
      });
    }

    for (const d of documents) {
      results.push({
        id: d.id,
        type: "document",
        title: d.name,
        subtitle: d.category,
        url: `/documents?id=${d.id}`,
      });
    }

    for (const t of tasks) {
      results.push({
        id: t.id,
        type: "task",
        title: t.title,
        subtitle: t.status,
        url: `/tasks?id=${t.id}`,
      });
    }

    for (const m of meetings) {
      results.push({
        id: m.id,
        type: "meeting",
        title: m.title,
        subtitle: m.meetingDate ? new Date(m.meetingDate).toLocaleDateString() : "Meeting",
        url: `/meetings?id=${m.id}`,
      });
    }

    return NextResponse.json({ results: results.slice(0, 15) });
  } catch (error) {
    console.error("[Commands Search] Error:", error);
    return NextResponse.json({ results: [] });
  }
}
