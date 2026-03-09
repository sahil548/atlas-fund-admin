# Phase 12: AI Configuration & Document Intake - Research

**Researched:** 2026-03-09
**Domain:** AI key management, per-user access control, async document extraction pipeline, extracted field preview/approval
**Confidence:** HIGH — codebase fully read, all existing infrastructure verified

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Per-user AI access control**
- Simple on/off toggle per user (not per-feature granularity)
- Toggle lives in the Users & Access settings tab, inline on each user row alongside role and status
- Admin toggle overrides everything — if AI is disabled for a user, no AI features work even if they have their own key. Personal key is preserved but dormant
- Default access by role: GP_ADMIN = on, GP_TEAM = on, SERVICE_PROVIDER = off
- LP_INVESTOR: no AI access (not applicable)

**User key override UX**
- Personal API key management lives on the user's profile page in a dedicated "AI Settings" section
- Users can override provider, model, AND API key independently (not just key) — each user can choose their preferred provider/model
- Key fallback chain: user key first → tenant key second → "No API key configured"
- Subtle status indicator in profile AI section: "Using: Your key" / "Using: Firm default" / "No key configured"
- If AI is disabled for the user, the AI section shows disabled/grayed out with message: "AI features are disabled for your account. Contact your admin to enable." Key fields hidden

**Document processing pipeline**
- AI extraction triggers automatically on every upload — no manual trigger needed
- Processing is async — upload returns immediately, extraction runs in background
- Document shows inline status badge: "Processing" (amber) / "Complete" (green) / "Failed" (red) — visible wherever documents appear
- On failure: retry button + error message displayed on the document row
- AI extraction requires a valid API key (user or tenant). Without one, documents upload normally with basic text extraction only
- Four document types get AI extraction: CIMs (deal terms), leases (dates/terms), credit docs (covenants), K-1s (tax info). Other types get text extraction only
- Type-specific extraction schemas — each document type has its own extraction prompt targeting relevant fields
- Schema selection based on document category chosen at upload time (existing category dropdown)

**Extracted fields preview & approval**
- Extracted fields require GP review before applying — fields are shown in a preview state, not auto-applied
- Preview presented as a side panel on document detail — click document → side panel shows extracted fields with editable inputs and checkboxes
- GP can edit extracted values before applying — each field shows the AI value in an editable input that GP can correct
- GP selects which fields to apply, clicks "Apply Selected"
- Extraction record preserved for audit — store original AI extraction alongside applied values. GP can see "AI extracted X, you applied Y" in document history

### Claude's Discretion
- Async processing implementation (API route-based, serverless function, or queue)
- Extraction prompt engineering for each document type
- Side panel layout and field ordering
- Status badge styling and animation
- Error message wording for failure states
- How extraction audit records are stored (JSON field vs separate table)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AICONF-01 | GP_ADMIN can set tenant-wide default LLM API key in Settings | AIConfiguration model + /api/settings/ai-config already exist; needs no new API endpoint |
| AICONF-02 | GP_ADMIN can toggle AI access per user (enable/disable AI features per team member) | User model needs `aiEnabled` boolean; settings Users & Access tab needs toggle column |
| AICONF-03 | Users with AI access enabled can set their own API key override in profile settings | User model needs personal AI config fields; profile page doesn't exist yet — needs creation |
| AICONF-04 | AI features check user key first, fall back to tenant key, show "No API key configured" if neither exists | getAIConfig() needs new wrapper that accepts userId and resolves fallback chain |
| AICONF-05 | Service providers have AI access disabled by default | Default `aiEnabled = false` for SERVICE_PROVIDER at User creation time |
| DOC-01 | Site-wide document upload extracts structured data via AI (CIMs, lease agreements, credit docs, K-1s) | extractTextFromBuffer() exists; need async AI extraction triggered in 5 upload endpoints |
| DOC-02 | Extracted data auto-tagged and linked to relevant deal, asset, or entity automatically | Document already has dealId/assetId/entityId/investorId; extracted fields need new Document columns |
| DOC-03 | Document processing status visible (processing, complete, failed) with extracted fields preview | Document model needs status enum + extraction JSON; UI needs status badge + side panel |

