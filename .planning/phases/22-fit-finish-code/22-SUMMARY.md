---
phase: 22-fit-finish-code
status: partial
completed: 2026-04-17
plans_shipped: [22-01, 22-02, 22-03, 22-04, 22-05, 22-06, 22-07]
plans_deferred:
  - plan: 22-08
    reason: "Excel-gated; user deferred on 2026-04-17 — Kathryn owns this class of work (second-fund waterfall validation). Carried forward to Phase 23 backlog."
---

# Phase 22 — Fit & Finish (Code) — Summary

## Outcome

Phase 22 shipped 7 of 9 plans. All three hard blockers are resolved: the Side Letter form crash (Obs 35, Plan 22-01), the Document Upload Wizard (Obs 40, Plan 22-02), and the LP Capital Account reconciliation gap (LP-Obs 2, Plan 22-03). The asset-correctness cluster closed with edit modals for every asset field including entry date, type-conditional sections, and sub-modals for leases, credit agreements, and valuations (Plan 22-04). The Meeting detail page, activity feed click-through, and LP Portfolio invested/current-value columns shipped in Plan 22-05. List controls, record linkage, and the centralized error copy taxonomy landed in Plan 22-06. The waterfall route refactor and formal FIN-08 bug closeout completed in Plan 22-07. The biggest surprise was the LP-Obs 2 root cause: the $6M distribution gap was a seed data authoring error (entity2 had no per-investor DLIs), not the asset-layer cascade predicted by the Obs 20 strategic thesis. The hardest task was Plan 22-04 — discriminated-union Zod schema, `detectAssetKind()` pattern, and sub-modals for three child record types across two API routes and six components, completed across two context windows. FIN-04 (second-fund Excel validation) is deferred to Phase 23; user explicitly assigned it to Kathryn on 2026-04-17.

---

## Requirement Status

| Req    | Description                                      | Status                                                       | Plan                 | Evidence                                                      |
|--------|--------------------------------------------------|--------------------------------------------------------------|----------------------|---------------------------------------------------------------|
| FIN-01 | Meeting detail + clickable activity feed         | **Complete**                                                 | 22-05                | 22-05-SUMMARY.md; `/meetings/[id]` page; 4+ feed sites wired  |
| FIN-02 | Waterfall route imports pref-accrual             | **Complete**                                                 | 22-07                | 22-07-VERIFICATION.md; `grep -c "^\[CLOSED:" = 3`; -102 lines |
| FIN-04 | Second-fund waterfall validation                 | **Pending — carry to Phase 23 (assigned to Kathryn)**        | 22-08 (unexecuted)   | Pending — see Deferred section                                |
| FIN-08 | March-5 bug re-verify (BUG-01/02/03)             | **Complete**                                                 | 22-07                | 22-07-VERIFICATION.md; all three bugs labeled [CLOSED:]        |
| FIN-09 | Error copy cleanup                               | **Complete**                                                 | 22-06                | 22-06-VERIFICATION.md; centralized ERR taxonomy; 13 Unauthorized confirmed genuine |
| FIN-10 | List sort/filter (assets, entities, meetings)    | **Complete**                                                 | 22-06                | 22-06-VERIFICATION.md; parsePaginationParams fix; useMemo sort |
| FIN-11 | Integrated record linkage (tasks, cap table)     | **Complete**                                                 | 22-06                | 22-06-VERIFICATION.md; task rows → /tasks/[id]; cap table links confirmed |
| FIN-12 | LP display quality (capital account + portfolio) | **Complete** (two-part: LP-Obs 2 + LP-Obs 3)                | 22-03 + 22-05        | 22-03-SUMMARY.md; 22-05-SUMMARY.md; 7 new unit tests; aggregate LP portfolio |

---

## Walkthrough Observation Status

