# Atlas — Fund Administration Platform

## What This Is

Atlas is a family office operating system replacing spreadsheets, portals, and emails. It covers deal pipeline, asset management, LP relations, accounting, capital activity, and entity management. Built for ~9 fund entities, ~10 LPs, scaling toward $1B AUM.

**Tech stack:** Next.js 16 · TypeScript · React 19 · Tailwind CSS 4 · PostgreSQL + Prisma 7 · Zod 4 · SWR 2 · Recharts 3

---

## How to Work With Me

### Before every task

1. **Confirm your understanding of what I'm asking.** Restate it in plain English so I can correct you. Do this before planning, before researching, before touching anything.
2. **If ambiguous, ask as many clarifying questions as needed.** But if the request is specific and clear, just do it.
3. **For anything touching 3+ files, enter plan mode.** Don't wait to be told. Show me the plan, get my approval, then execute. If I say "just do it," skip the plan.
4. **Consult the reference docs** before building anything:
   - `docs/architecture-spec.md` — data models, entity relationships, domain features
   - `docs/deal-desk-guide.md` — deal workflow, stages, DD, IC process
   - `docs/data-model-guide.md` — all 56 Prisma models by domain
   - `docs/ui-guide.md` — existing UI components and usage patterns
   - `docs/api-guide.md` — all API endpoints, what they accept/return
   - `docs/workflows.md` — labeled step-by-step workflows for testing and verification
   - `docs/roadmap.md` — what's built, what's not, what to build next (priority ranked)
   - `.claude/rules/coding-patterns.md` — auto-loaded, bug-preventing patterns
   - `.claude/rules/project-structure.md` — auto-loaded, file layout and checklists

### While working

- **Use parallel agents whenever possible** — research in parallel, edit independent files concurrently, run build + preview verification simultaneously.
- **When I say "don't change any code" or "test this," investigate and report only.** No edits.
- **When I ask "what should we do next" or "what would you suggest,"** propose the next logical feature or fix based on what you know about the codebase.
- **When I ask you to "score" or "evaluate" something,** be honest and specific. Give numbers, say what's strong, what's weak, what's missing.

### After every change

1. **Explain what changed in plain English.** No jargon. Tell me what's different and why.
2. **Give me specific testing steps.** Not "test the feature" — tell me exactly what to click, what page to go to, what I should see.
3. **Tell me what might break.** Be honest about edge cases or things that could go wrong.
4. **Suggest improvements.** If you see a better way to do something, or something adjacent that should be tightened up, say so.
5. **Suggest what to build next.** Consult `docs/roadmap.md` and recommend the highest-impact unbuilt feature. Don't guess — check the roadmap.
6. **Run `npm run build`** — zero errors before telling me you're done.

### Version workflow

- **Do NOT commit or push after every change.** Batch your work.
- **Only commit when I say** "commit", "ship it", "push it", or explicitly ask for a commit.
- **When I approve a version**, commit with a clear message describing all changes in that batch.

### Context window awareness

- **At the end of every response, report context window usage** as a short line: `Context: ~Xk this response / ~Xk total of 200k tokens used` so I can track both per-response cost and cumulative runway.
- **When context exceeds ~100k tokens, proactively mention it** — suggest wrapping up or starting a new session if more big work is coming.
- **When context exceeds ~150k tokens, warn clearly** — tell me what should be finished now vs saved for a new session.
- **At ~180k tokens, auto-compact.** Run `/compact` to summarize the conversation and free up context. Don't ask — just do it.

### Continuous improvement

- **When something breaks or you make a mistake**, suggest a one-line addition to `.claude/rules/coding-patterns.md` so future sessions don't repeat it. Frame it as: "Should I add this to the rules so I don't do this again?"
- **When you discover outdated info** in any reference doc (a component renamed, an API changed, a model added), flag it and suggest the specific update. Don't silently work around stale docs.
- **After fixing a bug**, ask: would this have been caught earlier if the docs mentioned it? If yes, suggest the doc update.
- **When a new pattern emerges** (new component, new API convention, new workflow), suggest adding it to the appropriate reference doc.
- **Never update reference docs without asking first.** Say what's stale and what you'd change, then wait for approval — same as code.
- **At the end of a big session**, offer a summary of any doc updates that would help future sessions.

---

## Things I Don't Know

I'm not a developer. I don't read code. When you explain things to me:
- Use plain English, not technical jargon
- If you must use a technical term, explain what it means
- Focus on what the user sees and experiences, not implementation details
- Show me screenshots or tell me where to click, not which function was refactored

---

## Dev Commands

```bash
npm run dev            # Dev server on port 3000
npm run build          # Production build — catches ALL type errors
npx prisma studio      # Visual database browser
npx prisma db seed     # Re-seed demo data
```

After ANY schema.prisma change:
```bash
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" npx prisma db push --force-reset
npx prisma generate && npx prisma db seed
# Then restart dev server
```
