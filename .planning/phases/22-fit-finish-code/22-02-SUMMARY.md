---
phase: 22-fit-finish-code
plan: 02
subsystem: documents
tags: [file-upload, formdata, zod-validation, obs-40, blocker]
dependency_graph:
  requires: []
  provides:
    - document-upload-with-file
    - DocumentFormDataSchema
  affects:
    - src/app/(gp)/documents/page.tsx
    - src/app/api/documents/route.ts
    - src/lib/schemas.ts
tech_stack:
  added:
    - FileUpload primitive (already existed in ui/file-upload.tsx — wired up)
    - DocumentFormDataSchema (new Zod schema for multipart validation)
  patterns:
    - FormData submission without Content-Type header (browser sets multipart boundary)
    - Zod safeParse on extracted plain object (not parseBody — parseBody is JSON-only)
    - Content-type branching in API route (multipart vs application/json)
key_files:
  created:
    - .planning/phases/22-fit-finish-code/22-02-VERIFICATION.md
  modified:
    - src/app/(gp)/documents/page.tsx
    - src/app/api/documents/route.ts
    - src/lib/schemas.ts
decisions:
  - DocumentFormDataSchema validates scalar fields only; file is validated via instanceof File check
  - firmId falls back to authUser.firmId when not present in form data (backwards-compat with existing callers)
  - JSON branch preserved as fallback via parseBody(req, CreateDocumentSchema) for non-UI callers
  - Local filesystem (data/uploads/) used in dev; Vercel Blob used in prod when BLOB_READ_WRITE_TOKEN is set
metrics:
  duration: ~40 minutes
  completed_date: 2026-04-16
  tasks_completed: 2
  files_modified: 3
---

# Phase 22 Plan 02: Document Upload — FileUpload + FormData Submission

**One-liner:** Real file attachment flow via FileUpload primitive + FormData POST validated through DocumentFormDataSchema.safeParse().

## What Was Built

**Obs 40 was confirmed closed by this plan.** The root cause was that the Upload modal had no file input — it only stored a document name and POSTed JSON metadata with no file bytes attached. The API expected FormData but the client sent JSON, so documents were created with `fileUrl: null`.

Three coordinated changes landed in commit `ccd47a3`:

1. **`src/lib/schemas.ts`** — Added `DocumentFormDataSchema` (exported): validates `name`, `category`, `firmId` as required; `associatedDealId`, `associatedEntityId`, `associatedAssetId` as optional.

2. **`src/app/(gp)/documents/page.tsx`** — Added `FileUpload` import and `uploadFile: File | null` state. The modal now shows the FileUpload widget (drag-and-drop + browse) above the name field. Selecting a file auto-fills the document name. Upload button is disabled until both a file and a name are present. `handleUpload` builds `FormData` and POSTs without `Content-Type` header (browser sets multipart boundary automatically). Toast error uses `typeof data.error === "string"` guard per coding-patterns.md.

3. **`src/app/api/documents/route.ts`** — POST handler now branches on `content-type` header:
   - `multipart/form-data` path: validates file with `instanceof File` check (Zod cannot model File), then validates scalar fields via `DocumentFormDataSchema.safeParse()`. Returns descriptive 400 if invalid. Persists file to Vercel Blob or local `data/uploads/` directory.
   - JSON path (fallback): `parseBody(req, CreateDocumentSchema)` for legacy callers that POST metadata-only JSON — unchanged behavior.

## Deviations from Plan

**None** — plan executed exactly as written.

The API already had a FormData handler body (confirmed in Task 1 audit), so no new storage logic was needed beyond what existed. The content-type branching and Zod validation layer were the additive changes.

## Obs 40 Evidence

**Before this plan:** Modal showed only `[Document Name field] [Category select] [Associate With select]`. Upload button disabled until name typed. No file input. POSTed JSON. Document record created with `fileUrl: null`.

**After this plan:** Modal shows `[FileUpload area] [Document Name field] [Category select] [Associate With select]`. Upload button disabled until both file AND name present. Selecting a file auto-fills name. POSTs FormData. Document record created with non-null `fileUrl`. File is downloadable.

**FormData Zod validation:** `DocumentFormDataSchema.safeParse()` runs on every multipart POST. Missing or blank `name` returns `{ error: "Name is required" }` (HTTP 400). Missing or blank `category` returns `{ error: "Category is required" }`. Missing `firmId` with no auth user fallback returns `{ error: "firmId is required" }`.

## Build Gate

```
npm run build — EXIT CODE 0
✓ Compiled successfully in 8.6s
✓ TypeScript: zero errors in app code
✓ 116/116 static pages generated
```

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `src/app/(gp)/documents/page.tsx` exists | FOUND |
| `src/app/api/documents/route.ts` exists | FOUND |
| `src/lib/schemas.ts` exists | FOUND |
| Commit `ccd47a3` exists | FOUND |
| `DocumentFormDataSchema` count in schemas.ts | 1 export |
| `uploadFile` references in page.tsx | 5 (state, setter, handlers) |
| `formData()` call in route.ts | 1 (multipart branch) |
| `npm run build` exit code | 0 (PASS) |
