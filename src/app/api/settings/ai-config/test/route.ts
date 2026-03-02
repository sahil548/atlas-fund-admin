import { NextResponse } from "next/server";
import { testConnection } from "@/lib/ai-config";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider, apiKey, baseUrl } = body;

    if (!provider || !apiKey) {
      return NextResponse.json(
        { connected: false, error: "Provider and API key are required" },
        { status: 400 }
      );
    }

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
