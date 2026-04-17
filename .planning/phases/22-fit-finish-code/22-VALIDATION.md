---
phase: 22
slug: fit-finish-code
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-17
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

Phase 22 is a fit-and-finish phase. Most verification is **manual** (browser-driven UX/UI correctness on localhost:3000). The small automated surface covers the waterfall refactor (FIN-02), LP capital-account reconciliation (FIN-12), and `npm run build` as a TypeScript smoke test after every commit.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
| **Config file** | `vitest.config.ts` (root of `atlas/`) |
| **Quick run command** | `npx vitest run --project unit` (if projects exist) or `npx vitest run src/lib/computations` |
| **Full suite command** | `npx vitest run` |
| **TypeScript check** | `npm run build` — MUST pass with zero errors before any commit |
| **Lint** | `npm run lint` |
| **Dev server (manual verify)** | `npm run dev` (port 3000) |
| **Estimated runtime** | Unit suite: ~8–15s. Full suite with `__tests__` folders: ~30–45s. `npm run build`: ~40–90s. |

**Known test files touched or expanded by Phase 22:**
- `src/lib/computations/pref-accrual.test.ts` — unchanged; FIN-02 refactor must keep this green
- `src/lib/computations/waterfall.test.ts` — unchanged; FIN-02 refactor must keep this green
- `src/lib/computations/__tests__/waterfall.test.ts` — unchanged; FIN-02 refactor must keep this green
- `src/lib/computations/fee-engine.test.ts` — unchanged; FIN-02 refactor must keep this green
- `src/app/api/lp/__tests__/capital-account.test.ts` — **expanded** for FIN-12 LP-Obs 2 (category-sum = total invariant)
- `src/lib/computations/__tests__/capital-accounts.test.ts` — **expanded** for FIN-12 LP-Obs 2 if root cause lives in the computation layer

---

## Sampling Rate

- **After every task commit:** Run `npm run build` (catches TypeScript errors across all 91K LOC).
- **After every task that touches `src/lib/computations/` or `src/app/api/waterfall-templates/`:** Run `npx vitest run src/lib/computations` to confirm 87-test suite still green.
- **After every task that touches `src/app/(lp)/` or `src/app/api/lp/`:** Run `npx vitest run src/app/api/lp/__tests__/capital-account.test.ts` (or expanded equivalent).
- **After every plan wave:** Run `npx vitest run` (full suite).
- **Before `/gsd:verify-work`:** Full suite green AND `npm run build` clean AND every plan's VERIFICATION.md checkboxes ticked.
- **Max feedback latency:** ~15s for quick computation sampling; ~90s for full build gate.

---

## Per-Task Verification Map

Tasks are not yet numbered — the planner will carve Phase 22 into 7-8 plans per CONTEXT.md. This map is requirement-indexed and the planner wires each task's `<automated>` block against the matching row.

