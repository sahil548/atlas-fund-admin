import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDefaultDDCategoriesForFirm } from "../src/lib/default-dd-categories";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding Atlas database...");

  // ============================================================
  // CLEAR ALL TABLES (reverse dependency order)
  // ============================================================
  console.log("Clearing existing data...");

  await prisma.investorUserAccess.deleteMany();
  await prisma.aIPromptTemplate.deleteMany();
  await prisma.aIConfiguration.deleteMany();
  await prisma.dealCoInvestor.deleteMany();
  await prisma.contactInteraction.deleteMany();
  await prisma.contactTag.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.task.deleteMany();
  await prisma.dealActivity.deleteMany();
  await prisma.note.deleteMany();
  await prisma.dDTask.deleteMany();
  await prisma.dDWorkstream.deleteMany();
  await prisma.closingChecklist.deleteMany();
  await prisma.aIScreeningResult.deleteMany();
  await prisma.iCQuestionReply.deleteMany();
  await prisma.iCQuestion.deleteMany();
  await prisma.iCVoteRecord.deleteMany();
  await prisma.iCProcess.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.dDCategoryTemplate.deleteMany();
  await prisma.capitalAccount.deleteMany();
  await prisma.waterfallCalculation.deleteMany();
  await prisma.waterfallTier.deleteMany();
  // Unlink entities from waterfall templates before deleting templates
  await prisma.entity.updateMany({ data: { waterfallTemplateId: null } });
  await prisma.waterfallTemplate.deleteMany();
  await prisma.feeCalculation.deleteMany();
  await prisma.nAVComputation.deleteMany();
  await prisma.valuation.deleteMany();
  await prisma.distributionLineItem.deleteMany();
  await prisma.distributionEvent.deleteMany();
  await prisma.capitalCallLineItem.deleteMany();
  await prisma.capitalCall.deleteMany();
  await prisma.incomeEvent.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.creditPayment.deleteMany();
  await prisma.covenant.deleteMany();
  await prisma.creditAgreement.deleteMany();
  await prisma.lease.deleteMany();
  await prisma.assetFundLPDetails.deleteMany();
  await prisma.assetRealEstateDetails.deleteMany();
  await prisma.assetCreditDetails.deleteMany();
  await prisma.assetEquityDetails.deleteMany();
  await prisma.assetEntityAllocation.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.sideLetter.deleteMany();
  await prisma.commitment.deleteMany();
  await prisma.investorNotificationPreference.deleteMany();
  await prisma.investor.deleteMany();
  await prisma.accountMapping.deleteMany();
  await prisma.accountingConnection.deleteMany();
  await prisma.entity.deleteMany();
  await prisma.user.deleteMany();
  await prisma.firm.deleteMany();

  console.log("All tables cleared.");

  // ============================================================
  // FIRM
  // ============================================================
  console.log("Creating firm...");

  const firm = await prisma.firm.create({
    data: {
      id: "firm-1",
      name: "Atlas Family Office GP",
      legalName: "Atlas Family Office GP, LLC",
    },
  });

  // ============================================================
  // GP COMPANY + INTERNAL CONTACTS (must exist before Users)
  // ============================================================
  console.log("Creating GP company and internal contacts...");

  await prisma.company.create({
    data: { id: "company-gp", firmId: firm.id, name: "Atlas Family Office GP", type: "GP", industry: "Financial Services" },
  });

  await prisma.contact.createMany({
    data: [
      { id: "contact-gp-jk", firmId: firm.id, firstName: "James", lastName: "Kim", email: "james.kim@atlasgp.com", title: "Managing Partner", type: "INTERNAL", companyId: "company-gp" },
      { id: "contact-gp-sm", firmId: firm.id, firstName: "Sarah", lastName: "Mitchell", email: "sarah.mitchell@atlasgp.com", title: "CFO", type: "INTERNAL", companyId: "company-gp" },
      { id: "contact-gp-al", firmId: firm.id, firstName: "Alex", lastName: "Lee", email: "alex.lee@atlasgp.com", title: "VP, Investments", type: "INTERNAL", companyId: "company-gp" },
      { id: "contact-gp-sn", firmId: firm.id, firstName: "Sahil", lastName: "Nandwani", email: "sahil@calafiagroup.com", title: "Principal", type: "INTERNAL", companyId: "company-gp" },
    ],
  });

  // ============================================================
  // USERS (3 GP + 5 LP users)
  // ============================================================
  console.log("Creating users...");

  const userJK = await prisma.user.create({
    data: {
      id: "user-jk",
      firmId: firm.id,
      email: "james.kim@atlasgp.com",
      name: "James Kim",
      role: "GP_ADMIN",
      initials: "JK",
      contactId: "contact-gp-jk",
    },
  });

  const userSM = await prisma.user.create({
    data: {
      id: "user-sm",
      firmId: firm.id,
      email: "sarah.mitchell@atlasgp.com",
      name: "Sarah Mitchell",
      role: "GP_TEAM",
      initials: "SM",
      contactId: "contact-gp-sm",
    },
  });

  const userAL = await prisma.user.create({
    data: {
      id: "user-al",
      firmId: firm.id,
      email: "alex.lee@atlasgp.com",
      name: "Alex Lee",
      role: "GP_TEAM",
      initials: "AL",
      contactId: "contact-gp-al",
    },
  });

  // Current logged-in user — must be in firm-1 so API queries return seed data
  await prisma.user.create({
    data: {
      id: "user-sn",
      firmId: firm.id,
      email: "sahil@calafiagroup.com",
      name: "Sahil Nandwani",
      role: "GP_ADMIN",
      initials: "SN",
      contactId: "contact-gp-sn",
    },
  });

  // ============================================================
  // ENTITIES (9 entities)
  // ============================================================
  console.log("Creating entities...");

  const entity1 = await prisma.entity.create({
    data: {
      id: "entity-1",
      firmId: firm.id,
      name: "Atlas Fund I, LLC",
      legalName: "Atlas Fund I, LLC",
      entityType: "MAIN_FUND",
      vehicleStructure: "LLC",
      vintageYear: 2019,
      totalCommitments: 300_000_000,
      status: "ACTIVE",
    },
  });

  const entity2 = await prisma.entity.create({
    data: {
      id: "entity-2",
      firmId: firm.id,
      name: "Atlas Fund II, LP",
      legalName: "Atlas Fund II, LP",
      entityType: "MAIN_FUND",
      vehicleStructure: "LP",
      vintageYear: 2022,
      totalCommitments: 500_000_000,
      status: "ACTIVE",
    },
  });

  const entity3 = await prisma.entity.create({
    data: {
      id: "entity-3",
      firmId: firm.id,
      name: "Atlas Fund III, LLC",
      legalName: "Atlas Fund III, LLC",
      entityType: "MAIN_FUND",
      vehicleStructure: "LLC",
      vintageYear: 2023,
      totalCommitments: 120_000_000,
      status: "ACTIVE",
    },
  });

  const entity4 = await prisma.entity.create({
    data: {
      id: "entity-4",
      firmId: firm.id,
      name: "Atlas Growth Fund, LP",
      legalName: "Atlas Growth Fund, LP",
      entityType: "MAIN_FUND",
      vehicleStructure: "LP",
      vintageYear: 2024,
      totalCommitments: 75_000_000,
      status: "ACTIVE",
    },
  });

  const entity5 = await prisma.entity.create({
    data: {
      id: "entity-5",
      firmId: firm.id,
      name: "Fund I Sidecar A, LLC",
      legalName: "Fund I Sidecar A, LLC",
      entityType: "SIDECAR",
      vehicleStructure: "LLC",
      parentEntityId: entity1.id,
      vintageYear: 2020,
      totalCommitments: 20_000_000,
      status: "ACTIVE",
    },
  });

  const entity6 = await prisma.entity.create({
    data: {
      id: "entity-6",
      firmId: firm.id,
      name: "Fund I Sidecar B, LLC",
      legalName: "Fund I Sidecar B, LLC",
      entityType: "SIDECAR",
      vehicleStructure: "LLC",
      parentEntityId: entity1.id,
      vintageYear: 2021,
      totalCommitments: 8_000_000,
      status: "ACTIVE",
    },
  });

  const entity7 = await prisma.entity.create({
    data: {
      id: "entity-7",
      firmId: firm.id,
      name: "Fund II Co-Invest SPV",
      legalName: "Fund II Co-Invest SPV",
      entityType: "SPV",
      vehicleStructure: "LLC",
      vintageYear: 2023,
      totalCommitments: 25_000_000,
      status: "ACTIVE",
    },
  });

  const entity8 = await prisma.entity.create({
    data: {
      id: "entity-8",
      firmId: firm.id,
      name: "Credit Opportunity I, LLC",
      legalName: "Credit Opportunity I, LLC",
      entityType: "MAIN_FUND",
      vehicleStructure: "LLC",
      vintageYear: 2023,
      totalCommitments: 50_000_000,
      status: "ACTIVE",
    },
  });

  const entity9 = await prisma.entity.create({
    data: {
      id: "entity-9",
      firmId: firm.id,
      name: "RE Holdings SPV, LLC",
      legalName: "RE Holdings SPV, LLC",
      entityType: "SPV",
      vehicleStructure: "LLC",
      vintageYear: 2024,
      totalCommitments: 15_000_000,
      status: "ACTIVE",
    },
  });

  // Entity name -> ID mapping for convenience
  const entityMap: Record<string, string> = {
    "Fund I": entity1.id,
    "Fund II": entity2.id,
    "Fund III": entity3.id,
    "Growth Fund": entity4.id,
    "Sidecar A": entity5.id,
    "Sidecar B": entity6.id,
    "Co-Invest SPV": entity7.id,
    "Credit Opp I": entity8.id,
    "RE SPV": entity9.id,
  };

  // ============================================================
  // ACCOUNTING CONNECTIONS (one per entity)
  // ============================================================
  console.log("Creating accounting connections...");

  const acctConnections = [
    { id: "acct-1", entityId: entity1.id, provider: "QBO" as const, syncStatus: "CONNECTED" as const, lastSyncAt: new Date("2025-02-28T23:48:00Z"), unreconciledItems: 0 },
    { id: "acct-2", entityId: entity2.id, provider: "QBO" as const, syncStatus: "CONNECTED" as const, lastSyncAt: new Date("2025-02-28T23:45:00Z"), unreconciledItems: 3 },
    { id: "acct-3", entityId: entity3.id, provider: "XERO" as const, syncStatus: "CONNECTED" as const, lastSyncAt: new Date("2025-02-28T22:00:00Z"), unreconciledItems: 2 },
    { id: "acct-4", entityId: entity4.id, provider: "QBO" as const, syncStatus: "CONNECTED" as const, lastSyncAt: new Date("2025-02-28T23:45:00Z"), unreconciledItems: 0 },
    { id: "acct-5", entityId: entity5.id, provider: "QBO" as const, syncStatus: "CONNECTED" as const, lastSyncAt: new Date("2025-02-28T23:45:00Z"), unreconciledItems: 0 },
    { id: "acct-6", entityId: entity6.id, provider: "QBO" as const, syncStatus: "CONNECTED" as const, lastSyncAt: new Date("2025-02-28T23:45:00Z"), unreconciledItems: 1 },
    { id: "acct-7", entityId: entity7.id, provider: "QBO" as const, syncStatus: "CONNECTED" as const, lastSyncAt: new Date("2025-02-28T23:45:00Z"), unreconciledItems: 0 },
    { id: "acct-8", entityId: entity8.id, provider: "QBO" as const, syncStatus: "CONNECTED" as const, lastSyncAt: new Date("2025-02-28T23:30:00Z"), unreconciledItems: 1 },
    { id: "acct-9", entityId: entity9.id, provider: "QBO" as const, syncStatus: "ERROR" as const, lastSyncAt: new Date("2025-02-26T12:00:00Z"), unreconciledItems: 0 },
  ];

  for (const ac of acctConnections) {
    await prisma.accountingConnection.create({ data: ac });
  }

  // ============================================================
  // INVESTORS (6)
  // ============================================================
  console.log("Creating investors...");

  const investor1 = await prisma.investor.create({
    data: {
      id: "investor-1",
      name: "CalPERS",
      investorType: "Pension",
      totalCommitted: 165_000_000,
      kycStatus: "Verified",
      advisoryBoard: true,
      contactPreference: "email",
    },
  });

  const investor2 = await prisma.investor.create({
    data: {
      id: "investor-2",
      name: "Harvard Endowment",
      investorType: "Endowment",
      totalCommitted: 95_000_000,
      kycStatus: "Verified",
      advisoryBoard: true,
      contactPreference: "email",
    },
  });

  const investor3 = await prisma.investor.create({
    data: {
      id: "investor-3",
      name: "Wellington Family Office",
      investorType: "Family Office",
      totalCommitted: 55_000_000,
      kycStatus: "Verified",
      advisoryBoard: false,
      contactPreference: "text",
    },
  });

  const investor4 = await prisma.investor.create({
    data: {
      id: "investor-4",
      name: "Meridian Partners FoF",
      investorType: "Fund of Funds",
      totalCommitted: 120_000_000,
      kycStatus: "Verified",
      advisoryBoard: false,
      contactPreference: "email",
    },
  });

  const investor5 = await prisma.investor.create({
    data: {
      id: "investor-5",
      name: "Pacific Rim Sovereign",
      investorType: "Sovereign Wealth",
      totalCommitted: 180_000_000,
      kycStatus: "Expiring",
      advisoryBoard: true,
      contactPreference: "email",
    },
  });

  const investor6 = await prisma.investor.create({
    data: {
      id: "investor-6",
      name: "Greenfield Insurance",
      investorType: "Insurance",
      totalCommitted: 35_000_000,
      kycStatus: "Verified",
      advisoryBoard: false,
      contactPreference: "email",
    },
  });

  // ============================================================
  // COMMITMENTS (investor <-> entity links with amounts)
  // ============================================================
  console.log("Creating commitments...");

  // CalPERS: Fund I, Fund II, Growth Fund, Sidecar A, RE SPV
  // total committed $165M spread across entities
  const commitments = [
    { id: "commit-1-1", investorId: investor1.id, entityId: entity1.id, amount: 50_000_000, calledAmount: 45_000_000 },
    { id: "commit-1-2", investorId: investor1.id, entityId: entity2.id, amount: 75_000_000, calledAmount: 46_500_000 },
    { id: "commit-1-4", investorId: investor1.id, entityId: entity4.id, amount: 15_000_000, calledAmount: 8_400_000 },
    { id: "commit-1-5", investorId: investor1.id, entityId: entity5.id, amount: 20_000_000, calledAmount: 18_000_000 },
    { id: "commit-1-9", investorId: investor1.id, entityId: entity9.id, amount: 5_000_000, calledAmount: 5_000_000 },

    // Harvard: Fund I, Fund II, Sidecar B ($95M)
    { id: "commit-2-1", investorId: investor2.id, entityId: entity1.id, amount: 40_000_000, calledAmount: 36_000_000 },
    { id: "commit-2-2", investorId: investor2.id, entityId: entity2.id, amount: 47_000_000, calledAmount: 29_200_000 },
    { id: "commit-2-6", investorId: investor2.id, entityId: entity6.id, amount: 8_000_000, calledAmount: 7_000_000 },

    // Wellington: Fund II, Fund III, Co-Invest SPV ($55M)
    { id: "commit-3-2", investorId: investor3.id, entityId: entity2.id, amount: 25_000_000, calledAmount: 15_500_000 },
    { id: "commit-3-3", investorId: investor3.id, entityId: entity3.id, amount: 20_000_000, calledAmount: 14_100_000 },
    { id: "commit-3-7", investorId: investor3.id, entityId: entity7.id, amount: 10_000_000, calledAmount: 8_000_000 },

    // Meridian Partners: Fund I, Fund II, Growth Fund, Credit Opp I ($120M)
    { id: "commit-4-1", investorId: investor4.id, entityId: entity1.id, amount: 30_000_000, calledAmount: 27_000_000 },
    { id: "commit-4-2", investorId: investor4.id, entityId: entity2.id, amount: 50_000_000, calledAmount: 31_000_000 },
    { id: "commit-4-4", investorId: investor4.id, entityId: entity4.id, amount: 20_000_000, calledAmount: 11_200_000 },
    { id: "commit-4-8", investorId: investor4.id, entityId: entity8.id, amount: 20_000_000, calledAmount: 14_000_000 },

    // Pacific Rim: Fund II, Fund III, Co-Invest SPV ($180M)
    { id: "commit-5-2", investorId: investor5.id, entityId: entity2.id, amount: 100_000_000, calledAmount: 62_000_000 },
    { id: "commit-5-3", investorId: investor5.id, entityId: entity3.id, amount: 65_000_000, calledAmount: 46_000_000 },
    { id: "commit-5-7", investorId: investor5.id, entityId: entity7.id, amount: 15_000_000, calledAmount: 12_000_000 },

    // Greenfield: Fund I, Credit Opp I ($35M)
    { id: "commit-6-1", investorId: investor6.id, entityId: entity1.id, amount: 15_000_000, calledAmount: 13_500_000 },
    { id: "commit-6-8", investorId: investor6.id, entityId: entity8.id, amount: 20_000_000, calledAmount: 14_000_000 },
  ];

  for (const c of commitments) {
    await prisma.commitment.create({ data: c });
  }

  // ============================================================
  // SIDE LETTERS (4)
  // ============================================================
  console.log("Creating side letters...");

  await prisma.sideLetter.createMany({
    data: [
      { id: "sl-1", investorId: investor1.id, entityId: entity2.id, terms: "MFN, 25% mgmt fee discount, co-invest rights, LPAC seat" },
      { id: "sl-2", investorId: investor5.id, entityId: entity2.id, terms: "MFN, no carry on first $5M, quarterly reporting in Japanese" },
      { id: "sl-3", investorId: investor3.id, entityId: entity3.id, terms: "Reduced carry (15%), quarterly co-invest right of first refusal" },
      { id: "sl-4", investorId: investor2.id, entityId: entity1.id, terms: "LPAC seat, annual meeting presentation slot" },
    ],
  });

  // ============================================================
  // ASSETS (11)
  // ============================================================
  console.log("Creating assets...");

  const asset1 = await prisma.asset.create({
    data: {
      id: "asset-1",
      name: "NovaTech AI",
      assetClass: "OPERATING_BUSINESS", capitalInstrument: "EQUITY", participationStructure: "DIRECT_GP",
      sector: "Technology",
      status: "ACTIVE",
      costBasis: 45_000_000,
      fairValue: 112_000_000,
      moic: 2.49,
      irr: 0.38,
      incomeType: "Dividends",
      hasBoardSeat: true,
      entryDate: new Date("2020-03-01"),
      nextReview: new Date("2025-03-15"),
    },
  });

  const asset2 = await prisma.asset.create({
    data: {
      id: "asset-2",
      name: "Helix Therapeutics",
      assetClass: "OPERATING_BUSINESS", capitalInstrument: "EQUITY", participationStructure: "DIRECT_GP",
      sector: "Healthcare",
      status: "ACTIVE",
      costBasis: 32_000_000,
      fairValue: 56_000_000,
      moic: 1.75,
      irr: 0.22,
      incomeType: "None",
      hasBoardSeat: false,
      entryDate: new Date("2021-06-01"),
      nextReview: new Date("2025-06-01"),
    },
  });

  const asset3 = await prisma.asset.create({
    data: {
      id: "asset-3",
      name: "Meridian Credit Facility",
      assetClass: "REAL_ESTATE", capitalInstrument: "DEBT", participationStructure: "DIRECT_GP",
      sector: "Industrials",
      status: "ACTIVE",
      costBasis: 15_000_000,
      fairValue: 15_000_000,
      moic: 1.0,
      irr: 0.11,
      incomeType: "SOFR+450bps",
      hasBoardSeat: false,
      entryDate: new Date("2023-06-01"),
      nextReview: new Date("2025-03-30"),
    },
  });

  const asset4 = await prisma.asset.create({
    data: {
      id: "asset-4",
      name: "123 Industrial Blvd",
      assetClass: "REAL_ESTATE", capitalInstrument: "EQUITY", participationStructure: "DIRECT_GP",
      sector: "Industrial RE",
      status: "ACTIVE",
      costBasis: 22_000_000,
      fairValue: 28_500_000,
      moic: 1.30,
      irr: 0.14,
      incomeType: "Rental NOI",
      hasBoardSeat: false,
      entryDate: new Date("2021-01-01"),
      nextReview: new Date("2025-06-01"),
    },
  });

  const asset5 = await prisma.asset.create({
    data: {
      id: "asset-5",
      name: "Sequoia Capital Fund XVI",
      assetClass: "OPERATING_BUSINESS", capitalInstrument: "EQUITY", participationStructure: "LP_STAKE_SILENT_PARTNER",
      sector: "VC",
      status: "ACTIVE",
      costBasis: 10_000_000,
      fairValue: 14_200_000,
      moic: 1.42,
      irr: 0.18,
      incomeType: "Distributions",
      hasBoardSeat: false,
      entryDate: new Date("2022-09-01"),
      nextReview: new Date("2025-04-15"),
    },
  });

  const asset6 = await prisma.asset.create({
    data: {
      id: "asset-6",
      name: "Blackstone RE Fund IX",
      assetClass: "REAL_ESTATE", capitalInstrument: "EQUITY", participationStructure: "LP_STAKE_SILENT_PARTNER",
      sector: "Real Estate",
      status: "ACTIVE",
      costBasis: 25_000_000,
      fairValue: 27_800_000,
      moic: 1.11,
      irr: 0.09,
      incomeType: "Distributions",
      hasBoardSeat: false,
      entryDate: new Date("2023-01-01"),
      nextReview: new Date("2025-05-01"),
    },
  });

  const asset7 = await prisma.asset.create({
    data: {
      id: "asset-7",
      name: "SolarGrid Energy",
      assetClass: "INFRASTRUCTURE", capitalInstrument: "EQUITY", participationStructure: "CO_INVEST_JV_PARTNERSHIP",
      sector: "Energy",
      status: "EXITED",
      costBasis: 20_000_000,
      fairValue: 58_000_000,
      moic: 2.90,
      irr: 0.41,
      incomeType: null,
      hasBoardSeat: false,
      entryDate: new Date("2019-06-01"),
      nextReview: null,
    },
  });

  const asset8 = await prisma.asset.create({
    data: {
      id: "asset-8",
      name: "CloudBase Systems",
      assetClass: "NON_CORRELATED", capitalInstrument: "EQUITY", participationStructure: "LP_STAKE_SILENT_PARTNER",
      sector: "Technology",
      status: "ACTIVE",
      costBasis: 8_000_000,
      fairValue: 11_500_000,
      moic: 1.44,
      irr: 0.21,
      incomeType: null,
      hasBoardSeat: false,
      entryDate: new Date("2022-11-01"),
      nextReview: new Date("2025-04-20"),
    },
  });

  const asset9 = await prisma.asset.create({
    data: {
      id: "asset-9",
      name: "FreshRoute Bridge Loan",
      assetClass: "DIVERSIFIED", capitalInstrument: "EQUITY", participationStructure: "CO_INVEST_JV_PARTNERSHIP",
      sector: "Logistics",
      status: "ACTIVE",
      costBasis: 5_000_000,
      fairValue: 5_000_000,
      moic: 1.0,
      irr: 0.13,
      incomeType: "12% fixed",
      hasBoardSeat: false,
      entryDate: new Date("2024-01-01"),
      nextReview: new Date("2025-07-01"),
    },
  });

  const asset10 = await prisma.asset.create({
    data: {
      id: "asset-10",
      name: "Midwest Sports Fund II",
      assetClass: "DIVERSIFIED", capitalInstrument: "DEBT", participationStructure: "LP_STAKE_SILENT_PARTNER",
      sector: "Sports",
      status: "ACTIVE",
      costBasis: 5_000_000,
      fairValue: 5_800_000,
      moic: 1.16,
      irr: 0.10,
      incomeType: "Distributions",
      hasBoardSeat: false,
      entryDate: new Date("2024-03-01"),
      nextReview: new Date("2025-06-15"),
    },
  });

  const asset11 = await prisma.asset.create({
    data: {
      id: "asset-11",
      name: "LifeBridge Insurance Fund",
      assetClass: "REAL_ESTATE", capitalInstrument: "EQUITY", participationStructure: "DIRECT_GP",
      sector: "Life Insurance",
      status: "ACTIVE",
      costBasis: 7_000_000,
      fairValue: 7_400_000,
      moic: 1.06,
      irr: 0.07,
      incomeType: "Distributions",
      hasBoardSeat: false,
      entryDate: new Date("2024-06-01"),
      nextReview: new Date("2025-09-01"),
    },
  });

  // ============================================================
  // ASSET ENTITY ALLOCATIONS
  // ============================================================
  console.log("Creating asset-entity allocations...");

  const allocations = [
    // NovaTech AI -> Fund I, Fund II
    { id: "alloc-1-1", assetId: asset1.id, entityId: entity1.id, allocationPercent: 50 },
    { id: "alloc-1-2", assetId: asset1.id, entityId: entity2.id, allocationPercent: 50 },
    // Helix Therapeutics -> Fund I
    { id: "alloc-2-1", assetId: asset2.id, entityId: entity1.id, allocationPercent: 100 },
    // Meridian Credit Facility -> Credit Opp I
    { id: "alloc-3-8", assetId: asset3.id, entityId: entity8.id, allocationPercent: 100 },
    // 123 Industrial Blvd -> Fund I
    { id: "alloc-4-1", assetId: asset4.id, entityId: entity1.id, allocationPercent: 100 },
    // Sequoia Capital Fund XVI -> Fund III
    { id: "alloc-5-3", assetId: asset5.id, entityId: entity3.id, allocationPercent: 100 },
    // Blackstone RE Fund IX -> Fund III
    { id: "alloc-6-3", assetId: asset6.id, entityId: entity3.id, allocationPercent: 100 },
    // SolarGrid Energy -> Fund I
    { id: "alloc-7-1", assetId: asset7.id, entityId: entity1.id, allocationPercent: 100 },
    // CloudBase Systems -> Co-Invest SPV
    { id: "alloc-8-7", assetId: asset8.id, entityId: entity7.id, allocationPercent: 100 },
    // FreshRoute Bridge Loan -> Credit Opp I
    { id: "alloc-9-8", assetId: asset9.id, entityId: entity8.id, allocationPercent: 100 },
    // Midwest Sports Fund II -> Growth Fund
    { id: "alloc-10-4", assetId: asset10.id, entityId: entity4.id, allocationPercent: 100 },
    // LifeBridge Insurance Fund -> Growth Fund
    { id: "alloc-11-4", assetId: asset11.id, entityId: entity4.id, allocationPercent: 100 },
  ];

  for (const a of allocations) {
    await prisma.assetEntityAllocation.create({ data: a });
  }

  // ============================================================
  // ASSET TYPE-SPECIFIC DETAILS
  // ============================================================
  console.log("Creating asset type-specific details...");

  // AssetEquityDetails for NovaTech AI
  await prisma.assetEquityDetails.create({
    data: {
      id: "eq-1",
      assetId: asset1.id,
      instrument: "Series B Preferred",
      ownership: "18.4%",
      revenue: "$85M",
      ebitda: "$22M",
      growth: "+42% YoY",
      employees: 340,
    },
  });

  // AssetCreditDetails for Meridian Credit Facility
  await prisma.assetCreditDetails.create({
    data: {
      id: "cred-1",
      assetId: asset3.id,
      instrument: "Senior Secured",
      principal: "$15M",
      rate: "SOFR+450bps",
      maturity: "2028-06-15",
      ltv: "62%",
      dscr: "1.8x",
      nextPaymentDate: "2025-03-15",
      accruedInterest: "$187,500",
    },
  });

  // AssetCreditDetails for FreshRoute Bridge Loan
  await prisma.assetCreditDetails.create({
    data: {
      id: "cred-2",
      assetId: asset9.id,
      instrument: "Bridge Loan",
      principal: "$5M",
      rate: "12% Fixed",
      maturity: "2026-01-15",
      ltv: "55%",
      dscr: "2.1x",
      nextPaymentDate: "2025-04-01",
      accruedInterest: "$50,000",
    },
  });

  // AssetRealEstateDetails for 123 Industrial Blvd
  await prisma.assetRealEstateDetails.create({
    data: {
      id: "re-1",
      assetId: asset4.id,
      propertyType: "Industrial Warehouse",
      squareFeet: "185,000",
      occupancy: "94%",
      noi: "$1,920,000",
      capRate: "6.7%",
      rentPerSqft: "$12.50/sqft",
      debt: "$14.2M @ 4.5%",
      debtDscr: "1.65x",
    },
  });

  // AssetFundLPDetails for Sequoia Capital Fund XVI
  await prisma.assetFundLPDetails.create({
    data: {
      id: "fundlp-1",
      assetId: asset5.id,
      gpName: "Sequoia Capital",
      commitment: "$15M",
      calledAmount: "$10M (67%)",
      uncalledAmount: "$5M",
      distributions: "$2.1M",
      gpNav: "$14.2M",
      navDate: "2024-12-31",
      gpIrr: "24.5%",
      gpTvpi: "1.63x",
      vintage: 2022,
      strategy: "Early-stage VC",
    },
  });

  // AssetFundLPDetails for Blackstone RE Fund IX
  await prisma.assetFundLPDetails.create({
    data: {
      id: "fundlp-2",
      assetId: asset6.id,
      gpName: "Blackstone",
      commitment: "$30M",
      calledAmount: "$25M (83%)",
      uncalledAmount: "$5M",
      distributions: "$3.2M",
      gpNav: "$27.8M",
      navDate: "2024-12-31",
      gpIrr: "12.1%",
      gpTvpi: "1.24x",
      vintage: 2022,
      strategy: "Opportunistic RE",
    },
  });

  // AssetFundLPDetails for Midwest Sports Fund II
  await prisma.assetFundLPDetails.create({
    data: {
      id: "fundlp-3",
      assetId: asset10.id,
      gpName: "Midwest Sports Capital",
      commitment: "$8M",
      calledAmount: "$5M",
      uncalledAmount: "$3M",
      distributions: "$0",
      gpNav: "$5.8M",
      navDate: "2024-12-31",
      gpIrr: "N/A",
      gpTvpi: "1.16x",
      vintage: 2024,
      strategy: "Sports equity",
    },
  });

  // AssetFundLPDetails for LifeBridge Insurance Fund
  await prisma.assetFundLPDetails.create({
    data: {
      id: "fundlp-4",
      assetId: asset11.id,
      gpName: "LifeBridge Capital",
      commitment: "$10M",
      calledAmount: "$7M",
      uncalledAmount: "$3M",
      distributions: "$0.5M",
      gpNav: "$7.4M",
      navDate: "2024-12-31",
      gpIrr: "8.2%",
      gpTvpi: "1.13x",
      vintage: 2024,
      strategy: "Life settlements",
    },
  });

  // ============================================================
  // LEASES (3 for 123 Industrial Blvd)
  // ============================================================
  console.log("Creating leases...");

  await prisma.lease.create({
    data: {
      id: "lease-1",
      assetId: asset4.id,
      tenantName: "Acme Distribution",
      squareFootage: "120,000",
      leaseType: "NNN",
      baseRentAnnual: 1_500_000,
      baseRentMonthly: 125_000,
      leaseStartDate: new Date("2021-01-01"),
      leaseEndDate: new Date("2028-12-31"),
      currentStatus: "ACTIVE",
      rentPercentOfTotal: "65%",
    },
  });

  await prisma.lease.create({
    data: {
      id: "lease-2",
      assetId: asset4.id,
      tenantName: "QuickShip Logistics",
      squareFootage: "45,000",
      leaseType: "NNN",
      baseRentAnnual: 540_000,
      baseRentMonthly: 45_000,
      leaseStartDate: new Date("2022-01-01"),
      leaseEndDate: new Date("2027-12-31"),
      currentStatus: "ACTIVE",
      rentPercentOfTotal: "25%",
    },
  });

  await prisma.lease.create({
    data: {
      id: "lease-3",
      assetId: asset4.id,
      tenantName: "Vacant",
      squareFootage: "20,000",
      leaseType: "NNN",
      currentStatus: "EXPIRED",
      rentPercentOfTotal: "10%",
    },
  });

  // ============================================================
  // CREDIT AGREEMENTS + COVENANTS
  // ============================================================
  console.log("Creating credit agreements and covenants...");

  const creditAgreement = await prisma.creditAgreement.create({
    data: {
      id: "ca-1",
      assetId: asset3.id,
      borrowerName: "Meridian Industries",
      agreementType: "LOAN_AGREEMENT",
      originalPrincipal: 15_000_000,
      currentPrincipal: 15_000_000,
      interestRateType: "FLOATING",
      referenceRate: "SOFR",
      spreadBps: 450,
      paymentFrequency: "QUARTERLY",
      maturityDate: new Date("2028-06-15"),
      subordination: "SENIOR",
      currentStatus: "PERFORMING",
    },
  });

  // 4 covenants for Meridian
  await prisma.covenant.createMany({
    data: [
      {
        id: "cov-1",
        agreementId: creditAgreement.id,
        name: "Max Leverage",
        covenantType: "FINANCIAL",
        metric: "Leverage Ratio",
        thresholdOperator: "<=",
        thresholdValue: 4.5,
        lastTestedValue: "3.2x",
        currentStatus: "COMPLIANT",
        testFrequency: "quarterly",
      },
      {
        id: "cov-2",
        agreementId: creditAgreement.id,
        name: "Min DSCR",
        covenantType: "FINANCIAL",
        metric: "DSCR",
        thresholdOperator: ">=",
        thresholdValue: 1.25,
        lastTestedValue: "1.8x",
        currentStatus: "COMPLIANT",
        testFrequency: "quarterly",
      },
      {
        id: "cov-3",
        agreementId: creditAgreement.id,
        name: "Min Liquidity",
        covenantType: "FINANCIAL",
        metric: "Liquidity",
        thresholdOperator: ">=",
        thresholdValue: 2_000_000,
        lastTestedValue: "$4.1M",
        currentStatus: "COMPLIANT",
        testFrequency: "quarterly",
      },
      {
        id: "cov-4",
        agreementId: creditAgreement.id,
        name: "Max CapEx",
        covenantType: "FINANCIAL",
        metric: "CapEx",
        thresholdOperator: "<=",
        thresholdValue: 3_000_000,
        lastTestedValue: "$2.1M",
        currentStatus: "COMPLIANT",
        testFrequency: "annual",
      },
    ],
  });

  // 3 credit payments for Meridian
  await prisma.creditPayment.createMany({
    data: [
      { id: "cpmt-1", agreementId: creditAgreement.id, date: new Date("2025-03-15"), paymentType: "Interest", amount: 187_500, status: "Upcoming" },
      { id: "cpmt-2", agreementId: creditAgreement.id, date: new Date("2024-12-15"), paymentType: "Interest", amount: 182_000, status: "Received" },
      { id: "cpmt-3", agreementId: creditAgreement.id, date: new Date("2024-09-15"), paymentType: "Interest", amount: 178_500, status: "Received" },
    ],
  });

  // ============================================================
  // VALUATIONS (3 for NovaTech AI)
  // ============================================================
  console.log("Creating valuations...");

  await prisma.valuation.createMany({
    data: [
      {
        id: "val-1",
        assetId: asset1.id,
        valuationDate: new Date("2024-12-31"),
        method: "COMPARABLE_MULTIPLES",
        fairValue: 112_000_000,
        moic: 2.49,
        status: "APPROVED",
        approvedBy: "James Kim",
        approvedAt: new Date("2025-01-15"),
      },
      {
        id: "val-2",
        assetId: asset1.id,
        valuationDate: new Date("2024-09-30"),
        method: "COMPARABLE_MULTIPLES",
        fairValue: 98_000_000,
        moic: 2.18,
        status: "APPROVED",
        approvedBy: "James Kim",
        approvedAt: new Date("2024-10-15"),
      },
      {
        id: "val-3",
        assetId: asset1.id,
        valuationDate: new Date("2024-06-30"),
        method: "LAST_ROUND",
        fairValue: 90_000_000,
        moic: 2.0,
        status: "APPROVED",
        approvedBy: "James Kim",
        approvedAt: new Date("2024-07-15"),
      },
    ],
  });

  // ============================================================
  // DEALS (5 pipeline deals)
  // ============================================================
  console.log("Creating deals...");

  const deal1 = await prisma.deal.create({
    data: {
      id: "deal-1",
      firmId: firm.id,
      entityId: "entity-7",
      name: "Apex Manufacturing",
      assetClass: "DIVERSIFIED", capitalInstrument: "EQUITY", participationStructure: "DIRECT_GP",
      sector: "Industrials",
      stage: "IC_REVIEW",
      targetSize: "$30-40M",
      targetCheckSize: "$12-15M",
      targetReturn: "2.5-3.0x MOIC / 20-25% IRR",
      dealLeadId: "user-jk",
      counterparty: "Apex Industries Inc.",
      aiScore: 82,
      aiFlag: "Strong margins, customer concentration risk",
      description: "Majority acquisition of specialty manufacturer serving aerospace & defense.",
      thesisNotes: "Strong recurring revenue from long-term contracts; margin expansion opportunity through operational improvements.",
      investmentRationale: "Niche industrial manufacturer with defensible market position and margin expansion potential through operational improvements. Long-term DoD contracts provide revenue visibility.",
      additionalContext: "Seller is motivated — founder retirement. Exclusive negotiation window through mid-March. Management team willing to roll 30% equity.",
    },
  });

  const deal2 = await prisma.deal.create({
    data: {
      id: "deal-2",
      firmId: firm.id,
      name: "Beacon Health",
      assetClass: "DIVERSIFIED", capitalInstrument: "EQUITY", participationStructure: "CO_INVEST_JV_PARTNERSHIP",
      sector: "Healthcare",
      stage: "DUE_DILIGENCE",
      targetSize: "$20-25M",
      targetCheckSize: "$8-10M",
      targetReturn: "3.0x MOIC / 25-30% IRR",
      dealLeadId: "user-sm",
      counterparty: "Beacon Healthcare Group",
      aiScore: 74,
      aiFlag: "Regulatory pathway uncertain",
      description: "Growth equity investment in multi-site outpatient clinic platform.",
      thesisNotes: "De novo expansion model with strong same-store revenue growth; regulatory risk around reimbursement changes.",
      investmentRationale: "Healthcare services platform play with proven unit economics. Opportunity to consolidate fragmented outpatient market with de novo expansion model showing 15% SSS growth.",
      additionalContext: "Co-invest opportunity alongside Lead GP. Management team has 20+ year healthcare ops experience. CMS reimbursement review expected Q2 2026.",
    },
  });

  const deal3 = await prisma.deal.create({
    data: {
      id: "deal-3",
      firmId: firm.id,
      name: "UrbanNest PropTech",
      assetClass: "REAL_ESTATE", capitalInstrument: "EQUITY", participationStructure: "DIRECT_GP",
      sector: "RE Tech",
      stage: "SCREENING",
      targetSize: "$10M",
      targetCheckSize: "$3-5M",
      targetReturn: "3.0x MOIC / 25% IRR",
      dealLeadId: "user-jk",
      source: "Advisor referral - Goldman Sachs",
      counterparty: "UrbanNest Inc.",
      aiScore: null,
      aiFlag: null,
      description: "PropTech SaaS platform enabling 30% cost reduction for commercial property managers through AI-powered building operations.",
      thesisNotes: "Series A stage with $4M ARR growing 120% YoY. Capital efficient model with 80% gross margins.",
      investmentRationale: "PropTech platform with strong ARR growth. Opportunity to invest at attractive valuation before Series B. Technology enables 30% cost reduction for commercial property managers with measurable ROI.",
      additionalContext: "Founder previously exited a SaaS company to Oracle for $180M. Strong technical team of 25. Competing term sheets expected by end of month. Board seat available.",
    },
  });

  const deal4 = await prisma.deal.create({
    data: {
      id: "deal-4",
      firmId: firm.id,
      name: "Ridgeline Senior Debt",
      assetClass: "REAL_ESTATE", capitalInstrument: "DEBT", participationStructure: "DIRECT_GP",
      sector: "Real Estate",
      stage: "DUE_DILIGENCE",
      targetSize: "$8M",
      targetCheckSize: "$8M",
      targetReturn: "SOFR+350bps / 10-12% gross yield",
      dealLeadId: "user-al",
      counterparty: "Ridgeline Properties LLC",
      gpName: "Ridgeline Capital Partners",
      aiScore: 88,
      aiFlag: "Strong collateral, low LTV",
      description: "Senior secured credit facility for stabilized commercial real estate portfolio.",
      thesisNotes: "Low LTV, strong DSCR coverage, experienced sponsor with track record.",
      investmentRationale: "Low-risk credit opportunity with strong collateral coverage. Sponsor has 15-year track record with zero defaults. Portfolio is 95% leased to credit tenants.",
      additionalContext: "Existing relationship with sponsor from prior deal. Refinancing existing bank facility at better terms for borrower. 24-month term with 6-month extension option.",
    },
  });

  const deal5 = await prisma.deal.create({
    data: {
      id: "deal-5",
      firmId: firm.id,
      name: "Nordic Wind Fund III",
      assetClass: "INFRASTRUCTURE", capitalInstrument: "EQUITY", participationStructure: "LP_STAKE_SILENT_PARTNER",
      sector: "Infrastructure",
      stage: "SCREENING",
      targetSize: "$15M LP",
      targetCheckSize: "$15M",
      targetReturn: "1.8-2.0x MOIC / 12-15% net IRR",
      dealLeadId: "user-sm",
      gpName: "Nordic Wind Capital",
      source: "GP direct outreach",
      aiScore: null,
      aiFlag: null,
      description: "LP commitment to Nordic Wind Fund III focused on Northern European onshore wind assets.",
      investmentRationale: "Infrastructure fund with strong GP track record (Fund I: 1.9x, Fund II: on pace for 1.7x). Contracted cash flows with 90%+ revenue visibility. ESG-aligned strategy.",
    },
  });

  // ============================================================
  // ADDITIONAL DEALS — Dead, Closed, and Stale (for richer testing)
  // ============================================================
  console.log("Creating additional deals (dead, closed, stale)...");

  const deal6 = await prisma.deal.create({
    data: {
      id: "deal-6",
      firmId: firm.id,
      name: "Pinnacle Logistics",
      assetClass: "DIVERSIFIED", capitalInstrument: "EQUITY", participationStructure: "DIRECT_GP",
      sector: "Logistics",
      stage: "DEAD",
      targetSize: "$18-22M",
      targetCheckSize: "$8-10M",
      targetReturn: "2.0-2.5x MOIC / 18-22% IRR",
      dealLeadId: "user-jk",
      counterparty: "Pinnacle Transport Inc.",
      aiScore: 65,
      aiFlag: "Cyclical revenue, thin margins",
      killReason: "Pricing",
      killReasonText: "Seller expectations at 9x EBITDA well above our 6-7x comfort zone. Unable to bridge the valuation gap after two rounds of negotiation.",
      previousStage: "DUE_DILIGENCE",
      description: "Platform acquisition of regional third-party logistics provider specializing in cold-chain delivery.",
    },
  });

  const deal7 = await prisma.deal.create({
    data: {
      id: "deal-7",
      firmId: firm.id,
      name: "GreenLeaf Cannabis REIT",
      assetClass: "REAL_ESTATE", capitalInstrument: "EQUITY", participationStructure: "LP_STAKE_SILENT_PARTNER",
      sector: "Cannabis",
      stage: "DEAD",
      targetSize: "$25M",
      targetCheckSize: "$10M",
      targetReturn: "1.5-2.0x MOIC / 15% IRR",
      dealLeadId: "user-sm",
      gpName: "GreenLeaf Properties",
      aiScore: 42,
      aiFlag: "Federal regulatory risk, banking partner uncertainty",
      killReason: "Risk",
      killReasonText: "IC voted unanimously to decline. Federal legalization timeline too uncertain and banking partner pulled out mid-diligence.",
      previousStage: "IC_REVIEW",
      description: "Cannabis-focused REIT investing in grow facilities and dispensary real estate across 5 legalized states.",
    },
  });

  const deal8 = await prisma.deal.create({
    data: {
      id: "deal-8",
      firmId: firm.id,
      name: "TerraVerde Renewable Energy",
      assetClass: "INFRASTRUCTURE", capitalInstrument: "EQUITY", participationStructure: "DIRECT_GP",
      sector: "Renewable Energy",
      stage: "DEAD",
      targetSize: "$50M",
      targetCheckSize: "$20M",
      targetReturn: "2.0x MOIC / 14% IRR",
      dealLeadId: "user-al",
      counterparty: "TerraVerde Holdings LLC",
      aiScore: 71,
      aiFlag: "Strong assets but sponsor governance concerns",
      killReason: "Sponsor",
      killReasonText: "Background check revealed ongoing litigation against GP principal. Compliance flagged as unacceptable counterparty risk.",
      previousStage: "DUE_DILIGENCE",
      description: "Co-investment in a portfolio of 6 solar farms and 2 wind installations totaling 320 MW of capacity.",
    },
  });

  const deal9 = await prisma.deal.create({
    data: {
      id: "deal-9",
      firmId: firm.id,
      entityId: "entity-1",
      name: "Cascade Timber Holdings",
      assetClass: "REAL_ESTATE", capitalInstrument: "EQUITY", participationStructure: "DIRECT_GP",
      sector: "Timber / Natural Resources",
      stage: "CLOSED",
      targetSize: "$35M",
      targetCheckSize: "$15M",
      targetReturn: "1.8-2.2x MOIC / 12-15% IRR",
      dealLeadId: "user-jk",
      counterparty: "Cascade Forest Products Inc.",
      aiScore: 91,
      aiFlag: "Low correlation, strong cash yield, inflation hedge",
      description: "Acquisition of 42,000 acres of timberland in the Pacific Northwest with existing harvest and carbon credit revenue streams.",
      investmentRationale: "Trophy timberland asset with dual income from sustainable harvest and carbon credits. Low correlation to equity markets. Strong inflation hedge.",
    },
  });

  const deal10 = await prisma.deal.create({
    data: {
      id: "deal-10",
      firmId: firm.id,
      name: "SilverLake Data Centers",
      assetClass: "INFRASTRUCTURE", capitalInstrument: "EQUITY", participationStructure: "DIRECT_GP",
      sector: "Technology Infrastructure",
      stage: "DUE_DILIGENCE",
      targetSize: "$100M",
      targetCheckSize: "$25M",
      targetReturn: "2.5-3.0x MOIC / 20-25% IRR",
      dealLeadId: "user-al",
      counterparty: "SilverLake Infrastructure Group",
      aiScore: 85,
      aiFlag: "AI demand tailwind, power cost risk",
      description: "Majority investment in a portfolio of 4 Tier III+ data centers in the Sun Belt region, positioned for AI/GPU workload expansion.",
      investmentRationale: "Explosive demand from AI compute needs. 95% occupancy with 3-year committed leases from hyperscalers. Power contracts locked through 2029.",
    },
  });

  // Link Cascade Timber closed deal → NovaTech as source asset (for testing View Asset link)
  // Actually create a dedicated asset for Cascade Timber
  const assetCascade = await prisma.asset.create({
    data: {
      id: "asset-cascade",
      name: "Cascade Timber Holdings",
      assetClass: "REAL_ESTATE", capitalInstrument: "EQUITY", participationStructure: "DIRECT_GP",
      sector: "Timber / Natural Resources",
      status: "ACTIVE",
      costBasis: 15_000_000,
      fairValue: 17_200_000,
      moic: 1.15,
      irr: 0.12,
      incomeType: "Harvest + Carbon Credits",
      hasBoardSeat: true,
      entryDate: new Date("2025-11-01"),
      sourceDealId: "deal-9",
      nextReview: new Date("2026-06-01"),
    },
  });

  await prisma.assetEntityAllocation.create({
    data: {
      id: "alloc-cascade",
      assetId: assetCascade.id,
      entityId: "entity-1",
      allocationPercent: 100,
    },
  });

  // ============================================================
  // DD CATEGORY TEMPLATES (firm-level library)
  // Must be created before workstreams since workstreams are derived from templates
  // ============================================================
  console.log("Creating DD category templates...");

  const ddCategories = getDefaultDDCategoriesForFirm(firm.id);

  for (const cat of ddCategories) {
    await prisma.dDCategoryTemplate.create({ data: cat });
  }

  // ============================================================
  // DD WORKSTREAMS (scaffolding only — derived from DD category templates)
  // Uses the same logic as the screen route: UNIVERSAL + assetClass + DEBT
  // ============================================================
  console.log("Creating DD workstreams (empty scaffolding from templates)...");

  // Category name → analysis type mapping (mirrors src/lib/schemas.ts)
  const CATEGORY_NAME_TO_TYPE: Record<string, string> = {
    "Financial DD": "DD_FINANCIAL",
    "Legal DD": "DD_LEGAL",
    "Market DD": "DD_MARKET",
    "Tax DD": "DD_TAX",
    "Operational DD": "DD_OPERATIONAL",
    "ESG DD": "DD_ESG",
    "Collateral DD": "DD_COLLATERAL",
    "Tenant & Lease DD": "DD_TENANT_LEASE",
    "Customer DD": "DD_CUSTOMER",
    "Technology DD": "DD_TECHNOLOGY",
    "Regulatory & Permitting DD": "DD_REGULATORY",
    "Engineering DD": "DD_ENGINEERING",
    "Credit DD": "DD_CREDIT",
    "Commercial DD": "DD_COMMERCIAL",
    "Management DD": "DD_MANAGEMENT",
  };

  // Helper: get workstream templates for a deal based on asset class + instrument
  // Mirrors the screen route logic exactly
  function getTemplatesForDeal(
    assetClass: string,
    capitalInstrument: string | null,
    categories: { name: string; scope: string; sortOrder: number }[],
  ) {
    const scopes = new Set(["UNIVERSAL", assetClass]);
    if (capitalInstrument === "DEBT") scopes.add("DEBT");
    return categories
      .filter((c) => scopes.has(c.scope))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // All deals that should have workstreams scaffolded
  const dealsToScaffold = [
    { deal: deal1, prefix: "ws-1" }, // DIVERSIFIED, EQUITY  → 6 UNIVERSAL
    { deal: deal2, prefix: "ws-2" }, // DIVERSIFIED, EQUITY  → 6 UNIVERSAL
    { deal: deal3, prefix: "ws-3" }, // REAL_ESTATE, EQUITY  → 6 UNIVERSAL + 2 RE = 8
    { deal: deal4, prefix: "ws-4" }, // REAL_ESTATE, DEBT    → 6 UNIVERSAL + 2 RE + Credit DD = 9
    { deal: deal5, prefix: "ws-5" }, // INFRASTRUCTURE, EQUITY → 6 UNIVERSAL + 2 INFRA = 8
  ];

  for (const { deal, prefix } of dealsToScaffold) {
    const templates = getTemplatesForDeal(
      deal.assetClass,
      deal.capitalInstrument,
      ddCategories.map((c) => ({ name: c.name, scope: c.scope, sortOrder: c.sortOrder })),
    );

    for (let i = 0; i < templates.length; i++) {
      const t = templates[i];
      await prisma.dDWorkstream.create({
        data: {
          id: `${prefix}-${i + 1}`,
          dealId: deal.id,
          name: t.name,
          description: `Due diligence workstream for ${t.name.toLowerCase()}.`,
          analysisType: CATEGORY_NAME_TO_TYPE[t.name] || "DD_CUSTOM",
          sortOrder: i,
          status: "NOT_STARTED",
          totalTasks: 0,
          completedTasks: 0,
          aiGenerated: true,
        },
      });
    }

    console.log(`  → ${deal.name}: ${templates.length} workstreams (${templates.map((t) => t.name).join(", ")})`);
  }

  // AI Screening Results and DD Tasks removed — seed without AI output
  // so actual AI generation can be tested cleanly.

  // NOTE: DD category templates + workstreams are created above.
  // Full detailed instructions for each category are in getDefaultDDCategoriesForFirm().
  // The legacy verbose instructions block below is kept as reference only.
  if (false as unknown as boolean) {
  const _legacyRef = [
    {
      firmId: firm.id, name: "Financial DD", description: "Revenue/cash flow analysis, financial model, projections, quality of earnings",
      defaultInstructions: `Perform a comprehensive financial due diligence analysis.

Quality of Earnings:
- Revenue breakdown by customer/segment/geography
- Recurring vs one-time revenue identification
- EBITDA adjustments (add-backs, normalizations)
- Working capital trends and seasonality
- Pro forma vs reported gaps

Balance Sheet:
- Asset quality and impairment risks
- Debt maturity schedule and covenants
- Off-balance-sheet liabilities
- Cash vs accrual discrepancies
- Intercompany transactions to eliminate

Cash Flow:
- Free cash flow conversion rate
- Capex breakdown (maintenance vs growth)
- Cash flow bridge (EBITDA to FCF)
- Distributions capacity analysis

Projections Stress Test:
- Management case vs independent analysis
- Sensitivity on: revenue growth, margins, cost of capital
- Downside scenario: what breaks first

Red Flags to check: revenue recognition policies, related-party transactions, unusual accounting elections, deferred revenue/liability trends, customer concentration above 20%, pending contingent liabilities.

End with GO / NO-GO / NEEDS MORE INFO and specific follow-up questions for the sponsor.`,
      isDefault: true, scope: "UNIVERSAL", sortOrder: 1,
    },
    {
      firmId: firm.id, name: "Legal DD", description: "Corporate structure, contracts, litigation, IP",
      defaultInstructions: `Perform legal and structural due diligence analysis.

Entity Structure:
- Holding structure (who owns what, through which vehicles)
- Tax implications (pass-through, blocker, UBTI)
- Jurisdictional risks

Key Agreements:
- Purchase/subscription agreement: terms, reps & warranties, indemnification
- Side letters with preferential terms
- Management agreement: fees, carry, clawback
- Operating/partnership agreement: governance, voting, consent rights

Regulatory:
- Required licenses and permits status
- Pending or threatened litigation
- Environmental compliance (Phase I/II if RE)
- OFAC/sanctions/KYC/AML screening

Covenant Analysis (if debt):
- Financial covenants: type, threshold, test frequency, headroom
- Negative covenants: restricted payments, additional indebtedness
- Change of control provisions
- Default triggers and cure periods

For each risk: provide Severity, Likelihood, Mitigation, and Owner.
Flag deal-breakers prominently. End with conditions to satisfy before closing.`,
      isDefault: true, scope: "UNIVERSAL", sortOrder: 2,
    },
    {
      firmId: firm.id, name: "Tax DD", description: "Tax structure, compliance, entity elections",
      defaultInstructions: `Perform comprehensive tax due diligence analysis.

Tax Structure Review:
- Current entity structure and tax classification (pass-through, C-corp, REIT, etc.)
- Holding company and blocker entity analysis
- State and local tax nexus and apportionment
- International tax considerations if applicable

Entity Elections & Optimization:
- Section 754 election status and implications
- Check-the-box elections
- QOZ, REIT, or RIC qualification analysis
- Optimal structure for LP base (tax-exempt, foreign, taxable)

Compliance History:
- Federal and state tax return filing history (3+ years)
- Open audit periods and pending examinations
- Prior tax controversy or settlement history
- Estimated tax payment compliance

Tax Credits & Exposures:
- Available tax credits (R&D, energy, historic, NMTC, LIHTC)
- UBTI exposure analysis for tax-exempt investors
- Withholding tax obligations
- Transfer pricing documentation (if intercompany transactions)
- Contingent tax liabilities and FIN 48 reserves

Transaction Tax Implications:
- Step-up in basis opportunities (338(h)(10), Section 754)
- Depreciation and amortization schedules
- Installment sale or like-kind exchange eligibility
- Transaction costs allocation and deductibility

End with key tax risks, estimated exposure amounts, and recommended structural optimizations.`,
      isDefault: true, scope: "UNIVERSAL", sortOrder: 3,
    },
    {
      firmId: firm.id, name: "Operational DD", description: "Management, processes, technology, scalability",
      defaultInstructions: `Perform comprehensive operational due diligence analysis.

Management Assessment:
- Leadership team experience, tenure, and track record
- Key person risk and succession planning
- Organizational structure and reporting lines
- Compensation structure and retention mechanisms
- Board composition and governance effectiveness

Business Process Analysis:
- Core operational workflows and bottlenecks
- Quality control and compliance processes
- Supply chain dependencies and vendor concentration
- Procurement practices and cost management

Technology Infrastructure:
- Core systems (ERP, CRM, BI) maturity and integration
- Technical debt and modernization needs
- Data management, backup, and disaster recovery
- Cybersecurity posture and incident history

Scalability & Integration:
- Capacity utilization and expansion runway
- Unit economics at current vs projected scale
- Integration complexity for add-on acquisitions
- Shared services and centralization opportunities

Key Person & Talent Risk:
- Employee turnover rates by department
- Key employee contracts and non-competes
- Talent market dynamics and hiring pipeline
- Culture assessment and change management readiness

End with operational risk rating, key improvement opportunities, and estimated value creation from operational initiatives.`,
      isDefault: true, scope: "UNIVERSAL", sortOrder: 4,
    },
    {
      firmId: firm.id, name: "Market DD", description: "Market size, competitive landscape, positioning, comparable analysis",
      defaultInstructions: `Perform market, commercial, and comparable analysis due diligence.

Market Sizing:
- TAM / SAM / SOM with sources
- Market growth rate and key drivers
- Cycle position (early/growth/mature/declining)

Competitive Landscape:
- Top 5 competitors with market share estimates
- Competitive moats: brand, scale, IP, switching costs, network effects
- Threat of new entrants and substitutes
- Pricing power assessment

Customer Analysis:
- Customer segmentation and concentration
- Retention/churn rates (or lease renewal rates for RE)
- Customer acquisition cost and lifetime value

Industry Trends:
- Tailwinds and headwinds
- Regulatory direction
- Technology disruption risks

Real Estate Specific (if applicable):
- Submarket supply/demand dynamics
- Rent comp analysis
- Vacancy trends
- Cap rate trends for the asset type and geography

Transaction Comps:
- Search for recent M&A, investment, and financing transactions in the same sector/geography
- Deal size range: 0.5x to 3x the target, time period: last 3 years
- Build table: Date, Target, Acquirer/Investor, Deal Size, EV/EBITDA, EV/Revenue, Notes
- Median and mean multiples, range (25th to 75th percentile), trend over time

Public Market Comps (if applicable):
- Table: Ticker, Company, Market Cap, EV/EBITDA, EV/Revenue, Growth, Margin
- Trading vs transaction multiples gap
- Liquidity discount considerations

Valuation Benchmark:
- Where does the deal fall vs comps? Above median: justify the premium. Below median: identify discount factors
- Implied valuation range based on comp multiples

End with: is this a good market to deploy capital into right now, the fair value range, and whether the proposed entry represents a premium or discount.`,
      isDefault: true, scope: "UNIVERSAL", sortOrder: 5,
    },
    {
      firmId: firm.id, name: "ESG DD", description: "Environmental, social, governance, compliance",
      defaultInstructions: `Perform comprehensive ESG due diligence analysis.

Environmental Assessment:
- Carbon footprint and emissions profile (Scope 1, 2, 3)
- Climate risk exposure (physical and transition risks)
- Environmental liabilities and remediation obligations
- Resource efficiency (energy, water, waste)
- Regulatory compliance (EPA, state environmental agencies)
- Phase I/II environmental site assessment findings (if applicable)

Social Factors:
- Workforce demographics, diversity, and inclusion metrics
- Labor practices, safety record (OSHA incidents), and worker satisfaction
- Community impact and stakeholder relationships
- Supply chain labor and human rights standards
- Product safety and customer welfare
- Data privacy and consumer protection compliance

Governance Structure:
- Board independence, diversity, and expertise
- Executive compensation alignment with long-term value
- Ethics policies, whistleblower protections, and compliance programs
- Related-party transactions and conflicts of interest
- Shareholder rights and minority protections

ESG Framework Alignment:
- SASB materiality mapping for the relevant industry
- TCFD climate disclosure readiness
- UN SDG alignment opportunities
- ESG rating agency scores (if available)

Risk & Opportunity Assessment:
- Material ESG risks that could impact valuation
- ESG improvement opportunities that create value
- Estimated cost of ESG remediation or compliance gaps
- Reputational risk factors

End with ESG risk rating (HIGH/MEDIUM/LOW), key findings, and recommended ESG action items for the hold period.`,
      isDefault: true, scope: "UNIVERSAL", sortOrder: 6,
    },
    // Asset-class-specific categories
    {
      firmId: firm.id, name: "Collateral DD", description: "Property appraisals, site condition, title/lien positions, insurance",
      defaultInstructions: `Perform real estate collateral due diligence analysis.

Property Valuation:
- Independent appraisal review (methodology, comparable selection, cap rate)
- As-is vs as-stabilized valuation gap
- Replacement cost analysis
- Historical valuation trends for the asset and submarket

Physical Condition:
- Property condition assessment (PCA) findings
- Immediate repair needs vs deferred maintenance
- Capital expenditure reserve adequacy
- Remaining useful life of major building systems (HVAC, roof, elevator, parking)
- Seismic, flood zone, and natural hazard exposure

Title & Lien Analysis:
- Title search results and exception review
- Lien priority and intercreditor arrangements
- Easements, encroachments, and restrictions
- Survey review and boundary confirmation
- Zoning compliance and entitlement status

Insurance Review:
- Property insurance coverage adequacy (replacement cost vs actual cash value)
- Liability coverage limits
- Flood, earthquake, and windstorm coverage
- Business interruption / rent loss coverage
- Insurance claims history

Environmental:
- Phase I ESA findings and recognized environmental conditions
- Phase II requirements (if triggered)
- Asbestos, lead paint, mold, or radon issues
- Underground storage tank status

End with collateral risk rating and conditions for lending/investing.`,
      isDefault: false, scope: "REAL_ESTATE", sortOrder: 7,
    },
    {
      firmId: firm.id, name: "Tenant & Lease DD", description: "Tenant credit, lease terms, occupancy, rent comparables",
      defaultInstructions: `Perform tenant and lease due diligence analysis.

Tenant Credit Analysis:
- Tenant financial health (credit ratings, financial statements if available)
- Tenant concentration risk (% of base rent from top 5 tenants)
- Tenant industry diversification
- Government or investment-grade tenant percentage

Lease Terms Review:
- Weighted average lease term (WALT) and expiration schedule
- Rent escalation structures (fixed, CPI, percentage rent)
- Renewal options and tenant termination rights
- Tenant improvement allowances and free rent periods
- Co-tenancy and exclusivity clauses

Occupancy Analysis:
- Current physical and economic occupancy rates
- Historical occupancy trends (3-5 years)
- Submarket vacancy comparison
- Absorption rate and leasing velocity
- Dark space or subleased space identification

Rent Comparables:
- In-place rents vs market rents (mark-to-market analysis)
- Comparable lease transactions in the submarket
- Effective rent analysis (accounting for concessions)
- Rent growth projections based on supply/demand dynamics

Rollover Risk:
- Near-term lease expirations (0-3 years) as % of revenue
- Re-leasing cost estimates (TI, leasing commissions, downtime)
- Probability of renewal by tenant
- Downside scenario: key tenant departure impact on NOI

End with tenant quality assessment, rollover risk rating, and key lease-related findings.`,
      isDefault: false, scope: "REAL_ESTATE", sortOrder: 8,
    },
    {
      firmId: firm.id, name: "Customer DD", description: "Customer concentration, retention, cohort economics",
      defaultInstructions: `Perform customer due diligence analysis for operating businesses.

Customer Concentration:
- Revenue breakdown by top 10 customers ($ and %)
- Customer concentration trend over 3 years (improving or worsening)
- Contractual vs at-will revenue
- Customer switching costs and lock-in mechanisms

Retention & Churn:
- Gross and net revenue retention rates
- Cohort-level retention analysis (by vintage, segment, geography)
- Churn drivers and win-back success rates
- Customer satisfaction scores (NPS, CSAT) and trends

Unit Economics:
- Customer acquisition cost (CAC) by channel
- Customer lifetime value (LTV) and LTV/CAC ratio
- Payback period trends
- Gross margin by customer segment

Pipeline & Growth:
- Sales pipeline quality and conversion rates
- New customer win rate trends
- Cross-sell and upsell penetration
- Geographic or segment expansion opportunity

End with customer risk assessment, key findings on retention sustainability, and recommendations for reducing concentration risk.`,
      isDefault: false, scope: "OPERATING_BUSINESS", sortOrder: 9,
    },
    {
      firmId: firm.id, name: "Technology DD", description: "Tech stack, technical debt, product roadmap, cybersecurity",
      defaultInstructions: `Perform technology due diligence analysis for operating businesses.

Technology Stack:
- Core platform architecture and tech stack assessment
- Cloud infrastructure and hosting (AWS, Azure, GCP, on-prem)
- Third-party dependencies and vendor lock-in risks
- API ecosystem and integration capabilities
- Mobile and web platform maturity

Technical Debt & Code Quality:
- Estimated technical debt and remediation cost
- Code quality metrics (test coverage, deployment frequency, incident rates)
- Legacy system risks and modernization roadmap
- Scalability limits of current architecture

Product & Roadmap:
- Product-market fit assessment
- Feature development velocity and release cadence
- Product roadmap alignment with market needs
- Competitive feature gap analysis

Cybersecurity:
- Security framework compliance (SOC 2, ISO 27001, HIPAA, PCI-DSS)
- Vulnerability assessment and penetration testing history
- Incident response plan and breach history
- Data encryption, access controls, and authentication
- Third-party security audit findings

IP & Data:
- Proprietary technology and patent portfolio
- Open-source license compliance
- Data assets and monetization potential
- Data privacy compliance (GDPR, CCPA)

End with technology risk rating, key findings, and estimated investment needed for technology improvements.`,
      isDefault: false, scope: "OPERATING_BUSINESS", sortOrder: 10,
    },
    {
      firmId: firm.id, name: "Regulatory & Permitting DD", description: "Regulatory approvals, permits, government concessions",
      defaultInstructions: `Perform regulatory and permitting due diligence analysis for infrastructure assets.

Regulatory Framework:
- Applicable regulatory bodies and jurisdictions
- Rate-setting mechanisms and regulatory review cycles
- Political and regulatory stability assessment
- Regulatory change risk and pending legislation

Permitting Status:
- All required permits, licenses, and approvals inventory
- Permit expiration dates and renewal requirements
- Pending permit applications and expected timelines
- Environmental permits (air, water, waste) and compliance status
- Construction permits and building code compliance

Government Concessions & Contracts:
- Concession agreement terms, duration, and renewal options
- Government contract performance obligations
- Revenue guarantee or minimum payment mechanisms
- Termination provisions and compensation formulas
- Political force majeure protections

Compliance:
- Historical compliance record and enforcement actions
- Ongoing reporting and monitoring requirements
- Environmental impact assessments and mitigation commitments
- Community benefit agreements and stakeholder obligations

End with regulatory risk assessment, critical permit timelines, and recommended mitigation strategies.`,
      isDefault: false, scope: "INFRASTRUCTURE", sortOrder: 11,
    },
    {
      firmId: firm.id, name: "Engineering DD", description: "Engineering design, construction risk, asset condition",
      defaultInstructions: `Perform engineering due diligence analysis for infrastructure assets.

Design & Engineering:
- Engineering design review and adequacy assessment
- Technology selection and proven vs novel technology risk
- Design life and residual value assumptions
- Performance guarantees and warranty coverage

Construction Risk (if applicable):
- Construction progress and schedule assessment
- Cost overrun risk and contingency adequacy
- Contractor qualifications and bonding
- Change order history and dispute status
- Commissioning and testing plan

Asset Condition:
- Physical inspection findings and condition rating
- Remaining useful life of major components
- Maintenance history and deferred maintenance backlog
- Capital expenditure forecast (maintenance and growth)
- Spare parts inventory and supply chain reliability

Performance:
- Historical performance vs design specifications
- Availability and capacity factor trends
- Throughput or output efficiency metrics
- Weather, seasonal, or cyclical performance patterns

End with engineering risk rating, capital expenditure forecast, and key technical findings.`,
      isDefault: false, scope: "INFRASTRUCTURE", sortOrder: 12,
    },
    {
      firmId: firm.id, name: "Credit DD", description: "Credit metrics, covenants, collateral coverage, downside modeling",
      defaultInstructions: `Perform credit due diligence analysis for debt investments.

Credit Metrics:
- Loan-to-Value (LTV) at origination and current
- Debt Service Coverage Ratio (DSCR) historical and projected
- Interest Coverage Ratio (ICR) and fixed charge coverage
- Debt yield and return on equity analysis
- Leverage ratios (Debt/EBITDA, Debt/Equity)

Debt Structure:
- Capital structure and priority of claims (senior, mezzanine, subordinated)
- Interest rate structure (fixed vs floating, hedging in place)
- Amortization schedule and maturity profile
- Prepayment provisions and call protection
- Extension options and conditions

Covenant Package:
- Financial covenants: type, threshold, test frequency, current headroom
- Maintenance vs incurrence covenants
- Negative covenants: restricted payments, additional debt, asset sales
- Reporting requirements and compliance monitoring
- Event of default triggers and cure provisions

Collateral Coverage:
- Collateral identification and perfection status
- Appraisal methodology and current value
- Collateral coverage ratio and stress scenarios
- Cross-collateralization and cross-default provisions

Downside Modeling:
- Base, stress, and default scenario analysis
- Recovery rate assumptions by collateral type
- Time to recovery and liquidation cost estimates
- Sensitivity analysis on key credit drivers (occupancy, revenue, rates)

End with credit risk rating, key covenant concerns, and recommended structural protections.`,
      isDefault: false, scope: "DEBT", sortOrder: 13,
    },
  ];
  void _legacyRef;
  } // end if(false) dead code block

  // ============================================================
  // DEAL ACTIVITIES (timeline events)
  // ============================================================
  console.log("Creating deal activities...");

  await prisma.dealActivity.createMany({
    data: [
      // Deal 1 (IC Review) - full lifecycle
      { dealId: deal1.id, activityType: "SCREENING_RUN", description: "AI screening completed with score 82/100. Recommendation: PROCEED.", metadata: { score: 82, recommendation: "PROCEED" }, createdAt: new Date("2026-01-15") },
      { dealId: deal1.id, activityType: "STAGE_CHANGE", description: "Deal advanced from Screening to Due Diligence", metadata: { fromStage: "SCREENING", toStage: "DUE_DILIGENCE" }, createdAt: new Date("2026-01-15") },
      { dealId: deal1.id, activityType: "MEETING", description: "Management presentation with Apex Industries leadership team", metadata: { meetingType: "Management Presentation" }, createdAt: new Date("2026-01-22") },
      { dealId: deal1.id, activityType: "CALL", description: "Call with Apex CFO to discuss working capital and CapEx projections", createdAt: new Date("2026-02-01") },
      { dealId: deal1.id, activityType: "MEETING", description: "Site visit to Apex manufacturing facility in Ohio", metadata: { meetingType: "Site Visit" }, createdAt: new Date("2026-02-08") },
      { dealId: deal1.id, activityType: "DOCUMENT_UPLOADED", description: "Quality of Earnings report uploaded by SM", createdAt: new Date("2026-02-12") },
      { dealId: deal1.id, activityType: "CALL", description: "Diligence call with industry expert on defense manufacturing market", createdAt: new Date("2026-02-15") },
      { dealId: deal1.id, activityType: "STAGE_CHANGE", description: "Deal sent to IC Review", metadata: { fromStage: "DUE_DILIGENCE", toStage: "IC_REVIEW" }, createdAt: new Date("2026-02-27") },
      // Deal 2 (Due Diligence)
      { dealId: deal2.id, activityType: "SCREENING_RUN", description: "AI screening completed with score 74/100. Recommendation: PROCEED_WITH_CAUTION.", metadata: { score: 74, recommendation: "PROCEED_WITH_CAUTION" }, createdAt: new Date("2026-01-25") },
      { dealId: deal2.id, activityType: "STAGE_CHANGE", description: "Deal advanced from Screening to Due Diligence", metadata: { fromStage: "SCREENING", toStage: "DUE_DILIGENCE" }, createdAt: new Date("2026-01-25") },
      { dealId: deal2.id, activityType: "MEETING", description: "Initial management meeting with Beacon Healthcare Group CEO and CFO", metadata: { meetingType: "Management Meeting" }, createdAt: new Date("2026-02-15") },
      { dealId: deal2.id, activityType: "CALL", description: "Healthcare regulatory expert call — reimbursement risk assessment", createdAt: new Date("2026-02-19") },
      { dealId: deal2.id, activityType: "DOCUMENT_UPLOADED", description: "Patient volume data and payer mix analysis uploaded", createdAt: new Date("2026-02-20") },
      { dealId: deal2.id, activityType: "MEETING", description: "Clinic site visits — 3 locations in Atlanta metro", metadata: { meetingType: "Site Visit" }, createdAt: new Date("2026-02-24") },
      // Deal 4 (Due Diligence)
      { dealId: deal4.id, activityType: "SCREENING_RUN", description: "AI screening completed with score 88/100. Recommendation: STRONG_PROCEED.", metadata: { score: 88, recommendation: "STRONG_PROCEED" }, createdAt: new Date("2026-02-08") },
      { dealId: deal4.id, activityType: "STAGE_CHANGE", description: "Deal advanced from Screening to Due Diligence", metadata: { fromStage: "SCREENING", toStage: "DUE_DILIGENCE" }, createdAt: new Date("2026-02-08") },
      { dealId: deal4.id, activityType: "MEETING", description: "Sponsor meeting with Ridgeline Capital Partners principals", metadata: { meetingType: "Sponsor Meeting" }, createdAt: new Date("2026-02-14") },
      { dealId: deal4.id, activityType: "DOCUMENT_UPLOADED", description: "Appraisal report and Phase I ESA uploaded", createdAt: new Date("2026-02-16") },
      { dealId: deal4.id, activityType: "CALL", description: "Call with property management company on tenant relationships", createdAt: new Date("2026-02-21") },

      // Deal 6 (Dead - Pinnacle Logistics) — killed at DD after 45 days
      { dealId: deal6.id, activityType: "SCREENING_RUN", description: "AI screening completed with score 65/100. Recommendation: PROCEED_WITH_CAUTION.", metadata: { score: 65, recommendation: "PROCEED_WITH_CAUTION" }, createdAt: new Date("2025-11-10") },
      { dealId: deal6.id, activityType: "STAGE_CHANGE", description: "Deal advanced from Screening to Due Diligence", metadata: { fromStage: "SCREENING", toStage: "DUE_DILIGENCE" }, createdAt: new Date("2025-11-12") },
      { dealId: deal6.id, activityType: "MEETING", description: "Management presentation with Pinnacle Transport CEO", metadata: { meetingType: "Management Presentation" }, createdAt: new Date("2025-11-20") },
      { dealId: deal6.id, activityType: "CALL", description: "Valuation discussion with seller's advisor — significant gap on EBITDA multiple", createdAt: new Date("2025-12-05") },
      { dealId: deal6.id, activityType: "STAGE_CHANGE", description: "Deal killed — moved to Dead stage", metadata: { fromStage: "DUE_DILIGENCE", toStage: "DEAD" }, createdAt: new Date("2025-12-27") },

      // Deal 7 (Dead - GreenLeaf Cannabis) — killed at IC Review
      { dealId: deal7.id, activityType: "SCREENING_RUN", description: "AI screening completed with score 42/100. Recommendation: HIGH_RISK.", metadata: { score: 42, recommendation: "HIGH_RISK" }, createdAt: new Date("2025-10-05") },
      { dealId: deal7.id, activityType: "STAGE_CHANGE", description: "Deal advanced from Screening to Due Diligence", metadata: { fromStage: "SCREENING", toStage: "DUE_DILIGENCE" }, createdAt: new Date("2025-10-08") },
      { dealId: deal7.id, activityType: "STAGE_CHANGE", description: "Deal advanced to IC Review", metadata: { fromStage: "DUE_DILIGENCE", toStage: "IC_REVIEW" }, createdAt: new Date("2025-11-15") },
      { dealId: deal7.id, activityType: "STAGE_CHANGE", description: "Deal killed at IC — unanimous decline", metadata: { fromStage: "IC_REVIEW", toStage: "DEAD" }, createdAt: new Date("2025-11-22") },

      // Deal 8 (Dead - TerraVerde) — killed at DD due to sponsor issues
      { dealId: deal8.id, activityType: "SCREENING_RUN", description: "AI screening completed with score 71/100. Recommendation: PROCEED.", metadata: { score: 71, recommendation: "PROCEED" }, createdAt: new Date("2025-12-01") },
      { dealId: deal8.id, activityType: "STAGE_CHANGE", description: "Deal advanced from Screening to Due Diligence", metadata: { fromStage: "SCREENING", toStage: "DUE_DILIGENCE" }, createdAt: new Date("2025-12-03") },
      { dealId: deal8.id, activityType: "MEETING", description: "Meeting with TerraVerde management team on project pipeline", metadata: { meetingType: "Management Meeting" }, createdAt: new Date("2025-12-10") },
      { dealId: deal8.id, activityType: "STAGE_CHANGE", description: "Deal killed — compliance flagged sponsor risk", metadata: { fromStage: "DUE_DILIGENCE", toStage: "DEAD" }, createdAt: new Date("2026-01-08") },

      // Deal 9 (Closed - Cascade Timber) — full lifecycle completed
      { dealId: deal9.id, activityType: "SCREENING_RUN", description: "AI screening completed with score 91/100. Recommendation: STRONG_PROCEED.", metadata: { score: 91, recommendation: "STRONG_PROCEED" }, createdAt: new Date("2025-07-15") },
      { dealId: deal9.id, activityType: "STAGE_CHANGE", description: "Deal advanced from Screening to Due Diligence", metadata: { fromStage: "SCREENING", toStage: "DUE_DILIGENCE" }, createdAt: new Date("2025-07-18") },
      { dealId: deal9.id, activityType: "MEETING", description: "Site visit to Pacific Northwest timberland parcels", metadata: { meetingType: "Site Visit" }, createdAt: new Date("2025-08-05") },
      { dealId: deal9.id, activityType: "STAGE_CHANGE", description: "Deal advanced to IC Review", metadata: { fromStage: "DUE_DILIGENCE", toStage: "IC_REVIEW" }, createdAt: new Date("2025-09-01") },
      { dealId: deal9.id, activityType: "STAGE_CHANGE", description: "IC approved — deal advanced to Closing", metadata: { fromStage: "IC_REVIEW", toStage: "CLOSING" }, createdAt: new Date("2025-09-15") },
      { dealId: deal9.id, activityType: "DOCUMENT_UPLOADED", description: "Signed PSA and timber cruise report uploaded", createdAt: new Date("2025-10-10") },
      { dealId: deal9.id, activityType: "STAGE_CHANGE", description: "Deal closed — $15M deployed", metadata: { fromStage: "CLOSING", toStage: "CLOSED" }, createdAt: new Date("2025-11-01") },

      // Deal 10 (SilverLake Data Centers) — stale in DD for 35+ days
      { dealId: deal10.id, activityType: "SCREENING_RUN", description: "AI screening completed with score 85/100. Recommendation: PROCEED.", metadata: { score: 85, recommendation: "PROCEED" }, createdAt: new Date("2026-01-20") },
      { dealId: deal10.id, activityType: "STAGE_CHANGE", description: "Deal advanced from Screening to Due Diligence", metadata: { fromStage: "SCREENING", toStage: "DUE_DILIGENCE" }, createdAt: new Date("2026-01-22") },
      { dealId: deal10.id, activityType: "MEETING", description: "Tour of Tier III+ data center facilities in Texas and Arizona", metadata: { meetingType: "Site Visit" }, createdAt: new Date("2026-02-05") },
      { dealId: deal10.id, activityType: "CALL", description: "Power cost analysis call with utility consultant", createdAt: new Date("2026-02-15") },
    ],
  });

  // ============================================================
  // IC PROCESS + VOTES (for deal-1 in IC_REVIEW)
  // ============================================================
  console.log("Creating IC process data...");

  const icProcess = await prisma.iCProcess.create({
    data: {
      id: "ic-1",
      dealId: deal1.id,
      status: "pending",
      quorumType: "majority",
      deadline: new Date("2026-03-15"),
    },
  });

  await prisma.iCVoteRecord.createMany({
    data: [
      { icProcessId: icProcess.id, userId: userJK.id, vote: "APPROVE", notes: "Strong fundamentals, manageable risks." },
      { icProcessId: icProcess.id, userId: userSM.id, vote: "APPROVE", notes: "Agree, but want customer concentration addressed in closing docs." },
    ],
  });

  // ============================================================
  // IC QUESTIONS + REPLIES (for deal-1)
  // ============================================================
  console.log("Creating IC questions...");

  const q1 = await prisma.iCQuestion.create({
    data: {
      id: "icq-1",
      dealId: deal1.id,
      authorId: userSM.id,
      content: "What is our mitigation strategy for the customer concentration risk? Top 3 clients at 65% of revenue seems high for this ticket size.",
      status: "OPEN",
    },
  });

  await prisma.iCQuestionReply.createMany({
    data: [
      { questionId: q1.id, authorId: userJK.id, content: "Management has shared a 3-year diversification plan. They've already signed 2 new contracts in Q4 that will bring concentration down to ~55% by EOY." },
      { questionId: q1.id, authorId: userAL.id, content: "We should also consider requiring a minimum revenue diversification covenant in the investment agreement." },
    ],
  });

  const q2 = await prisma.iCQuestion.create({
    data: {
      id: "icq-2",
      dealId: deal1.id,
      authorId: userAL.id,
      content: "Have we validated the EBITDA add-backs? The 22% margin seems aggressive for this sector.",
      status: "RESOLVED",
    },
  });

  await prisma.iCQuestionReply.create({
    data: {
      questionId: q2.id,
      authorId: userSM.id,
      content: "QoE report confirmed margins. The add-backs are reasonable — primarily one-time legal costs ($1.2M) and a facility consolidation charge ($800K).",
    },
  });

  const _q3 = await prisma.iCQuestion.create({
    data: {
      id: "icq-3",
      dealId: deal1.id,
      authorId: userJK.id,
      content: "Should we flag the key man risk with the CEO for the insurance workstream? Want to make sure we have appropriate coverage.",
      status: "DEFERRED",
    },
  });

  // ============================================================
  // CAPITAL CALLS (4)
  // ============================================================
  console.log("Creating capital calls...");

  await prisma.capitalCall.createMany({
    data: [
      {
        id: "cc-1",
        entityId: entity2.id,
        callNumber: "CC-007",
        callDate: new Date("2025-02-15"),
        dueDate: new Date("2025-03-01"),
        amount: 25_000_000,
        purpose: "Investment \u2014 CloudBase follow-on",
        status: "FUNDED",
        fundedPercent: 100,
      },
      {
        id: "cc-2",
        entityId: entity2.id,
        callNumber: "CC-008",
        callDate: new Date("2025-02-28"),
        dueDate: new Date("2025-03-15"),
        amount: 15_000_000,
        purpose: "Mgmt fees Q1 + Expenses",
        status: "ISSUED",
        fundedPercent: 55,
      },
      {
        id: "cc-3",
        entityId: entity8.id,
        callNumber: "CC-003",
        callDate: new Date("2025-03-01"),
        dueDate: new Date("2025-03-15"),
        amount: 10_000_000,
        purpose: "New credit deployment \u2014 Ridgeline",
        status: "DRAFT",
        fundedPercent: 0,
      },
      {
        id: "cc-4",
        entityId: entity3.id,
        callNumber: "CC-005",
        callDate: new Date("2025-01-15"),
        dueDate: new Date("2025-02-01"),
        amount: 8_000_000,
        purpose: "Sequoia Fund XVI \u2014 capital call pass-through",
        status: "FUNDED",
        fundedPercent: 100,
      },
    ],
  });

  // ============================================================
  // DISTRIBUTION EVENTS (4)
  // ============================================================
  console.log("Creating distribution events...");

  await prisma.distributionEvent.createMany({
    data: [
      {
        id: "dist-1",
        entityId: entity1.id,
        distributionDate: new Date("2025-01-31"),
        grossAmount: 58_000_000,
        source: "Exit \u2014 SolarGrid Energy",
        returnOfCapital: 20_000_000,
        income: 5_200_000,
        longTermGain: 28_800_000,
        shortTermGain: 0,
        carriedInterest: 4_000_000,
        netToLPs: 54_000_000,
        status: "PAID",
        distributionType: "CAPITAL_GAIN",
        memo: "SolarGrid Energy full exit",
      },
      {
        id: "dist-2",
        entityId: entity1.id,
        distributionDate: new Date("2024-09-30"),
        grossAmount: 12_000_000,
        source: "Dividend \u2014 NovaTech AI",
        returnOfCapital: 0,
        income: 12_000_000,
        longTermGain: 0,
        shortTermGain: 0,
        carriedInterest: 0,
        netToLPs: 12_000_000,
        status: "PAID",
        distributionType: "INCOME",
        memo: "NovaTech AI quarterly dividend",
      },
      {
        id: "dist-3",
        entityId: entity8.id,
        distributionDate: new Date("2024-12-31"),
        grossAmount: 2_100_000,
        source: "Interest income \u2014 Q4",
        returnOfCapital: 0,
        income: 2_100_000,
        longTermGain: 0,
        shortTermGain: 0,
        carriedInterest: 0,
        netToLPs: 2_100_000,
        status: "PAID",
        distributionType: "INCOME",
        memo: "Q4 interest income",
      },
      {
        id: "dist-4",
        entityId: entity1.id,
        distributionDate: new Date("2024-06-30"),
        grossAmount: 1_200_000,
        source: "Dividend \u2014 NovaTech AI",
        returnOfCapital: 0,
        income: 1_200_000,
        longTermGain: 0,
        shortTermGain: 0,
        carriedInterest: 0,
        netToLPs: 1_200_000,
        status: "PAID",
        distributionType: "INCOME",
        memo: "NovaTech AI dividend",
      },
      {
        id: "dist-5",
        entityId: entity1.id,
        distributionDate: new Date("2025-03-15"),
        grossAmount: 5_000_000,
        source: "Partial exit \u2014 UrbanNest",
        distributionType: "RETURN_OF_CAPITAL",
        memo: "Return of capital from partial exit",
        returnOfCapital: 3_500_000,
        income: 0,
        longTermGain: 1_200_000,
        shortTermGain: 0,
        carriedInterest: 300_000,
        netToLPs: 4_700_000,
        status: "DRAFT",
      },
      {
        id: "dist-6",
        entityId: entity2.id,
        distributionDate: new Date("2025-03-01"),
        grossAmount: 3_000_000,
        source: "CloudBase dividend",
        distributionType: "INCOME",
        memo: "Q1 2025 dividend income",
        returnOfCapital: 0,
        income: 3_000_000,
        longTermGain: 0,
        shortTermGain: 0,
        carriedInterest: 0,
        netToLPs: 3_000_000,
        status: "APPROVED",
      },
    ],
  });

  // ============================================================
  // CAPITAL CALL LINE ITEMS
  // ============================================================
  console.log("Creating capital call line items...");

  await prisma.capitalCallLineItem.createMany({
    data: [
      // cc-1 (entity2, $25M) — investors in entity2: investor1 ($75M/150M = 50%), investor2 ($50M = 33%), investor5 ($25M = 17%)
      { id: "ccli-1-1", capitalCallId: "cc-1", investorId: investor1.id, amount: 12_500_000, status: "Funded", paidDate: new Date("2025-03-01") },
      { id: "ccli-1-2", capitalCallId: "cc-1", investorId: investor2.id, amount: 8_333_000, status: "Funded", paidDate: new Date("2025-03-01") },
      { id: "ccli-1-5", capitalCallId: "cc-1", investorId: investor5.id, amount: 4_167_000, status: "Funded", paidDate: new Date("2025-03-01") },
      // cc-2 (entity2, $15M)
      { id: "ccli-2-1", capitalCallId: "cc-2", investorId: investor1.id, amount: 7_500_000, status: "Pending" },
      { id: "ccli-2-2", capitalCallId: "cc-2", investorId: investor2.id, amount: 5_000_000, status: "Pending" },
      { id: "ccli-2-5", capitalCallId: "cc-2", investorId: investor5.id, amount: 2_500_000, status: "Pending" },
      // cc-3 (entity8, $10M) — investor3 ($10M/25M = 40%), investor6 ($15M = 60%)
      { id: "ccli-3-3", capitalCallId: "cc-3", investorId: investor3.id, amount: 4_000_000, status: "Pending" },
      { id: "ccli-3-6", capitalCallId: "cc-3", investorId: investor6.id, amount: 6_000_000, status: "Pending" },
      // cc-4 (entity3, $8M) — investor2 ($30M/70M = 43%), investor3 ($25M = 36%), investor4 ($15M = 21%)
      { id: "ccli-4-2", capitalCallId: "cc-4", investorId: investor2.id, amount: 3_440_000, status: "Funded", paidDate: new Date("2025-02-01") },
      { id: "ccli-4-3", capitalCallId: "cc-4", investorId: investor3.id, amount: 2_880_000, status: "Funded", paidDate: new Date("2025-02-01") },
      { id: "ccli-4-4", capitalCallId: "cc-4", investorId: investor4.id, amount: 1_680_000, status: "Funded", paidDate: new Date("2025-02-01") },
    ],
  });

  // ============================================================
  // DISTRIBUTION LINE ITEMS
  // ============================================================
  console.log("Creating distribution line items...");

  await prisma.distributionLineItem.createMany({
    data: [
      // dist-1 (entity1, $58M gross, $54M net) — investor1 ($50M/130M = 38.5%), investor3 ($25M = 19.2%), investor4 ($30M = 23.1%), investor6 ($25M = 19.2%)
      { id: "dli-1-1", distributionId: "dist-1", investorId: investor1.id, grossAmount: 22_330_000, returnOfCapital: 7_700_000, income: 2_002_000, longTermGain: 11_088_000, carriedInterest: 1_540_000, netAmount: 20_790_000 },
      { id: "dli-1-3", distributionId: "dist-1", investorId: investor3.id, grossAmount: 11_136_000, returnOfCapital: 3_840_000, income: 998_400, longTermGain: 5_529_600, carriedInterest: 768_000, netAmount: 10_368_000 },
      { id: "dli-1-4", distributionId: "dist-1", investorId: investor4.id, grossAmount: 13_398_000, returnOfCapital: 4_620_000, income: 1_201_200, longTermGain: 6_652_800, carriedInterest: 924_000, netAmount: 12_474_000 },
      { id: "dli-1-6", distributionId: "dist-1", investorId: investor6.id, grossAmount: 11_136_000, returnOfCapital: 3_840_000, income: 998_400, longTermGain: 5_529_600, carriedInterest: 768_000, netAmount: 10_368_000 },
      // dist-2 (entity1, $12M gross/net) — same proportions
      { id: "dli-2-1", distributionId: "dist-2", investorId: investor1.id, grossAmount: 4_620_000, returnOfCapital: 0, income: 4_620_000, longTermGain: 0, carriedInterest: 0, netAmount: 4_620_000 },
      { id: "dli-2-3", distributionId: "dist-2", investorId: investor3.id, grossAmount: 2_304_000, returnOfCapital: 0, income: 2_304_000, longTermGain: 0, carriedInterest: 0, netAmount: 2_304_000 },
      { id: "dli-2-4", distributionId: "dist-2", investorId: investor4.id, grossAmount: 2_772_000, returnOfCapital: 0, income: 2_772_000, longTermGain: 0, carriedInterest: 0, netAmount: 2_772_000 },
      { id: "dli-2-6", distributionId: "dist-2", investorId: investor6.id, grossAmount: 2_304_000, returnOfCapital: 0, income: 2_304_000, longTermGain: 0, carriedInterest: 0, netAmount: 2_304_000 },
      // dist-4 (entity1, $1.2M gross/net) — same proportions
      { id: "dli-4-1", distributionId: "dist-4", investorId: investor1.id, grossAmount: 462_000, returnOfCapital: 0, income: 462_000, longTermGain: 0, carriedInterest: 0, netAmount: 462_000 },
      { id: "dli-4-3", distributionId: "dist-4", investorId: investor3.id, grossAmount: 230_400, returnOfCapital: 0, income: 230_400, longTermGain: 0, carriedInterest: 0, netAmount: 230_400 },
      { id: "dli-4-4", distributionId: "dist-4", investorId: investor4.id, grossAmount: 277_200, returnOfCapital: 0, income: 277_200, longTermGain: 0, carriedInterest: 0, netAmount: 277_200 },
      { id: "dli-4-6", distributionId: "dist-4", investorId: investor6.id, grossAmount: 230_400, returnOfCapital: 0, income: 230_400, longTermGain: 0, carriedInterest: 0, netAmount: 230_400 },
      // dist-3 (entity8, $2.1M gross/net) — investor3 (40%), investor6 (60%)
      { id: "dli-3-3", distributionId: "dist-3", investorId: investor3.id, grossAmount: 840_000, returnOfCapital: 0, income: 840_000, longTermGain: 0, carriedInterest: 0, netAmount: 840_000 },
      { id: "dli-3-6", distributionId: "dist-3", investorId: investor6.id, grossAmount: 1_260_000, returnOfCapital: 0, income: 1_260_000, longTermGain: 0, carriedInterest: 0, netAmount: 1_260_000 },
      // dist-5 (entity1, $5M gross, $4.7M net, DRAFT) — same entity1 proportions: investor1 38.5%, investor3 19.2%, investor4 23.1%, investor6 19.2%
      { id: "dli-5-1", distributionId: "dist-5", investorId: investor1.id, grossAmount: 1_925_000, returnOfCapital: 1_347_500, income: 0, longTermGain: 462_000, carriedInterest: 115_500, netAmount: 1_809_500 },
      { id: "dli-5-3", distributionId: "dist-5", investorId: investor3.id, grossAmount: 960_000, returnOfCapital: 672_000, income: 0, longTermGain: 230_400, carriedInterest: 57_600, netAmount: 902_400 },
      { id: "dli-5-4", distributionId: "dist-5", investorId: investor4.id, grossAmount: 1_155_000, returnOfCapital: 808_500, income: 0, longTermGain: 277_200, carriedInterest: 69_300, netAmount: 1_085_700 },
      { id: "dli-5-6", distributionId: "dist-5", investorId: investor6.id, grossAmount: 960_000, returnOfCapital: 672_000, income: 0, longTermGain: 230_400, carriedInterest: 57_600, netAmount: 902_400 },
      // dist-6 (entity2, $3M gross/net, APPROVED) — entity2 proportions: investor1 50%, investor2 33.3%, investor5 16.7%
      { id: "dli-6-1", distributionId: "dist-6", investorId: investor1.id, grossAmount: 1_500_000, returnOfCapital: 0, income: 1_500_000, longTermGain: 0, carriedInterest: 0, netAmount: 1_500_000 },
      { id: "dli-6-2", distributionId: "dist-6", investorId: investor2.id, grossAmount: 1_000_000, returnOfCapital: 0, income: 1_000_000, longTermGain: 0, carriedInterest: 0, netAmount: 1_000_000 },
      { id: "dli-6-5", distributionId: "dist-6", investorId: investor5.id, grossAmount: 500_000, returnOfCapital: 0, income: 500_000, longTermGain: 0, carriedInterest: 0, netAmount: 500_000 },
    ],
  });

  // ============================================================
  // MEETINGS (8)
  // ============================================================
  console.log("Creating meetings...");

  // Map meeting asset names to asset/deal IDs
  const meetingAssetMap: Record<string, { assetId?: string; dealId?: string; entityId?: string }> = {
    "NovaTech AI": { assetId: asset1.id, entityId: entity1.id },
    "Sequoia Capital Fund XVI": { assetId: asset5.id, entityId: entity3.id },
    "123 Industrial Blvd": { assetId: asset4.id, entityId: entity1.id },
    "Meridian Credit Facility": { assetId: asset3.id, entityId: entity8.id },
    "LifeBridge Insurance Fund": { assetId: asset11.id, entityId: entity2.id },
    "Apex Manufacturing": { dealId: deal1.id },
    "Beacon Health": { dealId: deal2.id },
    "Ridgeline Senior Debt": { dealId: deal4.id, entityId: entity8.id },
  };

  const meetingsData = [
    { id: "meeting-1", date: "2025-02-28", title: "Apex Manufacturing \u2014 IC Presentation", type: "IC Meeting", asset: "Apex Manufacturing", source: "FIREFLIES" as const, transcript: true, items: 3, decisions: ["Approved pending legal DD"] },
    { id: "meeting-2", date: "2025-02-25", title: "Q4 Portfolio Review \u2014 NovaTech AI", type: "Portfolio Review", asset: "NovaTech AI", source: "FIREFLIES" as const, transcript: true, items: 2, decisions: ["Hold position, revisit exit Q3"] },
    { id: "meeting-3", date: "2025-02-20", title: "Sequoia Fund XVI \u2014 Annual Meeting", type: "GP Review", asset: "Sequoia Capital Fund XVI", source: "FIREFLIES" as const, transcript: true, items: 1, decisions: [] },
    { id: "meeting-4", date: "2025-02-18", title: "Beacon Health \u2014 Mgmt Meeting", type: "DD Session", asset: "Beacon Health", source: "FIREFLIES" as const, transcript: true, items: 4, decisions: [] },
    { id: "meeting-5", date: "2025-02-15", title: "123 Industrial \u2014 Lease Renewal", type: "Portfolio Review", asset: "123 Industrial Blvd", source: "MANUAL" as const, transcript: false, items: 2, decisions: ["Proceed 5yr renewal @ $18/sqft"] },
    { id: "meeting-6", date: "2025-02-10", title: "Meridian Credit \u2014 Covenant Review", type: "Portfolio Review", asset: "Meridian Credit Facility", source: "FIREFLIES" as const, transcript: true, items: 1, decisions: ["All covenants compliant"] },
    { id: "meeting-7", date: "2025-02-05", title: "IC Discussion \u2014 Ridgeline Debt", type: "IC Meeting", asset: "Ridgeline Senior Debt", source: "FIREFLIES" as const, transcript: true, items: 2, decisions: [] },
    { id: "meeting-8", date: "2025-01-28", title: "LifeBridge Fund \u2014 Quarterly Update", type: "GP Review", asset: "LifeBridge Insurance Fund", source: "FIREFLIES" as const, transcript: true, items: 1, decisions: [] },
  ];

  for (const m of meetingsData) {
    const links = meetingAssetMap[m.asset] || {};
    await prisma.meeting.create({
      data: {
        id: m.id,
        title: m.title,
        meetingDate: new Date(m.date),
        meetingType: m.type,
        source: m.source,
        hasTranscript: m.transcript,
        actionItems: m.items,
        decisions: m.decisions.length > 0 ? m.decisions : undefined,
        assetId: links.assetId || null,
        dealId: links.dealId || null,
        entityId: links.entityId || null,
      },
    });
  }

  // ============================================================
  // TASKS (from asset tasks in mockup)
  // ============================================================
  console.log("Creating tasks...");

  // User initials -> ID mapping
  const userInitialsMap: Record<string, string> = {
    JK: userJK.id,
    SM: userSM.id,
    AL: userAL.id,
    CFO: userSM.id, // Sarah Mitchell is CFO
    CIO: userAL.id, // Alex Lee is CIO
  };

  const tasksData = [
    // NovaTech AI tasks
    { id: "task-1", title: "Update comp set for Q1 mark", status: "IN_PROGRESS" as const, due: "2025-03-20", who: "SM", assetId: asset1.id },
    { id: "task-2", title: "Board deck review \u2014 March", status: "TODO" as const, due: "2025-03-10", who: "JK", assetId: asset1.id },
    { id: "task-3", title: "Exit scenario analysis", status: "TODO" as const, due: "2025-04-01", who: "AL", assetId: asset1.id },
    // Meridian Credit task
    { id: "task-4", title: "Q1 covenant compliance check", status: "TODO" as const, due: "2025-04-15", who: "CFO", assetId: asset3.id },
    // 123 Industrial task
    { id: "task-5", title: "Lease renewal negotiation \u2014 Acme", status: "IN_PROGRESS" as const, due: "2025-06-01", who: "JK", assetId: asset4.id },
    // Sequoia task
    { id: "task-6", title: "Review annual meeting notes", status: "TODO" as const, due: "2025-04-15", who: "CIO", assetId: asset5.id },
  ];

  for (const t of tasksData) {
    await prisma.task.create({
      data: {
        id: t.id,
        title: t.title,
        status: t.status,
        assigneeId: userInitialsMap[t.who] || null,
        assigneeName: t.who,
        dueDate: new Date(t.due),
        assetId: t.assetId,
      },
    });
  }

  // ============================================================
  // DOCUMENTS (from asset docs in mockup)
  // ============================================================
  console.log("Creating documents...");

  const categoryMap: Record<string, "BOARD" | "FINANCIAL" | "LEGAL" | "GOVERNANCE" | "VALUATION" | "STATEMENT"> = {
    Board: "BOARD",
    Financial: "FINANCIAL",
    Legal: "LEGAL",
    Governance: "GOVERNANCE",
    Valuation: "VALUATION",
    Statement: "STATEMENT",
  };

  const docsData = [
    // NovaTech AI docs
    { id: "doc-1", name: "Board Deck Q4 2024", cat: "Board", date: "2025-01-18", assetId: asset1.id, entityId: entity1.id },
    { id: "doc-2", name: "Audited Financials FY2024", cat: "Financial", date: "2025-02-01", assetId: asset1.id, entityId: entity1.id },
    { id: "doc-3", name: "Series B Purchase Agreement", cat: "Legal", date: "2020-03-15", assetId: asset1.id, entityId: entity1.id },
    { id: "doc-4", name: "Cap Table Jan 2025", cat: "Governance", date: "2025-01-30", assetId: asset1.id, entityId: entity1.id },
    // 123 Industrial Blvd docs
    { id: "doc-5", name: "Appraisal Report 2024", cat: "Valuation", date: "2024-06-01", assetId: asset4.id, entityId: entity1.id },
    { id: "doc-6", name: "Lease \u2014 Acme Distribution", cat: "Legal", date: "2021-01-15", assetId: asset4.id },
    // Sequoia doc
    { id: "doc-7", name: "Q4 2024 LP Statement", cat: "Statement", date: "2025-02-15", assetId: asset5.id, entityId: entity3.id },
  ];

  for (const d of docsData) {
    await prisma.document.create({
      data: {
        id: d.id,
        name: d.name,
        category: categoryMap[d.cat] || "OTHER",
        uploadDate: new Date(d.date),
        assetId: d.assetId,
        entityId: d.entityId,
      },
    });
  }

  // ============================================================
  // WATERFALL TEMPLATES (5 templates with tiers)
  // ============================================================
  console.log("Creating waterfall templates...");

  // Template 1: Standard European 8/20 (Fund I, Fund II)
  const wf1 = await prisma.waterfallTemplate.create({
    data: {
      id: "wf-1",
      name: "Standard European 8/20",
      description: "Return of Capital \u2192 8% Pref \u2192 100% GP Catch-Up \u2192 80/20 Split",
      managementFeeRate: 0.02,
      feeBasis: "COMMITTED_CAPITAL",
      carryPercent: 0.20,
      prefReturnRate: 0.08,
      prefReturnCompounding: "COMPOUND",
    },
  });

  await prisma.waterfallTier.createMany({
    data: [
      { id: "wft-1-1", templateId: wf1.id, tierOrder: 1, name: "Income Distribution", description: "All income (interest, dividends, rental) \u2192 100% to LPs", splitLP: 100, splitGP: 0, appliesTo: "Income Only" },
      { id: "wft-1-2", templateId: wf1.id, tierOrder: 2, name: "Return of Capital", description: "All contributed capital returned to LPs", splitLP: 100, splitGP: 0, appliesTo: "Capital" },
      { id: "wft-1-3", templateId: wf1.id, tierOrder: 3, name: "Preferred Return", description: "8% preferred return (annual compounding) on contributed capital", splitLP: 100, splitGP: 0, hurdleRate: 8, appliesTo: "Capital Gains" },
      { id: "wft-1-4", templateId: wf1.id, tierOrder: 4, name: "GP Catch-Up", description: "100% to GP until GP has received 20% of total profit", splitLP: 0, splitGP: 100, appliesTo: "Capital Gains" },
      { id: "wft-1-5", templateId: wf1.id, tierOrder: 5, name: "Carried Interest", description: "Remaining profits split 80/20", splitLP: 80, splitGP: 20, appliesTo: "Capital Gains" },
    ],
  });

  // Link entities to template 1
  await prisma.entity.update({ where: { id: entity1.id }, data: { waterfallTemplateId: wf1.id } });
  await prisma.entity.update({ where: { id: entity2.id }, data: { waterfallTemplateId: wf1.id } });

  // Template 2: Income-First + Reduced Carry (Fund III)
  const wf2 = await prisma.waterfallTemplate.create({
    data: {
      id: "wf-2",
      name: "Income-First + Reduced Carry",
      description: "100% Income to LPs \u2192 ROC \u2192 6% Pref \u2192 85/15 Split",
      managementFeeRate: 0.015,
      feeBasis: "INVESTED_CAPITAL",
      carryPercent: 0.15,
      prefReturnRate: 0.06,
      prefReturnCompounding: "SIMPLE",
    },
  });

  await prisma.waterfallTier.createMany({
    data: [
      { id: "wft-2-1", templateId: wf2.id, tierOrder: 1, name: "Income Distribution", description: "100% of income to LPs", splitLP: 100, splitGP: 0, appliesTo: "Income Only" },
      { id: "wft-2-2", templateId: wf2.id, tierOrder: 2, name: "Return of Capital", description: "Return all contributed capital to LPs", splitLP: 100, splitGP: 0, appliesTo: "Capital" },
      { id: "wft-2-3", templateId: wf2.id, tierOrder: 3, name: "Preferred Return", description: "6% preferred return on contributed capital", splitLP: 100, splitGP: 0, hurdleRate: 6, appliesTo: "Capital Gains" },
      { id: "wft-2-4", templateId: wf2.id, tierOrder: 4, name: "Profit Split", description: "Remaining profits split 85/15", splitLP: 85, splitGP: 15, appliesTo: "Capital Gains" },
    ],
  });

  await prisma.entity.update({ where: { id: entity3.id }, data: { waterfallTemplateId: wf2.id } });

  // Template 3: No Fee / Flat Split (Growth Fund)
  const wf3 = await prisma.waterfallTemplate.create({
    data: {
      id: "wf-3",
      name: "No Fee / Flat Split",
      description: "ROC \u2192 90/10 Profit Split (no pref, no catch-up, no mgmt fee)",
      carryPercent: 0.10,
    },
  });

  await prisma.waterfallTier.createMany({
    data: [
      { id: "wft-3-1", templateId: wf3.id, tierOrder: 1, name: "Return of Capital", description: "Return all contributed capital to LPs", splitLP: 100, splitGP: 0, appliesTo: "Capital" },
      { id: "wft-3-2", templateId: wf3.id, tierOrder: 2, name: "Profit Split", description: "90/10 profit split, no preferred return or catch-up", splitLP: 90, splitGP: 10, appliesTo: "All Profits" },
    ],
  });

  await prisma.entity.update({ where: { id: entity4.id }, data: { waterfallTemplateId: wf3.id } });

  // Template 4: Credit Fund Income Pass-Through (Credit Opp I)
  const wf4 = await prisma.waterfallTemplate.create({
    data: {
      id: "wf-4",
      name: "Credit Fund \u2014 Income Pass-Through",
      description: "100% Interest Income to LPs pro rata \u2192 ROC \u2192 7% Pref \u2192 80/20 Split",
      managementFeeRate: 0.0125,
      feeBasis: "NAV",
      carryPercent: 0.20,
      prefReturnRate: 0.07,
      prefReturnCompounding: "SIMPLE",
    },
  });

  await prisma.waterfallTier.createMany({
    data: [
      { id: "wft-4-1", templateId: wf4.id, tierOrder: 1, name: "Interest Income Pass-Through", description: "100% interest income distributed to LPs pro rata", splitLP: 100, splitGP: 0, appliesTo: "Interest Income" },
      { id: "wft-4-2", templateId: wf4.id, tierOrder: 2, name: "Return of Capital", description: "Return all contributed capital to LPs", splitLP: 100, splitGP: 0, appliesTo: "Capital" },
      { id: "wft-4-3", templateId: wf4.id, tierOrder: 3, name: "Preferred Return", description: "7% preferred return on contributed capital", splitLP: 100, splitGP: 0, hurdleRate: 7, appliesTo: "Capital Gains" },
      { id: "wft-4-4", templateId: wf4.id, tierOrder: 4, name: "Profit Split", description: "Remaining profits split 80/20", splitLP: 80, splitGP: 20, appliesTo: "Capital Gains" },
    ],
  });

  await prisma.entity.update({ where: { id: entity8.id }, data: { waterfallTemplateId: wf4.id } });

  // Template 5: Sidecar Pari Passu (Sidecar A, Sidecar B, Co-Invest SPV)
  const wf5 = await prisma.waterfallTemplate.create({
    data: {
      id: "wf-5",
      name: "Sidecar \u2014 Pari Passu",
      description: "Same as parent fund waterfall, pro rata allocation",
      managementFeeRate: 0.02,
      feeBasis: "COMMITTED_CAPITAL",
      carryPercent: 0.20,
      prefReturnRate: 0.08,
      prefReturnCompounding: "COMPOUND",
    },
  });

  await prisma.waterfallTier.createMany({
    data: [
      { id: "wft-5-1", templateId: wf5.id, tierOrder: 1, name: "Income Distribution", description: "Same as parent fund \u2014 100% income to LPs", splitLP: 100, splitGP: 0, appliesTo: "Income Only" },
      { id: "wft-5-2", templateId: wf5.id, tierOrder: 2, name: "Return of Capital", description: "Same as parent fund \u2014 return all capital to LPs", splitLP: 100, splitGP: 0, appliesTo: "Capital" },
      { id: "wft-5-3", templateId: wf5.id, tierOrder: 3, name: "Preferred Return", description: "Same as parent fund \u2014 8% pref", splitLP: 100, splitGP: 0, hurdleRate: 8, appliesTo: "Capital Gains" },
      { id: "wft-5-4", templateId: wf5.id, tierOrder: 4, name: "GP Catch-Up", description: "Same as parent fund \u2014 100% to GP", splitLP: 0, splitGP: 100, appliesTo: "Capital Gains" },
      { id: "wft-5-5", templateId: wf5.id, tierOrder: 5, name: "Carried Interest", description: "Same as parent fund \u2014 80/20 split", splitLP: 80, splitGP: 20, appliesTo: "Capital Gains" },
    ],
  });

  await prisma.entity.update({ where: { id: entity5.id }, data: { waterfallTemplateId: wf5.id } });
  await prisma.entity.update({ where: { id: entity6.id }, data: { waterfallTemplateId: wf5.id } });
  await prisma.entity.update({ where: { id: entity7.id }, data: { waterfallTemplateId: wf5.id } });

  // ============================================================
  // CAPITAL ACCOUNTS — NOT SEEDED
  // These are computation outputs generated by the capital-activity-engine
  // (recomputeCapitalAccountForInvestor) when capital calls are funded
  // or distributions are paid. Not pre-loading ensures UAT proves the
  // computation pipeline works end-to-end.
  // ============================================================

  // ============================================================
  // ACTIVITY EVENTS (Timeline for NovaTech AI)
  // ============================================================
  console.log("Creating activity events...");

  await prisma.activityEvent.createMany({
    data: [
      { id: "ae-1", assetId: asset1.id, description: "Portfolio review meeting", eventDate: new Date("2025-02-25"), eventType: "meeting" },
      { id: "ae-2", assetId: asset1.id, description: "Task: Review Q4 financials completed", eventDate: new Date("2025-02-15"), eventType: "task" },
      { id: "ae-3", assetId: asset1.id, description: "Doc uploaded: Audited Financials", eventDate: new Date("2025-02-01"), eventType: "document" },
      { id: "ae-4", assetId: asset1.id, description: "Valuation: $112.0M (2.49x)", eventDate: new Date("2024-12-31"), eventType: "valuation" },
      { id: "ae-5", assetId: asset1.id, description: "Dividend received: $1.5M", eventDate: new Date("2024-12-15"), eventType: "income" },
    ],
  });

  // ── Companies (counterparties, GPs, service providers) ──
  const companies = [
    { id: "company-1", firmId: "firm-1", name: "Apex Industries Inc.", type: "COUNTERPARTY" as const, industry: "Industrials", website: "https://apexindustries.com" },
    { id: "company-2", firmId: "firm-1", name: "Beacon Healthcare Group", type: "COUNTERPARTY" as const, industry: "Healthcare", website: "https://beaconhealth.com" },
    { id: "company-3", firmId: "firm-1", name: "Ridgeline Properties LLC", type: "COUNTERPARTY" as const, industry: "Real Estate" },
    { id: "company-4", firmId: "firm-1", name: "Nordic Wind Capital", type: "GP" as const, industry: "Infrastructure" },
    { id: "company-5", firmId: "firm-1", name: "UrbanNest Inc.", type: "COUNTERPARTY" as const, industry: "Real Estate / PropTech" },
    { id: "company-6", firmId: "firm-1", name: "Blackstone", type: "GP" as const, industry: "Financial Services", website: "https://blackstone.com" },
    { id: "company-7", firmId: "firm-1", name: "Acme Capital", type: "GP" as const, industry: "Financial Services" },
    { id: "company-8", firmId: "firm-1", name: "KKR Credit", type: "GP" as const, industry: "Financial Services", website: "https://kkr.com" },
    { id: "company-9", firmId: "firm-1", name: "Goldman Sachs Asset Management", type: "SERVICE_PROVIDER" as const, industry: "Financial Services" },
    { id: "company-10", firmId: "firm-1", name: "Latham & Watkins LLP", type: "SERVICE_PROVIDER" as const, industry: "Legal" },
  ];

  for (const c of companies) {
    await prisma.company.upsert({
      where: { id: c.id },
      update: c,
      create: c,
    });
  }

  // ── LP Investor Companies ──────────────────────────────
  const lpCompanies = [
    { id: "company-calpers", firmId: "firm-1", name: "California Public Employees' Retirement System", type: "LP" as const, industry: "Public Pension" },
    { id: "company-harvard", firmId: "firm-1", name: "Harvard Management Company", type: "LP" as const, industry: "Endowment" },
    { id: "company-wellington", firmId: "firm-1", name: "Wellington Family Office", type: "LP" as const, industry: "Family Office" },
    { id: "company-meridian", firmId: "firm-1", name: "Meridian Partners", type: "LP" as const, industry: "Fund of Funds" },
    { id: "company-pacificrim", firmId: "firm-1", name: "Pacific Rim Sovereign Wealth Fund", type: "LP" as const, industry: "Sovereign Wealth" },
    { id: "company-greenfield", firmId: "firm-1", name: "Greenfield Insurance Group", type: "LP" as const, industry: "Insurance" },
  ];

  for (const c of lpCompanies) {
    await prisma.company.upsert({ where: { id: c.id }, update: c, create: c });
  }
  console.log("✓ Companies seeded");

  // Link existing investors to their LP companies
  await prisma.investor.update({ where: { id: "investor-1" }, data: { companyId: "company-calpers" } });
  await prisma.investor.update({ where: { id: "investor-2" }, data: { companyId: "company-harvard" } });
  await prisma.investor.update({ where: { id: "investor-3" }, data: { companyId: "company-wellington" } });
  await prisma.investor.update({ where: { id: "investor-4" }, data: { companyId: "company-meridian" } });
  await prisma.investor.update({ where: { id: "investor-5" }, data: { companyId: "company-pacificrim" } });
  await prisma.investor.update({ where: { id: "investor-6" }, data: { companyId: "company-greenfield" } });
  console.log("✓ Investors linked to companies");

  // ── Contacts (counterparty + service provider contacts) ──
  const contacts = [
    { id: "contact-1", firmId: "firm-1", firstName: "Robert", lastName: "Chen", email: "rchen@apexindustries.com", title: "CEO", type: "EXTERNAL" as const, companyId: "company-1" },
    { id: "contact-2", firmId: "firm-1", firstName: "Lisa", lastName: "Park", email: "lpark@beaconhealth.com", title: "CFO", type: "EXTERNAL" as const, companyId: "company-2" },
    { id: "contact-3", firmId: "firm-1", firstName: "David", lastName: "Morse", email: "dmorse@ridgeline.com", title: "Managing Partner", type: "EXTERNAL" as const, companyId: "company-3" },
    { id: "contact-4", firmId: "firm-1", firstName: "Erik", lastName: "Johansson", email: "erik@nordicwind.com", title: "Partner", type: "EXTERNAL" as const, companyId: "company-4" },
    { id: "contact-5", firmId: "firm-1", firstName: "Maria", lastName: "Santos", email: "msantos@urbanest.com", title: "Founder & CEO", type: "EXTERNAL" as const, companyId: "company-5" },
    { id: "contact-6", firmId: "firm-1", firstName: "Tom", lastName: "Bradley", email: "tbradley@latham.com", title: "Partner", type: "EXTERNAL" as const, companyId: "company-10" },
  ];

  for (const c of contacts) {
    await prisma.contact.upsert({ where: { id: c.id }, update: c, create: c });
  }

  // ── LP Investor Contacts ──────────────────────────────
  const lpContacts = [
    { id: "contact-calpers-mc", firmId: "firm-1", firstName: "Michael", lastName: "Chen", email: "michael.chen@calpers.ca.gov", title: "Director of Private Equity", type: "EXTERNAL" as const, companyId: "company-calpers" },
    { id: "contact-calpers-sw", firmId: "firm-1", firstName: "Sarah", lastName: "Wang", email: "sarah.wang@calpers.ca.gov", title: "Investment Analyst", type: "EXTERNAL" as const, companyId: "company-calpers" },
    { id: "contact-harvard-dm", firmId: "firm-1", firstName: "David", lastName: "Morrison", email: "d.morrison@hmc.harvard.edu", title: "Portfolio Manager", type: "EXTERNAL" as const, companyId: "company-harvard" },
    { id: "contact-wellington-tw", firmId: "firm-1", firstName: "Tom", lastName: "Wellington", email: "tom@wellingtonfamily.com", title: "Principal", type: "EXTERNAL" as const, companyId: "company-wellington" },
    { id: "contact-meridian-ra", firmId: "firm-1", firstName: "Rachel", lastName: "Adams", email: "rachel@meridianpartners.com", title: "Managing Director", type: "EXTERNAL" as const, companyId: "company-meridian" },
    { id: "contact-pacificrim-yk", firmId: "firm-1", firstName: "Yuki", lastName: "Tanaka", email: "y.tanaka@pacificrimsov.gov", title: "Head of Alternatives", type: "EXTERNAL" as const, companyId: "company-pacificrim" },
    { id: "contact-greenfield-jb", firmId: "firm-1", firstName: "John", lastName: "Barrett", email: "jbarrett@greenfieldins.com", title: "Chief Investment Officer", type: "EXTERNAL" as const, companyId: "company-greenfield" },
  ];

  for (const c of lpContacts) {
    await prisma.contact.upsert({ where: { id: c.id }, update: c, create: c });
  }
  console.log("✓ Contacts seeded");

  // ── LP Users (portal access accounts) ──────────────────
  console.log("Creating LP users...");

  // Note: SERVICE_PROVIDER users get aiEnabled=false explicitly on creation (via API POST handler).
  // LP_INVESTOR users: aiEnabled defaults to true in schema but AI access is N/A for LP users (shown as N/A in UI).
  // No SERVICE_PROVIDER users are seeded — they would be invited via the UI which handles aiEnabled=false.
  await prisma.user.createMany({
    data: [
      { id: "user-lp-calpers", firmId: firm.id, email: "michael.chen@calpers.ca.gov", name: "Michael Chen", role: "LP_INVESTOR", initials: "MC", contactId: "contact-calpers-mc" },
      { id: "user-lp-calpers2", firmId: firm.id, email: "sarah.wang@calpers.ca.gov", name: "Sarah Wang", role: "LP_INVESTOR", initials: "SW", contactId: "contact-calpers-sw" },
      { id: "user-lp-harvard", firmId: firm.id, email: "d.morrison@hmc.harvard.edu", name: "David Morrison", role: "LP_INVESTOR", initials: "DM", contactId: "contact-harvard-dm" },
      { id: "user-lp-wellington", firmId: firm.id, email: "tom@wellingtonfamily.com", name: "Tom Wellington", role: "LP_INVESTOR", initials: "TW", contactId: "contact-wellington-tw" },
      { id: "user-lp-consultant", firmId: firm.id, email: "rachel@meridianpartners.com", name: "Rachel Adams", role: "LP_INVESTOR", initials: "RA", contactId: "contact-meridian-ra" },
    ],
  });
  console.log("✓ LP users created");

  // ── Investor User Access (many-to-many portal access) ──
  console.log("Creating investor user access records...");

  await prisma.investorUserAccess.createMany({
    data: [
      { investorId: "investor-1", userId: "user-lp-calpers", role: "primary" },    // Michael Chen → CalPERS
      { investorId: "investor-1", userId: "user-lp-calpers2", role: "viewer" },     // Sarah Wang → CalPERS (2 users, 1 investor)
      { investorId: "investor-2", userId: "user-lp-harvard", role: "primary" },     // David Morrison → Harvard
      { investorId: "investor-3", userId: "user-lp-wellington", role: "primary" },  // Tom Wellington → Wellington
      { investorId: "investor-4", userId: "user-lp-consultant", role: "primary" },  // Rachel Adams → Meridian
      { investorId: "investor-1", userId: "user-lp-consultant", role: "viewer" },   // Rachel Adams → CalPERS (1 user, 2 investors)
    ],
  });
  console.log("✓ Investor user access seeded");

  // ============================================================
  // SAMPLE NOTIFICATIONS (for user-jk)
  // ============================================================
  console.log("Creating sample notifications...");

  await prisma.notification.createMany({
    data: [
      { userId: "user-jk", type: "STAGE_CHANGE", subject: "Apex Manufacturing advanced to IC Review", body: "Deal has moved from Due Diligence to IC Review stage.", isRead: true, readAt: new Date("2026-02-27"), createdAt: new Date("2026-02-27") },
      { userId: "user-jk", type: "IC_VOTE", subject: "Sarah Martinez voted APPROVE on Apex Manufacturing", body: "Agree, but want customer concentration addressed in closing docs.", isRead: true, readAt: new Date("2026-02-28"), createdAt: new Date("2026-02-28") },
      { userId: "user-jk", type: "DOCUMENT_UPLOAD", subject: "New document uploaded to Beacon Health", body: "Patient volume data and payer mix analysis uploaded by SM.", isRead: false, createdAt: new Date("2026-02-20") },
      { userId: "user-jk", type: "STAGE_CHANGE", subject: "Ridgeline Senior Debt advanced to Due Diligence", body: "AI screening completed with score 88/100. Deal moved to Due Diligence.", isRead: false, createdAt: new Date("2026-02-08") },
      { userId: "user-jk", type: "TASK_ASSIGNED", subject: "New task assigned: Review Apex QoE report", body: "You've been assigned to review the Quality of Earnings report for Apex Manufacturing.", isRead: false, createdAt: new Date("2026-02-12") },
      { userId: "user-sm", type: "STAGE_CHANGE", subject: "Beacon Health advanced to Due Diligence", body: "AI screening completed with score 74/100.", isRead: false, createdAt: new Date("2026-02-10") },
    ],
  });
  console.log("✓ Notifications seeded");

  // ============================================================
  // AI CONFIGURATION (for firm-1, default OpenAI config)
  // ============================================================
  console.log("Creating AI configuration...");

  await prisma.aIConfiguration.create({
    data: {
      id: "ai-config-1",
      firmId: firm.id,
      provider: "openai",
      model: "gpt-4o",
      systemPrompt: `You are an expert investment analyst for a family office GP. Analyze the provided deal documents and produce a structured screening report.\n\nEvaluate:\n1. Business quality and competitive positioning\n2. Financial health and growth trajectory\n3. Management team strength\n4. Deal structure and terms\n5. Key risks and mitigants\n\nProvide a score (0-100) and recommendation: PROCEED_TO_DD, WATCHLIST, or PASS.`,
      thresholdScore: 70,
      maxDocuments: 10,
      processingMode: "async",
    },
  });
  console.log("✓ AI configuration seeded");

  // ============================================================
  // AI PROMPT TEMPLATES
  // ============================================================
  console.log("Creating AI prompt templates...");

  const { DEFAULT_PROMPT_TEMPLATES } = await import("../src/lib/default-prompt-templates");
  for (let i = 0; i < DEFAULT_PROMPT_TEMPLATES.length; i++) {
    const tmpl = DEFAULT_PROMPT_TEMPLATES[i];
    await prisma.aIPromptTemplate.create({
      data: {
        firmId: firm.id,
        type: tmpl.type,
        module: tmpl.module,
        name: tmpl.name,
        description: tmpl.description,
        content: tmpl.content,
        isDefault: true,
        isActive: true,
        sortOrder: i,
      },
    });
  }
  console.log("✓ AI prompt templates seeded");

  // ============================================================
  // TRANSACTIONS (ledger entries for capital calls + distributions)
  // ============================================================
  console.log("Creating transactions...");

  await prisma.transaction.createMany({
    data: [
      // Capital call transactions
      { id: "txn-1", entityId: entity2.id, transactionType: "CAPITAL_CALL", amount: 25_000_000, date: new Date("2025-02-15"), description: "CC-007 — CloudBase follow-on", referenceId: "cc-1", referenceType: "CapitalCall" },
      { id: "txn-2", entityId: entity2.id, transactionType: "CAPITAL_CALL", amount: 15_000_000, date: new Date("2025-02-28"), description: "CC-008 — Mgmt fees Q1 + Expenses", referenceId: "cc-2", referenceType: "CapitalCall" },
      { id: "txn-3", entityId: entity8.id, transactionType: "CAPITAL_CALL", amount: 10_000_000, date: new Date("2025-03-01"), description: "CC-003 — New credit deployment", referenceId: "cc-3", referenceType: "CapitalCall" },
      { id: "txn-4", entityId: entity3.id, transactionType: "CAPITAL_CALL", amount: 8_000_000, date: new Date("2025-01-15"), description: "CC-005 — Sequoia pass-through", referenceId: "cc-4", referenceType: "CapitalCall" },
      // Distribution transactions
      { id: "txn-5", entityId: entity1.id, transactionType: "DISTRIBUTION", amount: 58_000_000, date: new Date("2025-01-31"), description: "Exit — SolarGrid Energy", referenceId: "dist-1", referenceType: "DistributionEvent" },
      { id: "txn-6", entityId: entity1.id, transactionType: "DISTRIBUTION", amount: 12_000_000, date: new Date("2024-09-30"), description: "Dividend — NovaTech AI", referenceId: "dist-2", referenceType: "DistributionEvent" },
      { id: "txn-7", entityId: entity8.id, transactionType: "DISTRIBUTION", amount: 2_100_000, date: new Date("2024-12-31"), description: "Interest income Q4", referenceId: "dist-3", referenceType: "DistributionEvent" },
      { id: "txn-8", entityId: entity1.id, transactionType: "DISTRIBUTION", amount: 1_200_000, date: new Date("2024-06-30"), description: "Dividend — NovaTech AI", referenceId: "dist-4", referenceType: "DistributionEvent" },
      // Additional income/fee transactions
      { id: "txn-9", entityId: entity1.id, transactionType: "INCOME", amount: 1_520_000, date: new Date("2024-12-15"), description: "NovaTech AI — Q4 dividend", isPrincipal: false },
      { id: "txn-10", entityId: entity3.id, transactionType: "FEE", amount: 375_000, date: new Date("2025-01-01"), description: "Q1 2025 management fee", isPrincipal: false },
      { id: "txn-11", entityId: entity4.id, transactionType: "INCOME", amount: 410_000, date: new Date("2024-12-31"), description: "123 Industrial — Q4 rental NOI", isPrincipal: false },
      { id: "txn-12", entityId: entity2.id, transactionType: "FEE", amount: 625_000, date: new Date("2025-01-01"), description: "Q1 2025 management fee", isPrincipal: false },
      { id: "txn-13", entityId: entity1.id, transactionType: "EXIT", amount: 58_000_000, date: new Date("2025-01-31"), description: "SolarGrid Energy — full exit proceeds", isPrincipal: true, referenceId: "asset-7", referenceType: "Asset" },
      { id: "txn-14", entityId: entity2.id, transactionType: "INVESTMENT", amount: 8_000_000, date: new Date("2024-11-01"), description: "CloudBase Systems — follow-on Series C", isPrincipal: true, referenceId: "asset-8", referenceType: "Asset" },
    ],
  });
  console.log("✓ Transactions seeded");

  // ============================================================
  // CONTACT INTERACTIONS (CRM seed data)
  // ============================================================
  console.log("Creating contact interactions...");

  await prisma.contactInteraction.createMany({
    data: [
      // Robert Chen (contact-1, CEO of Apex Industries)
      { id: "ci-1", firmId: "firm-1", contactId: "contact-1", authorId: "user-jk", type: "CALL", notes: "Introductory call with Robert — discussed Q4 performance and upcoming Board. Strong relationship with fund I leadership.", date: new Date("2026-03-01") },
      { id: "ci-2", firmId: "firm-1", contactId: "contact-1", authorId: "user-al", type: "MEETING", notes: "Site visit at Apex HQ. Reviewed operations and capex plan. Management team looks strong.", date: new Date("2026-02-15") },
      { id: "ci-3", firmId: "firm-1", contactId: "contact-1", authorId: "user-sm", type: "EMAIL", notes: "Sent Q4 reporting package. Robert responded promptly with questions on EBITDA adjustments.", date: new Date("2026-01-20") },
      // Lisa Park (contact-2, CFO of Beacon Health)
      { id: "ci-4", firmId: "firm-1", contactId: "contact-2", authorId: "user-jk", type: "MEETING", notes: "Quarterly business review with Lisa. Discussed regulatory pipeline and reimbursement dynamics. Very engaged.", date: new Date("2026-02-28") },
      { id: "ci-5", firmId: "firm-1", contactId: "contact-2", authorId: "user-sm", type: "NOTE", notes: "Lisa mentioned they are exploring a strategic acquisition in the midwest. Worth monitoring as a co-invest opportunity.", date: new Date("2026-02-10") },
      // David Morse (contact-3, Managing Partner at Ridgeline Capital)
      { id: "ci-6", firmId: "firm-1", contactId: "contact-3", authorId: "user-al", type: "CALL", notes: "Discussed co-invest opportunity on Nordic Wind deal. David is interested at $5M ticket. Following up with term sheet.", date: new Date("2026-03-05") },
      { id: "ci-7", firmId: "firm-1", contactId: "contact-3", authorId: "user-jk", type: "EMAIL", notes: "Sent NDA and co-invest summary deck. Awaiting signature.", date: new Date("2026-02-20") },
      // Erik Johansson (contact-4, Partner at Nordic Wind Energy)
      { id: "ci-8", firmId: "firm-1", contactId: "contact-4", authorId: "user-jk", type: "MEETING", notes: "Kick-off meeting with Erik on the Nordic Wind deal. Excellent alignment on structure. Moving to DD phase.", date: new Date("2026-01-15") },
      // Maria Santos (contact-5, CEO of UrbanEst)
      { id: "ci-9", firmId: "firm-1", contactId: "contact-5", authorId: "user-al", type: "NOTE", notes: "Maria reached out re: follow-on capital. Series B timeline pushed to Q3. Monitoring.", date: new Date("2026-02-08") },
    ],
  });
  console.log("✓ Contact interactions seeded");

  // ============================================================
  // CONTACT TAGS (CRM relationship tags)
  // ============================================================
  console.log("Creating contact tags...");

  await prisma.contactTag.createMany({
    data: [
      // Robert Chen — Broker + Co-Investor
      { id: "ct-1", firmId: "firm-1", contactId: "contact-1", tag: "Co-Investor" },
      { id: "ct-2", firmId: "firm-1", contactId: "contact-1", tag: "Board Member" },
      // Lisa Park — LP Prospect
      { id: "ct-3", firmId: "firm-1", contactId: "contact-2", tag: "LP Prospect" },
      // David Morse — Co-Investor + Broker
      { id: "ct-4", firmId: "firm-1", contactId: "contact-3", tag: "Co-Investor" },
      { id: "ct-5", firmId: "firm-1", contactId: "contact-3", tag: "Broker" },
      // Erik Johansson — Advisor
      { id: "ct-6", firmId: "firm-1", contactId: "contact-4", tag: "Advisor" },
      // Maria Santos — LP Prospect + Advisor
      { id: "ct-7", firmId: "firm-1", contactId: "contact-5", tag: "LP Prospect" },
      // Tom Bradley (legal counsel) — Service Provider
      { id: "ct-8", firmId: "firm-1", contactId: "contact-6", tag: "Service Provider" },
    ],
  });
  console.log("✓ Contact tags seeded");

  // ============================================================
  // DEAL CO-INVESTORS (CRM co-investor tracking)
  // ============================================================
  console.log("Creating deal co-investors...");

  await prisma.dealCoInvestor.createMany({
    data: [
      // deal-1 (Apex Manufacturing): Robert Chen as Lead co-investor, David Morse as Participant
      { id: "dci-1", dealId: "deal-1", contactId: "contact-1", role: "Lead", allocation: 5_000_000, status: "Committed", notes: "Robert confirmed $5M commitment at last board call." },
      { id: "dci-2", dealId: "deal-1", contactId: "contact-3", role: "Participant", allocation: 3_000_000, status: "Interested", notes: "David Morse from Ridgeline expressed interest; awaiting formal LOI." },
      // deal-2 (Beacon Health): Lisa Park (co-investor from Healthcare network)
      { id: "dci-3", dealId: "deal-2", contactId: "contact-2", role: "Syndicate Member", allocation: 2_000_000, status: "Interested", notes: "Lisa has healthcare connections; exploring participation." },
      // deal-4 (Ridgeline Senior Debt): David Morse (co-invest from Ridgeline), Robert Chen funded
      { id: "dci-4", dealId: "deal-4", contactId: "contact-3", role: "Lead", allocation: 4_000_000, status: "Funded", notes: "David Morse co-invested at SOFR+350. Wired funds 2026-01-10." },
      { id: "dci-5", dealId: "deal-4", contactId: "contact-1", role: "Participant", allocation: 2_000_000, status: "Committed", notes: "Robert Chen participating alongside. Docs signed." },
      // deal-5 (Nordic Wind): Erik Johansson as Syndicate Member
      { id: "dci-6", dealId: "deal-5", contactId: "contact-4", role: "Syndicate Member", allocation: 1_500_000, status: "Passed", notes: "Erik passed — conflict of interest as fund employee." },
    ],
  });
  console.log("✓ Deal co-investors seeded");

  // ============================================================
  // DEAL SOURCING ATTRIBUTION (update after contacts are seeded)
  // ============================================================
  console.log("Setting deal sourcing attribution...");

  await prisma.deal.update({ where: { id: "deal-3" }, data: { sourcedByContactId: "contact-5" } }); // UrbanNest sourced by Maria Santos
  await prisma.deal.update({ where: { id: "deal-4" }, data: { sourcedByContactId: "contact-3" } }); // Ridgeline sourced by David Morse
  await prisma.deal.update({ where: { id: "deal-5" }, data: { sourcedByContactId: "contact-4" } }); // Nordic Wind sourced by Erik Johansson
  console.log("✓ Deal sourcing attribution seeded");

  console.log("Seeding complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
