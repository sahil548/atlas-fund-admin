import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { SendToICSchema } from "@/lib/schemas";
import { sendToICReview } from "@/lib/deal-stage-engine";

/**
 * POST /api/deals/[id]/send-to-ic
 * Manual transition: DUE_DILIGENCE → IC_REVIEW
 * Returns { warning } if workstreams incomplete and force !== true.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, SendToICSchema);
  if (error) return error;

  try {
    const result = await sendToICReview(id, data!.force);

    if (result.warning) {
      return NextResponse.json(
        { warning: result.warning, deal: result.deal },
        { status: 200 },
      );
    }

    return NextResponse.json({ deal: result.deal });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