</phase_requirements>

---

## Summary

Phase 12 builds two interconnected systems on top of Atlas's already solid AI foundation. The first is per-user AI access control — a boolean `aiEnabled` flag on the User model, toggled by admins in the Users & Access tab, with per-user provider/model/key overrides stored on the user record and resolved via a fallback chain in a new `getUserAIConfig()` helper. The second is an async document extraction pipeline — every upload endpoint fires AI extraction in the background (no await), the Document model tracks status (PENDING/PROCESSING/COMPLETE/FAILED), and a side panel on document detail lets GPs review, edit, and selectively apply extracted fields before they are written to deals, assets, or entities.

The existing infrastructure is unusually complete for this phase. `src/lib/ai-config.ts` already provides AES-256-GCM key encryption, `getAIConfig()`, `createAIClient()`, and `testConnection()`. The tenant-side AI settings UI (`ai-global-config.tsx`) is fully built. The `extractTextFromBuffer()` function covers PDF, Excel, CSV, and plain text. The deal metadata extraction endpoint (`/api/deals/[id]/extract-metadata`) demonstrates the exact AI call pattern to generalize. Five upload endpoints exist across deals, assets, investors, entities (via /api/documents), and the global documents endpoint — each needs a non-blocking AI extraction trigger added after the existing text extraction step.

The primary schema work is: (1) adding `aiEnabled Boolean @default(true)` and personal AI config fields to the User model; (2) adding `extractionStatus`, `extractedFields` (JSON), and `appliedFields` (JSON) to the Document model. The planner should treat schema changes with care per STATE.md guidance — use `prisma db push --force-reset` only in dev.

**Primary recommendation:** Follow the existing extract-metadata pattern to build a generalized `extractDocumentFields()` function in `src/lib/document-extraction.ts`, trigger it non-blocking in all upload endpoints by document category, and surface status + preview via Document model fields plus a new side panel component.

---

## Standard Stack

### Core (already installed in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `openai` | installed | OpenAI SDK for AI calls | Already used throughout codebase |
| `@anthropic-ai/sdk` | installed | Anthropic SDK | Already used, wrapped via AnthropicCompat |
| `@prisma/client` | 7.x | DB access for Document + User schema additions | Project standard |
| `@vercel/blob` | installed | File storage (prod) | Project standard for uploads |
| `crypto` (Node built-in) | built-in | AES-256-GCM key encryption | Already used in ai-config.ts |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `swr` | 2.x | Client data fetching + cache invalidation | All client-side fetching in this phase |
| `react-hook-form` + `zod` | installed | Form validation | Profile page AI settings form |
| `pdf-parse` | installed | PDF text extraction | Already used in extractTextFromBuffer |
| `xlsx` | installed | Excel extraction | Already used in extractTextFromBuffer |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| API-route-based async (fire-and-forget) | Vercel Background Functions / Queue (Inngest, Upstash QStash) | Queue is more robust for retries but adds external dependency; API-route fire-and-forget is simpler and sufficient for this scale — 3-person GP team, low upload volume |
| JSON fields on Document | Separate DocumentExtraction table | JSON fields are simpler; audit trail (original AI value vs applied value) fits in two JSON columns; separate table adds complexity with no meaningful benefit at this scale |

