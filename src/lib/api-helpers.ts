import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export async function parseBody<T>(req: Request, schema: ZodType<T>) {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return {
        data: null as T | null,
        error: NextResponse.json({ error: result.error.flatten() }, { status: 400 }),
      };
    }
    return { data: result.data, error: null };
  } catch {
    return {
      data: null as T | null,
      error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }),
    };
  }
}
