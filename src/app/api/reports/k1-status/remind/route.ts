/**
 * POST /api/reports/k1-status/remind
 * Log a K-1 reminder action for an investor (stub — logs audit, no email yet).
 *
 * Body: { investorId: string }
 * Auth: GP_ADMIN or GP_TEAM
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api-helpers";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const RemindSchema = z.object({
  investorId: z.string(),
});

export async function POST(req: Request) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  // Only GP roles can send reminders
  if (authUser.role !== "GP_ADMIN" && authUser.role !== "GP_TEAM") {
    return forbidden();
  }

  const { data, error } = await parseBody(req, RemindSchema);
  if (error) return error;

  const { investorId } = data!;

  // Fire-and-forget audit log — actual email delivery deferred
  logAudit(
    authUser.firmId,
    authUser.id,
    "K1_REMINDER_SENT",
    "Investor",
    investorId,
    {}
  ).catch((err) => console.error("[audit] K1_REMINDER_SENT failed:", err));

  return NextResponse.json({ success: true, message: "Reminder logged" });
}
