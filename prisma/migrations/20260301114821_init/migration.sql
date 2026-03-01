-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('MAIN_FUND', 'SIDECAR', 'SPV', 'CO_INVEST_VEHICLE', 'GP_ENTITY', 'HOLDING_COMPANY');

-- CreateEnum
CREATE TYPE "VehicleStructure" AS ENUM ('LLC', 'LP', 'CORP', 'TRUST');

-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('ACTIVE', 'WINDING_DOWN', 'DISSOLVED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('DIRECT_EQUITY', 'PRIVATE_CREDIT', 'REAL_ESTATE_DIRECT', 'FUND_LP_POSITION', 'CO_INVESTMENT', 'WARRANT', 'ROYALTY');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'EXITED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "HoldingType" AS ENUM ('DIRECT', 'THROUGH_OWN_VEHICLE', 'LP_IN_EXTERNAL_FUND', 'CO_INVEST_WITH_LEAD_GP', 'THROUGH_COUNTERPARTY');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('SOURCING', 'SCREENING', 'AI_SCREEN', 'DUE_DILIGENCE', 'IC_REVIEW', 'CLOSING', 'DEAD');

-- CreateEnum
CREATE TYPE "AccountingProvider" AS ENUM ('QBO', 'XERO');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "ValuationMethod" AS ENUM ('COMPARABLE_MULTIPLES', 'LAST_ROUND', 'DCF', 'APPRAISAL', 'GP_REPORTED_NAV', 'COST');

-- CreateEnum
CREATE TYPE "ValuationStatus" AS ENUM ('DRAFT', 'APPROVED');

-- CreateEnum
CREATE TYPE "CapitalCallStatus" AS ENUM ('DRAFT', 'ISSUED', 'FUNDED', 'PARTIALLY_FUNDED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "DistributionStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "CovenantType" AS ENUM ('FINANCIAL', 'NEGATIVE', 'AFFIRMATIVE', 'REPORTING');

-- CreateEnum
CREATE TYPE "CovenantStatus" AS ENUM ('COMPLIANT', 'WATCH', 'CURE_PERIOD', 'BREACH', 'WAIVED');

-- CreateEnum
CREATE TYPE "LeaseType" AS ENUM ('GROSS', 'NET', 'NNN', 'MODIFIED_GROSS', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'MONTH_TO_MONTH', 'TERMINATED');

-- CreateEnum
CREATE TYPE "CreditAgreementType" AS ENUM ('LOAN_AGREEMENT', 'NOTE_PURCHASE', 'PARTICIPATION', 'CREDIT_FACILITY', 'INDENTURE', 'BRIDGE_LOAN');

-- CreateEnum
CREATE TYPE "InterestRateType" AS ENUM ('FIXED', 'FLOATING', 'HYBRID', 'PIK');

-- CreateEnum
CREATE TYPE "CreditStatus" AS ENUM ('PERFORMING', 'WATCH', 'DEFAULT', 'WORKOUT');

-- CreateEnum
CREATE TYPE "Subordination" AS ENUM ('SENIOR', 'MEZZANINE', 'SUBORDINATED');

-- CreateEnum
CREATE TYPE "PaymentFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "DayCount" AS ENUM ('THIRTY_360', 'ACTUAL_360', 'ACTUAL_365');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('GP_ADMIN', 'GP_TEAM', 'SERVICE_PROVIDER', 'LP_INVESTOR');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'PORTAL_ONLY');

-- CreateEnum
CREATE TYPE "DigestPreference" AS ENUM ('IMMEDIATE', 'DAILY_DIGEST', 'WEEKLY_DIGEST');

-- CreateEnum
CREATE TYPE "MeetingSource" AS ENUM ('FIREFLIES', 'MANUAL', 'ZOOM', 'TEAMS');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('BOARD', 'FINANCIAL', 'LEGAL', 'GOVERNANCE', 'VALUATION', 'STATEMENT', 'TAX', 'REPORT', 'NOTICE', 'OTHER');

-- CreateEnum
CREATE TYPE "IncomeType" AS ENUM ('INTEREST', 'DIVIDEND', 'RENTAL', 'ROYALTY', 'FEE', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CAPITAL_CALL', 'DISTRIBUTION', 'INCOME', 'EXPENSE', 'FEE', 'TRANSFER', 'INVESTMENT', 'EXIT');

-- CreateEnum
CREATE TYPE "DDWorkstreamStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE');

-- CreateTable
CREATE TABLE "Firm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Firm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "entityType" "EntityType" NOT NULL,
    "parentEntityId" TEXT,
    "vehicleStructure" "VehicleStructure" NOT NULL DEFAULT 'LLC',
    "ein" TEXT,
    "stateOfFormation" TEXT,
    "formationDate" TIMESTAMP(3),
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "vintageYear" INTEGER,
    "targetSize" DOUBLE PRECISION,
    "totalCommitments" DOUBLE PRECISION,
    "investmentPeriodEnd" TIMESTAMP(3),
    "fundTermYears" INTEGER,
    "extensionOptions" TEXT,
    "fiscalYearEnd" TEXT,
    "regulatoryFilings" JSONB,
    "legalCounsel" TEXT,
    "taxPreparer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "waterfallTemplateId" TEXT,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingConnection" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "provider" "AccountingProvider" NOT NULL,
    "providerCompanyId" TEXT,
    "providerCompanyName" TEXT,
    "oauthCredentials" JSONB,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "lastSyncAt" TIMESTAMP(3),
    "syncFrequency" TEXT NOT NULL DEFAULT '15min',
    "chartOfAccountsMapped" BOOLEAN NOT NULL DEFAULT false,
    "unreconciledItems" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountMapping" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "atlasAccountType" TEXT NOT NULL,
    "providerAccountId" TEXT,
    "providerAccountName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "initials" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "entityAccess" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accessExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "sector" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "holdingType" "HoldingType" NOT NULL DEFAULT 'DIRECT',
    "costBasis" DOUBLE PRECISION NOT NULL,
    "fairValue" DOUBLE PRECISION NOT NULL,
    "moic" DOUBLE PRECISION,
    "irr" DOUBLE PRECISION,
    "incomeType" TEXT,
    "hasBoardSeat" BOOLEAN NOT NULL DEFAULT false,
    "entryDate" TIMESTAMP(3),
    "nextReview" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetEntityAllocation" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "allocationPercent" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "costBasis" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetEntityAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetEquityDetails" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "instrument" TEXT,
    "ownership" TEXT,
    "revenue" TEXT,
    "ebitda" TEXT,
    "growth" TEXT,
    "employees" INTEGER,

    CONSTRAINT "AssetEquityDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetCreditDetails" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "instrument" TEXT,
    "principal" TEXT,
    "rate" TEXT,
    "maturity" TEXT,
    "ltv" TEXT,
    "dscr" TEXT,
    "nextPaymentDate" TEXT,
    "accruedInterest" TEXT,

    CONSTRAINT "AssetCreditDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetRealEstateDetails" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "propertyType" TEXT,
    "squareFeet" TEXT,
    "occupancy" TEXT,
    "noi" TEXT,
    "capRate" TEXT,
    "rentPerSqft" TEXT,
    "debt" TEXT,
    "debtDscr" TEXT,

    CONSTRAINT "AssetRealEstateDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetFundLPDetails" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "gpName" TEXT,
    "commitment" TEXT,
    "calledAmount" TEXT,
    "uncalledAmount" TEXT,
    "distributions" TEXT,
    "gpNav" TEXT,
    "navDate" TEXT,
    "gpIrr" TEXT,
    "gpTvpi" TEXT,
    "vintage" INTEGER,
    "strategy" TEXT,

    CONSTRAINT "AssetFundLPDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lease" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "tenantName" TEXT NOT NULL,
    "tenantEntity" TEXT,
    "unitOrSuite" TEXT,
    "squareFootage" TEXT,
    "leaseType" "LeaseType" NOT NULL DEFAULT 'NNN',
    "baseRentMonthly" DOUBLE PRECISION,
    "baseRentAnnual" DOUBLE PRECISION,
    "rentEscalation" JSONB,
    "camCharges" DOUBLE PRECISION,
    "taxPassThrough" DOUBLE PRECISION,
    "insurancePassThrough" DOUBLE PRECISION,
    "leaseStartDate" TIMESTAMP(3),
    "leaseEndDate" TIMESTAMP(3),
    "renewalOptions" JSONB,
    "terminationOptions" JSONB,
    "securityDeposit" DOUBLE PRECISION,
    "freeRentMonths" INTEGER,
    "tenantImprovementAllowance" DOUBLE PRECISION,
    "currentStatus" "LeaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "rentPercentOfTotal" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditAgreement" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "borrowerName" TEXT NOT NULL,
    "borrowerEntity" TEXT,
    "agreementType" "CreditAgreementType" NOT NULL DEFAULT 'LOAN_AGREEMENT',
    "originalPrincipal" DOUBLE PRECISION NOT NULL,
    "currentPrincipal" DOUBLE PRECISION NOT NULL,
    "commitmentAmount" DOUBLE PRECISION,
    "drawnAmount" DOUBLE PRECISION,
    "interestRateType" "InterestRateType" NOT NULL DEFAULT 'FIXED',
    "fixedRate" DOUBLE PRECISION,
    "referenceRate" TEXT,
    "spreadBps" INTEGER,
    "pikRate" DOUBLE PRECISION,
    "floorRate" DOUBLE PRECISION,
    "dayCount" "DayCount" NOT NULL DEFAULT 'ACTUAL_360',
    "paymentFrequency" "PaymentFrequency" NOT NULL DEFAULT 'MONTHLY',
    "paymentDay" INTEGER,
    "amortization" TEXT,
    "amortizationSchedule" JSONB,
    "maturityDate" TIMESTAMP(3),
    "prepaymentTerms" JSONB,
    "collateral" JSONB,
    "guarantors" JSONB,
    "subordination" "Subordination" NOT NULL DEFAULT 'SENIOR',
    "intercreditorAgreement" BOOLEAN NOT NULL DEFAULT false,
    "defaultProvisions" JSONB,
    "currentStatus" "CreditStatus" NOT NULL DEFAULT 'PERFORMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Covenant" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "covenantType" "CovenantType" NOT NULL DEFAULT 'FINANCIAL',
    "metric" TEXT,
    "thresholdOperator" TEXT,
    "thresholdValue" DOUBLE PRECISION,
    "thresholdValueUpper" DOUBLE PRECISION,
    "testFrequency" TEXT,
    "curePeriodDays" INTEGER,
    "lastTestedDate" TIMESTAMP(3),
    "lastTestedValue" TEXT,
    "currentStatus" "CovenantStatus" NOT NULL DEFAULT 'COMPLIANT',
    "breachHistory" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Covenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditPayment" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "paymentType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Received',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investor" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "investorType" TEXT NOT NULL,
    "kycStatus" TEXT NOT NULL DEFAULT 'Pending',
    "advisoryBoard" BOOLEAN NOT NULL DEFAULT false,
    "contactPreference" TEXT NOT NULL DEFAULT 'email',
    "totalCommitted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commitment" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "calledAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SideLetter" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "terms" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SideLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorNotificationPreference" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "preferredChannel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "emailAddress" TEXT,
    "phoneNumber" TEXT,
    "notificationTypes" JSONB,
    "digestPreference" "DigestPreference" NOT NULL DEFAULT 'IMMEDIATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestorNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "isPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapitalCall" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "callNumber" TEXT NOT NULL,
    "callDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "purpose" TEXT,
    "status" "CapitalCallStatus" NOT NULL DEFAULT 'DRAFT',
    "fundedPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapitalCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapitalCallLineItem" (
    "id" TEXT NOT NULL,
    "capitalCallId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "paidDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapitalCallLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistributionEvent" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "distributionDate" TIMESTAMP(3) NOT NULL,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "source" TEXT,
    "returnOfCapital" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "income" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "longTermGain" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shortTermGain" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carriedInterest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netToLPs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "DistributionStatus" NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistributionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistributionLineItem" (
    "id" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "returnOfCapital" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "income" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "longTermGain" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carriedInterest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DistributionLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeEvent" (
    "id" TEXT NOT NULL,
    "assetId" TEXT,
    "entityId" TEXT NOT NULL,
    "incomeType" "IncomeType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "isPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncomeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Valuation" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "valuationDate" TIMESTAMP(3) NOT NULL,
    "method" "ValuationMethod" NOT NULL,
    "fairValue" DOUBLE PRECISION NOT NULL,
    "moic" DOUBLE PRECISION,
    "notes" TEXT,
    "status" "ValuationStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Valuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NAVComputation" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "costBasisNAV" DOUBLE PRECISION NOT NULL,
    "economicNAV" DOUBLE PRECISION NOT NULL,
    "unrealizedGain" DOUBLE PRECISION,
    "accruedCarry" DOUBLE PRECISION,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NAVComputation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterfallTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaterfallTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterfallTier" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "tierOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "splitLP" DOUBLE PRECISION,
    "splitGP" DOUBLE PRECISION,
    "hurdleRate" DOUBLE PRECISION,
    "appliesTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaterfallTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterfallCalculation" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "results" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaterfallCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeCalculation" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "managementFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fundExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carriedInterest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapitalAccount" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "beginningBalance" DOUBLE PRECISION NOT NULL,
    "contributions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "incomeAllocations" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capitalAllocations" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distributions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "endingBalance" DOUBLE PRECISION NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapitalAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dealType" "AssetType" NOT NULL,
    "sector" TEXT,
    "stage" "DealStage" NOT NULL DEFAULT 'SCREENING',
    "targetSize" TEXT,
    "leadPartner" TEXT,
    "aiScore" INTEGER,
    "aiFlag" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ICProcess" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "slackMessageId" TEXT,
    "slackChannel" TEXT,
    "quorumType" TEXT NOT NULL DEFAULT 'majority',
    "deadline" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "finalDecision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ICProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ICVoteRecord" (
    "id" TEXT NOT NULL,
    "icProcessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ICVoteRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DDWorkstream" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DDWorkstreamStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "hasAI" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DDWorkstream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DDTask" (
    "id" TEXT NOT NULL,
    "workstreamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "assignee" TEXT,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DDTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIScreeningResult" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "score" INTEGER,
    "summary" TEXT,
    "strengths" JSONB,
    "risks" JSONB,
    "financials" JSONB,
    "recommendation" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIScreeningResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClosingChecklist" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "assignee" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClosingChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "assigneeId" TEXT,
    "assigneeName" TEXT,
    "dueDate" TIMESTAMP(3),
    "assetId" TEXT,
    "contextType" TEXT,
    "contextId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "meetingType" TEXT,
    "source" "MeetingSource" NOT NULL DEFAULT 'MANUAL',
    "hasTranscript" BOOLEAN NOT NULL DEFAULT false,
    "actionItems" INTEGER NOT NULL DEFAULT 0,
    "decisions" JSONB,
    "assetId" TEXT,
    "dealId" TEXT,
    "transcript" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER',
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "assetId" TEXT,
    "entityId" TEXT,
    "dealId" TEXT,
    "investorId" TEXT,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "investorId" TEXT,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "assetId" TEXT,
    "description" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountingConnection_entityId_key" ON "AccountingConnection"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Asset_assetType_idx" ON "Asset"("assetType");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AssetEntityAllocation_assetId_entityId_key" ON "AssetEntityAllocation"("assetId", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetEquityDetails_assetId_key" ON "AssetEquityDetails"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetCreditDetails_assetId_key" ON "AssetCreditDetails"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetRealEstateDetails_assetId_key" ON "AssetRealEstateDetails"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetFundLPDetails_assetId_key" ON "AssetFundLPDetails"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "Investor_userId_key" ON "Investor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Commitment_investorId_entityId_key" ON "Commitment"("investorId", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestorNotificationPreference_investorId_key" ON "InvestorNotificationPreference"("investorId");

-- CreateIndex
CREATE INDEX "Valuation_assetId_valuationDate_idx" ON "Valuation"("assetId", "valuationDate");

-- CreateIndex
CREATE UNIQUE INDEX "NAVComputation_entityId_periodDate_key" ON "NAVComputation"("entityId", "periodDate");

-- CreateIndex
CREATE INDEX "WaterfallTier_templateId_tierOrder_idx" ON "WaterfallTier"("templateId", "tierOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CapitalAccount_investorId_entityId_periodDate_key" ON "CapitalAccount"("investorId", "entityId", "periodDate");

-- CreateIndex
CREATE INDEX "Deal_stage_idx" ON "Deal"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "ICProcess_dealId_key" ON "ICProcess"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "AIScreeningResult_dealId_key" ON "AIScreeningResult"("dealId");

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_parentEntityId_fkey" FOREIGN KEY ("parentEntityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_waterfallTemplateId_fkey" FOREIGN KEY ("waterfallTemplateId") REFERENCES "WaterfallTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingConnection" ADD CONSTRAINT "AccountingConnection_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountMapping" ADD CONSTRAINT "AccountMapping_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "AccountingConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetEntityAllocation" ADD CONSTRAINT "AssetEntityAllocation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetEntityAllocation" ADD CONSTRAINT "AssetEntityAllocation_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetEquityDetails" ADD CONSTRAINT "AssetEquityDetails_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetCreditDetails" ADD CONSTRAINT "AssetCreditDetails_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetRealEstateDetails" ADD CONSTRAINT "AssetRealEstateDetails_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetFundLPDetails" ADD CONSTRAINT "AssetFundLPDetails_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditAgreement" ADD CONSTRAINT "CreditAgreement_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Covenant" ADD CONSTRAINT "Covenant_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "CreditAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPayment" ADD CONSTRAINT "CreditPayment_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "CreditAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investor" ADD CONSTRAINT "Investor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SideLetter" ADD CONSTRAINT "SideLetter_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SideLetter" ADD CONSTRAINT "SideLetter_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorNotificationPreference" ADD CONSTRAINT "InvestorNotificationPreference_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapitalCall" ADD CONSTRAINT "CapitalCall_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapitalCallLineItem" ADD CONSTRAINT "CapitalCallLineItem_capitalCallId_fkey" FOREIGN KEY ("capitalCallId") REFERENCES "CapitalCall"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapitalCallLineItem" ADD CONSTRAINT "CapitalCallLineItem_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributionEvent" ADD CONSTRAINT "DistributionEvent_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributionLineItem" ADD CONSTRAINT "DistributionLineItem_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "DistributionEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributionLineItem" ADD CONSTRAINT "DistributionLineItem_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeEvent" ADD CONSTRAINT "IncomeEvent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeEvent" ADD CONSTRAINT "IncomeEvent_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NAVComputation" ADD CONSTRAINT "NAVComputation_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterfallTier" ADD CONSTRAINT "WaterfallTier_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WaterfallTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterfallCalculation" ADD CONSTRAINT "WaterfallCalculation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WaterfallTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeCalculation" ADD CONSTRAINT "FeeCalculation_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapitalAccount" ADD CONSTRAINT "CapitalAccount_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapitalAccount" ADD CONSTRAINT "CapitalAccount_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ICProcess" ADD CONSTRAINT "ICProcess_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ICVoteRecord" ADD CONSTRAINT "ICVoteRecord_icProcessId_fkey" FOREIGN KEY ("icProcessId") REFERENCES "ICProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ICVoteRecord" ADD CONSTRAINT "ICVoteRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DDWorkstream" ADD CONSTRAINT "DDWorkstream_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DDTask" ADD CONSTRAINT "DDTask_workstreamId_fkey" FOREIGN KEY ("workstreamId") REFERENCES "DDWorkstream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIScreeningResult" ADD CONSTRAINT "AIScreeningResult_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingChecklist" ADD CONSTRAINT "ClosingChecklist_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