**Installation:** No new packages needed. All dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure Changes
```
src/
├── lib/
│   ├── ai-config.ts              # Extend: add getUserAIConfig(userId, firmId)
│   └── document-extraction.ts   # Extend: add extractDocumentFields(docId, category, text, client, model)
├── app/api/
│   ├── users/[id]/ai-config/     # NEW: GET/PUT user personal AI settings
│   │   └── route.ts
│   ├── documents/[id]/           # NEW: document-level endpoints
│   │   ├── extract/route.ts      # POST: retry extraction (manual trigger on failed docs)
│   │   └── apply-fields/route.ts # POST: apply selected extracted fields
│   ├── deals/[id]/documents/route.ts  # MODIFY: add async extraction trigger
│   ├── documents/route.ts             # MODIFY: add async extraction trigger
│   └── users/[id]/route.ts            # MODIFY: extend schema to accept aiEnabled
├── app/(gp)/
│   └── profile/
│       └── page.tsx              # NEW: user profile page with AI Settings section
├── components/features/
│   ├── settings/
│   │   └── ai-global-config.tsx  # MODIFY: no changes needed (already complete)
│   └── documents/
│       ├── document-extraction-panel.tsx  # NEW: side panel for extracted field review
│       └── document-status-badge.tsx      # NEW: Processing/Complete/Failed badge
```

### Pattern 1: Non-blocking Async Extraction Trigger

The pattern in all upload endpoints after the document is created:

```typescript
// After prisma.document.create(...) — fire-and-forget, never await
if (shouldExtract(category)) {
  // Mark as PROCESSING first so UI can show status immediately
  prisma.document.update({
    where: { id: doc.id },
    data: { extractionStatus: "PROCESSING" }
  }).catch(console.error);

  // Kick off extraction without blocking the upload response
  extractDocumentFields(doc.id, category, extractedText, firmId)
    .catch((err) => {
      console.error("[upload] AI extraction failed:", err);
      // Update status to FAILED — don't crash the upload
      prisma.document.update({
        where: { id: doc.id },
        data: { extractionStatus: "FAILED", extractionError: err.message }
      }).catch(console.error);
    });
}

return NextResponse.json(doc, { status: 201 }); // returns immediately
```

**Important caveat:** In Next.js serverless functions on Vercel, a response ending the function can cause background work to be killed before completion. Use `waitUntil` from `@vercel/functions` if available, or accept that some extractions may not complete on Vercel Hobby. On the project's current setup (local dev primarily), this is not an issue. Document the limitation; add a retry button on FAILED status to cover this case.

### Pattern 2: Category-to-DocumentType Mapping

The four AI-extracted document types map to DocumentCategory enum values:

```typescript
// Category → extraction schema mapping (in document-extraction.ts)
const EXTRACTABLE_CATEGORIES = {
  // CIM = CIM / Information Memorandum — maps to FINANCIAL or LEGAL
  // Leases map to LEGAL
  // Credit docs map to FINANCIAL
  // K-1s map to TAX
} as const;

// Decision: use document category to select extraction schema
function shouldExtractAI(category: string): boolean {
  return ["FINANCIAL", "LEGAL", "TAX"].includes(category);
}

function getExtractionSchema(category: string): ExtractionSchema | null {
  switch (category) {
    case "FINANCIAL": return CIM_SCHEMA;  // deal terms
    case "LEGAL": return LEASE_OR_CREDIT_SCHEMA; // lease dates/terms OR credit covenants
    case "TAX": return K1_SCHEMA;          // LP tax info
    default: return null;
  }
}
```

**Note:** The existing DocumentCategory enum does NOT have a "CIM" type. CIMs are uploaded as FINANCIAL or LEGAL. Leases are LEGAL. Credit docs are FINANCIAL. K-1s are TAX. The extraction schema selection must use these existing categories, not add new enum values.

### Pattern 3: Resolved AI Config Fallback Chain

New `getUserAIConfig()` function in `src/lib/ai-config.ts`:

