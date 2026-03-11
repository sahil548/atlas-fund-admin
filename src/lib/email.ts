import { Resend } from "resend";
import { logger } from "@/lib/logger";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const DEFAULT_FROM =
  process.env.EMAIL_FROM_ADDRESS || "notices@atlas-fund.com";

export async function sendEmail({
  to,
  subject,
  html,
  from,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<void> {
  if (!resend) {
    logger.warn("[email] RESEND_API_KEY not set — skipping email delivery", { to });
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: from || DEFAULT_FROM,
      to,
      subject,
      html,
    });

    if (error) {
      logger.error("[email] Resend delivery error", { error: typeof error === "object" && error !== null && "message" in error ? (error as { message: string }).message : String(error) });
    } else {
      logger.info("[email] Sent successfully", { to, subject });
    }
  } catch (err) {
    logger.error("[email] Unexpected error sending", { to, error: err instanceof Error ? err.message : String(err) });
  }
}
