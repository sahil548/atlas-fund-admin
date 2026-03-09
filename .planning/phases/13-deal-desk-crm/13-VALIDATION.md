---
phase: 13
slug: deal-desk-crm
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-09
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — project uses TypeScript compilation as quality gate |
| **Config file** | tsconfig.json (strict mode) |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build` + manual smoke test at localhost:3000
- **Before `/gsd:verify-work`:** Full manual workflow test per success criteria
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | DEAL-11 | manual-only (visual) | `npm run build` | N/A | ⬜ pending |
| 13-01-02 | 01 | 1 | DEAL-12 | manual-only (visual) | `npm run build` | N/A | ⬜ pending |
| 13-01-03 | 01 | 1 | DEAL-13 | manual-only (click test) | `npm run build` | N/A | ⬜ pending |
| 13-02-01 | 02 | 1 | DEAL-14 | manual-only (download) | `npm run build` | N/A | ⬜ pending |
| 13-03-01 | 03 | 1 | DEAL-15 | manual-only (visual) | `npm run build` | N/A | ⬜ pending |
| 13-04-01 | 04 | 1 | DEAL-16 | manual-only (workflow) | `npm run build` | N/A | ⬜ pending |
| 13-05-01 | 05 | 2 | CRM-01 | manual-only (visual) | `npm run build` | N/A | ⬜ pending |
| 13-05-02 | 05 | 2 | CRM-02 | manual-only (form workflow) | `npm run build` | N/A | ⬜ pending |
| 13-05-03 | 05 | 2 | CRM-03 | manual-only (badge UI) | `npm run build` | N/A | ⬜ pending |
| 13-05-04 | 05 | 2 | CRM-04 | manual-only (data display) | `npm run build` | N/A | ⬜ pending |
| 13-06-01 | 06 | 2 | CRM-05 | manual-only (deal creation) | `npm run build` | N/A | ⬜ pending |
| 13-06-02 | 06 | 2 | CRM-06 | manual-only (data entry) | `npm run build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. Project relies on TypeScript compilation (`npm run build`) as its primary quality gate. No test framework to install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Days-in-stage counter on kanban cards | DEAL-11 | Visual UI element | Open /deals, verify each card shows "X days" badge |
| Column value totals in headers | DEAL-12 | Visual UI element | Open /deals, verify each column header shows count + $ total |
| View Asset link on closed deal | DEAL-13 | Navigation click test | Open a closed deal, verify "View Asset" link appears and navigates to asset |
| IC memo PDF download | DEAL-14 | File download inspection | Open deal with IC memo, click Export PDF, verify PDF downloads with correct content |
| Dead deal analytics chart | DEAL-15 | Visual chart rendering | Open /analytics, verify kill reason breakdown chart appears; open /deals, verify mini summary |
| Bulk deal actions | DEAL-16 | Multi-step workflow | Select multiple cards on kanban, verify floating bar appears with kill/assign/advance actions |
| Contact activity timeline | CRM-01 | Visual + interaction | Open /contacts/[id], verify timeline shows activities in chronological order with filters |
| Interaction CRUD | CRM-02 | Form workflow test | Log a call/email/meeting/note on contact page, edit it, delete it |
| Relationship tags | CRM-03 | Badge UI interaction | Add/remove core and custom tags on contact header |
| Linked deals/entities/assets | CRM-04 | Data display verification | Open contact with linked deals, verify all sections populate correctly |
| Deal sourcing attribution | CRM-05 | Deal creation flow | Create a deal with source contact, verify it shows on deal page and contact's "Deals Sourced" section |
| Co-investor tracking | CRM-06 | Data entry + display | Add co-investors to a deal, verify they appear on deal page and contact's "Co-Investments" section |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: `npm run build` runs after every commit
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
