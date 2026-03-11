import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api-helpers";
import { UpdateNotificationPreferencesSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

const DEFAULT_NOTIFICATION_TYPES = {
  capitalActivity: true,
  reports: true,
  portfolio: true,
};

const GP_OVERRIDES = {
  capitalCallsAlwaysImmediate: true,
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const pref = await prisma.investorNotificationPreference.findUnique({
      where: { investorId: id },
    });

    if (!pref) {
      return NextResponse.json({
        preferredChannel: "EMAIL",
        emailAddress: null,
        phoneNumber: null,
        digestPreference: "IMMEDIATE",
        notificationTypes: DEFAULT_NOTIFICATION_TYPES,
        gpOverrides: GP_OVERRIDES,
      });
    }

    const notificationTypes =
      pref.notificationTypes &&
      typeof pref.notificationTypes === "object" &&
      !Array.isArray(pref.notificationTypes)
        ? (pref.notificationTypes as Record<string, unknown>)
        : DEFAULT_NOTIFICATION_TYPES;

    return NextResponse.json({
      preferredChannel: pref.preferredChannel,
      emailAddress: pref.emailAddress,
      phoneNumber: pref.phoneNumber,
      digestPreference: pref.digestPreference,
      notificationTypes: {
        capitalActivity: notificationTypes.capitalActivity ?? true,
        reports: notificationTypes.reports ?? true,
        portfolio: notificationTypes.portfolio ?? true,
      },
      gpOverrides: GP_OVERRIDES,
    });
  } catch (e: unknown) {
    logger.error("[notification-preferences GET]", { error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await parseBody(req, UpdateNotificationPreferencesSchema);
    if (error) return error;

    const upsertData = {
      preferredChannel: data!.preferredChannel,
      emailAddress: data!.emailAddress,
      phoneNumber: data!.phoneNumber,
      digestPreference: data!.digestPreference,
      notificationTypes: data!.notificationTypes ?? undefined,
    };

    // Remove undefined keys so Prisma doesn't try to set them to null
    const cleanData = Object.fromEntries(
      Object.entries(upsertData).filter(([, v]) => v !== undefined)
    );

    const updated = await prisma.investorNotificationPreference.upsert({
      where: { investorId: id },
      create: { investorId: id, ...cleanData },
      update: cleanData,
    });

    const notificationTypes =
      updated.notificationTypes &&
      typeof updated.notificationTypes === "object" &&
      !Array.isArray(updated.notificationTypes)
        ? (updated.notificationTypes as Record<string, unknown>)
        : DEFAULT_NOTIFICATION_TYPES;

    return NextResponse.json({
      preferredChannel: updated.preferredChannel,
      emailAddress: updated.emailAddress,
      phoneNumber: updated.phoneNumber,
      digestPreference: updated.digestPreference,
      notificationTypes: {
        capitalActivity: notificationTypes.capitalActivity ?? true,
        reports: notificationTypes.reports ?? true,
        portfolio: notificationTypes.portfolio ?? true,
      },
      gpOverrides: GP_OVERRIDES,
    });
  } catch (e: unknown) {
    logger.error("[notification-preferences PUT]", { error: e instanceof Error ? e.message : String(e) });
    const err = e as { code?: string };
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Preferences record already exists" }, { status: 409 });
    }
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