| Obs      | Description                                         | Status                         | Plan  | Notes                                                                          |
|----------|-----------------------------------------------------|--------------------------------|-------|--------------------------------------------------------------------------------|
| Obs 3    | Deal stage-gate error copy ("Unauthorized")         | **Closed — Confirmed correct** | 22-06 | API returns descriptive 400 stage-gate message; ERR.DEAL_STAGE_GATE added      |
| Obs 5    | IC Review deal zero workstreams (BUG-01)            | **Closed**                     | 22-07 | deal-9 CLOSED had no seed workstreams; added to dealsToScaffold; seed fixed     |
| Obs 6    | Deal activity feed entries not clickable            | **Closed**                     | 22-05 | deal-activity-tab.tsx: meeting entries → `<Link href=/meetings/${id}>`         |
| Obs 7    | Deletion bypass investigation                       | **Closed — No bypass exists**  | 22-06 | Delete button only for SCREENING/DEAD; Kill Deal → DEAD is intentional two-step |
| Obs 8    | Asset class filter broken                           | **Closed**                     | 22-06 | parsePaginationParams knownParams narrowed; assetClass flows to params.filters  |
| Obs 10   | Asset entry date not editable                       | **Closed**                     | 22-04 | Edit Asset modal expanded; entryDate date picker added; all fields editable     |
| Obs 12   | Lease/contract fields no edit path                  | **Closed**                     | 22-04 | Sub-modal pattern: EditLeaseForm, EditCreditAgreementForm per child row         |
| Obs 18   | Per-asset task tab rows → /tasks/[id]               | **Closed**                     | 22-06 | AssetTasksTab task row: div → Link; href=/tasks/${t.id}                        |
| Obs 19   | Asset activity feed entries not clickable           | **Closed**                     | 22-05 | assets/[id]/page.tsx meeting rows: role="button" + router.push(/meetings/${id}) |
| Obs 21   | Entity list no column sort                          | **Closed**                     | 22-06 | sortedEntities useMemo + SearchFilterBar + clickable column headers             |
| Obs 22   | Per-entity task widget → /tasks/[id]                | **Closed**                     | 22-06 | entity-operations-tab.tsx TasksInline: div → Link; import Link added            |
| Obs 24   | Asset Allocations tooltip missing                   | **Closed**                     | 22-04 | Circular `?` badge with title="Percentage of each asset owned by this fund."   |
| Obs 25   | Entity cost basis shows zero                        | **Closed**                     | 22-04 | Derived cost basis: allocationPercent/100 * asset.costBasis when null           |
| Obs 27   | Cap table investor rows → CRM contact               | **Closed — Already wired**     | 22-06 | All four link sites already in entity-cap-table-tab.tsx (lines 444, 486, 565, 676) |
| Obs 35   | Side Letter form crash (BLOCKER)                    | **Closed**                     | 22-01 | unwrapArray() helper: Array.isArray guards tolerating plain-array + paginated envelope |
| Obs 39   | Document AI summary error copy                      | **Closed**                     | 22-06 | document-extraction-panel NONE state: ERR.DOC_EXTRACT_NO_AI on missing AI key  |
| Obs 40   | Document Upload Wizard stuck on step 1 (BLOCKER)    | **Closed**                     | 22-02 | FileUpload + FormData POST + DocumentFormDataSchema.safeParse()                 |
| Obs 44   | Meetings list no sort/filter                        | **Closed**                     | 22-06 | sortedMeetings useMemo + sort buttons (date/title) added to meetings/page.tsx   |
| Obs 47   | Seed deleteMany order FK violation                  | **Closed**                     | 22-01 | assetExpense.deleteMany() inserted before asset.deleteMany() in seed.ts         |
| LP-Obs 2 | Capital account distribution reconciliation (BLOCKER) | **Closed**                  | 22-03 | Seed-level DLI mismatch: entity2 had no per-investor DLIs; 15 DLIs added; 7 new tests |
| LP-Obs 3 | LP Portfolio invested vs current value missing      | **Closed**                     | 22-05 | LP Portfolio: Invested + Current Value columns via Prisma capitalCallLineItem.aggregate() |

**Attribution note:** All 21 walkthrough items from CONTEXT.md are accounted for above. Obs 1-positive and Obs 4-positive (affirmations, not fixes) are noted in Plan 22-07 as BUG-02 and BUG-03 evidence (confirmed already correct in codebase). No walkthrough item is silently dropped.

---

## What Surprised Us

**LP-Obs 2 root cause was seed data, not asset-layer cascade.** The Obs 20 strategic thesis predicted a cascade from asset income/expense data quality to LP capital account totals. The actual root cause was simpler and more embarrassing: `entity2` (second fund entity) had three PAID historical `DistributionEvent` records with zero `DistributionLineItem` entries. Every LP with entity2 commitments showed $0 distributions. The fix was adding 15 DLIs (5 investors × 3 distributions) with commitment-weighted proRata. The asset-layer cascade hypothesis was refuted for this specific gap — Plan 22-04 proceeded independently.

**The waterfall refactor surfaced no convention drift.** The FIN-02 refactor removed 102 inlined lines from `calculate/route.ts` by importing `buildPicTimeline` and `computePrefSegments` from `pref-accrual.ts`. All 148 computation tests passed unchanged. The concern that inlined logic might have diverged from the canonical module was not realized — the refactor was purely mechanical.

**Asset field structure is all String?, not numeric.** All `AssetRealEstateDetails`, `CreditDetails`, `EquityDetails`, and `FundLPDetails` fields in Prisma are `String?`. The Plan 22-04 implementation had to adjust from the numeric assumptions in the research. This is worth noting for any future numeric-validation work on these fields.

