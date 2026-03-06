# Atlas — Architecture Reference

Living reference for Atlas's domain architecture. Updated as the system evolves.

Last updated: 2026-03-05

---

## 1. Multi-Entity Structure

Atlas manages multiple legal entities, each with its own books. This is the most architecturally important design decision.

```
ATLAS
├── Firm: [Your Family Office GP]
│
├── Entity: Fund I, LLC
│   ├── Accounting: QBO Company "Fund I"
│   ├── Type: Main fund
│   └── Assets: [RE properties, credit notes, equity stakes]
│
├── Entity: Fund II, LP
│   ├── Accounting: QBO Company "Fund II"
│   ├── Type: Main fund
│   └── Assets: [different mix]
│
├── Entity: Fund III, LLC
│   ├── Accounting: Xero Company "Fund III"  ← different system!
│   ├── Type: Main fund
│   └── Assets: [...]
│
├── Entity: Fund I Sidecar A, LLC
│   ├── Accounting: QBO Company "Sidecar A"
│   ├── Type: Sidecar (parent: Fund I)
│   └── Assets: [single deal co-invest]
│
├── Entity: [SPV for Deal X]
│   ├── Accounting: QBO Company "SPV-X"
│   ├── Type: SPV
│   └── Assets: [single asset]
│
└── ... (9+ entities)
```

**Status:** IMPLEMENTED in Prisma schema. Entity, AccountingConnection, AccountMapping models all exist.
- Entity CRUD works end-to-end
- Formation workflow (NOT_STARTED → FORMING → FORMED → REGISTERED) works
- Accounting connection status UI exists — **no real OAuth or QBO/Xero API calls yet**

---

## 2. Accounting Connector Architecture

Each entity connects independently to its own QBO or Xero company. Account mappings are per-entity.

```
AccountingConnection
├── entityId (FK → Entity, one-to-one)
├── provider                    // qbo, xero
├── providerCompanyId           // QBO realm ID or Xero tenant ID
├── providerCompanyName
├── oauthCredentials            // encrypted
├── syncStatus                  // CONNECTED, DISCONNECTED, ERROR
├── lastSyncAt
└── chartOfAccountsMapped       // boolean

AccountMapping
├── connectionId (FK → AccountingConnection)
├── atlasAccountType            // cash, investments_at_cost, accrued_fees, etc.
├── providerAccountId           // QBO/Xero account ID
└── providerAccountName
```

**Status:** Models IMPLEMENTED. UI shows connection status. **No real OAuth, no account mapping UI, no trial balance pull.**

---

## 3. Asset Ownership Model

An asset can be held in complex ways across multiple entities.

```
Simple:  Fund I → owns → 123 Main St (direct RE)
Complex: Fund II → owns 80% of → SPV-X → owns → 456 Oak Ave
Indirect: Fund III → LP stake in → Blackstone RE IX → owns → [properties]
Multi-fund: Fund I (60%) + Sidecar A (40%) → own → NovaTech AI
```

The `AssetEntityAllocation` junction table enables this:

```
AssetEntityAllocation
├── assetId (FK → Asset)
├── entityId (FK → Entity)
├── allocationPercent           // 60%, 40%, 100%
├── costBasis                   // this entity's cost basis
├── status                      // active, exited, transferred
└── createdAt
```

**Status:** IMPLEMENTED. Multi-entity allocation works. Allocation at deal close works (recent feature).

---

## 4. Holding Structure Types

Each asset has a holding type that determines how much control you have over it:

| Holding Type | You Control Valuation? | You Have the Books? | Example |
|-------------|----------------------|--------------------|---------|
| `direct` | Yes | Yes | Fund I owns 123 Main St directly |
| `through_own_vehicle` | Yes | Yes (for the SPV) | Fund II → SPV-X → 456 Oak Ave |
| `lp_in_external_fund` | No (GP reports NAV) | No (get statements) | LP in Sequoia Fund XVI |
| `co_invest_with_lead_gp` | Partial | Partial | Co-invest alongside Lead GP |
| `through_counterparty` | No | No | Participation in credit facility |

**The asset detail page adapts based on holding type:**
- Direct assets: full control panel (mark valuations, log income, etc.)
- LP positions: "waiting for GP" indicators, statement upload
- Co-invests: lead GP communication tracking

**Status:** IMPLEMENTED in schema. Asset detail pages have type-specific tabs. Holding type field exists but **adaptive UI behavior not fully implemented** (all assets show same controls regardless of holding type).

---

## 5. Contract-Level Detail

### Real Estate Leases

```
Lease
├── assetId (FK → Asset where type = real_estate)
├── tenantName, tenantEntity, unitOrSuite
├── squareFootage
├── leaseType                   // gross, net, nnn, modified_gross, percentage
├── baseRentMonthly, baseRentAnnual
├── rentEscalation              // JSON: {type: "annual", rate: 0.03}
├── camCharges, taxPassThrough, insurancePassThrough
├── leaseStartDate, leaseEndDate
├── renewalOptions              // JSON
├── securityDeposit, freeRentMonths
├── currentStatus               // active, expired, month_to_month, terminated
└── createdAt
```

