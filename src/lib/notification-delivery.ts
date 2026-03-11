/**
 * Multi-channel notification delivery engine.
 *
 * Reads LP preferences (channel + type toggles) and dispatches:
 *   - EMAIL  -> sendEmail (Resend)
 *   - SMS    -> sendSMS (Twilio)
 *   - PORTAL_ONLY -> in-app only
 * Always creates an in-app Notification record regardless of channel.
 */

import { prisma } from "@/lib/prisma";
import { createNotification, notifyGPTeam } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import { logger } from "@/lib/logger";
import {
  capitalCallEmailHtml,
  distributionPaidEmailHtml,
  reportAvailableEmailHtml,
  k1AvailableEmailHtml,
} from "@/lib/email-templates";

type NotificationTypeCategory = "capitalActivity" | "reports" | "portfolio";

interface DeliverOptions {
  investorId: string;
  typeCategory: NotificationTypeCategory;
  subject: string;
  body?: string;
  emailHtml?: string;
  smsBody?: string;
}

/**
 * Core delivery function: reads LP prefs, dispatches to correct channels,
 * always creates in-app notification.
 */
export async function deliverNotification({
  investorId,
  typeCategory,
  subject,
  body,
  emailHtml,
  smsBody,
}: DeliverOptions): Promise<void> {
  // 1. Fetch LP notification preferences
  const pref = await prisma.investorNotificationPreference.findUnique({
    where: { investorId },
  });

  // 2. Check if this category is enabled (default: all enabled)
  const notifTypes =
    pref?.notificationTypes &&
    typeof pref.notificationTypes === "object" &&
    !Array.isArray(pref.notificationTypes)
      ? (pref.notificationTypes as Record<string, boolean>)
      : { capitalActivity: true, reports: true, portfolio: true };

  const categoryEnabled = notifTypes[typeCategory] !== false;

  // 3. Map investorId -> userId for in-app notification
  const investorAccess = await prisma.investorUserAccess.findFirst({
    where: { investorId },
    orderBy: { createdAt: "asc" },
    select: { userId: true },
  });

  const userId = investorAccess?.userId;

  // 4. Always create in-app notification (if we have a userId)
  if (userId) {
    const notifType =
      typeCategory === "capitalActivity"
        ? ("CAPITAL_CALL" as const)
        : typeCategory === "reports"
          ? ("REPORT" as const)
          : ("GENERAL" as const);

    await createNotification({
      userId,
      investorId,
      type: notifType,
      subject,
      body,
    });
  }

  // 5. If category disabled or no external delivery possible, stop here
  if (!categoryEnabled) {
    return;
  }

  // 6. Check digest preference — DAILY_DIGEST/WEEKLY_DIGEST investors skip immediate external dispatch
  const digestPreference = pref?.digestPreference ?? "IMMEDIATE";
  if (digestPreference === "DAILY_DIGEST" || digestPreference === "WEEKLY_DIGEST") {
    logger.debug(
      `[notification-delivery] Queued for ${digestPreference} -- skipping immediate external delivery for investor: ${investorId}`,
    );
    return;
  }

  const channel = pref?.preferredChannel ?? "EMAIL";

  // 7. Dispatch to external channel (IMMEDIATE preference only)
  if (channel === "EMAIL" || channel === "PORTAL_ONLY") {
    // PORTAL_ONLY: no external delivery
    if (channel === "EMAIL" && emailHtml) {
      const emailAddress = pref?.emailAddress;
      if (emailAddress) {
        await sendEmail({
          to: emailAddress,
          subject,
          html: emailHtml,
        });
      } else {
        logger.warn("[notification-delivery] No emailAddress for investor", { investorId });
      }
    }
  } else if (channel === "SMS") {
    const phoneNumber = pref?.phoneNumber;
    if (phoneNumber && smsBody) {
      await sendSMS({ to: phoneNumber, body: smsBody });
    } else {
      logger.warn("[notification-delivery] SMS channel but missing phone/body for investor", { investorId });
    }
  }
}

/**
 * Notify all LP investors on a capital call when status transitions to ISSUED.
 */
