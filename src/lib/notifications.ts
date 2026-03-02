import { prisma } from "@/lib/prisma";

type NotificationType = "STAGE_CHANGE" | "IC_VOTE" | "DOCUMENT_UPLOAD" | "CAPITAL_CALL" | "TASK_ASSIGNED" | "CLOSING_UPDATE" | "GENERAL";

export async function createNotification({
  userId,
  type,
  subject,
  body,
}: {
  userId: string;
  type: NotificationType;
  subject: string;
  body?: string;
}) {
  return prisma.notification.create({
    data: { userId, type, subject, body },
  });
}

export async function notifyGPTeam({
  type,
  subject,
  body,
  excludeUserId,
}: {
  type: NotificationType;
  subject: string;
  body?: string;
  excludeUserId?: string;
}) {
  const users = await prisma.user.findMany({
    where: {
      role: { in: ["GP_ADMIN", "GP_TEAM"] },
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });

  if (users.length === 0) return;

  return prisma.notification.createMany({
    data: users.map((u) => ({ userId: u.id, type, subject, body })),
  });
}
