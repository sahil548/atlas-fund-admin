# API Route Guide

All REST API endpoints in Atlas, organized by domain. ~64 route files under `src/app/api/`.

---

## Deals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/deals` | List all deals (query: `firmId`) |
| POST | `/api/deals` | Create deal (body: `name, assetClass, capitalInstrument, dealLeadId, entityId`) |
| GET | `/api/deals/[id]` | Get deal with full context (workstreams, activities, notes, IC process) |
| PUT | `/api/deals/[id]` | Update deal fields |
| PATCH | `/api/deals/[id]` | Kill, close, or advance deal (body: `action: "KILL" | "CLOSE" | "ADVANCE_TO_CLOSING"`) |
| POST | `/api/deals/[id]/screen` | Create DD workstreams from templates (body: `advanceStage?: boolean`) |
| GET | `/api/deals/[id]/activities` | Get merged timeline (activities + meetings) |
| POST | `/api/deals/[id]/activities` | Log activity (body: `activityType, description, metadata?`) |
| GET | `/api/deals/[id]/documents` | List deal documents |
| POST | `/api/deals/[id]/documents` | Upload document (FormData: `file, name, category`) |
| GET | `/api/deals/[id]/notes` | Get deal notes |
| POST | `/api/deals/[id]/notes` | Create note (body: `content, authorId`) |
| POST | `/api/deals/[id]/tasks` | Create DD task (body: `workstreamId, title, description, assignee, dueDate, priority`) |
| PATCH | `/api/deals/[id]/tasks` | Update DD task (body: `id, title?, status?, assignee?, dueDate?`) |
| DELETE | `/api/deals/[id]/tasks` | Delete DD task (body: `id`) |
| POST | `/api/deals/[id]/workstreams` | Create workstream |
| PATCH | `/api/deals/[id]/workstreams` | Update workstream |
| DELETE | `/api/deals/[id]/workstreams` | Delete workstream and its tasks (query: `id`) |
| GET | `/api/deals/[id]/ic-questions` | List IC questions with replies |
| POST | `/api/deals/[id]/ic-questions` | Create IC question |
| PATCH | `/api/deals/[id]/ic-questions` | Update IC question status |
| POST | `/api/deals/[id]/ic-questions/[questionId]/replies` | Reply to IC question |
| POST | `/api/deals/[id]/ic-decision` | Record IC decision (body: `decision, userId, notes?`) |
| POST | `/api/deals/[id]/send-to-ic` | Advance to IC_REVIEW (body: `force?: boolean`) |
| POST | `/api/deals/[id]/dd-analyze` | Run AI analysis (body: `type: "DD_FINANCIAL" | "IC_MEMO" | etc., rerun?: boolean`) |
| GET | `/api/deals/[id]/closing` | List closing checklist |
| POST | `/api/deals/[id]/closing` | Initialize or add checklist item |
| PATCH | `/api/deals/[id]/closing` | Update checklist item |
| POST | `/api/deals/[id]/apply-template` | Apply DD template |

## Assets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | List assets (query: `assetClass?, status?, firmId?`) |
| GET | `/api/assets/[id]` | Get asset with allocations, valuations, tasks, documents, leases, credit agreements |
| PUT | `/api/assets/[id]` | Update asset |
| GET | `/api/assets/[id]/documents` | List asset documents |
| POST | `/api/assets/[id]/documents` | Upload document (FormData) |
| POST | `/api/assets/[id]/valuations` | Create valuation (body: `valuationDate, method, fairValue`) |
| POST | `/api/assets/[id]/income` | Record income (body: `date, amount, incomeType`) |
| POST | `/api/assets/[id]/tasks` | Create task |

## Entities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/entities` | List entities with capital/distribution metrics |
| POST | `/api/entities` | Create entity (body: `name, entityType, status, startFormation?`) |
| GET | `/api/entities/[id]` | Get entity with commitments, allocations, NAV, distributions, documents |
| PUT | `/api/entities/[id]` | Update entity |
| PATCH | `/api/entities/[id]` | Mark formed or update status |