```typescript
interface UserAIConfig {
  provider: string;
  model: string;
  apiKey: string | null;
  source: "user" | "tenant" | "none";
  aiEnabled: boolean;
}

export async function getUserAIConfig(userId: string, firmId: string): Promise<UserAIConfig> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiEnabled: true, personalAiConfig: true }
  });

  // If AI is disabled for this user, return immediately
  if (!user?.aiEnabled) {
    return { provider: "openai", model: "gpt-4o", apiKey: null, source: "none", aiEnabled: false };
  }

  const personal = user.personalAiConfig as PersonalAIConfig | null;

  // Check user's own key first
  if (personal?.apiKey) {
    const apiKey = decryptApiKey(personal.apiKey, personal.apiKeyIV || "", personal.apiKeyTag || "");
    return { provider: personal.provider || "openai", model: personal.model || "gpt-4o", apiKey, source: "user", aiEnabled: true };
  }

  // Fall back to tenant config
  const tenantConfig = await getAIConfig(firmId);
  if (tenantConfig.apiKey) {
    return { ...tenantConfig, source: "tenant", aiEnabled: true };
  }

  return { provider: "openai", model: "gpt-4o", apiKey: null, source: "none", aiEnabled: true };
}
```

### Pattern 4: Extracted Fields Side Panel

The document detail side panel follows this UI flow:
1. User clicks document row → side panel opens (Sheet/drawer pattern, not a modal)
2. Panel fetches `document.extractedFields` (JSON from DB)
3. Each field renders as: `[checkbox] [field label] [editable input showing AI value]`
4. "Apply Selected" button POSTs selected fields to `/api/documents/[id]/apply-fields`
5. Backend writes applied values to the appropriate parent (deal, asset, entity) and saves audit record

```typescript
// POST /api/documents/[id]/apply-fields body
{
  fields: [
    { key: "leaseStartDate", value: "2024-01-01", aiValue: "January 1, 2024" },
    { key: "baseRentMonthly", value: "15000", aiValue: "$15,000/month" }
  ]
}
```

### Anti-Patterns to Avoid
- **Blocking the upload on AI extraction:** Never `await` the AI call in the upload endpoint. AI calls can take 10-30s and will time out the upload.
- **Hard-coding a new DocumentCategory enum value (e.g., "CIM"):** The Prisma DocumentCategory enum doesn't have CIM. Use FINANCIAL/LEGAL/TAX for the extraction triggers instead.
- **Auto-applying extracted fields:** All decisions locked: GP review required. Never write extracted fields to deals/assets without going through the apply-fields endpoint.
- **Storing personal API keys in plaintext:** Use the existing `encryptApiKey()`/`decryptApiKey()` from `ai-config.ts` — same AES-256-GCM pattern.
- **Using browser `confirm()` for the "Apply Selected" destructive action:** Use the existing ConfirmDialog component or inline state-based confirmation per FOUND-03.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AES key encryption | Custom encryption | `encryptApiKey()`/`decryptApiKey()` in `ai-config.ts` | Already handles IV, tag, base64; handles missing key gracefully |
| AI client creation | New SDK instantiation | `createAIClient(firmId)` in `ai-config.ts` | Handles OpenAI/Anthropic switching, AnthropicCompat wrapper |
| Connection testing | Custom HTTP check | `testConnection()` in `ai-config.ts` | Already built, handles both providers |
| PDF/Excel text extraction | Custom parsers | `extractTextFromBuffer()` in `document-extraction.ts` | Already handles PDF, Excel, CSV, plain text with 50K char limit |
| Status badges | Custom badge component | `Badge` from `src/components/ui/badge.tsx` | Already has green/amber/red color variants used project-wide |
| File upload | Custom FormData handler | `FileUpload` component from `src/components/ui/file-upload.tsx` | Drag-and-drop, size validation, ready to use |
| Modal / panel | Custom overlay | `Modal` from `src/components/ui/modal.tsx` | Project standard; for side panel use a right-anchored version |

**Key insight:** The extraction pipeline pattern already exists in `/api/deals/[id]/extract-metadata/route.ts`. This endpoint is the direct template for the generalized extraction function. Copy its AI call pattern (90-second timeout, JSON parse with fallback, activity logging) when building `extractDocumentFields()`.

---

## Common Pitfalls