### Private Credit Agreements

```
CreditAgreement
├── assetId (FK → Asset where type = private_credit)
├── borrowerName, borrowerEntity
├── agreementType               // loan_agreement, note_purchase, participation, etc.
├── originalPrincipal, currentPrincipal
├── interestRateType            // fixed, floating, hybrid, pik
├── fixedRate, referenceRate, spreadBps, pikRate, floorRate
├── dayCount                    // 30/360, actual/360, actual/365
├── paymentFrequency, paymentDay
├── maturityDate
├── subordination               // senior, mezzanine, subordinated
├── currentStatus               // performing, watch, default, workout
└── covenants → Covenant[]

Covenant
├── agreementId (FK → CreditAgreement)
├── name                        // "Maximum Leverage Ratio"
├── covenantType                // financial, negative, affirmative, reporting
├── thresholdValue, thresholdOperator
├── testFrequency               // monthly, quarterly, annual
├── lastTestedDate, lastTestedValue
├── currentStatus               // compliant, watch, cure_period, breach, waived
└── curePeriodDays
```

**Status:** IMPLEMENTED. Lease and CreditAgreement models exist. RE tab shows tenant roll, Credit tab shows covenant monitor. **Payment tracking (CreditPayment model) exists but is basic.**

---

## 6. Role-Based Access

```
GP_ADMIN (you)
├── Everything. Full control.
└── Settings, integrations, user management

GP_TEAM (CFO, CIO)
├── Full operational access
└── May restrict: integration settings, user management

SERVICE_PROVIDER (CPA, tax preparer)
├── Read-only access to specific entities
├── Scoped via User.entityAccess[] array
├── Time-bound access option
└── Audit trail of everything they view

LP_INVESTOR
├── Read-only access to their own data
├── Sees: capital account, distributions, documents, portfolio
└── Cannot: see other LPs, internal notes, IC materials
```

**Status:** UserRole enum IMPLEMENTED. Clerk auth works in production, mock UserProvider for dev. **No enforcement middleware — any authenticated user can access any route.** Real enforcement requires route-level middleware (CORE-02).

---

## 7. Deal Pipeline & IC Process

### Stage Machine

```
SCREENING → DUE_DILIGENCE → IC_REVIEW → CLOSING → CLOSED (creates Asset)
                               ↓
                    REJECTED or SEND_BACK
Any stage → DEAD (kill deal)
```

Logic in `src/lib/deal-stage-engine.ts`. All transitions log DealActivity.

### IC Voting Flow

1. Deal reaches IC stage → initiator clicks "Send to IC"
2. (Planned) Atlas posts to Slack channel with deal summary and vote buttons
3. IC members vote via Slack reactions or directly in Atlas UI
4. Atlas records votes, checks quorum, records final decision
5. APPROVED → CLOSING, REJECTED → stays, SEND_BACK → DUE_DILIGENCE

**Status:** IC voting via Atlas UI IMPLEMENTED and works well. **Slack integration code exists** (`src/lib/slack.ts`, 245 lines — signature verification, Block Kit buttons, callback sync to DB) **but has not been tested with a real Slack workspace.**

### AI Analysis Pipeline

1. Per-workstream analysis: generates findings + tasks per DD area
2. IC Memo aggregation: combines all workstream analyses into unified memo
3. Configurable via DD category templates and AI prompt templates

**Status:** IMPLEMENTED. Works with user-supplied API key (OpenAI or Anthropic). **Known issue: "Generating..." spinner can get stuck on some deals (BUG-03).**

---

## 8. LP Notification Preferences

```
InvestorNotificationPreference
├── investorId (FK → Investor, one-to-one)
├── preferredChannel            // email, sms, portal_only
├── emailAddress, phoneNumber
├── notificationTypes           // which events trigger: capital_call, distribution, etc.
└── digestPreference            // immediate, daily_digest, weekly_digest
```

Delivery channels: Email (SendGrid/SES), SMS (Twilio), Portal (always).

**Status:** Model IMPLEMENTED. **No delivery engine — notifications only show in-app (bell icon with polling).**

---

## 9. Technology Stack (Actual)

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 | |
| Language | TypeScript 5 (strict mode) | |
| Database | PostgreSQL + Prisma 7 | 57 models |
| API | REST routes (Next.js route handlers) | 73 endpoints, Zod validation |
| Data Fetching | SWR 2 | Client-side caching, deduplication |
| Auth | Clerk 7 (production) / Mock UserProvider (dev) | Clerk active in production, mock for local dev |
| AI | OpenAI + Anthropic SDK | User-supplied API key, encrypted in DB |
| File Storage | Vercel Blob | Documents, PDFs |
| Charts | Recharts 3 | Dashboard charts |
| Deployment | Vercel | Serverless, auto-scaling |

**Not used (removed from original spec):**
- tRPC (went with REST for simplicity)
- Redis/Upstash (no caching layer)
- BullMQ/Inngest (no background jobs)
- Railway/Render (Vercel handles everything)
- React Native/Expo (no mobile yet)
