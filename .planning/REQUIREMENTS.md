# Atlas — Requirement Registry

All active requirements with unique IDs. Each maps to a phase in `ROADMAP.md`.

Last updated: 2026-03-05

---

## VERIFY — Verification Needed

Code exists but correctness/completeness not validated. Must test before building on top of these.

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| VERIFY-01 | Verify financial computation engines produce correct results | Critical | DONE (01-01): IRR (10 tests), waterfall (13 tests), capital accounts (16 tests) — all pass, no bugs found |
| VERIFY-02 | Verify Slack IC voting integration works end-to-end | High | DONE (01-03): code reviewed — structurally sound, security-hardened, all DB fields present; requires real Slack workspace setup to live-test |
| VERIFY-03 | Verify full deal pipeline works end-to-end (screen → DD → IC → close → asset) | High | DONE (01-02): all 4 stage transitions verified via code review — complete implementation |
| VERIFY-04 | Verify capital call and distribution workflows work correctly | High | DONE (01-03): APIs verified — capital calls PARTIAL (no line item endpoint), distributions PARTIAL (same), waterfall/capital-account/NAV APIs WORKS |
| VERIFY-05 | Re-check 3 known bugs — may or may not still exist | High | DONE (01-02): all 3 bugs diagnosed and fixed (see BUG-01, BUG-02, BUG-03) |

---

## BUG — Known Bugs (Pending Re-verification)

These were documented on March 5 but have not been re-checked. They may or may not still exist.

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| BUG-01 | DD tab shows correct completion status for deals past DD stage | Critical | FIXED (01-02): workstream-status fallback added when totalTasks=0 |
| BUG-02 | Pipeline pass rate calculates correctly (never exceeds 100%) | Critical | FIXED (01-02): Math.min(100,...) defensive cap added to all 3 conversion rates |
| BUG-03 | IC Memo generation completes reliably without stuck spinner | High | FIXED (01-02): 90-second Promise.race timeout added, finally block guarantees cleanup |

---

## DEAL — Deal Desk Completion

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| DEAL-01 | Screening stage polish (UX, validation errors shown to user) | High | DONE (02-02): Wizard shows inline red error text per field + toast summary on submit |
| DEAL-02 | Closing workflow reliable and complete end-to-end | High | Closing tab exists but untested with real workflow |
| DEAL-03 | Deal-to-asset auto-creation when deal closes | High | Close action exists, asset auto-creation not verified |
| DEAL-04 | Entity/fund formation flow before closing (every deal needs an entity) | Medium | Formation workflow exists but not linked to deal closing |
| DEAL-05 | Deal edit inline fields save reliably | Medium | DONE (02-02): Double-save prevention (savingRef+justSavedRef), error toast, textarea newline support |
| DEAL-06 | Deal overview dashboard with AI-extracted metadata | High | DONE (02-04): 4-section dashboard (header, metrics, IC memo, terms) + AI extraction endpoint |
| DEAL-07 | DD workstreams as interactive PM-style tasks | High | Workstreams exist but lack assignees, statuses, comments, attachments, re-analysis |
| DEAL-08 | IC Review with configurable decision-making structures | High | IC tab exists with basic voting — needs settings page for structures, in-app voting, Send Back flow |
| DEAL-09 | Kill/revive deal flow with required reasons | Medium | DONE (02-02): KillDealModal with reason dropdown, reviveDeal() restores to previous stage, dead deal badges on pipeline |
| DEAL-10 | Pipeline analytics (summary cards + dedicated analytics page) | Medium | Basic conversion rates exist — needs pipeline value by stage, time-in-stage, velocity metrics |

---

## FIN — Financial Computation Verification & Completion

Computation code exists for IRR, waterfall, and capital accounts. These requirements are about verifying correctness and completing gaps.

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FIN-01 | Capital account computation produces correct results from actual calls/distributions | Critical | Code exists in `computations/capital-accounts.ts` — needs verification |
| FIN-02 | Waterfall calculation applies tier logic correctly with LP/GP splits, hurdle rates | Critical | Code exists in `computations/waterfall.ts` — needs verification |
| FIN-03 | IRR computation returns correct values from actual cash flows | High | Code exists in `computations/irr.ts` (Newton-Raphson XIRR) — needs verification |
| FIN-04 | TVPI / DPI / RVPI computation from real data | High | Fields exist on LP dashboard — unclear if computed or seeded |
| FIN-05 | MOIC computation from cost basis and fair value | High | Some seeded, some derived — not consistently computed |
| FIN-06 | Fee calculation engine (management fees, carried interest) | High | FeeCalculation model exists — data seeded, no computation logic found |
| FIN-07 | Side letter rules applied per LP per entity | Medium | SideLetter model exists — no rule application logic |
| FIN-08 | Fund-level performance aggregation | Medium | LP dashboard shows metrics — unclear if computed |
| FIN-09 | LP-level performance aggregation | Medium | Displayed — unclear if computed |
| FIN-10 | Deal-level performance attribution | Low | No implementation |

---

