import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { NotificationType } from "@prisma/client";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { VALID_TYPES } from "@/lib/notification-types";

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  // Use session userId — NOT query param (IDOR fix)
  const userId = authUser.id;

  const typeParam = req.nextUrl.searchParams.get("type");
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
