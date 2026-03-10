import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { AIExecuteSchema } from "@/lib/schemas";
import { planAction } from "@/lib/ai-service";
import { getAuthUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

// CIM field key → Deal model field mapping
const CIM_FIELD_MAP: Record<string, string> = {
  dealValue: "targetSize",
  targetSize: "targetSize",
  dealSize: "targetSize",
  closingDate: "dealMetadata",
  targetReturn: "targetReturn",
  checkSize: "targetCheckSize",
  sector: "sector",
  gpName: "gpName",
  sponsor: "counterparty",
  counterparty: "counterparty",
  assetClass: "assetClass",
  capitalInstrument: "capitalInstrument",
  structure: "participationStructure",
  description: "description",
  investmentRationale: "investmentRationale",
};

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(req: Request) {
  // Rate limiting
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitResult = rateLimit(authUser.id);
  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Slow down.", retryAfter: limitResult.retryAfter },
      {
        status: 429,
        headers: {
          "Retry-After": String(limitResult.retryAfter ?? 60),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  const { data, error } = await parseBody(req, AIExecuteSchema);
  if (error) return error;
  const body = data!;

  const { action, firmId, pageContext, confirmed, confirmedPayload, actionType } = body;

  // ── UNCONFIRMED: Plan the action ────────────────────────────────────────────

  if (!confirmed) {
    // Special case: EXTRACT_CIM_TERMS — read extractedFields from Document model
    // (no LLM call needed for this action type — we read existing DB data)
    const actionLower = action.toLowerCase();
    const isExtractCIM =
      actionLower.includes("extract") ||
      actionLower.includes("cim") ||
      actionLower.includes("fill the deal") ||
      actionLower.includes("fill deal");

    if (isExtractCIM && pageContext?.entityId) {
      return await handleExtractCIMTermsPlan(pageContext.entityId);
    }

    // All other action types: use LLM to parse
    const plan = await planAction(action, firmId, authUser.id, pageContext);
    return NextResponse.json(plan);
  }

  // ── CONFIRMED: Execute the action ───────────────────────────────────────────

  const resolvedActionType = actionType || "UNKNOWN";
  const payload = confirmedPayload || {};

  // Forward auth headers to internal API calls
  const authHeaders: HeadersInit = {
    "Content-Type": "application/json",
    Cookie: req.headers.get("Cookie") || "",
  };

  try {
    switch (resolvedActionType) {
      case "CREATE_TASK": {
        const taskBody: Record<string, unknown> = {
          title: payload.title || "New Task",
          priority: payload.priority || "MEDIUM",
        };
        if (payload.contextType) taskBody.contextType = payload.contextType;
        if (payload.contextId) taskBody.contextId = payload.contextId;
        if (payload.dealId) taskBody.dealId = payload.dealId;
        if (payload.assetId) taskBody.assetId = payload.assetId;
        if (payload.entityId) taskBody.entityId = payload.entityId;
        if (payload.assigneeId) taskBody.assigneeId = payload.assigneeId;

        const res = await fetch(`${BASE_URL}/api/tasks`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(taskBody),
        });
        const result = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: "Failed to create task", detail: result },
            { status: res.status },
          );
        }
        return NextResponse.json({
          success: true,
          message: `Task "${taskBody.title}" created successfully.`,
          result: { id: result.id, url: "/tasks" },
        });
      }

      case "CREATE_DEAL": {
        const dealBody: Record<string, unknown> = {
          name: payload.name || "New Deal",
          assetClass: payload.assetClass || "OPERATING_BUSINESS",
        };
        if (payload.description) dealBody.description = payload.description;
        if (payload.sector) dealBody.sector = payload.sector;
        if (payload.targetSize) dealBody.targetSize = payload.targetSize;
        if (payload.gpName) dealBody.gpName = payload.gpName;

        const res = await fetch(`${BASE_URL}/api/deals?firmId=${firmId}`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(dealBody),
        });
        const result = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: "Failed to create deal", detail: result },
            { status: res.status },
          );
        }
        return NextResponse.json({
          success: true,
          message: `Deal "${dealBody.name}" created successfully.`,
          result: { id: result.id, url: `/deals/${result.id}` },
        });
      }

      case "UPDATE_DEAL": {
        const { dealId, ...updateFields } = payload;
        if (!dealId || typeof dealId !== "string") {
          return NextResponse.json(
            { error: "Missing dealId for UPDATE_DEAL action" },
            { status: 400 },
          );
        }
        const res = await fetch(`${BASE_URL}/api/deals/${dealId}`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify(updateFields),
        });
        const result = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: "Failed to update deal", detail: result },
            { status: res.status },
          );
        }
        return NextResponse.json({
          success: true,
          message: `Deal updated successfully.`,
          result: { id: dealId as string, url: `/deals/${dealId}` },
        });
      }

      case "LOG_NOTE": {
        const { dealId, note } = payload;
        if (!dealId || typeof dealId !== "string") {
          return NextResponse.json(
            { error: "Missing dealId for LOG_NOTE action" },
            { status: 400 },
          );
        }
        const res = await fetch(`${BASE_URL}/api/deals/${dealId}/activity`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            type: "NOTE",
            description: note || "Note logged via AI command bar",
          }),
        });
        if (!res.ok) {
          return NextResponse.json(
            { error: "Failed to log note" },
            { status: res.status },
          );
        }
        return NextResponse.json({
          success: true,
          message: "Note logged successfully.",
          result: { id: dealId as string, url: `/deals/${dealId}` },
        });
      }

      case "TRIGGER_DD_ANALYSIS": {
        const { dealId, type: ddType } = payload;
        if (!dealId || typeof dealId !== "string") {
          return NextResponse.json(
            { error: "Missing dealId for TRIGGER_DD_ANALYSIS action" },
            { status: 400 },
          );
        }
        // Fire-and-forget — don't await long-running analysis
        fetch(`${BASE_URL}/api/deals/${dealId}/dd-analyze`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ type: ddType || "DD_FINANCIAL" }),
        }).catch((err) =>
          console.error("[execute] DD analysis trigger failed:", err),
        );
        return NextResponse.json({
          success: true,
          message:
            "DD analysis started — this may take up to 60 seconds. Check the DD tab on the deal page for results.",
          result: { id: dealId as string, url: `/deals/${dealId}` },
        });
      }

      case "TRIGGER_IC_MEMO": {
        const { dealId } = payload;
        if (!dealId || typeof dealId !== "string") {
          return NextResponse.json(
            { error: "Missing dealId for TRIGGER_IC_MEMO action" },
            { status: 400 },
          );
        }
        // Fire-and-forget
        fetch(`${BASE_URL}/api/deals/${dealId}/dd-analyze`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ type: "IC_MEMO" }),
        }).catch((err) =>
          console.error("[execute] IC memo trigger failed:", err),
        );
        return NextResponse.json({
          success: true,
          message:
            "IC memo draft started — this may take up to 60 seconds. Check the DD tab on the deal page for results.",
          result: { id: dealId as string, url: `/deals/${dealId}` },
        });
      }

      case "EXTRACT_CIM_TERMS": {
        const { dealId, documentId } = payload;
        if (!dealId || typeof dealId !== "string") {
          return NextResponse.json(
            { error: "Missing dealId for EXTRACT_CIM_TERMS action" },
            { status: 400 },
          );
        }

        // Build update object from confirmed payload (exclude identifier fields)
        const EXCLUDED_KEYS = new Set(["dealId", "documentId", "documentName"]);
        const updateFields = Object.fromEntries(
          Object.entries(payload).filter(([k]) => !EXCLUDED_KEYS.has(k)),
        );

        // Update the deal via internal API
        const res = await fetch(`${BASE_URL}/api/deals/${dealId}`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify(updateFields),
        });
        if (!res.ok) {
          const err = await res.json();
          return NextResponse.json(
            { error: "Failed to update deal fields", detail: err },
            { status: res.status },
          );
        }

        // Record applied fields on the Document (audit trail)
        if (documentId && typeof documentId === "string") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const appliedFieldsData: any[] = Object.entries(payload)
            .filter(([k]) => !EXCLUDED_KEYS.has(k))
            .map(([fieldKey, value]) => ({
              fieldKey,
              aiValue: value,
              appliedValue: value,
              appliedAt: new Date().toISOString(),
            }));

          await prisma.document.update({
            where: { id: documentId },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: { appliedFields: appliedFieldsData as any },
          }).catch((err) =>
            console.error("[execute] Failed to update appliedFields:", err),
          );
        }

        return NextResponse.json({
          success: true,
          message: "Deal fields updated from CIM extraction.",
          result: { id: dealId as string, url: `/deals/${dealId}` },
        });
      }

      case "ASSIGN_TASK": {
        const { taskId, assigneeId } = payload;
        if (!taskId || typeof taskId !== "string") {
          return NextResponse.json(
            { error: "Missing taskId for ASSIGN_TASK action" },
            { status: 400 },
          );
        }
        const res = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify({ assigneeId }),
        });
        if (!res.ok) {
          return NextResponse.json(
            { error: "Failed to assign task" },
            { status: res.status },
          );
        }
        return NextResponse.json({
          success: true,
          message: "Task assigned successfully.",
          result: { id: taskId as string, url: "/tasks" },
        });
      }

      case "AMBIGUOUS": {
        // Return the clarification question — no execution
        return NextResponse.json({
          success: false,
          message: "Please clarify your request.",
          clarification: action,
        });
      }

      default: {
        return NextResponse.json(
          { error: `Unknown action type: ${resolvedActionType}` },
          { status: 400 },
        );
      }
    }
  } catch (err) {
    console.error("[execute] Unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during action execution." },
      { status: 500 },
    );
  }
}

