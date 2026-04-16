# Phase 21 Walkthrough — Pre-Session Notes

**What this file is:** This is a two-minute read before you start either the GP or LP walkthrough. It tells you what to check, what to set up, and what known quirks to watch for so you don't get caught off guard mid-session. Read it once, then open the walkthrough script.

---

## Before You Start Either Session

Complete these steps in order:

1. Open a terminal in the project folder (`atlas/`)
2. Run `npx prisma db seed` — this resets all the demo data to a known, clean state. Wait until it finishes (you'll see a "seeding complete" message). Do this before both the GP session and the LP session.
3. Run `npm run dev` — leave this running in the terminal. The app will be available at http://localhost:3000.
4. Open http://localhost:3000 in your browser and confirm the app loads.
5. Run `git rev-parse --short HEAD` in the terminal — this gives you a short code (like `7a6b325`) that identifies exactly which version of the app you're testing. Write it in the "Commit hash" field at the top of the walkthrough file before you start.
6. Write today's date and the name of your browser (e.g., Chrome, Safari) in the session header too.

---

## Branch Merge Status — feat/edit-delete-across-entities

During v2.1 development, some edit and delete controls were built on a separate branch called `feat/edit-delete-across-entities`. This branch covers things like inline editing of income entries, editing expense records, and deleting items from certain lists.

**As of when this walkthrough was written, this branch does not appear to be pulled down locally.** To double-check before your GP session, run this command in the terminal:

```
git branch -a | grep edit-delete
```

Paste whatever it prints into the "Branch status" field in the walkthrough header. If it prints nothing at all, the branch is not present — treat the version you're testing as the main branch only.

**What this means for the walkthrough:** If you try to edit or delete something (like an income entry on an asset page) and there's no edit button, or clicking edit does nothing, it may be because those controls live on this unmerged branch. Write it down as an observation anyway — the triage step will determine whether it's a missing feature or a bug.

---

## March-5 Bug Re-Verification

Three bugs were documented in early March but may or may not still exist in the current app. The GP walkthrough script asks you to check all three in the flow of normal usage. Here's what each one looks like so you know what to watch for:

**BUG-01 — Due Diligence tab shows 0% complete on deals that are already past that stage**
- What it looks like: You open a deal that is in "IC Review" or "Closing" stage (meaning it already passed Due Diligence). You click the "Due Diligence" tab. Instead of seeing real completion percentages, every workstream shows "NOT_STARTED" or 0%.
- How to check: Find a deal past the Due Diligence stage. Click into it. Click the "Due Diligence" tab. Note what you see.
- If the tab shows real completion (like 60%, 80%, etc.) — the bug appears to be fixed. Note "resolved" in the capture block.
- If everything shows 0% or NOT_STARTED — BUG-01 is still present. Mark it as a Blocker observation.

**BUG-02 — Pipeline pass rate shows over 100% (like 300%)**
- What it looks like: At the top of the Deals list page, there are stat cards. One of them shows a "Pass Rate" or "IC Pass Rate" number. If it says something like 300%, the math is wrong.
- How to check: Go to http://localhost:3000/deals and look at the stat cards at the top. If the pass rate is between 0% and 100%, the bug appears to be fixed. If it's over 100%, BUG-02 is still there.
- Note what number you see, or note "no pass rate card visible" if the card isn't there.

**BUG-03 — IC Memo "Generating..." spinner never resolves**
- What it looks like: On a deal in Due Diligence or IC Review stage, the Overview tab has an "IC Memo" section. If you click "Generate IC Memo" (or a similar button), the button turns into a spinner that says "Generating..." and never stops — no memo appears and no error message shows up.
- How to check: Open a deal in the right stage. Look at the Overview tab. If there's no memo yet, try generating one. Note whether it produces a memo, shows an error, or gets stuck.
- **Important prerequisite:** This feature needs an AI provider key configured in Settings > AI Config. If you haven't set one up, skip BUG-03 rather than misread a "no key" error as a stuck spinner. Write "skipped — no AI key configured" in the capture block.

---

## LP User Selection — Why It's Michael Chen, Not Karen Miller

The original planning notes mentioned "Karen Miller" as an example LP user. However, Karen Miller is not in the demo data. Here's who you'll actually use:

**Pass 1 (multi-vehicle LP):** Sign in as **Michael Chen** using the user ID `user-lp-calpers`. Michael represents CalPERS, which has commitments across 5 fund vehicles — this is the most data-rich LP view in the demo and gives the broadest test of how the portal handles multiple funds.

**Pass 2 (simpler LP):** Sign in as **Tom Wellington** using the user ID `user-lp-wellington`. Tom represents Wellington Family Office, which has commitments across 3 vehicles. There is no truly single-vehicle LP in the demo data — Tom is simply a lighter, smaller-feeling LP account compared to CalPERS.

How to switch users in the local dev app: In local development, there is a user dropdown (usually at the top right corner). Select the user you want to switch to — you should see the initials change (e.g., "MC" for Michael Chen, "TW" for Tom Wellington) and the sidebar should switch to the LP navigation (My Overview, Capital Account, LP Portfolio, etc.).

---

## BUG-03 Prerequisite — AI API Key

Testing the IC Memo generation (BUG-03) only makes sense if an AI API key is already configured. To check: go to Settings > AI Config and see if a provider and key are set. If nothing is configured, skip BUG-03. Write "skipped — no AI key in Settings > AI Config" in the capture block. Do not add an API key just for this test — that's a separate decision.

---

## BUG-01 Prerequisite — Post-DD Deals in the Seed

BUG-01 only shows up on deals that are past the Due Diligence stage (in IC Review or Closing). The demo seed should include deals in those stages, but if you look at the Deals list and everything is in "Screening" or "Due Diligence" stage, you can advance one deal manually: open any deal in Due Diligence, and use the "Send to IC Review" button (if it exists). This gives you a post-DD deal to test the DD tab on.

If you can't find or advance a post-DD deal, write "skipped — no post-DD deal available" in the BUG-01 capture block.

---

*Written for Phase 21 walkthrough sessions. Both the GP and LP walkthrough scripts are in this same folder.*
*GP script: `v3.0-gp-baseline.md` | LP script: `v3.0-lp-baseline.md`*