### Pitfall 1: Vercel Serverless Function Truncation
**What goes wrong:** A Next.js API route that fires a non-awaited Promise (fire-and-forget) may have that Promise killed when the HTTP response is sent, because Vercel serverless functions terminate on response.
**Why it happens:** Vercel's serverless environment doesn't guarantee background work completion after response.
**How to avoid:** Use `waitUntil` from `@vercel/functions` if the package is available. If not, accept FAILED status as the fallback and rely on the manual retry button (user clicks retry → calls `/api/documents/[id]/extract`). Log the limitation in a code comment.
**Warning signs:** Documents immediately show FAILED status in prod but work fine in dev (dev uses local server which keeps processes alive).

### Pitfall 2: DocumentCategory Enum Mismatch for CIM Detection
**What goes wrong:** Assuming there's a "CIM" DocumentCategory enum value. There isn't — the Prisma enum has: BOARD, FINANCIAL, LEGAL, GOVERNANCE, VALUATION, STATEMENT, TAX, REPORT, NOTICE, OTHER.
**Why it happens:** The CONTEXT.md describes CIMs as a document type, but the DB uses generic categories.
**How to avoid:** Map CIM extraction to FINANCIAL category. Map leases and credit docs to LEGAL or FINANCIAL. Map K-1s to TAX. DO NOT add new enum values to DocumentCategory — that requires a schema migration.
**Warning signs:** Build errors referencing non-existent enum value, or extraction never triggering for CIMs.

### Pitfall 3: User Model Missing aiEnabled and Personal Config Fields
**What goes wrong:** The current User model has NO `aiEnabled` boolean and NO personal AI config fields. Both must be added via Prisma schema migration.
**Why it happens:** These are net-new fields. The CONTEXT.md confirms this: "User model (Prisma): May need `aiEnabled` boolean field and personal AI config fields (or JSON)."
**How to avoid:** Add to schema.prisma:
```prisma
model User {
  // ... existing fields ...
  aiEnabled       Boolean @default(true)   // false default for SERVICE_PROVIDER handled at creation
  personalAiConfig Json?                   // { provider, model, apiKey, apiKeyIV, apiKeyTag }
}
```
Then run the full reset command from CLAUDE.md: `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" npx prisma db push --force-reset && npx prisma generate && npx prisma db seed`
**Warning signs:** TypeScript errors referencing `user.aiEnabled`, "Column does not exist" Prisma errors.

### Pitfall 4: Document Model Missing Extraction Status Fields
**What goes wrong:** Current Document model has no `extractionStatus`, no `extractedFields`, no `appliedFields`, no `extractionError`. All must be added.
**Why it happens:** Net-new fields for this phase.
**How to avoid:** Add to schema.prisma:
```prisma
enum ExtractionStatus {
  NONE
  PENDING
  PROCESSING
  COMPLETE
  FAILED
}

model Document {
  // ... existing fields ...
  extractionStatus ExtractionStatus @default(NONE)
  extractedFields  Json?    // { fieldKey: { aiValue, label } }[] raw AI output
  appliedFields    Json?    // { fieldKey: { aiValue, appliedValue, appliedAt } }[] audit record
  extractionError  String?  // Error message if FAILED
}
```
**Warning signs:** TypeScript errors on document.extractionStatus, status badge never shows.

### Pitfall 5: Profile Page Does Not Exist
**What goes wrong:** The "user's profile page" referenced in CONTEXT.md for personal AI settings doesn't exist in the codebase. There is no `src/app/(gp)/profile/page.tsx`.
**Why it happens:** It was never built. The settings page has user management but no individual profile view.
**How to avoid:** Create `src/app/(gp)/profile/page.tsx` as a new page. It should show the current user's info (read from auth/user context) with an "AI Settings" section. Add the route to `routes.ts`.
**Warning signs:** 404 on `/profile`, missing from sidebar.

