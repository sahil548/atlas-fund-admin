import { getAuthUser, unauthorized } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  return NextResponse.json(user);
}
