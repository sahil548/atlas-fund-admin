import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { AgentQuerySchema } from "@/lib/schemas";
import { listCapabilities, routeToAgent } from "@/lib/agent-registry";
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

  const body = await req.clone().json();

  if (body.action === "list") {
    return NextResponse.json({
      success: true,
      capabilities: listCapabilities(),
    });
  }

  if (body.action === "query") {
    const { data, error } = await parseBody(req, AgentQuerySchema);
    if (error) return error;

    const result = await routeToAgent(data!.query, data!.firmId);

    if (!result) {
      return NextResponse.json({
        success: false,
        message: "No agent matched this query with high enough confidence.",
      });
    }

    return NextResponse.json(result);
  }

  return NextResponse.json(
    { error: "Invalid action. Use 'list' or 'query'." },
    { status: 400 },
  );
}
