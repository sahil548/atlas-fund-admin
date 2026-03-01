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

  await prisma.activityEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.task.deleteMany();
  await prisma.dDTask.deleteMany();
  await prisma.dDWorkstream.deleteMany();
  await prisma.closingChecklist.deleteMany();
  await prisma.aIScreeningResult.deleteMany();
  await prisma.iCVoteRecord.deleteMany();
  await prisma.iCProcess.deleteMany();
  await prisma.deal.deleteMany();
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
      assetType: "DIRECT_EQUITY",
      sector: "Technology",
      status: "ACTIVE",
      holdingType: "DIRECT",
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
      assetType: "DIRECT_EQUITY",
      sector: "Healthcare",
      status: "ACTIVE",
      holdingType: "DIRECT",
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
      assetType: "PRIVATE_CREDIT",
      sector: "Industrials",
      status: "ACTIVE",
      holdingType: "DIRECT",
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
      assetType: "REAL_ESTATE_DIRECT",
      sector: "Industrial RE",
      status: "ACTIVE",
      holdingType: "DIRECT",
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
      assetType: "FUND_LP_POSITION",
      sector: "VC",
      status: "ACTIVE",
      holdingType: "LP_IN_EXTERNAL_FUND",
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
      assetType: "FUND_LP_POSITION",
      sector: "Real Estate",
      status: "ACTIVE",
      holdingType: "LP_IN_EXTERNAL_FUND",
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
      assetType: "DIRECT_EQUITY",
      sector: "Energy",
      status: "EXITED",
      holdingType: "DIRECT",
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
      assetType: "CO_INVESTMENT",
      sector: "Technology",
      status: "ACTIVE",
      holdingType: "CO_INVEST_WITH_LEAD_GP",
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
      assetType: "PRIVATE_CREDIT",
      sector: "Logistics",
      status: "ACTIVE",
      holdingType: "DIRECT",
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
      assetType: "FUND_LP_POSITION",
      sector: "Sports",
      status: "ACTIVE",
      holdingType: "LP_IN_EXTERNAL_FUND",
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
      assetType: "FUND_LP_POSITION",
      sector: "Life Insurance",
      status: "ACTIVE",
      holdingType: "LP_IN_EXTERNAL_FUND",
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
      name: "Apex Manufacturing",
      dealType: "DIRECT_EQUITY",
      sector: "Industrials",
      stage: "IC_REVIEW",
      targetSize: "$30-40M",
      leadPartner: "JK",
      aiScore: 82,
      aiFlag: "Strong margins, customer concentration risk",
    },
  });

  const deal2 = await prisma.deal.create({
    data: {
      id: "deal-2",
      name: "Beacon Health",
      dealType: "DIRECT_EQUITY",
      sector: "Healthcare",
      stage: "DUE_DILIGENCE",
      targetSize: "$20-25M",
      leadPartner: "SM",
      aiScore: 74,
      aiFlag: "Regulatory pathway uncertain",
    },
  });

  const deal3 = await prisma.deal.create({
    data: {
      id: "deal-3",
      name: "UrbanNest PropTech",
      dealType: "CO_INVESTMENT",
      sector: "RE Tech",
      stage: "SCREENING",
      targetSize: "$10M",
      leadPartner: "JK",
      aiScore: null,
      aiFlag: null,
    },
  });

  const deal4 = await prisma.deal.create({
    data: {
      id: "deal-4",
      name: "Ridgeline Senior Debt",
      dealType: "PRIVATE_CREDIT",
      sector: "Real Estate",
      stage: "DUE_DILIGENCE",
      targetSize: "$8M",
      leadPartner: "AL",
      aiScore: 88,
      aiFlag: "Strong collateral, low LTV",
    },
  });

  const deal5 = await prisma.deal.create({
    data: {
      id: "deal-5",
      name: "Nordic Wind Fund III",
      dealType: "FUND_LP_POSITION",
      sector: "Infrastructure",
      stage: "SCREENING",
      targetSize: "$15M LP",
      leadPartner: "SM",
      aiScore: null,
      aiFlag: null,
    },
  });

  // ============================================================
  // DD WORKSTREAMS (6 per deal)
  // ============================================================
  console.log("Creating DD workstreams...");

  const dealIds = [deal1.id, deal2.id, deal3.id, deal4.id, deal5.id];
  const dealStages = ["ic_review", "due_diligence", "screening", "due_diligence", "screening"];

  for (let d = 0; d < dealIds.length; d++) {
    const dealId = dealIds[d];
    const stage = dealStages[d];

    const workstreams = [
      {
        name: "Financial DD",
        hasAI: true,
        status: stage === "ic_review" ? "COMPLETE" as const : "IN_PROGRESS" as const,
        totalTasks: stage === "ic_review" ? 12 : 14,
        completedTasks: stage === "ic_review" ? 12 : 8,
      },
      {
        name: "Commercial DD",
        hasAI: true,
        status: stage === "ic_review" ? "COMPLETE" as const : "IN_PROGRESS" as const,
        totalTasks: stage === "ic_review" ? 8 : 10,
        completedTasks: stage === "ic_review" ? 8 : 5,
      },
      {
        name: "Legal DD",
        hasAI: false,
        status: "IN_PROGRESS" as const,
        totalTasks: stage === "ic_review" ? 9 : 8,
        completedTasks: stage === "ic_review" ? 5 : 3,
      },
      {
        name: "Tax DD",
        hasAI: true,
        status: "IN_PROGRESS" as const,
        totalTasks: 6,
        completedTasks: stage === "ic_review" ? 3 : 2,
      },
      {
        name: "ESG / Environmental",
        hasAI: false,
        status: stage === "ic_review" ? "COMPLETE" as const : "NOT_STARTED" as const,
        totalTasks: 4,
        completedTasks: stage === "ic_review" ? 4 : 0,
      },
      {
        name: "Management Assessment",
        hasAI: false,
        status: stage === "ic_review" ? "COMPLETE" as const : "IN_PROGRESS" as const,
        totalTasks: 6,
        completedTasks: stage === "ic_review" ? 6 : 3,
      },
    ];

    for (let w = 0; w < workstreams.length; w++) {
      await prisma.dDWorkstream.create({
        data: {
          id: `ws-${d + 1}-${w + 1}`,
          dealId,
          name: workstreams[w].name,
          status: workstreams[w].status,
          totalTasks: workstreams[w].totalTasks,
          completedTasks: workstreams[w].completedTasks,
          hasAI: workstreams[w].hasAI,
        },
      });
    }
  }

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
  const meetingAssetMap: Record<string, { assetId?: string; dealId?: string }> = {
    "NovaTech AI": { assetId: asset1.id },
    "Sequoia Capital Fund XVI": { assetId: asset5.id },
    "123 Industrial Blvd": { assetId: asset4.id },
    "Meridian Credit Facility": { assetId: asset3.id },
    "LifeBridge Insurance Fund": { assetId: asset11.id },
    "Apex Manufacturing": { dealId: deal1.id },
    "Beacon Health": { dealId: deal2.id },
    "Ridgeline Senior Debt": { dealId: deal4.id },
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
        decisions: m.decisions.length > 0 ? m.decisions : null,
        assetId: links.assetId || null,
        dealId: links.dealId || null,
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

  await prisma.capitalAccount.create({
    data: {
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
  });

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
