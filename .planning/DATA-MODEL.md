# Atlas — Data Model & API Reference

All 57 Prisma models and 73 API routes. See `prisma/schema.prisma` for full field definitions.

Last updated: 2026-03-05

---

## Key Enums

### Deal Workflow
- **DealStage**: `SCREENING`, `DUE_DILIGENCE`, `IC_REVIEW`, `CLOSING`, `CLOSED`, `DEAD`
- **DDWorkstreamStatus**: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETE`
- **TaskStatus**: `TODO`, `IN_PROGRESS`, `DONE`
- **ICQuestionStatus**: `OPEN`, `RESOLVED`, `DEFERRED`
- **ClosingChecklistStatus**: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETE`

### Asset & Investment
- **AssetClass**: `REAL_ESTATE`, `PUBLIC_SECURITIES`, `OPERATING_BUSINESS`, `INFRASTRUCTURE`, `COMMODITIES`, `DIVERSIFIED`, `NON_CORRELATED`, `CASH_AND_EQUIVALENTS`
- **CapitalInstrument**: `DEBT`, `EQUITY`
- **ParticipationStructure**: `DIRECT_GP`, `CO_INVEST_JV_PARTNERSHIP`, `LP_STAKE_SILENT_PARTNER`
- **AssetStatus**: `ACTIVE`, `EXITED`, `WRITTEN_OFF`

### Entity
- **EntityType**: `MAIN_FUND`, `SIDECAR`, `SPV`, `CO_INVEST_VEHICLE`, `GP_ENTITY`, `HOLDING_COMPANY`
- **EntityStatus**: `ACTIVE`, `WINDING_DOWN`, `DISSOLVED`
- **FormationStatus**: `NOT_STARTED`, `FORMING`, `FORMED`, `REGISTERED`

### Capital Flows
- **CapitalCallStatus**: `DRAFT`, `ISSUED`, `FUNDED`, `PARTIALLY_FUNDED`, `OVERDUE`
- **DistributionStatus**: `DRAFT`, `APPROVED`, `PAID`
- **TransactionType**: `CAPITAL_CALL`, `DISTRIBUTION`, `INCOME`, `EXPENSE`, `FEE`, `TRANSFER`, `INVESTMENT`, `EXIT`

### Accounting
- **AccountingProvider**: `QBO`, `XERO`
- **SyncStatus**: `CONNECTED`, `DISCONNECTED`, `ERROR`

### Users
- **UserRole**: `GP_ADMIN`, `GP_TEAM`, `SERVICE_PROVIDER`, `LP_INVESTOR`

### Other
- **ValuationMethod**: `COMPARABLE_MULTIPLES`, `LAST_ROUND`, `DCF`, `APPRAISAL`, `GP_REPORTED_NAV`, `COST`
- **DocumentCategory**: `BOARD`, `FINANCIAL`, `LEGAL`, `GOVERNANCE`, `VALUATION`, `STATEMENT`, `TAX`, `REPORT`, `NOTICE`, `OTHER`
- **NotificationType**: `STAGE_CHANGE`, `IC_VOTE`, `DOCUMENT_UPLOAD`, `CAPITAL_CALL`, `TASK_ASSIGNED`, `CLOSING_UPDATE`, `GENERAL`

---

## Models by Domain

### Core (Multi-Tenancy & Users)

| Model | Key Fields | Key Relations |
|-------|-----------|---------------|
| **Firm** | name, legalName | hasMany: Entity, User, Deal, Company, Contact; hasOne: AIConfiguration |
| **User** | firmId, email, name, role, initials, entityAccess[], slackUserId | belongsTo: Firm; hasMany: Task, ICVoteRecord, Note, ICQuestion, Deal (lead), Notification |
| **AIConfiguration** | firmId (unique), provider, model, apiKey, thresholdScore | belongsTo: Firm (one-to-one) |
| **AIPromptTemplate** | firmId, type, module, name, content, isActive | belongsTo: Firm |

### Entity & Fund Structure

| Model | Key Fields | Key Relations |
|-------|-----------|---------------|
| **Entity** | firmId, name, entityType, parentEntityId, status, targetSize, totalCommitments | belongsTo: Firm; hasMany: CapitalCall, Distribution, Document, NAVComputation; hasOne: AccountingConnection |
| **AccountingConnection** | entityId, provider, syncStatus, lastSyncAt | belongsTo: Entity (one-to-one); hasMany: AccountMapping |
| **AccountMapping** | connectionId, atlasAccountType, providerAccountId | belongsTo: AccountingConnection |

### Asset Management

