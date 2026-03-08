---
phase: 07-notifications-reports
plan: "05"
subsystem: docusign-integration
tags: [docusign, esignature, oauth, webhook, documents]
dependency_graph:
  requires: [prisma/schema.prisma, src/lib/auth.ts, src/app/api/integrations/qbo]
  provides: [DocuSignClient, esignature-api, docusign-oauth-flow, webhook-handler]
  affects: [deal-closing-tab, documents-page, esignature-packages]
tech_stack:
  added: [DocuSignConnection model]
  patterns: [raw-fetch-oauth (no SDK), CSRF-state-cookie, firm-level-token-storage]
key_files:
  created:
    - prisma/schema.prisma (DocuSignConnection model added)
    - src/lib/docusign.ts
    - src/app/api/docusign/connect/route.ts
    - src/app/api/docusign/callback/route.ts
    - src/app/api/docusign/disconnect/route.ts
    - src/app/api/docusign/webhook/route.ts
    - src/app/api/docusign/status/route.ts
    - src/app/api/esignature/route.ts (replaced stub)
    - src/app/api/esignature/[id]/route.ts
    - src/components/features/deals/docusign-button.tsx
    - src/components/features/documents/docusign-send.tsx
  modified:
    - src/middleware.ts (whitelist /api/docusign/callback and /api/docusign/webhook)
    - src/components/features/deals/deal-closing-tab.tsx (DocuSignButton wired in)
    - src/app/(gp)/documents/page.tsx (DocuSignSend Actions column added)
decisions:
  - "Raw fetch instead of DocuSign SDK — same pattern as QBO Phase 5; SDK has no TS types"
  - "DocuSignConnection stored at firm level (not entity level) — DocuSign accounts are per-firm"
  - "fileUrl support added to esignature POST API — closing checklist items use fileUrl, not Document model records"
  - "Webhook returns 200 even when package not found — prevents DocuSign retry storms"
  - "Signed document stored as new Document record (category=LEGAL) — preserves original, adds signed version"
  - "DocuSignSend returns null when not connected in document center — avoids cluttering table for disconnected users"
  - "/api/docusign/callback and /api/docusign/webhook whitelisted in middleware — called by external servers"
metrics:
  duration: "10min"
  completed: "2026-03-08"
  tasks_completed: 2
  files_created: 12
  files_modified: 3
---

# Phase 07 Plan 05: DocuSign Integration Summary

Full DocuSign OAuth integration with envelope creation, signing status webhooks, and signed document download back into Atlas. GP can send closing documents and any document for signature directly from Atlas.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | DocuSign client library + OAuth flow + webhook handler | f6c19cd | src/lib/docusign.ts, 5 API routes, middleware |
| 2 | Envelope creation API + Send for Signature UI | a72518d | esignature routes, docusign-button.tsx, docusign-send.tsx |

## What Was Built

### DocuSign Client (src/lib/docusign.ts)
- `DocuSignClient` class with OAuth URL generation, code exchange, token refresh
- `createEnvelope()` — creates and sends envelope via DocuSign REST API v2.1
- `getEnvelopeStatus()` — polls current status from DocuSign
- `downloadSignedDocument()` — downloads combined PDF of completed envelope
- `getDocuSignClient(firmId)` — loads connection from DB and returns ready client

### OAuth Flow (3 routes)
- `GET /api/docusign/connect` — GP admin initiates OAuth with CSRF state cookie (same pattern as QBO)
- `GET /api/docusign/callback` — exchanges code, upserts DocuSignConnection, redirects to /settings
- `POST /api/docusign/disconnect` — deletes DocuSignConnection for firm

### Webhook Handler (1 route)
- `POST /api/docusign/webhook` — receives DocuSign Connect events
- Maps DocuSign status ("sent", "delivered", "completed", "declined") to ESignatureStatus enum
- On COMPLETED: downloads signed PDF, stores to Vercel Blob (or local), creates Document record (category=LEGAL)
- Returns 200 always to prevent DocuSign retry storms

### Esignature API (2 routes)
- `POST /api/esignature` — creates envelope via DocuSign, creates ESignaturePackage with SENT status
  - Supports both `documentId` (Document model) and `fileUrl` directly (closing checklist items)
- `GET /api/esignature` — lists packages filtered by dealId, entityId, or documentId
- `GET /api/esignature/[id]` — returns single package
- `PATCH /api/esignature/[id]` — manual status refresh from DocuSign API

### UI Components
- `DocuSignButton` — on deal closing tab, shown for each checklist item with attached file
  - Supports `documentId` prop or `fileUrl` prop directly
  - Opens signer modal: name + email inputs, add/remove rows
  - Shows status badge (SENT/VIEWED/COMPLETED) for existing packages
  - Shows "Connect DocuSign" link when not connected
- `DocuSignSend` — on document center Actions column
  - Returns null (hidden) when DocuSign not connected
  - Same signer modal pattern
- Status check: `GET /api/docusign/status` — UI components check connection before rendering

### Prisma Schema
- `DocuSignConnection` model: firmId (unique), accessToken, refreshToken, tokenExpiry, accountId, baseUri
- Run via `prisma generate` — schema pushed to DB automatically on build

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] fileUrl support in esignature API**
- **Found during:** Task 2 wiring DocuSignButton into closing tab
- **Issue:** Closing checklist items store `fileUrl` directly (not as Document model records). The esignature POST required `documentId`, making it unusable for closing tab items.
- **Fix:** Extended `CreateESignatureSchema` to accept either `documentId` OR `fileUrl` + `documentName`. API resolves the file to download from either source.
- **Files modified:** src/app/api/esignature/route.ts, src/components/features/deals/docusign-button.tsx
- **Commit:** a72518d

**2. [Rule 2 - Missing] /api/docusign/status endpoint**
- **Found during:** Task 2 — UI components needed a way to check connection status
- **Issue:** Plan specified conditional rendering based on DocuSign connection, but no status endpoint existed
- **Fix:** Created lightweight GET /api/docusign/status returning { connected, accountId, connectedSince }
- **Files modified:** src/app/api/docusign/status/route.ts
- **Commit:** a72518d

**3. [Rule 2 - Missing] Middleware whitelist for DocuSign routes**
- **Found during:** Task 1 — OAuth callback and webhook must be accessible without Clerk auth
- **Issue:** Middleware would block DocuSign's OAuth redirect and webhook calls
- **Fix:** Added /api/docusign/callback and /api/docusign/webhook to isPublicRoute in middleware
- **Files modified:** src/middleware.ts
- **Commit:** f6c19cd

## Auth Gates

None — DocuSign credentials are set via environment variables (`DOCUSIGN_INTEGRATION_KEY`, `DOCUSIGN_SECRET_KEY`, `DOCUSIGN_OAUTH_BASE`). The OAuth flow itself handles connection via the UI.

## Self-Check: PASSED

All created files verified present on disk. Both task commits (f6c19cd, a72518d) verified in git log. TypeScript check on all modified files returns zero errors (pre-existing errors in unrelated integrations/reports files excluded).