| Req ID | Plan (expected) | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|-----------------|----------|-----------|-------------------|-------------|--------|
| FIN-01 | 22-0X (Meetings) | `/meetings/[id]` route renders and resolves meeting by id | Manual | `npm run build` + browser localhost:3000/meetings/[id] | ❌ W0 (new route) | ⬜ pending |
| FIN-01 | 22-0X (Meetings) | Meeting list cards click through to detail | Manual | Browser: `/meetings` → click card | ❌ W0 | ⬜ pending |
| FIN-01 | 22-0X (Meetings / Activity) | Activity feed entries linking to meetings navigate correctly (covers Obs 6 + 19) | Manual | Browser: `/deals/[id]` Activity tab, `/assets/[id]` Activity tab | ❌ W0 | ⬜ pending |
| FIN-02 | 22-0X (Waterfall refactor) | `calculate/route.ts` no longer inlines `days360Exclusive`, `days360Inclusive`, `buildPicTimeline`, `walkPicTimeline` | Build + grep | `npm run build && ! grep -E "(days360Exclusive\|days360Inclusive\|buildPicTimeline\|walkPicTimeline)\s*=" src/app/api/waterfall-templates/[id]/calculate/route.ts` | ✅ | ⬜ pending |
| FIN-02 | 22-0X (Waterfall refactor) | All 87 pref/waterfall/fee-engine tests pass | Unit | `npx vitest run src/lib/computations` | ✅ | ⬜ pending |
| FIN-04 | 22-0X (Second fund) | Excel ground-truth matches engine output for 3+ distributions | Manual | Run `calculate/route.ts` against second-fund fixtures; compare each distribution row to Excel | ❌ W0 (Excel pending from user) | ⬜ pending |
| FIN-04 | 22-0X (Second fund) | Any convention discrepancies documented for Phase 23 FIN-03 conventions doc | Manual | Written convention list in VERIFICATION.md | ❌ W0 | ⬜ pending |
| FIN-08 | 22-0X (Bug re-verify) | BUG-01 (DD tab 0% / no workstreams on post-DD deals) — resolved or reopened | Manual | Browser: IC Review deal → DD tab | ❌ W0 | ⬜ pending |
| FIN-08 | 22-0X (Bug re-verify) | BUG-02 (pipeline pass rate 300%) — resolved or reopened | Manual | Browser: `/deals` stat cards | ❌ W0 | ⬜ pending |
| FIN-08 | 22-0X (Bug re-verify) | BUG-03 (IC memo spinner) — resolved or reopened | Manual | Browser: DD-stage deal → Overview → IC Memo | ❌ W0 | ⬜ pending |
| FIN-09 | 22-0X (Error copy) | Deal delete on non-SCREENING/DEAD deal shows descriptive stage-gate message | Manual | Browser: attempt delete on IC Review deal | ❌ W0 | ⬜ pending |
| FIN-09 | 22-0X (Error copy) | Document AI summary returns actionable message (not "Unauthorized") when AI key missing | Manual | Browser: run AI summary with no AI key configured | ❌ W0 | ⬜ pending |
| FIN-09 | 22-0X (Error copy) | Audit sweep: no catch-all "Unauthorized" in non-auth API paths | Static check | `grep -rn "Unauthorized\|Not authorized" src/app/api/` — every remaining instance must be a real auth failure | ✅ | ⬜ pending |
| FIN-10 | 22-0X (List controls) | Asset class filter buttons filter the list client-side (Obs 8) | Manual | Browser: `/assets` → click Real Estate → only RE assets visible | ❌ W0 | ⬜ pending |
| FIN-10 | 22-0X (List controls) | Entity list column sort works (Obs 21) | Manual | Browser: `/entities` → click Name header → A-Z → Z-A | ❌ W0 | ⬜ pending |
| FIN-10 | 22-0X (List controls) | Meetings list sort + filter works (Obs 44) | Manual | Browser: `/meetings` → sort by date → filter by organizer/type | ❌ W0 | ⬜ pending |
| FIN-11 | 22-0X (Record linkage) | Per-asset task rows link to `/tasks/[id]` (Obs 18) | Manual | Browser: asset detail → Tasks tab → click row | ❌ W0 | ⬜ pending |
| FIN-11 | 22-0X (Record linkage) | Per-entity task widgets link to `/tasks/[id]` (Obs 22) | Manual | Browser: entity detail → Overview → click task | ❌ W0 | ⬜ pending |
| FIN-11 | 22-0X (Record linkage) | Cap table investor rows link to CRM contact (Obs 27) | Manual | Browser: entity detail → Cap Table → click investor | ❌ W0 | ⬜ pending |
| FIN-12 | 22-03 (LP-Obs 2) | Tom Wellington capital account: total distributions = sum of itemized breakdown (no unexplained gap) | Manual + Unit | Browser: `/lp-account` as Tom Wellington; `npx vitest run src/app/api/lp/__tests__/capital-account.test.ts` with category-sum = total invariant | ✅ (test file exists; assertion is new) | ⬜ pending |
| FIN-12 | 22-03 (LP-Obs 2) | Category-sum = total invariant holds for every seeded LP | Unit | `npx vitest run src/app/api/lp/__tests__/capital-account.test.ts` | ✅ | ⬜ pending |
| FIN-12 | 22-0X (LP-Obs 3) | LP Portfolio shows invested capital + current fair value per holding | Manual | Browser: `/lp-portfolio` as Tom Wellington | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*File Exists column: ✅ = test file exists today; ❌ W0 = Wave 0 or implementation creates the file; item is verified manually.*

**Non-FIN walkthrough items** (Obs 7 deletion bypass, Obs 24 Asset Allocation tooltip, Obs 25 cost basis seed, Obs 35 Side Letter crash, Obs 40 Upload Wizard, Obs 47 seed delete order) — each gets its own checklist line in its plan's VERIFICATION.md. None need dedicated unit tests; all are browser/manual checks + `npm run build`.

---

## Wave 0 Requirements

Wave 0 is minimal this phase — most tests exist. The planner's earliest plan (blockers) may add these before downstream work:

