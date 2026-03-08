---
phase: 07-notifications-reports
plan: 01
subsystem: notifications
tags: [email, sms, resend, twilio, notification-delivery, notification-bell, capital-call, distribution]
dependency_graph:
  requires: []
  provides: [email-delivery, sms-delivery, multi-channel-notification-engine, notification-bell-fix, notification-type-filter]
  affects: [capital-calls-api, distributions-api, notifications-api, sidebar]
tech_stack:
  added: [resend (npm)]
  patterns: [fire-and-forget notification dispatch, graceful degradation without API keys, LP preference-gated channel routing]
key_files:
  created:
    - src/lib/email.ts
    - src/lib/sms.ts
    - src/lib/email-templates.ts
    - src/lib/notification-delivery.ts
  modified:
    - src/lib/notifications.ts
    - prisma/schema.prisma
    - src/app/api/capital-calls/[id]/route.ts
    - src/app/api/distributions/[id]/route.ts
    - src/app/api/notifications/route.ts
    - src/components/ui/notification-bell.tsx
    - src/components/layout/sidebar.tsx
decisions:
  - "Resend SDK used via npm install resend; Twilio uses raw fetch/Basic auth (no SDK)"
  - "All email/SMS errors caught and logged — never thrown — fire-and-forget pattern"
  - "PORTAL_ONLY channel respected: no external delivery, in-app only"
  - "investorId -> userId resolved via InvestorUserAccess table (first record, primary user)"
  - "notifyGPTeam gets in-app only for capital activity — email would be redundant"
  - "Notifications API type filter validated against VALID_TYPES set before casting to Prisma enum"
  - "Pre-existing build errors in untracked integration/reports routes fixed (Rule 3 — blocking)"
metrics:
  duration: 15min
  completed: "2026-03-07"
  tasks_completed: 2
  files_created: 4
  files_modified: 9
---

# Phase 7 Plan 01: Notification Delivery Engine Summary

Multi-channel notification delivery via Resend email and Twilio SMS, triggered by capital call ISSUED and distribution PAID status changes. LP preferences respected. Notification bell fixed to use real authenticated user ID with type filter dropdown. Unread badge added to sidebar.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Email/SMS delivery modules + multi-channel engine | 1ee41c9 | email.ts, sms.ts, email-templates.ts, notification-delivery.ts, notifications.ts, schema.prisma |
| 2 | Wire triggers + fix notification bell + sidebar badge | 50bf231 | capital-calls/[id]/route.ts, distributions/[id]/route.ts, notification-bell.tsx, sidebar.tsx, notifications/route.ts |

## What Was Built

### Email Delivery (src/lib/email.ts)
- Resend SDK wrapper with graceful degradation when `RESEND_API_KEY` missing
- `from` defaults to `EMAIL_FROM_ADDRESS` env var or `notices@atlas-fund.com`
- Fire-and-forget: errors caught and logged, never thrown

### SMS Delivery (src/lib/sms.ts)
- Twilio REST API via raw fetch with Basic auth (no SDK)
- URL-encoded form POST to `https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json`
- Graceful degradation when Twilio env vars missing

### Email Templates (src/lib/email-templates.ts)
- `capitalCallEmailHtml`: white-label, includes full amount/due date/wiring instructions (LP doesn't need to log in)
- `distributionPaidEmailHtml`: net to LPs highlighted, gross amount shown
- `reportAvailableEmailHtml`: with portal URL CTA button
- `k1AvailableEmailHtml`: with download link CTA button
- All templates: mobile-responsive, professional card layout, NO Atlas branding

### Multi-Channel Dispatcher (src/lib/notification-delivery.ts)
- `deliverNotification`: reads LP InvestorNotificationPreference, checks type category toggle, dispatches EMAIL/SMS/PORTAL_ONLY
- `notifyInvestorsOnCapitalCall(capitalCallId)`: fetches all line item investors, sends per-investor email/SMS, GP team gets in-app only
- `notifyInvestorsOnDistribution(distributionId)`: same pattern for distributions
- `notifyInvestorsOnReportAvailable`: batch notify by investorIds array
- `notifyInvestorsOnK1Available`: single investor K-1 notification

### Notification Type Extension (src/lib/notifications.ts)
- Added `DISTRIBUTION` and `REPORT` to `NotificationType` union
- `createNotification` now accepts optional `investorId` parameter

### Schema Update (prisma/schema.prisma)
- Added `DISTRIBUTION` and `REPORT` to `NotificationType` enum

### Trigger Wiring
- `capital-calls/[id]/route.ts`: ISSUED transition fires `notifyInvestorsOnCapitalCall(id).catch(console.error)`
- `distributions/[id]/route.ts`: PAID transition fires `notifyInvestorsOnDistribution(id).catch(console.error)`

### Notification Bell Fix (src/components/ui/notification-bell.tsx)
- Removed hardcoded `userId = "user-jk"` default
- Uses `useUser()` hook from user-provider
- Loading guard: renders nothing until user is loaded
- Added type filter dropdown: All, Capital Call, Distribution, Report, Document, General
- Filter passes `?type=X` query param to API

### Notifications API (src/app/api/notifications/route.ts)
- Added `?type=` filter param support
- Validates type against `VALID_TYPES` set before casting to Prisma `NotificationType`
- `unreadCount` always counts ALL unread (not filtered) for correct badge display

### Sidebar Unread Badge (src/components/layout/sidebar.tsx)
- Added lightweight SWR poll for unread count (30s interval)
- Pulsing red dot + text counter shown in sidebar footer when unread > 0

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing TypeScript errors in untracked integration routes**
- **Found during:** Task 2 build verification
- **Issue:** `asana/sync/route.ts` used `firmId` on `Task` model (doesn't exist), `google-calendar/sync/route.ts` used `"COMPLETE"` as `TaskStatus` (enum is `DONE`), `reports/generate/route.ts` had missing `investorName:` property key
- **Fix:** Corrected each route to use proper Prisma schema fields
- **Files modified:** src/app/api/integrations/asana/sync/route.ts, src/app/api/integrations/google-calendar/sync/route.ts, src/app/api/reports/generate/route.ts
- **Commit:** 50bf231

## Auth Gates

Resend and Twilio require API keys set in environment:
- `RESEND_API_KEY` from Resend Dashboard → API Keys → Create API Key
- `EMAIL_FROM_ADDRESS` — verified domain email in Resend
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` from Twilio Console

Both services gracefully degrade (log warning, skip) when keys are missing — dev environment works without credentials.

## Self-Check: PASSED

Files exist:
- src/lib/email.ts: FOUND
- src/lib/sms.ts: FOUND
- src/lib/email-templates.ts: FOUND
- src/lib/notification-delivery.ts: FOUND

Commits exist:
- 1ee41c9: FOUND (Task 1 — email/SMS delivery modules)
- 50bf231: FOUND (Task 2 — triggers + bell fix + sidebar badge)
