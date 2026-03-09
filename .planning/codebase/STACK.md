# Technology Stack

**Analysis Date:** 2026-03-08

## Languages

**Primary:**
- TypeScript 5 - Used throughout all source code (`.ts` and `.tsx` files)

**Secondary:**
- JavaScript (Node.js scripts) - Build scripts, Prisma seed utilities in `prisma/`

## Runtime

**Environment:**
- Node.js (version not pinned in repo, use latest LTS)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present and committed)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework with App Router
- React 19.2.3 - UI library
- Prisma 7.4.2 - ORM for PostgreSQL

**Styling:**
- Tailwind CSS 4 - Utility-first CSS framework
- PostCSS 4 - CSS processing via `@tailwindcss/postcss`

**Testing:**
- Vitest 4.0.18 - Unit/integration test runner
- Configuration: `vitest.config.ts` (Node environment, globals enabled)

**Build/Dev:**
- tsx 4.21.0 - TypeScript execution for Node scripts
- ESLint 9 - Code linting via `eslint-config-next` (core-web-vitals + TypeScript)

## Key Dependencies

**Critical:**
- `@prisma/client` 7.4.2 - PostgreSQL database client (singleton at `src/lib/prisma.ts`)
- `@prisma/adapter-pg` 7.4.2 - PostgreSQL driver for Prisma
- `pg` 8.19.0 - Native PostgreSQL client (used by Prisma)

**Authentication & Webhooks:**
- `@clerk/nextjs` 7.0.1 - SSO/identity provider (Google OAuth)
- `svix` 1.86.0 - Webhook signing and verification (Clerk webhooks)

**AI/LLM:**
- `@anthropic-ai/sdk` 0.78.0 - Anthropic Claude API client
- `openai` 6.25.0 - OpenAI GPT API client
- Both supported; switching via `AI_PROVIDER` env var and `createAIClient()` in `src/lib/ai-config.ts`

**Financial Data:**
- `plaid` 41.4.0 - Banking data aggregation (accounts, transactions)
- `intuit-oauth` 4.2.2 - QuickBooks Online OAuth flow (not yet integrated with API calls)

**Email:**
- `resend` 6.9.3 - Transactional email service (RESEND_API_KEY)

**Data Export:**
- `xlsx` 0.18.5 - Excel file generation
- `pdf-parse` 2.4.5 - PDF text extraction (Node.js only, configured as serverExternalPackage)
- `@react-pdf/renderer` 4.3.2 - PDF generation in React

**Utilities:**
- `zod` 4.3.6 - Schema validation and type inference
- `dotenv` 17.3.1 - Environment variable loading
- `jsonrepair` 3.13.2 - JSON repair/parsing
- `recharts` 3.7.0 - React charting library
- `lucide-react` 0.575.0 - Icon library
- `swr` 2.4.1 - Data fetching with caching and revalidation

**File Storage:**
- `@vercel/blob` 2.3.1 - Vercel's blob storage (handles document uploads)

## Configuration

**Environment Variables (`.env` required):**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key (client-side)
- `CLERK_SECRET_KEY` - Clerk secret (server-side)
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` - Clerk sign-in page
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` - Clerk sign-up page
- `CLERK_WEBHOOK_SECRET` - Webhook signing secret from Clerk
- `NEXT_PUBLIC_APP_URL` - Full app domain (required for email links in production)

**Optional AI Configuration:**
- `OPENAI_API_KEY` - OpenAI API key (if using GPT models)
- `ANTHROPIC_API_KEY` - Anthropic API key (if using Claude)
- `AI_PROVIDER` - Override: "openai" or "anthropic" (auto-detected if not set)
- `AI_MODEL` - Override model name (defaults: gpt-4o or claude-sonnet-4-20250514)
- `AI_ENCRYPTION_KEY` - 64-char hex key for encrypting API keys in database (optional; dev mode stores in plaintext)

**Optional Integration Credentials:**
- `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` - Plaid banking data (sandbox or production)
- `QBO_ENVIRONMENT` - QuickBooks Online (production or sandbox)
- `DOCUSIGN_INTEGRATION_KEY`, `DOCUSIGN_SECRET_KEY`, `DOCUSIGN_OAUTH_BASE` - DocuSign eSignature
- `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET` - Notion workspace integration
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google Calendar OAuth
- `ASANA_CLIENT_ID`, `ASANA_CLIENT_SECRET` - Asana project management
- `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_IC_CHANNEL` - Slack notifications
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` - SMS via Twilio
- `RESEND_API_KEY` - Resend email service
- `EMAIL_FROM_ADDRESS` - Sender email for transactional emails

**Build Configuration:**
- `tsconfig.json` - TypeScript strict mode enabled
  - `target: ES2017`
  - `module: esnext`
  - `moduleResolution: bundler`
  - `strict: true`
  - Path alias: `@/*` maps to `./src/*`
- `next.config.ts` - Next.js settings:
  - `serverExternalPackages: ["xlsx", "pdf-parse"]` - Keep PDF/Excel on server
  - `proxyClientMaxBodySize: "25mb"` - Allow 25MB file uploads
- `eslint.config.mjs` - ESLint config extending Next.js core-web-vitals + TypeScript rules
- `postcss.config.mjs` - PostCSS with Tailwind CSS v4 plugin

## Platform Requirements

**Development:**
- Node.js (latest LTS)
- PostgreSQL 13+ (local or cloud instance)
- npm 10+
- Git

**Production:**
- Node.js (latest LTS)
- PostgreSQL (cloud hosted, e.g., AWS RDS, Azure Database for PostgreSQL)
- Deployed on: Vercel (preferred, has build integration with Next.js)
  - Alternative: Any Node.js-compatible hosting (Docker, traditional servers)

## Database

**Provider:** PostgreSQL (Prisma ORM)

**Adapter:** `@prisma/adapter-pg` with native `pg` driver

**Connection Management:**
- Singleton instance at `src/lib/prisma.ts`
- Never instantiate PrismaClient elsewhere
- Schema: `prisma/schema.prisma` (57 Prisma models)

**Seed Data:**
- Command: `npx prisma db seed`
- Entry: `prisma/seed.ts`
- Pre-populates demo data for local development

---

*Stack analysis: 2026-03-08*
