# Phase 12: AI Configuration & Document Intake - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Infrastructure for all AI features: tenant-wide and per-user API key management, per-user AI access control, and a document processing engine that automatically extracts structured data from uploaded documents (CIMs, leases, credit docs, K-1s) and links it to the relevant deal, asset, or entity. Phase 18 builds AI features on top of this infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Per-user AI access control
- Simple on/off toggle per user (not per-feature granularity)
- Toggle lives in the **Users & Access** settings tab, inline on each user row alongside role and status
- Admin toggle overrides everything — if AI is disabled for a user, no AI features work even if they have their own key. Personal key is preserved but dormant
- Default access by role: GP_ADMIN = on, GP_TEAM = on, SERVICE_PROVIDER = off
- LP_INVESTOR: no AI access (not applicable)

### User key override UX
- Personal API key management lives on the **user's profile page** in a dedicated "AI Settings" section
- Users can override **provider, model, AND API key** independently (not just key) — each user can choose their preferred provider/model
- Key fallback chain: user key first → tenant key second → "No API key configured"
- Subtle status indicator in profile AI section: "Using: Your key" / "Using: Firm default" / "No key configured"
- If AI is disabled for the user, the AI section shows **disabled/grayed out** with message: "AI features are disabled for your account. Contact your admin to enable." Key fields hidden

### Document processing pipeline
- AI extraction triggers **automatically on every upload** — no manual trigger needed
- Processing is **async** — upload returns immediately, extraction runs in background
- Document shows inline status badge: "Processing" (amber) / "Complete" (green) / "Failed" (red) — visible wherever documents appear (deal detail, asset detail, entity detail, etc.)
- On failure: **retry button + error message** displayed on the document row
- AI extraction requires a valid API key (user or tenant). Without one, documents upload normally with basic text extraction only — no AI-powered structured extraction
- Four document types get AI extraction in this phase: **CIMs** (deal terms), **leases** (dates/terms), **credit docs** (covenants), **K-1s** (tax info). Other types get text extraction only
- **Type-specific extraction schemas** — each document type has its own extraction prompt targeting relevant fields
- Schema selection based on **document category** chosen at upload time (existing category dropdown already in upload forms)

### Extracted fields preview & approval
- Extracted fields require **GP review before applying** — fields are shown in a preview state, not auto-applied
- Preview presented as a **side panel on document detail** — click document → side panel shows extracted fields with editable inputs and checkboxes
- GP can **edit extracted values** before applying — each field shows the AI value in an editable input that GP can correct
- GP selects which fields to apply, clicks "Apply Selected"
- **Extraction record preserved for audit** — store original AI extraction alongside applied values. GP can see "AI extracted X, you applied Y" in document history

### Claude's Discretion
- Async processing implementation (API route-based, serverless function, or queue)
- Extraction prompt engineering for each document type
- Side panel layout and field ordering
- Status badge styling and animation
- Error message wording for failure states
- How extraction audit records are stored (JSON field vs separate table)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **AI Config lib** (`src/lib/ai-config.ts`): AES-256-GCM encryption/decryption, `getAIConfig()`, `createAIClient()`, `testConnection()` — fully built, handles OpenAI and Anthropic
- **AI Global Config component** (`src/components/features/settings/ai-global-config.tsx`): Provider/model/key UI with test connection — tenant-wide config already complete
- **Document model** (Prisma `Document`): Already has `extractedText`, links to deal/asset/entity/investor, category enum with 10 types
- **Text extraction** (`src/lib/document-extraction.ts`): `extractTextFromBuffer()` for PDF, Excel, CSV, plain text — already runs on upload
- **Deal metadata extraction** (`/api/deals/[id]/extract-metadata`): AI extraction endpoint already built for deals with asset-class-specific field guidance — can be generalized
- **File upload component** (`src/components/ui/file-upload.tsx`): Drag-and-drop with size validation — ready to reuse
- **Document preview modal** (`src/components/ui/document-preview-modal.tsx`): PDF/image preview — exists
- **Upload document form** (`src/components/features/assets/upload-document-form.tsx`): Category selection modal — exists
- **Permission system** (`src/lib/permissions.ts`, `permissions-types.ts`): 7 areas × 3 levels, `getEffectivePermissions()`, `checkPermission()` — fully built
- **Badge component** (`src/components/ui/badge.tsx`): Color-coded badges (green/amber/red) for status display

### Established Patterns
- **Storage**: Vercel Blob (production) / local filesystem (dev) for file storage
- **Auth**: `getAuthUser()` → role check → permission check pattern on all API routes
- **Settings tabs**: 10-tab settings page — AI Config is tab 5, Users & Access is tab 2
- **Forms**: React Hook Form + Zod validation + useMutation for API calls
- **Encryption**: AES-256-GCM via AI_ENCRYPTION_KEY env var for API key storage

### Integration Points
- **Settings page** (`src/app/(gp)/settings/page.tsx`): Users & Access tab needs AI toggle column
- **Profile page**: Needs new "AI Settings" section for personal key override
- **All upload endpoints** (deals, assets, entities, investors, K-1): Need async AI extraction trigger after text extraction
- **Document lists/tables**: Need processing status badge column
- **Document detail views**: Need side panel for extraction preview
- **User model** (Prisma): May need `aiEnabled` boolean field and personal AI config fields (or JSON)

</code_context>

<specifics>
## Specific Ideas

No specific references — open to standard approaches. The existing AI config UI and extraction patterns provide a solid foundation to extend.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-ai-configuration-document-intake*
*Context gathered: 2026-03-09*