### Pitfall 6: SERVICE_PROVIDER Default AI Disabled
**What goes wrong:** Forgetting to set `aiEnabled = false` when creating SERVICE_PROVIDER users.
**Why it happens:** The schema default is `true` (GP_ADMIN and GP_TEAM default to enabled). SERVICE_PROVIDER needs an exception.
**How to avoid:** In `POST /api/users` route, check if role === "SERVICE_PROVIDER" and set `aiEnabled: false` explicitly on creation. Also set `aiEnabled: false` in the seed for any existing SERVICE_PROVIDER users.
**Warning signs:** Service providers see AI features they shouldn't have access to.

### Pitfall 7: AI Key Stored in personalAiConfig Without Encryption
**What goes wrong:** Personal API keys stored as plaintext in the `personalAiConfig` JSON field.
**Why it happens:** JSON fields make it easy to skip the encrypt/decrypt step.
**How to avoid:** Always call `encryptApiKey()` before writing, `decryptApiKey()` before reading. Store `{ provider, model, apiKey: encrypted, apiKeyIV: iv, apiKeyTag: tag }` in the JSON.
**Warning signs:** API keys visible in plaintext in Prisma Studio / DB.

---

## Code Examples

Verified patterns from existing codebase:

### Existing AI Call Pattern (from extract-metadata/route.ts)
```typescript
// Source: /api/deals/[id]/extract-metadata/route.ts
// Template for all document extraction — use this pattern exactly

export const maxDuration = 60; // Vercel Hobby plan cap

const aiTimeout = new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error("Extraction timed out after 90 seconds")), 90_000),
);

const aiCall = (client as any).chat.completions.create({
  model,
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: documentText },
  ],
  response_format: { type: "json_object" },
  max_tokens: 2000,
  temperature: 0.2,
});

const response = await Promise.race([aiCall, aiTimeout]);
const raw = response.choices?.[0]?.message?.content || "{}";

// Always handle JSON parse failure
try {
  extracted = JSON.parse(raw);
} catch {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) { extracted = JSON.parse(jsonMatch[0]); }
  else { /* handle parse failure */ }
}
```

### Encrypt/Decrypt Personal API Key (from ai-config.ts)
```typescript
// Source: src/lib/ai-config.ts
import { encryptApiKey, decryptApiKey } from "@/lib/ai-config";

// When saving:
const { encrypted, iv, tag } = encryptApiKey(plaintextApiKey);
// Store in personalAiConfig JSON: { provider, model, apiKey: encrypted, apiKeyIV: iv, apiKeyTag: tag }

// When reading:
const personal = user.personalAiConfig as any;
const apiKey = decryptApiKey(personal.apiKey, personal.apiKeyIV || "", personal.apiKeyTag || "");
```

### Upload Endpoint Pattern with Extraction Trigger
```typescript
// Pattern for all 5 upload endpoints
// After the document is created:

const doc = await prisma.document.create({ data: { ... } });

// Trigger async extraction — NEVER await
const aiExtractionCategories = ["FINANCIAL", "LEGAL", "TAX"];
if (extractedText && aiExtractionCategories.includes(category)) {
  // Mark PROCESSING immediately (best effort)
  prisma.document.update({
    where: { id: doc.id },
    data: { extractionStatus: "PROCESSING" }
  }).catch(console.error);

  // Fire and forget
  extractDocumentFields(doc.id, category, extractedText, firmId)
    .catch((err) => {
      prisma.document.update({
        where: { id: doc.id },
        data: { extractionStatus: "FAILED", extractionError: String(err.message || err) }
      }).catch(console.error);
    });
}

return NextResponse.json(doc, { status: 201 });
```

### Users & Access Tab Toggle Column
```typescript
// In settings/page.tsx, Users & Access tab — add AI column to existing user table
// Toggle calls PUT /api/users/[id] with { aiEnabled: boolean }

<td className="px-3 py-2.5">
  <button
    onClick={() => handleToggleAI(u)}
    disabled={!canToggleAI(u)} // LP_INVESTOR cannot have AI
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
      u.aiEnabled ? "bg-indigo-600" : "bg-gray-200"
    } disabled:opacity-40 disabled:cursor-not-allowed`}
  >
    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
      u.aiEnabled ? "translate-x-5" : "translate-x-1"
    }`} />
  </button>
</td>
```

