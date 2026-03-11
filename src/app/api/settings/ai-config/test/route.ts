import { NextResponse } from "next/server";
import { testConnection } from "@/lib/ai-config";
import { parseBody } from "@/lib/api-helpers";
import { TestAIConnectionSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  try {
    const { data, error } = await parseBody(req, TestAIConnectionSchema);
    if (error) return error;
    const { provider, apiKey, baseUrl } = data!;

    const result = await testConnection(provider, apiKey, baseUrl);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { connected: false, error: message },
      { status: 500 }
    );
  }
}
