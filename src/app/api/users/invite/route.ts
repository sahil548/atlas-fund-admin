import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

const InviteSchema = z.object({
  email: z.string().email("Valid email is required"),
  role: z.enum(["GP_ADMIN", "GP_TEAM", "SERVICE_PROVIDER", "LP_INVESTOR"]),
  name: z.string().optional(),
});

/**
 * POST /api/users/invite
 *
 * Invite a team member by email. Pre-creates a User record in the
 * caller's firm so that when they sign up via Clerk, the webhook
 * links them to the existing firm instead of creating a new one.
 *
 * Also creates a Contact record (users are always contacts) and
 * sends a Clerk invitation email.
 *
 * Only GP_ADMIN can invite users.
 */
export async function POST(req: Request) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (authUser.role !== "GP_ADMIN") return forbidden();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = InviteSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { email, role, name } = result.data;

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 },
    );
  }

  const displayName = name || email.split("@")[0];
  const initials = displayName
    .split(" ")
    .map((w) => w[0]?.toUpperCase())
    .join("")
    .slice(0, 2) || displayName.slice(0, 2).toUpperCase();

  // Create User with PENDING invite status
  const user = await prisma.user.create({
    data: {
      email,
      name: displayName,
      initials,
      role,
      firmId: authUser.firmId,
      inviteStatus: "PENDING",
    },
  });

  // Auto-create a Contact record and link to the user
  const nameParts = displayName.split(" ");
  const contact = await prisma.contact.create({
    data: {
      firmId: authUser.firmId,
      firstName: nameParts[0] || displayName,
      lastName: nameParts.slice(1).join(" ") || "",
      email,
      type: "INTERNAL",
    },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { contactId: contact.id },
  });

  // Send Clerk invitation email (non-blocking — if it fails, user can still sign up manually)
  try {
    const clerk = await clerkClient();
    await clerk.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || "/",
    });
    console.log(`[invite] Sent Clerk invitation email to ${email}`);
  } catch (err) {
    console.warn(`[invite] Failed to send Clerk invitation email to ${email}:`, err);
  }

  console.log(`[invite] ${authUser.email} invited ${email} to firm ${authUser.firmId} as ${role}`);
  return NextResponse.json(user, { status: 201 });
}