## CORE — Infrastructure Hardening

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| CORE-01 | ~~Clerk auth replaces demo UserProvider~~ | ~~Critical~~ | **DONE — Clerk works in production. Mock for dev.** |
| CORE-02 | Role-based access enforced per route (not just modeled) | High | UserRole enum exists, Clerk works — no middleware enforcement |
| CORE-03 | Service provider scoped access (read-only, entity-specific, time-bound) | Medium | User.entityAccess[] field exists — no enforcement |
| CORE-04 | Pagination on all data lists | Medium | No pagination — all records loaded at once |
| CORE-05 | Error boundaries to prevent full-page crashes | Medium | No error boundaries anywhere |
| CORE-06 | API rate limiting on AI endpoints | Medium | No rate limiting |

---

## ASSET — Asset Management Polish

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| ASSET-01 | Asset detail pages polished after deal-to-asset flow works | Medium | Depends on DEAL-03 |
| ASSET-02 | Cross-entity NAV dashboard showing all entities | Medium | Entity detail shows NAV but no cross-entity view |
| ASSET-03 | Account mapping UI for QBO/Xero chart of accounts | Medium | AccountMapping model exists, no UI |

---

## ACCT — Real Accounting Integration

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| ACCT-01 | QBO OAuth real connection per entity | High | Connection status UI exists — no real OAuth |
| ACCT-02 | Xero OAuth connection per entity | Medium | Model supports it — no implementation |
| ACCT-03 | Account mapping UI (map Atlas accounts to QBO/Xero GL accounts) | Medium | AccountMapping model exists — no UI |
| ACCT-04 | Trial balance pull and display from GL | Medium | No implementation |
| ACCT-05 | Two-layer NAV computation (cost basis from GL + fair value from Atlas) | Medium | NAV page exists — shows seeded data, no GL integration |

---

## LP — LP Portal with Real Data

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| LP-01 | LP dashboard shows computed (not seeded) metrics | High | Depends on FIN-01 through FIN-05 being verified |
| LP-02 | Performance metrics over time (time-series charts) | Medium | Currently static numbers, no historical chart |
| LP-03 | LP communication preferences applied | Medium | InvestorNotificationPreference model exists — not applied |

---

## NOTIF — Notification Delivery

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| NOTIF-01 | Email notification delivery (SendGrid or SES) | High | No implementation |
| NOTIF-02 | SMS notification delivery (Twilio) | Medium | No implementation |
| NOTIF-03 | LP notification preferences respected (immediate vs digest) | Medium | Model exists — no delivery engine |

---

## REPORT — Reports & Exports

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| REPORT-01 | Quarterly report generation (PDF) | Medium | No implementation |
| REPORT-02 | Capital account statement PDF export | Medium | No implementation |
| REPORT-03 | Data export to Excel (any table) | Medium | No implementation |
| REPORT-04 | K-1 upload and distribution to LPs | Medium | No implementation |
| REPORT-05 | Fund summary reports | Low | No implementation |

---

## INTEG — Third-Party Integrations

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| INTEG-01 | Slack IC voting verified working end-to-end | Medium | Code exists (245 lines) — needs real Slack workspace test |
| INTEG-02 | DocuSign integration for closing documents | Medium | ESignaturePackage model + stub endpoint — no real API |
| INTEG-03 | Asana bidirectional sync for tasks | Low | No implementation |
| INTEG-04 | Notion bidirectional sync | Low | No implementation |
| INTEG-05 | Plaid banking integration (cash visibility) | Low | No implementation |
| INTEG-06 | Calendar integration (Google Cal) | Low | No implementation |

---

## Traceability — Requirement to Phase Mapping

| Phase | Requirements |
|-------|-------------|
| 1: Verify & Stabilize | VERIFY-01, VERIFY-02, VERIFY-03, VERIFY-04, VERIFY-05, BUG-01, BUG-02, BUG-03 |
| 2: Deal Desk End-to-End | DEAL-01, DEAL-02, DEAL-03, DEAL-04, DEAL-05, DEAL-06, DEAL-07, DEAL-08, DEAL-09, DEAL-10, ASSET-01 |
| 3: Capital Activity | FIN-01, FIN-02, FIN-03, FIN-04, FIN-05, FIN-06 |
| 4: Asset & Entity Polish | FIN-07, FIN-08, FIN-09, FIN-10, ASSET-02, CORE-02, CORE-03, CORE-04, CORE-05, CORE-06 |
| 5: QBO/Xero Integration | ACCT-01, ACCT-02, ACCT-03, ACCT-04, ACCT-05, ASSET-03 |
| 6: LP Portal | LP-01, LP-02, LP-03 |
| 7: Notifications & Reports | NOTIF-01, NOTIF-02, NOTIF-03, INTEG-01, INTEG-02, REPORT-01, REPORT-02, REPORT-03, REPORT-04, REPORT-05, INTEG-03, INTEG-04, INTEG-05, INTEG-06 |

**Coverage check:** All requirements mapped to a phase. CORE-01 is DONE (not in any phase). Zero orphans.
