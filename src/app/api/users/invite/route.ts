import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
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

  const user = await prisma.user.create({
    data: {
      email,
      name: displayName,
      initials,
      role,
      firmId: authUser.firmId,
    },
  });

  console.log(`[invite] ${authUser.email} invited ${email} to firm ${authUser.firmId} as ${role}`);
  return NextResponse.json(user, { status: 201 });
}
