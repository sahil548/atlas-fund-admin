import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDefaultDDCategoriesForFirm } from "../src/lib/default-dd-categories";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding demo data for Core Asset Credit tenant...");

  // ============================================================
  // LOOK UP FIRM
  // ============================================================
  const firm = await prisma.firm.findFirst({
    where: { name: "Core Asset Credit" },
  });

  if (!firm) {
    throw new Error('Firm "Core Asset Credit" not found in the database. Please create it first.');
  }

  console.log(`Found firm: ${firm.name} (${firm.id})`);

  // ============================================================
  // LOOK UP EXISTING USERS
  // ============================================================
  const gpAdmin = await prisma.user.findFirst({
    where: { firmId: firm.id, role: "GP_ADMIN" },
  });

  if (!gpAdmin) {
    throw new Error("No GP_ADMIN user found for Core Asset Credit. Please create users first.");
  }

  const gpUsers = await prisma.user.findMany({
    where: { firmId: firm.id, role: { in: ["GP_ADMIN", "GP_TEAM"] } },
    orderBy: { createdAt: "asc" },
  });

  // Use the first GP_ADMIN as primary, and first two GP_TEAM as secondary
  const userJK = gpAdmin; // Primary GP admin — deal lead, approver, etc.
  const userSM = gpUsers.find((u) => u.id !== gpAdmin.id && u.role === "GP_TEAM") || gpUsers[1] || gpAdmin;
  const userAL = gpUsers.find((u) => u.id !== gpAdmin.id && u.id !== userSM.id && u.role === "GP_TEAM") || gpUsers[2] || gpAdmin;

  console.log(`Using GP_ADMIN: ${userJK.name} (${userJK.id})`);
  console.log(`Using GP_TEAM 1: ${userSM.name} (${userSM.id})`);
  console.log(`Using GP_TEAM 2: ${userAL.name} (${userAL.id})`);

  // ============================================================
  // CLEANUP PREVIOUS SEED DATA (idempotent re-run)
  // ============================================================
  console.log("Cleaning up previous seed data (cac-* records)...");

  const cac = { startsWith: "cac-" };

  // Follow exact dependency order from seed.ts, scoped to cac- records
  // Tables with auto-generated IDs use parent relationship filters
  await prisma.metricSnapshot.deleteMany({ where: { investor: { id: cac } } });
  await prisma.investorUserAccess.deleteMany({ where: { investor: { id: cac } } });
  await prisma.aIPromptTemplate.deleteMany({ where: { firmId: firm.id } });
  await prisma.aIConfiguration.deleteMany({ where: { firmId: firm.id } });
  await prisma.dealCoInvestor.deleteMany({ where: { deal: { id: cac } } });
  await prisma.contactInteraction.deleteMany({ where: { contact: { id: cac } } });
  await prisma.contactTag.deleteMany({ where: { contact: { id: cac } } });
  await prisma.contact.deleteMany({ where: { id: cac } });
  await prisma.company.deleteMany({ where: { id: cac } });
  await prisma.activityEvent.deleteMany({ where: { id: cac } });
  await prisma.notification.deleteMany({ where: { id: cac } });
  await prisma.document.deleteMany({ where: { id: cac } });
  await prisma.meeting.deleteMany({ where: { id: cac } });
  await prisma.taskChecklistItem.deleteMany({ where: { task: { id: cac } } });
  await prisma.task.deleteMany({ where: { id: cac } });
  await prisma.dealActivity.deleteMany({ where: { deal: { id: cac } } });
  await prisma.note.deleteMany({ where: { deal: { id: cac } } });
  await prisma.dDTaskComment.deleteMany({ where: { task: { workstream: { id: cac } } } });
  await prisma.dDTaskAttachment.deleteMany({ where: { task: { workstream: { id: cac } } } });
  await prisma.dDTask.deleteMany({ where: { workstream: { id: cac } } });
  await prisma.dDWorkstreamComment.deleteMany({ where: { workstream: { id: cac } } });
  await prisma.dDWorkstreamAttachment.deleteMany({ where: { workstream: { id: cac } } });
  await prisma.dDWorkstream.deleteMany({ where: { id: cac } });
  await prisma.closingChecklist.deleteMany({ where: { deal: { id: cac } } });
  await prisma.aIScreeningResult.deleteMany({ where: { deal: { id: cac } } });
  await prisma.iCQuestionReply.deleteMany({ where: { question: { id: cac } } });
  await prisma.iCQuestion.deleteMany({ where: { id: cac } });
  await prisma.iCVoteRecord.deleteMany({ where: { icProcess: { id: cac } } });
  await prisma.iCProcess.deleteMany({ where: { id: cac } });
  await prisma.dealEntity.deleteMany({ where: { deal: { id: cac } } });
  await prisma.deal.deleteMany({ where: { id: cac } });
  await prisma.dDCategoryTemplate.deleteMany({ where: { id: cac } });
  await prisma.capitalAccount.deleteMany({ where: { investor: { id: cac } } });
  await prisma.waterfallCalculation.deleteMany({ where: { template: { id: cac } } });
  await prisma.waterfallTier.deleteMany({ where: { id: cac } });
  await prisma.entity.updateMany({ where: { id: cac }, data: { waterfallTemplateId: null } });
  await prisma.waterfallTemplate.deleteMany({ where: { id: cac } });
  await prisma.feeCalculation.deleteMany({ where: { entity: { id: cac } } });
  await prisma.nAVComputation.deleteMany({ where: { entity: { id: cac } } });
  await prisma.valuation.deleteMany({ where: { id: cac } });
  await prisma.distributionLineItem.deleteMany({ where: { id: cac } });
  await prisma.distributionEvent.deleteMany({ where: { id: cac } });
  await prisma.capitalCallLineItem.deleteMany({ where: { id: cac } });
  await prisma.capitalCall.deleteMany({ where: { id: cac } });
  await prisma.incomeEvent.deleteMany({ where: { asset: { id: cac } } });
  await prisma.transaction.deleteMany({ where: { id: cac } });
  await prisma.creditPayment.deleteMany({ where: { id: cac } });
  await prisma.covenant.deleteMany({ where: { id: cac } });
  await prisma.creditAgreement.deleteMany({ where: { id: cac } });
  await prisma.lease.deleteMany({ where: { id: cac } });
  await prisma.assetFundLPDetails.deleteMany({ where: { id: cac } });
  await prisma.assetRealEstateDetails.deleteMany({ where: { id: cac } });
  await prisma.assetCreditDetails.deleteMany({ where: { id: cac } });
  await prisma.assetEquityDetails.deleteMany({ where: { id: cac } });
  await prisma.assetEntityAllocation.deleteMany({ where: { id: cac } });
  await prisma.asset.deleteMany({ where: { id: cac } });
  await prisma.sideLetterRule.deleteMany({ where: { sideLetter: { id: cac } } });
  await prisma.sideLetter.deleteMany({ where: { id: cac } });
  await prisma.commitment.deleteMany({ where: { id: cac } });
  await prisma.ownershipUnit.deleteMany({ where: { unitClass: { entity: { id: cac } } } });
  await prisma.unitClass.deleteMany({ where: { entity: { id: cac } } });
  await prisma.investorNotificationPreference.deleteMany({ where: { investor: { id: cac } } });
  await prisma.investor.deleteMany({ where: { id: cac } });
  await prisma.fundraisingProspect.deleteMany({ where: { round: { entity: { id: cac } } } });
  await prisma.fundraisingRound.deleteMany({ where: { entity: { id: cac } } });
  await prisma.trialBalanceSnapshot.deleteMany({ where: { connection: { id: cac } } });
  await prisma.accountMapping.deleteMany({ where: { connection: { id: cac } } });
  await prisma.accountingConnection.deleteMany({ where: { id: cac } });
  await prisma.entity.deleteMany({ where: { id: cac } });

  console.log("Previous seed data cleaned up.");

  // ============================================================
  // GP COMPANY + INTERNAL CONTACTS
  // ============================================================
  console.log("Creating GP company and internal contacts...");

  await prisma.company.create({
    data: { id: "cac-company-gp", firmId: firm.id, name: "Core Asset Credit", type: "GP", industry: "Financial Services" },
  });

  // ============================================================
  // ENTITIES (9 entities)
  // ============================================================
  console.log("Creating entities...");

  const entity1 = await prisma.entity.create({
    data: {
      id: "cac-entity-1",
      firmId: firm.id,
      name: "CAC Fund I, LLC",
      legalName: "CAC Fund I, LLC",
      entityType: "MAIN_FUND",
      vehicleStructure: "LLC",
      vintageYear: 2019,
      targetSize: 350_000_000,
      totalCommitments: 300_000_000,
      status: "ACTIVE",
    },
  });

  const entity2 = await prisma.entity.create({
    data: {
      id: "cac-entity-2",
      firmId: firm.id,
      name: "CAC Fund II, LP",
      legalName: "CAC Fund II, LP",
      entityType: "MAIN_FUND",
      vehicleStructure: "LP",
      vintageYear: 2022,
      targetSize: 600_000_000,
      totalCommitments: 500_000_000,
      status: "ACTIVE",
    },
  });

  const entity3 = await prisma.entity.create({
    data: {
      id: "cac-entity-3",
      firmId: firm.id,
      name: "CAC Fund III, LLC",
      legalName: "CAC Fund III, LLC",
      entityType: "MAIN_FUND",
      vehicleStructure: "LLC",
      vintageYear: 2023,
      targetSize: 250_000_000,
      totalCommitments: 120_000_000,
      status: "ACTIVE",
    },
  });

  const entity4 = await prisma.entity.create({
    data: {
      id: "cac-entity-4",
      firmId: firm.id,
      name: "CAC Growth Fund, LP",
      legalName: "CAC Growth Fund, LP",
      entityType: "MAIN_FUND",
      vehicleStructure: "LP",
      vintageYear: 2024,
      targetSize: 150_000_000,
      totalCommitments: 75_000_000,
      status: "ACTIVE",
    },
  });

  const entity5 = await prisma.entity.create({
    data: {
      id: "cac-entity-5",
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
      id: "cac-entity-6",
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
      id: "cac-entity-7",
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
      id: "cac-entity-8",
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
      id: "cac-entity-9",
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

  // ============================================================
  // ACCOUNTING CONNECTIONS (one per entity)
  // ============================================================
  console.log("Creating accounting connections...");

  const acctConnections = [
    { id: "cac-acct-1", entityId: entity1.id, provider: "QBO" as const, syncStatus: "CONNECTED" as const, lastSyncAt: new Date("2025-02-28T23:48:00Z"), unreconciledItems: 0 },
    { id: "cac-acct-2", entityId: entity2.id, provider: "QBO" as const, syncStatus: "CONNECTED" as const, lastSyncAt: new Date("2025-02-28T23:45:00Z"), unreconciledItems: 3 },
    { id: "cac-acct-3", entityId: entity3.id, provider: "XERO" as const, syncStatus: "CONNECTED" as const, lastSyncAt: new Date("2025-02-28T22:00:00Z"), unreconciledItems: 2 },
    { id: "cac-acct-4", entityId: entity4.id, provider: "QBO" as const, syncStatus: "CONNECTED" as const, lastSyncAt: new Date("2025-02-28T23:45:00Z"), unreconciledItems: 0 },
    { id: "cac-acct-5", entityId: entity5.id, provider: "QBO" as const, syncStatus: "CONNECTED" as const, lastSyncAt: new Date("2025-02-28T23:45:00Z"), unreconciledItems: 0 },
    { id: "cac-acct-6", entityId: entity6.id, provider: "QBO" as const, syncStatus: "CONNECTED" as const, lastSyncAt: new Date("2025-02-28T23:45:00Z"), unreconciledItems: 1 },
    { id: "cac-acct-7", entityId: entity7.id, provider: "QBO" as const, syncStatus: "CONNECTED" as const, lastSyncAt: new Date("2025-02-28T23:45:00Z"), unreconciledItems: 0 },
    { id: "cac-acct-8", entityId: entity8.id, provider: "QBO" as const, syncStatus: "CONNECTED" as const, lastSyncAt: new Date("2025-02-28T23:30:00Z"), unreconciledItems: 1 },
    { id: "cac-acct-9", entityId: entity9.id, provider: "QBO" as const, syncStatus: "ERROR" as const, lastSyncAt: new Date("2025-02-26T12:00:00Z"), unreconciledItems: 0 },
  ];

  for (const ac of acctConnections) {
    await prisma.accountingConnection.create({ data: ac });
  }

  // ============================================================
  // FUNDRAISING ROUNDS & PROSPECTS
  // ============================================================
  console.log("Creating fundraising rounds...");

  // Fund III is actively fundraising (OPEN) — 48% closed
  await prisma.fundraisingRound.create({
    data: {
      id: "cac-fr-1",
      entityId: "cac-entity-3",
      name: "CAC Fund III — Initial Close",
      targetAmount: 250_000_000,
      raisedAmount: 120_000_000,
      status: "OPEN",
      openDate: new Date("2025-06-01"),
      closeDate: new Date("2026-09-30"),
      prospects: {
        create: [
          { id: "cac-fp-1", investorName: "CPP Investments", investorType: "PENSION", targetAmount: 40_000_000, hardCommitAmount: 40_000_000, status: "HARD_COMMIT" },
          { id: "cac-fp-2", investorName: "Ontario Teachers", investorType: "PENSION", targetAmount: 30_000_000, softCommitAmount: 30_000_000, status: "SOFT_COMMIT" },
          { id: "cac-fp-3", investorName: "Singapore GIC", investorType: "SOVEREIGN_WEALTH", targetAmount: 50_000_000, softCommitAmount: 50_000_000, status: "SOFT_COMMIT" },
          { id: "cac-fp-4", investorName: "Yale Endowment", investorType: "ENDOWMENT", targetAmount: 25_000_000, status: "DD_IN_PROGRESS" },
          { id: "cac-fp-5", investorName: "Abu Dhabi IA", investorType: "SOVEREIGN_WEALTH", targetAmount: 35_000_000, status: "MEETING_SCHEDULED" },
          { id: "cac-fp-6", investorName: "CalPERS", investorType: "PENSION", targetAmount: 20_000_000, status: "CONTACTED" },
        ],
      },
    },
  });

  // Growth Fund is actively fundraising (OPEN) — 50% closed
  await prisma.fundraisingRound.create({
    data: {
      id: "cac-fr-2",
      entityId: "cac-entity-4",
      name: "CAC Growth Fund — First Close",
      targetAmount: 150_000_000,
      raisedAmount: 75_000_000,
      status: "OPEN",
      openDate: new Date("2025-09-01"),
      closeDate: new Date("2026-12-31"),
      prospects: {
        create: [
          { id: "cac-fp-7", investorName: "Blackstone Secondaries", investorType: "FUND_OF_FUNDS", targetAmount: 25_000_000, hardCommitAmount: 25_000_000, status: "HARD_COMMIT" },
          { id: "cac-fp-8", investorName: "StepStone Group", investorType: "FUND_OF_FUNDS", targetAmount: 15_000_000, softCommitAmount: 15_000_000, status: "SOFT_COMMIT" },
          { id: "cac-fp-9", investorName: "Massachusetts PRIM", investorType: "PENSION", targetAmount: 20_000_000, status: "TERM_SHEET_SENT" },
          { id: "cac-fp-10", investorName: "Duke Endowment", investorType: "ENDOWMENT", targetAmount: 10_000_000, status: "DD_IN_PROGRESS" },
        ],
      },
    },
  });

  // Fund I is fully closed
  await prisma.fundraisingRound.create({
    data: {
      id: "cac-fr-3",
      entityId: "cac-entity-1",
      name: "CAC Fund I — Final Close",
      targetAmount: 350_000_000,
      raisedAmount: 300_000_000,
      status: "CLOSED",
      openDate: new Date("2018-06-01"),
      closeDate: new Date("2019-03-15"),
    },
  });

  // Fund II at final close
  await prisma.fundraisingRound.create({
    data: {
      id: "cac-fr-4",
      entityId: "cac-entity-2",
      name: "CAC Fund II — Final Close",
      targetAmount: 600_000_000,
      raisedAmount: 500_000_000,
      status: "FINAL_CLOSE",
      openDate: new Date("2021-09-01"),
      closeDate: new Date("2022-06-30"),
    },
  });

  // ============================================================
  // INVESTORS (6)
  // ============================================================
  console.log("Creating investors...");

  const investor1 = await prisma.investor.create({
    data: {
      id: "cac-investor-1",
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
      id: "cac-investor-2",
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
      id: "cac-investor-3",
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
      id: "cac-investor-4",
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
      id: "cac-investor-5",
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
      id: "cac-investor-6",
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

  const commitments = [
    // CalPERS: Fund I, Fund II, Growth Fund, Sidecar A, RE SPV ($165M)
    { id: "cac-commit-1-1", investorId: investor1.id, entityId: entity1.id, amount: 50_000_000, calledAmount: 45_000_000 },
    { id: "cac-commit-1-2", investorId: investor1.id, entityId: entity2.id, amount: 75_000_000, calledAmount: 46_500_000 },
    { id: "cac-commit-1-4", investorId: investor1.id, entityId: entity4.id, amount: 15_000_000, calledAmount: 8_400_000 },
    { id: "cac-commit-1-5", investorId: investor1.id, entityId: entity5.id, amount: 20_000_000, calledAmount: 18_000_000 },
    { id: "cac-commit-1-9", investorId: investor1.id, entityId: entity9.id, amount: 5_000_000, calledAmount: 5_000_000 },

    // Harvard: Fund I, Fund II, Sidecar B ($95M)
    { id: "cac-commit-2-1", investorId: investor2.id, entityId: entity1.id, amount: 40_000_000, calledAmount: 36_000_000 },
    { id: "cac-commit-2-2", investorId: investor2.id, entityId: entity2.id, amount: 47_000_000, calledAmount: 29_200_000 },
    { id: "cac-commit-2-6", investorId: investor2.id, entityId: entity6.id, amount: 8_000_000, calledAmount: 7_000_000 },

    // Wellington: Fund II, Fund III, Co-Invest SPV ($55M)
    { id: "cac-commit-3-2", investorId: investor3.id, entityId: entity2.id, amount: 25_000_000, calledAmount: 15_500_000 },
    { id: "cac-commit-3-3", investorId: investor3.id, entityId: entity3.id, amount: 20_000_000, calledAmount: 14_100_000 },
    { id: "cac-commit-3-7", investorId: investor3.id, entityId: entity7.id, amount: 10_000_000, calledAmount: 8_000_000 },

    // Meridian Partners: Fund I, Fund II, Growth Fund, Credit Opp I ($120M)
    { id: "cac-commit-4-1", investorId: investor4.id, entityId: entity1.id, amount: 30_000_000, calledAmount: 27_000_000 },
    { id: "cac-commit-4-2", investorId: investor4.id, entityId: entity2.id, amount: 50_000_000, calledAmount: 31_000_000 },
    { id: "cac-commit-4-4", investorId: investor4.id, entityId: entity4.id, amount: 20_000_000, calledAmount: 11_200_000 },
    { id: "cac-commit-4-8", investorId: investor4.id, entityId: entity8.id, amount: 20_000_000, calledAmount: 14_000_000 },

    // Pacific Rim: Fund II, Fund III, Co-Invest SPV ($180M)
    { id: "cac-commit-5-2", investorId: investor5.id, entityId: entity2.id, amount: 100_000_000, calledAmount: 62_000_000 },
    { id: "cac-commit-5-3", investorId: investor5.id, entityId: entity3.id, amount: 65_000_000, calledAmount: 46_000_000 },
    { id: "cac-commit-5-7", investorId: investor5.id, entityId: entity7.id, amount: 15_000_000, calledAmount: 12_000_000 },

    // Greenfield: Fund I, Credit Opp I ($35M)
    { id: "cac-commit-6-1", investorId: investor6.id, entityId: entity1.id, amount: 15_000_000, calledAmount: 13_500_000 },
    { id: "cac-commit-6-8", investorId: investor6.id, entityId: entity8.id, amount: 20_000_000, calledAmount: 14_000_000 },
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
      { id: "cac-sl-1", investorId: investor1.id, entityId: entity2.id, terms: "MFN, 25% mgmt fee discount, co-invest rights, LPAC seat" },
      { id: "cac-sl-2", investorId: investor5.id, entityId: entity2.id, terms: "MFN, no carry on first $5M, quarterly reporting in Japanese" },
      { id: "cac-sl-3", investorId: investor3.id, entityId: entity3.id, terms: "Reduced carry (15%), quarterly co-invest right of first refusal" },
      { id: "cac-sl-4", investorId: investor2.id, entityId: entity1.id, terms: "LPAC seat, annual meeting presentation slot" },
    ],
  });

  // ============================================================
  // ASSETS (11)
  // ============================================================
  console.log("Creating assets...");

  const asset1 = await prisma.asset.create({
    data: {
      id: "cac-asset-1",
      name: "NovaTech AI",
      assetClass: "OPERATING_BUSINESS", capitalInstrument: "EQUITY", participationStructure: "DIRECT_GP",
      sector: "Technology",
      status: "ACTIVE",
      costBasis: 45_000_000,
      fairValue: 112_000_000,
      moic: 2.00,
      irr: 0.25,
      incomeType: "Dividends",
      hasBoardSeat: true,
      entryDate: new Date("2020-03-01"),
      nextReview: new Date("2025-03-15"),
    },
  });

  const asset2 = await prisma.asset.create({
    data: {
      id: "cac-asset-2",
      name: "Helix Therapeutics",
      assetClass: "OPERATING_BUSINESS", capitalInstrument: "EQUITY", participationStructure: "DIRECT_GP",
      sector: "Healthcare",
      status: "ACTIVE",
      costBasis: 32_000_000,
      fairValue: 56_000_000,
      moic: 1.60,
      irr: 0.17,
      incomeType: "None",
      hasBoardSeat: false,
      entryDate: new Date("2021-06-01"),
      nextReview: new Date("2025-06-01"),
    },
  });

  const asset3 = await prisma.asset.create({
    data: {
      id: "cac-asset-3",
      name: "Meridian Credit Facility",
      assetClass: "REAL_ESTATE", capitalInstrument: "DEBT", participationStructure: "DIRECT_GP",
      sector: "Industrials",
      status: "ACTIVE",
      costBasis: 15_000_000,
      fairValue: 15_000_000,
      moic: 1.05,
      irr: 0.06,
      incomeType: "SOFR+450bps",
      hasBoardSeat: false,
      entryDate: new Date("2023-06-01"),
      nextReview: new Date("2025-03-30"),
    },
  });

  const asset4 = await prisma.asset.create({
    data: {
      id: "cac-asset-4",
      name: "123 Industrial Blvd",
      assetClass: "REAL_ESTATE", capitalInstrument: "EQUITY", participationStructure: "DIRECT_GP",
      sector: "Industrial RE",
      status: "ACTIVE",
      costBasis: 22_000_000,
      fairValue: 28_500_000,
      moic: 1.18,
      irr: 0.08,
      incomeType: "Rental NOI",
      hasBoardSeat: false,
      entryDate: new Date("2021-01-01"),
      nextReview: new Date("2025-06-01"),
    },
  });

  const asset5 = await prisma.asset.create({
    data: {
      id: "cac-asset-5",
      name: "Sequoia Capital Fund XVI",
      assetClass: "OPERATING_BUSINESS", capitalInstrument: "EQUITY", participationStructure: "LP_STAKE_SILENT_PARTNER",
      sector: "VC",
      status: "ACTIVE",
      costBasis: 10_000_000,
      fairValue: 14_200_000,
      moic: 1.28,
      irr: 0.13,
      incomeType: "Distributions",
      hasBoardSeat: false,
      entryDate: new Date("2022-09-01"),
      nextReview: new Date("2025-04-15"),
    },
  });

  const asset6 = await prisma.asset.create({
    data: {
      id: "cac-asset-6",
      name: "Blackstone RE Fund IX",
      assetClass: "REAL_ESTATE", capitalInstrument: "EQUITY", participationStructure: "LP_STAKE_SILENT_PARTNER",
      sector: "Real Estate",
      status: "ACTIVE",
      costBasis: 25_000_000,
      fairValue: 27_800_000,
      moic: 1.09,
      irr: 0.07,
      incomeType: "Distributions",
      hasBoardSeat: false,
      entryDate: new Date("2023-01-01"),
      nextReview: new Date("2025-05-01"),
    },
  });

  const asset7 = await prisma.asset.create({
    data: {
      id: "cac-asset-7",
      name: "SolarGrid Energy",
      assetClass: "INFRASTRUCTURE", capitalInstrument: "EQUITY", participationStructure: "CO_INVEST_JV_PARTNERSHIP",
      sector: "Energy",
      status: "EXITED",
      costBasis: 20_000_000,
      fairValue: 58_000_000,
      moic: 1.85,
      irr: 0.22,
      incomeType: null,
      hasBoardSeat: false,
      entryDate: new Date("2019-06-01"),
      nextReview: null,
    },
  });

  const asset8 = await prisma.asset.create({
    data: {
      id: "cac-asset-8",
      name: "CloudBase Systems",
      assetClass: "NON_CORRELATED", capitalInstrument: "EQUITY", participationStructure: "LP_STAKE_SILENT_PARTNER",
      sector: "Technology",
      status: "ACTIVE",
      costBasis: 8_000_000,
      fairValue: 11_500_000,
      moic: 1.32,
      irr: 0.15,
      incomeType: null,
      hasBoardSeat: false,
      entryDate: new Date("2022-11-01"),
      nextReview: new Date("2025-04-20"),
    },
  });

  const asset9 = await prisma.asset.create({
    data: {
      id: "cac-asset-9",
      name: "FreshRoute Bridge Loan",
      assetClass: "DIVERSIFIED", capitalInstrument: "EQUITY", participationStructure: "CO_INVEST_JV_PARTNERSHIP",
      sector: "Logistics",
      status: "ACTIVE",
      costBasis: 5_000_000,
      fairValue: 5_000_000,
      moic: 1.08,
      irr: 0.09,
      incomeType: "12% fixed",
      hasBoardSeat: false,
      entryDate: new Date("2024-01-01"),
      nextReview: new Date("2025-07-01"),
    },
  });

  const asset10 = await prisma.asset.create({
    data: {
      id: "cac-asset-10",
      name: "Midwest Sports Fund II",
      assetClass: "DIVERSIFIED", capitalInstrument: "DEBT", participationStructure: "LP_STAKE_SILENT_PARTNER",
      sector: "Sports",
      status: "ACTIVE",
      costBasis: 5_000_000,
      fairValue: 5_800_000,
      moic: 0.88,
      irr: -0.04,
      incomeType: "Distributions",
      hasBoardSeat: false,
      entryDate: new Date("2024-03-01"),
      nextReview: new Date("2025-06-15"),
    },
  });

  const asset11 = await prisma.asset.create({
    data: {
      id: "cac-asset-11",
      name: "LifeBridge Insurance Fund",
      assetClass: "REAL_ESTATE", capitalInstrument: "EQUITY", participationStructure: "DIRECT_GP",
      sector: "Life Insurance",
      status: "ACTIVE",
      costBasis: 7_000_000,
      fairValue: 7_400_000,
      moic: 1.03,
      irr: 0.03,
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
    { id: "cac-alloc-1-1", assetId: asset1.id, entityId: entity1.id, allocationPercent: 50 },
    { id: "cac-alloc-1-2", assetId: asset1.id, entityId: entity2.id, allocationPercent: 50 },
    // Helix Therapeutics -> Fund I
    { id: "cac-alloc-2-1", assetId: asset2.id, entityId: entity1.id, allocationPercent: 100 },
    // Meridian Credit Facility -> Credit Opp I
    { id: "cac-alloc-3-8", assetId: asset3.id, entityId: entity8.id, allocationPercent: 100 },
    // 123 Industrial Blvd -> Fund I
    { id: "cac-alloc-4-1", assetId: asset4.id, entityId: entity1.id, allocationPercent: 100 },
    // Sequoia Capital Fund XVI -> Fund III
    { id: "cac-alloc-5-3", assetId: asset5.id, entityId: entity3.id, allocationPercent: 100 },
    // Blackstone RE Fund IX -> Fund III
    { id: "cac-alloc-6-3", assetId: asset6.id, entityId: entity3.id, allocationPercent: 100 },
    // SolarGrid Energy -> Fund I
    { id: "cac-alloc-7-1", assetId: asset7.id, entityId: entity1.id, allocationPercent: 100 },
    // CloudBase Systems -> Co-Invest SPV
    { id: "cac-alloc-8-7", assetId: asset8.id, entityId: entity7.id, allocationPercent: 100 },
    // FreshRoute Bridge Loan -> Credit Opp I
    { id: "cac-alloc-9-8", assetId: asset9.id, entityId: entity8.id, allocationPercent: 100 },
    // Midwest Sports Fund II -> Growth Fund
    { id: "cac-alloc-10-4", assetId: asset10.id, entityId: entity4.id, allocationPercent: 100 },
    // LifeBridge Insurance Fund -> Growth Fund
    { id: "cac-alloc-11-4", assetId: asset11.id, entityId: entity4.id, allocationPercent: 100 },
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
      id: "cac-eq-1",
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
      id: "cac-cred-1",
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
      id: "cac-cred-2",
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
      id: "cac-re-1",
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
      id: "cac-fundlp-1",
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
      id: "cac-fundlp-2",
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
      id: "cac-fundlp-3",
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
      id: "cac-fundlp-4",
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
      id: "cac-lease-1",
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
      id: "cac-lease-2",
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
      id: "cac-lease-3",
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
      id: "cac-ca-1",
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
        id: "cac-cov-1",
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
        id: "cac-cov-2",
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
        id: "cac-cov-3",
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
        id: "cac-cov-4",
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
      { id: "cac-cpmt-1", agreementId: creditAgreement.id, date: new Date("2025-03-15"), paymentType: "Interest", amount: 187_500, status: "Upcoming" },
      { id: "cac-cpmt-2", agreementId: creditAgreement.id, date: new Date("2024-12-15"), paymentType: "Interest", amount: 182_000, status: "Received" },
      { id: "cac-cpmt-3", agreementId: creditAgreement.id, date: new Date("2024-09-15"), paymentType: "Interest", amount: 178_500, status: "Received" },
    ],
  });

  // ============================================================
  // VALUATIONS (3 for NovaTech AI)
  // ============================================================
  console.log("Creating valuations...");

  await prisma.valuation.createMany({
    data: [
      {
        id: "cac-val-1",
        assetId: asset1.id,
        valuationDate: new Date("2024-12-31"),
        method: "COMPARABLE_MULTIPLES",
        fairValue: 112_000_000,
        moic: 2.49,
        status: "APPROVED",
        approvedBy: userJK.name,
        approvedAt: new Date("2025-01-15"),
      },
      {
        id: "cac-val-2",
        assetId: asset1.id,
        valuationDate: new Date("2024-09-30"),
        method: "COMPARABLE_MULTIPLES",
        fairValue: 98_000_000,
        moic: 2.18,
        status: "APPROVED",
        approvedBy: userJK.name,
        approvedAt: new Date("2024-10-15"),
      },
      {
        id: "cac-val-3",
        assetId: asset1.id,
        valuationDate: new Date("2024-06-30"),
        method: "LAST_ROUND",
        fairValue: 90_000_000,
        moic: 2.0,
        status: "APPROVED",
        approvedBy: userJK.name,
        approvedAt: new Date("2024-07-15"),
      },
      // ── Helix Therapeutics valuations (asset2) ──
      { id: "cac-val-h1", assetId: asset2.id, valuationDate: new Date("2024-12-31"), method: "LAST_ROUND", fairValue: 42_000_000, moic: 1.53, status: "APPROVED", approvedBy: userJK.name, approvedAt: new Date("2025-01-20") },
      { id: "cac-val-h2", assetId: asset2.id, valuationDate: new Date("2024-09-30"), method: "LAST_ROUND", fairValue: 38_000_000, moic: 1.38, status: "APPROVED", approvedBy: userJK.name, approvedAt: new Date("2024-10-20") },
      // ── 123 Industrial Blvd valuations (asset4) ──
      { id: "cac-val-h3", assetId: asset4.id, valuationDate: new Date("2024-12-31"), method: "DCF", fairValue: 18_500_000, moic: 1.12, status: "APPROVED", approvedBy: userJK.name, approvedAt: new Date("2025-01-15") },
      { id: "cac-val-h4", assetId: asset4.id, valuationDate: new Date("2024-06-30"), method: "DCF", fairValue: 17_200_000, moic: 1.04, status: "APPROVED", approvedBy: userJK.name, approvedAt: new Date("2024-07-15") },
      // ── CloudBase Systems valuations (asset8) ──
      { id: "cac-val-h5", assetId: asset8.id, valuationDate: new Date("2024-12-31"), method: "COMPARABLE_MULTIPLES", fairValue: 28_000_000, moic: 1.28, status: "APPROVED", approvedBy: userJK.name, approvedAt: new Date("2025-01-10") },
      { id: "cac-val-h6", assetId: asset8.id, valuationDate: new Date("2024-09-30"), method: "COMPARABLE_MULTIPLES", fairValue: 24_500_000, moic: 1.13, status: "APPROVED", approvedBy: userJK.name, approvedAt: new Date("2024-10-15") },
      // ── Sequoia Capital Fund XVI valuations (asset5) ──
      { id: "cac-val-h9", assetId: asset5.id, valuationDate: new Date("2024-12-31"), method: "GP_REPORTED_NAV", fairValue: 22_000_000, moic: 0.99, status: "APPROVED", approvedBy: userJK.name, approvedAt: new Date("2025-01-25") },
      { id: "cac-val-h10", assetId: asset5.id, valuationDate: new Date("2024-06-30"), method: "GP_REPORTED_NAV", fairValue: 20_500_000, moic: 0.93, status: "APPROVED", approvedBy: userJK.name, approvedAt: new Date("2024-07-20") },
      // ── FreshRoute Logistics valuations (asset9) ──
      { id: "cac-val-h11", assetId: asset9.id, valuationDate: new Date("2024-12-31"), method: "DCF", fairValue: 35_000_000, moic: 1.50, status: "APPROVED", approvedBy: userJK.name, approvedAt: new Date("2025-01-12") },
      { id: "cac-val-h12", assetId: asset9.id, valuationDate: new Date("2024-09-30"), method: "DCF", fairValue: 31_000_000, moic: 1.33, status: "APPROVED", approvedBy: userJK.name, approvedAt: new Date("2024-10-18") },
      // ── Midwest Sports Fund II valuations (asset10) ──
      { id: "cac-val-h13", assetId: asset10.id, valuationDate: new Date("2024-12-31"), method: "COMPARABLE_MULTIPLES", fairValue: 15_500_000, moic: 0.78, status: "APPROVED", approvedBy: userJK.name, approvedAt: new Date("2025-01-18") },
      { id: "cac-val-h14", assetId: asset10.id, valuationDate: new Date("2024-09-30"), method: "COMPARABLE_MULTIPLES", fairValue: 16_200_000, moic: 0.82, status: "APPROVED", approvedBy: userJK.name, approvedAt: new Date("2024-10-22") },
      // ── LifeBridge Insurance Fund valuations (asset11) ──
      { id: "cac-val-h15", assetId: asset11.id, valuationDate: new Date("2024-12-31"), method: "GP_REPORTED_NAV", fairValue: 12_800_000, moic: 1.24, status: "APPROVED", approvedBy: userJK.name, approvedAt: new Date("2025-01-20") },
      { id: "cac-val-h16", assetId: asset11.id, valuationDate: new Date("2024-06-30"), method: "GP_REPORTED_NAV", fairValue: 11_500_000, moic: 1.12, status: "APPROVED", approvedBy: userJK.name, approvedAt: new Date("2024-07-18") },
    ],
  });

  // ============================================================
  // DEALS (5 pipeline deals)
  // ============================================================
  console.log("Creating deals...");

  const deal1 = await prisma.deal.create({
    data: {
      id: "cac-deal-1",
      firmId: firm.id,
      entityId: "cac-entity-7",
      name: "Apex Manufacturing",
      assetClass: "DIVERSIFIED", capitalInstrument: "EQUITY", participationStructure: "DIRECT_GP",
      sector: "Industrials",
      stage: "IC_REVIEW",
      targetSize: "$30-40M",
      targetCheckSize: "$12-15M",
      targetReturn: "2.5-3.0x MOIC / 20-25% IRR",
      dealLeadId: userJK.id,
      counterparty: "Apex Industries Inc.",
      aiScore: 82,
      aiFlag: "Strong margins, customer concentration risk",
      description: "Majority acquisition of specialty manufacturer serving aerospace & defense.",
      thesisNotes: "Strong recurring revenue from long-term contracts; margin expansion opportunity through operational improvements.",
      investmentRationale: "Niche industrial manufacturer with defensible market position and margin expansion potential through operational improvements. Long-term DoD contracts provide revenue visibility.",
      additionalContext: "Seller is motivated — founder retirement. Exclusive negotiation window through mid-March. Management team willing to roll 30% equity.",
      nextDeadline: new Date("2026-03-21"),
      nextDeadlineLabel: "IC Meeting",
      projectedExitTimeframe: "3-5 years",
    },
  });

  const deal2 = await prisma.deal.create({
    data: {
      id: "cac-deal-2",
      firmId: firm.id,
      name: "Beacon Health",
      assetClass: "DIVERSIFIED", capitalInstrument: "EQUITY", participationStructure: "CO_INVEST_JV_PARTNERSHIP",
      sector: "Healthcare",
      stage: "DUE_DILIGENCE",
      targetSize: "$20-25M",
      targetCheckSize: "$8-10M",
      targetReturn: "3.0x MOIC / 25-30% IRR",
      dealLeadId: userSM.id,
      counterparty: "Beacon Healthcare Group",
      aiScore: 74,
      aiFlag: "Regulatory pathway uncertain",
      description: "Growth equity investment in multi-site outpatient clinic platform.",
      thesisNotes: "De novo expansion model with strong same-store revenue growth; regulatory risk around reimbursement changes.",
      investmentRationale: "Healthcare services platform play with proven unit economics. Opportunity to consolidate fragmented outpatient market with de novo expansion model showing 15% SSS growth.",
      additionalContext: "Co-invest opportunity alongside Lead GP. Management team has 20+ year healthcare ops experience. CMS reimbursement review expected Q2 2026.",
      nextDeadline: new Date("2026-04-01"),
      nextDeadlineLabel: "DD completion target",
      projectedExitTimeframe: "5-7 years",
    },
  });

  const deal3 = await prisma.deal.create({
    data: {
      id: "cac-deal-3",
      firmId: firm.id,
      name: "UrbanNest PropTech",
      assetClass: "REAL_ESTATE", capitalInstrument: "EQUITY", participationStructure: "DIRECT_GP",
      sector: "RE Tech",
      stage: "SCREENING",
      targetSize: "$10M",
      targetCheckSize: "$3-5M",
      targetReturn: "3.0x MOIC / 25% IRR",
      dealLeadId: userJK.id,
      source: "Advisor referral - Goldman Sachs",
      counterparty: "UrbanNest Inc.",
      aiScore: null,
      aiFlag: null,
      description: "PropTech SaaS platform enabling 30% cost reduction for commercial property managers through AI-powered building operations.",
      thesisNotes: "Series A stage with $4M ARR growing 120% YoY. Capital efficient model with 80% gross margins.",
      investmentRationale: "PropTech platform with strong ARR growth. Opportunity to invest at attractive valuation before Series B. Technology enables 30% cost reduction for commercial property managers with measurable ROI.",
      additionalContext: "Founder previously exited a SaaS company to Oracle for $180M. Strong technical team of 25. Competing term sheets expected by end of month. Board seat available.",
      nextDeadline: new Date("2026-03-25"),
      nextDeadlineLabel: "Competing term sheets close",
      projectedExitTimeframe: "4-6 years",
    },
  });

  const deal4 = await prisma.deal.create({
    data: {
      id: "cac-deal-4",
      firmId: firm.id,
      name: "Ridgeline Senior Debt",
      assetClass: "REAL_ESTATE", capitalInstrument: "DEBT", participationStructure: "DIRECT_GP",
      sector: "Real Estate",
      stage: "DUE_DILIGENCE",
      targetSize: "$8M",
      targetCheckSize: "$8M",
      targetReturn: "SOFR+350bps / 10-12% gross yield",
      dealLeadId: userAL.id,
      counterparty: "Ridgeline Properties LLC",
      gpName: "Ridgeline Capital Partners",
      aiScore: 88,
      aiFlag: "Strong collateral, low LTV",
      description: "Senior secured credit facility for stabilized commercial real estate portfolio.",
      thesisNotes: "Low LTV, strong DSCR coverage, experienced sponsor with track record.",
      investmentRationale: "Low-risk credit opportunity with strong collateral coverage. Sponsor has 15-year track record with zero defaults. Portfolio is 95% leased to credit tenants.",
      additionalContext: "Existing relationship with sponsor from prior deal. Refinancing existing bank facility at better terms for borrower. 24-month term with 6-month extension option.",
      nextDeadline: new Date("2026-03-20"),
      nextDeadlineLabel: "Exclusivity expires",
      projectedExitTimeframe: "3 years (maturity)",
    },
  });

  const deal5 = await prisma.deal.create({
    data: {
      id: "cac-deal-5",
      firmId: firm.id,
      name: "Nordic Wind Fund III",
      assetClass: "INFRASTRUCTURE", capitalInstrument: "EQUITY", participationStructure: "LP_STAKE_SILENT_PARTNER",
      sector: "Infrastructure",
      stage: "SCREENING",
      targetSize: "$15M LP",
      targetCheckSize: "$15M",
      targetReturn: "1.8-2.0x MOIC / 12-15% net IRR",
      dealLeadId: userSM.id,
      gpName: "Nordic Wind Capital",
      source: "GP direct outreach",
      aiScore: null,
      aiFlag: null,
      description: "LP commitment to Nordic Wind Fund III focused on Northern European onshore wind assets.",
      investmentRationale: "Infrastructure fund with strong GP track record (Fund I: 1.9x, Fund II: on pace for 1.7x). Contracted cash flows with 90%+ revenue visibility. ESG-aligned strategy.",
      projectedExitTimeframe: "7-10 years",
    },
  });

  // Deal 11 — CLOSING stage
  const deal11 = await prisma.deal.create({
    data: {
      id: "cac-deal-11",
      firmId: firm.id,
      name: "Summit Ridge Logistics Hub",
      assetClass: "REAL_ESTATE", capitalInstrument: "EQUITY", participationStructure: "DIRECT_GP",
      sector: "Industrial / Logistics",
      stage: "CLOSING",
      targetSize: "$42M",
      targetCheckSize: "$12M",
      targetReturn: "18% IRR / 2.2x",
      dealLeadId: userJK.id,
      gpName: "Summit Partners",
      source: "Direct sourcing",
      counterparty: "Ridge Capital",
      aiScore: 89,
      aiFlag: "Strong logistics fundamentals, below-replacement-cost basis",
      description: "Class A logistics facility in Nashville metro area with 10-year NNN lease to investment-grade tenant.",
      investmentRationale: "Strong logistics fundamentals in growing Southeast market with below-replacement-cost basis.",
      projectedExitTimeframe: "5-7 years",
      nextDeadline: new Date("2026-04-15"),
      nextDeadlineLabel: "Wire deadline",
    },
  });

  // ============================================================
  // DD CATEGORY TEMPLATES (firm-level library)
  // ============================================================
  console.log("Creating DD category templates...");

  const ddCategories = getDefaultDDCategoriesForFirm(firm.id);

  for (const cat of ddCategories) {
    await prisma.dDCategoryTemplate.create({ data: cat });
  }

  // ============================================================
  // DD WORKSTREAMS
  // ============================================================
  console.log("Creating DD workstreams...");

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

  const dealsToScaffold = [
    { deal: deal1, prefix: "cac-ws-1" },
    { deal: deal2, prefix: "cac-ws-2" },
    { deal: deal3, prefix: "cac-ws-3" },
    { deal: deal4, prefix: "cac-ws-4" },
    { deal: deal5, prefix: "cac-ws-5" },
    { deal: deal11, prefix: "cac-ws-11" },
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

    console.log(`  -> ${deal.name}: ${templates.length} workstreams`);
  }

  // Mark some workstreams as COMPLETE for cac-deal-11 (CLOSING stage — DD is done)
  await prisma.dDWorkstream.updateMany({
    where: { dealId: deal11.id, name: { in: ["Financial DD", "Legal DD"] } },
    data: { status: "COMPLETE", completedTasks: 5, totalTasks: 5 },
  });

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
      { dealId: deal1.id, activityType: "DOCUMENT_UPLOADED", description: "Quality of Earnings report uploaded", createdAt: new Date("2026-02-12") },
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

      // Deal 11 (Summit Ridge Logistics Hub) — CLOSING stage, full lifecycle through IC approval
      { dealId: deal11.id, activityType: "SCREENING_RUN", description: "AI screening completed with score 89/100. Recommendation: STRONG_PROCEED.", metadata: { score: 89, recommendation: "STRONG_PROCEED" }, createdAt: new Date("2025-12-10") },
      { dealId: deal11.id, activityType: "STAGE_CHANGE", description: "Deal advanced from Screening to Due Diligence", metadata: { fromStage: "SCREENING", toStage: "DUE_DILIGENCE" }, createdAt: new Date("2025-12-12") },
      { dealId: deal11.id, activityType: "MEETING", description: "Site visit to Nashville logistics facility — 450K SF Class A warehouse", metadata: { meetingType: "Site Visit" }, createdAt: new Date("2025-12-20") },
      { dealId: deal11.id, activityType: "DOCUMENT_UPLOADED", description: "Appraisal report and environmental assessment uploaded", createdAt: new Date("2026-01-08") },
      { dealId: deal11.id, activityType: "CALL", description: "Call with tenant credit team to verify investment-grade rating", createdAt: new Date("2026-01-15") },
      { dealId: deal11.id, activityType: "STAGE_CHANGE", description: "Deal advanced to IC Review", metadata: { fromStage: "DUE_DILIGENCE", toStage: "IC_REVIEW" }, createdAt: new Date("2026-02-01") },
      { dealId: deal11.id, activityType: "STAGE_CHANGE", description: "IC approved — deal advanced to Closing", metadata: { fromStage: "IC_REVIEW", toStage: "CLOSING" }, createdAt: new Date("2026-02-20") },
      { dealId: deal11.id, activityType: "DOCUMENT_UPLOADED", description: "Draft PSA and closing checklist uploaded", createdAt: new Date("2026-03-01") },
    ],
  });

  // ============================================================
  // IC PROCESS + VOTES (for deal-1 in IC_REVIEW)
  // ============================================================
  console.log("Creating IC process data...");

  const icProcess = await prisma.iCProcess.create({
    data: {
      id: "cac-ic-1",
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

  // IC PROCESS + VOTES (for cac-deal-11 in CLOSING — approved)
  const icProcess11 = await prisma.iCProcess.create({
    data: {
      id: "cac-ic-11",
      dealId: deal11.id,
      status: "approved",
      finalDecision: "APPROVED",
      quorumType: "majority",
      deadline: new Date("2026-02-15"),
    },
  });

  await prisma.iCVoteRecord.createMany({
    data: [
      { icProcessId: icProcess11.id, userId: userJK.id, vote: "APPROVE", notes: "Excellent logistics asset at below-replacement cost. Strong tenant credit." },
      { icProcessId: icProcess11.id, userId: userSM.id, vote: "APPROVE", notes: "Nashville market fundamentals are compelling. 10-year NNN lease de-risks significantly." },
      { icProcessId: icProcess11.id, userId: userAL.id, vote: "APPROVE", notes: "Clean diligence. Proceed to closing." },
    ],
  });

  // ============================================================
  // CLOSING CHECKLIST (for cac-deal-11 in CLOSING stage)
  // ============================================================
  console.log("Creating closing checklist for cac-deal-11...");

  await prisma.closingChecklist.createMany({
    data: [
      { dealId: deal11.id, title: "Execute Purchase / Sale Agreement", order: 1, status: "COMPLETE", assigneeId: userJK.id, assignee: "James Kim", isCustom: false },
      { dealId: deal11.id, title: "Legal Opinion & Closing Deliverables", order: 2, status: "COMPLETE", assigneeId: userSM.id, assignee: "Sarah Mitchell", isCustom: false },
      { dealId: deal11.id, title: "Regulatory / Compliance Approvals", order: 3, status: "COMPLETE", assigneeId: userAL.id, assignee: "Alex Lee", isCustom: false },
      { dealId: deal11.id, title: "Transfer of Title / Ownership", order: 4, status: "IN_PROGRESS", assigneeId: userSM.id, assignee: "Sarah Mitchell", dueDate: new Date("2026-03-25"), isCustom: false },
      { dealId: deal11.id, title: "Insurance Certificates & Binding", order: 5, status: "IN_PROGRESS", assigneeId: userAL.id, assignee: "Alex Lee", dueDate: new Date("2026-03-28"), isCustom: false },
      { dealId: deal11.id, title: "Entity Operating Agreement Execution", order: 6, status: "NOT_STARTED", assigneeId: userJK.id, assignee: "James Kim", dueDate: new Date("2026-04-01"), isCustom: false },
      { dealId: deal11.id, title: "Wire Transfer / Capital Deployment", order: 7, status: "NOT_STARTED", dueDate: new Date("2026-04-05"), isCustom: false },
      { dealId: deal11.id, title: "Post-Closing Deliverables & Booking", order: 8, status: "NOT_STARTED", dueDate: new Date("2026-04-10"), isCustom: false },
    ],
  });

  // ============================================================
  // IC QUESTIONS + REPLIES (for deal-1)
  // ============================================================
  console.log("Creating IC questions...");

  const q1 = await prisma.iCQuestion.create({
    data: {
      id: "cac-icq-1",
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
      id: "cac-icq-2",
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

  await prisma.iCQuestion.create({
    data: {
      id: "cac-icq-3",
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
        id: "cac-cc-1",
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
        id: "cac-cc-2",
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
        id: "cac-cc-3",
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
        id: "cac-cc-4",
        entityId: entity3.id,
        callNumber: "CC-005",
        callDate: new Date("2025-01-15"),
        dueDate: new Date("2025-02-01"),
        amount: 8_000_000,
        purpose: "Sequoia Fund XVI \u2014 capital call pass-through",
        status: "FUNDED",
        fundedPercent: 100,
      },
      // ── Early capital calls (fund deployment history) ──
      { id: "cac-cc-e1", entityId: entity1.id, callNumber: "CC-E01", callDate: new Date("2019-09-01"), dueDate: new Date("2019-09-15"), amount: 25_000_000, purpose: "Initial deployment — SolarGrid Energy + reserves", status: "FUNDED", fundedPercent: 100 },
      { id: "cac-cc-e2", entityId: entity1.id, callNumber: "CC-E02", callDate: new Date("2020-03-01"), dueDate: new Date("2020-03-15"), amount: 30_000_000, purpose: "NovaTech AI Series B investment", status: "FUNDED", fundedPercent: 100 },
      { id: "cac-cc-e3", entityId: entity1.id, callNumber: "CC-E03", callDate: new Date("2021-01-15"), dueDate: new Date("2021-02-01"), amount: 35_000_000, purpose: "Helix Therapeutics + 123 Industrial Blvd", status: "FUNDED", fundedPercent: 100 },
      { id: "cac-cc-e4", entityId: entity1.id, callNumber: "CC-E04", callDate: new Date("2022-06-01"), dueDate: new Date("2022-06-15"), amount: 15_000_000, purpose: "Follow-on investments + management fees", status: "FUNDED", fundedPercent: 100 },
      { id: "cac-cc-e5", entityId: entity2.id, callNumber: "CC-E05", callDate: new Date("2022-09-01"), dueDate: new Date("2022-09-15"), amount: 40_000_000, purpose: "Initial fund II deployment", status: "FUNDED", fundedPercent: 100 },
      { id: "cac-cc-e6", entityId: entity2.id, callNumber: "CC-E06", callDate: new Date("2023-03-01"), dueDate: new Date("2023-03-15"), amount: 35_000_000, purpose: "Fund II follow-on investments", status: "FUNDED", fundedPercent: 100 },
      { id: "cac-cc-e7", entityId: entity3.id, callNumber: "CC-E07", callDate: new Date("2023-09-01"), dueDate: new Date("2023-09-15"), amount: 30_000_000, purpose: "Sequoia + Blackstone initial commitments", status: "FUNDED", fundedPercent: 100 },
      { id: "cac-cc-e8", entityId: entity4.id, callNumber: "CC-E08", callDate: new Date("2024-06-01"), dueDate: new Date("2024-06-15"), amount: 10_000_000, purpose: "Growth Fund initial deployment", status: "FUNDED", fundedPercent: 100 },
      // ── Historical capital calls (trailing 12 months) ──
      { id: "cac-cc-h1", entityId: entity1.id, callNumber: "CC-001", callDate: new Date("2024-04-01"), dueDate: new Date("2024-04-15"), amount: 5_000_000, purpose: "Q2 mgmt fees + operating reserves", status: "FUNDED", fundedPercent: 100 },
      { id: "cac-cc-h2", entityId: entity2.id, callNumber: "CC-004", callDate: new Date("2024-06-10"), dueDate: new Date("2024-06-25"), amount: 12_000_000, purpose: "Follow-on — Helix Therapeutics Series D", status: "FUNDED", fundedPercent: 100 },
      { id: "cac-cc-h3", entityId: entity1.id, callNumber: "CC-002", callDate: new Date("2024-07-01"), dueDate: new Date("2024-07-15"), amount: 3_500_000, purpose: "Q3 mgmt fees", status: "FUNDED", fundedPercent: 100 },
      { id: "cac-cc-h4", entityId: entity4.id, callNumber: "CC-RE-01", callDate: new Date("2025-08-15"), dueDate: new Date("2025-09-01"), amount: 8_500_000, purpose: "123 Industrial — tenant improvements", status: "FUNDED", fundedPercent: 100 },
      { id: "cac-cc-h5", entityId: entity2.id, callNumber: "CC-006", callDate: new Date("2025-09-20"), dueDate: new Date("2025-10-05"), amount: 18_000_000, purpose: "New investment — UrbanNest Platform", status: "FUNDED", fundedPercent: 100 },
      { id: "cac-cc-h6", entityId: entity8.id, callNumber: "CC-CR-01", callDate: new Date("2025-10-01"), dueDate: new Date("2025-10-15"), amount: 6_000_000, purpose: "Senior secured — logistics facility", status: "FUNDED", fundedPercent: 100 },
      { id: "cac-cc-h7", entityId: entity1.id, callNumber: "CC-003A", callDate: new Date("2025-10-15"), dueDate: new Date("2025-11-01"), amount: 4_000_000, purpose: "Q4 mgmt fees + expenses", status: "FUNDED", fundedPercent: 100 },
      { id: "cac-cc-h8", entityId: entity5.id, callNumber: "CC-CI-01", callDate: new Date("2025-11-01"), dueDate: new Date("2025-11-15"), amount: 15_000_000, purpose: "Fund II Co-Invest SPV draw", status: "FUNDED", fundedPercent: 100 },
      { id: "cac-cc-h9", entityId: entity2.id, callNumber: "CC-009", callDate: new Date("2025-12-01"), dueDate: new Date("2025-12-15"), amount: 7_500_000, purpose: "Bridge loan — Cascade Timber", status: "FUNDED", fundedPercent: 100 },
      { id: "cac-cc-h10", entityId: entity9.id, callNumber: "CC-GF-01", callDate: new Date("2026-01-10"), dueDate: new Date("2026-01-25"), amount: 20_000_000, purpose: "Atlas Growth Fund initial draw", status: "FUNDED", fundedPercent: 100 },
      { id: "cac-cc-h11", entityId: entity1.id, callNumber: "CC-004A", callDate: new Date("2026-02-01"), dueDate: new Date("2026-02-15"), amount: 3_000_000, purpose: "Q1 2026 mgmt fees", status: "ISSUED", fundedPercent: 40 },
    ],
  });

  // ============================================================
  // DISTRIBUTION EVENTS (6)
  // ============================================================
  console.log("Creating distribution events...");

  await prisma.distributionEvent.createMany({
    data: [
      {
        id: "cac-dist-1",
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
        id: "cac-dist-2",
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
        id: "cac-dist-3",
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
        id: "cac-dist-4",
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
        id: "cac-dist-5",
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
        id: "cac-dist-6",
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
      // ── Historical distributions (trailing 12 months) ──
      { id: "cac-dist-h1", entityId: entity1.id, distributionDate: new Date("2025-04-30"), grossAmount: 2_400_000, source: "NovaTech AI — Q1 dividend", returnOfCapital: 0, income: 2_400_000, longTermGain: 0, shortTermGain: 0, carriedInterest: 0, netToLPs: 2_400_000, status: "PAID", distributionType: "INCOME" },
      { id: "cac-dist-h2", entityId: entity2.id, distributionDate: new Date("2025-05-15"), grossAmount: 8_000_000, source: "Helix Therapeutics — partial exit", returnOfCapital: 3_000_000, income: 0, longTermGain: 4_200_000, shortTermGain: 0, carriedInterest: 800_000, netToLPs: 7_200_000, status: "PAID", distributionType: "CAPITAL_GAIN" },
      { id: "cac-dist-h3", entityId: entity8.id, distributionDate: new Date("2025-06-30"), grossAmount: 1_800_000, source: "Q2 interest income", returnOfCapital: 0, income: 1_800_000, longTermGain: 0, shortTermGain: 0, carriedInterest: 0, netToLPs: 1_800_000, status: "PAID", distributionType: "INCOME" },
      { id: "cac-dist-h4", entityId: entity1.id, distributionDate: new Date("2025-07-31"), grossAmount: 2_400_000, source: "NovaTech AI — Q2 dividend", returnOfCapital: 0, income: 2_400_000, longTermGain: 0, shortTermGain: 0, carriedInterest: 0, netToLPs: 2_400_000, status: "PAID", distributionType: "INCOME" },
      { id: "cac-dist-h5", entityId: entity4.id, distributionDate: new Date("2025-08-15"), grossAmount: 1_100_000, source: "123 Industrial — Q2 rental NOI", returnOfCapital: 0, income: 1_100_000, longTermGain: 0, shortTermGain: 0, carriedInterest: 0, netToLPs: 1_100_000, status: "PAID", distributionType: "INCOME" },
      { id: "cac-dist-h6", entityId: entity2.id, distributionDate: new Date("2025-09-30"), grossAmount: 3_500_000, source: "CloudBase — Q3 dividend", returnOfCapital: 0, income: 3_500_000, longTermGain: 0, shortTermGain: 0, carriedInterest: 0, netToLPs: 3_500_000, status: "PAID", distributionType: "INCOME" },
      { id: "cac-dist-h7", entityId: entity8.id, distributionDate: new Date("2025-09-30"), grossAmount: 2_200_000, source: "Q3 interest income", returnOfCapital: 0, income: 2_200_000, longTermGain: 0, shortTermGain: 0, carriedInterest: 0, netToLPs: 2_200_000, status: "PAID", distributionType: "INCOME" },
      { id: "cac-dist-h8", entityId: entity1.id, distributionDate: new Date("2025-10-31"), grossAmount: 2_400_000, source: "NovaTech AI — Q3 dividend", returnOfCapital: 0, income: 2_400_000, longTermGain: 0, shortTermGain: 0, carriedInterest: 0, netToLPs: 2_400_000, status: "PAID", distributionType: "INCOME" },
      { id: "cac-dist-h9", entityId: entity4.id, distributionDate: new Date("2025-11-15"), grossAmount: 1_200_000, source: "123 Industrial — Q3 rental NOI", returnOfCapital: 0, income: 1_200_000, longTermGain: 0, shortTermGain: 0, carriedInterest: 0, netToLPs: 1_200_000, status: "PAID", distributionType: "INCOME" },
      { id: "cac-dist-h10", entityId: entity8.id, distributionDate: new Date("2025-12-31"), grossAmount: 2_500_000, source: "Q4 interest income", returnOfCapital: 0, income: 2_500_000, longTermGain: 0, shortTermGain: 0, carriedInterest: 0, netToLPs: 2_500_000, status: "PAID", distributionType: "INCOME" },
      { id: "cac-dist-h11", entityId: entity1.id, distributionDate: new Date("2026-01-31"), grossAmount: 2_600_000, source: "NovaTech AI — Q4 dividend", returnOfCapital: 0, income: 2_600_000, longTermGain: 0, shortTermGain: 0, carriedInterest: 0, netToLPs: 2_600_000, status: "PAID", distributionType: "INCOME" },
      { id: "cac-dist-h12", entityId: entity2.id, distributionDate: new Date("2026-02-28"), grossAmount: 15_000_000, source: "FreshRoute Logistics — full exit", returnOfCapital: 5_000_000, income: 0, longTermGain: 8_500_000, shortTermGain: 0, carriedInterest: 1_500_000, netToLPs: 13_500_000, status: "PAID", distributionType: "CAPITAL_GAIN" },
    ],
  });

  // ============================================================
  // CAPITAL CALL LINE ITEMS
  // ============================================================
  console.log("Creating capital call line items...");

  await prisma.capitalCallLineItem.createMany({
    data: [
      // cc-1 (entity2, $25M)
      { id: "cac-ccli-1-1", capitalCallId: "cac-cc-1", investorId: investor1.id, amount: 12_500_000, status: "Funded", paidDate: new Date("2025-03-01") },
      { id: "cac-ccli-1-2", capitalCallId: "cac-cc-1", investorId: investor2.id, amount: 8_333_000, status: "Funded", paidDate: new Date("2025-03-01") },
      { id: "cac-ccli-1-5", capitalCallId: "cac-cc-1", investorId: investor5.id, amount: 4_167_000, status: "Funded", paidDate: new Date("2025-03-01") },
      // cc-2 (entity2, $15M)
      { id: "cac-ccli-2-1", capitalCallId: "cac-cc-2", investorId: investor1.id, amount: 7_500_000, status: "Pending" },
      { id: "cac-ccli-2-2", capitalCallId: "cac-cc-2", investorId: investor2.id, amount: 5_000_000, status: "Pending" },
      { id: "cac-ccli-2-5", capitalCallId: "cac-cc-2", investorId: investor5.id, amount: 2_500_000, status: "Pending" },
      // cc-3 (entity8, $10M)
      { id: "cac-ccli-3-3", capitalCallId: "cac-cc-3", investorId: investor3.id, amount: 4_000_000, status: "Pending" },
      { id: "cac-ccli-3-6", capitalCallId: "cac-cc-3", investorId: investor6.id, amount: 6_000_000, status: "Pending" },
      // cc-4 (entity3, $8M)
      { id: "cac-ccli-4-2", capitalCallId: "cac-cc-4", investorId: investor2.id, amount: 3_440_000, status: "Funded", paidDate: new Date("2025-02-01") },
      { id: "cac-ccli-4-3", capitalCallId: "cac-cc-4", investorId: investor3.id, amount: 2_880_000, status: "Funded", paidDate: new Date("2025-02-01") },
      { id: "cac-ccli-4-4", capitalCallId: "cac-cc-4", investorId: investor4.id, amount: 1_680_000, status: "Funded", paidDate: new Date("2025-02-01") },
      // ── Early capital call line items (fund deployment history) ──
      // cc-e1 (entity1, $25M) — entity1 investors: investor1 37%, investor2 30%, investor4 22%, investor6 11%
      { id: "cac-ccli-e1-1", capitalCallId: "cac-cc-e1", investorId: investor1.id, amount: 9_250_000, status: "Funded", paidDate: new Date("2019-09-15") },
      { id: "cac-ccli-e1-2", capitalCallId: "cac-cc-e1", investorId: investor2.id, amount: 7_500_000, status: "Funded", paidDate: new Date("2019-09-15") },
      { id: "cac-ccli-e1-4", capitalCallId: "cac-cc-e1", investorId: investor4.id, amount: 5_500_000, status: "Funded", paidDate: new Date("2019-09-15") },
      { id: "cac-ccli-e1-6", capitalCallId: "cac-cc-e1", investorId: investor6.id, amount: 2_750_000, status: "Funded", paidDate: new Date("2019-09-15") },
      // cc-e2 (entity1, $30M)
      { id: "cac-ccli-e2-1", capitalCallId: "cac-cc-e2", investorId: investor1.id, amount: 11_100_000, status: "Funded", paidDate: new Date("2020-03-15") },
      { id: "cac-ccli-e2-2", capitalCallId: "cac-cc-e2", investorId: investor2.id, amount: 9_000_000, status: "Funded", paidDate: new Date("2020-03-15") },
      { id: "cac-ccli-e2-4", capitalCallId: "cac-cc-e2", investorId: investor4.id, amount: 6_600_000, status: "Funded", paidDate: new Date("2020-03-15") },
      { id: "cac-ccli-e2-6", capitalCallId: "cac-cc-e2", investorId: investor6.id, amount: 3_300_000, status: "Funded", paidDate: new Date("2020-03-15") },
      // cc-e3 (entity1, $35M)
      { id: "cac-ccli-e3-1", capitalCallId: "cac-cc-e3", investorId: investor1.id, amount: 12_950_000, status: "Funded", paidDate: new Date("2021-02-01") },
      { id: "cac-ccli-e3-2", capitalCallId: "cac-cc-e3", investorId: investor2.id, amount: 10_500_000, status: "Funded", paidDate: new Date("2021-02-01") },
      { id: "cac-ccli-e3-4", capitalCallId: "cac-cc-e3", investorId: investor4.id, amount: 7_700_000, status: "Funded", paidDate: new Date("2021-02-01") },
      { id: "cac-ccli-e3-6", capitalCallId: "cac-cc-e3", investorId: investor6.id, amount: 3_850_000, status: "Funded", paidDate: new Date("2021-02-01") },
      // cc-e4 (entity1, $15M)
      { id: "cac-ccli-e4-1", capitalCallId: "cac-cc-e4", investorId: investor1.id, amount: 5_550_000, status: "Funded", paidDate: new Date("2022-06-15") },
      { id: "cac-ccli-e4-2", capitalCallId: "cac-cc-e4", investorId: investor2.id, amount: 4_500_000, status: "Funded", paidDate: new Date("2022-06-15") },
      { id: "cac-ccli-e4-4", capitalCallId: "cac-cc-e4", investorId: investor4.id, amount: 3_300_000, status: "Funded", paidDate: new Date("2022-06-15") },
      { id: "cac-ccli-e4-6", capitalCallId: "cac-cc-e4", investorId: investor6.id, amount: 1_650_000, status: "Funded", paidDate: new Date("2022-06-15") },
      // cc-e5 (entity2, $40M) — entity2 investors: investor1 25%, investor2 16%, investor3 8%, investor4 17%, investor5 34%
      { id: "cac-ccli-e5-1", capitalCallId: "cac-cc-e5", investorId: investor1.id, amount: 10_000_000, status: "Funded", paidDate: new Date("2022-09-15") },
      { id: "cac-ccli-e5-2", capitalCallId: "cac-cc-e5", investorId: investor2.id, amount: 6_400_000, status: "Funded", paidDate: new Date("2022-09-15") },
      { id: "cac-ccli-e5-4", capitalCallId: "cac-cc-e5", investorId: investor4.id, amount: 6_800_000, status: "Funded", paidDate: new Date("2022-09-15") },
      { id: "cac-ccli-e5-5", capitalCallId: "cac-cc-e5", investorId: investor5.id, amount: 13_600_000, status: "Funded", paidDate: new Date("2022-09-15") },
      { id: "cac-ccli-e5-3", capitalCallId: "cac-cc-e5", investorId: investor3.id, amount: 3_200_000, status: "Funded", paidDate: new Date("2022-09-15") },
      // cc-e6 (entity2, $35M)
      { id: "cac-ccli-e6-1", capitalCallId: "cac-cc-e6", investorId: investor1.id, amount: 8_750_000, status: "Funded", paidDate: new Date("2023-03-15") },
      { id: "cac-ccli-e6-2", capitalCallId: "cac-cc-e6", investorId: investor2.id, amount: 5_600_000, status: "Funded", paidDate: new Date("2023-03-15") },
      { id: "cac-ccli-e6-4", capitalCallId: "cac-cc-e6", investorId: investor4.id, amount: 5_950_000, status: "Funded", paidDate: new Date("2023-03-15") },
      { id: "cac-ccli-e6-5", capitalCallId: "cac-cc-e6", investorId: investor5.id, amount: 11_900_000, status: "Funded", paidDate: new Date("2023-03-15") },
      { id: "cac-ccli-e6-3", capitalCallId: "cac-cc-e6", investorId: investor3.id, amount: 2_800_000, status: "Funded", paidDate: new Date("2023-03-15") },
      // cc-e7 (entity3, $30M) — entity3 investors: investor3 24%, investor5 76%
      { id: "cac-ccli-e7-3", capitalCallId: "cac-cc-e7", investorId: investor3.id, amount: 7_200_000, status: "Funded", paidDate: new Date("2023-09-15") },
      { id: "cac-ccli-e7-5", capitalCallId: "cac-cc-e7", investorId: investor5.id, amount: 22_800_000, status: "Funded", paidDate: new Date("2023-09-15") },
      // cc-e8 (entity4, $10M) — entity4 investors: investor1 43%, investor4 57%
      { id: "cac-ccli-e8-1", capitalCallId: "cac-cc-e8", investorId: investor1.id, amount: 4_300_000, status: "Funded", paidDate: new Date("2024-06-15") },
      { id: "cac-ccli-e8-4", capitalCallId: "cac-cc-e8", investorId: investor4.id, amount: 5_700_000, status: "Funded", paidDate: new Date("2024-06-15") },
      // ── Historical capital call line items (funded) ──
      // cc-h1 (entity1, $5M)
      { id: "cac-ccli-h1-1", capitalCallId: "cac-cc-h1", investorId: investor1.id, amount: 1_925_000, status: "Funded", paidDate: new Date("2024-04-15") },
      { id: "cac-ccli-h1-3", capitalCallId: "cac-cc-h1", investorId: investor3.id, amount: 960_000, status: "Funded", paidDate: new Date("2024-04-15") },
      { id: "cac-ccli-h1-4", capitalCallId: "cac-cc-h1", investorId: investor4.id, amount: 1_155_000, status: "Funded", paidDate: new Date("2024-04-15") },
      { id: "cac-ccli-h1-6", capitalCallId: "cac-cc-h1", investorId: investor6.id, amount: 960_000, status: "Funded", paidDate: new Date("2024-04-15") },
      // cc-h2 (entity2, $12M)
      { id: "cac-ccli-h2-1", capitalCallId: "cac-cc-h2", investorId: investor1.id, amount: 6_000_000, status: "Funded", paidDate: new Date("2024-06-25") },
      { id: "cac-ccli-h2-2", capitalCallId: "cac-cc-h2", investorId: investor2.id, amount: 4_000_000, status: "Funded", paidDate: new Date("2024-06-25") },
      { id: "cac-ccli-h2-5", capitalCallId: "cac-cc-h2", investorId: investor5.id, amount: 2_000_000, status: "Funded", paidDate: new Date("2024-06-25") },
      // cc-h3 (entity1, $3.5M)
      { id: "cac-ccli-h3-1", capitalCallId: "cac-cc-h3", investorId: investor1.id, amount: 1_347_500, status: "Funded", paidDate: new Date("2024-07-15") },
      { id: "cac-ccli-h3-3", capitalCallId: "cac-cc-h3", investorId: investor3.id, amount: 672_000, status: "Funded", paidDate: new Date("2024-07-15") },
      { id: "cac-ccli-h3-4", capitalCallId: "cac-cc-h3", investorId: investor4.id, amount: 808_500, status: "Funded", paidDate: new Date("2024-07-15") },
      { id: "cac-ccli-h3-6", capitalCallId: "cac-cc-h3", investorId: investor6.id, amount: 672_000, status: "Funded", paidDate: new Date("2024-07-15") },
      // cc-h4 (entity4, $8.5M) — entity4 investors: investor1 40%, investor4 35%, investor6 25%
      { id: "cac-ccli-h4-1", capitalCallId: "cac-cc-h4", investorId: investor1.id, amount: 3_400_000, status: "Funded", paidDate: new Date("2025-09-01") },
      { id: "cac-ccli-h4-4", capitalCallId: "cac-cc-h4", investorId: investor4.id, amount: 2_975_000, status: "Funded", paidDate: new Date("2025-09-01") },
      { id: "cac-ccli-h4-6", capitalCallId: "cac-cc-h4", investorId: investor6.id, amount: 2_125_000, status: "Funded", paidDate: new Date("2025-09-01") },
      // cc-h5 (entity2, $18M)
      { id: "cac-ccli-h5-1", capitalCallId: "cac-cc-h5", investorId: investor1.id, amount: 9_000_000, status: "Funded", paidDate: new Date("2025-10-05") },
      { id: "cac-ccli-h5-2", capitalCallId: "cac-cc-h5", investorId: investor2.id, amount: 6_000_000, status: "Funded", paidDate: new Date("2025-10-05") },
      { id: "cac-ccli-h5-5", capitalCallId: "cac-cc-h5", investorId: investor5.id, amount: 3_000_000, status: "Funded", paidDate: new Date("2025-10-05") },
      // cc-h6 (entity8, $6M)
      { id: "cac-ccli-h6-3", capitalCallId: "cac-cc-h6", investorId: investor3.id, amount: 2_400_000, status: "Funded", paidDate: new Date("2025-10-15") },
      { id: "cac-ccli-h6-6", capitalCallId: "cac-cc-h6", investorId: investor6.id, amount: 3_600_000, status: "Funded", paidDate: new Date("2025-10-15") },
      // cc-h7 (entity1, $4M)
      { id: "cac-ccli-h7-1", capitalCallId: "cac-cc-h7", investorId: investor1.id, amount: 1_540_000, status: "Funded", paidDate: new Date("2025-11-01") },
      { id: "cac-ccli-h7-3", capitalCallId: "cac-cc-h7", investorId: investor3.id, amount: 768_000, status: "Funded", paidDate: new Date("2025-11-01") },
      { id: "cac-ccli-h7-4", capitalCallId: "cac-cc-h7", investorId: investor4.id, amount: 924_000, status: "Funded", paidDate: new Date("2025-11-01") },
      { id: "cac-ccli-h7-6", capitalCallId: "cac-cc-h7", investorId: investor6.id, amount: 768_000, status: "Funded", paidDate: new Date("2025-11-01") },
      // cc-h8 (entity5, $15M) — entity5 investors: investor1 60%, investor2 40%
      { id: "cac-ccli-h8-1", capitalCallId: "cac-cc-h8", investorId: investor1.id, amount: 9_000_000, status: "Funded", paidDate: new Date("2025-11-15") },
      { id: "cac-ccli-h8-2", capitalCallId: "cac-cc-h8", investorId: investor2.id, amount: 6_000_000, status: "Funded", paidDate: new Date("2025-11-15") },
      // cc-h9 (entity2, $7.5M)
      { id: "cac-ccli-h9-1", capitalCallId: "cac-cc-h9", investorId: investor1.id, amount: 3_750_000, status: "Funded", paidDate: new Date("2025-12-15") },
      { id: "cac-ccli-h9-2", capitalCallId: "cac-cc-h9", investorId: investor2.id, amount: 2_500_000, status: "Funded", paidDate: new Date("2025-12-15") },
      { id: "cac-ccli-h9-5", capitalCallId: "cac-cc-h9", investorId: investor5.id, amount: 1_250_000, status: "Funded", paidDate: new Date("2025-12-15") },
      // cc-h10 (entity9, $20M)
      { id: "cac-ccli-h10-1", capitalCallId: "cac-cc-h10", investorId: investor1.id, amount: 10_000_000, status: "Funded", paidDate: new Date("2026-01-25") },
      { id: "cac-ccli-h10-2", capitalCallId: "cac-cc-h10", investorId: investor2.id, amount: 6_000_000, status: "Funded", paidDate: new Date("2026-01-25") },
      { id: "cac-ccli-h10-5", capitalCallId: "cac-cc-h10", investorId: investor5.id, amount: 4_000_000, status: "Funded", paidDate: new Date("2026-01-25") },
      // cc-h11 (entity1, $3M — partially funded)
      { id: "cac-ccli-h11-1", capitalCallId: "cac-cc-h11", investorId: investor1.id, amount: 1_155_000, status: "Funded", paidDate: new Date("2026-02-10") },
      { id: "cac-ccli-h11-3", capitalCallId: "cac-cc-h11", investorId: investor3.id, amount: 576_000, status: "Pending" },
      { id: "cac-ccli-h11-4", capitalCallId: "cac-cc-h11", investorId: investor4.id, amount: 693_000, status: "Pending" },
      { id: "cac-ccli-h11-6", capitalCallId: "cac-cc-h11", investorId: investor6.id, amount: 576_000, status: "Pending" },
    ],
  });

  // ============================================================
  // DISTRIBUTION LINE ITEMS
  // ============================================================
  console.log("Creating distribution line items...");

  await prisma.distributionLineItem.createMany({
    data: [
      // dist-1 (entity1, $58M gross, $54M net)
      { id: "cac-dli-1-1", distributionId: "cac-dist-1", investorId: investor1.id, grossAmount: 22_330_000, returnOfCapital: 7_700_000, income: 2_002_000, longTermGain: 11_088_000, carriedInterest: 1_540_000, netAmount: 20_790_000 },
      { id: "cac-dli-1-3", distributionId: "cac-dist-1", investorId: investor3.id, grossAmount: 11_136_000, returnOfCapital: 3_840_000, income: 998_400, longTermGain: 5_529_600, carriedInterest: 768_000, netAmount: 10_368_000 },
      { id: "cac-dli-1-4", distributionId: "cac-dist-1", investorId: investor4.id, grossAmount: 13_398_000, returnOfCapital: 4_620_000, income: 1_201_200, longTermGain: 6_652_800, carriedInterest: 924_000, netAmount: 12_474_000 },
      { id: "cac-dli-1-6", distributionId: "cac-dist-1", investorId: investor6.id, grossAmount: 11_136_000, returnOfCapital: 3_840_000, income: 998_400, longTermGain: 5_529_600, carriedInterest: 768_000, netAmount: 10_368_000 },
      // dist-2 (entity1, $12M gross/net)
      { id: "cac-dli-2-1", distributionId: "cac-dist-2", investorId: investor1.id, grossAmount: 4_620_000, returnOfCapital: 0, income: 4_620_000, longTermGain: 0, carriedInterest: 0, netAmount: 4_620_000 },
      { id: "cac-dli-2-3", distributionId: "cac-dist-2", investorId: investor3.id, grossAmount: 2_304_000, returnOfCapital: 0, income: 2_304_000, longTermGain: 0, carriedInterest: 0, netAmount: 2_304_000 },
      { id: "cac-dli-2-4", distributionId: "cac-dist-2", investorId: investor4.id, grossAmount: 2_772_000, returnOfCapital: 0, income: 2_772_000, longTermGain: 0, carriedInterest: 0, netAmount: 2_772_000 },
      { id: "cac-dli-2-6", distributionId: "cac-dist-2", investorId: investor6.id, grossAmount: 2_304_000, returnOfCapital: 0, income: 2_304_000, longTermGain: 0, carriedInterest: 0, netAmount: 2_304_000 },
      // dist-4 (entity1, $1.2M gross/net)
      { id: "cac-dli-4-1", distributionId: "cac-dist-4", investorId: investor1.id, grossAmount: 462_000, returnOfCapital: 0, income: 462_000, longTermGain: 0, carriedInterest: 0, netAmount: 462_000 },
      { id: "cac-dli-4-3", distributionId: "cac-dist-4", investorId: investor3.id, grossAmount: 230_400, returnOfCapital: 0, income: 230_400, longTermGain: 0, carriedInterest: 0, netAmount: 230_400 },
      { id: "cac-dli-4-4", distributionId: "cac-dist-4", investorId: investor4.id, grossAmount: 277_200, returnOfCapital: 0, income: 277_200, longTermGain: 0, carriedInterest: 0, netAmount: 277_200 },
      { id: "cac-dli-4-6", distributionId: "cac-dist-4", investorId: investor6.id, grossAmount: 230_400, returnOfCapital: 0, income: 230_400, longTermGain: 0, carriedInterest: 0, netAmount: 230_400 },
      // dist-3 (entity8, $2.1M gross/net)
      { id: "cac-dli-3-3", distributionId: "cac-dist-3", investorId: investor3.id, grossAmount: 840_000, returnOfCapital: 0, income: 840_000, longTermGain: 0, carriedInterest: 0, netAmount: 840_000 },
      { id: "cac-dli-3-6", distributionId: "cac-dist-3", investorId: investor6.id, grossAmount: 1_260_000, returnOfCapital: 0, income: 1_260_000, longTermGain: 0, carriedInterest: 0, netAmount: 1_260_000 },
      // dist-5 (entity1, $5M gross, $4.7M net, DRAFT)
      { id: "cac-dli-5-1", distributionId: "cac-dist-5", investorId: investor1.id, grossAmount: 1_925_000, returnOfCapital: 1_347_500, income: 0, longTermGain: 462_000, carriedInterest: 115_500, netAmount: 1_809_500 },
      { id: "cac-dli-5-3", distributionId: "cac-dist-5", investorId: investor3.id, grossAmount: 960_000, returnOfCapital: 672_000, income: 0, longTermGain: 230_400, carriedInterest: 57_600, netAmount: 902_400 },
      { id: "cac-dli-5-4", distributionId: "cac-dist-5", investorId: investor4.id, grossAmount: 1_155_000, returnOfCapital: 808_500, income: 0, longTermGain: 277_200, carriedInterest: 69_300, netAmount: 1_085_700 },
      { id: "cac-dli-5-6", distributionId: "cac-dist-5", investorId: investor6.id, grossAmount: 960_000, returnOfCapital: 672_000, income: 0, longTermGain: 230_400, carriedInterest: 57_600, netAmount: 902_400 },
      // dist-6 (entity2, $3M gross/net, APPROVED)
      { id: "cac-dli-6-1", distributionId: "cac-dist-6", investorId: investor1.id, grossAmount: 1_500_000, returnOfCapital: 0, income: 1_500_000, longTermGain: 0, carriedInterest: 0, netAmount: 1_500_000 },
      { id: "cac-dli-6-2", distributionId: "cac-dist-6", investorId: investor2.id, grossAmount: 1_000_000, returnOfCapital: 0, income: 1_000_000, longTermGain: 0, carriedInterest: 0, netAmount: 1_000_000 },
      { id: "cac-dli-6-5", distributionId: "cac-dist-6", investorId: investor5.id, grossAmount: 500_000, returnOfCapital: 0, income: 500_000, longTermGain: 0, carriedInterest: 0, netAmount: 500_000 },
    ],
  });

  // ============================================================
  // MEETINGS (8)
  // ============================================================
  console.log("Creating meetings...");

  const meetingsData = [
    { id: "cac-meeting-1", date: "2025-02-28", title: "Apex Manufacturing \u2014 IC Presentation", type: "IC Meeting", assetId: null as string | null, dealId: deal1.id as string | null, entityId: null as string | null, source: "FIREFLIES" as const, transcript: true, items: 3, decisions: ["Approved pending legal DD"] },
    { id: "cac-meeting-2", date: "2025-02-25", title: "Q4 Portfolio Review \u2014 NovaTech AI", type: "Portfolio Review", assetId: asset1.id, dealId: null as string | null, entityId: entity1.id as string | null, source: "FIREFLIES" as const, transcript: true, items: 2, decisions: ["Hold position, revisit exit Q3"] },
    { id: "cac-meeting-3", date: "2025-02-20", title: "Sequoia Fund XVI \u2014 Annual Meeting", type: "GP Review", assetId: asset5.id, dealId: null as string | null, entityId: entity3.id as string | null, source: "FIREFLIES" as const, transcript: true, items: 1, decisions: [] as string[] },
    { id: "cac-meeting-4", date: "2025-02-18", title: "Beacon Health \u2014 Mgmt Meeting", type: "DD Session", assetId: null as string | null, dealId: deal2.id as string | null, entityId: null as string | null, source: "FIREFLIES" as const, transcript: true, items: 4, decisions: [] as string[] },
    { id: "cac-meeting-5", date: "2025-02-15", title: "123 Industrial \u2014 Lease Renewal", type: "Portfolio Review", assetId: asset4.id, dealId: null as string | null, entityId: entity1.id as string | null, source: "MANUAL" as const, transcript: false, items: 2, decisions: ["Proceed 5yr renewal @ $18/sqft"] },
    { id: "cac-meeting-6", date: "2025-02-10", title: "Meridian Credit \u2014 Covenant Review", type: "Portfolio Review", assetId: asset3.id, dealId: null as string | null, entityId: entity8.id as string | null, source: "FIREFLIES" as const, transcript: true, items: 1, decisions: ["All covenants compliant"] },
    { id: "cac-meeting-7", date: "2025-02-05", title: "IC Discussion \u2014 Ridgeline Debt", type: "IC Meeting", assetId: null as string | null, dealId: deal4.id as string | null, entityId: entity8.id as string | null, source: "FIREFLIES" as const, transcript: true, items: 2, decisions: [] as string[] },
    { id: "cac-meeting-8", date: "2025-01-28", title: "LifeBridge Fund \u2014 Quarterly Update", type: "GP Review", assetId: asset11.id, dealId: null as string | null, entityId: entity2.id as string | null, source: "FIREFLIES" as const, transcript: true, items: 1, decisions: [] as string[] },
  ];

  for (const m of meetingsData) {
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
        assetId: m.assetId || null,
        dealId: m.dealId || null,
        entityId: m.entityId || null,
      },
    });
  }

  // ============================================================
  // TASKS (6)
  // ============================================================
  console.log("Creating tasks...");

  const tasksData = [
    // NovaTech AI tasks
    { id: "cac-task-1", title: "Update comp set for Q1 mark", status: "IN_PROGRESS" as const, due: "2025-03-20", userId: userSM.id, who: "SM", assetId: asset1.id },
    { id: "cac-task-2", title: "Board deck review \u2014 March", status: "TODO" as const, due: "2025-03-10", userId: userJK.id, who: "JK", assetId: asset1.id },
    { id: "cac-task-3", title: "Exit scenario analysis", status: "TODO" as const, due: "2025-04-01", userId: userAL.id, who: "AL", assetId: asset1.id },
    // Meridian Credit task
    { id: "cac-task-4", title: "Q1 covenant compliance check", status: "TODO" as const, due: "2025-04-15", userId: userSM.id, who: "CFO", assetId: asset3.id },
    // 123 Industrial task
    { id: "cac-task-5", title: "Lease renewal negotiation \u2014 Acme", status: "IN_PROGRESS" as const, due: "2025-06-01", userId: userJK.id, who: "JK", assetId: asset4.id },
    // Sequoia task
    { id: "cac-task-6", title: "Review annual meeting notes", status: "TODO" as const, due: "2025-04-15", userId: userAL.id, who: "CIO", assetId: asset5.id },
  ];

  for (const t of tasksData) {
    await prisma.task.create({
      data: {
        id: t.id,
        title: t.title,
        status: t.status,
        assigneeId: t.userId,
        assigneeName: t.who,
        dueDate: new Date(t.due),
        assetId: t.assetId,
      },
    });
  }

  // ============================================================
  // DOCUMENTS (7)
  // ============================================================
  console.log("Creating documents...");

  const docsData = [
    // NovaTech AI docs
    { id: "cac-doc-1", name: "Board Deck Q4 2024", category: "BOARD" as const, date: "2025-01-18", assetId: asset1.id, entityId: entity1.id as string | undefined },
    { id: "cac-doc-2", name: "Audited Financials FY2024", category: "FINANCIAL" as const, date: "2025-02-01", assetId: asset1.id, entityId: entity1.id as string | undefined },
    { id: "cac-doc-3", name: "Series B Purchase Agreement", category: "LEGAL" as const, date: "2020-03-15", assetId: asset1.id, entityId: entity1.id as string | undefined },
    { id: "cac-doc-4", name: "Cap Table Jan 2025", category: "GOVERNANCE" as const, date: "2025-01-30", assetId: asset1.id, entityId: entity1.id as string | undefined },
    // 123 Industrial Blvd docs
    { id: "cac-doc-5", name: "Appraisal Report 2024", category: "VALUATION" as const, date: "2024-06-01", assetId: asset4.id, entityId: entity1.id as string | undefined },
    { id: "cac-doc-6", name: "Lease \u2014 Acme Distribution", category: "LEGAL" as const, date: "2021-01-15", assetId: asset4.id, entityId: undefined as string | undefined },
    // Sequoia doc
    { id: "cac-doc-7", name: "Q4 2024 LP Statement", category: "STATEMENT" as const, date: "2025-02-15", assetId: asset5.id, entityId: entity3.id as string | undefined },
  ];

  for (const d of docsData) {
    await prisma.document.create({
      data: {
        id: d.id,
        name: d.name,
        category: d.category,
        uploadDate: new Date(d.date),
        assetId: d.assetId,
        entityId: d.entityId,
      },
    });
  }

  // Deal-linked documents for screening deals
  await prisma.document.createMany({
    data: [
      { id: "cac-doc-deal-3a", name: "CIM - UrbanNest PropTech.pdf", category: "FINANCIAL", dealId: "cac-deal-3", entityId: "cac-entity-3", uploadDate: new Date("2026-03-01"), fileSize: 2400000 },
      { id: "cac-doc-deal-3b", name: "Financial Model v1.xlsx", category: "FINANCIAL", dealId: "cac-deal-3", entityId: "cac-entity-3", uploadDate: new Date("2026-03-02"), fileSize: 850000 },
      { id: "cac-doc-deal-3c", name: "Pitch Deck.pdf", category: "OTHER", dealId: "cac-deal-3", entityId: "cac-entity-3", uploadDate: new Date("2026-03-01"), fileSize: 5200000 },
      { id: "cac-doc-deal-5a", name: "Nordic Wind Fund III PPM.pdf", category: "FINANCIAL", dealId: "cac-deal-5", entityId: "cac-entity-3", uploadDate: new Date("2026-02-20"), fileSize: 3100000 },
      { id: "cac-doc-deal-5b", name: "Track Record Summary.pdf", category: "REPORT", dealId: "cac-deal-5", entityId: "cac-entity-3", uploadDate: new Date("2026-02-20"), fileSize: 1200000 },
    ],
  });
  console.log("✓ Deal-linked documents seeded");

  // ============================================================
  // WATERFALL TEMPLATES (5 templates with tiers)
  // ============================================================
  console.log("Creating waterfall templates...");

  // Template 1: Standard European 8/20 (Fund I, Fund II)
  const wf1 = await prisma.waterfallTemplate.create({
    data: {
      id: "cac-wf-1",
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
      { id: "cac-wft-1-1", templateId: wf1.id, tierOrder: 1, name: "Income Distribution", description: "All income (interest, dividends, rental) \u2192 100% to LPs", splitLP: 100, splitGP: 0, appliesTo: "Income Only" },
      { id: "cac-wft-1-2", templateId: wf1.id, tierOrder: 2, name: "Return of Capital", description: "All contributed capital returned to LPs", splitLP: 100, splitGP: 0, appliesTo: "Capital" },
      { id: "cac-wft-1-3", templateId: wf1.id, tierOrder: 3, name: "Preferred Return", description: "8% preferred return (annual compounding) on contributed capital", splitLP: 100, splitGP: 0, hurdleRate: 8, appliesTo: "Capital Gains" },
      { id: "cac-wft-1-4", templateId: wf1.id, tierOrder: 4, name: "GP Catch-Up", description: "100% to GP until GP has received 20% of total profit", splitLP: 0, splitGP: 100, appliesTo: "Capital Gains" },
      { id: "cac-wft-1-5", templateId: wf1.id, tierOrder: 5, name: "Carried Interest", description: "Remaining profits split 80/20", splitLP: 80, splitGP: 20, appliesTo: "Capital Gains" },
    ],
  });

  // Link entities to template 1
  await prisma.entity.update({ where: { id: entity1.id }, data: { waterfallTemplateId: wf1.id } });
  await prisma.entity.update({ where: { id: entity2.id }, data: { waterfallTemplateId: wf1.id } });

  // Template 2: Income-First + Reduced Carry (Fund III)
  const wf2 = await prisma.waterfallTemplate.create({
    data: {
      id: "cac-wf-2",
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
      { id: "cac-wft-2-1", templateId: wf2.id, tierOrder: 1, name: "Income Distribution", description: "100% of income to LPs", splitLP: 100, splitGP: 0, appliesTo: "Income Only" },
      { id: "cac-wft-2-2", templateId: wf2.id, tierOrder: 2, name: "Return of Capital", description: "Return all contributed capital to LPs", splitLP: 100, splitGP: 0, appliesTo: "Capital" },
      { id: "cac-wft-2-3", templateId: wf2.id, tierOrder: 3, name: "Preferred Return", description: "6% preferred return on contributed capital", splitLP: 100, splitGP: 0, hurdleRate: 6, appliesTo: "Capital Gains" },
      { id: "cac-wft-2-4", templateId: wf2.id, tierOrder: 4, name: "Profit Split", description: "Remaining profits split 85/15", splitLP: 85, splitGP: 15, appliesTo: "Capital Gains" },
    ],
  });

  await prisma.entity.update({ where: { id: entity3.id }, data: { waterfallTemplateId: wf2.id } });

  // Template 3: No Fee / Flat Split (Growth Fund)
  const wf3 = await prisma.waterfallTemplate.create({
    data: {
      id: "cac-wf-3",
      name: "No Fee / Flat Split",
      description: "ROC \u2192 90/10 Profit Split (no pref, no catch-up, no mgmt fee)",
      carryPercent: 0.10,
    },
  });

  await prisma.waterfallTier.createMany({
    data: [
      { id: "cac-wft-3-1", templateId: wf3.id, tierOrder: 1, name: "Return of Capital", description: "Return all contributed capital to LPs", splitLP: 100, splitGP: 0, appliesTo: "Capital" },
      { id: "cac-wft-3-2", templateId: wf3.id, tierOrder: 2, name: "Profit Split", description: "90/10 profit split, no preferred return or catch-up", splitLP: 90, splitGP: 10, appliesTo: "All Profits" },
    ],
  });

  await prisma.entity.update({ where: { id: entity4.id }, data: { waterfallTemplateId: wf3.id } });

  // Template 4: Credit Fund Income Pass-Through (Credit Opp I)
  const wf4 = await prisma.waterfallTemplate.create({
    data: {
      id: "cac-wf-4",
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
      { id: "cac-wft-4-1", templateId: wf4.id, tierOrder: 1, name: "Interest Income Pass-Through", description: "100% interest income distributed to LPs pro rata", splitLP: 100, splitGP: 0, appliesTo: "Interest Income" },
      { id: "cac-wft-4-2", templateId: wf4.id, tierOrder: 2, name: "Return of Capital", description: "Return all contributed capital to LPs", splitLP: 100, splitGP: 0, appliesTo: "Capital" },
      { id: "cac-wft-4-3", templateId: wf4.id, tierOrder: 3, name: "Preferred Return", description: "7% preferred return on contributed capital", splitLP: 100, splitGP: 0, hurdleRate: 7, appliesTo: "Capital Gains" },
      { id: "cac-wft-4-4", templateId: wf4.id, tierOrder: 4, name: "Profit Split", description: "Remaining profits split 80/20", splitLP: 80, splitGP: 20, appliesTo: "Capital Gains" },
    ],
  });

  await prisma.entity.update({ where: { id: entity8.id }, data: { waterfallTemplateId: wf4.id } });

  // Template 5: Sidecar Pari Passu (Sidecar A, Sidecar B, Co-Invest SPV)
  const wf5 = await prisma.waterfallTemplate.create({
    data: {
      id: "cac-wf-5",
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
      { id: "cac-wft-5-1", templateId: wf5.id, tierOrder: 1, name: "Income Distribution", description: "Same as parent fund \u2014 100% income to LPs", splitLP: 100, splitGP: 0, appliesTo: "Income Only" },
      { id: "cac-wft-5-2", templateId: wf5.id, tierOrder: 2, name: "Return of Capital", description: "Same as parent fund \u2014 return all capital to LPs", splitLP: 100, splitGP: 0, appliesTo: "Capital" },
      { id: "cac-wft-5-3", templateId: wf5.id, tierOrder: 3, name: "Preferred Return", description: "Same as parent fund \u2014 8% pref", splitLP: 100, splitGP: 0, hurdleRate: 8, appliesTo: "Capital Gains" },
      { id: "cac-wft-5-4", templateId: wf5.id, tierOrder: 4, name: "GP Catch-Up", description: "Same as parent fund \u2014 100% to GP", splitLP: 0, splitGP: 100, appliesTo: "Capital Gains" },
      { id: "cac-wft-5-5", templateId: wf5.id, tierOrder: 5, name: "Carried Interest", description: "Same as parent fund \u2014 80/20 split", splitLP: 80, splitGP: 20, appliesTo: "Capital Gains" },
    ],
  });

  await prisma.entity.update({ where: { id: entity5.id }, data: { waterfallTemplateId: wf5.id } });
  await prisma.entity.update({ where: { id: entity6.id }, data: { waterfallTemplateId: wf5.id } });
  await prisma.entity.update({ where: { id: entity7.id }, data: { waterfallTemplateId: wf5.id } });

  // ============================================================
  // ACTIVITY EVENTS (Timeline for NovaTech AI)
  // ============================================================
  console.log("Creating activity events...");

  await prisma.activityEvent.createMany({
    data: [
      { id: "cac-ae-1", assetId: asset1.id, description: "Portfolio review meeting", eventDate: new Date("2025-02-25"), eventType: "meeting" },
      { id: "cac-ae-2", assetId: asset1.id, description: "Task: Review Q4 financials completed", eventDate: new Date("2025-02-15"), eventType: "task" },
      { id: "cac-ae-3", assetId: asset1.id, description: "Doc uploaded: Audited Financials", eventDate: new Date("2025-02-01"), eventType: "document" },
      { id: "cac-ae-4", assetId: asset1.id, description: "Valuation: $112.0M (2.49x)", eventDate: new Date("2024-12-31"), eventType: "valuation" },
      { id: "cac-ae-5", assetId: asset1.id, description: "Dividend received: $1.5M", eventDate: new Date("2024-12-15"), eventType: "income" },
    ],
  });

  // ============================================================
  // COMPANIES (counterparties, GPs, service providers)
  // ============================================================
  console.log("Creating companies...");

  const companies = [
    { id: "cac-company-1", firmId: firm.id, name: "Apex Industries Inc.", type: "COUNTERPARTY" as const, industry: "Industrials", website: "https://apexindustries.com" },
    { id: "cac-company-2", firmId: firm.id, name: "Beacon Healthcare Group", type: "COUNTERPARTY" as const, industry: "Healthcare", website: "https://beaconhealth.com" },
    { id: "cac-company-3", firmId: firm.id, name: "Ridgeline Properties LLC", type: "COUNTERPARTY" as const, industry: "Real Estate" },
    { id: "cac-company-4", firmId: firm.id, name: "Nordic Wind Capital", type: "GP" as const, industry: "Infrastructure" },
    { id: "cac-company-5", firmId: firm.id, name: "UrbanNest Inc.", type: "COUNTERPARTY" as const, industry: "Real Estate / PropTech" },
    { id: "cac-company-6", firmId: firm.id, name: "Blackstone", type: "GP" as const, industry: "Financial Services", website: "https://blackstone.com" },
    { id: "cac-company-7", firmId: firm.id, name: "Acme Capital", type: "GP" as const, industry: "Financial Services" },
    { id: "cac-company-8", firmId: firm.id, name: "KKR Credit", type: "GP" as const, industry: "Financial Services", website: "https://kkr.com" },
    { id: "cac-company-9", firmId: firm.id, name: "Goldman Sachs Asset Management", type: "SERVICE_PROVIDER" as const, industry: "Financial Services" },
    { id: "cac-company-10", firmId: firm.id, name: "Latham & Watkins LLP", type: "SERVICE_PROVIDER" as const, industry: "Legal" },
  ];

  for (const c of companies) {
    await prisma.company.create({ data: c });
  }

  // LP Investor Companies
  const lpCompanies = [
    { id: "cac-company-calpers", firmId: firm.id, name: "California Public Employees' Retirement System", type: "LP" as const, industry: "Public Pension" },
    { id: "cac-company-harvard", firmId: firm.id, name: "Harvard Management Company", type: "LP" as const, industry: "Endowment" },
    { id: "cac-company-wellington", firmId: firm.id, name: "Wellington Family Office", type: "LP" as const, industry: "Family Office" },
    { id: "cac-company-meridian", firmId: firm.id, name: "Meridian Partners", type: "LP" as const, industry: "Fund of Funds" },
    { id: "cac-company-pacificrim", firmId: firm.id, name: "Pacific Rim Sovereign Wealth Fund", type: "LP" as const, industry: "Sovereign Wealth" },
    { id: "cac-company-greenfield", firmId: firm.id, name: "Greenfield Insurance Group", type: "LP" as const, industry: "Insurance" },
  ];

  for (const c of lpCompanies) {
    await prisma.company.create({ data: c });
  }
  console.log("Companies seeded");

  // Link investors to their LP companies
  await prisma.investor.update({ where: { id: "cac-investor-1" }, data: { companyId: "cac-company-calpers" } });
  await prisma.investor.update({ where: { id: "cac-investor-2" }, data: { companyId: "cac-company-harvard" } });
  await prisma.investor.update({ where: { id: "cac-investor-3" }, data: { companyId: "cac-company-wellington" } });
  await prisma.investor.update({ where: { id: "cac-investor-4" }, data: { companyId: "cac-company-meridian" } });
  await prisma.investor.update({ where: { id: "cac-investor-5" }, data: { companyId: "cac-company-pacificrim" } });
  await prisma.investor.update({ where: { id: "cac-investor-6" }, data: { companyId: "cac-company-greenfield" } });
  console.log("Investors linked to companies");

  // ============================================================
  // CONTACTS (counterparty + service provider contacts)
  // ============================================================
  console.log("Creating contacts...");

  const contacts = [
    { id: "cac-contact-1", firmId: firm.id, firstName: "Robert", lastName: "Chen", email: "rchen@apexindustries.com", title: "CEO", type: "EXTERNAL" as const, companyId: "cac-company-1" },
    { id: "cac-contact-2", firmId: firm.id, firstName: "Lisa", lastName: "Park", email: "lpark@beaconhealth.com", title: "CFO", type: "EXTERNAL" as const, companyId: "cac-company-2" },
    { id: "cac-contact-3", firmId: firm.id, firstName: "David", lastName: "Morse", email: "dmorse@ridgeline.com", title: "Managing Partner", type: "EXTERNAL" as const, companyId: "cac-company-3" },
    { id: "cac-contact-4", firmId: firm.id, firstName: "Erik", lastName: "Johansson", email: "erik@nordicwind.com", title: "Partner", type: "EXTERNAL" as const, companyId: "cac-company-4" },
    { id: "cac-contact-5", firmId: firm.id, firstName: "Maria", lastName: "Santos", email: "msantos@urbanest.com", title: "Founder & CEO", type: "EXTERNAL" as const, companyId: "cac-company-5" },
    { id: "cac-contact-6", firmId: firm.id, firstName: "Tom", lastName: "Bradley", email: "tbradley@latham.com", title: "Partner", type: "EXTERNAL" as const, companyId: "cac-company-10" },
  ];

  for (const c of contacts) {
    await prisma.contact.create({ data: c });
  }

  // LP Investor Contacts
  const lpContacts = [
    { id: "cac-contact-calpers-mc", firmId: firm.id, firstName: "Michael", lastName: "Chen", email: "michael.chen@calpers.ca.gov", title: "Director of Private Equity", type: "EXTERNAL" as const, companyId: "cac-company-calpers" },
    { id: "cac-contact-calpers-sw", firmId: firm.id, firstName: "Sarah", lastName: "Wang", email: "sarah.wang@calpers.ca.gov", title: "Investment Analyst", type: "EXTERNAL" as const, companyId: "cac-company-calpers" },
    { id: "cac-contact-harvard-dm", firmId: firm.id, firstName: "David", lastName: "Morrison", email: "d.morrison@hmc.harvard.edu", title: "Portfolio Manager", type: "EXTERNAL" as const, companyId: "cac-company-harvard" },
    { id: "cac-contact-wellington-tw", firmId: firm.id, firstName: "Tom", lastName: "Wellington", email: "tom@wellingtonfamily.com", title: "Principal", type: "EXTERNAL" as const, companyId: "cac-company-wellington" },
    { id: "cac-contact-meridian-ra", firmId: firm.id, firstName: "Rachel", lastName: "Adams", email: "rachel@meridianpartners.com", title: "Managing Director", type: "EXTERNAL" as const, companyId: "cac-company-meridian" },
    { id: "cac-contact-pacificrim-yk", firmId: firm.id, firstName: "Yuki", lastName: "Tanaka", email: "y.tanaka@pacificrimsov.gov", title: "Head of Alternatives", type: "EXTERNAL" as const, companyId: "cac-company-pacificrim" },
    { id: "cac-contact-greenfield-jb", firmId: firm.id, firstName: "John", lastName: "Barrett", email: "jbarrett@greenfieldins.com", title: "Chief Investment Officer", type: "EXTERNAL" as const, companyId: "cac-company-greenfield" },
  ];

  for (const c of lpContacts) {
    await prisma.contact.create({ data: c });
  }
  console.log("Contacts seeded");

  // ============================================================
  // SAMPLE NOTIFICATIONS (for gpAdmin user)
  // ============================================================
  console.log("Creating sample notifications...");

  await prisma.notification.createMany({
    data: [
      { userId: userJK.id, type: "STAGE_CHANGE", subject: "Apex Manufacturing advanced to IC Review", body: "Deal has moved from Due Diligence to IC Review stage.", isRead: true, readAt: new Date("2026-02-27"), createdAt: new Date("2026-02-27") },
      { userId: userJK.id, type: "IC_VOTE", subject: `${userSM.name} voted APPROVE on Apex Manufacturing`, body: "Agree, but want customer concentration addressed in closing docs.", isRead: true, readAt: new Date("2026-02-28"), createdAt: new Date("2026-02-28") },
      { userId: userJK.id, type: "DOCUMENT_UPLOAD", subject: "New document uploaded to Beacon Health", body: "Patient volume data and payer mix analysis uploaded.", isRead: false, createdAt: new Date("2026-02-20") },
      { userId: userJK.id, type: "STAGE_CHANGE", subject: "Ridgeline Senior Debt advanced to Due Diligence", body: "AI screening completed with score 88/100. Deal moved to Due Diligence.", isRead: false, createdAt: new Date("2026-02-08") },
      { userId: userJK.id, type: "TASK_ASSIGNED", subject: "New task assigned: Review Apex QoE report", body: "You've been assigned to review the Quality of Earnings report for Apex Manufacturing.", isRead: false, createdAt: new Date("2026-02-12") },
      { userId: userSM.id, type: "STAGE_CHANGE", subject: "Beacon Health advanced to Due Diligence", body: "AI screening completed with score 74/100.", isRead: false, createdAt: new Date("2026-02-10") },
    ],
  });
  console.log("Notifications seeded");

  // ============================================================
  // AI CONFIGURATION
  // ============================================================
  console.log("Creating AI configuration...");

  await prisma.aIConfiguration.create({
    data: {
      id: "cac-ai-config-1",
      firmId: firm.id,
      provider: "openai",
      model: "gpt-4o",
      systemPrompt: `You are an expert investment analyst for a family office GP. Analyze the provided deal documents and produce a structured screening report.\n\nEvaluate:\n1. Business quality and competitive positioning\n2. Financial health and growth trajectory\n3. Management team strength\n4. Deal structure and terms\n5. Key risks and mitigants\n\nProvide a score (0-100) and recommendation: PROCEED_TO_DD, WATCHLIST, or PASS.`,
      thresholdScore: 70,
      maxDocuments: 10,
      processingMode: "async",
    },
  });
  console.log("AI configuration seeded");

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
  console.log("AI prompt templates seeded");

  // ============================================================
  // TRANSACTIONS (ledger entries for capital calls + distributions)
  // ============================================================
  console.log("Creating transactions...");

  await prisma.transaction.createMany({
    data: [
      // Capital call transactions
      { id: "cac-txn-1", entityId: entity2.id, transactionType: "CAPITAL_CALL", amount: 25_000_000, date: new Date("2025-02-15"), description: "CC-007 — CloudBase follow-on", referenceId: "cac-cc-1", referenceType: "CapitalCall" },
      { id: "cac-txn-2", entityId: entity2.id, transactionType: "CAPITAL_CALL", amount: 15_000_000, date: new Date("2025-02-28"), description: "CC-008 — Mgmt fees Q1 + Expenses", referenceId: "cac-cc-2", referenceType: "CapitalCall" },
      { id: "cac-txn-3", entityId: entity8.id, transactionType: "CAPITAL_CALL", amount: 10_000_000, date: new Date("2025-03-01"), description: "CC-003 — New credit deployment", referenceId: "cac-cc-3", referenceType: "CapitalCall" },
      { id: "cac-txn-4", entityId: entity3.id, transactionType: "CAPITAL_CALL", amount: 8_000_000, date: new Date("2025-01-15"), description: "CC-005 — Sequoia pass-through", referenceId: "cac-cc-4", referenceType: "CapitalCall" },
      // Distribution transactions
      { id: "cac-txn-5", entityId: entity1.id, transactionType: "DISTRIBUTION", amount: 58_000_000, date: new Date("2025-01-31"), description: "Exit — SolarGrid Energy", referenceId: "cac-dist-1", referenceType: "DistributionEvent" },
      { id: "cac-txn-6", entityId: entity1.id, transactionType: "DISTRIBUTION", amount: 12_000_000, date: new Date("2024-09-30"), description: "Dividend — NovaTech AI", referenceId: "cac-dist-2", referenceType: "DistributionEvent" },
      { id: "cac-txn-7", entityId: entity8.id, transactionType: "DISTRIBUTION", amount: 2_100_000, date: new Date("2024-12-31"), description: "Interest income Q4", referenceId: "cac-dist-3", referenceType: "DistributionEvent" },
      { id: "cac-txn-8", entityId: entity1.id, transactionType: "DISTRIBUTION", amount: 1_200_000, date: new Date("2024-06-30"), description: "Dividend — NovaTech AI", referenceId: "cac-dist-4", referenceType: "DistributionEvent" },
      // Additional income/fee transactions
      { id: "cac-txn-9", entityId: entity1.id, transactionType: "INCOME", amount: 1_520_000, date: new Date("2024-12-15"), description: "NovaTech AI — Q4 dividend", isPrincipal: false },
      { id: "cac-txn-10", entityId: entity3.id, transactionType: "FEE", amount: 375_000, date: new Date("2025-01-01"), description: "Q1 2025 management fee", isPrincipal: false },
      { id: "cac-txn-11", entityId: entity4.id, transactionType: "INCOME", amount: 410_000, date: new Date("2024-12-31"), description: "123 Industrial — Q4 rental NOI", isPrincipal: false },
      { id: "cac-txn-12", entityId: entity2.id, transactionType: "FEE", amount: 625_000, date: new Date("2025-01-01"), description: "Q1 2025 management fee", isPrincipal: false },
      { id: "cac-txn-13", entityId: entity1.id, transactionType: "EXIT", amount: 58_000_000, date: new Date("2025-01-31"), description: "SolarGrid Energy — full exit proceeds", isPrincipal: true, referenceId: "cac-asset-7", referenceType: "Asset" },
      { id: "cac-txn-14", entityId: entity2.id, transactionType: "INVESTMENT", amount: 8_000_000, date: new Date("2024-11-01"), description: "CloudBase Systems — follow-on Series C", isPrincipal: true, referenceId: "cac-asset-8", referenceType: "Asset" },
      // Early deployment transactions
      { id: "cac-txn-e1", entityId: entity1.id, transactionType: "CAPITAL_CALL", amount: 25_000_000, date: new Date("2019-09-01"), description: "CC-E01 — Initial deployment", referenceId: "cac-cc-e1", referenceType: "CapitalCall" },
      { id: "cac-txn-e2", entityId: entity1.id, transactionType: "CAPITAL_CALL", amount: 30_000_000, date: new Date("2020-03-01"), description: "CC-E02 — NovaTech Series B", referenceId: "cac-cc-e2", referenceType: "CapitalCall" },
      { id: "cac-txn-e3", entityId: entity1.id, transactionType: "CAPITAL_CALL", amount: 35_000_000, date: new Date("2021-01-15"), description: "CC-E03 — Helix + 123 Industrial", referenceId: "cac-cc-e3", referenceType: "CapitalCall" },
      { id: "cac-txn-e4", entityId: entity1.id, transactionType: "CAPITAL_CALL", amount: 15_000_000, date: new Date("2022-06-01"), description: "CC-E04 — Follow-ons + fees", referenceId: "cac-cc-e4", referenceType: "CapitalCall" },
      { id: "cac-txn-e5", entityId: entity2.id, transactionType: "CAPITAL_CALL", amount: 40_000_000, date: new Date("2022-09-01"), description: "CC-E05 — Fund II initial deployment", referenceId: "cac-cc-e5", referenceType: "CapitalCall" },
      { id: "cac-txn-e6", entityId: entity2.id, transactionType: "CAPITAL_CALL", amount: 35_000_000, date: new Date("2023-03-01"), description: "CC-E06 — Fund II follow-on", referenceId: "cac-cc-e6", referenceType: "CapitalCall" },
      { id: "cac-txn-e7", entityId: entity3.id, transactionType: "CAPITAL_CALL", amount: 30_000_000, date: new Date("2023-09-01"), description: "CC-E07 — Sequoia + Blackstone", referenceId: "cac-cc-e7", referenceType: "CapitalCall" },
      { id: "cac-txn-e8", entityId: entity4.id, transactionType: "CAPITAL_CALL", amount: 10_000_000, date: new Date("2024-06-01"), description: "CC-E08 — Growth Fund initial", referenceId: "cac-cc-e8", referenceType: "CapitalCall" },
      // ── Historical capital call transactions ──
      { id: "cac-txn-h1", entityId: entity1.id, transactionType: "CAPITAL_CALL", amount: 5_000_000, date: new Date("2024-04-01"), description: "CC-001 — Q2 mgmt fees", referenceId: "cac-cc-h1", referenceType: "CapitalCall" },
      { id: "cac-txn-h2", entityId: entity2.id, transactionType: "CAPITAL_CALL", amount: 12_000_000, date: new Date("2024-06-10"), description: "CC-004 — Helix follow-on", referenceId: "cac-cc-h2", referenceType: "CapitalCall" },
      { id: "cac-txn-h3", entityId: entity1.id, transactionType: "CAPITAL_CALL", amount: 3_500_000, date: new Date("2024-07-01"), description: "CC-002 — Q3 mgmt fees", referenceId: "cac-cc-h3", referenceType: "CapitalCall" },
      { id: "cac-txn-h4", entityId: entity4.id, transactionType: "CAPITAL_CALL", amount: 8_500_000, date: new Date("2025-08-15"), description: "CC-RE-01 — 123 Industrial TI", referenceId: "cac-cc-h4", referenceType: "CapitalCall" },
      { id: "cac-txn-h5", entityId: entity2.id, transactionType: "CAPITAL_CALL", amount: 18_000_000, date: new Date("2025-09-20"), description: "CC-006 — UrbanNest investment", referenceId: "cac-cc-h5", referenceType: "CapitalCall" },
      { id: "cac-txn-h6", entityId: entity8.id, transactionType: "CAPITAL_CALL", amount: 6_000_000, date: new Date("2025-10-01"), description: "CC-CR-01 — Logistics facility", referenceId: "cac-cc-h6", referenceType: "CapitalCall" },
      { id: "cac-txn-h7", entityId: entity1.id, transactionType: "CAPITAL_CALL", amount: 4_000_000, date: new Date("2025-10-15"), description: "CC-003A — Q4 mgmt fees", referenceId: "cac-cc-h7", referenceType: "CapitalCall" },
      { id: "cac-txn-h8", entityId: entity5.id, transactionType: "CAPITAL_CALL", amount: 15_000_000, date: new Date("2025-11-01"), description: "CC-CI-01 — Co-Invest SPV", referenceId: "cac-cc-h8", referenceType: "CapitalCall" },
      { id: "cac-txn-h9", entityId: entity2.id, transactionType: "CAPITAL_CALL", amount: 7_500_000, date: new Date("2025-12-01"), description: "CC-009 — Cascade Timber bridge", referenceId: "cac-cc-h9", referenceType: "CapitalCall" },
      { id: "cac-txn-h10", entityId: entity9.id, transactionType: "CAPITAL_CALL", amount: 20_000_000, date: new Date("2026-01-10"), description: "CC-GF-01 — Growth Fund draw", referenceId: "cac-cc-h10", referenceType: "CapitalCall" },
      { id: "cac-txn-h11", entityId: entity1.id, transactionType: "CAPITAL_CALL", amount: 3_000_000, date: new Date("2026-02-01"), description: "CC-004A — Q1 2026 mgmt fees", referenceId: "cac-cc-h11", referenceType: "CapitalCall" },
      // ── Historical distribution transactions ──
      { id: "cac-txn-hd1", entityId: entity1.id, transactionType: "DISTRIBUTION", amount: 2_400_000, date: new Date("2025-04-30"), description: "NovaTech Q1 dividend", referenceId: "cac-dist-h1", referenceType: "DistributionEvent" },
      { id: "cac-txn-hd2", entityId: entity2.id, transactionType: "DISTRIBUTION", amount: 8_000_000, date: new Date("2025-05-15"), description: "Helix partial exit", referenceId: "cac-dist-h2", referenceType: "DistributionEvent" },
      { id: "cac-txn-hd3", entityId: entity8.id, transactionType: "DISTRIBUTION", amount: 1_800_000, date: new Date("2025-06-30"), description: "Q2 interest income", referenceId: "cac-dist-h3", referenceType: "DistributionEvent" },
      { id: "cac-txn-hd4", entityId: entity1.id, transactionType: "DISTRIBUTION", amount: 2_400_000, date: new Date("2025-07-31"), description: "NovaTech Q2 dividend", referenceId: "cac-dist-h4", referenceType: "DistributionEvent" },
      { id: "cac-txn-hd5", entityId: entity4.id, transactionType: "DISTRIBUTION", amount: 1_100_000, date: new Date("2025-08-15"), description: "123 Industrial Q2 NOI", referenceId: "cac-dist-h5", referenceType: "DistributionEvent" },
      { id: "cac-txn-hd6", entityId: entity2.id, transactionType: "DISTRIBUTION", amount: 3_500_000, date: new Date("2025-09-30"), description: "CloudBase Q3 dividend", referenceId: "cac-dist-h6", referenceType: "DistributionEvent" },
      { id: "cac-txn-hd7", entityId: entity8.id, transactionType: "DISTRIBUTION", amount: 2_200_000, date: new Date("2025-09-30"), description: "Q3 interest income", referenceId: "cac-dist-h7", referenceType: "DistributionEvent" },
      { id: "cac-txn-hd8", entityId: entity1.id, transactionType: "DISTRIBUTION", amount: 2_400_000, date: new Date("2025-10-31"), description: "NovaTech Q3 dividend", referenceId: "cac-dist-h8", referenceType: "DistributionEvent" },
      { id: "cac-txn-hd9", entityId: entity4.id, transactionType: "DISTRIBUTION", amount: 1_200_000, date: new Date("2025-11-15"), description: "123 Industrial Q3 NOI", referenceId: "cac-dist-h9", referenceType: "DistributionEvent" },
      { id: "cac-txn-hd10", entityId: entity8.id, transactionType: "DISTRIBUTION", amount: 2_500_000, date: new Date("2025-12-31"), description: "Q4 interest income", referenceId: "cac-dist-h10", referenceType: "DistributionEvent" },
      { id: "cac-txn-hd11", entityId: entity1.id, transactionType: "DISTRIBUTION", amount: 2_600_000, date: new Date("2026-01-31"), description: "NovaTech Q4 dividend", referenceId: "cac-dist-h11", referenceType: "DistributionEvent" },
      { id: "cac-txn-hd12", entityId: entity2.id, transactionType: "DISTRIBUTION", amount: 15_000_000, date: new Date("2026-02-28"), description: "FreshRoute full exit", referenceId: "cac-dist-h12", referenceType: "DistributionEvent" },
    ],
  });
  console.log("Transactions seeded");

  // ============================================================
  // NAV COMPUTATIONS (quarterly snapshots for Overview charts)
  // ============================================================
  console.log("Creating NAV computations...");

  await prisma.nAVComputation.createMany({
    data: [
      // CAC Fund I — 7 quarterly snapshots
      { entityId: entity1.id, periodDate: new Date("2023-09-30"), economicNAV: 145_000_000, costBasisNAV: 105_000_000, unrealizedGain: 40_000_000 },
      { entityId: entity1.id, periodDate: new Date("2023-12-31"), economicNAV: 152_000_000, costBasisNAV: 105_000_000, unrealizedGain: 47_000_000 },
      { entityId: entity1.id, periodDate: new Date("2024-03-31"), economicNAV: 160_000_000, costBasisNAV: 108_000_000, unrealizedGain: 52_000_000 },
      { entityId: entity1.id, periodDate: new Date("2024-06-30"), economicNAV: 172_000_000, costBasisNAV: 108_000_000, unrealizedGain: 64_000_000 },
      { entityId: entity1.id, periodDate: new Date("2024-09-30"), economicNAV: 183_000_000, costBasisNAV: 110_000_000, unrealizedGain: 73_000_000 },
      { entityId: entity1.id, periodDate: new Date("2024-12-31"), economicNAV: 195_000_000, costBasisNAV: 110_000_000, unrealizedGain: 85_000_000 },
      { entityId: entity1.id, periodDate: new Date("2025-03-31"), economicNAV: 210_000_000, costBasisNAV: 112_000_000, unrealizedGain: 98_000_000 },
      // CAC Fund II — 5 quarterly snapshots
      { entityId: entity2.id, periodDate: new Date("2024-03-31"), economicNAV: 98_000_000, costBasisNAV: 82_000_000, unrealizedGain: 16_000_000 },
      { entityId: entity2.id, periodDate: new Date("2024-06-30"), economicNAV: 115_000_000, costBasisNAV: 95_000_000, unrealizedGain: 20_000_000 },
      { entityId: entity2.id, periodDate: new Date("2024-09-30"), economicNAV: 132_000_000, costBasisNAV: 107_000_000, unrealizedGain: 25_000_000 },
      { entityId: entity2.id, periodDate: new Date("2024-12-31"), economicNAV: 148_000_000, costBasisNAV: 118_000_000, unrealizedGain: 30_000_000 },
      { entityId: entity2.id, periodDate: new Date("2025-03-31"), economicNAV: 165_000_000, costBasisNAV: 125_000_000, unrealizedGain: 40_000_000 },
      // Credit Opportunity I — 4 quarterly snapshots
      { entityId: entity8.id, periodDate: new Date("2024-06-30"), economicNAV: 28_000_000, costBasisNAV: 26_000_000, unrealizedGain: 2_000_000 },
      { entityId: entity8.id, periodDate: new Date("2024-09-30"), economicNAV: 34_000_000, costBasisNAV: 32_000_000, unrealizedGain: 2_000_000 },
      { entityId: entity8.id, periodDate: new Date("2024-12-31"), economicNAV: 41_000_000, costBasisNAV: 38_000_000, unrealizedGain: 3_000_000 },
      { entityId: entity8.id, periodDate: new Date("2025-03-31"), economicNAV: 49_000_000, costBasisNAV: 44_000_000, unrealizedGain: 5_000_000 },
    ],
  });
  console.log("NAV computations seeded");

  // ============================================================
  // UNIT CLASSES + OWNERSHIP UNITS (Cap Table)
  // ============================================================
  console.log("Creating unit classes and ownership units...");

  // CAC Fund I — Class A LP + GP Interest
  const ucFund1A = await prisma.unitClass.create({
    data: {
      id: "cac-uc-1a",
      entityId: entity1.id,
      name: "Class A LP Units",
      classType: "LP_UNIT",
      unitPrice: 1000,
      totalAuthorized: 300_000,
      totalIssued: 180_000,
      preferredReturnRate: 0.08,
      managementFeeRate: 0.015,
      votingRights: false,
      status: "ACTIVE",
    },
  });

  const ucFund1GP = await prisma.unitClass.create({
    data: {
      id: "cac-uc-1gp",
      entityId: entity1.id,
      name: "GP Interest",
      classType: "GP_UNIT",
      unitPrice: 1000,
      totalAuthorized: 10_000,
      totalIssued: 5_000,
      votingRights: true,
      status: "ACTIVE",
    },
  });

  // CAC Fund II — Class A LP
  const ucFund2A = await prisma.unitClass.create({
    data: {
      id: "cac-uc-2a",
      entityId: entity2.id,
      name: "Class A LP Units",
      classType: "LP_UNIT",
      unitPrice: 1000,
      totalAuthorized: 600_000,
      totalIssued: 340_000,
      preferredReturnRate: 0.08,
      managementFeeRate: 0.015,
      votingRights: false,
      status: "ACTIVE",
    },
  });

  // CAC Fund III — Class A LP (actively fundraising)
  const ucFund3A = await prisma.unitClass.create({
    data: {
      id: "cac-uc-3a",
      entityId: entity3.id,
      name: "Class A LP Units",
      classType: "LP_UNIT",
      unitPrice: 1000,
      totalAuthorized: 250_000,
      totalIssued: 120_000,
      preferredReturnRate: 0.08,
      managementFeeRate: 0.02,
      votingRights: false,
      status: "ACTIVE",
    },
  });

  // Ownership units for Fund I Class A
  await prisma.ownershipUnit.createMany({
    data: [
      { id: "cac-ou-1a-1", unitClassId: ucFund1A.id, investorId: investor1.id, unitsIssued: 50_000, unitCost: 1000, acquisitionDate: new Date("2019-10-01"), status: "ACTIVE" },
      { id: "cac-ou-1a-2", unitClassId: ucFund1A.id, investorId: investor2.id, unitsIssued: 40_000, unitCost: 1000, acquisitionDate: new Date("2019-10-01"), status: "ACTIVE" },
      { id: "cac-ou-1a-3", unitClassId: ucFund1A.id, investorId: investor4.id, unitsIssued: 50_000, unitCost: 1000, acquisitionDate: new Date("2019-10-01"), status: "ACTIVE" },
      { id: "cac-ou-1a-4", unitClassId: ucFund1A.id, investorId: investor5.id, unitsIssued: 30_000, unitCost: 1000, acquisitionDate: new Date("2020-03-15"), status: "ACTIVE" },
      { id: "cac-ou-1a-5", unitClassId: ucFund1A.id, investorId: investor3.id, unitsIssued: 10_000, unitCost: 1000, acquisitionDate: new Date("2020-03-15"), status: "ACTIVE" },
    ],
  });

  // Ownership units for Fund I GP Interest
  await prisma.ownershipUnit.createMany({
    data: [
      { id: "cac-ou-1gp-1", unitClassId: ucFund1GP.id, investorId: investor6.id, unitsIssued: 5_000, unitCost: 1000, acquisitionDate: new Date("2019-09-01"), status: "ACTIVE" },
    ],
  });

  // Ownership units for Fund II Class A
  await prisma.ownershipUnit.createMany({
    data: [
      { id: "cac-ou-2a-1", unitClassId: ucFund2A.id, investorId: investor1.id, unitsIssued: 75_000, unitCost: 1000, acquisitionDate: new Date("2022-09-01"), status: "ACTIVE" },
      { id: "cac-ou-2a-2", unitClassId: ucFund2A.id, investorId: investor4.id, unitsIssued: 100_000, unitCost: 1000, acquisitionDate: new Date("2022-09-01"), status: "ACTIVE" },
      { id: "cac-ou-2a-3", unitClassId: ucFund2A.id, investorId: investor5.id, unitsIssued: 80_000, unitCost: 1000, acquisitionDate: new Date("2022-09-01"), status: "ACTIVE" },
      { id: "cac-ou-2a-4", unitClassId: ucFund2A.id, investorId: investor2.id, unitsIssued: 55_000, unitCost: 1000, acquisitionDate: new Date("2022-12-01"), status: "ACTIVE" },
      { id: "cac-ou-2a-5", unitClassId: ucFund2A.id, investorId: investor6.id, unitsIssued: 30_000, unitCost: 1000, acquisitionDate: new Date("2022-12-01"), status: "ACTIVE" },
    ],
  });

  // Ownership units for Fund III Class A (partial — still fundraising)
  await prisma.ownershipUnit.createMany({
    data: [
      { id: "cac-ou-3a-1", unitClassId: ucFund3A.id, investorId: investor1.id, unitsIssued: 50_000, unitCost: 1000, acquisitionDate: new Date("2025-09-15"), status: "ACTIVE" },
      { id: "cac-ou-3a-2", unitClassId: ucFund3A.id, investorId: investor4.id, unitsIssued: 40_000, unitCost: 1000, acquisitionDate: new Date("2025-09-15"), status: "ACTIVE" },
      { id: "cac-ou-3a-3", unitClassId: ucFund3A.id, investorId: investor2.id, unitsIssued: 30_000, unitCost: 1000, acquisitionDate: new Date("2025-12-01"), status: "ACTIVE" },
    ],
  });

  console.log("Unit classes and ownership units seeded");

  console.log("Seeding complete for Core Asset Credit!");
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
