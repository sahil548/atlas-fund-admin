---
plan: 22-02
phase: 22-fit-finish-code
status: complete
date: 2026-04-16
---

# Plan 22-02 — Verification: Document Upload (Obs 40)

## Build Gate

```
npm run build — EXIT CODE 0
✓ Compiled successfully in 8.6s
✓ Running TypeScript (zero errors in app code)
✓ Generating static pages (116/116)
```

## Schema Verification

```bash
grep -n "DocumentFormDataSchema" src/lib/schemas.ts src/app/api/documents/route.ts

# Output:
src/lib/schemas.ts:1203:export const DocumentFormDataSchema = z.object({
src/app/api/documents/route.ts:11:import { PatchDocumentLinkSchema, DocumentFormDataSchema, CreateDocumentSchema } from "@/lib/schemas";
src/app/api/documents/route.ts:108:      // 2. Extract scalar fields and validate them via DocumentFormDataSchema.
src/app/api/documents/route.ts:111:      const parsed = DocumentFormDataSchema.safeParse({
```

DocumentFormDataSchema exported from schemas.ts: YES
DocumentFormDataSchema.safeParse() called in route: YES

## Manual Verification Checklist

To verify against Obs 40 on localhost:3000 (sign in as user-jk):

- [ ] Go to /documents → click "Upload Document"
- [ ] Modal opens — FileUpload widget visible (drag-and-drop area with browse link)
- [ ] Upload button is DISABLED (no file selected, no name)
- [ ] Attach a test file (any format) — FileUpload widget shows filename and size
- [ ] Document Name field auto-fills with the filename
- [ ] Upload button becomes ENABLED
- [ ] Click Upload — spinner appears, then toast "Document uploaded"
- [ ] New document row appears in list with:
  - Name (auto-filled from filename)
  - Category (FINANCIAL by default)
  - File link (clickable, opens preview/download)
  - File size (non-zero)
- [ ] Download the file — bytes match original

## Zod Validation Check

Sending a FormData POST with missing name should return 400:

```bash
curl -X POST http://localhost:3000/api/documents \
  -F "file=@/tmp/test.txt" \
  -F "category=FINANCIAL" \
  -F "firmId=firm-1"
# Expected: 400 { "error": "Name is required" }

curl -X POST http://localhost:3000/api/documents \
  -F "file=@/tmp/test.txt" \
  -F "name=Test Doc" \
  -F "firmId=firm-1"
# Expected: 400 { "error": "Category is required" }
```

## Existing Caller Regression Check

capital-call-document-panel.tsx and distribution-document-panel.tsx also POST
FormData to /api/documents. These callers send: file, name, category, and
either capitalCallId or distributionEventId (not firmId). The API fallsback
firmId to authUser.firmId when not present in form data, so these callers
continue to work without changes.

- [ ] Capital call document upload still works (manual: Transactions > Capital Calls)
- [ ] Distribution document upload still works (manual: Transactions > Distributions)

## Storage Note

This deployment uses local filesystem storage (`data/uploads/` directory) in
development because BLOB_READ_WRITE_TOKEN is not set. Files are served via
`/api/documents/download/[filename]`. Production storage (Vercel Blob / S3/R2)
is a v3.1+ item per CONTEXT.md decision log.

## Obs 40 Evidence

Root cause confirmed (from RESEARCH.md): The upload modal had NO file input.
`handleUpload` sent a JSON POST with only `{name, category}` — no file bytes.
The Upload button was disabled until a name was typed, which is what the
walkthrough observed as "stuck on step 1."

Fix: Added `<FileUpload>` primitive above the name field. The Upload button is
now disabled until BOTH a file is selected AND a name is entered. Submission
uses `FormData` (no Content-Type header). Server validates via
`DocumentFormDataSchema.safeParse()` — returns descriptive 400 on bad input.
