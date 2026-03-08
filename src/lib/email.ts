import { Resend } from "resend";

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
    console.warn(
      "[email] RESEND_API_KEY not set — skipping email delivery to:",
      to,
    );
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
      console.error("[email] Resend delivery error:", error);
    } else {
      console.log("[email] Sent successfully to:", to, "| subject:", subject);
    }
  } catch (err) {
    console.error("[email] Unexpected error sending to:", to, err);
  }
}
