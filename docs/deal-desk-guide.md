# Deal Desk Guide

Reference for the deal pipeline workflow, due diligence, and IC process in Atlas.

---

## Deal Stage Machine

```
SCREENING → DUE_DILIGENCE → IC_REVIEW → CLOSING → CLOSED (creates Asset)
                                ↓
                     REJECTED or SEND_BACK
Any stage → DEAD (kill deal)
```

All transitions log `DealActivity` + notifications. Logic in `src/lib/deal-stage-engine.ts`.

---

## Create Deal Workflow

### Path 1: "Create Deal" (manual screening later)
1. Wizard creates deal + uploads documents + creates workstreams (scaffolding) → stays in SCREENING
2. User lands on deal page, reviews everything, uploads more docs
3. When ready: clicks "Run AI Screening" on Overview tab
4. Stage advances to DUE_DILIGENCE → AI runs all analyses → IC memo generated

### Path 2: "Create & Screen" (one-click)
1. Wizard creates deal + uploads docs + creates workstreams + advances to DUE_DILIGENCE
2. User lands on deal page → AI auto-triggers (detects fresh DUE_DILIGENCE with no analyses)
3. Progress bar shows: "Analyzing Financial DD... (2/6 complete)"
4. All analyses + IC memo generated automatically

### How workstreams are created
The `/api/deals/[id]/screen` route creates workstreams from DD category templates:
- Accepts `{ advanceStage: false }` to scaffold workstreams without advancing
- Fetches `DDCategoryTemplate` records matching the deal's asset class
- Creates `DDWorkstream` for each template (skips duplicates)
- Falls back to Financial DD + Legal DD + Operational DD if no templates exist

---

## DD Workstream Templates by Asset Class

Templates use a `scope` field to match deals:

| Scope | Workstreams | Applies to |
|-------|-------------|------------|
| UNIVERSAL | Financial DD, Legal DD, Market DD, Tax DD, Operational DD, ESG DD | All deals |
| REAL_ESTATE | Collateral DD, Tenant & Lease DD | Real estate deals |
| INFRASTRUCTURE | Engineering DD, Regulatory & Permitting DD | Infrastructure deals |
| OPERATING_BUSINESS | Customer DD, Technology DD | Operating business deals |
| DEBT | Credit DD | Any deal with `capitalInstrument === "DEBT"` |

A deal's workstreams = UNIVERSAL + asset-class-specific + DEBT (if applicable).

Examples:
- Real Estate + Equity → 6 UNIVERSAL + 2 REAL_ESTATE = 8 workstreams
- Real Estate + Debt → 6 UNIVERSAL + 2 REAL_ESTATE + 1 DEBT = 9 workstreams
- Infrastructure + Equity → 6 UNIVERSAL + 2 INFRASTRUCTURE = 8 workstreams

---

## AI Analysis Pipeline

Each workstream has an `analysisType` (e.g., `DD_FINANCIAL`, `DD_LEGAL`). The AI pipeline:

1. **Per-workstream analysis**: POST `/api/deals/[id]/dd-analyze` with `type` = workstream's `analysisType`
   - Reads deal context + uploaded documents
   - Generates analysis findings + tasks
   - Saves results to `DDWorkstream.analysisResult` (JSON)
   - Creates `DDTask` records for identified items

2. **IC Memo** (aggregation): POST `/api/deals/[id]/dd-analyze` with `type: "IC_MEMO"`
   - Reads all completed workstream analyses
   - Generates unified IC memo
   - Saves to `AIScreeningResult.memo` (JSON)

### Analysis Types (from `CATEGORY_NAME_TO_TYPE` in schemas.ts)
```
Financial DD → DD_FINANCIAL     Legal DD → DD_LEGAL
Market DD → DD_MARKET           Tax DD → DD_TAX
Operational DD → DD_OPERATIONAL  ESG DD → DD_ESG
Collateral DD → DD_COLLATERAL   Tenant & Lease DD → DD_TENANT_LEASE
Customer DD → DD_CUSTOMER       Technology DD → DD_TECHNOLOGY
Regulatory DD → DD_REGULATORY   Engineering DD → DD_ENGINEERING
Credit DD → DD_CREDIT           Commercial DD → DD_COMMERCIAL
Management DD → DD_MANAGEMENT
```

---

## IC Process

When a deal reaches IC_REVIEW:

1. **IC Process** created (`ICProcess` model) — linked to Slack channel
2. **IC Questions** can be posted by any team member
3. **IC Votes** recorded per member (via Slack or UI)
4. **IC Decision** recorded: APPROVED → CLOSING, REJECTED → stays, SEND_BACK → DUE_DILIGENCE

Key API routes:
- `POST /api/deals/[id]/send-to-ic` — advance to IC_REVIEW
- `POST /api/deals/[id]/ic-decision` — record final decision
- IC questions and replies via `/api/deals/[id]/ic-questions`

---

## Closing Process

When a deal reaches CLOSING:

1. **Closing checklist** initialized with default items
2. Items tracked: NOT_STARTED → IN_PROGRESS → COMPLETE
3. Each item has assignee and due date
4. When all items complete: deal can be marked CLOSED (creates Asset)

Key API routes:
- `GET/POST/PATCH /api/deals/[id]/closing`
- `PATCH /api/deals/[id]` with `action: "CLOSE"` to finalize

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/deal-stage-engine.ts` | Stage transition logic and validation |
| `src/lib/schemas.ts` | `CATEGORY_NAME_TO_TYPE` mapping, Zod schemas, taxonomy constants |
| `src/app/api/deals/[id]/screen/route.ts` | Workstream creation from templates |
| `src/app/api/deals/[id]/dd-analyze/route.ts` | AI analysis execution |
| `src/components/features/deals/deal-overview-tab.tsx` | Overview tab with IC memo, AI screening CTA, progress |
| `src/components/features/deals/deal-dd-tab.tsx` | DD workstreams and tasks UI |
| `src/components/features/deals/create-deal-wizard.tsx` | Multi-step deal creation |
| `prisma/schema.prisma` | Deal, DDWorkstream, DDTask, ICProcess, AIScreeningResult models |

---

## Key Data Models

- **Deal** — stage, assetClass, capitalInstrument, dealLeadId, entityId, aiScore
- **DDWorkstream** — name, analysisType, analysisResult (JSON), status, tasks
- **DDTask** — title, status (TODO/IN_PROGRESS/DONE), assignee, priority
- **AIScreeningResult** — score, summary, strengths, risks, memo (JSON), previousVersions
- **ICProcess** — slackChannel, status, finalDecision, votes
- **ICVoteRecord** — userId, vote, notes
- **ClosingChecklist** — title, status, assigneeId, dueDate
- **DealActivity** — activityType, description, metadata (JSON)
