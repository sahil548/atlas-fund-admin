# Phase 7: Notifications & Reports - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable notification delivery (email + SMS), PDF/Excel report generation, and connect remaining third-party integrations (DocuSign, Asana, Notion, Plaid, Google Calendar). This phase completes Milestone 1 (GP Production Ready). LP notification preferences are already built (Phase 6) — this phase delivers the actual delivery engine and generated output.

</domain>

<decisions>
## Implementation Decisions

### Notification triggers & delivery
- Email provider: Claude's discretion (Resend, SendGrid, or SES — pick best fit for Next.js/Vercel)
- Trigger events for email/SMS: capital activity (capital call ISSUED, distribution PAID) + reports (quarterly report available, K-1 uploaded). Portfolio updates (NAV changes, deal closes) NOT included in email triggers this phase
- Digest batching: SKIP for now — all notifications sent immediately regardless of LP digest preference setting. Digest engine deferred to post-v1
- GP team notifications: Claude's discretion — decide whether GP gets email or stays in-app only based on what makes sense
- GP override (capital calls always immediate) is moot since all notifications are immediate this phase

### Email template design
- Style: clean HTML emails — professional, mobile-responsive, simple card layout. No heavy graphics
- Branding: white-label — entity/fund name as sender, no Atlas branding. Consistent with white-label report decision
- Capital call email content: full details in email body — call amount, due date, entity name, purpose, wiring instructions. LP doesn't need to log in to see essentials
- Report notification: simpler — entity name, report type, period, link to LP portal document center

### Report generation
- PDF engine: @react-pdf/renderer — React components render to PDF. No headless browser. Works within Vercel 10s limit
- Quarterly report: full quarterly package (4-6 pages) — financial summary (NAV, IRR, TVPI/DPI/RVPI, capital called vs committed), capital account statement, portfolio allocation breakdown, transaction ledger for the quarter
- Capital account statement PDF: matches LP portal view — period summary + running ledger + per-entity breakdown. Same format LP sees online
- Fund summary report: one-pager per entity — entity name, fund size, deployment %, NAV, IRR/TVPI/DPI, top 5 holdings, recent activity
- Branding: white-label / minimal — entity name and fund details only. No Atlas logo. GP presents as their own materials
- Storage: generated PDFs saved to Vercel Blob and linked in existing document center under REPORT/STATEMENT categories. LPs access via LP document center
- Generation UI: both — generate from entity detail page (quick contextual access) AND from a dedicated /reports page for batch generation across entities

### K-1 distribution
- Upload only (no generation) — per PROJECT.md
- Bulk upload + auto-match: GP uploads multiple K-1 PDFs at once, system matches to investors by filename pattern (e.g., "K1_InvestorName_2025.pdf") and distributes to each investor's document center
- Email notification sent to each LP when their K-1 is available

### Excel export
- Scope: all data tables get export buttons — deals, assets, entities, investors, transactions, tasks, contacts, companies, capital calls, distributions, plus LP-facing tables
- Format: XLSX only (xlsx package already installed)
- Data: all available fields for the record type, not just visible table columns
- UX: download icon button top-right of table, next to search/filter bar. Exports current filtered data
- Remove search bars from all list pages — AI command bar (Cmd+K) is the universal search. Keep filter dropdowns only. Bundle this cleanup since we're touching these pages for export buttons

### DocuSign integration
- Scope: full flow — real OAuth, create envelopes from closing documents, webhook for signing status, download signed docs back into Atlas
- Trigger locations: closing tab on deal detail (natural workflow) AND document center (for non-deal documents like entity formation docs)
- ESignaturePackage model already exists with status tracking (DRAFT, SENT, SIGNED, DECLINED)

### Third-party integrations
- Asana: bidirectional sync — Atlas tasks sync to Asana projects/tasks and vice versa. Changes in either direction reflected
- Notion: bidirectional sync — same pattern as Asana
- Plaid: per-entity connection (mirrors QBO pattern). Shows cash balances + recent bank transactions on entity detail
- Google Calendar: bidirectional sync — meetings sync both ways, plus task due dates appear as calendar events
- Connection management: Integrations tab on existing /settings page. Connect buttons for each service