| Model | Key Fields | Key Relations | Data Status |
|-------|-----------|---------------|-------------|
| **Asset** | name, assetClass, capitalInstrument, participationStructure, costBasis, fairValue, moic, irr | hasMany: AssetEntityAllocation, Lease, CreditAgreement, Valuation, Task, Document; hasOne: EquityDetails, CreditDetails, RealEstateDetails, FundLPDetails | Real + seeded |
| **AssetEntityAllocation** | assetId, entityId, allocationPercent, costBasis | belongsTo: Asset, Entity (junction table) | Real |
| **AssetEquityDetails** | assetId, instrument, ownership, revenue, ebitda | belongsTo: Asset (one-to-one) | Seeded |
| **AssetCreditDetails** | assetId, instrument, principal, rate, maturity, ltv | belongsTo: Asset (one-to-one) | Seeded |
| **AssetRealEstateDetails** | assetId, propertyType, sqft, occupancy, noi, capRate | belongsTo: Asset (one-to-one) | Seeded |
| **AssetFundLPDetails** | assetId, gpName, commitment, calledAmount, distributions | belongsTo: Asset (one-to-one) | Seeded |

### Contract Details (Leases & Credit)

| Model | Key Fields | Key Relations |
|-------|-----------|---------------|
| **Lease** | assetId, tenantName, leaseType, baseRentMonthly, leaseStartDate, leaseEndDate, renewalOptions (JSON) | belongsTo: Asset |
| **CreditAgreement** | assetId, borrowerName, agreementType, originalPrincipal, interestRateType, maturityDate, subordination | belongsTo: Asset; hasMany: Covenant, CreditPayment |
| **Covenant** | agreementId, name, covenantType, thresholdValue, currentStatus | belongsTo: CreditAgreement |
| **CreditPayment** | agreementId, date, paymentType, amount, status | belongsTo: CreditAgreement |

### Investors & Capital Structure

| Model | Key Fields | Key Relations |
|-------|-----------|---------------|
| **Investor** | name, investorType, kycStatus, totalCommitted, userId?, contactId?, companyId? | hasMany: Commitment, SideLetter, CapitalCallLineItem, DistributionLineItem, CapitalAccount |
| **Commitment** | investorId, entityId, amount, calledAmount | belongsTo: Investor, Entity (unique per pair) |
| **SideLetter** | investorId, entityId, terms | belongsTo: Investor, Entity |
| **InvestorNotificationPreference** | investorId, preferredChannel, digestPreference | belongsTo: Investor (one-to-one) |

### Capital Flows & Accounting

| Model | Key Fields | Key Relations |
|-------|-----------|---------------|
| **CapitalCall** | entityId, callNumber, callDate, dueDate, amount, status | belongsTo: Entity; hasMany: CapitalCallLineItem |
| **CapitalCallLineItem** | capitalCallId, investorId, amount, status, paidDate | belongsTo: CapitalCall, Investor |
| **DistributionEvent** | entityId, distributionDate, grossAmount, netToLPs, status | belongsTo: Entity; hasMany: DistributionLineItem |
| **DistributionLineItem** | distributionId, investorId, grossAmount, netAmount | belongsTo: DistributionEvent, Investor |
| **Transaction** | entityId, transactionType, amount, date, description | belongsTo: Entity |
| **IncomeEvent** | assetId?, entityId, incomeType, amount, date | belongsTo: Asset, Entity |

### Valuation & NAV

| Model | Key Fields | Key Relations | Data Status |
|-------|-----------|---------------|-------------|
| **Valuation** | assetId, valuationDate, method, fairValue, status (DRAFT/APPROVED) | belongsTo: Asset | Real (user-entered) |
| **NAVComputation** | entityId, periodDate, costBasisNAV, economicNAV, details (JSON) | belongsTo: Entity (unique per entity+period) | **Seeded — no real computation** |

### Fund Mechanics

| Model | Key Fields | Key Relations | Data Status |
|-------|-----------|---------------|-------------|
| **WaterfallTemplate** | name, description | hasMany: WaterfallTier, WaterfallCalculation | Real (UI works) |
| **WaterfallTier** | templateId, tierOrder, name, splitLP, splitGP, hurdleRate | belongsTo: WaterfallTemplate | Real (UI works) |
| **WaterfallCalculation** | templateId, periodDate, results (JSON) | belongsTo: WaterfallTemplate | **Code exists** (`computations/waterfall.ts`) — needs verification |
| **FeeCalculation** | entityId, periodDate, managementFee, carriedInterest | belongsTo: Entity | **Seeded — no computation logic found** |
| **CapitalAccount** | investorId, entityId, periodDate, beginningBalance, endingBalance | belongsTo: Investor, Entity (unique per triple) | **Code exists** (`computations/capital-accounts.ts`) — needs verification |

### Deal Pipeline & IC Process