**parsePaginationParams knownParams is a footgun.** Any business filter param (assetClass, status, entityId) mistakenly placed in `knownParams` is silently consumed and never reaches `params.filters`. Obs 8 (asset class filter broken) traced entirely to this — the filter buttons worked, the URL param was set correctly, but the API always received `undefined` for assetClass.

**`walkPicTimeline` does not exist.** Plan 22-07 research listed it as a `pref-accrual.ts` export. The actual export is `computePrefSegments`. Functionally equivalent, but the naming inconsistency required a deviation during Task 2.

---

## Deferred / Carry-Forward

**FIN-04 second-fund validation — Excel not delivered.**
Plan 22-08 is drafted (see `.planning/phases/22-fit-finish-code/22-08-PLAN.md`) and ships immediately once the user places the second-fund Excel at `.planning/phases/22-fit-finish-code/fixtures/second-fund-waterfall.xlsx`. User explicitly deferred this on 2026-04-17: "defer, I'll let Kathryn handle that." Kathryn owns this class of work (second-fund waterfall validation). Carried forward to Phase 23 backlog. Can execute standalone in Phase 23 without blocking other Phase 23 work.

**Document storage adapter.** Plan 22-02 wired document uploads using local `data/uploads/` in dev and Vercel Blob in prod (via `BLOB_READ_WRITE_TOKEN`). If `BLOB_READ_WRITE_TOKEN` is not set in production, documents are stored locally only (not durable). Phase 23 may want to confirm the production storage adapter is configured.

**Conventions delta file.** Plan 22-08 would have produced a `conventions-delta.md` for any engine-vs-Excel discrepancies found during FIN-04 second-fund validation. Since Plan 22-08 did not execute, no conventions delta exists. Phase 23 FIN-03 (waterfall conventions doc) should note that the second-fund validation conventions will need to be merged once Kathryn completes Plan 22-08.

**Pre-existing vitest failures (18).** Full suite shows 18 pre-existing test failures (confirmed unchanged from before Phase 22 via `git stash` baseline in Plan 22-06). These are not regressions from Phase 22 work. They were pre-existing when Phase 22 started and remain for Phase 23+.

---

## Test Count Evolution

- Before Phase 22: 868 tests (baseline from pre-Phase 22 vitest run; 87 in waterfall/computation domain)
- After Phase 22: 894 tests (876 passing + 18 pre-existing failures + 1 skipped — net +7 from Plan 22-03 capital-account tests + 20 from Plan 22-04 api-assets-put.test.ts)
- Net new tests: ~27 tests (7 capital-account invariant tests in Plan 22-03; 20 discriminated-union schema tests in Plan 22-04; 14 deal-dd-progress tests verified in Plan 22-07 were pre-existing)
- Net new test files: 1 (`src/lib/__tests__/api-assets-put.test.ts`)

---

## Handoff to Phase 23

Phase 23 (Fit & Finish — Docs & Verification Retrofit) should pick up:

1. **FIN-04 second-fund validation (Plan 22-08, carry-forward)** — Excel-gated. Kathryn owns execution. Plan is drafted at `.planning/phases/22-fit-finish-code/22-08-PLAN.md`. Once Excel is delivered, Plan 22-08 can run standalone.
2. **FIN-03 waterfall conventions doc** — `docs/waterfall-conventions.md` does not yet exist. Phase 22 refactor confirms the canonical module is `pref-accrual.ts` with 30/360 inclusive day count, ROC effective-date rules, and PIC-weighted pref methodology. When Plan 22-08 runs (FIN-04), any second-fund convention discrepancies should be merged into FIN-03's conventions doc.
3. **FIN-05 VERIFICATION.md retrofit** — v2.0 Phases 12, 13, 14, 15, 18, 20 do not have VERIFICATION.md files. Phase 22 added per-plan VERIFICATION.md files for plans 22-01, 22-02, 22-03, 22-06, 22-07 (22-04 and 22-05 verification evidence is in their SUMMARY.md files).
4. **FIN-06 REQUIREMENTS.md traceability sync** — TASK-01..05 checkboxes, Phase 20 INTEG/SCHEMA/UIPOL items, FIN-07/FIN-10 v2.0 notes.
5. **FIN-07 Plan 20-10 SUMMARY.md** — The final human verification checkpoint for v2.0 polish work still needs a SUMMARY.md documenting user-facing acceptance.

---

## Sign-off

- [ ] Phase 22 success criteria from ROADMAP.md section 22 all met (FIN-04 is "pending" per explicit deferral)
- [ ] Every per-plan VERIFICATION.md or SUMMARY.md is linked above
- [ ] User has reviewed and approved this SUMMARY