### Notification bell polish
- Fix hardcoded userId ('user-jk') to use useUser() hook
- Add unread count badge in sidebar navigation
- Add filter by notification type in dropdown

### Claude's Discretion
- Email provider selection (Resend vs SendGrid vs SES)
- Whether GP team gets email notifications or stays in-app only
- Email template HTML structure and exact layout
- DocuSign OAuth flow details and webhook handler
- Asana/Notion API mapping strategy
- Plaid dashboard placement on entity detail
- Google Calendar event formatting
- Report page layout and navigation
- Notification bell dropdown redesign specifics

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Notification model** (`prisma/schema.prisma`): Supports GP + LP with type/channel enums, status field
- **createNotification() / notifyGPTeam()** (`src/lib/notifications.ts`): Existing utility for in-app notifications — extend for email/SMS delivery
- **InvestorNotificationPreference** model + API + UI: Fully built in Phase 6 — preferences stored, ready to be read by delivery engine
- **notification-bell.tsx**: 30s polling, mark read/all-read — needs userId fix and polish
- **ESignaturePackage model**: Exists with status tracking + stub API at `/api/esignature/route.ts`
- **xlsx package**: Installed (`^0.18.5`) but unused — ready for Excel export
- **pdf-parse**: Installed for reading PDFs — NOT for generation
- **Slack integration** (`src/lib/slack.ts`): Reference pattern for external API integration (fetch-based, non-blocking)
- **SearchFilterBar**: Exists on most list pages — will be modified to remove search, keep filters, add export button
- **Document center** (`src/app/(lp)/lp-documents/page.tsx`): Lists documents by category — generated reports will land here
- **Toast system** (`useToast()`): Context-based, never destructure — use for export/generation feedback

### Established Patterns
- **SWR data fetching**: All pages use useSWR with conditional fetching
- **Zod validation**: All API routes use `parseBody(req, ZodSchema)`
- **Fire-and-forget**: Notification creation is non-blocking (same pattern as NAV snapshots, metric snapshots)
- **Per-entity connections**: QBO OAuth is per-entity — Plaid should follow same pattern
- **Route registry** (`routes.ts`): Single source of truth for sidebar, command bar
- **Settings tabs**: Settings page has existing tab structure — add Integrations tab

### Integration Points
- **Capital call status change** → trigger email notification (ISSUED status)
- **Distribution status change** → trigger email notification (PAID status)
- **Document upload** → trigger notification for K-1 and report availability
- **Entity detail page** → add Plaid cash balance section + report generation button
- **Closing tab** → add DocuSign "Send for signature" button
- **Document center** → add DocuSign send button
- **Settings page** → new Integrations tab for Asana/Notion/Plaid/Google Cal connections
- **All list pages** → add export button, remove search bar
- **New /reports page** → register in routes.ts

</code_context>

<specifics>
## Specific Ideas

- White-label everything — both reports and emails show entity/fund name only, no Atlas branding. GP presents as their own materials to LPs
- Capital call emails include full details (amount, due date, wiring instructions) so LPs don't need to log in
- K-1 bulk upload uses filename pattern matching — GP drops multiple files, system auto-matches to investors
- Remove search bars from list pages since AI command bar is universal. Bundle with export button addition since both modify the same table header areas
- Plaid per-entity mirrors the QBO per-entity pattern from Phase 5
- Integration connections managed centrally on Settings > Integrations tab

</specifics>

<deferred>
## Deferred Ideas

- Digest batching engine (daily/weekly email batches) — needs Vercel Cron Jobs, deferred to post-v1
- Portfolio update notifications via email (NAV changes, deal closes) — only capital activity + reports this phase
- Search bar removal is bundled into this phase (not deferred) since we're touching list pages for export buttons

</deferred>

---

*Phase: 07-notifications-reports*
*Context gathered: 2026-03-07*