| Model | Key Fields | Key Relations |
|-------|-----------|---------------|
| **Deal** | firmId, name, assetClass, capitalInstrument, stage, dealLeadId, aiScore | hasMany: DDWorkstream, DealActivity, Task, Document; hasOne: ICProcess, AIScreeningResult |
| **DDWorkstream** | dealId, name, analysisType, analysisResult (JSON), status | belongsTo: Deal; hasMany: DDTask |
| **DDTask** | workstreamId, title, status, assignee, priority | belongsTo: DDWorkstream |
| **AIScreeningResult** | dealId, score, summary, strengths (JSON), risks (JSON), memo (JSON) | belongsTo: Deal (one-to-one) |
| **ICProcess** | dealId, slackChannel, status, finalDecision, decidedById | belongsTo: Deal (one-to-one); hasMany: ICVoteRecord |
| **ICVoteRecord** | icProcessId, userId, vote, notes | belongsTo: ICProcess, User |
| **ICQuestion** | dealId, authorId, content, status | belongsTo: Deal, User; hasMany: ICQuestionReply |
| **ICQuestionReply** | questionId, authorId, content | belongsTo: ICQuestion, User |
| **ClosingChecklist** | dealId, title, status, assigneeId, dueDate | belongsTo: Deal, User |
| **DealActivity** | dealId, activityType, description, metadata (JSON) | belongsTo: Deal |
| **DDCategoryTemplate** | firmId?, name, scope, defaultInstructions, isDefault | belongsTo: Firm (optional) |

### Documents, Notes & Meetings

| Model | Key Fields | Key Relations |
|-------|-----------|---------------|
| **Document** | name, category, fileUrl, mimeType, extractedText, assetId?, entityId?, dealId?, investorId? | belongsTo: Asset, Entity, Deal, Investor (all optional) |
| **Note** | content, authorId, assetId?, dealId?, entityId?, investorId? | belongsTo: User, Asset, Deal, Entity, Investor (all optional) |
| **Meeting** | title, meetingDate, source (FIREFLIES/MANUAL/ZOOM/TEAMS), transcript, summary | belongsTo: Asset, Deal, Entity (all optional) |
| **ActivityEvent** | assetId, description, eventType | belongsTo: Asset |

### Tasks & Notifications

| Model | Key Fields | Key Relations |
|-------|-----------|---------------|
| **Task** | title, status, priority, assigneeId, contextType, contextId, assetId?, dealId?, entityId? | belongsTo: User, Asset, Deal, Entity (all optional) |
| **Notification** | userId, type, subject, body, isRead, channel | belongsTo: User |

### E-Signature & Fundraising

| Model | Key Fields | Key Relations |
|-------|-----------|---------------|
| **ESignaturePackage** | title, status, provider, entityId?, dealId?, signers (JSON) | belongsTo: Entity, Deal |
| **FundraisingRound** | entityId, name, targetAmount, raisedAmount, status | belongsTo: Entity; hasMany: FundraisingProspect |
| **FundraisingProspect** | roundId, investorName, targetAmount, status | belongsTo: FundraisingRound |

### CRM

| Model | Key Fields | Key Relations |
|-------|-----------|---------------|
| **Company** | firmId, name, type (GP/LP/COUNTERPARTY/etc.) | hasMany: Contact; hasOne: Investor |
| **Contact** | firmId, firstName, lastName, email, companyId?, type | belongsTo: Company; hasOne: Investor |

---

## Key Patterns

### Multi-Tenancy
All models with `firmId` are tenant-isolated. Always filter by `firmId` in queries. Service providers use `User.entityAccess[]` for scoped access.

### Complex Ownership
`AssetEntityAllocation` (junction table) enables single asset owned by multiple entities with separate allocation percentages and cost basis per entity.

### JSON Metadata Fields
Many models store complex data as JSON: `Entity.regulatoryFilings`, `Lease.rentEscalation`, `CreditAgreement.collateral`, `AIScreeningResult.memo`, `NAVComputation.details`, `DealActivity.metadata`, `ESignaturePackage.signers`.

### No Soft Deletes
No explicit soft delete fields. Documents stay in DB permanently.

### Polymorphic Relations
`Document`, `Note`, `Meeting`, and `Task` all use optional foreign keys to link to multiple parent types (asset, deal, entity, investor).

---

## REST API Routes