- [ ] `src/app/api/lp/__tests__/capital-account.test.ts` — expand with "category-sum equals total distribution amount" invariant for every seeded LP (FIN-12 LP-Obs 2)
- [ ] `src/lib/computations/__tests__/capital-accounts.test.ts` — expand if LP-Obs 2 diagnosis points to the computation layer (category emission / grouping bug)
- [ ] Second-fund Excel fixture landing spot: `.planning/phases/22-fit-finish-code/fixtures/second-fund-waterfall.xlsx` (placeholder until user delivers the file)

No framework install needed — vitest is already configured via `vitest.config.ts`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Meeting detail page renders with activity timeline | FIN-01 | New route + UI; cheaper to verify in browser than construct jsdom harness | `npm run dev`, sign in as `user-jk`, go to `/meetings`, click a card, confirm detail page loads with meeting info. Repeat from `/deals/[id]` activity tab. |
| Side Letter form no longer crashes (Obs 35) | (Non-FIN walkthrough blocker) | Crash is a runtime TypeError; fix is `Array.isArray` guard; verify by clicking | `/directory` → Add Side Letter → pick an LP → form must render without red error screen. |
| Document Upload Wizard advances through steps (Obs 40) | (Non-FIN walkthrough blocker) | Upload flow is multi-step UI; needs real file + browser | `/documents` → Upload → attach a file → proceed through wizard to completion. |
| Asset Edit modal edits every field including entry date (Obs 10/12/25) | FIN-09 adjacent (asset correctness cluster) | Modal + type-conditional fields + sub-modals are UI-heavy | `/assets/[id]` → Edit → change entry date, cost basis, name → save → reload → confirm persistence. Open a Real Estate asset and a Private Credit asset separately to verify type-conditional fields. |
| LP Capital Account reconciles for Tom Wellington (LP-Obs 2) | FIN-12 | Visual reconciliation complements the unit test | Sign in as `user-lp-wellington`, go to `/lp-account`, verify distribution total cell equals sum of itemized breakdown. |
| LP Portfolio shows invested vs current value (LP-Obs 3) | FIN-12 | Column presence + plausibility check | Sign in as Tom Wellington, go to `/lp-portfolio`, confirm every holding shows both "Invested" and "Current Value" columns with non-zero values. |
| Second-fund waterfall output matches Excel (FIN-04) | FIN-04 | Ground-truth comparison is external (Excel) | After user delivers Excel + fund terms, run `calculate/route.ts` against the second fund's distributions, compare each row in VERIFICATION.md. |
| March-5 bugs re-verified (FIN-08) | FIN-08 | Each bug is a UX regression spotted by clicking | For BUG-01: IC-Review deal → DD tab → see workstreams. For BUG-02: `/deals` → stat cards. For BUG-03: DD-stage deal → Overview → IC Memo. |
| Error copy audit (FIN-09) | FIN-09 | Copy is user-facing; browser triggers each case | Attempt to delete deal past Screening → see descriptive message; run AI summary without key → see actionable message. |
| List sort/filter (FIN-10) | FIN-10 | UI interactivity | `/assets` class filter; `/entities` Name column sort; `/meetings` sort + filter. |
| Record linkage navigates (FIN-11) | FIN-11 | Navigation click behavior | Asset Tasks tab → click task; Entity Overview → click task; Cap Table → click investor. |

---

## Validation Sign-Off

- [x] All plans have per-task `<automated>` verify blocks OR explicit manual-check lines mapped to a VERIFICATION.md checkbox
- [x] Sampling continuity: no 3 consecutive tasks without automated feedback (`npm run build` counts; vitest run counts)
- [x] Wave 0 covers all `❌ W0` references (expanded `capital-account.test.ts`, second-fund fixture drop)
- [x] No watch-mode flags (`vitest` not `vitest watch`)
- [x] Feedback latency < 90s (build gate ceiling)
- [x] Per-plan VERIFICATION.md + end-of-phase SUMMARY.md produced
- [x] `nyquist_compliant: true` set in frontmatter once the planner wires every task against this map

**Approval:** approved — all Phase 22 plans wired to the per-task verification map; see 22-SUMMARY.md for evidence. FIN-04 Nyquist row remains pending — Plan 22-08 test file (`waterfall-second-fund.test.ts`) is drafted but unexecuted until Excel arrives (user deferred to Kathryn on 2026-04-17). All other in-scope requirements have wired automated/manual verify and Phase 22 is concluding with explicit deferral, not a gap.
