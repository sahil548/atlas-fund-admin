# External Integrations

**Analysis Date:** 2026-03-08

## APIs & External Services

**Authentication & Identity:**
- Clerk 7.0.1
  - Service: Google OAuth single sign-on
  - Status: Production (real data)
  - SDK: `@clerk/nextjs`
  - Auth env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
  - Sign-in/sign-up URLs: `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
  - Webhook: `CLERK_WEBHOOK_SECRET` → `/api/webhooks/clerk` handles user.created and user.deleted events
  - Files: `src/middleware.ts`, `src/components/providers/clerk-wrapper.tsx`, `src/app/api/webhooks/clerk/route.ts`

**AI & Language Models:**
- OpenAI GPT-4o (default)
  - SDK: `openai` 6.25.0
  - Auth: `OPENAI_API_KEY` (env var or encrypted in database)
  - Usage: Deal screening, IC memo generation, DD analysis
  - Files: `src/lib/ai-config.ts`, `src/lib/ai-service.ts`

- Anthropic Claude (alternative)
  - SDK: `@anthropic-ai/sdk` 0.78.0
  - Auth: `ANTHROPIC_API_KEY` (env var or encrypted in database)
  - Model: claude-sonnet-4-20250514 (default if Anthropic selected)
  - Compatibility: Wrapped in AnthropicCompat class for OpenAI interface
  - Encryption: Keys stored encrypted in `AIConfiguration.apiKey` table with IV and tag
  - Files: `src/lib/ai-config.ts` (client factory, config lookup, test connection)

**Banking & Financial Data:**
- Plaid
  - Service: Account aggregation, transaction history, account balances
  - SDK: `plaid` 41.4.0
  - Auth: `PLAID_CLIENT_ID`, `PLAID_SECRET`
  - Environment: `PLAID_ENV` (sandbox or production)
  - Products: Auth, Transactions
  - Per-entity connections: OAuth flow stored in `IntegrationConnection` table
  - Files: `src/lib/integrations/plaid.ts`, `src/app/api/integrations/plaid/` (create-link-token, exchange-token, accounts)

- QuickBooks Online (UI-only, OAuth not yet wired)
  - Service: Accounting and financial data
  - SDK: `intuit-oauth` 4.2.2
  - Environment: `QBO_ENVIRONMENT` (sandbox or production)
  - Status: UI scaffolding only; API calls not implemented
  - Files: `src/app/api/integrations/qbo/` (connect, callback, disconnect routes)

**Email & Communications:**
- Resend
  - Service: Transactional email delivery
  - SDK: `resend` 6.9.3
  - Auth: `RESEND_API_KEY`
  - Default sender: `EMAIL_FROM_ADDRESS` (defaults to "notices@atlas-fund.com")
  - Graceful degradation: Logs warning if key not set; skips delivery
  - Files: `src/lib/email.ts`, email templates in `src/lib/email-templates.ts`

- Twilio SMS (optional)
  - Service: SMS notifications
  - Auth: Basic auth via `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
  - Method: Raw REST API (no SDK)
  - Graceful degradation: Logs warning if env vars missing; skips delivery
  - Files: `src/lib/sms.ts`

**Document Management & eSignature:**
- DocuSign
  - Service: Document signing and signature workflows
  - Auth: OAuth via `DOCUSIGN_INTEGRATION_KEY`, `DOCUSIGN_SECRET_KEY`, `DOCUSIGN_OAUTH_BASE`
  - Method: Raw fetch API (no SDK)
  - OAuth flow: Authorization URL, code exchange, token refresh
  - Per-entity connections: Stored in `IntegrationConnection` table
  - Callback: `/api/docusign/callback`
  - Files: `src/lib/docusign.ts`, `src/app/api/docusign/webhook/route.ts`

**Project & Workflow Management:**
- Asana
  - Service: Task and project management
  - Auth: OAuth via `ASANA_CLIENT_ID`, `ASANA_CLIENT_SECRET`
  - Status: Framework only; sync functionality not implemented
  - Files: `src/app/api/integrations/asana/` (connect, callback, sync routes)

- Notion
  - Service: Workspace knowledge base
  - Auth: OAuth via `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`
  - Status: Framework only; sync functionality not implemented
  - Files: `src/app/api/integrations/notion/` (connect, callback, sync routes)