export async function notifyInvestorsOnCapitalCall(
  capitalCallId: string,
): Promise<void> {
  const call = await prisma.capitalCall.findUnique({
    where: { id: capitalCallId },
    include: {
      entity: { select: { name: true } },
      lineItems: {
        include: {
          investor: {
            include: {
              notificationPreference: true,
            },
          },
        },
      },
    },
  });

  if (!call) {
    logger.error("[notification-delivery] Capital call not found", { capitalCallId });
    return;
  }

  const entityName = call.entity.name;
  const dueDate = call.dueDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Notify GP team in-app (they initiated it — email would be redundant)
  await notifyGPTeam({
    type: "CAPITAL_CALL",
    subject: `Capital Call ${call.callNumber} issued for ${entityName}`,
    body: `Capital call for ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(call.amount)} due ${dueDate}`,
  }).catch((err) => {
    logger.error("[notification-delivery] Failed to notify GP team on capital call", { error: err instanceof Error ? err.message : String(err) });
  });

  // Notify each investor
  for (const lineItem of call.lineItems) {
    const investor = lineItem.investor;

    const emailHtml = capitalCallEmailHtml({
      entityName,
      callNumber: call.callNumber,
      amount: lineItem.amount,
      dueDate,
      purpose: call.purpose || undefined,
    });

    const smsBody = `${entityName}: Capital call of ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(lineItem.amount)} due ${dueDate}. Check your investor portal for details.`;

    await deliverNotification({
      investorId: investor.id,
      typeCategory: "capitalActivity",
      subject: `Capital Call Notice — ${entityName} (${call.callNumber})`,
      body: `Amount: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(lineItem.amount)} | Due: ${dueDate}`,
      emailHtml,
      smsBody,
    }).catch((err) => {
      logger.error("[notification-delivery] Failed to notify investor", { investorId: investor.id, error: err instanceof Error ? err.message : String(err) });
    });
  }
}

/**
 * Notify all LP investors on a distribution when status transitions to PAID.
 */
export async function notifyInvestorsOnDistribution(
  distributionId: string,
): Promise<void> {
  const distribution = await prisma.distributionEvent.findUnique({
    where: { id: distributionId },
    include: {
      entity: { select: { name: true } },
      lineItems: {
        include: {
          investor: {
            include: {
              notificationPreference: true,
            },
          },
        },
      },
    },
  });

  if (!distribution) {
    logger.error("[notification-delivery] Distribution not found", { distributionId });
    return;
  }

  const entityName = distribution.entity.name;
  const distributionDate = distribution.distributionDate.toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );

  // Notify GP team in-app
  await notifyGPTeam({
    type: "GENERAL",
    subject: `Distribution marked PAID for ${entityName}`,
    body: `Gross: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(distribution.grossAmount)} | Net to LPs: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(distribution.netToLPs)}`,
  }).catch((err) => {
    logger.error("[notification-delivery] Failed to notify GP team on distribution", { error: err instanceof Error ? err.message : String(err) });
  });

  // Notify each investor
  for (const lineItem of distribution.lineItems) {
    const investor = lineItem.investor;

    const emailHtml = distributionPaidEmailHtml({
      entityName,
      distributionDate,
      grossAmount: lineItem.grossAmount,
      netToLPs: lineItem.netAmount,
    });

    const smsBody = `${entityName}: Distribution of ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(lineItem.netAmount)} (net) has been paid. Check your investor portal for details.`;

    await deliverNotification({
      investorId: investor.id,
      typeCategory: "capitalActivity",
      subject: `Distribution Notice — ${entityName}`,
      body: `Net amount: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(lineItem.netAmount)} paid on ${distributionDate}`,
      emailHtml,
      smsBody,
    }).catch((err) => {
      logger.error("[notification-delivery] Failed to notify investor", { investorId: investor.id, error: err instanceof Error ? err.message : String(err) });
    });
  }
}

/**
 * Notify investors when a report becomes available.
 */
export async function notifyInvestorsOnReportAvailable({
  investorIds,
  entityName,
  reportType,
  period,
  portalUrl,
}: {
  investorIds: string[];
  entityName: string;
  reportType: string;
  period: string;
  portalUrl?: string;
}): Promise<void> {
  const url =
    portalUrl || process.env.NEXT_PUBLIC_APP_URL || "https://app.atlas.com";

  for (const investorId of investorIds) {
    const emailHtml = reportAvailableEmailHtml({
      entityName,
      reportType,
      period,
      portalUrl: url,
    });

    await deliverNotification({
      investorId,
      typeCategory: "reports",
      subject: `${reportType} Available — ${entityName} (${period})`,
      body: `Your ${reportType.toLowerCase()} for ${period} is now available in the investor portal.`,
      emailHtml,
      smsBody: `${entityName}: Your ${reportType} for ${period} is now available. Log in to your investor portal to view it.`,
    }).catch((err) => {
      logger.error("[notification-delivery] Failed to notify investor", { investorId, error: err instanceof Error ? err.message : String(err) });
    });
  }
}

/**
 * Notify a single investor when their K-1 is available.
 */
export async function notifyInvestorsOnK1Available({
  investorId,
  entityName,
  taxYear,
  portalUrl,
}: {
  investorId: string;
  entityName: string;
  taxYear: number;
  portalUrl?: string;
}): Promise<void> {
  const url =
    portalUrl || process.env.NEXT_PUBLIC_APP_URL || "https://app.atlas.com";

  const emailHtml = k1AvailableEmailHtml({ entityName, taxYear, portalUrl: url });

  await deliverNotification({
    investorId,
    typeCategory: "reports",
    subject: `Schedule K-1 Available — ${entityName} (${taxYear})`,
    body: `Your Schedule K-1 for tax year ${taxYear} is now available in the investor portal.`,
    emailHtml,
    smsBody: `${entityName}: Your Schedule K-1 for tax year ${taxYear} is available. Log in to your investor portal to download it.`,
  });
}