### Deals (19 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/deals` | List all deals (query: `firmId`) |
| POST | `/api/deals` | Create deal (body: `name, assetClass, capitalInstrument, dealLeadId, entityId`) |
| GET | `/api/deals/[id]` | Get deal with full context (workstreams, activities, notes, IC process) |
| PUT | `/api/deals/[id]` | Update deal fields |
| PATCH | `/api/deals/[id]` | Kill, close, or advance deal (body: `action`) |
| POST | `/api/deals/[id]/screen` | Create DD workstreams from templates |
| GET | `/api/deals/[id]/activities` | Get merged timeline |
| POST | `/api/deals/[id]/activities` | Log activity |
| GET/POST | `/api/deals/[id]/documents` | List/upload deal documents |
| GET/POST | `/api/deals/[id]/notes` | Get/create deal notes |
| POST/PATCH/DELETE | `/api/deals/[id]/tasks` | DD task CRUD |
| POST/PATCH/DELETE | `/api/deals/[id]/workstreams` | Workstream CRUD |
| GET/POST/PATCH | `/api/deals/[id]/ic-questions` | IC Q&A threads |
| POST | `/api/deals/[id]/ic-questions/[questionId]/replies` | Reply to IC question |
| POST | `/api/deals/[id]/ic-decision` | Record IC decision |
| POST | `/api/deals/[id]/send-to-ic` | Advance to IC_REVIEW |
| POST | `/api/deals/[id]/dd-analyze` | Run AI analysis |
| GET/POST/PATCH | `/api/deals/[id]/closing` | Closing checklist |
| POST | `/api/deals/[id]/apply-template` | Apply DD template |

### Assets (8 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | List assets (query: `assetClass?, status?, firmId?`) |
| GET | `/api/assets/[id]` | Get asset with all relations |
| PUT | `/api/assets/[id]` | Update asset |
| GET/POST | `/api/assets/[id]/documents` | List/upload documents |
| POST | `/api/assets/[id]/valuations` | Create valuation |
| POST | `/api/assets/[id]/income` | Record income |
| POST | `/api/assets/[id]/tasks` | Create task |

### Entities (5 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/entities` | List entities with capital/distribution metrics |
| POST | `/api/entities` | Create entity |
| GET | `/api/entities/[id]` | Get entity with full context |
| PUT | `/api/entities/[id]` | Update entity |
| PATCH | `/api/entities/[id]` | Mark formed or update status |

### Investors (6 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/investors` | List investors with commitments |
| POST | `/api/investors` | Create investor |
| GET | `/api/investors/[id]` | Get investor with full context |
| PUT | `/api/investors/[id]` | Update investor |
| GET | `/api/investors/[id]/capital-account` | Get capital accounts by period |
| GET | `/api/investors/[id]/documents` | Get investor documents |

### LP Portal (4 endpoints) — may show seeded or computed values (needs verification)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lp/[investorId]/dashboard` | LP dashboard (TVPI, DPI, RVPI, IRR) |
| GET | `/api/lp/[investorId]/portfolio` | LP portfolio (pro-rata asset allocations) |
| GET | `/api/lp/[investorId]/documents` | LP-accessible documents |
| GET | `/api/lp/[investorId]/activity` | Capital calls + distributions timeline |

### Accounting & Capital (7 endpoints) — accounting UI-only, capital endpoints functional

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounting/connections` | Get QBO sync status for all entities |
| PATCH | `/api/accounting/connections` | Update sync status |
| GET | `/api/capital-calls` | List capital calls with line items |
| POST | `/api/capital-calls` | Create capital call |
| GET | `/api/distributions` | List distributions |
| POST | `/api/distributions` | Create distribution |
| GET | `/api/nav/[entityId]` | Get entity NAV (computation code exists — needs verification) |

### Documents, Tasks, Meetings, Notifications, Settings, AI, Directory, Waterfall, Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/documents` | List/upload documents |
| GET | `/api/documents/download/[filename]` | Download/preview file |
| GET/POST/PATCH | `/api/tasks` | Task CRUD |
| GET/POST | `/api/meetings` | Meeting CRUD |
| GET/PATCH | `/api/notifications` `/api/notifications/[id]` | Notifications |
| POST | `/api/ai/screening` | AI screening preview |
| POST | `/api/ai/search` | AI-powered search |
| POST | `/api/ai/agents` | Route to AI agent |
| GET/PUT | `/api/settings/ai-config` | AI configuration |
| GET/PUT | `/api/settings/ai-prompts` | AI prompt templates |
| GET/POST/PUT/DELETE | `/api/dd-categories` | DD category templates |
| GET/POST | `/api/contacts` | Contact CRUD |
| GET/POST | `/api/companies` | Company CRUD |
| GET/POST | `/api/waterfall-templates` | Waterfall templates |
| POST/PUT | `/api/waterfall-templates/[id]/tiers` | Waterfall tiers |
| GET | `/api/users` | List users |
| GET | `/api/firms` | List firms |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/dashboard/asset-allocation` | Asset allocation chart data |
| GET | `/api/commands/search` | Global search |
| GET | `/api/side-letters` | List side letters |
| GET/POST | `/api/esignature` | E-signature packages |
| GET/POST | `/api/fundraising` | Fundraising rounds |
