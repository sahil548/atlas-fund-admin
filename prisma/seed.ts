import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding Atlas database...");

  // ============================================================
  // CLEAR ALL TABLES (reverse dependency order)
  // ============================================================
  console.log("Clearing existing data...");

  await prisma.aIPromptTemplate.deleteMany();
  await prisma.aIConfiguration.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.task.deleteMany();
  await prisma.dealActivity.deleteMany();
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
  // USERS (3 GP users)
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
  // DD WORKSTREAMS + AI-GENERATED FINDINGS
  // ============================================================
  console.log("Creating DD workstreams with AI findings...");

  // Deal 1 (IC_REVIEW) - Completed workstreams with all findings resolved
  const deal1Workstreams = [
    { id: "ws-1-1", name: "Financial DD", description: "AI identified 5 financial areas requiring investigation for Apex Manufacturing.", customInstructions: "Focus on margin sustainability and customer revenue concentration.", sortOrder: 1, status: "COMPLETE" as const, totalTasks: 5, completedTasks: 5, hasAI: true, aiGenerated: true },
    { id: "ws-1-2", name: "Commercial DD", description: "Market positioning and competitive dynamics analysis.", customInstructions: "Analyze defense contract pipeline and market share.", sortOrder: 2, status: "COMPLETE" as const, totalTasks: 4, completedTasks: 4, hasAI: true, aiGenerated: true },
    { id: "ws-1-3", name: "Legal DD", description: "Corporate structure, IP, and contract review.", sortOrder: 3, status: "COMPLETE" as const, totalTasks: 4, completedTasks: 4, hasAI: true, aiGenerated: true },
    { id: "ws-1-4", name: "Tax DD", description: "Tax structure and compliance review.", sortOrder: 4, status: "COMPLETE" as const, totalTasks: 3, completedTasks: 3, hasAI: true, aiGenerated: true },
    { id: "ws-1-5", name: "ESG DD", description: "Environmental and governance assessment.", sortOrder: 5, status: "COMPLETE" as const, totalTasks: 3, completedTasks: 3, hasAI: true, aiGenerated: true },
    { id: "ws-1-6", name: "Management DD", description: "Leadership team assessment and succession planning.", sortOrder: 6, status: "COMPLETE" as const, totalTasks: 3, completedTasks: 3, hasAI: true, aiGenerated: true },
  ];

  for (const ws of deal1Workstreams) {
    await prisma.dDWorkstream.create({ data: { ...ws, dealId: deal1.id } });
  }

  // Deal 1 tasks (all resolved since in IC_REVIEW)
  const deal1Tasks = [
    { workstreamId: "ws-1-1", title: "Validate EBITDA margin sustainability at 22%", description: "Management claims 22% EBITDA margins. Verify through QoE analysis and benchmark against specialty manufacturing peers.", priority: "HIGH", source: "AI_SCREENING", status: "DONE" as const, resolution: "QoE confirmed 21.8% normalized margin. Add-backs are reasonable.", resolvedAt: new Date("2026-02-15"), resolvedBy: "JK" },
    { workstreamId: "ws-1-1", title: "Analyze customer concentration impact on revenue stability", description: "Top 3 customers represent 65% of revenue. Model impact of losing any single customer on cash flow and covenant coverage.", priority: "HIGH", source: "AI_SCREENING", status: "DONE" as const, resolution: "Modeled 3 scenarios. Even loss of largest customer (28%) keeps DSCR above 1.2x with cost restructuring.", resolvedAt: new Date("2026-02-18"), resolvedBy: "SM" },
    { workstreamId: "ws-1-1", title: "Review working capital cycle and cash conversion", description: "DSO appears elevated at 62 days. Investigate receivables aging and collection patterns.", priority: "MEDIUM", source: "AI_SCREENING", status: "DONE" as const, resolution: "DSO driven by DoD payment terms (60-90 days). Normal for defense contracts. No collection issues.", resolvedAt: new Date("2026-02-20"), resolvedBy: "JK" },
    { workstreamId: "ws-1-1", title: "Assess CapEx requirements for growth plan", description: "Management projects $5M annual CapEx. Verify against historical spend and facility condition.", priority: "MEDIUM", source: "AI_SCREENING", status: "DONE" as const, resolution: "Historical CapEx averaged $4.2M. $5M estimate includes CNC machine upgrade — confirmed with site visit.", resolvedAt: new Date("2026-02-22"), resolvedBy: "AL" },
    { workstreamId: "ws-1-1", title: "Model debt capacity and financing structure", description: "Proposed leverage of 3.5x EBITDA. Stress test under downside scenarios.", priority: "MEDIUM", source: "AI_SCREENING", status: "DONE" as const, resolution: "3.5x achievable with 2-year deleveraging to 2.5x. Bank term sheet received at SOFR+275.", resolvedAt: new Date("2026-02-25"), resolvedBy: "JK" },
    { workstreamId: "ws-1-2", title: "Map competitive landscape and market share", description: "Assess Apex's position in specialty aerospace manufacturing market. Identify key competitors and barriers to entry.", priority: "HIGH", source: "AI_SCREENING", status: "DONE" as const, resolution: "Top 5 player in niche. High barriers (AS9100 certification, security clearances). 2-3 year moat.", resolvedAt: new Date("2026-02-16"), resolvedBy: "SM" },
    { workstreamId: "ws-1-2", title: "Evaluate defense contract pipeline", description: "Review backlog of $120M. Assess probability-weighted pipeline and renewal rates.", priority: "HIGH", source: "AI_SCREENING", status: "DONE" as const, resolution: "Backlog confirmed. 85% historical renewal rate. 3 new RFPs in pipeline worth $40M.", resolvedAt: new Date("2026-02-19"), resolvedBy: "SM" },
    { workstreamId: "ws-1-2", title: "Assess customer diversification opportunity", description: "Management claims ability to expand into commercial aerospace. Validate market entry strategy.", priority: "MEDIUM", source: "AI_SCREENING", status: "DONE" as const, resolution: "Preliminary discussions with Boeing Tier 2 supplier program. 12-18 month qualification timeline.", resolvedAt: new Date("2026-02-21"), resolvedBy: "SM" },
    { workstreamId: "ws-1-2", title: "Review pricing power and margin trends", description: "Assess ability to pass through raw material cost increases to customers.", priority: "MEDIUM", source: "AI_SCREENING", status: "DONE" as const, resolution: "Most contracts have annual price escalation clauses. 6-month lag on pass-through for spot purchases.", resolvedAt: new Date("2026-02-23"), resolvedBy: "JK" },
    { workstreamId: "ws-1-3", title: "Review material contracts and change of control provisions", description: "Assess impact of acquisition on key customer contracts and supplier agreements.", priority: "HIGH", source: "AI_SCREENING", status: "DONE" as const, resolution: "3 of 5 major contracts require change of control consent. All 3 consents received.", resolvedAt: new Date("2026-02-17"), resolvedBy: "AL" },
    { workstreamId: "ws-1-3", title: "Assess IP ownership and trade secret protection", description: "Review proprietary manufacturing processes and patent portfolio.", priority: "MEDIUM", source: "AI_SCREENING", status: "DONE" as const, resolution: "12 active patents. Trade secrets well-protected with employee NDAs and information security protocols.", resolvedAt: new Date("2026-02-20"), resolvedBy: "AL" },
    { workstreamId: "ws-1-3", title: "Review pending litigation and contingent liabilities", description: "Check for any outstanding legal claims or environmental liabilities.", priority: "MEDIUM", source: "AI_SCREENING", status: "DONE" as const, resolution: "One minor workers comp claim ($50K). No environmental issues. Clean litigation history.", resolvedAt: new Date("2026-02-22"), resolvedBy: "AL" },
    { workstreamId: "ws-1-3", title: "Verify ITAR/EAR compliance history", description: "Defense manufacturer requires full compliance audit for International Traffic in Arms Regulations.", priority: "HIGH", source: "AI_SCREENING", status: "DONE" as const, resolution: "Clean compliance record. Internal compliance officer and annual third-party audit in place.", resolvedAt: new Date("2026-02-24"), resolvedBy: "AL" },
    { workstreamId: "ws-1-4", title: "Review tax structure and optimize for acquisition", description: "Analyze current C-corp structure and evaluate pass-through options.", priority: "MEDIUM", source: "AI_SCREENING", status: "DONE" as const, resolution: "Stock purchase preferred by seller. 338(h)(10) election provides step-up basis worth ~$8M in tax shield.", resolvedAt: new Date("2026-02-19"), resolvedBy: "SM" },
    { workstreamId: "ws-1-4", title: "Assess R&D tax credit utilization", description: "Manufacturing R&D activities may qualify for federal and state credits.", priority: "LOW", source: "AI_SCREENING", status: "DONE" as const, resolution: "R&D credit study identified $1.2M annual benefit. Previously unclaimed by seller.", resolvedAt: new Date("2026-02-21"), resolvedBy: "SM" },
    { workstreamId: "ws-1-4", title: "Review state tax nexus and transfer pricing", description: "Multi-state operations create nexus considerations.", priority: "LOW", source: "AI_SCREENING", status: "DONE" as const, resolution: "Operations in 3 states. No material transfer pricing issues. State tax burden ~4%.", resolvedAt: new Date("2026-02-23"), resolvedBy: "SM" },
    { workstreamId: "ws-1-5", title: "Assess environmental compliance", description: "Manufacturing operations may have environmental exposure. Review permits and compliance history.", priority: "MEDIUM", source: "AI_SCREENING", status: "DONE" as const, resolution: "Phase I ESA clean. All permits current. No material environmental liabilities.", resolvedAt: new Date("2026-02-18"), resolvedBy: "AL" },
    { workstreamId: "ws-1-5", title: "Review workplace safety record", description: "OSHA compliance and injury rate analysis.", priority: "LOW", source: "AI_SCREENING", status: "DONE" as const, resolution: "TRIR of 1.2 vs industry avg 3.4. Strong safety culture. No OSHA citations in 5 years.", resolvedAt: new Date("2026-02-20"), resolvedBy: "AL" },
    { workstreamId: "ws-1-5", title: "Evaluate governance and board structure", description: "Assess corporate governance practices and proposed board composition.", priority: "LOW", source: "AI_SCREENING", status: "DONE" as const, resolution: "Will establish 5-member board. 2 Atlas seats, 2 management, 1 independent.", resolvedAt: new Date("2026-02-22"), resolvedBy: "JK" },
    { workstreamId: "ws-1-6", title: "Assess CEO key-man risk and succession plan", description: "Founder/CEO is critical to operations. Evaluate transition and retention plan.", priority: "HIGH", source: "AI_SCREENING", status: "DONE" as const, resolution: "CEO committed to 3-year transition. COO identified as successor. Key-man insurance to be obtained.", resolvedAt: new Date("2026-02-17"), resolvedBy: "JK" },
    { workstreamId: "ws-1-6", title: "Evaluate management team depth", description: "Assess capabilities of VP-level team and operational bench strength.", priority: "MEDIUM", source: "AI_SCREENING", status: "DONE" as const, resolution: "Strong VP Engineering and VP Sales. Need to hire CFO (currently outsourced). Budget allocated.", resolvedAt: new Date("2026-02-19"), resolvedBy: "SM" },
    { workstreamId: "ws-1-6", title: "Review compensation and incentive alignment", description: "Ensure management incentives are aligned with investment thesis.", priority: "MEDIUM", source: "AI_SCREENING", status: "DONE" as const, resolution: "30% management rollover. Option pool of 10% for key employees. Vesting tied to MOIC hurdles.", resolvedAt: new Date("2026-02-21"), resolvedBy: "JK" },
  ];

  for (const task of deal1Tasks) {
    await prisma.dDTask.create({ data: { ...task, assignee: task.resolvedBy || "JK" } });
  }

  // Deal 2 (DUE_DILIGENCE) - AI-generated findings, some resolved, some in progress
  const deal2Workstreams = [
    { id: "ws-2-1", name: "Financial DD", description: "AI identified 5 financial areas requiring investigation based on clinic platform financials.", customInstructions: "Focus on same-store growth metrics and new site unit economics.", sortOrder: 1, status: "IN_PROGRESS" as const, totalTasks: 5, completedTasks: 2, hasAI: true, aiGenerated: true },
    { id: "ws-2-2", name: "Commercial DD", description: "Market dynamics and competitive positioning analysis for outpatient clinic platform.", customInstructions: "Analyze patient acquisition costs and geographic expansion potential.", sortOrder: 2, status: "IN_PROGRESS" as const, totalTasks: 4, completedTasks: 1, hasAI: true, aiGenerated: true },
    { id: "ws-2-3", name: "Legal DD", description: "Healthcare regulatory compliance and corporate structure review.", customInstructions: "Focus on state licensing requirements and Stark Law compliance.", sortOrder: 3, status: "NOT_STARTED" as const, totalTasks: 4, completedTasks: 0, hasAI: true, aiGenerated: true },
    { id: "ws-2-4", name: "Operational DD", description: "Clinic operations, staffing model, and technology infrastructure.", customInstructions: "Evaluate EMR system, staffing ratios, and patient throughput metrics.", sortOrder: 4, status: "IN_PROGRESS" as const, totalTasks: 3, completedTasks: 1, hasAI: true, aiGenerated: true },
    { id: "ws-2-5", name: "Tax DD", description: "Healthcare-specific tax structure and compliance.", sortOrder: 5, status: "NOT_STARTED" as const, totalTasks: 2, completedTasks: 0, hasAI: true, aiGenerated: true },
    { id: "ws-2-6", name: "ESG DD", description: "Healthcare access and quality of care assessment.", sortOrder: 6, status: "NOT_STARTED" as const, totalTasks: 2, completedTasks: 0, hasAI: true, aiGenerated: true },
  ];

  for (const ws of deal2Workstreams) {
    await prisma.dDWorkstream.create({ data: { ...ws, dealId: deal2.id } });
  }

  const deal2Tasks = [
    { workstreamId: "ws-2-1", title: "Validate same-store revenue growth of 15%", description: "Management claims 15% same-store growth but this needs validation against patient volume data and payer mix shifts. Check if growth is driven by volume vs. rate increases.", priority: "HIGH", source: "AI_SCREENING", status: "DONE" as const, assignee: "SM", resolution: "Confirmed 14.8% SSS growth through patient records analysis. Primarily volume-driven.", resolvedAt: new Date("2026-02-20"), resolvedBy: "SM" },
    { workstreamId: "ws-2-1", title: "Assess new site ramp economics", description: "New sites reportedly take 18+ months to break even. Need to verify actual ramp curves across the 8 sites opened in last 3 years.", priority: "HIGH", source: "AI_SCREENING", status: "DONE" as const, assignee: "SM", resolution: "Average breakeven is 16 months. 2 of 8 sites took 22+ months due to staffing issues.", resolvedAt: new Date("2026-02-25"), resolvedBy: "SM" },
    { workstreamId: "ws-2-1", title: "Review reimbursement rate sensitivity", description: "30% of revenue comes from Medicare/Medicaid. Model impact of potential 5-10% rate cuts on EBITDA margin.", priority: "HIGH", source: "AI_SCREENING", status: "IN_PROGRESS" as const, assignee: "JK" },
    { workstreamId: "ws-2-1", title: "Analyze physician compensation structure", description: "Physician comp as % of revenue appears above market at 42%. Investigate if this is sustainable and what happens at scale.", priority: "MEDIUM", source: "AI_SCREENING", status: "TODO" as const, assignee: "SM" },
    { workstreamId: "ws-2-1", title: "Verify accounts receivable aging", description: "A/R days appear elevated at 58 days. Check if this is driven by specific payer mix or collection issues.", priority: "MEDIUM", source: "AI_SCREENING", status: "TODO" as const, assignee: "AL" },
    { workstreamId: "ws-2-2", title: "Map competitive landscape in target markets", description: "Identify competing outpatient clinic platforms in the 5 states of operation. Assess market share and differentiation.", priority: "HIGH", source: "AI_SCREENING", status: "DONE" as const, assignee: "SM", resolution: "3 direct competitors identified. Beacon has strongest brand in 3 of 5 markets. OneHealth poses threat in FL.", resolvedAt: new Date("2026-02-22"), resolvedBy: "SM" },
    { workstreamId: "ws-2-2", title: "Analyze patient acquisition cost trends", description: "CAC has been rising 12% YoY. Investigate drivers and sustainability of current marketing spend efficiency.", priority: "MEDIUM", source: "AI_SCREENING", status: "TODO" as const, assignee: "SM" },
    { workstreamId: "ws-2-2", title: "Evaluate geographic expansion pipeline", description: "Management targets 5 new markets in 2027. Assess market selection criteria and execution risk.", priority: "MEDIUM", source: "AI_SCREENING", status: "TODO" as const, assignee: "JK" },
    { workstreamId: "ws-2-2", title: "Review referral network strength", description: "40% of patients come from physician referrals. Assess stability and exclusivity of referral relationships.", priority: "LOW", source: "AI_SCREENING", status: "TODO" as const, assignee: "SM" },
    { workstreamId: "ws-2-3", title: "Verify state medical licensing compliance", description: "Operations in 5 states with different licensing requirements. Confirm all licenses current and transferable.", priority: "HIGH", source: "AI_SCREENING", status: "TODO" as const, assignee: "AL" },
    { workstreamId: "ws-2-3", title: "Review Stark Law and Anti-Kickback compliance", description: "Physician employment model and referral arrangements need compliance review.", priority: "HIGH", source: "AI_SCREENING", status: "TODO" as const, assignee: "AL" },
    { workstreamId: "ws-2-3", title: "Assess malpractice exposure", description: "Review claims history, insurance coverage, and outstanding litigation.", priority: "MEDIUM", source: "AI_SCREENING", status: "TODO" as const, assignee: "AL" },
    { workstreamId: "ws-2-3", title: "Review corporate practice of medicine structure", description: "Several states have CPOM restrictions. Verify management services organization structure is compliant.", priority: "MEDIUM", source: "AI_SCREENING", status: "TODO" as const, assignee: "AL" },
    { workstreamId: "ws-2-4", title: "Evaluate EMR system and technology stack", description: "Currently on AthenaHealth. Assess scalability and integration costs for multi-site expansion.", priority: "MEDIUM", source: "AI_SCREENING", status: "DONE" as const, assignee: "JK", resolution: "AthenaHealth adequate for current scale. May need enterprise upgrade at 30+ sites (~$500K one-time).", resolvedAt: new Date("2026-02-24"), resolvedBy: "JK" },
    { workstreamId: "ws-2-4", title: "Analyze staffing model and physician recruitment", description: "Physician recruitment is the #1 growth bottleneck. Assess pipeline, compensation benchmarks, and retention rates.", priority: "HIGH", source: "AI_SCREENING", status: "TODO" as const, assignee: "SM" },
    { workstreamId: "ws-2-4", title: "Review patient throughput metrics", description: "Average patients per physician per day varies 15-22 across sites. Investigate variance drivers.", priority: "MEDIUM", source: "AI_SCREENING", status: "TODO" as const, assignee: "JK" },
    { workstreamId: "ws-2-5", title: "Analyze tax-exempt bond financing options", description: "Healthcare facilities may qualify for tax-exempt financing for expansion.", priority: "LOW", source: "AI_SCREENING", status: "TODO" as const, assignee: "AL" },
    { workstreamId: "ws-2-5", title: "Review state tax incentives for healthcare", description: "Several target expansion states offer healthcare investment tax credits.", priority: "LOW", source: "AI_SCREENING", status: "TODO" as const, assignee: "AL" },
    { workstreamId: "ws-2-6", title: "Assess healthcare access impact", description: "Evaluate whether clinic locations serve underserved communities and impact on health outcomes.", priority: "LOW", source: "AI_SCREENING", status: "TODO" as const, assignee: "SM" },
    { workstreamId: "ws-2-6", title: "Review quality of care metrics", description: "Patient satisfaction scores, readmission rates, and clinical outcomes benchmarking.", priority: "LOW", source: "AI_SCREENING", status: "TODO" as const, assignee: "SM" },
  ];

  for (const task of deal2Tasks) {
    await prisma.dDTask.create({ data: task });
  }

  // Deal 4 (DUE_DILIGENCE - Credit) - AI-generated credit DD findings
  const deal4Workstreams = [
    { id: "ws-4-1", name: "Financial DD", description: "Property-level financial analysis and cash flow validation.", customInstructions: "Focus on NOI stability, lease rollover risk, and debt service coverage.", sortOrder: 1, status: "IN_PROGRESS" as const, totalTasks: 4, completedTasks: 2, hasAI: true, aiGenerated: true },
    { id: "ws-4-2", name: "Collateral DD", description: "Asset valuation, lien position, and insurance review.", customInstructions: "Review appraisals, title reports, and insurance coverage adequacy.", sortOrder: 2, status: "IN_PROGRESS" as const, totalTasks: 4, completedTasks: 1, hasAI: true, aiGenerated: true },
    { id: "ws-4-3", name: "Legal DD", description: "Loan documentation, security perfection, and regulatory compliance.", sortOrder: 3, status: "IN_PROGRESS" as const, totalTasks: 3, completedTasks: 1, hasAI: true, aiGenerated: true },
    { id: "ws-4-4", name: "Tax DD", description: "Property tax assessment and REIT structure review.", sortOrder: 4, status: "NOT_STARTED" as const, totalTasks: 2, completedTasks: 0, hasAI: true, aiGenerated: true },
    { id: "ws-4-5", name: "Environmental DD", description: "Environmental site assessments and compliance.", sortOrder: 5, status: "IN_PROGRESS" as const, totalTasks: 2, completedTasks: 1, hasAI: true, aiGenerated: true },
    { id: "ws-4-6", name: "Counterparty DD", description: "Sponsor track record and financial capacity assessment.", sortOrder: 6, status: "COMPLETE" as const, totalTasks: 3, completedTasks: 3, hasAI: true, aiGenerated: true },
  ];

  for (const ws of deal4Workstreams) {
    await prisma.dDWorkstream.create({ data: { ...ws, dealId: deal4.id } });
  }

  const deal4Tasks = [
    { workstreamId: "ws-4-1", title: "Validate NOI and DSCR calculations", description: "Verify net operating income of $1.44M and 1.8x DSCR against actual rent rolls and operating expenses.", priority: "HIGH", source: "AI_SCREENING", status: "DONE" as const, assignee: "AL", resolution: "NOI confirmed at $1.42M. DSCR is 1.78x — within acceptable range.", resolvedAt: new Date("2026-02-18"), resolvedBy: "AL" },
    { workstreamId: "ws-4-1", title: "Analyze tenant rollover schedule", description: "Major tenant lease expires in 2027 (35% of rent). Assess renewal probability and re-leasing risk.", priority: "HIGH", source: "AI_SCREENING", status: "DONE" as const, assignee: "AL", resolution: "Tenant has expansion option and verbal commitment to renew. Market rents are 8% above in-place.", resolvedAt: new Date("2026-02-22"), resolvedBy: "AL" },
    { workstreamId: "ws-4-1", title: "Model interest rate sensitivity", description: "Floating rate exposure. Stress test DSCR under +200bps and +400bps rate scenarios.", priority: "MEDIUM", source: "AI_SCREENING", status: "TODO" as const, assignee: "AL" },
    { workstreamId: "ws-4-1", title: "Review CapEx reserve adequacy", description: "Assess whether $200K annual CapEx reserve is sufficient for building age and condition.", priority: "MEDIUM", source: "AI_SCREENING", status: "TODO" as const, assignee: "JK" },
    { workstreamId: "ws-4-2", title: "Review independent appraisal", description: "Third-party appraisal shows $14.5M value (55% LTV). Verify methodology and comparable sales.", priority: "HIGH", source: "AI_SCREENING", status: "DONE" as const, assignee: "AL", resolution: "Appraisal methodology sound. Comparable sales support $14-15M range.", resolvedAt: new Date("2026-02-20"), resolvedBy: "AL" },
    { workstreamId: "ws-4-2", title: "Confirm title and lien position", description: "Verify clean title and first lien position. Review any existing encumbrances.", priority: "HIGH", source: "AI_SCREENING", status: "TODO" as const, assignee: "AL" },
    { workstreamId: "ws-4-2", title: "Assess insurance coverage", description: "Review property insurance, liability coverage, and flood/earthquake exposure.", priority: "MEDIUM", source: "AI_SCREENING", status: "TODO" as const, assignee: "SM" },
    { workstreamId: "ws-4-2", title: "Evaluate property condition report", description: "Review PCA findings and estimated immediate repair needs.", priority: "MEDIUM", source: "AI_SCREENING", status: "TODO" as const, assignee: "JK" },
    { workstreamId: "ws-4-3", title: "Review loan document drafts", description: "Assess covenants, default provisions, and remedies in proposed credit agreement.", priority: "HIGH", source: "AI_SCREENING", status: "DONE" as const, assignee: "AL", resolution: "Loan docs reviewed by external counsel. Standard covenants with quarterly reporting.", resolvedAt: new Date("2026-02-25"), resolvedBy: "AL" },
    { workstreamId: "ws-4-3", title: "Verify UCC filings and security perfection", description: "Confirm all collateral is properly perfected under applicable state law.", priority: "HIGH", source: "AI_SCREENING", status: "TODO" as const, assignee: "AL" },
    { workstreamId: "ws-4-3", title: "Review guarantor agreements", description: "Assess personal/corporate guaranty strength and enforceability.", priority: "MEDIUM", source: "AI_SCREENING", status: "TODO" as const, assignee: "AL" },
    { workstreamId: "ws-4-4", title: "Review property tax assessments", description: "Current assessment is $12.8M. Verify no pending reassessment risk post-acquisition.", priority: "LOW", source: "AI_SCREENING", status: "TODO" as const, assignee: "SM" },
    { workstreamId: "ws-4-4", title: "Assess tax structure optimization", description: "Evaluate whether borrower structure provides optimal tax treatment for interest deductions.", priority: "LOW", source: "AI_SCREENING", status: "TODO" as const, assignee: "SM" },
    { workstreamId: "ws-4-5", title: "Review Phase I ESA", description: "Environmental site assessment for all portfolio properties.", priority: "HIGH", source: "AI_SCREENING", status: "DONE" as const, assignee: "JK", resolution: "Phase I clean for all 3 properties. No RECs identified.", resolvedAt: new Date("2026-02-19"), resolvedBy: "JK" },
    { workstreamId: "ws-4-5", title: "Assess flood zone and natural hazard exposure", description: "Review FEMA flood maps and natural hazard reports for all properties.", priority: "MEDIUM", source: "AI_SCREENING", status: "TODO" as const, assignee: "JK" },
    { workstreamId: "ws-4-6", title: "Review sponsor track record", description: "Evaluate Ridgeline Capital Partners' historical portfolio performance and default history.", priority: "HIGH", source: "AI_SCREENING", status: "DONE" as const, assignee: "AL", resolution: "15-year track record, 42 completed deals, zero defaults. Strong reputation with lenders.", resolvedAt: new Date("2026-02-16"), resolvedBy: "AL" },
    { workstreamId: "ws-4-6", title: "Assess sponsor financial capacity", description: "Review sponsor's balance sheet and ability to fund equity contribution and guarantees.", priority: "HIGH", source: "AI_SCREENING", status: "DONE" as const, assignee: "AL", resolution: "Sponsor net worth >$200M. Liquid assets >$50M. Strong capacity for guarantees.", resolvedAt: new Date("2026-02-17"), resolvedBy: "AL" },
    { workstreamId: "ws-4-6", title: "Verify sponsor team experience", description: "Key person assessment for portfolio management team.", priority: "MEDIUM", source: "AI_SCREENING", status: "DONE" as const, assignee: "SM", resolution: "Principal has 20+ years CRE experience. Team of 12 manages $1.2B portfolio.", resolvedAt: new Date("2026-02-18"), resolvedBy: "SM" },
  ];

  for (const task of deal4Tasks) {
    await prisma.dDTask.create({ data: task });
  }

  // Deals 3 and 5 (SCREENING) - no workstreams yet (pre-screening)

  // ============================================================
  // AI SCREENING RESULTS (for deals that have been screened)
  // ============================================================
  console.log("Creating AI screening results...");

  await prisma.aIScreeningResult.create({
    data: {
      dealId: deal1.id,
      score: 82,
      summary: "Apex Manufacturing presents a compelling opportunity in specialty aerospace manufacturing with strong margins and recurring revenue. Customer concentration in top 3 clients is the primary risk.",
      strengths: ["Strong EBITDA margins (22%)", "Long-term customer contracts", "Niche market position", "Experienced management team"],
      risks: ["Top 3 customers represent 65% of revenue", "Cyclical end markets", "Key man dependency on CEO"],
      recommendation: "PROCEED",
      financials: { revenue: "$85M", ebitda: "$18.7M", margin: "22%", yoyGrowth: "12%" },
      screeningConfig: { categories: [{ name: "Financial DD", enabled: true }, { name: "Commercial DD", enabled: true }, { name: "Legal DD", enabled: true }, { name: "Tax DD", enabled: true }, { name: "ESG DD", enabled: true }, { name: "Management DD", enabled: true }] },
      ddFindings: { categories: [
        { name: "Financial DD", summary: "Strong margins but customer concentration creates revenue risk.", findings: [{ title: "Validate EBITDA margin sustainability at 22%", priority: "HIGH" }, { title: "Analyze customer concentration impact on revenue stability", priority: "HIGH" }, { title: "Review working capital cycle and cash conversion", priority: "MEDIUM" }, { title: "Assess CapEx requirements for growth plan", priority: "MEDIUM" }, { title: "Model debt capacity and financing structure", priority: "MEDIUM" }] },
        { name: "Commercial DD", summary: "Strong niche positioning with expansion opportunity.", findings: [{ title: "Map competitive landscape and market share", priority: "HIGH" }, { title: "Evaluate defense contract pipeline", priority: "HIGH" }, { title: "Assess customer diversification opportunity", priority: "MEDIUM" }, { title: "Review pricing power and margin trends", priority: "MEDIUM" }] },
        { name: "Legal DD", summary: "Change of control consents and ITAR compliance are key.", findings: [{ title: "Review material contracts and change of control provisions", priority: "HIGH" }, { title: "Assess IP ownership and trade secret protection", priority: "MEDIUM" }, { title: "Review pending litigation and contingent liabilities", priority: "MEDIUM" }, { title: "Verify ITAR/EAR compliance history", priority: "HIGH" }] },
      ] },
    },
  });

  await prisma.aIScreeningResult.create({
    data: {
      dealId: deal2.id,
      score: 74,
      summary: "Beacon Health's multi-site clinic model shows promising growth but faces regulatory headwinds. Same-store growth is strong but new site economics need validation.",
      strengths: ["15% same-store revenue growth", "Fragmented market with rollup potential", "Diversified payer mix"],
      risks: ["Regulatory risk around reimbursement", "New site ramp takes 18+ months", "Physician recruitment challenges"],
      recommendation: "PROCEED_WITH_CAUTION",
      financials: { revenue: "$42M", ebitda: "$6.3M", margin: "15%", yoyGrowth: "25%" },
      screeningConfig: { categories: [{ name: "Financial DD", enabled: true }, { name: "Commercial DD", enabled: true }, { name: "Legal DD", enabled: true }, { name: "Operational DD", enabled: true }, { name: "Tax DD", enabled: true }, { name: "ESG DD", enabled: true }] },
      ddFindings: { categories: [
        { name: "Financial DD", summary: "Growth metrics strong but reimbursement sensitivity and AR aging need investigation.", findings: [{ title: "Validate same-store revenue growth of 15%", priority: "HIGH" }, { title: "Assess new site ramp economics", priority: "HIGH" }, { title: "Review reimbursement rate sensitivity", priority: "HIGH" }, { title: "Analyze physician compensation structure", priority: "MEDIUM" }, { title: "Verify accounts receivable aging", priority: "MEDIUM" }] },
        { name: "Commercial DD", summary: "Fragmented market with rollup potential but rising CAC.", findings: [{ title: "Map competitive landscape in target markets", priority: "HIGH" }, { title: "Analyze patient acquisition cost trends", priority: "MEDIUM" }, { title: "Evaluate geographic expansion pipeline", priority: "MEDIUM" }, { title: "Review referral network strength", priority: "LOW" }] },
        { name: "Legal DD", summary: "Healthcare regulatory complexity requires thorough compliance review.", findings: [{ title: "Verify state medical licensing compliance", priority: "HIGH" }, { title: "Review Stark Law and Anti-Kickback compliance", priority: "HIGH" }, { title: "Assess malpractice exposure", priority: "MEDIUM" }, { title: "Review corporate practice of medicine structure", priority: "MEDIUM" }] },
      ] },
    },
  });

  await prisma.aIScreeningResult.create({
    data: {
      dealId: deal4.id,
      score: 88,
      summary: "Ridgeline Senior Debt presents a low-risk credit opportunity with strong collateral coverage and experienced sponsor. LTV and DSCR metrics are well within conservative thresholds.",
      strengths: ["55% LTV", "1.8x DSCR", "Experienced real estate sponsor", "Stabilized, fully leased portfolio"],
      risks: ["Interest rate environment", "Geographic concentration", "Tenant rollover in 2027"],
      recommendation: "STRONG_PROCEED",
      financials: { principal: "$8M", ltv: "55%", dscr: "1.8x", rate: "SOFR+350bps" },
      screeningConfig: { categories: [{ name: "Financial DD", enabled: true }, { name: "Collateral DD", enabled: true }, { name: "Legal DD", enabled: true }, { name: "Tax DD", enabled: true }, { name: "Environmental DD", enabled: true }, { name: "Counterparty DD", enabled: true }] },
      ddFindings: { categories: [
        { name: "Financial DD", summary: "Strong cash flow metrics but floating rate exposure needs stress testing.", findings: [{ title: "Validate NOI and DSCR calculations", priority: "HIGH" }, { title: "Analyze tenant rollover schedule", priority: "HIGH" }, { title: "Model interest rate sensitivity", priority: "MEDIUM" }, { title: "Review CapEx reserve adequacy", priority: "MEDIUM" }] },
        { name: "Collateral DD", summary: "Appraisal supports LTV but lien position and insurance need verification.", findings: [{ title: "Review independent appraisal", priority: "HIGH" }, { title: "Confirm title and lien position", priority: "HIGH" }, { title: "Assess insurance coverage", priority: "MEDIUM" }, { title: "Evaluate property condition report", priority: "MEDIUM" }] },
        { name: "Counterparty DD", summary: "Strong sponsor with excellent track record.", findings: [{ title: "Review sponsor track record", priority: "HIGH" }, { title: "Assess sponsor financial capacity", priority: "HIGH" }, { title: "Verify sponsor team experience", priority: "MEDIUM" }] },
      ] },
    },
  });

  // ============================================================
  // DD CATEGORY TEMPLATES (firm-level library)
  // ============================================================
  console.log("Creating DD category templates...");

  const ddCategories = [
    { firmId: firm.id, name: "Financial DD", description: "Financial statement analysis, projections, quality of earnings", defaultInstructions: "Focus on revenue recognition, working capital, cash flow sustainability, and projection assumptions. Benchmark margins against peers.", isDefault: true, sortOrder: 1 },
    { firmId: firm.id, name: "Legal DD", description: "Corporate structure, litigation, contracts, IP", defaultInstructions: "Review corporate governance, pending litigation, material contracts, and IP ownership. Check change of control provisions.", isDefault: true, sortOrder: 2 },
    { firmId: firm.id, name: "Commercial DD", description: "Market positioning, customers, competitive landscape", defaultInstructions: "Analyze market size, competitive dynamics, customer concentration, and growth drivers. Assess pricing power.", isDefault: true, sortOrder: 3 },
    { firmId: firm.id, name: "Operational DD", description: "Business processes, technology, supply chain", defaultInstructions: "Evaluate operational efficiency, technology infrastructure, and key operational risks. Review scalability.", isDefault: true, sortOrder: 4 },
    { firmId: firm.id, name: "Tax DD", description: "Tax structure, compliance, optimization", defaultInstructions: "Review tax positions, compliance history, and structural optimization opportunities. Identify tax credits.", isDefault: true, sortOrder: 5 },
    { firmId: firm.id, name: "ESG DD", description: "Environmental, social, governance assessment", defaultInstructions: "Screen for ESG risks, compliance issues, and sustainability factors. Assess impact investing alignment.", isDefault: true, sortOrder: 6 },
    { firmId: firm.id, name: "Management DD", description: "Team assessment, key person risk, compensation", defaultInstructions: "Evaluate management capabilities, succession planning, and alignment of incentives.", isDefault: false, sortOrder: 7 },
    { firmId: firm.id, name: "Collateral DD", description: "Asset valuation, lien positions, insurance (credit-specific)", defaultInstructions: "Review collateral valuations, coverage ratios, and security perfection. Assess insurance adequacy.", isDefault: false, sortOrder: 8 },
    { firmId: firm.id, name: "Environmental DD", description: "Environmental site assessments, compliance (real estate-specific)", defaultInstructions: "Assess property condition, environmental risks, flood exposure, and regulatory compliance.", isDefault: false, sortOrder: 9 },
  ];

  for (const cat of ddCategories) {
    await prisma.dDCategoryTemplate.create({ data: cat });
  }

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
      { dealId: deal2.id, activityType: "SCREENING_RUN", description: "AI screening completed with score 74/100. Recommendation: PROCEED_WITH_CAUTION.", metadata: { score: 74, recommendation: "PROCEED_WITH_CAUTION" }, createdAt: new Date("2026-02-10") },
      { dealId: deal2.id, activityType: "STAGE_CHANGE", description: "Deal advanced from Screening to Due Diligence", metadata: { fromStage: "SCREENING", toStage: "DUE_DILIGENCE" }, createdAt: new Date("2026-02-10") },
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
  // CAPITAL ACCOUNTS (CalPERS / Fund I Q4 2024)
  // ============================================================
  console.log("Creating capital accounts...");

  const capitalAccountsData = [
    {
      id: "capact-1",
      investorId: investor1.id,
      entityId: entity1.id,
      periodDate: new Date("2024-12-31"),
      beginningBalance: 47_250_000,
      contributions: 0,
      incomeAllocations: 2_250_000,
      capitalAllocations: 6_740_000,
      distributions: -3_200_000,
      fees: -1_080_000,
      endingBalance: 51_960_000,
      details: {
        interestIncome: 320_000,
        dividendIncome: 1_520_000,
        rentalIncome: 410_000,
        totalIncome: 2_250_000,
        netRealizedGainLT: 4_640_000,
        changeInUnrealized: 2_100_000,
        totalCapitalGains: 6_740_000,
        returnOfCapital: -1_800_000,
        incomeDistributions: -1_400_000,
        totalDistributions: -3_200_000,
        managementFees: -187_500,
        fundExpenses: -42_500,
        carriedInterest: -850_000,
      },
    },
    // CalPERS / Fund II Q4 2024
    {
      id: "capact-2",
      investorId: investor1.id,
      entityId: entity2.id,
      periodDate: new Date("2024-12-31"),
      beginningBalance: 42_000_000,
      contributions: 4_500_000,
      incomeAllocations: 1_100_000,
      capitalAllocations: 3_200_000,
      distributions: -1_800_000,
      fees: -750_000,
      endingBalance: 48_250_000,
    },
    // CalPERS / Growth Fund Q4 2024
    {
      id: "capact-3",
      investorId: investor1.id,
      entityId: entity4.id,
      periodDate: new Date("2024-12-31"),
      beginningBalance: 7_800_000,
      contributions: 600_000,
      incomeAllocations: 380_000,
      capitalAllocations: 920_000,
      distributions: -420_000,
      fees: -210_000,
      endingBalance: 9_070_000,
    },
    // CalPERS / Sidecar A Q4 2024
    {
      id: "capact-4",
      investorId: investor1.id,
      entityId: entity5.id,
      periodDate: new Date("2024-12-31"),
      beginningBalance: 16_200_000,
      contributions: 2_000_000,
      incomeAllocations: 640_000,
      capitalAllocations: 1_850_000,
      distributions: -800_000,
      fees: -320_000,
      endingBalance: 19_570_000,
    },
    // CalPERS / RE SPV Q4 2024
    {
      id: "capact-5",
      investorId: investor1.id,
      entityId: entity9.id,
      periodDate: new Date("2024-12-31"),
      beginningBalance: 4_600_000,
      contributions: 400_000,
      incomeAllocations: 220_000,
      capitalAllocations: 310_000,
      distributions: -180_000,
      fees: -90_000,
      endingBalance: 5_260_000,
    },
  ];

  for (const ca of capitalAccountsData) {
    await prisma.capitalAccount.create({ data: ca });
  }

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

  // ── Companies ──────────────────────────────────────────
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
  console.log("✓ Companies seeded");

  // ── Contacts ──────────────────────────────────────────
  const contacts = [
    { id: "contact-1", firmId: "firm-1", firstName: "Robert", lastName: "Chen", email: "rchen@apexindustries.com", title: "CEO", type: "EXTERNAL" as const, companyId: "company-1" },
    { id: "contact-2", firmId: "firm-1", firstName: "Lisa", lastName: "Park", email: "lpark@beaconhealth.com", title: "CFO", type: "EXTERNAL" as const, companyId: "company-2" },
    { id: "contact-3", firmId: "firm-1", firstName: "David", lastName: "Morse", email: "dmorse@ridgeline.com", title: "Managing Partner", type: "EXTERNAL" as const, companyId: "company-3" },
    { id: "contact-4", firmId: "firm-1", firstName: "Erik", lastName: "Johansson", email: "erik@nordicwind.com", title: "Partner", type: "EXTERNAL" as const, companyId: "company-4" },
    { id: "contact-5", firmId: "firm-1", firstName: "Maria", lastName: "Santos", email: "msantos@urbanest.com", title: "Founder & CEO", type: "EXTERNAL" as const, companyId: "company-5" },
    { id: "contact-6", firmId: "firm-1", firstName: "Tom", lastName: "Bradley", email: "tbradley@latham.com", title: "Partner", type: "EXTERNAL" as const, companyId: "company-10" },
  ];

  for (const c of contacts) {
    await prisma.contact.upsert({
      where: { id: c.id },
      update: c,
      create: c,
    });
  }
  console.log("✓ Contacts seeded");

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
