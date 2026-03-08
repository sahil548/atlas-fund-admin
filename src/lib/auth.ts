import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// ── Lightweight role lookup for API routes ──────────────────

/**
 * Get just the role for the authenticated user — fast, no auto-provisioning.
 * Used by API routes to enforce role-based access.
 * Returns null if not authenticated or user not found.
 */
export async function getAuthUserRole(): Promise<string | null> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });

  return user?.role ?? null;
}

const AUTH_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  firmId: true,
  initials: true,
  isActive: true,
  contactId: true,
  entityAccess: true,
  accessExpiresAt: true,
} as const;

/**
 * Get the authenticated DB user from the Clerk session.
 * If authenticated via Clerk but no DB record exists (webhook missed),
 * auto-provisions a Firm + User on the fly.
 * Returns null only if not authenticated.
 */
export async function getAuthUser() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  // Try to find existing DB user
  const existing = await prisma.user.findUnique({
    where: { email },
    select: AUTH_USER_SELECT,
  });

  if (existing) return existing;

  // ── Fallback auto-provision (webhook missed) ──────────────
  const firstName = clerkUser.firstName || "";
  const lastName = clerkUser.lastName || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0];
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .join("")
    .slice(0, 2) || fullName.slice(0, 2).toUpperCase();

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
    select: AUTH_USER_SELECT,
  });

  // Auto-create a Contact record for the new user
  const contact = await prisma.contact.create({
    data: {
      firmId: firm.id,
      firstName,
      lastName,
      email,
      type: "INTERNAL",
    },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { contactId: contact.id },
  });

  console.log(`[auth] Auto-provisioned firm ${firm.id} + user ${user.id} for ${email}`);
  return { ...user, contactId: contact.id };
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
