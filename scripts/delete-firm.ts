/**
 * scripts/delete-firm.ts
 *
 * Safely delete all data belonging to a single firm (tenant) from the database.
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/delete-firm.ts <firmId> [--dry-run] [--yes]
 *
 *   --dry-run   Count rows that would be deleted, but do not delete anything.
 *   --yes       Skip the interactive confirmation after the dry run summary.
 *
 * Safety model:
 *   - All deletes run inside a single transaction (all-or-nothing).
 *   - Dry-run does not open a writable transaction at all — only COUNT queries.
 *   - Script refuses to run without a firmId argument.
 *   - Script prints the firm's name + record counts before asking for confirmation.
 *   - Designed assuming a Neon branch snapshot exists (rollback path if anything goes wrong).
 *
 * Delete order derived from Atlas prisma/schema.prisma FK graph.
 *
 * Created: 2026-04-16 — one-off for Core Asset Credit tenant cleanup.
 * Reusable: yes, for any future firm-targeted cleanup.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const firmId = process.argv[2];
const isDryRun = process.argv.includes("--dry-run");
const skipPrompt = process.argv.includes("--yes");

if (!firmId || firmId.startsWith("--")) {
  console.error("Usage: npx tsx scripts/delete-firm.ts <firmId> [--dry-run] [--yes]");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type CountRow = { table: string; count: number };

async function main() {
  // Verify the firm exists
  const firm = await prisma.firm.findUnique({ where: { id: firmId } });
  if (!firm) {
    console.error(`No firm found with id ${firmId}. Aborting.`);
    process.exit(1);
  }
  console.log(`\n=== Target firm: ${firm.name} (id=${firm.id}, created=${firm.createdAt.toISOString().slice(0, 10)}) ===\n`);

  // Collect id sets for all firm-scoped anchor tables so we can find their dependents.
  const deals = await prisma.deal.findMany({ where: { firmId }, select: { id: true } });
  const entities = await prisma.entity.findMany({ where: { firmId }, select: { id: true } });
  const users = await prisma.user.findMany({ where: { firmId }, select: { id: true } });
  const contacts = await prisma.contact.findMany({ where: { firmId }, select: { id: true } });
  const companies = await prisma.company.findMany({ where: { firmId }, select: { id: true } });
  const meetings = await prisma.meeting.findMany({ where: { firmId }, select: { id: true } });

  const dealIds = deals.map((d) => d.id);
  const entityIds = entities.map((e) => e.id);
  const userIds = users.map((u) => u.id);
  const contactIds = contacts.map((c) => c.id);
  const companyIds = companies.map((c) => c.id);
  const meetingIds = meetings.map((m) => m.id);

  // Investors are firm-scoped via Contact (Investor.contactId references Contact.id).
  const investors = contactIds.length > 0
    ? await prisma.investor.findMany({ where: { contactId: { in: contactIds } }, select: { id: true } })
    : [];
  const investorIds = investors.map((i) => i.id);

  // Assets are firm-scoped indirectly — via (a) source deal in this firm OR (b) entity allocation to an entity in this firm.
  const assetsFromDeals = dealIds.length > 0
    ? await prisma.asset.findMany({ where: { sourceDealId: { in: dealIds } }, select: { id: true } })
    : [];
  const allocations = entityIds.length > 0
    ? await prisma.assetEntityAllocation.findMany({ where: { entityId: { in: entityIds } }, select: { assetId: true } })
    : [];
  const assetIdSet = new Set<string>([
    ...assetsFromDeals.map((a) => a.id),
    ...allocations.map((a) => a.assetId),
  ]);
  const assetIds = [...assetIdSet];

  // Helper: count rows with a where clause. Used in dry run.
  const counts: CountRow[] = [];
  async function count(label: string, query: Promise<number>) {
    const n = await query;
    counts.push({ table: label, count: n });
    return n;
  }

  console.log(`Identified scope:`);
  console.log(`  deals      = ${dealIds.length}`);
  console.log(`  entities   = ${entityIds.length}`);
  console.log(`  users      = ${userIds.length}`);
  console.log(`  contacts   = ${contactIds.length}`);
  console.log(`  companies  = ${companyIds.length}`);
  console.log(`  meetings   = ${meetingIds.length}`);
  console.log(`  investors  = ${investorIds.length}`);
  console.log(`  assets     = ${assetIds.length}\n`);

  // --- DRY RUN: count rows in every dependent table ---
  // Helpful: these mirror the delete order below.
  const anyIn = <T extends string>(arr: T[]) => (arr.length > 0 ? arr : ["__NONE__" as T]);
  const hasAny = <T>(arr: T[]) => arr.length > 0;

  // Level 0 leaves — deepest dependents
  if (hasAny(assetIds)) {
    await count("AssetCreditDetails", prisma.assetCreditDetails.count({ where: { assetId: { in: assetIds } } }));
    await count("AssetEquityDetails", prisma.assetEquityDetails.count({ where: { assetId: { in: assetIds } } }));
    await count("AssetRealEstateDetails", prisma.assetRealEstateDetails.count({ where: { assetId: { in: assetIds } } }));
    await count("AssetFundLPDetails", prisma.assetFundLPDetails.count({ where: { assetId: { in: assetIds } } }));
    await count("Valuation", prisma.valuation.count({ where: { assetId: { in: assetIds } } }));
    await count("Lease", prisma.lease.count({ where: { assetId: { in: assetIds } } }));
    await count("CreditAgreement", prisma.creditAgreement.count({ where: { assetId: { in: assetIds } } }));
    await count("ActivityEvent", prisma.activityEvent.count({ where: { assetId: { in: assetIds } } }));
  }
  if (hasAny(entityIds)) {
    await count("AssetEntityAllocation", prisma.assetEntityAllocation.count({ where: { entityId: { in: entityIds } } }));
    await count("AssetExpense", prisma.assetExpense.count({ where: { entityId: { in: entityIds } } }));
    await count("IncomeEvent", prisma.incomeEvent.count({ where: { entityId: { in: entityIds } } }));
    await count("FeeCalculation", prisma.feeCalculation.count({ where: { entityId: { in: entityIds } } }));
    await count("NAVComputation", prisma.nAVComputation.count({ where: { entityId: { in: entityIds } } }));
    await count("AccountingConnection", prisma.accountingConnection.count({ where: { entityId: { in: entityIds } } }));
    await count("FundraisingRound", prisma.fundraisingRound.count({ where: { entityId: { in: entityIds } } }));
    await count("UnitClass", prisma.unitClass.count({ where: { entityId: { in: entityIds } } }));
    await count("CapitalAccount", prisma.capitalAccount.count({ where: { entityId: { in: entityIds } } }));
  }

  // Capital call + distribution line items (children of transactions)
  if (hasAny(entityIds)) {
    const calls = await prisma.capitalCall.findMany({ where: { entityId: { in: entityIds } }, select: { id: true } });
    const dists = await prisma.distributionEvent.findMany({ where: { entityId: { in: entityIds } }, select: { id: true } });
    const callIds = calls.map((c) => c.id);
    const distIds = dists.map((d) => d.id);
    if (hasAny(callIds)) await count("CapitalCallLineItem", prisma.capitalCallLineItem.count({ where: { capitalCallId: { in: callIds } } }));
    if (hasAny(distIds)) await count("DistributionLineItem", prisma.distributionLineItem.count({ where: { distributionId: { in: distIds } } }));
    await count("CapitalCall", prisma.capitalCall.count({ where: { entityId: { in: entityIds } } }));
    await count("DistributionEvent", prisma.distributionEvent.count({ where: { entityId: { in: entityIds } } }));
    await count("Transaction", prisma.transaction.count({ where: { entityId: { in: entityIds } } }));
  }

  // Commitments and side letters
  if (hasAny(entityIds)) {
    await count("Commitment", prisma.commitment.count({ where: { entityId: { in: entityIds } } }));
    await count("SideLetter", prisma.sideLetter.count({ where: { entityId: { in: entityIds } } }));
  }

  // Deal children
  if (hasAny(dealIds)) {
    await count("AIScreeningResult", prisma.aIScreeningResult.count({ where: { dealId: { in: dealIds } } }));
    await count("DDWorkstream", prisma.dDWorkstream.count({ where: { dealId: { in: dealIds } } }));
    await count("DealActivity", prisma.dealActivity.count({ where: { dealId: { in: dealIds } } }));
    await count("DealCoInvestor", prisma.dealCoInvestor.count({ where: { dealId: { in: dealIds } } }));
    await count("DealEntity", prisma.dealEntity.count({ where: { dealId: { in: dealIds } } }));
    await count("ClosingChecklist", prisma.closingChecklist.count({ where: { dealId: { in: dealIds } } }));
    await count("ICProcess", prisma.iCProcess.count({ where: { dealId: { in: dealIds } } }));
    await count("ICQuestion", prisma.iCQuestion.count({ where: { dealId: { in: dealIds } } }));
  }

  // Investor-linked
  if (hasAny(investorIds)) {
    await count("InvestorNotificationPreference", prisma.investorNotificationPreference.count({ where: { investorId: { in: investorIds } } }));
    await count("InvestorUserAccess", prisma.investorUserAccess.count({ where: { investorId: { in: investorIds } } }));
    await count("OwnershipUnit", prisma.ownershipUnit.count({ where: { investorId: { in: investorIds } } }));
    await count("MetricSnapshot", prisma.metricSnapshot.count({ where: { investorId: { in: investorIds } } }));
  }

  // Cross-referencing tables (scoped by dealId/entityId/assetId/userId/investorId/contactId)
  const crossWhere = {
    OR: [
      hasAny(dealIds) ? { dealId: { in: dealIds } } : undefined,
      hasAny(entityIds) ? { entityId: { in: entityIds } } : undefined,
      hasAny(assetIds) ? { assetId: { in: assetIds } } : undefined,
      hasAny(investorIds) ? { investorId: { in: investorIds } } : undefined,
    ].filter(Boolean) as any[],
  };
  if (crossWhere.OR.length > 0) {
    await count("Document", prisma.document.count({ where: crossWhere }));
    await count("Note", prisma.note.count({ where: crossWhere }));
    await count("Task", prisma.task.count({ where: crossWhere }));
    await count("SavedConversation", prisma.savedConversation.count({ where: crossWhere }));
    await count("ESignaturePackage", prisma.eSignaturePackage.count({ where: { OR: [hasAny(dealIds) ? { dealId: { in: dealIds } } : undefined, hasAny(entityIds) ? { entityId: { in: entityIds } } : undefined].filter(Boolean) as any[] } }));
  }

  // Tables with direct firmId
  await count("Meeting", prisma.meeting.count({ where: { firmId } }));
  await count("ContactInteraction", prisma.contactInteraction.count({ where: { firmId } }));
  await count("ContactTag", prisma.contactTag.count({ where: { firmId } }));
  await count("Notification", prisma.notification.count({ where: { userId: { in: userIds } } }));
  await count("AuditLog", prisma.auditLog.count({ where: { firmId } }));
  await count("AIConfiguration", prisma.aIConfiguration.count({ where: { firmId } }));
  await count("AIPromptTemplate", prisma.aIPromptTemplate.count({ where: { firmId } }));
  await count("DDCategoryTemplate", prisma.dDCategoryTemplate.count({ where: { firmId } }));
  await count("DecisionStructure", prisma.decisionStructure.count({ where: { firmId } }));
  await count("IntegrationConnection", prisma.integrationConnection.count({ where: { firmId } }));
  await count("DocuSignConnection", prisma.docuSignConnection.count({ where: { firmId } }));

  // Top-level anchors
  await count("Investor", prisma.investor.count({ where: { contactId: { in: contactIds } } }));
  await count("Asset", prisma.asset.count({ where: { id: { in: assetIds } } }));
  await count("Deal", prisma.deal.count({ where: { firmId } }));
  await count("Entity", prisma.entity.count({ where: { firmId } }));
  await count("Contact", prisma.contact.count({ where: { firmId } }));
  await count("Company", prisma.company.count({ where: { firmId } }));
  await count("User", prisma.user.count({ where: { firmId } }));
  await count("Firm", 1 as any);

  console.log("Rows to delete by table:");
  let total = 0;
  for (const { table, count: n } of counts) {
    if (n > 0) {
      console.log(`  ${table.padEnd(36)} ${n}`);
      total += n;
    }
  }
  console.log(`\nTotal rows: ${total}\n`);

  if (isDryRun) {
    console.log("DRY RUN complete. No data was modified. Rerun without --dry-run to execute.");
    await prisma.$disconnect();
    return;
  }

  // Interactive confirm
  if (!skipPrompt) {
    const readline = await import("readline/promises");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`\nType the firm name ("${firm.name}") to confirm deletion: `);
    rl.close();
    if (answer.trim() !== firm.name) {
      console.error("Name did not match. Aborting.");
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  console.log("\nExecuting deletion in transaction...");

  // --- REAL DELETE (wrapped in transaction) ---
  await prisma.$transaction(async (tx) => {
    const del = async (label: string, p: Promise<any>) => {
      const r = await p;
      const n = (r as any).count ?? r;
      console.log(`  deleted ${label.padEnd(36)} ${n}`);
    };

    // Leaves first
    if (hasAny(assetIds)) {
      await del("AssetCreditDetails", tx.assetCreditDetails.deleteMany({ where: { assetId: { in: assetIds } } }));
      await del("AssetEquityDetails", tx.assetEquityDetails.deleteMany({ where: { assetId: { in: assetIds } } }));
      await del("AssetRealEstateDetails", tx.assetRealEstateDetails.deleteMany({ where: { assetId: { in: assetIds } } }));
      await del("AssetFundLPDetails", tx.assetFundLPDetails.deleteMany({ where: { assetId: { in: assetIds } } }));
      await del("Valuation", tx.valuation.deleteMany({ where: { assetId: { in: assetIds } } }));
      await del("Lease", tx.lease.deleteMany({ where: { assetId: { in: assetIds } } }));
      // CreditAgreement has Covenant + CreditPayment children
      const creditAgrs = await tx.creditAgreement.findMany({ where: { assetId: { in: assetIds } }, select: { id: true } });
      const creditAgrIds = creditAgrs.map((c) => c.id);
      if (hasAny(creditAgrIds)) {
        await del("Covenant", tx.covenant.deleteMany({ where: { agreementId: { in: creditAgrIds } } }));
        await del("CreditPayment", tx.creditPayment.deleteMany({ where: { agreementId: { in: creditAgrIds } } }));
      }
      await del("CreditAgreement", tx.creditAgreement.deleteMany({ where: { assetId: { in: assetIds } } }));
      await del("ActivityEvent", tx.activityEvent.deleteMany({ where: { assetId: { in: assetIds } } }));
    }
    if (hasAny(entityIds)) {
      await del("AssetEntityAllocation", tx.assetEntityAllocation.deleteMany({ where: { entityId: { in: entityIds } } }));
      await del("AssetExpense", tx.assetExpense.deleteMany({ where: { entityId: { in: entityIds } } }));
      await del("IncomeEvent", tx.incomeEvent.deleteMany({ where: { entityId: { in: entityIds } } }));
      await del("FeeCalculation", tx.feeCalculation.deleteMany({ where: { entityId: { in: entityIds } } }));
      await del("NAVComputation", tx.nAVComputation.deleteMany({ where: { entityId: { in: entityIds } } }));
      // AccountingConnection has TrialBalanceSnapshot + AccountMapping children
      const accConns = await tx.accountingConnection.findMany({ where: { entityId: { in: entityIds } }, select: { id: true } });
      const accConnIds = accConns.map((a) => a.id);
      if (hasAny(accConnIds)) {
        await del("TrialBalanceSnapshot", tx.trialBalanceSnapshot.deleteMany({ where: { connectionId: { in: accConnIds } } }));
        await del("AccountMapping", tx.accountMapping.deleteMany({ where: { connectionId: { in: accConnIds } } }));
      }
      await del("AccountingConnection", tx.accountingConnection.deleteMany({ where: { entityId: { in: entityIds } } }));
      // FundraisingRound has FundraisingProspect children
      const rounds = await tx.fundraisingRound.findMany({ where: { entityId: { in: entityIds } }, select: { id: true } });
      const roundIds = rounds.map((r) => r.id);
      if (hasAny(roundIds)) {
        await del("FundraisingProspect", tx.fundraisingProspect.deleteMany({ where: { roundId: { in: roundIds } } }));
      }
      await del("FundraisingRound", tx.fundraisingRound.deleteMany({ where: { entityId: { in: entityIds } } }));
      const calls = await tx.capitalCall.findMany({ where: { entityId: { in: entityIds } }, select: { id: true } });
      const dists = await tx.distributionEvent.findMany({ where: { entityId: { in: entityIds } }, select: { id: true } });
      const callIds = calls.map((c) => c.id);
      const distIds = dists.map((d) => d.id);
      if (hasAny(callIds)) await del("CapitalCallLineItem", tx.capitalCallLineItem.deleteMany({ where: { capitalCallId: { in: callIds } } }));
      if (hasAny(distIds)) await del("DistributionLineItem", tx.distributionLineItem.deleteMany({ where: { distributionId: { in: distIds } } }));
      // Documents may reference CapitalCall / DistributionEvent — delete those doc refs before the parents
      if (hasAny(callIds)) await del("Document(byCapitalCall)", tx.document.deleteMany({ where: { capitalCallId: { in: callIds } } }));
      if (hasAny(distIds)) await del("Document(byDistributionEvent)", tx.document.deleteMany({ where: { distributionEventId: { in: distIds } } }));
      await del("CapitalCall", tx.capitalCall.deleteMany({ where: { entityId: { in: entityIds } } }));
      await del("DistributionEvent", tx.distributionEvent.deleteMany({ where: { entityId: { in: entityIds } } }));
      await del("Transaction", tx.transaction.deleteMany({ where: { entityId: { in: entityIds } } }));
      await del("Commitment", tx.commitment.deleteMany({ where: { entityId: { in: entityIds } } }));
      // SideLetter has SideLetterRule children
      const sideLetters = await tx.sideLetter.findMany({ where: { entityId: { in: entityIds } }, select: { id: true } });
      const slIds = sideLetters.map((s) => s.id);
      if (hasAny(slIds)) {
        await del("SideLetterRule", tx.sideLetterRule.deleteMany({ where: { sideLetterId: { in: slIds } } }));
      }
      await del("SideLetter", tx.sideLetter.deleteMany({ where: { entityId: { in: entityIds } } }));
      await del("CapitalAccount", tx.capitalAccount.deleteMany({ where: { entityId: { in: entityIds } } }));
      await del("UnitClass", tx.unitClass.deleteMany({ where: { entityId: { in: entityIds } } }));
    }
    if (hasAny(dealIds)) {
      await del("AIScreeningResult", tx.aIScreeningResult.deleteMany({ where: { dealId: { in: dealIds } } }));
      // DDWorkstream has DDTask, DDTaskComment, DDWorkstreamComment, DDWorkstreamAttachment children
      const workstreams = await tx.dDWorkstream.findMany({ where: { dealId: { in: dealIds } }, select: { id: true } });
      const wsIds = workstreams.map((w) => w.id);
      if (hasAny(wsIds)) {
        // DDTask has DDTaskComment + DDTaskAttachment children
        const ddTasks = await tx.dDTask.findMany({ where: { workstreamId: { in: wsIds } }, select: { id: true } });
        const ddTaskIds = ddTasks.map((t) => t.id);
        if (hasAny(ddTaskIds)) {
          await del("DDTaskComment", tx.dDTaskComment.deleteMany({ where: { taskId: { in: ddTaskIds } } }));
          await del("DDTaskAttachment", tx.dDTaskAttachment.deleteMany({ where: { taskId: { in: ddTaskIds } } }));
        }
        await del("DDTask", tx.dDTask.deleteMany({ where: { workstreamId: { in: wsIds } } }));
        await del("DDWorkstreamAttachment", tx.dDWorkstreamAttachment.deleteMany({ where: { workstreamId: { in: wsIds } } }));
        await del("DDWorkstreamComment", tx.dDWorkstreamComment.deleteMany({ where: { workstreamId: { in: wsIds } } }));
      }
      await del("DDWorkstream", tx.dDWorkstream.deleteMany({ where: { dealId: { in: dealIds } } }));
      await del("DealActivity", tx.dealActivity.deleteMany({ where: { dealId: { in: dealIds } } }));
      await del("DealCoInvestor", tx.dealCoInvestor.deleteMany({ where: { dealId: { in: dealIds } } }));
      await del("DealEntity", tx.dealEntity.deleteMany({ where: { dealId: { in: dealIds } } }));
      await del("ClosingChecklist", tx.closingChecklist.deleteMany({ where: { dealId: { in: dealIds } } }));
      // ICProcess / ICQuestion may have replies + vote records
      const icQs = await tx.iCQuestion.findMany({ where: { dealId: { in: dealIds } }, select: { id: true } });
      const qIds = icQs.map((q) => q.id);
      if (hasAny(qIds)) {
        await del("ICQuestionReply", tx.iCQuestionReply.deleteMany({ where: { questionId: { in: qIds } } }));
      }
      const icProcs = await tx.iCProcess.findMany({ where: { dealId: { in: dealIds } }, select: { id: true } });
      const icIds = icProcs.map((p) => p.id);
      if (hasAny(icIds)) {
        await del("ICVoteRecord", tx.iCVoteRecord.deleteMany({ where: { icProcessId: { in: icIds } } }));
      }
      await del("ICQuestion", tx.iCQuestion.deleteMany({ where: { dealId: { in: dealIds } } }));
      await del("ICProcess", tx.iCProcess.deleteMany({ where: { dealId: { in: dealIds } } }));
    }

    if (hasAny(investorIds)) {
      await del("InvestorNotificationPreference", tx.investorNotificationPreference.deleteMany({ where: { investorId: { in: investorIds } } }));
      await del("InvestorUserAccess", tx.investorUserAccess.deleteMany({ where: { investorId: { in: investorIds } } }));
      await del("OwnershipUnit", tx.ownershipUnit.deleteMany({ where: { investorId: { in: investorIds } } }));
      await del("MetricSnapshot", tx.metricSnapshot.deleteMany({ where: { investorId: { in: investorIds } } }));
    }

    // Cross-cutting — Document/Note/Task/SavedConversation/ESignaturePackage can reference any of the anchors
    const crossOr: any[] = [];
    if (hasAny(dealIds)) crossOr.push({ dealId: { in: dealIds } });
    if (hasAny(entityIds)) crossOr.push({ entityId: { in: entityIds } });
    if (hasAny(assetIds)) crossOr.push({ assetId: { in: assetIds } });
    if (hasAny(investorIds)) crossOr.push({ investorId: { in: investorIds } });
    if (crossOr.length > 0) {
      await del("Document", tx.document.deleteMany({ where: { OR: crossOr } }));
      await del("Note", tx.note.deleteMany({ where: { OR: crossOr } }));
      // Task has TaskChecklistItem children
      const tasks = await tx.task.findMany({ where: { OR: crossOr }, select: { id: true } });
      const taskIds = tasks.map((t) => t.id);
      if (hasAny(taskIds)) {
        await del("TaskChecklistItem", tx.taskChecklistItem.deleteMany({ where: { taskId: { in: taskIds } } }));
      }
      await del("Task", tx.task.deleteMany({ where: { OR: crossOr } }));
      await del("SavedConversation", tx.savedConversation.deleteMany({ where: { OR: crossOr } }));
      const esOr: any[] = [];
      if (hasAny(dealIds)) esOr.push({ dealId: { in: dealIds } });
      if (hasAny(entityIds)) esOr.push({ entityId: { in: entityIds } });
      if (esOr.length > 0) await del("ESignaturePackage", tx.eSignaturePackage.deleteMany({ where: { OR: esOr } }));
    }

    // Meeting, ContactInteraction, ContactTag all have direct firmId
    await del("Meeting", tx.meeting.deleteMany({ where: { firmId } }));
    await del("ContactInteraction", tx.contactInteraction.deleteMany({ where: { firmId } }));
    await del("ContactTag", tx.contactTag.deleteMany({ where: { firmId } }));

    // Notification is per-user
    if (hasAny(userIds)) {
      await del("Notification", tx.notification.deleteMany({ where: { userId: { in: userIds } } }));
    }

    // Firm-scoped admin tables
    await del("AuditLog", tx.auditLog.deleteMany({ where: { firmId } }));
    await del("AIConfiguration", tx.aIConfiguration.deleteMany({ where: { firmId } }));
    await del("AIPromptTemplate", tx.aIPromptTemplate.deleteMany({ where: { firmId } }));
    await del("DDCategoryTemplate", tx.dDCategoryTemplate.deleteMany({ where: { firmId } }));
    // DecisionStructure has DecisionMember children; also Entity.decisionStructureId references it
    // (Entity hasn't been deleted yet — we need to null out the FK first to avoid a constraint violation)
    const decisionStructures = await tx.decisionStructure.findMany({ where: { firmId }, select: { id: true } });
    const dsIds = decisionStructures.map((d) => d.id);
    if (hasAny(dsIds)) {
      await del("DecisionMember", tx.decisionMember.deleteMany({ where: { structureId: { in: dsIds } } }));
      if (hasAny(entityIds)) {
        await tx.entity.updateMany({ where: { id: { in: entityIds } }, data: { decisionStructureId: null } });
      }
    }
    await del("DecisionStructure", tx.decisionStructure.deleteMany({ where: { firmId } }));
    // IntegrationConnection has PlaidAccount children
    const integrationConns = await tx.integrationConnection.findMany({ where: { firmId }, select: { id: true } });
    const icIdsForPlaid = integrationConns.map((i) => i.id);
    if (hasAny(icIdsForPlaid)) {
      await del("PlaidAccount", tx.plaidAccount.deleteMany({ where: { connectionId: { in: icIdsForPlaid } } }));
    }
    await del("IntegrationConnection", tx.integrationConnection.deleteMany({ where: { firmId } }));
    await del("DocuSignConnection", tx.docuSignConnection.deleteMany({ where: { firmId } }));

    // Anchors
    if (hasAny(investorIds)) await del("Investor", tx.investor.deleteMany({ where: { id: { in: investorIds } } }));
    if (hasAny(assetIds)) await del("Asset", tx.asset.deleteMany({ where: { id: { in: assetIds } } }));
    await del("Deal", tx.deal.deleteMany({ where: { firmId } }));

    // Entity has self-reference (parentEntityId) — null out the parents first so deletion of children doesn't break
    if (hasAny(entityIds)) {
      await tx.entity.updateMany({ where: { id: { in: entityIds } }, data: { parentEntityId: null } });
      await del("Entity", tx.entity.deleteMany({ where: { firmId } }));
    }

    // User has contactId FK to Contact — delete Users first, then Contacts, then Companies
    await del("User", tx.user.deleteMany({ where: { firmId } }));
    await del("Contact", tx.contact.deleteMany({ where: { firmId } }));
    await del("Company", tx.company.deleteMany({ where: { firmId } }));

    // Finally the Firm itself
    await del("Firm", tx.firm.delete({ where: { id: firmId } }));
  }, { timeout: 120_000 });

  console.log("\n✓ Deletion committed. All rows for this firm have been removed.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("\nFATAL — transaction rolled back (if it was already open):");
  console.error(e);
  process.exit(1);
});
