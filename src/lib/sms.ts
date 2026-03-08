/**
 * Twilio SMS delivery via raw REST API (no SDK — Basic auth over fetch).
 * Graceful degradation: if env vars missing, logs warning and skips.
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export async function sendSMS({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn(
      "[sms] Twilio env vars not set — skipping SMS delivery to:",
      to,
    );
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const credentials = Buffer.from(
    `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`,
  ).toString("base64");

  const formData = new URLSearchParams();
  formData.append("From", TWILIO_PHONE_NUMBER);
  formData.append("To", to);
  formData.append("Body", body);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[sms] Twilio error:", res.status, errBody);
    } else {
      console.log("[sms] Sent successfully to:", to);
    }
  } catch (err) {
    console.error("[sms] Unexpected error sending to:", to, err);
  }
}