### Extraction Schema for Each Document Type
```typescript
// src/lib/document-extraction.ts — extraction prompt schemas

const CIM_SCHEMA = {
  description: "CIM / Information Memorandum — extract deal terms",
  fields: ["dealSize", "targetReturn", "investmentStructure", "keyTerms",
           "assetClass", "holdPeriod", "projectedIRR", "projectedMultiple"],
  prompt: `Extract deal/investment terms from this CIM or information memorandum...`
};

const LEASE_SCHEMA = {
  description: "Lease Agreement — extract lease terms and dates",
  fields: ["tenantName", "leaseType", "leaseStartDate", "leaseEndDate",
           "baseRentMonthly", "rentEscalation", "renewalOptions", "squareFeet"],
  prompt: `Extract lease terms and key dates from this lease agreement...`
};

const CREDIT_SCHEMA = {
  description: "Credit Document — extract covenants and loan terms",
  fields: ["borrowerName", "principal", "interestRate", "maturityDate",
           "ltv", "covenants", "subordination", "agreementType"],
  prompt: `Extract credit agreement terms and covenants from this document...`
};

const K1_SCHEMA = {
  description: "K-1 Tax Document — extract LP tax information",
  fields: ["taxYear", "partnerName", "partnershipName", "ordinaryIncome",
           "capitalGains", "distributionsReceived", "endingCapitalAccount"],
  prompt: `Extract LP tax information from this K-1 tax document...`
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual extraction trigger button | Auto-trigger on every upload | This phase | No manual step needed |
| Tenant-only AI config | Per-user provider/model/key override | This phase | Each GP team member can use their preferred model |
| Extract-and-apply immediately | Extract → preview → GP-approves → apply | This phase | Prevents incorrect AI values being written to production data |
| No extraction audit trail | AI extracted value + applied value stored separately | This phase | GP can see what AI said vs what they applied |

**Deprecated/outdated:**
- The existing `UploadDocumentForm` in `src/components/features/assets/upload-document-form.tsx` uses `useMutation` directly to `/api/assets/[id]/documents` but that endpoint doesn't do real file upload (no FormData). It's a stub. The actual file upload pattern follows the deal documents endpoint. This difference must be understood when adding extraction triggers.

---

## Open Questions

1. **Which exact upload endpoints need extraction triggers added?**
   - What we know: 5 document upload points exist — `/api/deals/[id]/documents`, `/api/documents`, `/api/assets/[id]/documents` (stub), `/api/investors/[id]/documents` (GET only, no POST found), `/api/lp/[investorId]/documents` (GET only)
   - What's unclear: The asset and investor document upload flows — the existing asset documents endpoint accepts only structured data (no file), not FormData. Investor documents endpoint has no POST. K-1 uploads presumably go through the investor documents path.
   - Recommendation: Plan should add extraction triggers to: `/api/deals/[id]/documents/route.ts` (already has full file upload), `/api/documents/route.ts` (global endpoint, has file upload), and build real file upload for assets and investors if K-1 extraction is in scope. Or scope K-1 extraction to documents uploaded via the global `/api/documents` endpoint with an investorId.

2. **Profile page navigation — where does it live and how is it accessed?**
   - What we know: No profile page exists currently. The sidebar doesn't have a profile link.
   - What's unclear: Whether it should be in the sidebar, accessible from a user menu/avatar, or linked from the Users & Access table.
   - Recommendation: Create `/profile` route accessible from the top-right user avatar/initials menu (the TopBar likely has a user display). Add to routes.ts with `portal: "gp"` and hide from sidebar (`sidebarIcon: null` or equivalent).

3. **Side panel vs modal for extracted fields review**
   - What we know: CONTEXT.md locks the UX as "side panel on document detail." The codebase has a `Modal` component but no dedicated slide-out panel/Sheet component.
   - What's unclear: Whether to build a Sheet component or use the existing Modal with side-anchored styling.
   - Recommendation: Build a minimal Sheet/side-panel component using a fixed right-positioned div with transition (Tailwind `translate-x` animation). Keep it simple — no external sheet library needed at this scale.

---

## Validation Architecture

nyquist_validation is enabled per `.planning/config.json`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config, vitest.config, or test directories found |
| Config file | None — Wave 0 must establish if needed |
| Quick run command | `npm run build` (catches TypeScript/compilation errors) |
| Full suite command | `npm run build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AICONF-01 | GP_ADMIN saves tenant AI config in Settings | manual | Navigate to /settings → AI Configuration tab, save key | N/A |
| AICONF-02 | GP_ADMIN toggles AI access per user in Users & Access tab | manual | Navigate to /settings → Users & Access tab, toggle AI column | N/A |
| AICONF-03 | User with AI access sets personal provider/model/key in profile | manual | Navigate to /profile → AI Settings section | N/A |
| AICONF-04 | Fallback chain: user key → tenant key → "No API key configured" | manual | Test with/without personal key, with/without tenant key | N/A |
| AICONF-05 | New SERVICE_PROVIDER user has AI disabled by default | manual | Create SERVICE_PROVIDER user, verify aiEnabled = false | N/A |
| DOC-01 | Upload CIM/lease/credit/K-1 → AI extraction runs automatically | manual | Upload PDF to deal documents, verify extraction status changes | N/A |
| DOC-02 | Extracted fields linked to deal/asset/entity after apply | manual | Apply extracted fields, verify parent record updated | N/A |
| DOC-03 | Document shows processing/complete/failed status + preview panel | manual | Upload document, verify badge status; click to see side panel | N/A |

