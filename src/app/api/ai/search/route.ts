import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { AISearchSchema } from "@/lib/schemas";
import { searchAndAnalyze } from "@/lib/ai-service";

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, AISearchSchema);
  if (error) return error;

  const result = await searchAndAnalyze(data!.query, data!.firmId);
  return NextResponse.json(result);
}