// ── EXTRACT_CIM_TERMS planning helper ───────────────────────────────────────
// Reads extractedFields from the most recent COMPLETED CIM document for the deal.
// Returns an ActionPlan with mapped deal fields as the confirmation payload.

async function handleExtractCIMTermsPlan(dealId: string) {
  const doc = await prisma.document.findFirst({
    where: {
      dealId,
      extractionStatus: "COMPLETE",
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, extractedFields: true, dealId: true },
  });

  if (!doc || !doc.extractedFields) {
    return NextResponse.json({
      actionType: "EXTRACT_CIM_TERMS",
      description:
        "No extracted CIM found for this deal. Upload a CIM document first, or ensure extraction has completed.",
      payload: {},
      requiresConfirmation: false,
    });
  }

  // Parse extractedFields — format: { fieldKey: { aiValue, label } }
  // or array format from Phase 12
  const extracted = doc.extractedFields as Record<string, unknown>;
  const mappedPayload: Record<string, unknown> = {
    dealId: doc.dealId,
    documentId: doc.id,
    documentName: doc.name,
  };

  // Handle both object format { fieldKey: { aiValue } } and array format
  const entries: [string, unknown][] = Array.isArray(extracted)
    ? (extracted as Array<{ fieldKey: string; aiValue: unknown }>).map((item) => [
        item.fieldKey,
        item.aiValue,
      ])
    : Object.entries(extracted);

  for (const [fieldKey, value] of entries) {
    const dealField = CIM_FIELD_MAP[fieldKey] || fieldKey;
    // Extract aiValue if nested
    const aiValue =
      value !== null &&
      typeof value === "object" &&
      "aiValue" in (value as object)
        ? (value as { aiValue: unknown }).aiValue
        : value;

    if (aiValue !== null && aiValue !== undefined && aiValue !== "") {
      mappedPayload[dealField] = aiValue;
    }
  }

  return NextResponse.json({
    actionType: "EXTRACT_CIM_TERMS",
    description: `Pre-fill deal fields from CIM: "${doc.name}"`,
    payload: mappedPayload,
    requiresConfirmation: true,
  });
}
