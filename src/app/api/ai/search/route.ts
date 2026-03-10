import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { AISearchSchema } from "@/lib/schemas";
import { searchAndAnalyze } from "@/lib/ai-service";
import { getAuthUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // Rate limiting on AI endpoints
  const authUser = await getAuthUser();
  if (authUser) {
    const result = rateLimit(authUser.id);
    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Slow down.", retryAfter: result.retryAfter },
        {
          status: 429,
          headers: {
            "Retry-After": String(result.retryAfter ?? 60),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }
  }

  const { data, error } = await parseBody(req, AISearchSchema);
  if (error) return error;

  const result = await searchAndAnalyze(data!.query, data!.firmId, data!.pageContext);
  return NextResponse.json(result);
}