## Investors / LPs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/investors` | List investors with commitments |
| POST | `/api/investors` | Create investor |
| GET | `/api/investors/[id]` | Get investor with commitments, capital accounts, documents |
| PUT | `/api/investors/[id]` | Update investor |
| GET | `/api/investors/[id]/capital-account` | Get capital accounts by period |
| GET | `/api/investors/[id]/documents` | Get investor documents |

### LP Portal Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lp/[investorId]/dashboard` | LP dashboard (TVPI, DPI, RVPI, IRR) |
| GET | `/api/lp/[investorId]/portfolio` | LP portfolio (pro-rata asset allocations) |
| GET | `/api/lp/[investorId]/documents` | LP-accessible documents |
| GET | `/api/lp/[investorId]/activity` | Capital calls + distributions timeline |

## Accounting & Capital

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounting/connections` | Get QBO sync status for all entities |
| PATCH | `/api/accounting/connections` | Update sync status |
| GET | `/api/capital-calls` | List capital calls with line items |
| POST | `/api/capital-calls` | Create capital call |
| GET | `/api/distributions` | List distributions |
| POST | `/api/distributions` | Create distribution |
| GET | `/api/nav/[entityId]` | Get entity NAV (cost basis + fair value layers) |

## Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List all documents (query: `firmId?`) |
| POST | `/api/documents` | Upload document (FormData + optional `assetId, entityId, dealId`) |
| GET | `/api/documents/download/[filename]` | Download/preview file (query: `preview?=true`) |

## Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (query: `contextType?, contextId?, assigneeId?, status?, dealId?, entityId?`) |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks` | Update task |

## AI / Screening

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/screening` | Standalone AI screening preview |
| POST | `/api/ai/search` | AI-powered search + analysis |
| POST | `/api/ai/agents` | Route query to appropriate AI agent |

## Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings/ai-config` | Get AI configuration (apiKey masked) |
| PUT | `/api/settings/ai-config` | Update AI configuration |
| GET | `/api/settings/ai-prompts` | Get AI prompt templates |
| PUT | `/api/settings/ai-prompts` | Upsert prompt template |

## DD Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dd-categories` | Get DD category templates |
| POST | `/api/dd-categories` | Create DD category |
| PUT | `/api/dd-categories` | Update DD category |
| DELETE | `/api/dd-categories` | Delete DD category |

## Directory & Contacts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contacts` | List contacts (query: `firmId?, companyId?, type?`) |
| POST | `/api/contacts` | Create contact |
| GET | `/api/companies` | List companies (query: `firmId?, type?`) |
| POST | `/api/companies` | Create company |

## Meetings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meetings` | List meetings with deal/asset/entity context |
| POST | `/api/meetings` | Create meeting |

## Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get notifications (query: `userId`) |
| PATCH | `/api/notifications/[id]` | Mark read (body: `action: "MARK_READ" | "MARK_ALL_READ"`) |

## Waterfall

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/waterfall-templates` | List waterfall templates with tiers |
| POST | `/api/waterfall-templates` | Create template |
| POST | `/api/waterfall-templates/[id]/tiers` | Create tier |
| PUT | `/api/waterfall-templates/[id]/tiers` | Update tier |

## Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users (query: `firmId?`) |
| GET | `/api/firms` | List firms |
| GET | `/api/dashboard/stats` | Dashboard statistics (AUM, deals, LP summary) |
| GET | `/api/dashboard/asset-allocation` | Asset allocation chart data |
| GET | `/api/commands/search` | Global search across 9 models (query: `q, firmId?`) |
| GET | `/api/side-letters` | List side letters |
| GET | `/api/esignature` | List e-signature packages |
| POST | `/api/esignature` | Create e-signature package |
| GET | `/api/fundraising` | List fundraising rounds |
| POST | `/api/fundraising` | Create fundraising round |
