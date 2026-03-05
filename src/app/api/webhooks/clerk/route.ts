import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { getDefaultDDCategoriesForFirm } from "@/lib/default-dd-categories";

/**
 * POST /api/webhooks/clerk
 *
 * Handles Clerk webhook events for user lifecycle management.
 * - user.created  → auto-provision Firm + User (or link to pre-invited User)
 * - user.deleted  → soft-delete (set isActive: false)
 *
 * This route is excluded from Clerk auth in middleware.ts.
 */
export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // ── Verify signature ──────────────────────────────────────
  const headerPayload = Object.fromEntries(req.headers.entries());
  const svixId = headerPayload["svix-id"];
  const svixTimestamp = headerPayload["svix-timestamp"];
  const svixSignature = headerPayload["svix-signature"];

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: "Could not read body" }, { status: 400 });
  }

  let event: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event;
  } catch (err) {
    console.error("[clerk-webhook] Verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ── Handle events ─────────────────────────────────────────
  const { type, data } = event;

  if (type === "user.created") {
    return handleUserCreated(data);
  }

  if (type === "user.deleted") {
    return handleUserDeleted(data);
  }

  // Unhandled event type — acknowledge anyway
  return NextResponse.json({ received: true });
}

// ─────────────────────────────────────────────────────────────
// user.created
// ─────────────────────────────────────────────────────────────

async function handleUserCreated(data: Record<string, unknown>) {
  const emailAddresses = data.email_addresses as Array<{ email_address: string }> | undefined;
  const email = emailAddresses?.[0]?.email_address;
  if (!email) {
    console.error("[clerk-webhook] user.created missing email");
    return NextResponse.json({ error: "No email in event" }, { status: 400 });
  }

  const firstName = (data.first_name as string) || "";
  const lastName = (data.last_name as string) || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0];
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .join("")
    .slice(0, 2) || fullName.slice(0, 2).toUpperCase();

  // Check if user was pre-invited (already exists in DB)
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    // Pre-invited user: update name/initials from Clerk, keep firmId
    await prisma.user.update({
      where: { email },
      data: { name: fullName, initials, isActive: true },
    });
    console.log(`[clerk-webhook] Linked pre-invited user ${email} to firm ${existingUser.firmId}`);
    return NextResponse.json({ action: "linked", userId: existingUser.id, firmId: existingUser.firmId });
  }

  // New user: create Firm + User + default DD category templates
  const firm = await prisma.firm.create({
    data: { name: `${firstName || fullName}'s Organization` },
  });

  const user = await prisma.user.create({
    data: {
      email,
      name: fullName,
      initials,
      role: "GP_ADMIN",
      firmId: firm.id,
    },
  });

  // Provision default DD category templates for the new firm
  const defaultCategories = getDefaultDDCategoriesForFirm(firm.id);
  await prisma.dDCategoryTemplate.createMany({ data: defaultCategories });

  console.log(`[clerk-webhook] Created firm ${firm.id} + user ${user.id} + ${defaultCategories.length} DD templates for ${email}`);
  return NextResponse.json({ action: "created", userId: user.id, firmId: firm.id });
}

// ─────────────────────────────────────────────────────────────
// user.deleted
// ─────────────────────────────────────────────────────────────

async function handleUserDeleted(data: Record<string, unknown>) {
  const emailAddresses = data.email_addresses as Array<{ email_address: string }> | undefined;
  const email = emailAddresses?.[0]?.email_address;

  if (!email) {
    // Clerk sometimes omits email on delete — try by Clerk ID fallback
    console.warn("[clerk-webhook] user.deleted missing email, skipping");
    return NextResponse.json({ received: true });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.user.update({
      where: { email },
      data: { isActive: false },
    });
    console.log(`[clerk-webhook] Soft-deleted user ${email}`);
  }

  return NextResponse.json({ action: "soft_deleted" });
}
