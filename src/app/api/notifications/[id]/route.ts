import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { parseBody } from "@/lib/api-helpers";
import { PatchNotificationSchema } from "@/lib/schemas";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const { id } = await params;
  const { data, error } = await parseBody(req, PatchNotificationSchema);
  if (error) return error;
  const body = data!;

  if (body.action === "MARK_READ") {
    // Verify the notification belongs to the authenticated user
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing || existing.userId !== authUser.id) return forbidden();

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
    return NextResponse.json(notification);
  }

  if (body.action === "MARK_ALL_READ") {
    // Use session userId instead of path param to prevent IDOR
    await prisma.notification.updateMany({
      where: { userId: authUser.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