**Calendar & Scheduling:**
- Google Calendar
  - Service: Team calendar integration
  - Auth: OAuth via `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - Status: Framework only; sync functionality not implemented
  - Files: `src/app/api/integrations/google-calendar/` (connect, callback, sync routes)

**Slack (Internal notifications):**
- Service: IC review notifications posted to Slack channel
- Auth: Bot token `SLACK_BOT_TOKEN`, signature verification via `SLACK_SIGNING_SECRET`
- Channel: `SLACK_IC_CHANNEL`
- Usage: Posts IC voting messages and updates status
- Status: Code exists (untested; may be incomplete)
- Files: `src/lib/slack.ts`

## Data Storage

**Databases:**
- PostgreSQL 13+
  - Provider: Any cloud (Vercel Postgres, AWS RDS, Azure Database, local)
  - Connection: `DATABASE_URL` env var
  - Client: Prisma ORM with `@prisma/adapter-pg` and `pg` driver
  - Schema location: `prisma/schema.prisma` (57 models)
  - Singleton: `src/lib/prisma.ts` (never instantiate PrismaClient elsewhere)
  - Migration: Schema changes via `npx prisma db push` (auto-migration for dev)

**File Storage:**
- Vercel Blob (`@vercel/blob` 2.3.1)
  - Purpose: Document and file uploads (PDFs, Excel, images, etc.)
  - Configuration: Automatic via Vercel deployment
  - Usage: All `/api/*/documents` and `/api/*/files` routes
  - Max size: 25MB (set in `next.config.ts` proxyClientMaxBodySize)

**Caching:**
- SWR (Stale-While-Revalidate)
  - Library: `swr` 2.4.1
  - Purpose: Client-side data fetching with automatic caching, deduplication, revalidation
  - Not an external service; built into frontend
  - Usage: All API data fetching in React components
  - Files: `src/lib/fetcher.ts` (fetch wrapper)

## Authentication & Identity

**Auth Provider:**
- Clerk 7.0.1
  - Implementation: Clerk Provider wraps entire app
  - Flow: Google OAuth → Clerk → auto-provisioned user + firm
  - Dev mode: Mock UserProvider with 8 pre-seeded users
  - Production: Real Clerk instance with webhook sync
  - User sync: Clerk webhook triggers user creation/deletion via `/api/webhooks/clerk`
  - Files: `src/components/providers/clerk-wrapper.tsx`, `src/middleware.ts`, `src/lib/auth.ts`

**Roles & Permissions:**
- Role-based: GP_ADMIN, GP_TEAM, LP_INDIVIDUAL, LP_ENTITY
- Enforcement: Partially implemented; not fully enforced on routes
- Files: `src/lib/permissions.ts`, `src/lib/permissions-types.ts`

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry, Rollbar, or similar configured)

**Logs:**
- Console logging: `console.log()` and `console.error()` throughout codebase
- No centralized logging service
- Examples: `[email]`, `[clerk-webhook]`, `[AI]` prefixes used for filtering

**Performance:**
- No APM configured (no New Relic, DataDog, etc.)

## CI/CD & Deployment

**Hosting:**
- Vercel (primary)
  - Auto-deploys from Git
  - Supports Prisma schema migration
  - Environment variables via Vercel dashboard
  - Alternative: Any Node.js-compatible platform (Docker, traditional servers)

**CI Pipeline:**
- Not detected
- Manual testing and deployment via Vercel

## Environment Configuration

**Required Environment Variables:**

| Variable | Purpose | Where |
|----------|---------|-------|
| `DATABASE_URL` | PostgreSQL connection | `prisma/schema.prisma`, Prisma client |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key | Client-side, `clerk-wrapper.tsx` |
| `CLERK_SECRET_KEY` | Clerk secret | Server-side auth |
| `CLERK_WEBHOOK_SECRET` | Webhook signature | `/api/webhooks/clerk` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in route | `app/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up route | `app/sign-up` |
| `NEXT_PUBLIC_APP_URL` | Full app domain | Email links, OAuth callbacks |

**Optional but Recommended:**

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` | AI screening/analysis (one required for AI features) |
| `PLAID_CLIENT_ID`, `PLAID_SECRET` | Banking data sync |
| `RESEND_API_KEY` | Email delivery |
| `SLACK_BOT_TOKEN`, `SLACK_IC_CHANNEL` | IC voting notifications |

**Secrets Location:**
- Local dev: `.env` file (auto-loaded by Next.js)
- Production: Vercel environment variables dashboard
- Encrypted keys: Stored in `AIConfiguration` table with AES-256-GCM encryption (if `AI_ENCRYPTION_KEY` set)

## Webhooks & Callbacks

**Incoming (Atlas receives):**
- Clerk user webhooks: `/api/webhooks/clerk`
  - Events: `user.created`, `user.deleted`
  - Signature verification: Svix library
  - Triggers: Firm + User auto-provisioning, user soft-delete

- DocuSign webhook: `/api/docusign/webhook`
  - Events: Document signing status updates
  - Status: Route exists; webhook configuration not finalized

**Outgoing (Atlas calls):**
- OAuth callbacks from third-party services:
  - Plaid: `/api/integrations/plaid/exchange-token`
  - QuickBooks: `/api/integrations/qbo/callback`
  - DocuSign: `/api/docusign/callback`
  - Asana, Notion, Google Calendar: `/api/integrations/{service}/callback`
  - These are OAuth redirect URIs, not webhooks

- Slack messaging:
  - Atlas posts to Slack (not a webhook callback)
  - See `postICReviewToSlack()` in `src/lib/slack.ts`

## Integration Management

**Integration Storage:**
- `IntegrationConnection` table: Stores OAuth tokens and connection metadata
  - Fields: `firmId`, `entityId`, `provider`, `accessToken`, `refreshToken`, `metadata`
  - API routes: `/api/integrations/connections` and `/api/integrations/connections/[id]`
  - UI: Integration settings page (location TBD)

**OAuth Flow Pattern:**
All OAuth integrations follow this pattern:
1. User clicks "Connect {Service}" → calls `/api/integrations/{service}/connect`
2. Redirects to service login
3. Service redirects back to `/api/integrations/{service}/callback` with authorization code
4. Exchange code for token, store in `IntegrationConnection`
5. Can now call service APIs with stored token

Files:
- `src/app/api/integrations/{service}/connect/route.ts` - Generate auth URL
- `src/app/api/integrations/{service}/callback/route.ts` - Handle OAuth response

---

*Integration audit: 2026-03-08*
