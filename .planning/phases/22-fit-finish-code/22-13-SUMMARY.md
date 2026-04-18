---
plan: "22-13"
status: complete
completed: 2026-04-17
---

# Plan 22-13 — SUMMARY

**One-liner:** Valuation approval metadata (`approvedBy` + `approvedAt`) is now captured and displayed end-to-end. The schema already had the columns; the audit trail just needed the PUT route to stamp them, the GET route to resolve approver display info, the Edit modal to show the banner, and the history table to show the columns.

## What shipped

- `UpdateValuationSchema` accepts optional `approvedBy` so forms can pass the current user (dev-mode fallback — prod uses Clerk's `authUser.id` server-side).
- PUT route stamps `approvedBy` + `approvedAt` on DRAFT → APPROVED transition; clears both on APPROVED → DRAFT revert.
- GET `/api/assets/[id]` does a single `prisma.user.findMany` across unique approver IDs and attaches `valuation.approver = { id, name, initials } | null` to each valuation — no schema change, no new Prisma relation needed.
- Edit Valuation modal: amber "approved, read-only" banner now also shows "Approved by <Name> on <Date>" when metadata is present.
- Valuation History table on `/assets/[id]` Overview: two new columns between Status and Notes — "Approved By" (initials pill + name) and "Approved At" (date or "—").
- Graceful fallback when `approvedBy` is set but user lookup returns null (user deleted) — raw ID rendered italic gray.

## Evidence

- `npm run build` — PASSED, 116/116 pages generated, zero TS errors.
- Unit-equivalent API round-trip was scripted but preview server died during the test; shipping for verification on production Chrome instead per user direction.

## Chrome test plan (for user after Vercel deploys)

1. Sign in as James Kim. Go to `/assets/asset-4` (123 Industrial Blvd) → Performance tab section / scroll to Valuation History.
2. Confirm table now has columns: Date | Method | Fair Value | MOIC | Status | **Approved By** | **Approved At** | Notes | (Edit).
3. Click the "+ Log Valuation" button (if present on that page), create a new valuation at today's date, method APPRAISAL, fair value $29M, status DRAFT.
4. Click Edit on the new valuation row. Change status to APPROVED. Save.
5. Back on the table, the new row should now show:
   - Status: green "approved" badge
   - **Approved By: JK James Kim**
   - **Approved At: today's date**
6. Re-open that row's Edit modal — the amber banner at the top now reads "This valuation is approved. Only DRAFT valuations can be edited. Approved by **James Kim** on <date>".
7. Existing APPROVED valuations from seed data will show "—" for both columns because they were created before the stamp was captured.

## Known follow-up

- Still on the punch list: #4 (Projected Metrics JSON blob), #7 (type-conditional string-field range validation), #8 (Kathryn end-to-end integrity loop).
- Seed-data valuations with historical approvals aren't retroactively stamped. If you want the audit trail for older approved valuations, the simplest path is to add a one-off migration or re-approve them via the UI.
