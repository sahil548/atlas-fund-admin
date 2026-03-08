import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { NotificationType } from "@prisma/client";

const VALID_TYPES = new Set<string>([
  "STAGE_CHANGE",
  "IC_VOTE",
  "DOCUMENT_UPLOAD",
  "CAPITAL_CALL",
  "TASK_ASSIGNED",
  "CLOSING_UPDATE",
  "GENERAL",
  "DISTRIBUTION",
  "REPORT",
]);

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const typeParam = req.nextUrl.searchParams.get("type");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const typeFilter =
    typeParam && VALID_TYPES.has(typeParam)
      ? (typeParam as NotificationType)
      : undefined;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId,
        ...(typeFilter ? { type: typeFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    // unreadCount always counts ALL unread for this user (not filtered)
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