### Sampling Rate
- **Per task commit:** `npm run build` — zero TypeScript errors
- **Per wave merge:** `npm run build` + manual smoke test of upload flow
- **Phase gate:** Full manual test of all 8 requirements before `/gsd:verify-work`

### Wave 0 Gaps
- No test infrastructure exists. This project relies on TypeScript build + manual testing.
- No Wave 0 test files needed — build verification is the primary automated gate.
- Manual testing checklist should be written in PLAN.md per requirement.

*(No automated test framework — existing project relies on `npm run build` + manual browser testing per CLAUDE.md workflow)*

---

## Sources

### Primary (HIGH confidence)
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/src/lib/ai-config.ts` — full read: encryption, getAIConfig, createAIClient, testConnection
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/src/lib/document-extraction.ts` — full read: extractTextFromBuffer patterns
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/src/app/api/deals/[id]/extract-metadata/route.ts` — full read: exact AI extraction pattern to generalize
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/src/app/api/deals/[id]/documents/route.ts` — full read: file upload + text extraction pattern
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/src/app/api/documents/route.ts` — full read: global documents endpoint
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/prisma/schema.prisma` — partial read: User, Document, AIConfiguration models
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/src/app/(gp)/settings/page.tsx` — partial read: Users & Access tab structure
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/src/components/features/settings/ai-global-config.tsx` — full read: existing tenant AI config UI
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/.planning/DATA-MODEL.md` — full read: all models and API routes
- `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/.planning/phases/12-ai-configuration-document-intake/12-CONTEXT.md` — full read: all locked decisions

### Secondary (MEDIUM confidence)
- Vercel serverless fire-and-forget behavior: known limitation from Vercel documentation; `waitUntil` is the official mitigation via `@vercel/functions`

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and used in codebase
- Architecture: HIGH — existing extraction endpoint is a direct template; patterns are codebase-verified
- Pitfalls: HIGH — schema gaps (aiEnabled, extractionStatus) confirmed by reading actual schema.prisma; missing profile page confirmed by directory listing
- Extraction schemas (prompt content): MEDIUM — field selection is reasonable but exact prompt wording requires iteration

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable stack, no fast-moving dependencies)
