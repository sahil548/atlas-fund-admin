import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "STAGE_CHANGE"
  | "IC_VOTE"
  | "DOCUMENT_UPLOAD"
  | "CAPITAL_CALL"
  | "TASK_ASSIGNED"
  | "CLOSING_UPDATE"
  | "GENERAL"
  | "DISTRIBUTION"
  | "REPORT";

export async function createNotification({
  userId,
  investorId,
  type,
  subject,
  body,
}: {
  userId: string;
  investorId?: string;
  type: NotificationType;
  subject: string;
  body?: string;
}) {
  return prisma.notification.create({
    data: {
      userId,
      ...(investorId ? { investorId } : {}),
      type,
      subject,
      body,
    },
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
