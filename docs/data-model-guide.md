# Data Model Guide

All 56 Prisma models organized by domain. See `prisma/schema.prisma` for full field definitions.

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

| Model | Key Fields | Key Relations |
|-------|-----------|---------------|
| **Asset** | name, assetClass, capitalInstrument, participationStructure, costBasis, fairValue, moic, irr | hasMany: AssetEntityAllocation, Lease, CreditAgreement, Valuation, Task, Document; hasOne: EquityDetails, CreditDetails, RealEstateDetails, FundLPDetails |
| **AssetEntityAllocation** | assetId, entityId, allocationPercent, costBasis | belongsTo: Asset, Entity (junction table) |
| **AssetEquityDetails** | assetId, instrument, ownership, revenue, ebitda | belongsTo: Asset (one-to-one) |
| **AssetCreditDetails** | assetId, instrument, principal, rate, maturity, ltv | belongsTo: Asset (one-to-one) |
| **AssetRealEstateDetails** | assetId, propertyType, sqft, occupancy, noi, capRate | belongsTo: Asset (one-to-one) |
| **AssetFundLPDetails** | assetId, gpName, commitment, calledAmount, distributions | belongsTo: Asset (one-to-one) |

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

| Model | Key Fields | Key Relations |
|-------|-----------|---------------|
| **Valuation** | assetId, valuationDate, method, fairValue, status (DRAFT/APPROVED) | belongsTo: Asset |
| **NAVComputation** | entityId, periodDate, costBasisNAV, economicNAV, details (JSON) | belongsTo: Entity (unique per entity+period) |

### Fund Mechanics

| Model | Key Fields | Key Relations |
|-------|-----------|---------------|
| **WaterfallTemplate** | name, description | hasMany: WaterfallTier, WaterfallCalculation |
| **WaterfallTier** | templateId, tierOrder, name, splitLP, splitGP, hurdleRate | belongsTo: WaterfallTemplate |
| **WaterfallCalculation** | templateId, periodDate, results (JSON) | belongsTo: WaterfallTemplate |
| **FeeCalculation** | entityId, periodDate, managementFee, carriedInterest | belongsTo: Entity |
| **CapitalAccount** | investorId, entityId, periodDate, beginningBalance, endingBalance | belongsTo: Investor, Entity (unique per triple) |

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
No explicit soft delete fields. `AccountingConnection` uses `syncStatus: DISCONNECTED` for soft delete semantics. Documents stay in DB permanently.

### Polymorphic Relations
`Document`, `Note`, `Meeting`, and `Task` all use optional foreign keys to link to multiple parent types (asset, deal, entity, investor). Filter by whichever context applies.
